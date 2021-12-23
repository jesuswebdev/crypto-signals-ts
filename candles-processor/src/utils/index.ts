import { Server } from '@hapi/hapi';
import {
  CandleAttributes,
  numberIsValid,
  CandleModel,
  LeanCandleDocument,
  MarketModel,
  getTimeDiff,
  CandleTickData,
  DATABASE_MODELS,
  getBooleanValue,
  cloneObject,
  toSymbolPrecision
} from '@jwd-crypto-signals/common';
import {
  getMESA,
  getATR,
  getOBV,
  getDMI,
  getMACD,
  getEMASlope,
  getVolumeTrend,
  getPumpOrDump,
  getCHATR,
  getSupertrend,
  getATRStop
} from './indicators';

export interface OHLC {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  hl2: number[];
}

interface RedisError {
  code: string;
}

export const getOHLCValues = function getOHLCValues(array: CandleAttributes[]) {
  const assertValue = (value: number) => {
    if (!numberIsValid(value)) {
      throw new Error('Invalid OHLC value: ' + value);
    }

    return value;
  };

  const ohlc: OHLC = {
    open: [],
    high: [],
    low: [],
    close: [],
    volume: [],
    hl2: []
  };

  for (const candle of array) {
    ohlc.open.push(assertValue(candle.open_price));
    ohlc.high.push(assertValue(candle.high_price));
    ohlc.low.push(assertValue(candle.low_price));
    ohlc.close.push(assertValue(candle.close_price));
    ohlc.volume.push(assertValue(candle.base_asset_volume));
    ohlc.hl2.push(assertValue((candle.high_price + candle.low_price) / 2));
  }

  return ohlc;
};

/**
 * @description Calculates indicators values of given candles and saves to database.
 */
export const processCandles = async function processCandles(
  server: Server,
  candles: CandleTickData[]
) {
  if (candles.length === 0) {
    return;
  }

  const candleModel: CandleModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.CANDLE
  );
  const symbol = candles[0].symbol;
  const candlesToUpdate = candles;

  const toUpdate: LeanCandleDocument[] = await candleModel
    .find({ id: { $in: candlesToUpdate.map(({ id }) => id) } })
    .hint('id_1')
    .sort({ open_time: 1 })
    .lean();

  const updates: Record<
    string,
    string | number | boolean | null | undefined
  >[] = [];

  for (const candle of toUpdate) {
    // try find all and filter based on open_time
    const candles: LeanCandleDocument[] = await candleModel
      .find({
        $and: [
          { symbol },
          {
            open_time: {
              $gte: candle.open_time - getTimeDiff(155, candle.interval)
            }
          },
          { open_time: { $lte: candle.open_time } }
        ]
      })
      .hint('symbol_1_open_time_1')
      .sort({ open_time: 1 })
      .lean();

    if (candles.length >= 150) {
      const ohlc = getOHLCValues(candles);
      const indicators = await getIndicatorsValues(ohlc, candles);
      updates.push({ id: candle.id, ...indicators });
    }
  }

  if (updates.length > 0) {
    await candleModel.bulkWrite(
      updates.map(value => ({
        updateOne: {
          filter: { id: value.id },
          update: { $set: value },
          upsert: true
        }
      })),
      { ordered: false }
    );
  }
};

const parseValue = function parseValue(symbol: string, value: number) {
  if (!numberIsValid(value)) {
    return null;
  }

  return toSymbolPrecision(value, symbol);
};

const getIndicatorsValues = async function getIndicatorsValues(
  ohlc: OHLC,
  candles: LeanCandleDocument[]
) {
  const { high, close, low, volume, hl2 } = ohlc;
  const [previous_candle, current_candle] = cloneObject(candles.slice(-2));

  const parseFn = parseValue.bind(null, current_candle.symbol);

  const promises = [
    getATR([high, low, close], { parseFn }),
    getOBV([close, volume], { parseFn }),
    getDMI([high, low, close], { parseFn }),
    getMACD([close], { parseFn }),
    getEMASlope(ohlc, { parseFn }),
    ...(!previous_candle.trend && !current_candle.trend
      ? [
        getCumulativeIndicator({
          candles,
          ohlc,
          getter: ({ trend, trend_up, trend_down } = {}) => ({
            trend,
            trend_up,
            trend_down
          }),
          fn: getSupertrend,
          parseFn
        })
      ]
      : [getSupertrend(candles, ohlc, { parseFn })]),
    ...(!previous_candle.atr_stop && !current_candle.atr_stop
      ? [
        getCumulativeIndicator({
          candles,
          ohlc,
          getter: ({ atr_stop } = {}) => ({ atr_stop }),
          fn: getATRStop,
          parseFn
        })
      ]
      : [getATRStop(candles, ohlc, { parseFn })]),
    getCHATR(candles, ohlc),
    getPumpOrDump(ohlc, { parseFn })
  ];

  const p = await Promise.all(promises);
  const result = p.reduce((acc, v) => ({ ...acc, ...v }), {});
  const mesa_result = getMESA(hl2);

  return {
    ...result,
    mama: parseFn(mesa_result.mama),
    fama: parseFn(mesa_result.fama),
    ...getVolumeTrend(ohlc)
  };
};

