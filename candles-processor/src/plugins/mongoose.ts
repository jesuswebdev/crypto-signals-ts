import { Server } from '@hapi/hapi';
import mongoose from 'mongoose';
import { MONGODB_URI } from '../config/index';
import { createCandleModel } from '../entity/candle/model';

const mongoosePlugin = {
  name: 'mongoose',
  version: '1.0.0',
  async register(server: Server) {
    if (!MONGODB_URI) {
      throw new Error('MongoDB URI is not defined');
    }
    const connection = await mongoose.createConnection(MONGODB_URI).asPromise();
    createCandleModel(connection);
    server.expose('connection', connection);
  }
};

export { mongoosePlugin };
