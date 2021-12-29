import {
  DATABASE_MODELS,
  LeanCandleDocument,
  PositionDocument,
  PositionModel,
  SignalDocument,
  SignalModel,
  toSymbolPrecision
} from '@jwd-crypto-signals/common';
import { Server } from '@hapi/hapi';
import { Types } from 'mongoose';

export const createPosition = async function createPosition(
  server: Server,
  signal: SignalDocument,
  candle: LeanCandleDocument
) {
  const positionModel: PositionModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.POSITION
  );
  const signalModel: SignalModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.SIGNAL
  );

  const price = signal.price;
  const stop_loss =
    candle.atr_stop < price ? candle.atr_stop : price - candle.atr * 3;

  const createdPosition: PositionDocument = await positionModel.create({
    id: `${candle.symbol}_${candle.interval}_${candle.event_time}`,
    symbol: signal.symbol,
    open_time: Date.now(),
    date: new Date(),
    buy_price: price,
    take_profit: toSymbolPrecision(
      price * (1 + server.app.POSITION_TAKE_PROFIT / 100),
      signal.symbol
    ),
    stop_loss: toSymbolPrecision(stop_loss, signal.symbol),
    trigger: signal.trigger,
    signal: signal._id,
    last_stop_loss_update: Date.now(),
    broadcast: signal.broadcast
  });

  await signalModel
    .updateOne(
      { _id: new Types.ObjectId(signal._id) },
      { $set: { position: createdPosition._id } }
    )
    .hint('_id_');

  return createdPosition;
};
