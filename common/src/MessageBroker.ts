import amqplib, { ConsumeMessage } from 'amqplib';

interface MessageBrokerConstructorOptions {
  uri: string;
  exchange: string;
  channel?: string;
  topic?: string;
  queue?: string;
}

interface OnMessageHandler<T> {
  (msg: T): void;
}

export class MessageBroker<T> {
  uri: string;
  exchange: string;
  queue: string | undefined;
  connection: amqplib.Connection | undefined;
  boundChannel: amqplib.Channel | undefined;
  onMessage: OnMessageHandler<T> | undefined;

  constructor(options: MessageBrokerConstructorOptions) {
    this.uri = options.uri;
    this.exchange = options.exchange;
    this.queue = options.queue;
  }

  async initializeConnection() {
    if (!this.uri) {
      throw new Error('RabbitMQ URI is not defined');
    }

    if (!this.exchange) {
      throw new Error('RabbitMQ Exchange is not defined');
    }

    try {
      this.connection = await amqplib.connect(this.uri);
    } catch (error) {
      console.error(error);

      return;
    }
    this.boundChannel = await this.connection.createChannel();
    await this.boundChannel.assertExchange(this.exchange, 'topic', {
      durable: true
    });
  }

  async close() {
    await this.connection?.close();
  }

  encodeMessage(data: T): Buffer {
    return Buffer.from(JSON.stringify(data));
  }

  decodeMessage(msg: ConsumeMessage): T {
    return JSON.parse(msg.content.toString());
  }

  publish(topic: string, message: T) {
    if (!this.boundChannel) {
      throw new Error('No channel bound to publish message');
    }
    this.boundChannel.publish(
      this.exchange,
      topic,
      this.encodeMessage(message),
      { timestamp: Date.now(), persistent: true }
    );
  }

  async listen(topic: string) {
    if (!this.boundChannel) {
      throw new Error('No channel bound to listen to messages');
    }

    if (!this.onMessage) {
      throw new Error('On Message handler is not defined');
    }

    const q = await this.boundChannel.assertQueue(this.queue ?? 'queue');

    await this.boundChannel.bindQueue(q.queue, this.exchange, topic);

    this.boundChannel.consume(q.queue, msg => {
      if (msg !== null) {
        try {
          // eslint-disable-next-line
          this.onMessage!(this.decodeMessage(msg));
          this.boundChannel?.ack(msg);
        } catch (error) {
          console.error(error);
          this.boundChannel?.nack(msg);
        }
      }
    });
  }
}
