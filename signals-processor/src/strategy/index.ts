import {
  LeanCandleDocument,
  LeanPositionDocument,
  toSymbolPrecision
} from '@jwd-crypto-signals/common';

export const applyStrategy = function applyStrategy(
  candles: LeanCandleDocument[],
  last_open_position: LeanPositionDocument
) {
  const [previousCandle, currentCandle] = candles.slice(-2);

  if (!previousCandle || !currentCandle) {
    return;
  }

  const volume = currentCandle.obv > currentCandle.obv_ema;

  const volatile = currentCandle.ch_atr > currentCandle.ch_atr_ema;

  const highest_price = Math.max(
    0,
    ...[last_open_position?.buy_price, last_open_position?.sell_price].filter(
      notFalsy => notFalsy
    )
  );

  if (
    !!highest_price &&
    currentCandle.close_price > highest_price - currentCandle.atr * 3
  ) {
    return;
  }

  const macd =
    currentCandle.macd > currentCandle.macd_signal &&
    (currentCandle.macd > 0 || currentCandle.macd_histogram > 0);

  const di =
    currentCandle.adx > 20 &&
    currentCandle.plus_di > 25 &&
    currentCandle.plus_di > currentCandle.minus_di;

  const above_ema = currentCandle.close_price > currentCandle.ema_50;
  const upward_slope = !candles.slice(-3).some(c => c.ema_50_slope === -1);
  const green_candles = !candles
    .slice(-2)
    .some(c => c.close_price < c.open_price);

  const trending =
    previousCandle.trend === 1 &&
    previousCandle.mama > previousCandle.fama &&
    currentCandle.trend === 1 &&
    currentCandle.mama > currentCandle.fama &&
    previousCandle.volume_trend === 1 &&
    currentCandle.volume_trend === 1 &&
    above_ema &&
    upward_slope &&
    green_candles;

  const notPump = !(currentCandle.is_pump || previousCandle.is_pump);

  const triggerSignal = volume && volatile && trending && di && macd && notPump;

  if (!triggerSignal) {
    return;
  }

  return {
    symbol: currentCandle.symbol,
    price: toSymbolPrecision(currentCandle.close_price, currentCandle.symbol),
    date: new Date(currentCandle.event_time || currentCandle.open_time),
    trigger_time: new Date(
      currentCandle.event_time || currentCandle.open_time
    ).getTime(),
    interval: currentCandle.interval,
    trigger: 'trend_and_volume',
    time: new Date().getTime(),
    type: 'BUY'
  };
};
