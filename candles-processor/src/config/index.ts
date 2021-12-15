import dotenv from 'dotenv';
dotenv.config();
export const MONGODB_URI = process.env.MONGODB_URI ?? '';
export const REDIS_URI = process.env.REDIS_URI ?? '';
export const RABBITMQ_URI = process.env.RABBITMQ_URI ?? '';
export const RABBITMQ_CHANNEL = process.env.RABBITMQ_CHANNEL ?? '';
