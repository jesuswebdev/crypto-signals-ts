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
  POSITION_CLOSED = 'position.closed'
}

export enum SIGNAL_EVENTS {
  SIGNAL_CREATED = 'signal.created',
  SIGNAL_CLOSED = 'signal.closed'
}
