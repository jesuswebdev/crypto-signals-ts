import { Server } from '@hapi/hapi';
import {
  CandleModel,
  CandleTickData,
  cloneObject,
  DATABASE_MODELS,
  getBooleanValue,
  getTimeDiff,
  LeanCandleDocument,
  LeanMarketDocument,
  LeanPositionDocument,
  LeanSignalDocument,
  MarketModel,
  MILLISECONDS,
  PositionModel,
  POSITION_EVENTS,
  POSITION_STATUS,
  SignalDocument,
  SignalModel,
  toSymbolPrecision,
  MongoError
} from '@jwd-crypto-signals/common';
import { applyStrategy } from '../../strategy';
import { getPlainCandle } from '../../utils';
import { createPosition } from '../position/controller';

/**
 * @description Processes existing open signals, or creates new ones.
 */
export const processSignals = async function processSignals(
  server: Server,
  { symbol, interval }: CandleTickData
) {
  const redisKeys = {
    lock: `${symbol}_process_signals_lock`,
    lockDate: `${symbol}_process_signals_lock_date`
  };
  const redis = server.plugins.redis.client;

  const removeLock = async () => {
    await redis.del(redisKeys.lock);
    await redis.del(redisKeys.lockDate);
  };

  const setLock = () => {
    return Promise.allSettled([
      redis.set(redisKeys.lock, 1),
      redis.set(redisKeys.lockDate, Date.now())
    ]);
  };

  const lockDate = await redis.get(redisKeys.lockDate);

  // removes lock if it's been more than three minutes since the last time it was locked
  if (
    lockDate &&
    new Date(+lockDate).getTime() < Date.now() - MILLISECONDS.MINUTE * 3
  ) {
    await removeLock();
  }

  const hasLock = getBooleanValue(await redis.get(redisKeys.lock));

  if (hasLock) {
    return;
  }

  await setLock();

  const signalModel: SignalModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.SIGNAL
  );
  const candleModel: CandleModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.CANDLE
  );
  const marketModel: MarketModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.MARKET
  );
  const positionModel: PositionModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.POSITION
  );

  const count = await candleModel.countDocuments({
    $and: [
      { symbol },
      { open_time: { $gte: Date.now() - getTimeDiff(155, interval) } }
    ]
  });

  if (count < 150) {
    await removeLock();

    return;
  }

  //last 10
  const candles: LeanCandleDocument[] = await candleModel
    .find({
      $and: [
        { symbol },
        { open_time: { $gte: Date.now() - getTimeDiff(10, interval) } }
      ]
    })
    .hint('symbol_1_open_time_1')
    .sort({ open_time: 1 })
    .lean();

  const last_candle = cloneObject(candles[candles.length - 1]);

  const hoursLookup = server.app.SIGNAL_HOURS_LOOKUP;
  const positionHoursLookup = server.app.LAST_POSITION_HOURS_LOOKUP;

  const open_signals: LeanSignalDocument[] = await signalModel
    .find({
      $and: [
        { symbol },
        { status: POSITION_STATUS.OPEN },
        { trigger_time: { $gt: Date.now() - hoursLookup } }
      ]
    })
    .hint('symbol_1_status_1_trigger_time_-1')
    .sort({ trigger_time: -1 })
    .lean();

  if (open_signals.length === 0) {
    const last_open_position: LeanPositionDocument = await positionModel
      .findOne({
        $and: [
          { symbol },
          { status: POSITION_STATUS.OPEN },
          { open_time: { $gt: Date.now() - positionHoursLookup } }
        ]
      })
      .hint('symbol_1_status_1_open_time_-1')
      .sort({ open_time: -1 })
      .lean();

    const triggeredSignal = applyStrategy(candles, last_open_position);

    if (triggeredSignal) {
      const id = `${symbol}_${interval}_${last_candle.event_time}`;

      try {
        await signalModel.create({
          ...triggeredSignal,
          trailing_stop_buy: toSymbolPrecision(
            last_candle.close_price,
            last_candle.symbol
          ),
          open_candle: getPlainCandle(last_candle),
          id
        });
      } catch (error: unknown) {
        if ((error as MongoError).code === 11000) {
          server.log(
            ['warn', 'create-signal'],
            `Trying to create duplicate signal with ID '${id}'`
          );
        }
        server.log(['error'], error as object);
      }
    }

    await removeLock();

    return;
  }

  const publishPosition = server.plugins.broker.publish;

  const updated_signals_promises = open_signals.map(
    async (open_signal, index) => {
      try {
        if (index > 0) {
          return signalModel.findByIdAndRemove(open_signal._id);
        }

        const market: LeanMarketDocument = await marketModel
          .findOne({ symbol: open_signal.symbol })
          .hint('symbol_1')
          .lean();

        if (
          last_candle.close_price >= open_signal.trailing_stop_buy &&
          !open_signal.trader_lock &&
          !market.trader_lock
        ) {
          const close_price = toSymbolPrecision(
            open_signal.trailing_stop_buy,
            last_candle.symbol
          );

          const updatedSignal = await signalModel.findByIdAndUpdate(
            open_signal._id,
            {
              $set: {
                status: POSITION_STATUS.CLOSED,
                price: close_price,
                close_candle: getPlainCandle(last_candle),
                close_time: Date.now(),
                close_date: new Date(),
                broadcast: market.broadcast_signals
              }
            },
            { new: true }
          );

          try {
            const createdPosition = await createPosition(
              server,
              updatedSignal as SignalDocument,
              last_candle
            );

            publishPosition(POSITION_EVENTS.POSITION_CREATED, createdPosition);
          } catch (error: unknown) {
            if ((error as MongoError).code === 11000) {
              server.log(
                ['warn', 'create-position'],
                `Trying to create duplicate position for signal with ID '${updatedSignal?._id}'`
              );
            }
            server.log(['error'], error as object);
          }

          return Promise.resolve();
        }

        const tsb = toSymbolPrecision(
          last_candle.close_price,
          last_candle.symbol
        );

        if (tsb < open_signal.trailing_stop_buy) {
          await signalModel.findByIdAndUpdate(open_signal._id, {
            $set: { trailing_stop_buy: tsb }
          });
        }

        return Promise.resolve();
      } catch (error: unknown) {
        server.log(['error', 'process-signals'], error as object);
      }
    }
  );

  await Promise.all(updated_signals_promises);

  await removeLock();

  return;
};
