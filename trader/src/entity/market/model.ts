import { Connection } from 'mongoose';
import {
  createMarketSchema,
  DATABASE_MODELS
} from '@jwd-crypto-signals/common';

const schema = createMarketSchema();

export function createMarketModel(connection: Connection) {
  connection.model(DATABASE_MODELS.MARKET, schema);
}
