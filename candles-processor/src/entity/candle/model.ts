import { Connection } from 'mongoose';
import { createCandleSchema } from '@jwd-crypto-signals/common';

const schema = createCandleSchema();

export function createCandleModel(connection: Connection) {
  connection.model('Candle', schema);
}
