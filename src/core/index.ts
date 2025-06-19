/**
 * Kairo - Core API
 *
 * Three-pillar TypeScript library with focused functionality.
 * Built for universal compatibility across all TypeScript environments.
 *
 * Architecture:
 * - SERVICE: HTTP-only API integration (5 methods + 4 utilities)
 * - DATA: Data operations + aggregation (10 methods + 6 utilities)
 * - PIPELINE: Logic composition (8 methods + 5 utilities)
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

// Error Types
export type { DataError, PipelineError, AllKairoErrors } from './shared'

// Core Configuration Types
export type {
  BaseOptions,
  ValidationOptions,
  CacheOptions,
  RetryOptions,
  TransformOptions,
} from './shared'

/**
 * Kairo API
 *
 * Three pillars with consistent patterns:
 * - service() - HTTP-only API integration
 * - data() - Data validation, transformation, aggregation
 * - pipeline() - Logic composition and workflows
 *
 * @example
 * ```typescript
 * import { service, data, pipeline, Result } from 'kairo'
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
export const STATUS = {
  version: '1.0.0',
  pillars: {
    SERVICE: 'IMPLEMENTED', // 5 methods + 4 utilities ✅
    DATA: 'IMPLEMENTED', // 10 methods + 6 utilities ✅
    PIPELINE: 'IMPLEMENTED', // 8 methods + 5 utilities ✅
  },
  shared: 'COMPLETE', // Shared utilities ✅
  architecture: 'COMPLETE', // Three-pillar design ✅
} as const
