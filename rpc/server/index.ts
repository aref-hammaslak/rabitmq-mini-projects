import MathService from "./math.service";
import RabbitMQClient from "./rabbitmq";
import amqp from "amqplib";

class Server {
  private mathService: MathService;
  constructor() {
    this.mathService = new MathService();
  }

  public async start() {
    const rabbitMQClient = new RabbitMQClient();
    await rabbitMQClient.start();
    await rabbitMQClient.consumeRpcQueue(this.handleRpcRequest.bind(this));
  }

  private async handleRpcRequest(msg: amqp.Message, channel: amqp.Channel) {
    const { method, params } = JSON.parse(msg.content.toString());
    console.log(
      "[x] attempting to call method: " + method + " with params:" + params
    );
    if (!this.mathService[method]) {
      console.error("method not found: " + method);
      this.sendRpcResponse(msg, channel, { error: "method not found" });
      channel.ack(msg);
      return;
    }
    try {
      const result = await this.mathService[method](...params);
      this.sendRpcResponse(msg, channel, result);
      channel.ack(msg);
    } catch (error) {
      console.error(error.message);
      console.log("replyto:" + msg.properties.replyTo);
      this.sendRpcResponse(msg, channel, { error: error.message });
      channel.ack(msg);
    }
  }
  async sendRpcResponse(msg: amqp.Message, channel: amqp.Channel, result: any) {
    channel.sendToQueue(
      msg.properties.replyTo,
      Buffer.from(JSON.stringify(result)),
      { correlationId: msg.properties.correlationId }
    );
  }
}

const server = new Server();
server.start();
while (true) {
  await new Promise((resolve) => setTimeout(resolve, 100000));
}
