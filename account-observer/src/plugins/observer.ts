import ws from 'ws';
import { Server } from '@hapi/hapi';
import {
  AccountModel,
  DATABASE_MODELS,
  LeanAccountDocument,
  MILLISECONDS,
  nz,
  OrderModel,
  PAIRS
} from '@jwd-crypto-signals/common';
import { Connection } from 'mongoose';
import { AxiosInstance } from 'axios';
import { parseAccountUpdate, parseOrder } from '../utils';
import { ENVIRONMENT, QUOTE_ASSET } from '../config';

const observerPlugin = {
  name: 'account-observer',
  version: '1.0.0',
  async register(server: Server) {
    const instance = await new AccountObserver(
      server.plugins.mongoose.connection,
      server.plugins.binance.client
    ).init();
    server.expose('instance', instance);
  }
};

class AccountObserver {
  private readonly allowed_pairs: string[];
  private listenKeyKeepAliveInterval: NodeJS.Timer | null;
  private client: ws.WebSocket | undefined;
  constructor(
    private readonly database: Connection,
    private readonly binance: AxiosInstance
  ) {
    this.allowed_pairs = PAIRS.map(p => p.symbol);
    this.listenKeyKeepAliveInterval = null;
  }

  startListenKeyKeepAliveInterval() {
    this.listenKeyKeepAliveInterval = setInterval(async () => {
      const account: LeanAccountDocument = await this.database
        .model<AccountModel>(DATABASE_MODELS.ACCOUNT)
        .findOne({ id: ENVIRONMENT })
        .hint('id_1')
        .select({ spot_account_listen_key: true })
        .lean();

      await this.listenKeyKeepAlive(account.spot_account_listen_key);
    }, MILLISECONDS.MINUTE * 30);
  }

  stopListenKeyKeepAliveInterval() {
    if (this.listenKeyKeepAliveInterval) {
      clearInterval(this.listenKeyKeepAliveInterval);
    }
  }

  async createListenKey(): Promise<string | undefined> {
    const { data } = await this.binance.post('/api/v3/userDataStream');

    return data?.listenKey;
  }

  async listenKeyKeepAlive(listenKey: string) {
    const query = new URLSearchParams({ listenKey }).toString();
    await this.binance.put(`/api/v3/userDataStream?${query}`);

    return null;
  }

  async getAccountBalance(quote_asset: string) {
    const { data: account } = await this.binance.get('/api/v3/account');
    const asset = (account.balances as { asset: string; free: string }[]).find(
      item => item.asset === quote_asset
    );

    return nz(+(asset?.free ?? 0));
  }

  async updateBalance() {
    const available_balance = await this.getAccountBalance(QUOTE_ASSET ?? '');
    await this.database
      .model(DATABASE_MODELS.ACCOUNT)
      .updateOne(
        { id: ENVIRONMENT },
        { $set: { available_balance } },
        { upsert: true }
      )
      .hint('id_1');
  }

  async getListenKey() {
    const account: LeanAccountDocument = await this.database
      .model(DATABASE_MODELS.ACCOUNT)
      .findOne({ id: ENVIRONMENT })
      .hint('id_1')
      .select({ spot_account_listen_key: true })
      .lean();
    let spot_account_listen_key: string | undefined;

    try {
      spot_account_listen_key = await this.createListenKey();
    } catch (error) {
      console.error(error);
      spot_account_listen_key = await this.createListenKey();
    }

    if (!spot_account_listen_key) {
      throw new Error('No listen key returned from binance.');
    }

    if (account.spot_account_listen_key !== spot_account_listen_key) {
      console.log('Using new listen key.');
    }

    await this.database
      .model(DATABASE_MODELS.ACCOUNT)
      .updateOne({ id: ENVIRONMENT }, { $set: { spot_account_listen_key } })
      .hint('id_1');

    this.startListenKeyKeepAliveInterval();

    return spot_account_listen_key;
  }

  async init() {
    await this.updateBalance();
    const spot_account_listen_key = await this.getListenKey();

    this.client = new ws(
      `wss://stream.binance.com:9443/stream?streams=${spot_account_listen_key}`
    );

    this.client.on('open', () => {
      console.log(
        `${new Date().toISOString()} | Spot Account Observer | Connection open.`
      );
    });

    this.client.on('ping', () => {
      this.client?.pong();
    });

    this.client.on('message', async (data: unknown) => {
      const parsedData = JSON.parse(data as string);
      const message = parsedData.data;

      if (message.e === 'executionReport') {
        const parsedOrder = parseOrder(message);
        const validPair = this.allowed_pairs.some(
          v => v === parsedOrder.symbol
        );

        if (parsedOrder.orderId && validPair) {
          try {
            await this.database
              .model<OrderModel>(DATABASE_MODELS.ORDER)
              .updateOne(
                {
                  $and: [
                    { orderId: { $eq: parsedOrder.orderId } },
                    { symbol: { $eq: parsedOrder.symbol } }
                  ]
                },
                { $set: parsedOrder },
                { upsert: true }
              )
              .hint('orderId_-1_symbol_-1');
          } catch (error) {
            console.error(error);
            await this.database
              .model<OrderModel>(DATABASE_MODELS.ORDER)
              .updateOne(
                {
                  $and: [
                    { orderId: { $eq: parsedOrder.orderId } },
                    { symbol: { $eq: parsedOrder.symbol } }
                  ]
                },
                { $set: parsedOrder },
                { upsert: true }
              )
              .hint('orderId_-1_symbol_-1');
          }
        }
      }

      if (message.e === 'outboundAccountPosition') {
        const update = parseAccountUpdate(message, QUOTE_ASSET ?? '');

        if (update) {
          await this.database
            .model(DATABASE_MODELS.ACCOUNT)
            .updateOne(
              { id: ENVIRONMENT },
              { $set: { available_balance: update } }
            )
            .hint('id_1');
        }
      }
    });

    this.client.on('error', () => {
      console.log(`${new Date().toISOString()} | Spot Orders Observer | ERROR`);
      process.exit();
    });

    this.client.on('close', async (...args) => {
      console.log(
        `${new Date().toISOString()} | Spot Orders Observer Stream closed.`
      );
      console.log(args);
      await this.init();
    });
  }
}

export { observerPlugin };
