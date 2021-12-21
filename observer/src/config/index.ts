import dotenv from 'dotenv';
dotenv.config();
export const INTERVAL = process.env.INTERVAL ?? '';
export const MESSAGE_BROKER_URI =
  `amqp://${process.env.RABBITMQ_SERVICE_HOST}:${process.env.RABBITMQ_SERVICE_PORT}` ??
  '';
