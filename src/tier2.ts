/**
 * Kairo Tier 2 - Production Ready (40 total functions)
 * 
 * Includes all Tier 1 functions plus 25 additional production-grade functions.
 * Perfect for teams building production applications with resilience and optimization.
 * 
 * Usage:
 *   import { Result, schema, pipeline, retry, timeout } from 'kairo/tier2'
 * 
 * Production Features Added:
 *   - Enhanced error handling and debugging
 *   - Complete CRUD operations and schema types
 *   - Resilient API integration (retry, timeout, caching)
 *   - Business rule utilities and testing support
 *   - Essential functional programming patterns
 */

// =============================================================================
// TIER 1: ESSENTIAL FOUNDATION (included for convenience)
// =============================================================================

// Re-export all Tier 1 functions
export * from './tier1'

// =============================================================================
// TIER 2: PRODUCTION ENHANCEMENTS (+25 functions)
// =============================================================================

// ENHANCED FOUNDATION - Advanced error handling (4 functions)
export { chain, mapError } from './core/result'
export { chainError, isKairoError } from './core/errors'
export type { KairoError, ErrorWithCause } from './core/errors'

// ENHANCED DATA LAYER - Complete data handling (8 functions)
export type {
  StringSchema,
  NumberSchema,
  BooleanSchema,
  ObjectSchema,
  ArraySchema,
} from './core/native-schema'
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
export { MemoryStorageAdapter, createRepositoryError } from './core/repository'

// ENHANCED INTERFACE LAYER - Resilient API patterns (5 functions)
export { resourceCache } from './core/resource'
export type {
  ResourceError,
  ResourceInput,
  ResourceOutput,
  ResourceConfig,
} from './core/resource'

// ENHANCED PROCESS LAYER - Production business logic (4 functions)
export { tracing } from './core/pipeline'
export { commonRules } from './core/rules'
export type {
  HttpError,
  NetworkError,
  TimeoutError,
  TraceEntry,
  TraceFilter,
  TraceData,
  TraceCollector,
} from './core/pipeline'
export type {
  BusinessRuleError,
  RuleValidationContext,
  RuleCondition,
  RuleValidation,
  AsyncRuleValidation,
} from './core/rules'

// ENHANCED UTILITIES - Production FP patterns (4 functions)
export { tap, maybe, when, unless } from './utils/fp'

// DATA TRANSFORMATIONS - Declarative data processing
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

// TESTING SUPPORT - Development and testing utilities
export * from './testing'

// FUNCTIONAL PROGRAMMING UTILITIES - Extended FP support
export * from './utils/fp'