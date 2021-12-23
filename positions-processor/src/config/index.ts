import { validateObjectSchema } from '@jwd-crypto-signals/common';
import joi from 'joi';
import dotenv from 'dotenv';
dotenv.config();

validateObjectSchema(
  process.env,
  joi.object({
    MONGODB_SERVICE_HOST: joi.string().trim().hostname().required(),
    MONGODB_SERVICE_PORT: joi.number().port().default(27017),
    MONGODB_DATABASE: joi.string().trim().required(),
    RABBITMQ_SERVICE_HOST: joi.string().trim().hostname().required(),
    RABBITMQ_SERVICE_PORT: joi.number().port().default(5672)
  })
);

export const MONGODB_URI =
  `mongodb://${process.env.MONGODB_SERVICE_HOST}:${process.env.MONGODB_SERVICE_PORT}/${process.env.MONGODB_DATABASE}` ??
  '';
export const MESSAGE_BROKER_URI =
  `amqp://${process.env.RABBITMQ_SERVICE_HOST}:${process.env.RABBITMQ_SERVICE_PORT}` ??
  '';
