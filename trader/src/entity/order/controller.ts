import { Server } from '@hapi/hapi';
import {
  AccountModel,
  BINANCE_ORDER_TYPES,
  DATABASE_MODELS,
  LeanAccountDocument,
  LeanMarketDocument,
  LeanOrderDocument,
  LeanPositionDocument,
  MarketModel,
  OrderAttributes,
  OrderModel,
  PositionModel,
  toSymbolStepPrecision,
  BINANCE_ORDER_STATUS,
  nz,
  ListenMessage,
  POSITION_EVENTS,
  MILLISECONDS,
  toSymbolPrecision
} from '@jwd-crypto-signals/common';
import {
  BUY_ORDER_TYPE,
  DEFAULT_BUY_AMOUNT,
  BUY_ORDER_TTL,
  SELL_ORDER_TTL,
  SELL_ORDER_TYPE,
  QUOTE_ASSET,
  MINUTES_BETWEEN_CANCEL_ATTEMPTS,
  BINANCE_MINIMUM_ORDER_SIZE
} from '../../config';
import { parseOrder } from '../../utils';

const MAX_REQUESTS = 48; // limit 50

export const checkHeaders = async function checkHeaders(
  headers: Record<string, string>,
  model: AccountModel
) {
  if (+headers['x-mbx-order-count-10s'] >= MAX_REQUESTS) {
    await model
      .updateOne(
        { id: process.env.NODE_ENV },
        { $set: { create_order_after: Date.now() + 1e4 } }
      )
      .hint('id_1');
  }

  return;
};

export const getOrderFromDbOrBinance = async function getOrderFromDbOrBinance(
  server: Server,
  buy_order: OrderAttributes
) {
  if (!buy_order) {
    throw new Error('Order is not defined.');
  }

  const orderModel: OrderModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.ORDER
  );
  let order = await orderModel
    .findOne({ clientOrderId: buy_order.clientOrderId })
    .hint('clientOrderId_1')
    .lean();

  if (!order) {
    console.log(
      'Order does not exist in database... Attempting to fetch from Binance...'
    );

    const query = new URLSearchParams({
      orderId: buy_order.orderId.toString(),
      symbol: buy_order.symbol
    }).toString();

    try {
      const { data } = await server.plugins.binance.client.get(
        `/api/v3/order?${query}`
      );

      if (!data?.orderId) {
        console.log('Order does not exist in Binance.');
      } else {
        order = data;
        await orderModel
          .updateOne(
            { $and: [{ symbol: buy_order.symbol }, { orderId: data.orderId }] },
            { $set: parseOrder(data) },
            { upsert: true }
          )
          .hint('orderId_-1_symbol_-1');
      }
    } catch (error: unknown) {
      server.log(['error'], error as object);
    }
  }

  return order;
};

export const createBuyOrder = async function createBuyOrder(
  server: Server,
  msg: ListenMessage<LeanPositionDocument>,
  orderType?: BINANCE_ORDER_TYPES
) {
  const accountModel: AccountModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.ACCOUNT
  );
  const positionModel: PositionModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.POSITION
  );
  const marketModel: MarketModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.MARKET
  );

  const position = msg.data;
  const binance = server.plugins.binance.client;

  const account: LeanAccountDocument = await accountModel
    .findOne({ id: process.env.NODE_ENV })
    .hint('id_1')
    .lean();

  if (!account) {
    msg.nack(true, false);
    throw new Error(`Account with ID '${process.env.NODE_ENV}' not found.`);
  }

  const market: LeanMarketDocument = await marketModel
    .findOne({ symbol: position.symbol })
    .select({ use_main_account: true, trader_lock: true })
    .hint('symbol_1')
    .lean();

  if (!market.use_main_account) {
    console.log(
      `${position.symbol} | ${position._id} | Market disabled for trading.`
    );
    msg.ack();

    return;
  }

  const enoughBalance = account.available_balance > DEFAULT_BUY_AMOUNT;
  const positionHasBuyOrder = await positionModel.exists({
    $and: [{ id: position.id }, { 'buy_order.orderId': { $exists: true } }]
  });

  if (
    Date.now() < account.create_order_after ||
    !enoughBalance ||
    positionHasBuyOrder
  ) {
    let requeue = true;
    let reason = '10s order limit reached.';

    if (!enoughBalance) {
      reason = 'Not enough balance.';
      requeue = false;
    }

    if (positionHasBuyOrder) {
      reason = 'Buy order has already been created for this position';
      requeue = false;
    }

    server.log(
      ['warn', 'create-buy-order'],
      `${position.symbol} | ${position._id} | Unable to continue. Reason: ${reason}`
    );
    msg.nack(false, requeue);

    return;
  }

  if (market.trader_lock) {
    server.log(
      ['warn', 'create-buy-order'],
      `${position.symbol} | Market lock is set. Unable to continue.`
    );
    msg.nack(false, true);

    return;
  }

  await marketModel
    .updateOne(
      { symbol: position.symbol },
      { $set: { trader_lock: true, last_trader_lock_update: Date.now() } }
    )
    .hint('symbol_1');

  const query: Record<string, string> = {
    type: orderType ?? BUY_ORDER_TYPE,
    symbol: position.symbol,
    side: 'BUY'
  };

  if (BUY_ORDER_TYPE === BINANCE_ORDER_TYPES.MARKET) {
    query.quoteOrderQty = DEFAULT_BUY_AMOUNT.toString();
  }

  if (BUY_ORDER_TYPE === BINANCE_ORDER_TYPES.LIMIT) {
    query.timeInForce = 'GTC';
    query.price = position.buy_price.toString();
    query.quantity = toSymbolStepPrecision(
      DEFAULT_BUY_AMOUNT / position.buy_price,
      position.symbol
    ).toString();
  }

  try {
    console.log(
      `${position._id} | Attempting to create order: ${JSON.stringify(query)}`
    );

    const searchParams = new URLSearchParams(query).toString();

    const { data, headers } = await binance.post(
      `/api/v3/order?${searchParams}`
    );

    await checkHeaders(headers, accountModel);

    if (data?.orderId) {
      const createdOrder = {
        symbol: position.symbol,
        orderId: data.orderId,
        clientOrderId: data.clientOrderId
      };

      console.log(
        `${position._id} | Order created: ${JSON.stringify(createdOrder)}`
      );

      await positionModel
        .updateOne({ id: position.id }, { $set: { buy_order: data } })
        .hint('id_1');
    }

    msg.ack();
  } catch (error: unknown) {
    msg.nack();
    server.log(['error', 'create-order'], error as object);
  } finally {
    await marketModel
      .updateOne({ symbol: position.symbol }, { $set: { trader_lock: false } })
      .hint('symbol_1');
  }
};

