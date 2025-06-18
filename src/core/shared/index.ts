/**
 * Core Shared Utilities
 * 
 * Cross-cutting utilities used across all three pillars (SERVICE, DATA, PIPELINE):
 * - Result pattern for error handling
 * - Schema system for validation
 * - Error handling utilities
 * - Configuration types and utilities
 */

// Result Pattern - Error handling foundation
export { Result } from './result'
export type { OkResult, ErrResult } from './result'

// Schema System - High-performance validation
export { nativeSchema as schema } from './schema'
export type { 
  Schema, 
  ValidationError, 
  SchemaShape, 
  InferSchema,
  StringSchema,
  NumberSchema,
  BooleanSchema,
  ObjectSchema,
  ArraySchema
} from './schema'

// Error Handling Foundation & V2 Error Types
export { 
  createError, 
  chainError, 
  isKairoError, 
  getErrorChain, 
  serializeError, 
  findErrorByCode, 
  hasErrorCode,
  createServiceError,
  createServiceHttpError,
  createDataError,
  createDataValidationError,
  createPipelineError,
  createPipelineCompositionError
} from './errors'
export type { 
  KairoError, 
  ErrorWithCause,
  ServiceError,
  ServiceHttpError,
  ServiceNetworkError,
  DataError,
  DataValidationError,
  DataTransformError,
  DataAggregateError,
  PipelineError,
  PipelineCompositionError,
  PipelineValidationError,
  V2Error
} from './errors'

// Configuration Types and Utilities
export type {
  BaseOptions,
  ValidationOptions,
  CacheOptions,
  RetryOptions,
  TransformOptions
} from './config'