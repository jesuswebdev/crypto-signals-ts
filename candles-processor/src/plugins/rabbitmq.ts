import amqp, {ConsumeMessage} from 'amqplib';
import { Server } from '@hapi/hapi';
import { RABBITMQ_URI, RABBITMQ_CHANNEL } from '../config/index';
import {
  decodeRabbitMqMessage,
  CandleTickData
} from '@jwd-crypto-signals/common';

const rabbitMqPlugin = {
  name: 'rabbitmq',
  version: '1.0.0',
  async register(server: Server) {
    server.plugins.redis.client.ping();
    const connection = await amqp.connect(RABBITMQ_URI);
    const channel = await connection.createChannel();
    await channel.assertQueue(RABBITMQ_CHANNEL);
    channel.consume(RABBITMQ_CHANNEL, msg => {
      if (msg !== null) {
        const data: CandleTickData = decodeRabbitMqMessage(msg);
        channel.ack(msg);
        console.log(data.symbol);
      }
    });
  }
};

export { rabbitMqPlugin };
