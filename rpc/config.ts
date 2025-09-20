export default {
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
        rpcExchange: 'rpc-ex',
        rpcQueue: 'rpc-queue',
        rpcTTL: 3000,
        retryExchange: 'retry-ex',
        retryQueue: 'retry-queue',
        retryTTL: 3000,
        maxRetry: 3,
        deadLetterExchange: 'dead-ex',
        deadLetterQueue: 'dead-queue',
        deadLetterTTL: 30000,
    },
    server: {
        port: process.env.PORT || 3000,
    },
    database: {
        url: process.env.DATABASE_URL || 'mongodb://localhost:27017/mydatabase',
    },
}