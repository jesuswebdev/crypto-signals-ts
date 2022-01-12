import { Server } from '@hapi/hapi';
import {
  MessageBroker,
  EXCHANGE_TYPES,
  POSITION_EVENTS,
  LeanPositionDocument,
  ListenMessage,
  BINANCE_ORDER_TYPES
} from '@jwd-crypto-signals/common';
import { createBuyOrder, createSellOrder } from '../entity/order/controller';

interface PluginOptions {
  uri: string;
}

const messageBrokerPlugin = {
  name: 'broker',
  version: '1.0.0',
  async register(server: Server, options: PluginOptions) {
    try {
      const positionsBroker = new MessageBroker<LeanPositionDocument>({
        exchange: EXCHANGE_TYPES.POSITION_EVENTS,
        uri: options.uri,
        queue: 'trader',
        autoAck: false
      });

      await positionsBroker.initializeConnection();

      const handlePositionCreated = async (
        msg: ListenMessage<LeanPositionDocument>
      ) => {
        await createBuyOrder(server, msg);
      };

      const handlePositionClosed = async (
        msg: ListenMessage<LeanPositionDocument>
      ) => {
        let orderType: BINANCE_ORDER_TYPES | undefined;
        const requeued =
          msg.getRoutingKey() ===
          `${EXCHANGE_TYPES.POSITION_EVENTS}_${POSITION_EVENTS.POSITION_CLOSED_REQUEUE}`;

        if (requeued) {
          orderType = BINANCE_ORDER_TYPES.MARKET;
        }

        await createSellOrder(server, msg, orderType);
      };

      const errorHandler = (error: unknown) => {
        server.log(['error', 'message-broker'], error as object);
      };

      positionsBroker
        .listen(POSITION_EVENTS.POSITION_CREATED, handlePositionCreated)
        .catch(errorHandler);

      positionsBroker
        .listen(POSITION_EVENTS.POSITION_CLOSED, handlePositionClosed)
        .catch(errorHandler);
      positionsBroker
        .listen(POSITION_EVENTS.POSITION_CLOSED_REQUEUE, handlePositionClosed)
        .catch(errorHandler);

      server.expose('publish', positionsBroker.publish.bind(positionsBroker));
    } catch (error: unknown) {
      server.log(['error', 'message-broker'], error as object);
      throw error;
    }
  }
};

export { messageBrokerPlugin };
