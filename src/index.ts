export { Result, map, flatMap, mapError, match, chain } from './core/result'
export type { OkResult, ErrResult } from './core/result'

export { pipeline, tracing, cache } from './core/pipeline'
export type {
  Pipeline,
  HttpError,
  NetworkError,
  TimeoutError,
  TraceEntry,
  TraceFilter,
  TraceData,
  TraceCollector,
} from './core/pipeline'

export { resource, resourceUtils, resourceCache } from './core/resource'
export type {
  Resource,
  ResourceError,
  ResourceMethod,
  ResourceMethods,
  ResourceInput,
  ResourceOutput,
  ResourceConfig,
} from './core/resource'

export { ContractVerifier } from './core/contract'
export type {
  ResourceContract,
  VerifyOptions,
  ContractResult,
  ContractError,
  ContractValidation,
  ContractPerformance,
  MockScenario,
  MockScenarios,
  MockedResource,
  MockedResourceMethod,
  TestCase,
  TestSuite,
} from './core/contract'

export { schema } from './core/schema'
export type { Schema, ValidationError } from './core/schema'

export { nativeSchema } from './core/native-schema'
export type {
  Schema as NativeSchema,
  StringSchema,
  NumberSchema,
  BooleanSchema,
  ObjectSchema,
  ArraySchema,
  LiteralSchema,
  UnionSchema,
  EnumSchema,
  RecordSchema,
  ValidationError as NativeValidationError,
  SchemaShape,
  InferSchema,
} from './core/native-schema'

export { transform, createTransform, commonTransforms } from './core/transform'
export type {
  Transform,
  TransformError,
  TransformContext,
  TransformBuilder,
  FieldMapper,
  ComputeFunction,
  FilterPredicate,
  FieldMapping,
  ComputeMapping,
  TransformStep,
} from './core/transform'

export { rule, rules, commonRules } from './core/rules'
export type {
  Rule,
  Rules,
  BusinessRuleError,
  RuleValidationContext,
  RuleCondition,
  RuleValidation,
  AsyncRuleValidation,
} from './core/rules'

export { workflow, workflowUtils } from './core/workflow'
export type {
  Workflow,
  WorkflowError,
  WorkflowContext,
  WorkflowStep,
  FlowDefinition,
  FlowStep,
  Condition,
  LoopCondition,
  ErrorHandler,
  ErrorHandlers,
  RollbackHandler,
  RollbackHandlers,
  MetricsConfig,
  StepMocks,
  WorkflowOptions,
  MockedWorkflow,
  WorkflowDiagram,
} from './core/workflow'

export { workflowTesting } from './core/workflow-testing'
export type {
  WorkflowTestCase,
  WorkflowTestResult,
  WorkflowTestSuite,
  WorkflowTestSuiteResult,
  WorkflowAssertion,
} from './core/workflow-testing'

export {
  repository,
  hasOne,
  hasMany,
  belongsTo,
  MemoryStorageAdapter,
  createRepositoryError,
} from './core/repository'
export type {
  Repository,
  RepositoryError,
  RepositoryConfig,
  StorageAdapter,
  QueryOptions,
  UpdateOptions,
  DeleteOptions,
  Relations,
  HasOneRelation,
  HasManyRelation,
  BelongsToRelation,
  Relation,
} from './core/repository'

// Export workflow example types for user reference
export type {
  CreateUserRequest,
  User,
  WelcomeEmailRequest,
  WelcomeEmailResponse,
  CreateProfileRequest,
  Profile,
  Order,
  PaymentRequest,
  ShipmentRequest,
  NotificationRequest,
  MigrationInput,
  MigrationState,
  BatchRequest,
  MigrationItem,
  InsertResult,
  HealthStatus,
  HealthCheckResult,
} from './examples/workflow-types'

export {
  createError,
  chainError,
  isKairoError,
  getErrorChain,
  serializeError,
  findErrorByCode,
  hasErrorCode,
} from './core/errors'
export type { KairoError, ErrorWithCause } from './core/errors'

// Export advanced caching system
export {
  CacheManager,
  MemoryStorage,
  RedisStorage,
  cacheManager,
  cache as advancedCache,
} from './core/cache'
export type {
  CacheError,
  CacheEntry,
  CacheStats,
  CacheConfig,
  CacheLayerConfig,
  CacheStorage,
} from './core/cache'

// Export cache analytics
export { CacheAnalytics, defaultAnalyticsConfig } from './core/cache-analytics'
export type {
  AnalyticsError,
  CacheMetrics,
  PerformanceMetrics,
  HealthMetrics,
  MetricDataPoint,
  AggregationPeriod,
  AnalyticsConfig,
} from './core/cache-analytics'

// Export testing utilities
export * from './testing'

// Export functional utilities
export * from './utils/fp'

// Export event-driven architecture
export { createEventBus, getGlobalEventBus, setGlobalEventBus, createEvent } from './core/event-bus'
export type {
  BaseEvent,
  DomainEvent,
  EventHandler,
  EventFilter,
  EventSubscription,
  RetryPolicy,
  EventStoreEntry,
  EventStream,
  EventPublisher,
  EventSubscriber,
  EventStore,
  SagaStep,
  SagaContext,
  SagaDefinition,
  EventSchema,
  EventRegistry,
  DeadLetterEntry,
  EventBusConfig,
  EventBus,
  AggregateRoot,
  EventSourcedRepository,
} from './core/events'

export {
  createEventStore,
  createInMemoryEventStore,
  InMemoryEventStorageAdapter,
  KairoEventStore,
} from './core/event-store'
export type { EventStoreConfig, EventSnapshot, EventStorageAdapter } from './core/event-store'

export { createSagaManager, sagaStep, saga, InMemorySagaManager } from './core/saga'
export type {
  SagaState,
  SagaResult,
  SagaManager,
  SagaStepContext,
  EnhancedSagaStep,
  EnhancedSagaDefinition,
} from './core/saga'

export { eventPipeline, eventStep, EventPipeline } from './core/event-pipeline'
export type {
  EventPipelineContext,
  EventAwareStep,
  EventPipelineConfig,
  PipelineStartedEvent,
  PipelineCompletedEvent,
  PipelineFailedEvent,
  StepStartedEvent,
  StepCompletedEvent,
  StepFailedEvent,
} from './core/event-pipeline'

export { eventRepository, InMemoryStorageAdapter, EventRepository } from './core/event-repository'
export type {
  EntityCreatedEvent,
  EntityUpdatedEvent,
  EntityDeletedEvent,
  QueryExecutedEvent,
  EventRepositoryConfig,
  StorageAdapter as EventRepositoryStorageAdapter,
} from './core/event-repository'
