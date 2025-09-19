import amqp from "amqplib";

const LOGS_EX = 'logs-ex';
const ROUTING_KEY = 'routing-key';


async function main() {
    const connection = await amqp.connect("amqp://localhost:5672");
    const chanle = await connection.createChannel()

    chanle.assertExchange(LOGS_EX, 'direct', {durable: true})

    // get message from command line
    const args = process.argv.slice(2);
    const msg = args.slice(1).join(' ') || 'Hello World!';
    const severity = (args[0] || 'info').toLowerCase();

    chanle.publish(LOGS_EX, severity, Buffer.from(msg));

    console.log(` [x] Sent ${msg}`);

    setTimeout(() => {
        connection.close();
        process.exit(0);
    }, 500);
}

main();