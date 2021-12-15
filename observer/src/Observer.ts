import ws, { WebSocket } from 'ws';
import amqp, { Channel, Connection } from 'amqplib';
import {
  encodeRabbitMqMessage,
  CandleTickData,
  MessageBroker,
} from '@jwd-crypto-signals/common';
import { RABBITMQ_URI, RABBITMQ_CHANNEL } from './config/index';
import { KlineUpdateEvent } from './interfaces';

interface constructorOptions {
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
  private rabbitmqConnection: Connection | null;
  private rabbitmqChannel: Channel | null;
  private broker: MessageBroker<CandleTickData> | undefined;
  constructor({ pairs, interval }: constructorOptions) {
    this.pairs = pairs;
    this.interval = interval;
    this.websocketId = process.pid;
    this.subscriptionParams = pairs.map(
      pair => `${pair.toLowerCase()}@kline_${interval}`
    );
    this.client = null;
    this.exchange = 'binance';
    this.terminating = false;
    this.rabbitmqConnection = null;
    this.rabbitmqChannel = null;
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

      this.queueMessage(candle);
    }
  }

  private onError() {
    console.log(`${new Date().toISOString()} | ERROR`);
    process.exit();
  }

  private onConnectionClose() {
    console.log(`${new Date().toISOString()} | Stream closed.`);
    this.stopRabbitMq().then(() => {
      if (this.client) {
        this.client.removeAllListeners();
      }

      if (!this.terminating) {
        this.init();
      }
    });
  }

  private async startRabbitMq() {
    const connection = await amqp.connect(RABBITMQ_URI);
    const channel = await connection.createChannel();
    await channel.assertQueue(RABBITMQ_CHANNEL);
    this.rabbitmqChannel = channel;
    this.rabbitmqConnection = connection;
  }

  private async stopRabbitMq() {
    if (this.rabbitmqConnection) {
      await this.rabbitmqConnection.close();
    }
  }

  private queueMessage(msg: CandleTickData) {
    if (this.rabbitmqChannel) {
      this.rabbitmqChannel.sendToQueue(
        RABBITMQ_CHANNEL,
        encodeRabbitMqMessage(msg),
        { timestamp: Date.now() }
      );
    }
  }

  async init() {
    console.log(`Observer started at ${new Date().toUTCString()}`);

    this.broker = new MessageBroker<CandleTickData>({exchange:""});

    // await this.startRabbitMq();

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
          }
        );
      }
    });
  }
}

export { Observer };
