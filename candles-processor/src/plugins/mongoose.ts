import { Server } from '@hapi/hapi';
import mongoose from 'mongoose';
import { createCandleModel } from '../entity/candle/model';
import { createMarketModel } from '../entity/market/model';

interface PluginOptions {
  uri: string;
}

const mongoosePlugin = {
  name: 'mongoose',
  version: '1.0.0',
  async register(server: Server, options: PluginOptions) {
    if (!options.uri) {
      throw new Error('MongoDB URI is not defined');
    }

    const connection = await mongoose.createConnection(options.uri).asPromise();

    createCandleModel(connection);
    createMarketModel(connection);
    await connection.syncIndexes();
    server.expose('connection', connection);
  }
};

export { mongoosePlugin };
