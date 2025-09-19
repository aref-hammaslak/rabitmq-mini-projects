import amqp from "amqplib";

const RETRY_EX = "retry-ex";
const RETRY_TTL = 3000;
const MAX_RETRY = 2;
const DEAD_EX = "dead-ex";
const DEAD_QUEUE = "dead-queue";
const RETRY_QUEUE = "retry-queue";
const LOGS_EX = "logs-ex";
const LOGS_QUEUE = "logs-queue";

async function createRetryEX(channel: amqp.Channel) {
  await channel.assertExchange(RETRY_EX, "direct");
  const queue = await channel.assertQueue(RETRY_QUEUE, {
    arguments: {
      "x-message-ttl": RETRY_TTL,
      "x-dead-letter-exchange": LOGS_EX,
      "x-dead-letter-routing-key": "",
    },
  });
  channel.bindQueue(queue.queue, RETRY_EX, "");
  return queue.queue;
}

async function createDeadLetterEX(channel: amqp.Channel) {
  await channel.assertExchange(DEAD_EX, "direct");
  const queue = await channel.assertQueue(DEAD_QUEUE, {
    exclusive: true,
    durable: true,
  });
  channel.bindQueue(queue.queue, DEAD_EX, "");
  return queue.queue;
}

async function main() {
  const connection = await amqp.connect("amqp://localhost:5672");
  const channel = await connection.createChannel();

  await channel.assertExchange(LOGS_EX, "fanout", { durable: true });
  await createDeadLetterEX(channel);

  const firstQueue = await channel.assertQueue(LOGS_QUEUE, {
    exclusive: true,
  });
  await createRetryEX(channel);

  channel.bindQueue(firstQueue.queue, LOGS_EX, "");
  channel.consume(
    firstQueue.queue,
    (msg) => {
      if (!msg) return;

      const randNum = Math.random();
      const headers = msg.properties.headers || {};
      const retryCount = headers["x-retry"] || 0;

      // Check if max retry exceeded first
      if (retryCount > MAX_RETRY) {
        console.log(
          msg.content.toString(),
          "firstQueue; Dead; retryCount:",
          retryCount
        );
        channel.publish(DEAD_EX, "", Buffer.from(msg.content.toString()));
        channel.ack(msg);
        return; // IMPORTANT: Return here to prevent further processing
      }

      // Simulate success/failure
      if (randNum > 0.8) {
        console.log(msg.content.toString(), "firstQueue; Ack");
        channel.ack(msg);
      } else {
        console.log(
          msg.content.toString(),
          "firstQueue; Nack; retryCount:",
          retryCount
        );

        // Acknowledge the original message
        channel.ack(msg);

        // Publish to retry exchange
        channel.publish(RETRY_EX, "", Buffer.from(msg.content.toString()), {
          headers: {
            "x-retry": retryCount + 1,
          },
        });
      }
    },
    { noAck: false }
  );

  console.log(" [*] Waiting for logs.");
}

main();
