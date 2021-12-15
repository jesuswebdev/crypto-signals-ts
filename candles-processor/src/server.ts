import Hapi, { Server } from '@hapi/hapi';
import { rabbitMqPlugin } from './plugins/rabbitmq';
import { mongoosePlugin } from './plugins/mongoose';
import { redisPlugin } from './plugins/redis';

let server: Server;

declare module '@hapi/hapi' {
  export interface PluginProperties {
    // eslint-disable-next-line
    [key: string]: any;
  }
}

export async function init() {
  server = Hapi.server({ host: 'localhost', port: process.env.PORT || 8080 });

  await server.register([
    { plugin: redisPlugin },
    { plugin: mongoosePlugin },
    { plugin: rabbitMqPlugin }
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
