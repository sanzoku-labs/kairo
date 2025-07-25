/**
 * DATA Pillar - Data Operations + Aggregation
 *
 * The DATA pillar provides essential data operations:
 * - 10 core methods for data validation, transformation, and aggregation
 * - 6 public utilities for safe data access and manipulation
 * - Configuration object pattern (no method chaining)
 * - Built from scratch with strategic V1 component reuse
 */

// Core Data Methods (10 methods)
import {
  schema,
  validate,
  transform,
  convert,
  aggregate,
  groupBy,
  serialize,
  deserialize,
  clone,
  merge,
} from './methods'

export {
  schema,
  validate,
  transform,
  convert,
  aggregate,
  groupBy,
  serialize,
  deserialize,
  clone,
  merge,
}

// Public Utilities (6 utilities)
import {
  get,
  set,
  has,
  inferType,
  isValid,
  unique,
  flatten,
  deepClone,
  pickData as pick,
  omitData as omit,
  isPlainObject,
  isEmpty,
  stringify,
  isDataError,
} from './utils'

export {
  get,
  set,
  has,
  inferType,
  isValid,
  unique,
  flatten,
  deepClone,
  pick,
  omit,
  isPlainObject,
  isEmpty,
  stringify,
  isDataError,
}

// Types and Interfaces
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
  SchemaFieldDefinition,
  TransformMapping,
  TransformFunction,
  TransformContext,
  MigrationFunction,
  AggregateOperations,
  AggregateResult,
  SerializationFormat,
  PropertyPath,
  UniqueKeyFunction,
  GroupByKeyFunction,
} from './types'

// Error Types
export type { DataError, DataValidationError, DataTransformError } from '../shared'

/**
 * DATA Pillar API
 *
 * All DATA methods follow the same pattern:
 * data.method(input, config, options?) -> Result<DataError, T>
 *
 * @example
 * ```typescript
 * // Schema creation and validation
 * const UserSchema = data.schema({
 *   id: { type: 'string', format: 'uuid' },
 *   name: { type: 'string', min: 2, max: 100 },
 *   email: { type: 'string', format: 'email' },
 *   age: { type: 'number', min: 0, max: 150 }
 * })
 *
 * const result = data.validate(userData, UserSchema)
 *
 * // Data transformation
 * const normalized = data.transform(apiResponse, {
 *   id: 'user_id',
 *   name: 'full_name',
 *   email: 'email_address',
 *   createdAt: (input) => new Date(input.created_timestamp)
 * })
 *
 * // Data aggregation
 * const salesStats = data.aggregate(salesData, {
 *   groupBy: ['region', 'quarter'],
 *   sum: ['revenue', 'units'],
 *   avg: ['orderValue', 'discount'],
 *   count: '*'
 * })
 *
 * // Safe property access
 * const email = data.get(userData, 'contact.email')
 * const updated = data.set(userData, 'lastLogin', new Date())
 *
 * // Error handling
 * if (Result.isErr(result)) {
 *   if (data.isError(result.error)) {
 *     // Handle error appropriately
 *   }
 * }
 * ```
 */
export const data = {
  // Core methods
  schema,
  validate,
  transform,
  convert,
  aggregate,
  groupBy,
  serialize,
  deserialize,
  clone,
  merge,

  // Public utilities
  get,
  set,
  has,
  inferType,
  isValid,
  unique,
  flatten,
  deepClone,
  pick,
  omit,
  isPlainObject,
  isEmpty,
  stringify,
  isError: isDataError,
} as const

// Default export for convenient usage
export default data
