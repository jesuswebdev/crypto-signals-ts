import { Server } from '@hapi/hapi';
import {
  CandleModel,
  CandleTickData,
  DATABASE_MODELS,
  getTimeDiff,
  LeanCandleDocument,
  LeanPositionDocument,
  MILLISECONDS,
  PositionModel,
  POSITION_SELL_TRIGGER,
  POSITION_STATUS,
  toSymbolPrecision
} from '@jwd-crypto-signals/common';

export const applyStrategy = async function applyStrategy(
  server: Server,
  { symbol, interval }: CandleTickData
) {
  const candleModel: CandleModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.CANDLE
  );
  const positionModel: PositionModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.POSITION
  );

  const count = await candleModel
    .countDocuments({
      $and: [
        { symbol },
        { open_time: { $gte: Date.now() - getTimeDiff(155, interval) } },
        { open_time: { $lte: Date.now() } }
      ]
    })
    .hint('symbol_1_open_time_1');

  if (count < 150) {
    return [];
  }

  const candles: LeanCandleDocument[] = await candleModel
    .find({
      $and: [
        { symbol },
        { open_time: { $gte: Date.now() - getTimeDiff(10, interval) } },
        { open_time: { $lte: Date.now() } }
      ]
    })
    .hint('symbol_1_open_time_1')
    .sort({ open_time: 1 })
    .lean();

  /*
    Binance does not push candles during maintenance hours.
    Therefore when system comes back up, there is a gap between
    the last candle when maintenance started and when it finished
  */

  const [previous_candle, candle] = candles.slice(-2);

  const positions: LeanPositionDocument[] = await positionModel
    .find({
      $and: [{ symbol }, { status: POSITION_STATUS.OPEN }]
    })
    .hint('symbol_1_status_1')
    .lean();

  if (positions.length === 0) {
    return [];
  }

  const result = await Promise.all(
    positions.map(async position => {
      if (!candle || !previous_candle) {
        return;
      }

      if (
        candle.atr_stop !== position.stop_loss &&
        candle.atr_stop < candle.open_price
      ) {
        await positionModel.findByIdAndUpdate(position._id, {
          $set: {
            stop_loss: toSymbolPrecision(candle.atr_stop, candle.symbol)
          }
        });
      }

      const downwards_ema_slope =
        previous_candle.ema_50_slope === -1 && candle.ema_50_slope === -1;
      const downwards_trend = candle.trend === -1;

      const sell_condition =
        ((previous_candle.atr_stop < previous_candle.open_price &&
          previous_candle.atr_stop < candle.atr_stop &&
          candle.close_price < candle.atr_stop) ||
          (previous_candle.atr_stop > previous_candle.open_price &&
            candle.open_price < candle.atr_stop &&
            candle.close_price < candle.atr_stop)) &&
        (downwards_ema_slope || downwards_trend);

      if (sell_condition && !position.stop_loss_trigger_time) {
        await positionModel.findByIdAndUpdate(position._id, {
          $set: { stop_loss_trigger_time: Date.now() }
        });
      }

      const five_minutes_passed =
        position.stop_loss_trigger_time &&
        Date.now() - position.stop_loss_trigger_time > MILLISECONDS.MINUTE * 5;

      if (
        five_minutes_passed &&
        !sell_condition &&
        position.stop_loss_trigger_time
      ) {
        await positionModel.findByIdAndUpdate(position._id, {
          $unset: { stop_loss_trigger_time: true }
        });
      }

      if (
        five_minutes_passed &&
        sell_condition &&
        position.stop_loss_trigger_time
      ) {
        return {
          position,
          candle,
          sell_trigger: POSITION_SELL_TRIGGER.STOP_LOSS
        };
      }

      if (candle.close_price >= position.take_profit) {
        return {
          position,
          candle,
          sell_trigger: POSITION_SELL_TRIGGER.TAKE_PROFIT
        };
      }
    })
  );

  return result.filter(exists => exists);
};
