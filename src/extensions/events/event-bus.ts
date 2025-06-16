import { Result } from '../../core/result'
import { pipe, filter } from '../../utils/fp'
import type {
  EventBus,
  EventBusConfig,
  EventSubscription,
  DomainEvent,
  DeadLetterEntry,
} from './events'

/**
 * Default event bus configuration
 */
const DEFAULT_CONFIG: EventBusConfig = {
  maxRetries: 3,
  defaultBackoffMs: 1000,
  deadLetterEnabled: true,
}

/**
 * In-memory event bus implementation
 */
export class InMemoryEventBus implements EventBus {
  private subscriptions = new Map<string, EventSubscription>()
  private deadLetterQueue: DeadLetterEntry<unknown>[] = []
  private subscriptionCounter = 0

  constructor(public readonly config: EventBusConfig = DEFAULT_CONFIG) {}

  /**
   * Publish a single event to all matching subscribers
   */
  async publish<T>(event: DomainEvent<T>): Promise<Result<Error, void>> {
    try {
      // Validate event if registry is configured
      if (this.config.registry) {
        const validationResult = this.config.registry.validate(event)
        if (Result.isErr(validationResult)) {
          return Result.Err(validationResult.error)
        }
      }

      // Store event if event store is configured
      if (this.config.eventStore) {
        const storeResult = await this.config.eventStore.append(event.aggregateId || 'global', [
          event,
        ])
        if (Result.isErr(storeResult)) {
          return Result.Err(storeResult.error)
        }
      }

      // Find matching subscriptions using FP
      const allSubscriptions = Array.from(this.subscriptions.values())
      const matchingSubscriptions = pipe(
        (subs: EventSubscription[]) =>
          filter((sub: EventSubscription) => sub.eventType === event.type)(subs),
        byType => filter((sub: EventSubscription) => !sub.filter || sub.filter(event))(byType)
      )(allSubscriptions)

      // Process subscriptions in parallel
      const promises = matchingSubscriptions.map(subscription =>
        this.processSubscription(subscription, event)
      )
      await Promise.all(promises)
      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Publish multiple events
   */
  async publishMany<T>(events: DomainEvent<T>[]): Promise<Result<Error, void>> {
    try {
      for (const event of events) {
        const result = await this.publish(event)
        if (Result.isErr(result)) {
          return result
        }
      }
      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Subscribe to events with optional filtering
   */
  subscribe<T>(subscription: EventSubscription<T>): Result<Error, string> {
    try {
      const subscriptionId = `sub_${++this.subscriptionCounter}`
      this.subscriptions.set(subscriptionId, subscription as EventSubscription)
      return Result.Ok(subscriptionId)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): Result<Error, void> {
    try {
      if (!this.subscriptions.has(subscriptionId)) {
        return Result.Err(new Error(`Subscription ${subscriptionId} not found`))
      }
      this.subscriptions.delete(subscriptionId)
      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values())
  }

  /**
   * Get dead letter queue entries
   */
  getDeadLetterQueue(): DeadLetterEntry[] {
    return [...this.deadLetterQueue]
  }

  /**
   * Reprocess a dead letter queue entry
   */
  async reprocessDeadLetter(entryId: string): Promise<Result<Error, void>> {
    try {
      const entryIndex = this.deadLetterQueue.findIndex(entry => entry.id === entryId)
      if (entryIndex === -1) {
        return Result.Err(new Error(`Dead letter entry ${entryId} not found`))
      }

      const entry = this.deadLetterQueue[entryIndex]
      if (!entry) {
        return Result.Err(new Error(`Dead letter entry ${entryId} not found`))
      }

      const result = await this.processSubscription(entry.subscription, entry.event)

      if (Result.isOk(result)) {
        // Remove from dead letter queue if successful
        this.deadLetterQueue.splice(entryIndex, 1)
      }

      return result
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Clear all dead letter queue entries
   */
  clearDeadLetterQueue(): Result<Error, void> {
    try {
      this.deadLetterQueue.length = 0
      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Process a subscription with retry logic
   */
  private async processSubscription<T>(
    subscription: EventSubscription<T>,
    event: DomainEvent<T>
  ): Promise<Result<Error, void>> {
    const retryPolicy = subscription.retryPolicy || {
      maxRetries: this.config.maxRetries,
      backoffMs: this.config.defaultBackoffMs,
      exponentialBackoff: true,
    }

    let lastError: Error | null = null
    let retryCount = 0

    while (retryCount <= retryPolicy.maxRetries) {
      try {
        const result = await subscription.handler(event)
        if (Result.isOk(result)) {
          return Result.Ok(undefined)
        }
        lastError = result.error
      } catch (error) {
        lastError = error as Error
      }

      retryCount++

      if (retryCount <= retryPolicy.maxRetries) {
        const backoffMs = retryPolicy.exponentialBackoff
          ? retryPolicy.backoffMs * Math.pow(2, retryCount - 1)
          : retryPolicy.backoffMs

        await this.delay(backoffMs)
      }
    }

    // Add to dead letter queue if enabled and all retries failed
    if (this.config.deadLetterEnabled && subscription.deadLetterQueue !== false && lastError) {
      this.addToDeadLetterQueue(subscription, event, lastError, retryCount - 1)
    }

    return Result.Err(lastError || new Error('Unknown error in subscription processing'))
  }

  /**
   * Add failed event to dead letter queue
   */
  private addToDeadLetterQueue<T>(
    subscription: EventSubscription<T>,
    event: DomainEvent<T>,
    error: Error,
    retryCount: number
  ): void {
    const deadLetterEntry: DeadLetterEntry<T> = {
      id: `dlq_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      event,
      subscription,
      error,
      retryCount,
      timestamp: Date.now(),
    }

    this.deadLetterQueue.push(deadLetterEntry as DeadLetterEntry<unknown>)
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Create a new event bus instance
 */
export function createEventBus(config?: Partial<EventBusConfig>): EventBus {
  return new InMemoryEventBus({ ...DEFAULT_CONFIG, ...config })
}

/**
 * Global event bus instance
 */
let globalEventBus: EventBus | null = null

/**
 * Get or create the global event bus
 */
export function getGlobalEventBus(config?: Partial<EventBusConfig>): EventBus {
  if (!globalEventBus) {
    globalEventBus = createEventBus(config)
  }
  return globalEventBus
}

/**
 * Set the global event bus (useful for testing)
 */
export function setGlobalEventBus(eventBus: EventBus): void {
  globalEventBus = eventBus
}

/**
 * Helper function to create domain events
 */
export function createEvent<T>(
  type: string,
  payload: T,
  options: {
    aggregateId?: string
    aggregateType?: string
    metadata?: Record<string, unknown>
    version?: number
  } = {}
): DomainEvent<T> {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`,
    type,
    timestamp: Date.now(),
    version: options.version || 1,
    payload,
    ...(options.aggregateId && { aggregateId: options.aggregateId }),
    ...(options.aggregateType && { aggregateType: options.aggregateType }),
    ...(options.metadata && { metadata: options.metadata }),
  }
}
