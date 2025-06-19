/**
 * PIPELINE Pillar Types
 *
 * Type definitions for the PIPELINE pillar.
 * Implements logic composition with functional programming patterns.
 */

import type { Result } from '../shared'
import type { PipelineError } from '../shared'
import type { BaseOptions, CacheOptions, RetryOptions } from '../shared/config'

/**
 * Base options for all PIPELINE methods
 */
export interface PipelineBaseOptions extends BaseOptions {
  // Execution options
  async?: boolean
  parallel?: boolean
  batchSize?: number
  maxConcurrency?: number

  // Error handling
  stopOnError?: boolean
  onError?: (error: unknown, data: unknown) => void

  // Performance options
  cache?: boolean | CacheOptions
  retry?: boolean | RetryOptions

  // Debugging
  debug?: boolean
}

/**
 * Map operation options
 */
export interface MapOptions extends PipelineBaseOptions {
  // Execution strategy
  async?: boolean
  parallel?: boolean
  batchSize?: number

  // Error handling
  keepErrors?: boolean
  continueOnError?: boolean
  errorValue?: unknown
  fallback?: (error: unknown, item: unknown, index: number) => unknown
}

/**
 * Filter operation options
 */
export interface FilterOptions extends BaseOptions {
  // Execution strategy
  async?: boolean

  // Error handling
  keepErrors?: boolean
  continueOnError?: boolean
  onError?: (error: unknown, item: unknown, index: number) => void
}

/**
 * Reduce operation options
 */
export interface ReduceOptions extends PipelineBaseOptions {
  // Execution strategy
  async?: boolean
  parallel?: boolean // Generally false for reduce, but can be true for some cases

  // Checkpointing
  checkpoints?: boolean
  checkpointInterval?: number
}

/**
 * Compose operation options
 */
export interface ComposeOptions extends PipelineBaseOptions {
  // Error handling
  stopOnError?: boolean
  rollback?: boolean

  // Optimization
  optimize?: boolean
  memoize?: boolean
}

/**
 * Chain operation options
 */
export interface ChainOptions extends PipelineBaseOptions {
  // Error handling
  stopOnError?: boolean

  // Execution tracking
  collectResults?: boolean
}

/**
 * Branch operation options
 */
export interface BranchOptions extends PipelineBaseOptions {
  // Fallback handling
  fallback?: PipelineOperation<unknown, unknown>

  // Caching
  cache?: boolean
  cacheConditions?: boolean
}

/**
 * Parallel operation options
 */
export interface ParallelOptions extends PipelineBaseOptions {
  // Execution control
  maxConcurrency?: number
  failFast?: boolean

  // Error handling
  collectErrors?: boolean

  // Result combination
  combiner?: (input: unknown, results: unknown[]) => unknown
  preserveOrder?: boolean
}

/**
 * Validation options
 */
export interface ValidateOptions extends PipelineBaseOptions {
  // Validation behavior
  stopOnFirst?: boolean
  collectErrors?: boolean

  // Schema options
  strict?: boolean
  coerce?: boolean
}

/**
 * PIPELINE method result types
 */
export type PipelineResult<T> = Result<PipelineError, T>

/**
 * Pipeline operation function type
 */
export type PipelineOperation<TInput, TOutput = TInput> =
  | ((data: TInput) => TOutput)
  | ((data: TInput) => Promise<TOutput>)
  | ((data: TInput) => PipelineResult<TOutput>)
  | ((data: TInput) => Promise<PipelineResult<TOutput>>)

/**
 * Transform function for map operations
 */
export type TransformFunction<TInput, TOutput> = (
  item: TInput,
  index: number,
  array: TInput[]
) => TOutput | Promise<TOutput>

/**
 * Predicate function for filter operations
 */
export type PredicateFunction<T> = (
  item: T,
  index: number,
  array: T[]
) => boolean | Promise<boolean>

/**
 * Reducer function for reduce operations
 */
export type ReducerFunction<TInput, TOutput> = (
  accumulator: TOutput,
  item: TInput,
  index: number,
  array: TInput[]
) => TOutput | Promise<TOutput>

/**
 * Condition function for branch operations
 */
export type BranchCondition<T> = (data: T) => boolean | string | Promise<boolean | string>

/**
 * Branch map for conditional execution
 */
