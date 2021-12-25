import amqplib, { ConsumeMessage } from 'amqplib';
import { MILLISECONDS, PublishOptions } from '.';

interface MessageBrokerConstructorOptions {
  uri: string;
  exchange: string;
  queue?: string;
  autoAck?: boolean;
}

interface OnMessageHandler<T> {
  (msg: T, rawMsg: ConsumeMessage): Promise<void> | void;
}

export class MessageBroker<T> {
  private readonly uri: string;
  private readonly exchange: string;
  private readonly queue: string | undefined;
  private readonly autoAck: boolean;
  private connection: amqplib.Connection | undefined;
  private boundChannel: amqplib.Channel | undefined;

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

    this.connection = await amqplib.connect(this.uri);
    this.boundChannel = await this.connection.createChannel();
    await this.boundChannel.assertExchange(this.exchange, 'topic', {
      durable: true
    });

    return this;
  }

  async close() {
    await this.connection?.close();
  }

  private encodeMessage(data: T): Buffer {
    return Buffer.from(JSON.stringify(data));
  }

  private decodeMessage(msg: ConsumeMessage): T {
    return JSON.parse(msg.content.toString());
  }

  publish(topic: string, message: T, options?: PublishOptions) {
    if (!this.boundChannel) {
      throw new Error('No channel bound to publish message');
    }
    this.boundChannel.publish(
      this.exchange,
      topic,
      this.encodeMessage(message),
      {
        timestamp: Date.now(),
        expiration: 15 * MILLISECONDS.MINUTE,
        persistent: true,
        ...options
      }
    );
  }

  ackMessage(msg: ConsumeMessage, allUpTo?: boolean) {
    if (!this.boundChannel) {
      throw new Error('No channel bound');
    }
    this.boundChannel?.ack(msg, allUpTo);
  }

  nackMessage(msg: ConsumeMessage, allUpTo?: boolean, requeue?: boolean) {
    if (!this.boundChannel) {
      throw new Error('No channel bound');
    }
    this.boundChannel?.nack(msg, allUpTo, requeue);
  }

  rejectMessage(msg: ConsumeMessage, requeue?: boolean) {
    if (!this.boundChannel) {
      throw new Error('No channel bound');
    }
    this.boundChannel?.reject(msg, requeue);
  }

  async listen(topic: string, handler: OnMessageHandler<T>) {
    if (!this.boundChannel) {
      throw new Error('No channel bound to listen to messages');
    }

    if (!handler) {
      throw new Error('onMessage handler is not defined');
    }

    const q = await this.boundChannel.assertQueue(
      this.queue ?? `${topic}_queue`
    );

    await this.boundChannel.bindQueue(q.queue, this.exchange, topic);

    this.boundChannel.consume(q.queue, async msg => {
      if (msg !== null) {
        try {
          if (handler instanceof Promise) {
            await handler(this.decodeMessage(msg), msg);
          } else {
            handler(this.decodeMessage(msg), msg);
          }

          if (this.autoAck) {
            this.boundChannel?.ack(msg);
          }
        } catch (error) {
          if (this.autoAck) {
            this.boundChannel?.nack(msg);
          }
          throw error;
        }
      }
    });
  }
}
