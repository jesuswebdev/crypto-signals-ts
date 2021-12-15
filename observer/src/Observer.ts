import ws, { WebSocket } from 'ws';
import {
  CandleTickData,
  MessageBroker,
  EXCHANGE_TYPES,
  CANDLE_EVENTS
} from '@jwd-crypto-signals/common';
import { KlineUpdateEvent } from './interfaces';

interface constructorOptions {
  messageBrokerUri: string;
  pairs: string[];
  interval: string;
}

class Observer {
  private pairs: string[];
  private interval: string;
  private client: WebSocket | null;
  private exchange: string;
  private websocketId: number;
  private subscriptionParams: string[];
  private terminating: boolean;
  private brokerUri: string;
  private broker: MessageBroker<CandleTickData> | undefined;
  constructor({ pairs, interval, messageBrokerUri }: constructorOptions) {
    this.brokerUri = messageBrokerUri;
    this.pairs = pairs;
    this.interval = interval;
    this.websocketId = process.pid;
    this.subscriptionParams = pairs.map(
      pair => `${pair.toLowerCase()}@kline_${interval}`
    );
    this.client = null;
    this.exchange = 'binance';
    this.terminating = false;
  }

  private onConnectionOpen() {
    console.log(`${new Date().toISOString()} | Connection open.`);

    if (this.client) {
      this.client.send(
        JSON.stringify({
          method: 'SUBSCRIBE',
          params: this.subscriptionParams,
          id: this.websocketId
        }),
        error => {
          if (error) {
            throw error;
          }
        }
      );
    }
  }

  private onPing() {
    if (this.client) {
      this.client.pong();
    }
  }

  private onMessage(data: ws.RawData) {
    const message: KlineUpdateEvent = (JSON.parse(data.toString()) || {}).data;

    if (message?.e === 'kline') {
      const k = message.k;
      const candle: CandleTickData = {
        id: `${this.exchange}_${message.s}_${k.i}_${k.t}`,
        symbol: message.s,
        event_time: message.E || Date.now(),
        open_time: k.t,
        close_time: k.T,
        interval: k.i,
        open_price: +k.o,
        close_price: +k.c,
        high_price: +k.h,
        low_price: +k.l,
        base_asset_volume: +k.v,
        quote_asset_volume: +k.q,
        date: new Date(k.t).toISOString(),
        exchange: this.exchange
      };

      this.broker?.publish(CANDLE_EVENTS.CANDLE_TICK, candle);
    }
  }

  private onError() {
    console.log(`${new Date().toISOString()} | ERROR`);
    process.exit();
  }

  private onConnectionClose() {
    console.log(`${new Date().toISOString()} | Stream closed.`);
    this.broker?.close().then(() => {
      if (this.client) {
        this.client.removeAllListeners();
      }

      if (!this.terminating) {
        this.init();
      }
    });
  }

  async init() {
    console.log(`Observer started at ${new Date().toUTCString()}`);

    this.broker = new MessageBroker<CandleTickData>({
      exchange: EXCHANGE_TYPES.CANDLE_EVENTS,
      uri: this.brokerUri
    });

    await this.broker.initializeConnection();

    this.client = new ws(
      `wss://stream.binance.com:9443/stream?streams=${this.pairs
        .map(pair => `${pair}@kline_${this.interval}`)
        .join('/')}`
    );

    this.client.on('open', this.onConnectionOpen.bind(this));
    this.client.on('message', this.onMessage.bind(this));
    this.client.on('error', this.onError.bind(this));
    this.client.on('close', this.onConnectionClose.bind(this));
    this.client.on('ping', this.onPing.bind(this));

    process.on('SIGINT', () => {
      const client = this.client;

      if (client && client.readyState === ws.OPEN) {
        this.terminating = true;
        client.send(
          JSON.stringify({
            method: 'UNSUBSCRIBE',
            params: this.subscriptionParams,
            id: this.websocketId
          }),
          error => {
            if (error) {
              throw error;
            }
            client.terminate();
            process.exit(1);
          }
        );
      }
    });
  }
}

export { Observer };
