import { Connection } from 'mongoose';
import { RedisClientType } from 'redis';
export * from './candle';
export * from './market';

export interface MessageBrokerPlugin {
  publish: <T>(topic: string, data: T) => void;
}
export interface MongoosePlugin {
  connection: Connection;
}

export interface RedisPlugin {
  client: RedisClientType;
}