import Hapi, { Server } from '@hapi/hapi';
import { messageBrokerPlugin } from './plugins/message-broker';
import { mongoosePlugin } from './plugins/mongoose';
import {
  MESSAGE_BROKER_URI,
  MONGODB_URI,
  LAST_POSITION_HOURS_LOOKUP,
  SIGNAL_HOURS_LOOKUP,
  POSITION_TAKE_PROFIT,
  REDIS_URI
} from './config/index';
import {
  MessageBrokerPlugin,
  MongoosePlugin,
  RedisPlugin
} from '@jwd-crypto-signals/common';
import { redisPlugin } from './plugins/redis';

let server: Server;

declare module '@hapi/hapi' {
  export interface PluginProperties {
    // eslint-disable-next-line
    [key: string]: any;
    mongoose: MongoosePlugin;
    broker: MessageBrokerPlugin;
    redis: RedisPlugin;
  }
  export interface ServerApplicationState {
    LAST_POSITION_HOURS_LOOKUP: number;
    SIGNAL_HOURS_LOOKUP: number;
    POSITION_TAKE_PROFIT: number;
  }
}

export async function init() {
  server = Hapi.server({ host: '0.0.0.0', port: process.env.PORT || 8080 });

  server.app.LAST_POSITION_HOURS_LOOKUP = LAST_POSITION_HOURS_LOOKUP;
  server.app.SIGNAL_HOURS_LOOKUP = SIGNAL_HOURS_LOOKUP;
  server.app.POSITION_TAKE_PROFIT = POSITION_TAKE_PROFIT;

  server.events.on('log', event => {
    if (event.error) {
      console.error(event);
    }
  });

  server.events.on('request', (request, event) => {
    if (event.error) {
      console.group(request.info.id);
      console.log('request', request.path);
      console.log('event', event);
      console.groupEnd();
    }
  });

  await server.register([
    { plugin: redisPlugin, options: { uri: REDIS_URI } },
    { plugin: mongoosePlugin, options: { uri: MONGODB_URI } },
    { plugin: messageBrokerPlugin, options: { uri: MESSAGE_BROKER_URI } }
  ]);

  return server;
}

export function start() {
  console.log('Listening on port', 8080);

  return server.start();
}

process.on('unhandledRejection', error => {
  console.error(error);
  process.exit();
});
