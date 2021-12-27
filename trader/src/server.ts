import Hapi, { Server } from '@hapi/hapi';
import {
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BINANCE_API_URL,
  MESSAGE_BROKER_URI,
  MONGODB_URI
} from './config/index';
import { messageBrokerPlugin } from './plugins/message-broker';
import { mongoosePlugin } from './plugins/mongoose';
import {
  BinancePlugin,
  binancePlugin,
  MessageBrokerPlugin,
  MILLISECONDS,
  MongoosePlugin
} from '@jwd-crypto-signals/common';
import { cancelUnfilledOrders } from './entity/order/controller';
import { updateMarketLocks } from './entity/market/controller';
import { positionRoutes } from './entity/position/routes';
import Joi from 'joi';

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

  server.validator(Joi);

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
    },
    { plugin: positionRoutes, routes: { prefix: '/positions' } }
  ]);

  setInterval(async () => {
    await Promise.all([
      updateMarketLocks(server),
      cancelUnfilledOrders(server)
    ]);
  }, MILLISECONDS.MINUTE);

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
