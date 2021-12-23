import { Server } from '@hapi/hapi';
import {
  CandleTickData,
  MessageBroker,
  EXCHANGE_TYPES,
  CANDLE_EVENTS,
  POSITION_EVENTS
} from '@jwd-crypto-signals/common';
import { processOpenPositions } from '../entity/position/controller';

interface PluginOptions {
  uri: string;
}

const messageBrokerPlugin = {
  name: 'broker',
  version: '1.0.0',
  async register(server: Server, options: PluginOptions) {
    try {
      const candlesBroker = new MessageBroker<CandleTickData>({
        exchange: EXCHANGE_TYPES.CANDLE_EVENTS,
        uri: options.uri,
        queue: 'positions-processor'
      });

      const positionsBroker = new MessageBroker<CandleTickData>({
        exchange: EXCHANGE_TYPES.POSITION_EVENTS,
        uri: options.uri
      });

      await Promise.all([
        candlesBroker.initializeConnection(),
        positionsBroker.initializeConnection()
      ]);

      const handler = async (msg: CandleTickData) => {
        await processOpenPositions(server, msg);
        positionsBroker.publish(POSITION_EVENTS.POSITION_PROCESSED, msg);
      };

      candlesBroker
        .listen(CANDLE_EVENTS.CANDLE_PROCESSED, handler)
        .catch((error: unknown) => {
          server.log(['error', 'message-broker'], error as object);
          throw error;
        });

      server.expose('publish', positionsBroker.publish.bind(positionsBroker));
    } catch (error: unknown) {
      server.log(['error', 'message-broker'], error as object);
      throw error;
    }
  }
};

export { messageBrokerPlugin };
