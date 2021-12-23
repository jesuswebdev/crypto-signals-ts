import { validateObjectSchema } from '@jwd-crypto-signals/common';
import joi from 'joi';
import dotenv from 'dotenv';
dotenv.config();

validateObjectSchema(
  process.env,
  joi.object({
    INTERVAL: joi
      .string()
      .pattern(new RegExp('^[\\d]{1,2}(d|h|m)$'))
      .required(),
    RABBITMQ_SERVICE_HOST: joi.string().trim().hostname().required(),
    RABBITMQ_SERVICE_PORT: joi.number().port().default(5672)
  })
);

export const INTERVAL = process.env.INTERVAL ?? '';
export const MESSAGE_BROKER_URI =
  `amqp://${process.env.RABBITMQ_SERVICE_HOST}:${process.env.RABBITMQ_SERVICE_PORT}` ??
  '';
