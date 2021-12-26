import Hapi, { Server } from '@hapi/hapi';
import { messageBrokerPlugin } from './plugins/message-broker';
import { mongoosePlugin } from './plugins/mongoose';
import {
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BINANCE_API_URL,
  MESSAGE_BROKER_URI,
  MONGODB_URI
} from './config/index';
import {
  BinancePlugin,
  binancePlugin,
  MessageBrokerPlugin,
  MongoosePlugin
} from '@jwd-crypto-signals/common';

let server: Server;

declare module '@hapi/hapi' {
  export interface PluginProperties {
    // eslint-disable-next-line
    [key: string]: any;
    mongoose: MongoosePlugin;
    broker: MessageBrokerPlugin;
    binance: BinancePlugin;
  }
}

export async function init() {
  server = Hapi.server({ host: '0.0.0.0', port: process.env.PORT || 8080 });

  server.events.on('log', (event, tags) => {
    if (tags.error) {
      console.error(event);
    } else if (tags.warn) {
      console.warn(event);
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
    { plugin: mongoosePlugin, options: { uri: MONGODB_URI } },
    { plugin: messageBrokerPlugin, options: { uri: MESSAGE_BROKER_URI } },
    {
      plugin: binancePlugin,
      options: {
        binanceApiUrl: BINANCE_API_URL,
        binanceApiKey: BINANCE_API_KEY,
        binanceApiSecret: BINANCE_API_SECRET
      }
    }
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
