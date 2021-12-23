import { Connection } from 'mongoose';
import {
  createSignalSchema,
  DATABASE_MODELS
} from '@jwd-crypto-signals/common';

const schema = createSignalSchema();

export function createSignalModel(connection: Connection) {
  connection.model(DATABASE_MODELS.SIGNAL, schema);
}
