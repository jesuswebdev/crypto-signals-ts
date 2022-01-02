import joi from 'joi';
import dotenv from 'dotenv';
dotenv.config();
import { QUOTE_ASSETS, validateObjectSchema } from '@jwd-crypto-signals/common';

const env = validateObjectSchema(
  process.env,
  joi.object({
    NODE_ENV: joi.string().default('development'),
    MONGODB_PROTOCOL: joi.string().valid('mongodb', 'mongodb+srv').required(),
    MONGODB_SERVICE_HOST: joi.string().trim().hostname().required(),
    MONGODB_SERVICE_PORT: joi.number().port(),
    MONGODB_USER: joi.string().trim(),
    MONGODB_PASSWORD: joi.string().trim(),
    MONGODB_DATABASE: joi.string().trim().required(),
    BINANCE_API_URL: joi.string().trim().uri().required(),
    BINANCE_API_KEY: joi.string().trim().base64().required(),
    BINANCE_API_SECRET: joi.string().trim().base64().required(),
    QUOTE_ASSET: joi
      .string()
      .valid(QUOTE_ASSETS.BTC, QUOTE_ASSETS.BUSD)
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
export const BINANCE_API_URL = env.BINANCE_API_URL ?? '';
export const BINANCE_API_KEY = env.BINANCE_API_KEY ?? '';
export const BINANCE_API_SECRET = env.BINANCE_API_SECRET ?? '';
export const QUOTE_ASSET = env.QUOTE_ASSET ?? '';
export const ENVIRONMENT = env.NODE_ENV ?? '';