export const createSellOrder = async function createSellOrder(
  server: Server,
  msg: ListenMessage<LeanPositionDocument>,
  orderType?: BINANCE_ORDER_TYPES
) {
  const position = msg.data;

  if (!position) {
    msg.nack(false, false);
    throw new Error('Position is not defined');
  }

  const accountModel: AccountModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.ACCOUNT
  );
  const positionModel: PositionModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.POSITION
  );
  const marketModel: MarketModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.MARKET
  );

  const account: LeanAccountDocument = await accountModel
    .findOne({ id: process.env.NODE_ENV })
    .hint('id_1')
    .lean();

  const hasBuyOrder = !!position.buy_order;

  if (Date.now() < account?.create_order_after) {
    server.log(
      ['warn', 'create-sell-order'],
      `${position.id} | Unable to continue. Reason: 10s order limit reached.`
    );
    msg.nack();

    return;
  }

  if (!hasBuyOrder) {
    msg.nack(false, false);

    return;
  }

  const market: LeanMarketDocument = await marketModel
    .findOne({ symbol: position.symbol })
    .select({ last_price: true, trader_lock: true })
    .hint('symbol_1')
    .lean();

  if (market.trader_lock) {
    server.log(
      ['warn', 'create-sell-order'],
      `${position.symbol} | ${position._id} | Market lock is set. Unable to continue.`
    );
    msg.nack();

    return;
  }

  await marketModel
    .updateOne(
      { symbol: position.symbol },
      { $set: { trader_lock: true, last_trader_lock_update: Date.now() } }
    )
    .hint('symbol_1');

  try {
    const query: Record<string, string> = {
      type: orderType ?? SELL_ORDER_TYPE,
      symbol: position.symbol,
      side: 'SELL'
    };

    if (query.type === 'LIMIT') {
      query.timeInForce = 'GTC';
      query.price = (position.sell_price ?? market.last_price).toString();
    }

    let buy_order = await getOrderFromDbOrBinance(
      server,
      position.buy_order as OrderAttributes
    );

    if (!buy_order) {
      msg.nack(false, false);
      throw new Error('Position does not have a buy order');
    }

    if (
      buy_order.status !== BINANCE_ORDER_STATUS.CANCELED &&
      buy_order.status !== BINANCE_ORDER_STATUS.FILLED
    ) {
      console.log(
        `${position._id} | Order (${buy_order.symbol}-${buy_order.orderId}) has not been filled. Cancelling...`
      );
      //cancel order and refetch from db
      const cancel_query = new URLSearchParams({
        symbol: buy_order.symbol,
        orderId: buy_order.orderId.toString()
      }).toString();

      await server.plugins.binance.client.delete(
        `/api/v3/order?${cancel_query}`
      );

      buy_order = await getOrderFromDbOrBinance(
        server,
        position.buy_order as OrderAttributes
      );
    }

    if (!buy_order) {
      msg.nack(false, false);
      throw new Error('Buy order does not exist');
    }

    const quantity_to_sell =
      nz(+buy_order.executedQty) -
      (position.symbol.replace(QUOTE_ASSET, '') === buy_order.commissionAsset
        ? nz(+buy_order.commissionAmount)
        : 0);

    if (quantity_to_sell === 0) {
      msg.nack(false, false);

      server.log(
        ['warn', 'create-sell-order'],
        `Buy order for position '${position._id}' was not filled.`
      );

      return;
    }

    const sellValue = toSymbolPrecision(
      quantity_to_sell * market.last_price,
      market.symbol
    );

    if (sellValue < BINANCE_MINIMUM_ORDER_SIZE) {
      msg.nack(false, false);

      server.log(
        ['warn', 'create-sell-order'],
        `Sell value (${sellValue} ${QUOTE_ASSET}) is below the minimum order size (${BINANCE_MINIMUM_ORDER_SIZE} ${QUOTE_ASSET}).`
      );

      return;
    }

    query.quantity = toSymbolStepPrecision(
      quantity_to_sell,
      position.symbol
    ).toString();

    console.log(
      `${position._id} | Attempting to create order: ${JSON.stringify(query)}`
    );

    const searchParams = new URLSearchParams(query).toString();
    const { data, headers } = await server.plugins.binance.client.post(
      `/api/v3/order?${searchParams}`
    );

    await checkHeaders(headers, accountModel);

    if (data?.orderId) {
      const createdOrder = {
        symbol: position.symbol,
        orderId: data.orderId,
        clientOrderId: data.clientOrderId
      };

      console.log(
        `${position._id} | Order created: ${JSON.stringify(createdOrder)}`
      );

      await positionModel
        .updateOne({ id: position.id }, { $set: { sell_order: data } })
        .hint('id_1');
    }

    msg.ack();
  } catch (error: unknown) {
    msg.nack();
    server.log(['error'], error as object);
  } finally {
    await marketModel
      .updateOne({ symbol: position.symbol }, { $set: { trader_lock: false } })
      .hint('symbol_1');
  }
};

