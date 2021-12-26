import { Connection } from 'mongoose';
import {
  createAccountSchema,
  DATABASE_MODELS
} from '@jwd-crypto-signals/common';

const schema = createAccountSchema();

export function createAccountModel(connection: Connection) {
  connection.model(DATABASE_MODELS.ACCOUNT, schema);
}
