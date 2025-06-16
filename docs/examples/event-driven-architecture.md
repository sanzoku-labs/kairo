# Event-Driven Architecture Example

This example demonstrates how to build reactive applications using Kairo's event-driven architecture with events, sagas, and event sourcing.

## Basic Event Publishing and Subscribing

```typescript
import { createEventBus, createEvent } from 'kairo/events'

// Create event bus
const eventBus = createEventBus({
  maxRetries: 3,
  deadLetterEnabled: true,
})

// Define event types
interface UserCreatedEvent {
  userId: string
  name: string
  email: string
}

interface OrderPlacedEvent {
  orderId: string
  userId: string
  total: number
  items: Array<{
    productId: string
    quantity: number
    price: number
  }>
}

// Create and publish events
const userCreatedEvent = createEvent<UserCreatedEvent>('user.created', {
  userId: '123',
  name: 'John Doe',
  email: 'john@example.com',
})

await eventBus.publish(userCreatedEvent)

// Subscribe to events
eventBus.subscribe<UserCreatedEvent>({
  eventType: 'user.created',
  handler: async event => {
    console.log(`Welcome ${event.payload.name}!`)

    // Send welcome email
    await emailService.sendWelcomeEmail({
      email: event.payload.email,
      name: event.payload.name,
    })

    // Create user profile
    await profileService.createProfile({
      userId: event.payload.userId,
      displayName: event.payload.name,
    })

    return Result.Ok(undefined)
  },
})
```

## Event-Driven Pipelines

```typescript
import { eventPipeline } from 'kairo/events'
import { nativeSchema } from 'kairo'

const OrderSchema = nativeSchema.object({
  orderId: nativeSchema.string().uuid(),
  userId: nativeSchema.string().uuid(),
  total: nativeSchema.number().positive(),
  status: nativeSchema.enum(['pending', 'processing', 'shipped', 'delivered'] as const),
})

// Pipeline that automatically emits events at each step
const orderProcessingPipeline = eventPipeline('order-processing', { eventBus })
  .input(OrderSchema)
  .map('validate-order', order => {
    if (order.total < 0) {
      throw new Error('Invalid order total')
    }
    return order
  })
  .emit('order.validated') // Automatically emits event
  .map('enrich-order', async order => {
    const customer = await customerService.getCustomer(order.userId)
    return {
      ...order,
      customerTier: customer.tier,
      shippingAddress: customer.defaultAddress,
    }
  })
  .emit('order.enriched')
  .map('calculate-shipping', order => {
    const shippingCost = calculateShipping(order.shippingAddress, order.total)
    return {
      ...order,
      shippingCost,
      finalTotal: order.total + shippingCost,
    }
  })
  .emit('order.shipping-calculated')
  .map('process-payment', async order => {
    const paymentResult = await paymentService.processPayment({
      amount: order.finalTotal,
      customerId: order.userId,
    })

    return {
      ...order,
      paymentId: paymentResult.id,
      status: paymentResult.success ? 'processing' : 'failed',
    }
  })
  .emit('order.payment-processed')

// Execute the pipeline
const result = await orderProcessingPipeline.execute({
  orderId: '456',
  userId: '123',
  total: 99.99,
  status: 'pending',
})

// Subscribe to specific events from the pipeline
eventBus.subscribe({
  eventType: 'order.payment-processed',
  handler: async event => {
    const order = event.payload

    if (order.status === 'processing') {
      // Trigger fulfillment
      await fulfillmentService.fulfillOrder(order.orderId)
    } else {
      // Handle payment failure
      await notificationService.notifyPaymentFailure(order.userId, order.orderId)
    }

    return Result.Ok(undefined)
  },
})
```

## Event-Driven Repositories

```typescript
import { eventRepository } from 'kairo/events'
import { nativeSchema } from 'kairo'

const UserSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string(),
  email: nativeSchema.string().email(),
  status: nativeSchema.enum(['active', 'inactive', 'suspended'] as const),
})

// Repository that automatically emits events
const userRepo = eventRepository({
  name: 'users',
  schema: UserSchema,
  eventBus,
  emitEvents: true,
  storage: 'database',
})

// CRUD operations automatically emit events
const user = await userRepo.create({
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  status: 'active',
})
// Automatically emits 'users.created' event

await userRepo.update('123', { status: 'suspended' })
// Automatically emits 'users.updated' event

await userRepo.delete('123')
// Automatically emits 'users.deleted' event

// Subscribe to repository events
userRepo.onCreated(async event => {
  console.log(`User created: ${event.payload.entity.name}`)

  // Index user for search
  await searchService.indexUser(event.payload.entity)

  // Add to marketing lists
  await marketingService.addToWelcomeList(event.payload.entity.email)

  return Result.Ok(undefined)
})

userRepo.onUpdated(async event => {
  console.log(`User updated: ${event.payload.entityId}`)

  // Update search index
  await searchService.updateUser(event.payload.entity)

  // Invalidate caches
  await cacheService.invalidate(`user:${event.payload.entityId}`)

  return Result.Ok(undefined)
})

userRepo.onDeleted(async event => {
  console.log(`User deleted: ${event.payload.entityId}`)

  // Remove from search index
  await searchService.removeUser(event.payload.entityId)

  // Clean up related data
  await profileService.deleteProfile(event.payload.entityId)
  await notificationService.deletePreferences(event.payload.entityId)

  return Result.Ok(undefined)
})
```

