import amqp from "amqplib";
import config from "../config";
import { v4 as uuidv4 } from 'uuid';

class RpcClient {
  private channel: amqp.Channel | null = null;
  private replyQueue: amqp.Replies.AssertQueue | null = null;

  private async getArgs() {
    const args = process.argv.slice(2);
    const method = args[0];
    const params = args.slice(1).map(Number);
    return { method, params };
  }

  private async setupRabbitMQ() {
    const connection = await amqp.connect(config.rabbitmq.url);
    this.channel = await connection.createChannel();
    await this.channel.assertExchange(config.rabbitmq.rpcExchange, "direct");
    this.replyQueue = await this.channel.assertQueue('', {
      durable: true,
      autoDelete: true,
      messageTtl: config.rabbitmq.rpcTTL,
    });
  }

  private async publishRpcRequest(method: string, params: number[], correlationId: string) {
    if (!this.channel || !this.replyQueue) {
      throw new Error("Channel or replyQueue not initialized");
    }
    this.channel.publish(
      config.rabbitmq.rpcExchange,
      '',
      Buffer.from(JSON.stringify({ method, params })),
      {
				replyTo: this.replyQueue.queue,
				correlationId: correlationId,
      }
    );
  }

  private async consumeRpcResponse(correlationId: string) {
    if (!this.channel || !this.replyQueue) {
      throw new Error("Channel or replyQueue not initialized");
		}
    return new Promise((resolve, reject) => {
      this.channel?.consume(this.replyQueue?.queue || '', async (msg: amqp.Message | null) => {
        if (!msg) return;
        if (msg.properties.correlationId === correlationId) {
          this.channel?.ack(msg);
          resolve(msg.content.toString());
        }
      }, { noAck: false });
    });
  }

  public async run() {
    const { method, params } = await this.getArgs();
    await this.setupRabbitMQ();
    console.log(`[x] Sent ${method} with params ${params}`);
		const correlationId = uuidv4();
		await this.publishRpcRequest(method, params, correlationId);
		
		const response = await this.consumeRpcResponse(correlationId);
		console.log(`[x] Received ${response}`);

    setTimeout(() => {
      if (this.channel) {
        this.channel.close();
      }
      process.exit(0);
    }, 500);
  }
}

const client = new RpcClient();
client.run();
