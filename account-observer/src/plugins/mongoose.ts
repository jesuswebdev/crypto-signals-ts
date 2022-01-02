import { Server } from '@hapi/hapi';
import mongoose from 'mongoose';
import { createAccountModel } from '../entity/account/model';
import { createOrderModel } from '../entity/order/model';

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

    createOrderModel(connection);
    createAccountModel(connection);
    await connection.syncIndexes();
    console.log('MongoDB connection established');
    server.expose('connection', connection);
  }
};

export { mongoosePlugin };