const getRedisKeys = function getRedisKeys(candle: CandleTickData) {
  return {
    lastProcessDate: `${candle.symbol}_last_candles_process_date`,
    candlesPersistLock: `${candle.symbol}_candles_persist_lock`,
    hasOpenSignal: `${candle.symbol}_has_open_signal`,
    candles: `${candle.symbol}_candles`
  };
};

/**
 * @description Checks if candles need to be processed further according to `PROCESS_CANDLES_INTERVAL` environment variable.
 * If the candles need to be processed, it will take all the candles stored in redis, filter out the latest values, save to mongodb, and return them,
 * otherwise it stores the candle data in redis.
 */
export const processCandleTick = async function processCandleTick(
  server: Server,
  candle: CandleTickData
) {
  const redis = server.plugins.redis.client;
  const processCandlesInterval = server.app.PROCESS_CANDLES_INTERVAL;

  const candleModel: CandleModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.CANDLE
  );

  const marketModel: MarketModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.MARKET
  );

  const redisKeys = getRedisKeys(candle);

  const lastCandlesProcessDate = await redis.get(redisKeys.lastProcessDate);

  const candlesPersistLock = getBooleanValue(
    await redis.get(redisKeys.candlesPersistLock)
  );

  // force remove lock if it hasn't been removed in the last 2 interval check
  if (
    Date.now() - +(lastCandlesProcessDate || 0) > processCandlesInterval * 2 &&
    !!candlesPersistLock
  ) {
    await redis.del(redisKeys.candlesPersistLock);
  }

  if (
    Date.now() - +(lastCandlesProcessDate || 0) > processCandlesInterval &&
    !candlesPersistLock
  ) {
    await redis.set(redisKeys.candlesPersistLock, 1);
    await redis.set(redisKeys.lastProcessDate, Date.now());

    const length = await redis.lLen(redisKeys.candles);

    const candles = (await redis.lPopCount(redisKeys.candles, length)) || [];

    candles.push(JSON.stringify(candle));

    const toUpdate: CandleTickData[] = Object.values(
      candles.reduce((acc, candle) => {
        const parsed: CandleTickData = JSON.parse(candle);

        return { ...acc, [parsed.id]: parsed };
      }, {})
    );

    if (toUpdate.length > 0) {
      await candleModel.bulkWrite(
        toUpdate.map(value => ({
          updateOne: {
            filter: { id: value.id },
            update: { $set: value },
            upsert: true
          }
        })),
        { ordered: false }
      );

      await marketModel.updateOne(
        { $and: [{ symbol: candle.symbol }] },
        { $set: { last_price: candle.close_price } },
        { upsert: true }
      );

      await redis.del(redisKeys.candlesPersistLock);

      return toUpdate;
    }

    await redis.del(redisKeys.candlesPersistLock);

    return;
  }

  try {
    await redis.rPush(redisKeys.candles, JSON.stringify(candle));
  } catch (error: unknown) {
    if ((error as RedisError).code === 'WRONGTYPE') {
      await redis.del(redisKeys.candles);
    } else {
      throw error;
    }
  }
};

export const buildCandles = function buildCandles({
  candles,
  symbol,
  interval
}: {
  candles: [number[]];
  symbol: string;
  interval: string;
}) {
  return candles.map(current => ({
    symbol,
    interval,
    id: `${symbol}_${interval}_${cloneObject(current[0])}`,
    event_time: +cloneObject(current[0]),
    open_time: +cloneObject(current[0]),
    close_time: +cloneObject(current[6]),
    open_price: +cloneObject(current[1]),
    close_price: +cloneObject(current[4]),
    high_price: +cloneObject(current[2]),
    low_price: +cloneObject(current[3]),
    base_asset_volume: +cloneObject(current[5]),
    number_of_trades: +cloneObject(current[8]),
    quote_asset_volume: +cloneObject(current[7]),
    date: new Date(+cloneObject(current[0])).toISOString()
  }));
};

const getCumulativeIndicator = async ({
  candles,
  ohlc,
  fn,
  getter,
  parseFn
}: {
  candles: LeanCandleDocument[];
  ohlc: OHLC;
  fn: CallableFunction;
  getter: (
    obj: LeanCandleDocument | Record<string, number | undefined>
  ) => Record<string, number | undefined>;
  parseFn: CallableFunction;
}) => {
  const result = await candles
    //eslint-disable-next-line
    .reduce(async (p_acc, candle, index, array) => {
      const acc = await p_acc;
      const sliced_candles = array.slice(0, index + 1).map(sliced => ({
        ...sliced,
        ...getter(acc.find(v => v.id === sliced.id) ?? {})
      }));
      const sliced_ohlc = Object.entries(ohlc).reduce(
        (acc, [key, value]) => ({ ...acc, [key]: value.slice(0, index + 1) }),
        {}
      );

      const value = await fn(sliced_candles, sliced_ohlc, { parseFn });

      return acc.concat({ ...candle, ...value });
    }, Promise.resolve<LeanCandleDocument[]>([]))
    .then(r => getter(r[r.length - 1]));

  return result;
};
