/**
 * PIPELINE Pillar - Logic Composition
 *
 * The PIPELINE pillar provides essential logic composition following V2 specifications:
 * - 8 core methods for functional data processing and flow control
 * - 5 public utilities for function composition and async operations
 * - Configuration object pattern (no method chaining)
 * - Built from scratch with strategic V1 component reuse
 */

// Core Pipeline Methods (8 methods)
import { map, filter, reduce, compose, chain, branch, parallel, validate } from './methods'
export { map, filter, reduce, compose, chain, branch, parallel, validate }

// Public Utilities (5+ utilities)
import {
  curry,
  partial,
  when,
  unless,
  sequence,
  trap,
  retry,
  delay,
  timeout,
  tap,
  memoize,
  debounce,
  throttle,
  guard,
  createContext,
  addTrace,
  isPipelineError,
  extractSuccessful,
  extractErrors,
  combineResults,
  allSuccessful,
  anySuccessful,
  toResult,
  toAsyncResult,
} from './utils'
export {
  curry,
  partial,
  when,
  unless,
  sequence,
  trap,
  retry,
  delay,
  timeout,
  tap,
  memoize,
  debounce,
  throttle,
  guard,
  createContext,
  addTrace,
  isPipelineError,
  extractSuccessful,
  extractErrors,
  combineResults,
  allSuccessful,
  anySuccessful,
  toResult,
  toAsyncResult,
}

// Types and Interfaces
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
  BranchCondition,
  BranchMap,
  ChainOperation,
  ParallelOperation,
  ValidationRule,
  CurriedFunction,
  PartialApplication,
  ConditionalFunction,
  SequenceOperation,
  TrapFunction,
  PipelineContext,
  ComposedPipeline,
} from './types'

// Error Types
export type { PipelineError, PipelineValidationError, PipelineCompositionError } from '../shared'

/**
 * PIPELINE Pillar API
 *
 * All PIPELINE methods follow the same pattern:
 * pipeline.method(data, operation, options?) -> Result<PipelineError, T>
 *
 * @example
 * ```typescript
 * // Data transformation
 * const doubled = await pipeline.map([1, 2, 3], x => x * 2)
 * const adults = await pipeline.filter(users, user => user.age >= 18)
 * const total = await pipeline.reduce(orders, (sum, order) => sum + order.total, 0)
 *
 * // Function composition
 * const processUser = pipeline.compose([
 *   user => pipeline.validate(user, UserSchema),
 *   user => data.transform(user, normalizeUser),
 *   user => enrichWithBusinessData(user)
 * ])
 *
 * // Conditional execution
 * const result = await pipeline.branch(user,
 *   user => user.type,
 *   {
 *     'admin': processAdmin,
 *     'user': processUser,
 *     'guest': processGuest
 *   }
 * )
 *
 * // Parallel processing
 * const enriched = await pipeline.parallel(user, [
 *   user => service.get(`/profile/${user.id}`),
 *   user => service.get(`/preferences/${user.id}`),
 *   user => service.get(`/activity/${user.id}`)
 * ], {
 *   combiner: (user, [profile, prefs, activity]) => ({
 *     ...user, profile, preferences: prefs, recentActivity: activity
 *   })
 * })
 *
 * // Functional utilities
 * const multiply = pipeline.curry((factor: number, value: number) => value * factor)
 * const double = multiply(2)
 *
 * const safeProcess = pipeline.trap(riskyOperation, (error, data) => defaultValue)
 *
 * // Error handling
 * if (Result.isErr(result)) {
 *   if (pipeline.isError(result.error)) {
 *     console.error('Pipeline operation failed:', result.error.message)
 *   }
 * }
 * ```
 */
export const pipeline = {
  // Core methods
  map,
  filter,
  reduce,
  compose,
  chain,
  branch,
  parallel,
  validate,

  // Public utilities
  curry,
  partial,
  when,
  unless,
  sequence,
  trap,
  retry,
  delay,
  timeout,
  tap,
  memoize,
  debounce,
  throttle,
  guard,
  createContext,
  addTrace,
  isError: isPipelineError,
  extractSuccessful,
  extractErrors,
  combineResults,
  allSuccessful,
  anySuccessful,
  toResult,
  toAsyncResult,
} as const

// Default export for convenient usage
export default pipeline
