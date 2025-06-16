import type { Result } from './result'
import type { Schema } from './native-schema'

/**
 * Base event interface with required properties
 */
export interface BaseEvent {
  readonly id: string
  readonly type: string
  readonly timestamp: number
  readonly version: number
  readonly metadata?: Record<string, unknown>
}

/**
 * Domain event with typed payload
 */
export interface DomainEvent<T = unknown> extends BaseEvent {
  readonly payload: T
  readonly aggregateId?: string
  readonly aggregateType?: string
}

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<Result<Error, void>>

/**
 * Event filter function type
 */
export type EventFilter<T = unknown> = (event: DomainEvent<T>) => boolean

/**
 * Event subscription configuration
 */
export interface EventSubscription<T = unknown> {
  readonly eventType: string
  readonly handler: EventHandler<T>
  readonly filter?: EventFilter<T>
  readonly retryPolicy?: RetryPolicy
  readonly deadLetterQueue?: boolean
}

/**
 * Retry policy for failed event handling
 */
export interface RetryPolicy {
  readonly maxRetries: number
  readonly backoffMs: number
  readonly exponentialBackoff?: boolean
}

/**
 * Event store entry for persistence
 */
export interface EventStoreEntry<T = unknown> extends DomainEvent<T> {
  readonly streamId: string
  readonly streamVersion: number
  readonly causationId?: string
  readonly correlationId?: string
}

/**
 * Event stream configuration
 */
export interface EventStream {
  readonly streamId: string
  readonly streamType: string
  readonly version: number
  readonly events: EventStoreEntry[]
}

/**
 * Event publisher interface
 */
export interface EventPublisher {
  publish<T>(event: DomainEvent<T>): Promise<Result<Error, void>>
  publishMany<T>(events: DomainEvent<T>[]): Promise<Result<Error, void>>
}

/**
 * Event subscriber interface
 */
export interface EventSubscriber {
  subscribe<T>(subscription: EventSubscription<T>): Result<Error, string>
  unsubscribe(subscriptionId: string): Result<Error, void>
  getSubscriptions(): EventSubscription[]
}

/**
 * Event store interface
 */
export interface EventStore {
  append<T>(
    streamId: string,
    events: DomainEvent<T>[],
    expectedVersion?: number
  ): Promise<Result<Error, number>>
  getStream(streamId: string, fromVersion?: number): Promise<Result<Error, EventStream>>
  getAllEvents(fromTimestamp?: number): Promise<Result<Error, EventStoreEntry[]>>
  replay(streamId: string, handler: EventHandler): Promise<Result<Error, number>>
}

/**
 * Saga step definition
 */
export interface SagaStep<TInput = unknown, TOutput = unknown> {
  readonly name: string
  readonly execute: (input: TInput) => Promise<Result<Error, TOutput>>
  readonly compensate?: (input: TInput) => Promise<Result<Error, void>>
  readonly timeout?: number
}

/**
 * Saga execution context
 */
export interface SagaContext {
  readonly sagaId: string
  readonly correlationId: string
  readonly startedAt: number
  completedSteps: string[]
  failedStep?: string
  compensationRequired: boolean
}

/**
 * Saga definition
 */
export interface SagaDefinition<T = unknown> {
  readonly name: string
  readonly steps: SagaStep[]
  readonly onComplete?: (context: SagaContext, result: T) => Promise<Result<Error, void>>
  readonly onError?: (context: SagaContext, error: Error) => Promise<Result<Error, void>>
  readonly timeout?: number
}

/**
 * Event schema validation
 */
export interface EventSchema<T = unknown> {
  readonly eventType: string
  readonly schema: Schema<T>
  readonly version: number
}

/**
 * Event registry for type-safe event definitions
 */
export interface EventRegistry {
  register<T>(eventSchema: EventSchema<T>): Result<Error, void>
  getSchema(eventType: string, version?: number): Result<Error, EventSchema>
  validate<T>(event: DomainEvent<T>): Result<Error, DomainEvent<T>>
}

/**
 * Dead letter queue entry
 */
export interface DeadLetterEntry<T = unknown> {
  readonly id: string
  readonly event: DomainEvent<T>
  readonly subscription: EventSubscription<T>
  readonly error: Error
  readonly retryCount: number
  readonly timestamp: number
}

/**
 * Event bus configuration
 */
export interface EventBusConfig {
  readonly maxRetries: number
  readonly defaultBackoffMs: number
  readonly deadLetterEnabled: boolean
  readonly eventStore?: EventStore
  readonly registry?: EventRegistry
}

/**
 * Main event bus interface
 */
export interface EventBus extends EventPublisher, EventSubscriber {
  readonly config: EventBusConfig
  getDeadLetterQueue(): DeadLetterEntry[]
  reprocessDeadLetter(entryId: string): Promise<Result<Error, void>>
  clearDeadLetterQueue(): Result<Error, void>
}

/**
 * Event sourcing aggregate root
 */
export abstract class AggregateRoot<TState = unknown> {
  protected constructor(
    protected readonly aggregateId: string,
    protected readonly aggregateType: string,
    protected state: TState,
    protected version: number = 0
  ) {}

  abstract applyEvent<T>(event: DomainEvent<T>): void
  abstract getUncommittedEvents(): DomainEvent[]
  abstract markEventsAsCommitted(): void

  public getAggregateId(): string {
    return this.aggregateId
  }

  public getAggregateType(): string {
    return this.aggregateType
  }

  public getVersion(): number {
    return this.version
  }

  public getState(): TState {
    return this.state
  }
}

/**
 * Event sourcing repository interface
 */
export interface EventSourcedRepository<T extends AggregateRoot> {
  save(aggregate: T): Promise<Result<Error, void>>
  getById(aggregateId: string): Promise<Result<Error, T>>
  exists(aggregateId: string): Promise<Result<Error, boolean>>
}