## Saga Patterns for Complex Workflows

```typescript
import { saga, sagaStep, createSagaManager } from 'kairo/events'

// Define a complex e-commerce order saga
const ecommerceOrderSaga = saga(
  'ecommerce-order',
  [
    sagaStep('validate-order', async input => {
      const validation = await orderValidationService.validate(input.orderData)
      if (!validation.valid) {
        throw new ValidationError(validation.errors)
      }
      return { ...input, validatedOrder: validation.order }
    }),

    sagaStep('reserve-inventory', async input => {
      const reservation = await inventoryService.reserve(input.validatedOrder.items)
      return { ...input, reservationId: reservation.id }
    }),

    sagaStep('charge-payment', async input => {
      const payment = await paymentService.charge({
        amount: input.validatedOrder.total,
        customerId: input.validatedOrder.customerId,
        paymentMethod: input.validatedOrder.paymentMethod,
      })
      return { ...input, paymentId: payment.id }
    }),

    sagaStep('create-order', async input => {
      const order = await orderService.create({
        ...input.validatedOrder,
        reservationId: input.reservationId,
        paymentId: input.paymentId,
        status: 'processing',
      })
      return { ...input, orderId: order.id }
    }),

    sagaStep('send-confirmation', async input => {
      await emailService.sendOrderConfirmation({
        orderId: input.orderId,
        customerEmail: input.validatedOrder.customerEmail,
      })
      return input
    }),

    sagaStep('trigger-fulfillment', async input => {
      await fulfillmentService.triggerFulfillment(input.orderId)
      return input
    }),
  ],
  {
    // Enable automatic rollback on failure
    rollbackOnFailure: true,

    // Event bus for publishing saga events
    eventBus: eventBus,

    // Compensation functions for rollback
    compensations: {
      'reserve-inventory': async context => {
        console.log(`Rolling back inventory reservation: ${context.reservationId}`)
        await inventoryService.release(context.reservationId)
      },

      'charge-payment': async context => {
        console.log(`Refunding payment: ${context.paymentId}`)
        await paymentService.refund(context.paymentId)
      },

      'create-order': async context => {
        console.log(`Cancelling order: ${context.orderId}`)
        await orderService.cancel(context.orderId)
      },

      'send-confirmation': async context => {
        console.log(`Sending cancellation email for order: ${context.orderId}`)
        await emailService.sendOrderCancellation({
          orderId: context.orderId,
          customerEmail: context.validatedOrder.customerEmail,
        })
      },
    },
  }
)

// Execute the saga
const sagaManager = createSagaManager({ eventBus })

const result = await sagaManager.execute(ecommerceOrderSaga, {
  orderData: {
    items: [
      { productId: 'prod-1', quantity: 2, price: 29.99 },
      { productId: 'prod-2', quantity: 1, price: 49.99 },
    ],
    customerId: 'customer-123',
    customerEmail: 'john@example.com',
    paymentMethod: 'credit-card',
    total: 109.97,
  },
})

result.match({
  Ok: result => {
    console.log(`Order processed successfully: ${result.orderId}`)
  },
  Err: error => {
    console.error(`Order processing failed: ${error.message}`)
    // All compensations have been automatically executed
  },
})
```

## Event Store and Event Sourcing

```typescript
import { createEventStore } from 'kairo/events'

// Create event store for persistence
const eventStore = createEventStore({
  storage: 'postgres', // or 'memory', 'redis'
  tableName: 'event_store',
  connectionString: process.env.DATABASE_URL,
})

// Configure event bus with event store
const eventBus = createEventBus({
  eventStore: eventStore,
  maxRetries: 3,
})

// All published events are automatically stored
await eventBus.publish(userCreatedEvent)
await eventBus.publish(orderPlacedEvent)

// Query stored events
const userEvents = await eventStore.getEventsByStream('user-123')
const orderEvents = await eventStore.getEventsByType('order.placed')
const allEvents = await eventStore.getEvents({
  from: new Date('2024-01-01'),
  to: new Date('2024-12-31'),
})

// Event sourcing - rebuild state from events
class UserAggregate {
  constructor(
    public id: string,
    public name: string = '',
    public email: string = '',
    public status: string = 'active',
    public version: number = 0
  ) {}

  static async fromEvents(userId: string, eventStore: EventStore) {
    const events = await eventStore.getEventsByStream(`user-${userId}`)

    let user = new UserAggregate(userId)

    events.forEach(event => {
      user = user.apply(event)
    })

    return user
  }

  apply(event: any): UserAggregate {
    switch (event.type) {
      case 'user.created':
        return new UserAggregate(
          event.payload.userId,
          event.payload.name,
          event.payload.email,
          'active',
          this.version + 1
        )

      case 'user.updated':
        return new UserAggregate(
          this.id,
          event.payload.name || this.name,
          event.payload.email || this.email,
          this.status,
          this.version + 1
        )

      case 'user.suspended':
        return new UserAggregate(this.id, this.name, this.email, 'suspended', this.version + 1)

      default:
        return this
    }
  }
}

// Rebuild user state from events
const user = await UserAggregate.fromEvents('123', eventStore)
console.log(`User ${user.name} has status ${user.status} (version ${user.version})`)

// Replay events for debugging or migration
await eventStore.replay('user-123', async event => {
  console.log(`Replaying event: ${event.type}`, event.payload)
  // Process event
  return Result.Ok(undefined)
})
```

