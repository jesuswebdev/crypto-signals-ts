import { Server } from '@hapi/hapi';
import {
  CandleTickData,
  MessageBroker,
  EXCHANGE_TYPES,
  CANDLE_EVENTS
} from '@jwd-crypto-signals/common';
import { processCandles, processCandleTick } from '../entity/candle/controller';

interface PluginOptions {
  uri: string;
}

const messageBrokerPlugin = {
  name: 'broker',
  version: '1.0.0',
  async register(server: Server, options: PluginOptions) {
    try {
      const broker = new MessageBroker<CandleTickData>({
        exchange: EXCHANGE_TYPES.CANDLE_EVENTS,
        uri: options.uri,
        queue: 'candles-processor'
      });

      await broker.initializeConnection();

      const handler = async (msg: CandleTickData) => {
        const candles = await processCandleTick(server, msg);

        if (candles && candles.length > 0) {
          await processCandles(server, candles);

          broker.publish(CANDLE_EVENTS.CANDLE_PROCESSED, msg);
        }
      };

      broker
        .listen(CANDLE_EVENTS.CANDLE_TICK, handler)
        .catch((error: unknown) => {
          server.log(['error', 'message-broker'], error as object);
          throw error;
        });

      server.expose('publish', broker.publish.bind(broker));
    } catch (error: unknown) {
      server.log(['error', 'message-broker'], error as object);
      throw error;
    }
  }
};

export { messageBrokerPlugin };
