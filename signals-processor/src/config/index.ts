import Joi from 'joi';
import dotenv from 'dotenv';
dotenv.config();
import {
  MILLISECONDS,
  QUOTE_ASSETS,
  validateObjectSchema
} from '@jwd-crypto-signals/common';

const env = validateObjectSchema(
  process.env,
  Joi.object({
    NODE_ENV: Joi.string().default('development'),
    MONGODB_PROTOCOL: Joi.string().valid('mongodb', 'mongodb+srv').required(),
    MONGODB_SERVICE_HOST: Joi.string().trim().hostname().required(),
    MONGODB_SERVICE_PORT: Joi.number().port(),
    MONGODB_USER: Joi.string().trim(),
    MONGODB_PASSWORD: Joi.string().trim(),
    MONGODB_DATABASE: Joi.string().required(),
    REDIS_SERVICE_HOST: Joi.string().trim().hostname().required(),
    REDIS_SERVICE_PORT: Joi.number().port().default(6379),
    MESSAGE_BROKER_SERVICE_HOST: Joi.string().hostname().required(),
    MESSAGE_BROKER_SERVICE_PORT: Joi.number().port().default(4222),
    SIGNAL_HOURS_LOOKUP: Joi.number().integer().positive().default(48),
    LAST_POSITION_HOURS_LOOKUP: Joi.number()
      .integer()
      .positive()
      .default(365 * 24),
    POSITION_TAKE_PROFIT: Joi.number().integer().positive().required(),
    QUOTE_ASSET: Joi.string()
      .valid(QUOTE_ASSETS.BTC, QUOTE_ASSETS.BUSD)
      .required(),
    CANDLE_INTERVAL: Joi.string()
      .pattern(new RegExp('^[\\d]{1,2}(d|h|m)$'))
      .required()
  })
);

const MONGODB_PROTOCOL = env.MONGODB_PROTOCOL ?? '';
const MONGODB_USER = env.MONGODB_USER
  ? `${env.MONGODB_USER}:${env.MONGODB_PASSWORD}@`
  : '';
const MONGODB_HOST = `${env.MONGODB_SERVICE_HOST}${
  env.MONGODB_SERVICE_PORT ? `:${env.MONGODB_SERVICE_PORT}` : ''
}`;

export const MONGODB_URI = `${MONGODB_PROTOCOL}://${MONGODB_USER}${MONGODB_HOST}/${env.MONGODB_DATABASE}`;
export const REDIS_URI = `redis://${env.REDIS_SERVICE_HOST}:${env.REDIS_SERVICE_PORT}`;
export const MESSAGE_BROKER_URI = `http://${env.MESSAGE_BROKER_SERVICE_HOST}:${env.MESSAGE_BROKER_SERVICE_PORT}`;
export const SIGNAL_HOURS_LOOKUP =
  +(env.SIGNAL_HOURS_LOOKUP ?? '') * MILLISECONDS.HOUR;
export const LAST_POSITION_HOURS_LOOKUP =
  +(env.LAST_POSITION_HOURS_LOOKUP ?? '') * MILLISECONDS.HOUR;
export const POSITION_TAKE_PROFIT = +(env.POSITION_TAKE_PROFIT ?? '');
