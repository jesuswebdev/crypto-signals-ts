import { Server } from '@hapi/hapi';
import {
  CandleTickData,
  DATABASE_MODELS,
  getChange,
  POSITION_EVENTS,
  POSITION_STATUS,
  toSymbolPrecision
} from '@jwd-crypto-signals/common';
import { applyStrategy } from '../../strategy';

export const processOpenPositions = async function processOpenPositions(
  server: Server,
  candle: CandleTickData
) {
  const positionModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.POSITION
  );

  const publish = server.plugins.broker.publish;

  const results = await applyStrategy(server, candle);

  if (results.length > 0) {
    for (const result of results) {
      if (!result) {
        continue;
      }

      const { position, candle, sell_trigger } = result;

      try {
        if (position) {
          const profit = toSymbolPrecision(
            candle.close_price * position.buy_amount -
              position.buy_price * position.buy_amount,
            candle.symbol
          );

          const sell_price = toSymbolPrecision(
            candle.close_price,
            candle.symbol
          );

          const closedPosition = await positionModel.findOneAndUpdate(
            { _id: position._id },
            {
              $set: {
                sell_price,
                close_date: new Date(),
                close_time: Date.now(),
                status: POSITION_STATUS.CLOSED,
                change: getChange(candle.close_price, position.buy_price),
                sell_trigger,
                profit,
                sell_candle: candle
              }
            },
            { new: true }
          );

          publish(POSITION_EVENTS.POSITION_CLOSED, closedPosition, {
            expiration: undefined
          });
        }
      } catch (error) {
        await positionModel.findByIdAndUpdate(position._id, {
          $set: { status: POSITION_STATUS.OPEN }
        });
        throw error;
      }
    }
  }
};