export const cancelUnfilledOrders = async function cancelUnfilledOrders(
  server: Server
) {
  const positionModel: PositionModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.POSITION
  );
  const orderModel: OrderModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.ORDER
  );

  const orders: LeanOrderDocument[] = await orderModel
    .find({
      $and: [
        {
          status: {
            $nin: [BINANCE_ORDER_STATUS.FILLED, BINANCE_ORDER_STATUS.CANCELED]
          }
        },
        { time: { $gt: Date.now() - MILLISECONDS.HOUR } }
      ]
    })
    .select({
      side: true,
      type: true,
      eventTime: true,
      clientOrderId: true,
      symbol: true,
      orderId: true
    })
    .hint('status_1_time_1')
    .lean();

  const filteredOrders = orders.filter(order => {
    const canAttemptToCancelOrder =
      (order.lastCancelAttempt ?? 0) + MINUTES_BETWEEN_CANCEL_ATTEMPTS <
      Date.now();
    const shouldCancelBuyOrder =
      order.side === 'BUY' &&
      order.type === BINANCE_ORDER_TYPES.LIMIT &&
      Date.now() > order.eventTime + BUY_ORDER_TTL;
    const shouldCancelSellOrder =
      order.side === 'SELL' &&
      order.type === BINANCE_ORDER_TYPES.LIMIT &&
      Date.now() > order.eventTime + SELL_ORDER_TTL;

    return (
      (shouldCancelBuyOrder || shouldCancelSellOrder) && canAttemptToCancelOrder
    );
  });

  if (filteredOrders.length > 0) {
    for (const order of filteredOrders) {
      if (!(order.clientOrderId ?? '').match(/web_/)) {
        const tradeQuery = new URLSearchParams({
          symbol: order.symbol,
          orderId: order.orderId.toString()
        }).toString();

        try {
          await orderModel
            .updateOne(
              { $and: [{ orderId: order.orderId }, { symbol: order.symbol }] },
              { $set: { lastCancelAttempt: Date.now() } }
            )
            .hint('orderId_-1_symbol_-1');

          await server.plugins.binance.client.delete(
            `/api/v3/order?${tradeQuery}`
          );
        } catch (error: unknown) {
          server.log(['error'], error as object);
          continue;
        }

        if (order.side === 'SELL') {
          const position = await positionModel
            .findOne({ 'sell_order.orderId': order.orderId })
            .hint('sell_order.orderId_1')
            .lean();

          server.plugins.broker.publish(
            POSITION_EVENTS.POSITION_CLOSED_REQUEUE,
            position
          );
        }
      }
    }
  }
};
