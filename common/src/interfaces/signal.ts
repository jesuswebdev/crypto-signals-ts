import { LeanDocument, Model, Types } from 'mongoose';
import { POSITION_STATUS } from '..';

export interface SignalAttributes {
  id: string;
  time: number;
  trigger_time: number;
  close_time: number;
  symbol: string;
  interval: string;
  price: number;
  type: 'BUY' | 'SELL';
  date: Date;
  close_date: Date;
  drop_price: number;
  trigger: string;
  status: POSITION_STATUS;
  trailing_stop_buy: number;
  //eslint-disable-next-line
  open_candle: Record<string, any>;
  //eslint-disable-next-line
  close_candle: Record<string, any>;
  drop_percent: number;
  position: Types.ObjectId;
  broadcast: boolean;
  trader_lock: boolean;
  //eslint-disable-next-line
  buy_order: Record<string, any>;
}

export interface SignalDocument extends Document, SignalAttributes {
  _id: Types.ObjectId;
}

export interface LeanSignalDocument extends LeanDocument<SignalAttributes> {
  _id: string;
  __v: number;
}

// eslint-disable-next-line
export interface SignalModel extends Model<SignalDocument> {}
