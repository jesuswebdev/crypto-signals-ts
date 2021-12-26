import { Connection } from 'mongoose';
import {
  createPositionSchema,
  DATABASE_MODELS
} from '@jwd-crypto-signals/common';

const schema = createPositionSchema();

export function createPositionModel(connection: Connection) {
  connection.model(DATABASE_MODELS.POSITION, schema);
}
