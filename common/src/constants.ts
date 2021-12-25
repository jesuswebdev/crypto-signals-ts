export enum DATABASE_MODELS {
  ACCOUNT = 'Account',
  CANDLE = 'Candle',
  MARKET = 'Market',
  ORDER = 'Order',
  POSITION = 'Position',
  SIGNAL = 'Signal'
}

export enum EXCHANGE_TYPES {
  CANDLE_EVENTS = 'CANDLE_EVENTS',
  POSITION_EVENTS = 'POSITION_EVENTS',
  SIGNAL_EVENTS = 'SIGNAL_EVENTS'
}

export enum CANDLE_EVENTS {
  CANDLE_TICK = 'candle.tick',
  CANDLE_PROCESSED = 'candle.processed'
}

export enum POSITION_EVENTS {
  POSITION_CREATED = 'position.created',
  POSITION_CLOSED = 'position.closed',
  POSITION_CLOSED_REQUEUE = 'position.closed/requeue',
  POSITION_PROCESSED = 'position.processed'
}

export enum SIGNAL_EVENTS {
  SIGNAL_CREATED = 'signal.created',
  SIGNAL_CLOSED = 'signal.closed'
}

export enum MILLISECONDS {
  SECOND = 1e3,
  MINUTE = SECOND * 60,
  HOUR = MINUTE * 60,
  DAY = HOUR * 24,
  WEEK = DAY * 7
}

export enum POSITION_STATUS {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN'
}

export enum POSITION_SELL_TRIGGER {
  STOP_LOSS = 'STOP_LOSS',
  TAKE_PROFIT = 'TAKE_PROFIT',
  TRAILING_STOP_LOSS = 'TRAILING_STOP_LOSS'
}

export enum BINANCE_ORDER_TYPES {
  LIMIT = 'LIMIT',
  MARKET = 'MARKET',
  STOP_LOSS = 'STOP_LOSS',
  STOP_LOSS_LIMIT = 'STOP_LOSS_LIMIT',
  TAKE_PROFIT = 'TAKE_PROFIT',
  TAKE_PROFIT_LIMIT = 'TAKE_PROFIT_LIMIT',
  LIMIT_MAKER = 'LIMIT_MAKER'
}

export enum BINANCE_ORDER_STATUS {
  NEW = 'NEW',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELED = 'CANCELED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export enum QUOTE_ASSETS {
  BTC = 'BTC',
  BUSD = 'BUSD',
  USDT = 'USDT'
}
