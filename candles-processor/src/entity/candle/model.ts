import { Connection } from 'mongoose';
import {
  createCandleSchema,
  DATABASE_MODELS
} from '@jwd-crypto-signals/common';

const schema = createCandleSchema();

export function createCandleModel(connection: Connection) {
  connection.model(DATABASE_MODELS.CANDLE, schema);
}
