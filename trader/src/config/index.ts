import {
  BINANCE_ORDER_TYPES,
  QUOTE_ASSETS,
  validateObjectSchema
} from '@jwd-crypto-signals/common';
import Joi from 'joi';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(
    __dirname,
    `../../.env${process.env.NODE_ENV ? '.' + process.env.NODE_ENV : ''}`
  )
});

const env = validateObjectSchema(
  process.env,
  Joi.object({
    MONGODB_SERVICE_HOST: Joi.string().hostname().required(),
    MONGODB_SERVICE_PORT: Joi.number().port().default(27017),
    MONGODB_DATABASE: Joi.string().required(),
    RABBITMQ_SERVICE_HOST: Joi.string().hostname().required(),
    RABBITMQ_SERVICE_PORT: Joi.number().port().default(5672),
    NODE_ENV: Joi.string().default('development'),
    QUOTE_ASSET: Joi.string().trim().allow(QUOTE_ASSETS).required(),
    BUY_ORDER_TYPE: Joi.string().allow(BINANCE_ORDER_TYPES).required(),
    SELL_ORDER_TYPE: Joi.string().allow(BINANCE_ORDER_TYPES).required(),
    DEFAULT_BUY_AMOUNT: Joi.number().positive().greater(0).required(),
    BINANCE_API_URL: Joi.string().trim().uri().required(),
    BINANCE_API_KEY: Joi.string().trim().base64().required(),
    BINANCE_API_SECRET: Joi.string().trim().base64().required(),
    BINANCE_MINIMUM_ORDER_SIZE: Joi.number().positive().greater(0).required(),
    BUY_ORDER_TTL: Joi.number().integer().positive().greater(0).default(600),
    SELL_ORDER_TTL: Joi.number().integer().positive().greater(0).default(600)
  })
);

export const MONGODB_URI = `mongodb://${env.MONGODB_SERVICE_HOST}:${env.MONGODB_SERVICE_PORT}/${env.MONGODB_DATABASE}`;
export const MESSAGE_BROKER_URI = `amqp://${env.RABBITMQ_SERVICE_HOST}:${env.RABBITMQ_SERVICE_PORT}`;
export const QUOTE_ASSET = process.env.QUOTE_ASSET ?? '';
export const BUY_ORDER_TYPE = process.env.BUY_ORDER_TYPE ?? '';
export const SELL_ORDER_TYPE = process.env.SELL_ORDER_TYPE ?? '';
export const DEFAULT_BUY_AMOUNT = +(process.env.DEFAULT_BUY_AMOUNT ?? 0);
export const BINANCE_API_URL = process.env.BINANCE_API_URL ?? '';
export const BINANCE_API_KEY = process.env.BINANCE_API_KEY ?? '';
export const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET ?? '';
export const BINANCE_MINIMUM_ORDER_SIZE = +(
  process.env.BINANCE_MINIMUM_ORDER_SIZE ?? 0
);
export const BUY_ORDER_TTL = +(process.env.BUY_ORDER_TTL ?? 0);
export const SELL_ORDER_TTL = +(process.env.SELL_ORDER_TTL ?? 0);