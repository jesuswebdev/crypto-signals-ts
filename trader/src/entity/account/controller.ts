import { Server } from '@hapi/hapi';
import {
  DATABASE_MODELS,
  MarketModel,
  PAIRS
} from '@jwd-crypto-signals/common';

interface BinanceAccountResponse {
  balances: { asset: string; free: string; locked: string }[];
}

export const convertToDust = async function convertToDust(server: Server) {
  const marketModel: MarketModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.MARKET
  );
  const quoteAsset = process.env.QUOTE_ASSET;

  const accountPromise = server.plugins.binance.client.get('/api/v3/account');
  const markets = await marketModel
    .find()
    .select({ symbol: true, last_price: true })
    .lean();

  const { data: account } = await accountPromise;

  const allowedMarkets = PAIRS.map(p => p.symbol);

  const assets = (account as BinanceAccountResponse).balances
    .filter(item => ![quoteAsset, 'BNB', 'NULS'].includes(item.asset))
    .filter(item => allowedMarkets.includes(`${item.asset}${quoteAsset}`))
    .filter(item => +item.free > 0)
    .reduce<string[]>((acc, current) => {
      const pairString = `${current.asset}${quoteAsset}`;
      const market = markets.find(m => m.symbol === pairString);

      if (!market) {
        return acc;
      }

      const value = +current.free * (market || {}).last_price;
      const isDust = value < 10;

      return isDust ? acc.concat(current.asset) : acc;
    }, []);

  if (assets.length) {
    const assets_string = assets.map(asset => `asset=${asset}`).join('&');
    await server.plugins.binance.client.post(
      `/sapi/v1/asset/dust?${assets_string}`
    );
  }
};
