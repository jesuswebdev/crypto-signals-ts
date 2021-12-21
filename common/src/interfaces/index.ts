import { Connection } from 'mongoose';
export * from './candle';
export * from './market';

export interface MessageBrokerPlugin {
  publish: <T>(topic: string, data: T) => void;
}
export interface MongoosePlugin {
  connection: Connection;
}
