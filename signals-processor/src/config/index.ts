import { MILLISECONDS, validateObjectSchema } from '@jwd-crypto-signals/common';
import Joi from 'joi';
import dotenv from 'dotenv';
dotenv.config();

validateObjectSchema(
  process.env,
  Joi.object({
    MONGODB_SERVICE_HOST: Joi.string().hostname().required(),
    MONGODB_SERVICE_PORT: Joi.number().port().default(27017),
    MONGODB_DATABASE: Joi.string().required(),
    RABBITMQ_SERVICE_HOST: Joi.string().hostname().required(),
    RABBITMQ_SERVICE_PORT: Joi.number().port().default(5672),
    SIGNAL_HOURS_LOOKUP: Joi.number().integer().positive().default(48),
    LAST_POSITION_HOURS_LOOKUP: Joi.number()
      .integer()
      .positive()
      .default(365 * 24),
    POSITION_TAKE_PROFIT: Joi.number().integer().positive().required()
  })
);

export const MONGODB_URI =
  `mongodb://${process.env.MONGODB_SERVICE_HOST}:${process.env.MONGODB_SERVICE_PORT}/${process.env.MONGODB_DATABASE}` ??
  '';
export const MESSAGE_BROKER_URI =
  `amqp://${process.env.RABBITMQ_SERVICE_HOST}:${process.env.RABBITMQ_SERVICE_PORT}` ??
  '';

export const SIGNAL_HOURS_LOOKUP =
  +(process.env.SIGNAL_HOURS_LOOKUP ?? '') * MILLISECONDS.HOUR;

export const LAST_POSITION_HOURS_LOOKUP =
  +(process.env.LAST_POSITION_HOURS_LOOKUP ?? '') * MILLISECONDS.HOUR;

export const POSITION_TAKE_PROFIT = +(process.env.POSITION_TAKE_PROFIT ?? '');
