import { MILLISECONDS } from '@jwd-crypto-signals/common';
import dotenv from 'dotenv';
dotenv.config();

export const MONGODB_URI =
  `mongodb://${process.env.MONGODB_SERVICE_HOST}:${process.env.MONGODB_SERVICE_PORT}/${process.env.MONGODB_DATABASE}` ??
  '';
export const REDIS_URI =
  `redis://${process.env.REDIS_SERVICE_HOST}:${process.env.REDIS_SERVICE_PORT}` ??
  '';
export const MESSAGE_BROKER_URI =
  `amqp://${process.env.RABBITMQ_SERVICE_HOST}:${process.env.RABBITMQ_SERVICE_PORT}` ??
  '';

export const PROCESS_CANDLES_INTERVAL =
  +(process.env.PROCESS_CANDLES_INTERVAL ?? 60) * MILLISECONDS.SECOND;

export const CANDLE_INTERVAL = process.env.CANDLE_INTERVAL ?? '';
export const BINANCE_API_URL = process.env.BINANCE_API_URL ?? '';
export const BINANCE_API_KEY = process.env.BINANCE_API_KEY ?? '';
export const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET ?? '';