export type BranchMap<TInput, TOutput = TInput> = Record<string, PipelineOperation<TInput, TOutput>>

/**
 * Chain operation type
 */
export type ChainOperation<TInput, TOutput = TInput> = PipelineOperation<TInput, TOutput>

/**
 * Parallel operation type
 */
export type ParallelOperation<TInput, TOutput = unknown> = (
  data: TInput
) => TOutput | Promise<TOutput>

/**
 * Validation rule type
 */
export interface ValidationRule<T> {
  name: string
  validate: (data: T) => boolean | Promise<boolean>
  message?: string | ((data: T) => string)
}

/**
 * Curried function type
 */
export type CurriedFunction<TArgs extends unknown[], TReturn> = TArgs extends [
  infer Head,
  ...infer Tail,
]
  ? (arg: Head) => Tail extends [] ? TReturn : CurriedFunction<Tail, TReturn>
  : () => TReturn

/**
 * Partial application type
 */
export type PartialApplication<TArgs extends unknown[], TReturn> = (
  ...args: Partial<TArgs>
) => (...remainingArgs: unknown[]) => TReturn

/**
 * Conditional function type
 */
export type ConditionalFunction<T> = (
  condition: (data: T) => boolean,
  thenFn: (data: T) => T,
  elseFn?: (data: T) => T
) => (data: T) => T

/**
 * Sequence operation type
 */
export type SequenceOperation<T> = (data: T) => Promise<T>

/**
 * Trap function type for error handling
 */
export type TrapFunction<T, E = Error> = (
  fn: (data: T) => T,
  handler?: (error: E, data: T) => T
) => (data: T) => PipelineResult<T>

/**
 * Internal execution options
 */
export interface ExecutionOptions extends PipelineBaseOptions {
  timeout?: number
  signal?: AbortSignal
  context?: Record<string, unknown>
}

/**
 * Batch processing options
 */
export interface BatchOptions extends PipelineBaseOptions {
  batchSize: number
  parallel?: boolean
  maxConcurrency?: number
  delay?: number
}

/**
 * Async handling options
 */
export interface AsyncOptions extends PipelineBaseOptions {
  timeout?: number
  signal?: AbortSignal
  maxRetries?: number
}

/**
 * Optimization options
 */
export interface OptimizationOptions {
  memoize?: boolean
  deduplicate?: boolean
  optimize?: boolean
  profile?: boolean
}

/**
 * Execution context for pipeline operations
 */
export interface PipelineContext {
  operationId: string
  startTime: number
  metadata?: Record<string, unknown>
  trace?: string[]
}

/**
 * Pipeline execution result with metadata
 */
export interface PipelineExecutionResult<T> {
  value: T
  context: PipelineContext
  duration: number
  operations: number
}

/**
 * Composed pipeline function type
 */
export type ComposedPipeline<TInput, TOutput> = (
  data: TInput
) => PipelineResult<TOutput> | Promise<PipelineResult<TOutput>>

/**
 * Validator function type
 */
export type ValidatorFunction<T> = (data: T) => PipelineResult<T>

/**
 * Error handler function type
 */
export type ErrorHandler<T> = (error: unknown, data: T, context?: PipelineContext) => T | never

/**
 * Fallback function type
 */
export type FallbackFunction<T> = (error: unknown, data: T) => T

/**
 * Progress callback type
 */
export type ProgressCallback = (completed: number, total: number, context?: PipelineContext) => void

/**
 * Checkpoint data type
 */
export interface CheckpointData<T> {
  step: number
  data: T
  timestamp: number
  context: PipelineContext
}

/**
 * Pipeline metrics type
 */
export interface PipelineMetrics {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  totalDuration: number
  averageDuration: number
  throughput: number
}

/**
 * Optimization hint type
 */
export type OptimizationHint =
  | 'cpu-intensive'
  | 'io-intensive'
  | 'memory-intensive'
  | 'network-bound'
  | 'fast'
  | 'slow'

/**
 * Pipeline configuration type
 */
export interface PipelineConfig {
  name?: string
  description?: string
  version?: string
  optimizationHints?: OptimizationHint[]
  maxDuration?: number
  maxMemory?: number
}

/**
 * Internal pipeline state
 */
export interface PipelineState<T> {
  data: T
  context: PipelineContext
  checkpoints?: CheckpointData<T>[]
  metrics?: PipelineMetrics
}
