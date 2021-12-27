import joi from 'joi';
import dotenv from 'dotenv';
dotenv.config();
import {
  MILLISECONDS,
  QUOTE_ASSETS,
  validateObjectSchema
} from '@jwd-crypto-signals/common';

const env = validateObjectSchema(
  process.env,
  joi.object({
    NODE_ENV: joi.string().default('development'),
    MONGODB_SERVICE_HOST: joi.string().trim().hostname().required(),
    MONGODB_SERVICE_PORT: joi.number().port().default(27017),
    MONGODB_DATABASE: joi.string().trim().required(),
    REDIS_SERVICE_HOST: joi.string().trim().hostname().required(),
    REDIS_SERVICE_PORT: joi.number().port().default(6379),
    MESSAGE_BROKER_SERVICE_HOST: joi.string().trim().hostname().required(),
    MESSAGE_BROKER_SERVICE_PORT: joi.number().port().default(4222),
    PROCESS_CANDLES_INTERVAL: joi.number().integer().positive().required(),
    CANDLE_INTERVAL: joi
      .string()
      .pattern(new RegExp('^[\\d]{1,2}(d|h|m)$'))
      .required(),
    BINANCE_API_URL: joi.string().trim().uri().required(),
    BINANCE_API_KEY: joi.string().trim().base64().required(),
    BINANCE_API_SECRET: joi.string().trim().base64().required(),
    QUOTE_ASSET: joi
      .string()
      .valid(QUOTE_ASSETS.BTC, QUOTE_ASSETS.BUSD)
      .required()
  })
);

export const MONGODB_URI = `mongodb://${env.MONGODB_SERVICE_HOST}:${env.MONGODB_SERVICE_PORT}/${env.MONGODB_DATABASE}`;
export const REDIS_URI = `redis://${env.REDIS_SERVICE_HOST}:${env.REDIS_SERVICE_PORT}`;
export const MESSAGE_BROKER_URI = `http://${env.MESSAGE_BROKER_SERVICE_HOST}:${env.MESSAGE_BROKER_SERVICE_PORT}`;
export const PROCESS_CANDLES_INTERVAL =
  +(env.PROCESS_CANDLES_INTERVAL ?? 60) * MILLISECONDS.SECOND;
export const CANDLE_INTERVAL = env.CANDLE_INTERVAL ?? '';
export const BINANCE_API_URL = env.BINANCE_API_URL ?? '';
export const BINANCE_API_KEY = env.BINANCE_API_KEY ?? '';
export const BINANCE_API_SECRET = env.BINANCE_API_SECRET ?? '';
