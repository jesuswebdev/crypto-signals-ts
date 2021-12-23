import dotenv from 'dotenv';
dotenv.config();

export const MONGODB_URI =
  `mongodb://${process.env.MONGODB_SERVICE_HOST}:${process.env.MONGODB_SERVICE_PORT}/${process.env.MONGODB_DATABASE}` ??
  '';
export const MESSAGE_BROKER_URI =
  `amqp://${process.env.RABBITMQ_SERVICE_HOST}:${process.env.RABBITMQ_SERVICE_PORT}` ??
  '';
