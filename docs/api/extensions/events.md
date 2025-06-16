# Event Bus API

The Event Bus API provides type-safe publish/subscribe event handling with filtering, retry logic, and cross-pillar integration.

## Core Concepts

Events in Kairo are type-safe, immutable data structures that represent something that happened in your application. The event bus enables decoupled communication between different parts of your system.

## Creating Events

```typescript
import { createEvent } from 'kairo/events'

// Create a type-safe event
const userCreatedEvent = createEvent(
  'user.created',
  {
    userId: '123',
    name: 'John Doe',
    email: 'john@example.com',
  },
  {
    aggregateId: '123',
    aggregateType: 'user',
    version: 1,
  }
)
```

## Event Bus Creation

```typescript
import { createEventBus } from 'kairo/events'

const eventBus = createEventBus({
  maxRetries: 3,
  deadLetterEnabled: true,
  eventStore: eventStore, // Optional persistence
  concurrencyLimit: 10,
})
```

### Configuration Options

- `maxRetries`: Maximum retry attempts for failed handlers
- `deadLetterEnabled`: Enable dead letter queue for failed events
- `eventStore`: Optional event store for persistence
- `concurrencyLimit`: Maximum concurrent event processing

## Publishing Events

```typescript
// Simple publish
await eventBus.publish(userCreatedEvent)

// Batch publish
await eventBus.publishBatch([event1, event2, event3])

// Publish with options
await eventBus.publish(userCreatedEvent, {
  delay: 5000, // Delay execution by 5 seconds
  priority: 'high',
})
```

## Event Subscriptions

### Basic Subscription

```typescript
eventBus.subscribe({
  eventType: 'user.created',
  handler: async event => {
    await sendWelcomeEmail(event.payload)
    return Result.Ok(undefined)
  },
})
```

### Advanced Subscription with Filtering

```typescript
eventBus.subscribe({
  eventType: 'user.created',
  filter: event => event.payload.email.includes('@company.com'),
  handler: async event => {
    await addToCompanyDirectory(event.payload)
    return Result.Ok(undefined)
  },
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    exponentialBackoff: true,
  },
  deadLetterQueue: true,
})
```

### Pattern-Based Subscriptions

```typescript
// Subscribe to all user events
eventBus.subscribe({
  eventPattern: /^user\./,
  handler: async event => {
    await auditService.log(event)
    return Result.Ok(undefined)
  },
})

// Subscribe to multiple event types
eventBus.subscribe({
  eventTypes: ['user.created', 'user.updated', 'user.deleted'],
  handler: async event => {
    await updateSearchIndex(event)
    return Result.Ok(undefined)
  },
})
```

## Error Handling and Retry

```typescript
eventBus.subscribe({
  eventType: 'payment.processing',
  handler: async event => {
    try {
      await processPayment(event.payload)
      return Result.Ok(undefined)
    } catch (error) {
      if (error.code === 'TEMPORARY_FAILURE') {
        return Result.Err(new RetryableError(error.message))
      }
      return Result.Err(new PermanentError(error.message))
    }
  },
  retryPolicy: {
    maxRetries: 5,
    backoffMs: 2000,
    exponentialBackoff: true,
    jitter: true,
  },
})
```

## Dead Letter Queue

```typescript
// Handle failed events
eventBus.onDeadLetter(async deadEvent => {
  console.error(`Event failed permanently:`, deadEvent)
  await alertingService.notify({
    type: 'dead_letter',
    event: deadEvent.originalEvent,
    error: deadEvent.error,
  })
})

// Reprocess dead letter events
const deadLetterEvents = await eventBus.getDeadLetterEvents()
for (const deadEvent of deadLetterEvents) {
  await eventBus.reprocessDeadLetter(deadEvent.id)
}
```

## Event Store Integration

```typescript
import { createEventStore } from 'kairo/events'

const eventStore = createEventStore({
  storage: 'memory', // or 'redis', 'postgres'
  maxEvents: 10000,
})

const eventBus = createEventBus({
  eventStore: eventStore,
})

// All published events are automatically stored
await eventBus.publish(userCreatedEvent)

// Query stored events
const userEvents = await eventStore.getEvents('user-123')
const allEvents = await eventStore.getEventsByType('user.created')
```

## Cross-Pillar Integration

### Event-Driven Pipelines

```typescript
import { eventPipeline } from 'kairo/events'

const userProcessingPipeline = eventPipeline('user-processing', { eventBus })
  .map('validate', validateUserData)
  .emit('user.validated')
  .map('enrich', enrichUserData)
  .emit('user.enriched')
  .map('persist', persistUser)
  .emit('user.persisted')

// Automatically emits events at each step
const result = await userProcessingPipeline.execute(userData)
```

### Event-Driven Repositories

```typescript
import { eventRepository } from 'kairo/events'

const userRepo = eventRepository({
  name: 'users',
  schema: UserSchema,
  eventBus,
  emitEvents: true,
})

// Automatically emits 'users.created' event
const user = await userRepo.create({
  name: 'John Doe',
  email: 'john@example.com',
})

// Subscribe to repository events
userRepo.onCreated(async event => {
  await indexingService.indexUser(event.payload.entity)
  return Result.Ok(undefined)
})
```

## Event Monitoring and Analytics

```typescript
// Get event bus statistics
const stats = eventBus.getStatistics()
console.log(`Published: ${stats.published}`)
console.log(`Processed: ${stats.processed}`)
console.log(`Failed: ${stats.failed}`)

// Monitor event performance
eventBus.onMetrics(metrics => {
  console.log(`Throughput: ${metrics.eventsPerSecond}`)
  console.log(`Average latency: ${metrics.averageLatency}ms`)
})

// Health monitoring
const health = await eventBus.healthCheck()
if (!health.healthy) {
  console.error('Event bus is unhealthy:', health.issues)
}
```

## Best Practices

### Event Naming

Use hierarchical event names with past tense verbs:

```typescript
// Good
'user.created'
'order.payment.processed'
'inventory.item.reserved'

// Avoid
'createUser'
'processPayment'
'reserveItem'
```

### Event Payload Design

Keep events immutable and include all necessary context:

```typescript
// Good - Complete context
const orderEvent = createEvent('order.created', {
  orderId: '123',
  customerId: '456',
  items: [...],
  total: 99.99,
  currency: 'USD',
  timestamp: new Date().toISOString(),
})

// Avoid - Incomplete context
const orderEvent = createEvent('order.created', {
  orderId: '123',
})
```

### Handler Design

Keep handlers focused and idempotent:

```typescript
// Good - Idempotent handler
eventBus.subscribe({
  eventType: 'user.created',
  handler: async event => {
    const existing = await emailService.findWelcomeEmail(event.payload.userId)
    if (!existing) {
      await emailService.sendWelcomeEmail(event.payload)
    }
    return Result.Ok(undefined)
  },
})
```

## Type Safety

All events are fully typed for maximum safety:

```typescript
// Define event types
interface UserCreatedEvent {
  userId: string
  name: string
  email: string
}

// Type-safe event creation
const event = createEvent<UserCreatedEvent>('user.created', {
  userId: '123',
  name: 'John Doe',
  email: 'john@example.com',
})

// Type-safe subscription
eventBus.subscribe<UserCreatedEvent>({
  eventType: 'user.created',
  handler: async event => {
    // event.payload is typed as UserCreatedEvent
    console.log(`Welcome ${event.payload.name}!`)
    return Result.Ok(undefined)
  },
})
```
