import Hapi, { Server } from '@hapi/hapi';
import {
  MONGODB_URI,
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BINANCE_API_URL
} from './config/index';
import {
  MongoosePlugin,
  binancePlugin,
  BinancePlugin
} from '@jwd-crypto-signals/common';
import { mongoosePlugin } from './plugins/mongoose';
import { observerPlugin } from './plugins/observer';

let server: Server;

declare module '@hapi/hapi' {
  export interface PluginProperties {
    // eslint-disable-next-line
    [key: string]: any;
    mongoose: MongoosePlugin;
    binance: BinancePlugin;
  }
}

export async function init() {
  server = Hapi.server({ host: '0.0.0.0', port: process.env.PORT || 8080 });

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
    { plugin: mongoosePlugin, options: { uri: MONGODB_URI } },
    {
      plugin: binancePlugin,
      options: {
        binanceApiUrl: BINANCE_API_URL,
        binanceApiKey: BINANCE_API_KEY,
        binanceApiSecret: BINANCE_API_SECRET
      }
    },
    { plugin: observerPlugin }
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
