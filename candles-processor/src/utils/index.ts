import { CandleAttributes, numberIsValid } from '@jwd-crypto-signals/common';

interface OHLC {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  hl2: number[];
}

function getOHLCValues(array: CandleAttributes[]) {
  const assertValue = (value: number) => {
    if (!numberIsValid(value)) throw new Error('Invalid OHLC value: ' + value);
    return value;
  };

  const ohlc: OHLC = {
    open: [],
    high: [],
    low: [],
    close: [],
    volume: [],
    hl2: []
  };

  for (const candle of array) {
    ohlc.open.push(assertValue(candle.open_price));
    ohlc.high.push(assertValue(candle.high_price));
    ohlc.low.push(assertValue(candle.low_price));
    ohlc.close.push(assertValue(candle.close_price));
    ohlc.volume.push(assertValue(candle.base_asset_volume));
    ohlc.hl2.push(assertValue((candle.high_price + candle.low_price) / 2));
  }
  return ohlc;
}
