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
  POSITION_EVENTS
} from '@jwd-crypto-signals/common';
import {
  BUY_ORDER_TYPE,
  DEFAULT_BUY_AMOUNT,
  BUY_ORDER_TTL,
  SELL_ORDER_TTL,
  SELL_ORDER_TYPE,
  QUOTE_ASSET
} from '../../config';

const MAX_REQUESTS = 48; // limit 50

export const setOrderTimeout = function setOrderTimeout(
  server: Server,
  paramOrder: OrderAttributes
) {
  setTimeout(
    async () => {
      const order = await getOrderFromDbOrBinance(server, paramOrder);

      if (!order) {
        throw new Error('Trying to set order timeout to a non existent order');
      }

      if (
        order.status !== BINANCE_ORDER_STATUS.CANCELED &&
        order.status !== BINANCE_ORDER_STATUS.FILLED
      ) {
        if (paramOrder.side === 'BUY') {
          server.log(
            ['debug'],
            `Buy order (${order.symbol}-${order.orderId}) has timed out. Cancelling...`
          );
          const cancelQuery = new URLSearchParams({
            symbol: order.symbol,
            orderId: order.orderId.toString()
          }).toString();
          await server.plugins.binance.client.delete(
            `/api/v3/order?${cancelQuery}`
          );
        } else {
          server.log(
            ['debug'],
            `Sell order (${order.symbol}-${order.orderId}) has timed out. Creating new market order instead.`
          );
          const positionModel: PositionModel =
            server.plugins.mongoose.connection.model(DATABASE_MODELS.POSITION);

          const foundPosition: LeanPositionDocument = await positionModel
            .findOne({
              $and: [
                { symbol: paramOrder.symbol },
                { 'buy_order.orderId': paramOrder.orderId }
              ]
            })
            .lean();

          server.plugins.broker.publish(
            POSITION_EVENTS.POSITION_CLOSED_REQUEUE,
            foundPosition
          );
        }
      }
    },
    paramOrder.side === 'BUY' ? BUY_ORDER_TTL : SELL_ORDER_TTL
  );
};

export const checkHeaders = async function checkHeaders(
  headers: Record<string, string>,
  model: AccountModel
) {
  if (+headers['x-mbx-order-count-10s'] >= MAX_REQUESTS) {
    await model.findOneAndUpdate(
      { id: process.env.NODE_ENV },
      { $set: { create_order_after: Date.now() + 1e4 } }
    );
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

  const orderModel: OrderModel =
    server.plugins.mongoose.connection.model('Order');
  let order: LeanOrderDocument | undefined;

  try {
    order = await orderModel
      .findOne({ clientOrderId: buy_order.clientOrderId })
      .hint('clientOrderId_1')
      .lean();

    if (!order) {
      throw new Error('Order does not exist in database.');
    }
  } catch (error: unknown) {
    server.log(['error'], error as object);
    const query = new URLSearchParams({
      orderId: buy_order.orderId.toString(),
      symbol: buy_order.symbol
    }).toString();

    try {
      const { data } = await server.plugins.binance.client.get(
        `/api/v3/order?${query}`
      );

      if (data?.orderId) {
        order = data;
      }
    } catch (error_2: unknown) {
      server.log(['error'], error_2 as object);
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
      `${position._id} | Unable to continue. Reason: ${reason}`
    );
    msg.nack(false, requeue);

    return;
  }

  const market: LeanMarketDocument = await marketModel
    .findOne({ symbol: position.symbol })
    .hint('symbol_1')
    .lean();

  if (market.trader_lock) {
    server.log(
      ['warn', 'create-buy-order'],
      `${position.symbol} | Market lock is set. Unable to continue.`
    );
    msg.nack(false, true);

    return;
  }

  await marketModel.findOneAndUpdate(
    { symbol: position.symbol },
    { $set: { trader_lock: true, last_trader_lock_update: Date.now() } }
  );

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
    server.log(
      ['debug'],
      `${position._id} | Attempting to create order: ${JSON.stringify(query)} `
    );

    const searchParams = new URLSearchParams(query).toString();

    const { data, headers } = await binance.post(
      `/api/v3/order?${searchParams}`
    );

    await checkHeaders(headers, accountModel);

    if (data?.orderId) {
      await positionModel.findOneAndUpdate(
        { id: position.id },
        { $set: { buy_order: data } }
      );

      if (BUY_ORDER_TYPE === BINANCE_ORDER_TYPES.LIMIT && BUY_ORDER_TTL) {
        setOrderTimeout(server, data as OrderAttributes);
      }
    }

    msg.ack();
  } catch (error: unknown) {
    msg.nack();
    server.log(['error', 'create-order'], error as object);
  } finally {
    await marketModel.findOneAndUpdate(
      { $and: [{ symbol: position.symbol }] },
      { $set: { trader_lock: false } }
    );
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
    .lean();

  const hasBuyOrder = !!position.buy_order;

  if (Date.now() < account?.create_order_after || !hasBuyOrder) {
    let reason = '10s order limit reached.';
    let requeue = true;

    if (!hasBuyOrder) {
      requeue = false;
      reason = 'Position does not have buy order.';
    }

    server.log(
      ['warn', 'create-sell-order'],
      `${position.id} | Unable to continue. Reason: ${reason}`
    );
    msg.nack(false, requeue);

    return;
  }

  const market: LeanMarketDocument = await marketModel
    .findOne({ symbol: position.symbol })
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

  await marketModel.findOneAndUpdate(
    { symbol: position.symbol },
    { $set: { trader_lock: true, last_trader_lock_update: Date.now() } }
  );

  try {
    const query: Record<string, string> = {
      type: orderType ?? SELL_ORDER_TYPE,
      symbol: position.symbol,
      side: 'SELL'
    };

    if (query.type === 'LIMIT') {
      query.timeInForce = 'GTC';
      query.price = position.sell_price.toString();
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
      server.log(
        ['debug'],
        `${position.id} | Order (${buy_order.symbol}-${buy_order.orderId}) has not been filled. Cancelling...`
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
      throw new Error(`Buy order for position ${position._id} was not filled.`);
    }

    query.quantity = toSymbolStepPrecision(
      quantity_to_sell,
      position.symbol
    ).toString();

    server.log(
      ['debug'],
      `${position._id} | Attempting to create order: ${JSON.stringify(query)}`
    );

    const searchParams = new URLSearchParams(query).toString();
    const { data, headers } = await server.plugins.binance.client.post(
      `/api/v3/order?${searchParams}`
    );

    await checkHeaders(headers, accountModel);

    if (data?.orderId) {
      server.log(
        ['debug'],
        `${position._id} | Request completed. Order created: ${position.symbol}-${data.orderId}`
      );

      await positionModel.findOneAndUpdate(
        { id: position.id },
        { $set: { sell_order: data } }
      );

      if (query.type === 'LIMIT' && SELL_ORDER_TTL) {
        setOrderTimeout(server, data as OrderAttributes);
      }
    }

    msg.ack();
  } catch (error: unknown) {
    msg.nack();
    server.log(['error'], error as object);
  } finally {
    await marketModel.findOneAndUpdate(
      { symbol: position.symbol },
      { $set: { trader_lock: false } }
    );
  }
};