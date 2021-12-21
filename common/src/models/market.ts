import mongoose, { SchemaOptions } from 'mongoose';
import { PAIRS, numberSchemaValidation } from '../index';
import { MarketAttributes } from '../interfaces';

export const createMarketSchema = function createMarketSchema(
  options: SchemaOptions = {}
) {
  const schema = new mongoose.Schema<MarketAttributes>(
    {
      symbol: {
        type: String,
        required: true,
        validate: (value: string) => PAIRS.map(p => p.symbol).includes(value),
        index: true
      },
      last_price: { type: Number, validate: numberSchemaValidation },
      last_trader_lock_update: { type: Number },
      trader_lock: { type: Boolean },
      broadcast_signals: { type: Boolean, default: false },
      use_main_account: { type: Boolean, default: false }
    },
    { timestamps: true, ...options }
  );

  schema.index({ trader_lock: 1, last_trader_lock_update: 1 });

  return schema;
};
