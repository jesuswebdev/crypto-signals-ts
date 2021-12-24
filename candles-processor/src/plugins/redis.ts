import { createClient } from 'redis';
import { Server } from '@hapi/hapi';

interface PluginOptions {
  uri: string;
}

const redisPlugin = {
  name: 'redis',
  version: '1.0.0',
  async register(server: Server, options: PluginOptions) {
    const client = createClient({ url: options.uri });
    client.on('error', (error: unknown) =>
      server.log(['error', 'redis'], error as object)
    );
    await client.connect();

    server.expose('client', client);
  }
};

export { redisPlugin };
