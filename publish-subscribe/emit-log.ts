import amqp from "amqplib";

const LOGS_EX = 'logs-ex';


async function main() {
    const connection = await amqp.connect("amqp://localhost:5672");
    const chanle = await connection.createChannel()

    chanle.assertExchange(LOGS_EX, 'fanout', {durable: true})

    // get message from command line
    const msg = process.argv.slice(2).join(' ') || 'info: Hello World!';

    chanle.publish(LOGS_EX, '', Buffer.from(msg));

    console.log(` [x] Sent ${msg}`);

    setTimeout(() => {
        connection.close();
        process.exit(0);
    }, 500);
}

main();