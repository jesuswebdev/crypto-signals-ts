import { createClient } from 'redis';
import { Server } from '@hapi/hapi';
import { REDIS_URI } from '../config/index';

const redisPlugin = {
  name: 'redis',
  version: '1.0.0',
  async register(server: Server) {
    const client = createClient({ url: REDIS_URI });
    client.on('error', error => console.error('Redis Client Error', error));
    await client.connect();
    server.expose('client', client);
  }
};

export { redisPlugin };
