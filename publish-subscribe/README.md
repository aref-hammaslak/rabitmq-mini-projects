# RabbitMQ Publish-Subscribe with Retry Pattern

This mini project demonstrates a robust message processing system using RabbitMQ with a retry mechanism and dead letter queue pattern. It simulates real-world scenarios where message processing can fail and need to be retried.

## Project Structure

```
publish-subscribe/
├── emit-log.ts      # Message publisher
├── recive-logs.ts   # Message consumer with retry logic
└── README.md        # This file
```

## Components Overview

### 1. Message Publisher (`emit-log.ts`)

- Publishes messages to the `logs-ex` fanout exchange
- Simulates message generation from various sources
- Accepts custom messages via command line arguments

### 2. Message Consumer (`recive-logs.ts`)

- Consumes messages from the logs queue
- Implements retry logic with exponential backoff
- Handles dead letter routing for failed messages
- Simulates processing success/failure scenarios

## Architecture & Message Flow

### Exchanges and Queues

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   logs-ex   │    │   retry-ex   │    │   dead-ex   │
│  (fanout)   │    │  (direct)    │    │  (direct)   │
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ logs-queue  │    │ retry-queue  │    │ dead-queue  │
│             │    │ (TTL: 3s)    │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
```

### Message Lifecycle

1. **Initial Message**: Published to `logs-ex` fanout exchange
2. **Queue Binding**: Message routed to `logs-queue`
3. **Processing**: Consumer attempts to process the message
4. **Success Path**: Message acknowledged and removed
5. **Failure Path**: Message sent to retry mechanism
6. **Retry Loop**: Failed messages go through retry queue with TTL
7. **Dead Letter**: After max retries, message sent to dead letter queue

## Detailed Message Flow

### 1. Message Publishing

```typescript
// emit-log.ts
channel.publish(LOGS_EX, "", Buffer.from(msg));
```

- Messages are published to the `logs-ex` fanout exchange
- Fanout exchange broadcasts to all bound queues

### 2. Message Consumption & Processing

```typescript
// recive-logs.ts
channel.consume(firstQueue.queue, (msg) => {
  const retryCount = headers["x-retry"] || 0;

  if (retryCount > MAX_RETRY) {
    // Send to dead letter queue
  } else if (randNum > 0.8) {
    // Success - acknowledge message
  } else {
    // Failure - send to retry queue
  }
});
```

### 3. Retry Mechanism

When a message fails processing:

1. Original message is acknowledged (removed from logs queue)
2. New message published to `retry-ex` with incremented retry count
3. Retry queue has TTL (3 seconds) and dead letter exchange pointing back to `logs-ex`
4. After TTL expires, message returns to logs queue for retry

### 4. Dead Letter Handling

After `MAX_RETRY` attempts:

1. Message is published to `dead-ex`
2. Routed to `dead-queue` for manual inspection
3. Original message acknowledged and removed from system

## Configuration

```typescript
const RETRY_EX = "retry-ex"; // Retry exchange name
const RETRY_TTL = 3000; // 3 second delay between retries
const MAX_RETRY = 2; // Maximum retry attempts
const DEAD_EX = "dead-ex"; // Dead letter exchange
const LOGS_EX = "logs-ex"; // Main logs exchange
```

## Why This Pattern?

### 1. **Reliability**

- Ensures no message is lost due to temporary failures
- Provides multiple attempts for message processing
- Dead letter queue captures permanently failed messages

### 2. **Resilience**

- Handles transient failures (network issues, temporary service unavailability)
- Prevents message loss during system restarts
- Graceful degradation with dead letter handling

### 3. **Observability**

- Clear separation of successful, retrying, and failed messages
- Retry count tracking for monitoring
- Dead letter queue for failure analysis

### 4. **Scalability**

- Fanout exchange allows multiple consumers
- TTL-based retry prevents immediate retry storms
- Queue-based architecture supports horizontal scaling

## Usage

### Start the Consumer

```bash
npm run dev recive-logs.ts
# or
npx ts-node recive-logs.ts
```

### Publish Messages

```bash
npm run dev emit-log.ts "Your message here"
# or
npx ts-node emit-log.ts "Your message here"
```

### Example Output

```
# Successful processing
info: Hello World! firstQueue; Ack

# Failed processing (will retry)
info: Hello World! firstQueue; Nack; retryCount: 0
info: Hello World! firstQueue; Nack; retryCount: 1
info: Hello World! firstQueue; Nack; retryCount: 2

# Dead letter after max retries
info: Hello World! firstQueue; Dead; retryCount: 3
```

## Key Benefits

1. **At-Least-Once Delivery**: Messages are guaranteed to be processed
2. **Fault Tolerance**: System continues operating despite individual message failures
3. **Backpressure Management**: TTL prevents overwhelming the system with immediate retries
4. **Failure Analysis**: Dead letter queue provides insights into persistent failures
5. **Monitoring**: Retry counts enable performance monitoring and alerting

## Best Practices Demonstrated

- **Idempotent Processing**: Consumer logic should handle duplicate messages
- **Proper Acknowledgment**: Messages are only acknowledged after successful processing
- **Dead Letter Queues**: Failed messages are preserved for analysis
- **TTL Configuration**: Reasonable retry delays prevent system overload
- **Exchange Types**: Appropriate use of fanout and direct exchanges

This pattern is commonly used in microservices architectures, event-driven systems, and any scenario requiring reliable message processing with failure recovery.
