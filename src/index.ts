// Kairo Core API - The Essential Three-Pillar Platform
//
// This is the clean, minimal API surface for Kairo.
// Advanced features are available as extensions.

// =============================================================================
// FOUNDATION: Result Pattern for Error Handling
// =============================================================================
export { Result, map, flatMap, mapError, match, chain } from './core/result'
export type { OkResult, ErrResult } from './core/result'

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

// =============================================================================
// DATA PILLAR: Schemas, Validation, and Data Access
// =============================================================================

// Native Schema System (zero dependencies, 3x faster than Zod)
export { nativeSchema as schema } from './core/native-schema'
export type {
  Schema,
  StringSchema,
  NumberSchema,
  BooleanSchema,
  ObjectSchema,
  ArraySchema,
  LiteralSchema,
  UnionSchema,
  EnumSchema,
  RecordSchema,
  ValidationError,
  SchemaShape,
  InferSchema,
} from './core/native-schema'

// Data Transformations
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

// Data Access Layer
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

// =============================================================================
// INTERFACE PILLAR: External System Integration
// =============================================================================

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

// =============================================================================
// PROCESS PILLAR: Business Logic and Data Flow
// =============================================================================

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

// =============================================================================
// UTILITIES: Functional Programming and Testing
// =============================================================================

// Export testing utilities
export * from './testing'

// Export functional utilities
export * from './utils/fp'

// =============================================================================
// LEGACY SCHEMA (deprecated, use `schema` instead)
// =============================================================================

// Legacy Zod-based schema (deprecated)
export { schema as legacySchema } from './core/schema'

// =============================================================================
// EXTENSIONS
// =============================================================================
// Advanced features are available as extensions:
//
// import { eventBus, saga } from 'kairo/extensions/events'
// import { transactionManager } from 'kairo/extensions/transactions'
// import { advancedCache } from 'kairo/extensions/caching'
// import { pluginSystem } from 'kairo/extensions/plugins'
// import { workflow } from 'kairo/extensions/workflows'
// import { contractTesting } from 'kairo/extensions/contracts'
// import { performanceMonitoring } from 'kairo/extensions/performance'
