import amqp from "amqplib";
import config from "../config";

export default class RabbitMQClient {
  private connection: amqp.ChannelModel;
  private channel: amqp.Channel;

  async start() {
    this.connection = await amqp.connect(config.rabbitmq.url);
    this.channel = await this.connection.createChannel();
    await this.assertResources();
  }

  async assertResources() {
    await this.assertRpcResources();
    await this.assertDeadLetterResources();
    await this.assertRetryResources();
  }
  private async assertRpcResources() {
    await this.channel.assertExchange(config.rabbitmq.rpcExchange, "direct");
    const rpcQueue = await this.channel.assertQueue(config.rabbitmq.rpcQueue, {
      //   durable: true,
      autoDelete: true,
      messageTtl: config.rabbitmq.rpcTTL,
    });
    this.channel.bindQueue(rpcQueue.queue, config.rabbitmq.rpcExchange, "");
    return rpcQueue.queue;
  }

  private async assertDeadLetterResources() {
    await this.channel.assertExchange(
      config.rabbitmq.deadLetterExchange,
      "direct"
    );
    const deadLetterQueue = await this.channel.assertQueue(
      config.rabbitmq.deadLetterQueue,
      {
        //   durable: true,
        autoDelete: true,
        messageTtl: config.rabbitmq.deadLetterTTL,
      }
    );
    this.channel.bindQueue(
      deadLetterQueue.queue,
      config.rabbitmq.deadLetterExchange,
      ""
    );
    return deadLetterQueue.queue;
  }
  private async assertRetryResources() {
    await this.channel.assertExchange(config.rabbitmq.retryExchange, "direct");
    const retryQueue = await this.channel.assertQueue(
      config.rabbitmq.retryQueue,
      {
        //   durable: true,
        autoDelete: true,
        messageTtl: config.rabbitmq.retryTTL,
        deadLetterExchange: config.rabbitmq.rpcExchange,
        deadLetterRoutingKey: "",
      }
    );
    this.channel.bindQueue(retryQueue.queue, config.rabbitmq.retryExchange, "");
    return retryQueue.queue;
  }

  public async consumeRpcQueue(
    callback: (msg: amqp.Message, channel: amqp.Channel) => Promise<void>
  ) {
    const rpcQueue = await this.assertRpcResources();
    this.channel.consume(
      rpcQueue,
      async (msg) => {
        if (!msg) return;
        await callback(msg, this.channel);
      },
      { noAck: false }
    );
  }
}
