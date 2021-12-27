import { connect, NatsConnection, StringCodec, Msg } from 'nats';

interface MessageBrokerConstructorOptions {
  uri: string;
  exchange: string;
  queue?: string;
  autoAck?: boolean;
}

interface OnMessageHandler<T> {
  (msg: ListenMessage<T>): Promise<void> | void;
}

export class MessageBroker<T> {
  private readonly uri: string;
  private readonly exchange: string;
  private readonly queue: string | undefined;
  private readonly autoAck: boolean;
  private connection: NatsConnection | undefined;

  constructor(options: MessageBrokerConstructorOptions) {
    this.uri = options.uri;
    this.exchange = options.exchange;
    this.queue = options.queue;
    this.autoAck = options.autoAck ?? true;
  }

  async initializeConnection() {
    if (!this.uri) {
      throw new Error('Message Broker URI is not defined');
    }

    if (!this.exchange) {
      throw new Error('Message Broker Exchange is not defined');
    }

    this.connection = await connect({
      servers: [this.uri],
      name: this.exchange
    });

    return this;
  }

  async close() {
    await this.connection?.close();
  }

  private encodeMessage(data: T): Uint8Array {
    return StringCodec().encode(JSON.stringify(data));
  }

  private decodeMessage(msg: Msg): T {
    return JSON.parse(StringCodec().decode(msg.data));
  }

  publish(topic: string, message: T) {
    if (!this.connection) {
      throw new Error('Connection is not defined');
    }
    this.connection.publish(
      `${this.exchange}_${topic}`,
      this.encodeMessage(message)
    );
  }

  async listen(topic: string, handler: OnMessageHandler<T>) {
    if (!this.connection) {
      throw new Error('Connection is not defined');
    }

    if (!handler) {
      throw new Error('onMessage handler is not defined');
    }

    const sub = this.connection.subscribe(`${this.exchange}_${topic}`, {
      queue: this.queue
    });

    for await (const msg of sub) {
      const message = new ListenMessage({
        rawMessage: msg,
        data: this.decodeMessage(msg),
        connection: this.connection
      });

      try {
        if (handler instanceof Promise) {
          await handler(message);
        } else {
          handler(message);
        }

        if (this.autoAck) {
          message.ack();
        }
      } catch (error) {
        if (this.autoAck) {
          message.nack();
        }
        throw error;
      }
    }
  }
}

interface ListenMessageConstructorOptions<T> {
  rawMessage: Msg;
  data: T;
  connection: NatsConnection;
}

export class ListenMessage<T> {
  private readonly _raw: Msg;
  private readonly _data: T;
  private readonly connection: NatsConnection;
  private handled: boolean;

  constructor({
    rawMessage,
    data,
    connection
  }: ListenMessageConstructorOptions<T>) {
    this._raw = rawMessage;
    this._data = data;
    this.connection = connection;
    this.handled = false;
  }

  get raw() {
    return this._raw;
  }

  get data() {
    return this._data;
  }

  getRoutingKey(): string {
    return this._raw.subject;
  }

  ack() {
    if (!this.connection) {
      throw new Error('Connection is not defined');
    }
    this.handled = true;
  }

  nack(_allUpTo?: boolean, requeue = true) {
    if (!this.connection) {
      throw new Error('Connection is not defined');
    }

    if (!this.handled && requeue) {
      this.handled = true;
      this.connection.publish(this._raw.subject, this.raw.data);
    }
  }
}
