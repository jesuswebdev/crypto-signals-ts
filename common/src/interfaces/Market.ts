export interface MarketAttributes {
  symbol: string;
  last_price: number;
  trader_lock: boolean;
  last_trader_lock_update: number;
  broadcast_signals: boolean;
  use_main_account: boolean;
}
