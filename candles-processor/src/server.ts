import Hapi, { Server } from '@hapi/hapi';
import {
  MESSAGE_BROKER_URI,
  MONGODB_URI,
  REDIS_URI,
  PROCESS_CANDLES_INTERVAL,
  CANDLE_INTERVAL,
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BINANCE_API_URL
} from './config/index';
import { messageBrokerPlugin } from './plugins/message-broker';
import { mongoosePlugin } from './plugins/mongoose';
import { redisPlugin } from './plugins/redis';
import {
  MessageBrokerPlugin,
  MongoosePlugin,
  RedisPlugin,
  binancePlugin,
  BinancePlugin
} from '@jwd-crypto-signals/common';
import { candlesRoutes } from './entity/candle/routes';
import { fillCandlesData } from './entity/candle/controller';

let server: Server;

declare module '@hapi/hapi' {
  export interface PluginProperties {
    // eslint-disable-next-line
    [key: string]: any;
    mongoose: MongoosePlugin;
    redis: RedisPlugin;
    broker: MessageBrokerPlugin;
    binance: BinancePlugin;
  }

  export interface ServerApplicationState {
    PROCESS_CANDLES_INTERVAL: number;
    /**
     * @description Candle interval, such as: 1d, 1h
     */
    CANDLE_INTERVAL: string;
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

  server.app.PROCESS_CANDLES_INTERVAL = PROCESS_CANDLES_INTERVAL;
  server.app.CANDLE_INTERVAL = CANDLE_INTERVAL;

  await server.register([
    { plugin: redisPlugin, options: { uri: REDIS_URI } },
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
    { plugin: candlesRoutes }
  ]);

  await fillCandlesData(server);

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
