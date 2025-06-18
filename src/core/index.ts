/**
 * Kairo V2 - Core API
 *
 * Complete architectural redesign built from scratch with strategic V1 component reuse.
 * Four-layer architecture with Pareto-optimized API surface.
 *
 * Architecture:
 * - Layer 1: Core Methods (23 total)
 * - Layer 2: Configuration Objects (rich options)
 * - Layer 3: Public Utilities (15 total)
 * - Layer 4: Internal Utilities (private)
 */

// Shared Utilities - Used across all pillars
export { Result } from './shared'
export type { OkResult, ErrResult } from './shared'
export { schema } from './shared'
export type { Schema, ValidationError, SchemaShape, InferSchema } from './shared'

// SERVICE Pillar - HTTP-only API Integration (5 methods + 4 utilities)
export { service } from './service'
export type {
  GetOptions,
  PostOptions,
  PutOptions,
  PatchOptions,
  DeleteOptions,
  ServiceResult,
  ServiceError,
  ServiceHttpError,
  ServiceNetworkError,
} from './service'

// DATA Pillar - Data Operations + Aggregation (10 methods + 6 utilities)
export { data } from './data'
export type {
  DataBaseOptions,
  SchemaOptions,
  DataValidationOptions,
  DataTransformOptions,
  ConvertOptions,
  AggregateOptions,
  GroupByOptions,
  SerializeOptions,
  DeserializeOptions,
  CloneOptions,
  MergeOptions,
  DataResult,
  DataType,
  SchemaDefinition,
  TransformMapping,
  AggregateOperations,
  AggregateResult,
  SerializationFormat,
} from './data'

// PIPELINE Pillar - Logic Composition (8 methods + 5 utilities)
export { pipeline } from './pipeline'
export type {
  PipelineBaseOptions,
  MapOptions,
  FilterOptions,
  ReduceOptions,
  ComposeOptions,
  ChainOptions,
  BranchOptions,
  ParallelOptions,
  ValidateOptions,
  PipelineResult,
  PipelineOperation,
  TransformFunction,
  PredicateFunction,
  ReducerFunction,
  ValidationRule,
  ComposedPipeline,
} from './pipeline'

// V2 Error Types
export type { ServiceError as V2ServiceError, DataError, PipelineError, V2Error } from './shared'

// Core Configuration Types
export type {
  BaseOptions,
  ValidationOptions,
  CacheOptions,
  RetryOptions,
  TransformOptions,
} from './shared'

/**
 * Kairo V2 API
 *
 * Three pillars with consistent patterns:
 * - service() - HTTP-only API integration
 * - data() - Data validation, transformation, aggregation
 * - pipeline() - Logic composition and workflows
 *
 * @example
 * ```typescript
 * import { service, data, pipeline, Result } from 'kairo/v2'
 *
 * // HTTP API requests
 * const users = await service.get('/users')
 *
 * // Data validation and transformation
 * const UserSchema = data.schema({
 *   id: { type: 'string', format: 'uuid' },
 *   name: { type: 'string', min: 2, max: 100 },
 *   email: { type: 'string', format: 'email' }
 * })
 *
 * // Pipeline processing
 * const processUsers = pipeline.compose([
 *   users => pipeline.filter(users, user => user.active),
 *   users => pipeline.map(users, user => data.validate(user, UserSchema)),
 *   users => data.aggregate(users, {
 *     groupBy: ['region'],
 *     sum: ['orderCount'],
 *     avg: ['satisfaction']
 *   })
 * ])
 *
 * const result = await processUsers(users)
 *
 * // Error handling
 * if (Result.isError(result)) {
 *   console.error('Processing failed:', result.error.message)
 * } else {
 *   console.log('Analytics:', result.value)
 * }
 * ```
 */

// Implementation Status
export const V2_STATUS = {
  version: '2.0.0-alpha',
  pillars: {
    SERVICE: 'IMPLEMENTED', // 5 methods + 4 utilities ✅
    DATA: 'IMPLEMENTED', // 10 methods + 6 utilities ✅
    PIPELINE: 'IMPLEMENTED', // 8 methods + 5 utilities ✅
  },
  shared: 'COMPLETE', // Shared utilities ✅
  architecture: 'COMPLETE', // Four-layer design ✅
} as const
