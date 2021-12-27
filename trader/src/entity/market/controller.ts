import { Server } from '@hapi/hapi';
import {
  DATABASE_MODELS,
  MarketModel,
  MILLISECONDS
} from '@jwd-crypto-signals/common';

export const updateMarketLocks = async function updateMarketLocks(
  server: Server
) {
  const marketModel: MarketModel = server.plugins.mongoose.connection.model(
    DATABASE_MODELS.MARKET
  );

  try {
    const locked_markets = await marketModel
      .find({
        $and: [
          { trader_lock: true },
          {
            last_trader_lock_update: {
              $lt: Date.now() - MILLISECONDS.MINUTE
            }
          }
        ]
      })
      .select({ symbol: true })
      .hint('trader_lock_1_last_trader_lock_update_1')
      .lean();

    if (locked_markets.length > 0) {
      await marketModel.updateMany(
        { symbol: { $in: locked_markets.map(m => m.symbol) } },
        { $set: { trader_lock: false } }
      );
    }
  } catch (error: unknown) {
    server.log(['error'], error as object);
  }
};
