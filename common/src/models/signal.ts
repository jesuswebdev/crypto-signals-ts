import { SchemaOptions, Schema } from 'mongoose';
import { DATABASE_MODELS, POSITION_STATUS } from '../constants';
import { numberSchemaValidation } from '../index';
import { SignalAttributes } from '../interfaces/signal';

export const createSignalSchema = function createSignalSchema(
  options: SchemaOptions = {}
) {
  const schema = new Schema<SignalAttributes>(
    {
      id: { type: String, required: true },
      time: { type: Number, required: true, validate: numberSchemaValidation },
      trigger_time: {
        type: Number,
        required: true,
        validate: numberSchemaValidation
      },
      close_time: { type: Number, validate: numberSchemaValidation },
      symbol: { type: String, required: true },
      interval: {
        type: String,
        required: true
      },
      price: { type: Number, required: true, validate: numberSchemaValidation },
      type: { type: String, required: true, enum: ['BUY', 'SELL'] },
      date: { type: Date, required: true },
      close_date: { type: Date },
      drop_price: { type: Number, validate: numberSchemaValidation },
      trigger: { type: String, required: true },
      status: {
        type: String,
        enum: POSITION_STATUS,
        default: POSITION_STATUS.OPEN
      },
      trailing_stop_buy: {
        type: Number,
        required: true,
        validate: numberSchemaValidation
      },
      open_candle: { type: Object },
      close_candle: { type: Object },
      drop_percent: { type: Number, validate: numberSchemaValidation },
      position: { type: Schema.Types.ObjectId, ref: DATABASE_MODELS.POSITION },
      broadcast: { type: Boolean, default: false },
      trader_lock: { type: Boolean, default: false },
      buy_order: { type: Object }
    },
    { timestamps: true, ...options }
  );

  schema.index({ 'buy_order.orderId': 1 });
  schema.index({ 'close_candle.id': 1 });
  schema.index({ symbol: 1, status: 1, trigger_time: -1 });
  schema.index({ symbol: 1, status: 1, close_time: -1 });
  schema.index({ id: 1 });

  return schema;
};