## Dead Letter Queue and Error Handling

```typescript
// Configure dead letter queue
const eventBus = createEventBus({
  deadLetterEnabled: true,
  maxRetries: 3,
})

// Subscribe with custom retry logic
eventBus.subscribe({
  eventType: 'order.payment-failed',
  handler: async event => {
    try {
      // Attempt to process failed payment
      await paymentRecoveryService.processFailedPayment(event.payload)
      return Result.Ok(undefined)
    } catch (error) {
      if (error.code === 'TEMPORARY_FAILURE') {
        // Retry this error
        return Result.Err(new RetryableError(error.message))
      } else {
        // Don't retry this error
        return Result.Err(new PermanentError(error.message))
      }
    }
  },
  retryPolicy: {
    maxRetries: 5,
    backoffMs: 2000,
    exponentialBackoff: true,
    jitter: true,
  },
})

// Handle dead letter events
eventBus.onDeadLetter(async deadEvent => {
  console.error(`Event failed permanently:`, {
    eventType: deadEvent.originalEvent.type,
    payload: deadEvent.originalEvent.payload,
    error: deadEvent.error.message,
    attempts: deadEvent.attempts,
  })

  // Alert ops team
  await alertingService.notify({
    type: 'dead_letter_event',
    event: deadEvent.originalEvent,
    error: deadEvent.error,
  })

  // Store for manual review
  await deadLetterRepository.create({
    eventId: deadEvent.originalEvent.id,
    eventType: deadEvent.originalEvent.type,
    payload: deadEvent.originalEvent.payload,
    error: deadEvent.error.message,
    createdAt: new Date().toISOString(),
  })
})

// Process dead letter queue manually
const deadLetterEvents = await eventBus.getDeadLetterEvents()

for (const deadEvent of deadLetterEvents) {
  console.log(`Processing dead letter event: ${deadEvent.originalEvent.type}`)

  // Manual intervention or fixed retry
  const shouldRetry = await operatorService.reviewDeadLetter(deadEvent)

  if (shouldRetry) {
    await eventBus.reprocessDeadLetter(deadEvent.id)
  } else {
    await eventBus.removeDeadLetter(deadEvent.id)
  }
}
```

## Cross-Service Event Communication

```typescript
// Microservices communication via events
class UserService {
  constructor(private eventBus: EventBus) {}

  async createUser(userData: any) {
    const user = await this.userRepository.create(userData)

    // Publish event for other services
    await this.eventBus.publish(
      createEvent('user.created', {
        userId: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      })
    )

    return user
  }
}

class NotificationService {
  constructor(private eventBus: EventBus) {
    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.eventBus.subscribe({
      eventType: 'user.created',
      handler: async event => {
        await this.sendWelcomeEmail(event.payload)
        return Result.Ok(undefined)
      },
    })

    this.eventBus.subscribe({
      eventType: 'order.placed',
      handler: async event => {
        await this.sendOrderConfirmation(event.payload)
        return Result.Ok(undefined)
      },
    })
  }

  private async sendWelcomeEmail(user: any) {
    console.log(`Sending welcome email to ${user.email}`)
    // Email sending logic
  }

  private async sendOrderConfirmation(order: any) {
    console.log(`Sending order confirmation for ${order.orderId}`)
    // Email sending logic
  }
}

class AnalyticsService {
  constructor(private eventBus: EventBus) {
    // Subscribe to all events for analytics
    this.eventBus.subscribe({
      eventPattern: /.*/,
      handler: async event => {
        await this.trackEvent(event)
        return Result.Ok(undefined)
      },
    })
  }

  private async trackEvent(event: any) {
    await this.analyticsDatabase.insert({
      eventType: event.type,
      timestamp: event.timestamp,
      payload: event.payload,
    })
  }
}

// Initialize services
const eventBus = createEventBus()
const userService = new UserService(eventBus)
const notificationService = new NotificationService(eventBus)
const analyticsService = new AnalyticsService(eventBus)

// Creating a user triggers notifications and analytics automatically
await userService.createUser({
  name: 'Jane Doe',
  email: 'jane@example.com',
})
```

This example demonstrates the power of event-driven architecture in Kairo:

- **Decoupled Services**: Services communicate through events without direct dependencies
- **Automatic Event Emission**: Pipelines and repositories automatically emit events
- **Complex Workflows**: Sagas handle multi-step processes with automatic compensation
- **Event Sourcing**: Rebuild application state from stored events
- **Error Handling**: Dead letter queues and retry logic for resilient systems
- **Cross-Service Communication**: Microservices coordinate through events
