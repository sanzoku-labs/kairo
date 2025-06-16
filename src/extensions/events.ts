// Event-Driven Architecture Extension
//
// Tree-shakable named exports for event-driven patterns

// Event Bus
export { createEventBus, getGlobalEventBus, setGlobalEventBus, createEvent } from './events/event-bus'

// Event Store
export {
  createEventStore,
  createInMemoryEventStore,
  InMemoryEventStorageAdapter,
  KairoEventStore,
} from './events/event-store'

// Saga Manager
export { createSagaManager, sagaStep, saga, InMemorySagaManager } from './events/saga'

// Event Pipelines
export { eventPipeline, eventStep, EventPipeline } from './events/event-pipeline'

// Event Repositories
export { eventRepository, EventRepository } from './events/event-repository'

// Event Types (types are tree-shaken automatically)
export type * from './events/events'
export type * from './events/event-bus'
export type * from './events/event-store'
export type * from './events/saga'
export type * from './events/event-pipeline'
export type * from './events/event-repository'