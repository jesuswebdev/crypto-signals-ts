import { Connection } from 'mongoose';
import { RedisClientType } from 'redis';
import amqplib from 'amqplib';
export * from './candle';
export * from './market';
export * from './signal';
export * from './position';

export interface MessageBrokerPlugin {
  publish: <T>(
    topic: string,
    data: T,
    options?: amqplib.Options.Publish
  ) => void;
}
export interface MongoosePlugin {
  connection: Connection;
}

export interface RedisPlugin {
  client: RedisClientType;
}
