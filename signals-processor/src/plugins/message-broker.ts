import { Server } from '@hapi/hapi';
import {
  CandleTickData,
  MessageBroker,
  EXCHANGE_TYPES,
  POSITION_EVENTS
} from '@jwd-crypto-signals/common';
import { processSignals } from '../entity/signal/controller';

interface PluginOptions {
  uri: string;
}

const messageBrokerPlugin = {
  name: 'broker',
  version: '1.0.0',
  async register(server: Server, options: PluginOptions) {
    try {
      const positionsBroker = new MessageBroker<CandleTickData>({
        exchange: EXCHANGE_TYPES.POSITION_EVENTS,
        uri: options.uri,
        queue: 'signals-processor'
      });

      await positionsBroker.initializeConnection();

      const handler = async (msg: CandleTickData) => {
        await processSignals(server, msg);
      };

      positionsBroker
        .listen(POSITION_EVENTS.POSITION_PROCESSED, handler)
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
