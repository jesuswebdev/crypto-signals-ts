import { Connection } from 'mongoose';
import { RedisClientType } from 'redis';
export * from './candle';
export * from './market';
export * from './signal';
export * from './position';

export interface PublishOptions {
  expiration?: string | number | undefined;
  userId?: string | undefined;
  CC?: string | string[] | undefined;

  mandatory?: boolean | undefined;
  persistent?: boolean | undefined;
  deliveryMode?: boolean | number | undefined;
  BCC?: string | string[] | undefined;

  contentType?: string | undefined;
  contentEncoding?: string | undefined;
  // eslint-disable-next-line
  headers?: any;
  priority?: number | undefined;
  correlationId?: string | undefined;
  replyTo?: string | undefined;
  messageId?: string | undefined;
  timestamp?: number | undefined;
  type?: string | undefined;
  appId?: string | undefined;
}

export interface MessageBrokerPlugin {
  publish: <T>(topic: string, data: T, options?: PublishOptions) => void;
}
export interface MongoosePlugin {
  connection: Connection;
}

export interface RedisPlugin {
  client: RedisClientType;
}
