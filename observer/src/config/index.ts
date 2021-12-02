import dotenv from 'dotenv';
dotenv.config();
export const INTERVAL = process.env.INTERVAL ?? '';
export const RABBITMQ_URI = process.env.RABBITMQ_URI ?? '';
export const RABBITMQ_CHANNEL = process.env.RABBITMQ_CHANNEL ?? '';
