import joi from 'joi';
import dotenv from 'dotenv';
dotenv.config();
import { QUOTE_ASSETS, validateObjectSchema } from '@jwd-crypto-signals/common';

const env = validateObjectSchema(
  process.env,
  joi.object({
    NODE_ENV: joi.string().default('development'),
    INTERVAL: joi
      .string()
      .pattern(new RegExp('^[\\d]{1,2}(d|h|m)$'))
      .required(),
    RABBITMQ_SERVICE_HOST: joi.string().trim().hostname().required(),
    RABBITMQ_SERVICE_PORT: joi.number().port().default(5672),
    QUOTE_ASSET: joi
      .string()
      .valid(QUOTE_ASSETS.BTC, QUOTE_ASSETS.BUSD)
      .required()
  })
);

export const INTERVAL = env.INTERVAL ?? '';
export const MESSAGE_BROKER_URI = `amqp://${env.RABBITMQ_SERVICE_HOST}:${env.RABBITMQ_SERVICE_PORT}`;
export const QUOTE_ASSET = env.QUOTE_ASSET ?? '';
