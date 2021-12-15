import mongoose, { SchemaOptions } from 'mongoose';
import { PAIRS, numberSchemaValidation } from '../index';
import { CandleAttributes } from '../interfaces/Candle';

export function createCandleSchema(options: SchemaOptions = {}) {
  return new mongoose.Schema<CandleAttributes>(
    {
      id: {
        type: String,
        required: true,
        validate: (value: string) =>
          value.match(new RegExp('^binance_.+_[\\d]{1,2}(d|h|m)_\\d+$'))
      },
      exchange: {
        type: String,
        required: true,
        enum: ['binance'],
        default: 'binance'
      },
      symbol: {
        type: String,
        required: true,
        validate: (value: string) => PAIRS.map(p => p.symbol).includes(value)
      },
      open_time: {
        type: Number,
        required: true,
        validate: numberSchemaValidation
      },
      close_time: {
        type: Number,
        required: true,
        validate: numberSchemaValidation
      },
      interval: {
        type: String,
        required: true,
        validate: (value: string) =>
          value.match(new RegExp('^[\\d]{1,2}(d|h|m)$'))
      },
      open_price: {
        type: Number,
        required: true,
        validate: numberSchemaValidation
      },
      close_price: {
        type: Number,
        required: true,
        validate: numberSchemaValidation
      },
      high_price: {
        type: Number,
        required: true,
        validate: numberSchemaValidation
      },
      low_price: {
        type: Number,
        required: true,
        validate: numberSchemaValidation
      },
      base_asset_volume: {
        type: Number,
        required: true,
        validate: numberSchemaValidation
      },
      quote_asset_volume: {
        type: Number,
        required: true,
        validate: numberSchemaValidation
      },
      amplitude: { type: Number, validate: numberSchemaValidation },
      change: { type: Number, validate: numberSchemaValidation },
      rsi: { type: Number, validate: numberSchemaValidation },
      will_r: { type: Number, validate: numberSchemaValidation },
      ema: { type: Number, validate: numberSchemaValidation },
      bbands_upper: { type: Number, validate: numberSchemaValidation },
      bbands_middle: { type: Number, validate: numberSchemaValidation },
      bbands_lower: { type: Number, validate: numberSchemaValidation },
      bbands_direction: { type: String, enum: ['up', 'down', 'side'] },
      macd: { type: Number, validate: numberSchemaValidation },
      macd_signal: { type: Number, validate: numberSchemaValidation },
      macd_histogram: { type: Number, validate: numberSchemaValidation },
      parabolic_sar: { type: Number, validate: numberSchemaValidation },
      date: { type: String, required: true },
      mama: { type: Number, validate: numberSchemaValidation },
      fama: { type: Number, validate: numberSchemaValidation },
      atr: { type: Number, validate: numberSchemaValidation },
      atr_stop: { type: Number, validate: numberSchemaValidation },
      atr_sma: { type: Number, validate: numberSchemaValidation },
      ema_7: { type: Number, validate: numberSchemaValidation },
      ema_25: { type: Number, validate: numberSchemaValidation },
      ema_100: { type: Number, validate: numberSchemaValidation },
      volume_sma: { type: Number, validate: numberSchemaValidation },
      event_time: { type: Number, validate: numberSchemaValidation },
      stoch_rsi_k: { type: Number, validate: numberSchemaValidation },
      stoch_rsi_d: { type: Number, validate: numberSchemaValidation },
      trend: { type: Number, enum: [1, -1], validate: numberSchemaValidation },
      trend_up: { type: Number, validate: numberSchemaValidation },
      trend_down: { type: Number, validate: numberSchemaValidation },
      adx: { type: Number, validate: numberSchemaValidation },
      plus_di: { type: Number, validate: numberSchemaValidation },
      minus_di: { type: Number, validate: numberSchemaValidation },
      obv: { type: Number, validate: numberSchemaValidation },
      obv_ema: { type: Number, validate: numberSchemaValidation },
      sma_50: { type: Number, validate: numberSchemaValidation },
      sma_100: { type: Number, validate: numberSchemaValidation },
      sma_200: { type: Number, validate: numberSchemaValidation },
      ch_atr: { type: Number, validate: numberSchemaValidation },
      ch_atr_ema: { type: Number, validate: numberSchemaValidation },
      ema_50: { type: Number, validate: numberSchemaValidation },
      is_pump: { type: Boolean, default: false },
      is_dump: { type: Boolean, default: false },
      volume_trend: {
        type: Number,
        enum: [1, -1],
        validate: numberSchemaValidation
      },
      ema_50_slope: {
        type: Number,
        enum: [1, -1],
        validate: numberSchemaValidation
      }
    },
    { timestamps: true, ...options }
  );
}
