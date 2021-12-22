import { Server } from '@hapi/hapi';
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

interface PluginRegisterOptions {
  binanceApiUrl: string;
  binanceApiKey: string;
  binanceApiSecret: string;
}

//  eslint-disable-next-line
interface BinancePlugin extends AxiosInstance {}

const binancePlugin = {
  name: 'binance',
  version: '1.0.0',
  register(server: Server, options: PluginRegisterOptions) {
    const binance = axios.create({
      baseURL: options.binanceApiUrl,
      headers: { 'X-MBX-APIKEY': options.binanceApiKey }
    });

    const getSignature = (query: string) => {
      return crypto
        .createHmac('sha256', options.binanceApiSecret)
        .update(query)
        .digest('hex');
    };

    const secureEndpoints = [
      '/api/v3/order',
      '/api/v3/allOrders',
      '/api/v3/account',
      '/sapi/v1/asset/dust',
      '/sapi/v1/capital/withdraw/apply',
      '/sapi/v1/capital/withdraw/history',
      '/sapi/v1/asset/assetDetail'
    ];

    binance.interceptors.request.use(
      config => {
        const [base, query] = String(config.url).split('?');
        const timestamp = Date.now();
        const requiresSignature = secureEndpoints.some(
          endpoint => endpoint === base
        );

        if (requiresSignature) {
          const newQuery = `timestamp=${timestamp}&recvWindow=15000`.concat(
            query ? `&${query}` : ''
          );
          config.url = `${base}?${newQuery}&signature=${getSignature(
            newQuery
          )}`;
        }

        return config;
      },
      error => {
        server.log(['error'], error);
        Promise.reject(error);
      }
    );

    server.expose('binance', binance);
  }
};

export { binancePlugin, BinancePlugin };
