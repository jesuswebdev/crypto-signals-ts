import { Document, Types, LeanDocument, Model } from 'mongoose';

export interface MarketAttributes {
  symbol: string;
  last_price: number;
  trader_lock: boolean;
  last_trader_lock_update: number;
  broadcast_signals: boolean;
  use_main_account: boolean;
}
export interface MarketDocument extends Document, MarketAttributes {
  _id: Types.ObjectId;
}

export interface LeanMarketDocument extends LeanDocument<MarketAttributes> {
  _id: string;
  __v: number;
}

// eslint-disable-next-line
export interface MarketModel extends Model<MarketDocument> {}
