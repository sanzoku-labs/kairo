/**
 * DATA Pillar Types
 * 
 * Type definitions for the DATA pillar following V2 specifications.
 * Implements data operations with schema validation, transformation, and aggregation.
 */

import { Result, Schema } from '../shared'
import { DataError } from '../shared'
import { BaseOptions, ValidationOptions, TransformOptions, CacheOptions } from '../shared'

/**
 * Base options for all DATA methods
 */
export interface DataBaseOptions extends BaseOptions {
  // Performance options
  cache?: boolean | CacheOptions
  parallel?: boolean
  
  // Error handling
  skipErrors?: boolean
  collectErrors?: boolean
  
  // Context for operations
  context?: Record<string, unknown>
}

/**
 * Schema creation options
 */
export interface SchemaOptions extends DataBaseOptions {
  strict?: boolean
  timestamps?: boolean
  coerce?: boolean
  description?: string
}

/**
 * Validation options
 */
export interface DataValidationOptions extends DataBaseOptions, ValidationOptions {
  coerce?: boolean
  stripUnknown?: boolean
  context?: Record<string, unknown>
}

/**
 * Transform options
 */
export interface DataTransformOptions extends DataBaseOptions, TransformOptions {
  strict?: boolean
  defaults?: boolean
  computed?: boolean
  timezone?: string
}

/**
 * Convert options for schema migration
 */
export interface ConvertOptions extends DataBaseOptions {
  strict?: boolean
  fillDefaults?: boolean
  migration?: MigrationFunction
}

/**
 * Aggregate options
 */
export interface AggregateOptions extends DataBaseOptions {
  parallel?: boolean
  cache?: boolean
}

/**
 * GroupBy options
 */
export interface GroupByOptions extends DataBaseOptions {
  preserveOrder?: boolean
  includeEmpty?: boolean
}

/**
 * Serialization options
 */
export interface SerializeOptions extends DataBaseOptions {
  pretty?: boolean
  dateFormat?: 'iso' | 'timestamp' | 'unix'
  excludePrivate?: boolean
  headers?: boolean
  delimiter?: string
  encoding?: 'utf8' | 'utf16' | 'base64'
  schema?: Schema<unknown>
}

/**
 * Deserialization options
 */
export interface DeserializeOptions extends DataBaseOptions {
  strict?: boolean
  coerce?: boolean
  headers?: boolean
  skipErrors?: boolean
  encoding?: 'utf8' | 'utf16' | 'base64'
  delimiter?: string
}

/**
 * Clone options
 */
export interface CloneOptions extends DataBaseOptions {
  deep?: boolean
  preservePrototype?: boolean
  handleCircular?: boolean
}

/**
 * Merge options
 */
export interface MergeOptions extends DataBaseOptions {
  deep?: boolean
  strategy?: 'target-wins' | 'source-wins' | 'merge'
  arrays?: 'replace' | 'concat' | 'merge'
  conflictResolver?: (target: unknown, source: unknown, key: string) => unknown
}

/**
 * DATA method result types
 */
export type DataResult<T> = Result<DataError, T>

/**
 * Data types for schema inference
 */
export type DataType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'null' | 'undefined'

/**
 * Schema definition types
 */
export interface SchemaFieldDefinition {
  type: DataType
  required?: boolean
  nullable?: boolean
  format?: string
  min?: number
  max?: number
  pattern?: RegExp
  enum?: unknown[]
  items?: SchemaFieldDefinition | Schema<unknown>
  schema?: Schema<unknown>
  computed?: boolean
  default?: unknown
}

export type SchemaDefinition<T> = {
  [K in keyof T]: SchemaFieldDefinition | DataType
}

/**
 * Transform mapping types
 */
export type TransformFunction<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context?: TransformContext
) => TOutput

export type TransformMapping<TInput, TOutput> = {
  [K in keyof TOutput]: 
    | keyof TInput 
    | TransformFunction<TInput, TOutput[K]>
    | {
        source?: keyof TInput
        fn: TransformFunction<TInput[keyof TInput], TOutput[K]>
        default?: TOutput[K]
      }
}

export interface TransformContext {
  timezone?: string
  userId?: string
  timestamp?: Date
  [key: string]: unknown
}

/**
 * Migration function type
 */
export type MigrationFunction<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context?: TransformContext
) => TOutput

/**
 * Aggregation types
 */
export interface AggregateOperations {
  groupBy?: string | string[]
  sum?: string | string[]
  avg?: string | string[]
  count?: string | '*'
  min?: string | string[]
  max?: string | string[]
  custom?: Record<string, (group: unknown[]) => unknown>
}

export interface AggregateResult {
  groups: Record<string, unknown[]>
  totals: Record<string, number>
  averages: Record<string, number>
  counts: Record<string, number>
  minimums: Record<string, unknown>
  maximums: Record<string, unknown>
  custom: Record<string, unknown>
}

/**
 * Serialization format types
 */
export type SerializationFormat = 'json' | 'csv' | 'xml' | 'yaml' | 'protobuf' | 'msgpack'

/**
 * Internal utility types
 */
export interface NormalizedSchema<T> {
  fields: Record<string, SchemaFieldDefinition>
  strict: boolean
  metadata: {
    name?: string
    version?: string
    description?: string
    timestamps?: boolean
  }
}

export type ValidatorFunction<T> = (value: unknown) => Result<DataError, T>

export interface GroupByKeyFunction<T> {
  (item: T): string
}

export interface SerializerFunction {
  (data: unknown, options?: SerializeOptions): Result<DataError, string | Buffer>
}

export interface DeserializerFunction<T> {
  (input: string | Buffer, schema: Schema<T>, options?: DeserializeOptions): Result<DataError, T>
}

/**
 * Collection utility types
 */
export interface UniqueKeyFunction<T> {
  (item: T): unknown
}

export interface FlattenOptions {
  depth?: number
}

/**
 * Property access types
 */
export type PropertyPath = string | string[] | number | (string | number)[]

export interface PropertyDescriptor {
  path: PropertyPath
  value: unknown
  exists: boolean
}

/**
 * Diff result types
 */
export interface DiffResult {
  added: PropertyDescriptor[]
  removed: PropertyDescriptor[]
  changed: Array<{
    path: PropertyPath
    oldValue: unknown
    newValue: unknown
  }>
}

export interface DiffOptions extends DataBaseOptions {
  deep?: boolean
  includeArrayIndices?: boolean
  ignoreOrder?: boolean
  customCompare?: (a: unknown, b: unknown, path: PropertyPath) => boolean | undefined
}