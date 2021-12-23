import Hapi, { Server } from '@hapi/hapi';
import { messageBrokerPlugin } from './plugins/message-broker';
import { mongoosePlugin } from './plugins/mongoose';
import { MESSAGE_BROKER_URI, MONGODB_URI } from './config/index';
import {
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
