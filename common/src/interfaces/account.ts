import { LeanDocument, Model, Types } from 'mongoose';

export interface AccountAttributes {
  id: string;
  available_balance: number;
  total_balance: number;
  type: string;
  last_order_error: number;
  spot_account_listen_key: string;
  last_spot_account_listen_key_update: number;
  create_order_after: number;
}

export interface AccountDocument extends Document, AccountAttributes {
  id: string;
  _id: Types.ObjectId;
}

export interface LeanAccountDocument extends LeanDocument<AccountAttributes> {
  _id: string;
  __v: number;
}

// eslint-disable-next-line
export interface AccountModel extends Model<AccountDocument> {}
