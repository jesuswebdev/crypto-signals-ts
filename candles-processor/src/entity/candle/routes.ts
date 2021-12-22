import { Server, Request, ResponseToolkit } from '@hapi/hapi';
import Boom from '@hapi/boom';
import {
  CandleModel,
  DATABASE_MODELS,
  getBooleanValue,
  MarketModel,
  getTimeDiff
} from '@jwd-crypto-signals/common';
import { buildCandles, processCandles } from '../../utils';

const candlesRoutes = {
  name: 'candles routes',
  version: '1.0.0',
  register(server: Server) {
    server.route({
      method: 'POST',
      path: '/binance',
      async handler(request: Request, h: ResponseToolkit) {
        try {
          const symbol: string = request.query.symbol;
          const force: string | undefined = request.query.force;
          const candleModel: CandleModel =
            request.server.plugins.mongoose.connection.model(
              DATABASE_MODELS.CANDLE
            );
          const marketModel: MarketModel =
            request.server.plugins.mongoose.connection.model(
              DATABASE_MODELS.MARKET
            );

          if (!getBooleanValue(force)) {
            const count = await candleModel.countDocuments({
              $and: [
                { symbol },
                {
                  open_time: {
                    $gte:
                      Date.now() -
                      getTimeDiff(160, request.server.app.CANDLE_INTERVAL)
                  }
                }
              ]
            });

            if (count >= 150) {
              return h.response();
            }
          }

          const binance = request.server.plugins.binance.client;

          const query = new URLSearchParams({
            symbol,
            interval: request.server.app.CANDLE_INTERVAL,
            startTime: (
              Date.now() - getTimeDiff(160, request.server.app.CANDLE_INTERVAL)
            ).toString()
          }).toString();

          const { data }: { data: [number[]] } = await binance.get(
            `/api/v3/klines?${query}`
          );

          if (Array.isArray(data) && data.length > 0) {
            const processed = buildCandles({
              candles: data,
              symbol,
              interval: request.server.app.CANDLE_INTERVAL
            });

            await candleModel.deleteMany({
              $and: [
                { symbol },
                {
                  open_time: {
                    $gte:
                      Date.now() -
                      getTimeDiff(160, request.server.app.CANDLE_INTERVAL)
                  }
                }
              ]
            });
            await candleModel.insertMany(processed);

            const marketExists = await marketModel.exists({
              $and: [{ symbol }]
            });

            if (!marketExists) {
              await marketModel.create({
                symbol,
                last_price: processed[processed.length - 1].close_price
              });
            }

            await processCandles(request.server, processed.slice(-10));
          }

          return h.response();
        } catch (error) {
          console.error(error);

          return Boom.internal();
        }
      },
      options: { auth: false }
    });
  }
};

export { candlesRoutes };
