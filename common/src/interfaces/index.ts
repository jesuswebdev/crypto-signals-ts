import { Connection } from 'mongoose';
import { RedisClientType } from 'redis';
import { Options } from 'amqplib/properties';
export * from './candle';
export * from './market';
export * from './signal';
export * from './position';

//eslint-disable-next-line
interface PublishOptions extends Options.Publish {}

export interface MessageBrokerPlugin {
  publish: <T>(topic: string, data: T, options?: PublishOptions) => void;
}
export interface MongoosePlugin {
  connection: Connection;
}

export interface RedisPlugin {
  client: RedisClientType;
}
