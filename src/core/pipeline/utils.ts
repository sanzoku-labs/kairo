/**
 * PIPELINE Pillar Utilities
 *
 * Public utility functions for PIPELINE pillar.
 * These utilities can be used within PIPELINE methods and by users for functional programming.
 */

import { Result, createPipelineError } from '../shared'
import type { PipelineError } from '../shared'
import type { PipelineResult, CurriedFunction, PipelineContext } from './types'
// Utility functions use explicit return types rather than imported interface types

/**
 * Create curried versions of functions for composition
 *
 * @param fn - Function to curry
 * @returns Curried function
 */
export const curry = <TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn
): CurriedFunction<TArgs, TReturn> => {
  return function curried(...args: unknown[]): unknown {
    if (args.length >= fn.length) {
      return fn(...(args as TArgs))
    } else {
      return function (...nextArgs: unknown[]) {
        return curried(...args, ...nextArgs)
      }
    }
  } as CurriedFunction<TArgs, TReturn>
}

/**
 * Create partially applied functions
 *
 * @param fn - Function to partially apply
 * @param partialArgs - Arguments to pre-fill
 * @returns Partially applied function
 */
export const partial = <TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  ...partialArgs: unknown[]
): ((...remainingArgs: unknown[]) => TReturn) => {
  return (...remainingArgs: unknown[]) => {
    return fn(...(partialArgs.concat(remainingArgs) as TArgs))
  }
}

/**
 * Conditional execution function
 *
 * @param condition - Condition to check
 * @param thenFn - Function to execute if condition is true
 * @param elseFn - Function to execute if condition is false
 * @returns Conditional function
 */
export const when = <T>(
  condition: (data: T) => boolean,
  thenFn: (data: T) => T,
  elseFn?: (data: T) => T
): ((data: T) => T) => {
  return (data: T) => {
    if (condition(data)) {
      return thenFn(data)
    } else if (elseFn) {
      return elseFn(data)
    } else {
      return data
    }
  }
}

/**
 * Execute function unless condition is true
 *
 * @param condition - Condition to check
 * @param fn - Function to execute if condition is false
 * @returns Guard function
 */
export const unless = <T>(
  condition: (data: T) => boolean,
  fn: (data: T) => T
): ((data: T) => T) => {
  return (data: T) => {
    if (!condition(data)) {
      return fn(data)
    } else {
      return data
    }
  }
}

/**
 * Execute async operations in sequence
 *
 * @param operations - Array of async operations
 * @returns Composed sequential function
 */
export const sequence = <T>(
  operations: Array<(data: T) => Promise<T>>
): ((data: T) => Promise<T>) => {
  return async (data: T) => {
    let result = data

    for (const operation of operations) {
      result = await operation(result)
    }

    return result
  }
}

/**
 * Wrap functions to catch errors and return Results
 *
 * @param fn - Function to wrap
 * @param handler - Optional error handler
 * @returns Safe function that returns Result
 */
export const trap = <T, E = Error>(
  fn: (data: T) => T,
  handler?: (error: E, data: T) => T
): ((data: T) => PipelineResult<T>) => {
  return (data: T) => {
    try {
      const result = fn(data)
      return Result.Ok(result)
    } catch (error) {
      if (handler) {
        try {
          const recovered = handler(error as E, data)
          return Result.Ok(recovered)
        } catch (handlerError) {
          return Result.Err(
            createPipelineError('trap', `Error handler failed: ${String(handlerError)}`, {
              originalError: error,
              handlerError,
              data,
            })
          )
        }
      }

      return Result.Err(
        createPipelineError('trap', `Function execution failed: ${String(error)}`, { error, data })
      )
    }
  }
}

/**
 * Execute function with retry logic
 *
 * @param fn - Function to execute
 * @param options - Retry options
 * @returns Promise with retry logic
 */
export const retry = async <T>(
  fn: () => T | Promise<T>,
  options: {
    maxAttempts?: number
    delay?: number
    backoff?: 'linear' | 'exponential'
    retryOn?: string[]
  } = {}
): Promise<PipelineResult<T>> => {
  const opts = {
    maxAttempts: 3,
    delay: 1000,
    backoff: 'linear' as const,
    retryOn: [],
    ...options,
  }

  let lastError: unknown

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      const result = await fn()
      return Result.Ok(result)
    } catch (error) {
      lastError = error

      // Check if we should retry for this specific error
      if (opts.retryOn.length > 0) {
        const shouldRetry = opts.retryOn.some(retryType => {
          if (error instanceof Error) {
            return error.message.includes(retryType) || error.name.includes(retryType)
          }
          return false
        })
        if (!shouldRetry) {
          break
        }
      }

      // Don't delay on the last attempt
      if (attempt < opts.maxAttempts - 1) {
        let delayTime = opts.delay

        if (opts.backoff === 'exponential') {
          delayTime = opts.delay * Math.pow(2, attempt)
        } else {
          delayTime = opts.delay * (attempt + 1)
        }

        await new Promise(resolve => setTimeout(resolve, delayTime))
      }
    }
  }

  return Result.Err(
    createPipelineError(
      'retry',
      `Max retry attempts (${opts.maxAttempts}) exceeded: ${String(lastError)}`,
      {
        error: lastError,
        attempts: opts.maxAttempts,
      }
    )
  )
}

/**
 * Add delay to function execution
 *
 * @param fn - Function to delay
 * @param delayMs - Delay in milliseconds
 * @returns Delayed function
 */
export const delay = <T>(
  fn: (data: T) => T | Promise<T>,
  delayMs: number
): ((data: T) => Promise<T>) => {
  return async (data: T) => {
    await new Promise(resolve => setTimeout(resolve, delayMs))
    return await fn(data)
  }
}

/**
 * Execute function with timeout
 *
 * @param fn - Function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @returns Function with timeout
 */
export const timeout = <T>(
  fn: (data: T) => T | Promise<T>,
  timeoutMs: number
): ((data: T) => Promise<PipelineResult<T>>) => {
  return async (data: T) => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    })

    try {
      const result = await Promise.race([Promise.resolve(fn(data)), timeoutPromise])
      return Result.Ok(result)
    } catch (error) {
      return Result.Err(
        createPipelineError('timeout', `Operation timed out: ${String(error)}`, {
          error,
          data,
          timeout: timeoutMs,
        })
      )
    }
  }
}

/**
 * Tap into pipeline for side effects without modifying data
 *
 * @param fn - Side effect function
 * @returns Tap function that returns original data
 */
export const tap = <T>(fn: (data: T) => void | Promise<void>): ((data: T) => Promise<T>) => {
  return async (data: T) => {
    await fn(data)
    return data
  }
}

/**
 * Memoize function results
 *
 * @param fn - Function to memoize
 * @param keyFn - Function to generate cache key
 * @returns Memoized function
 */
export const memoize = <T, R>(
  fn: (data: T) => R,
  keyFn?: (data: T) => string
): ((data: T) => R) => {
  const cache = new Map<string, R>()

  return (data: T) => {
    const key = keyFn ? keyFn(data) : JSON.stringify(data)

    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = fn(data)
    cache.set(key, result)
    return result
  }
}

/**
 * Debounce function execution
 *
 * @param fn - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export const debounce = <T>(
  fn: (data: T) => void | Promise<void>,
  wait: number
): ((data: T) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (data: T) => {
    if (timeoutId) {
      globalThis.clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      void fn(data)
    }, wait)
  }
}

/**
 * Throttle function execution
 *
 * @param fn - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export const throttle = <T>(
  fn: (data: T) => void | Promise<void>,
  limit: number
): ((data: T) => void) => {
  let inThrottle = false

  return (data: T) => {
    if (!inThrottle) {
      void fn(data)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Create a guard function that validates input
 *
 * @param predicate - Validation predicate
 * @param errorMessage - Error message if validation fails
 * @returns Guard function
 */
export const guard = <T>(
  predicate: (data: T) => boolean,
  errorMessage = 'Guard condition failed'
): ((data: T) => PipelineResult<T>) => {
  return (data: T) => {
    if (predicate(data)) {
      return Result.Ok(data)
    } else {
      return Result.Err(createPipelineError('guard', errorMessage, { data }))
    }
  }
}

/**
 * Create execution context for pipeline operations
 *
 * @param operationName - Name of the operation
 * @param metadata - Additional metadata
 * @returns Pipeline context
 */
export const createContext = (
  operationName: string,
  metadata?: Record<string, unknown>
): PipelineContext => {
  return {
    operationId: `${operationName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    metadata: metadata || {},
    trace: [],
  }
}

/**
 * Add trace information to context
 *
 * @param context - Pipeline context
 * @param operation - Operation name
 * @param data - Optional data to include
 * @returns Updated context
 */
export const addTrace = (context: PipelineContext, operation: string): PipelineContext => {
  const trace = `${operation}@${Date.now() - context.startTime}ms`

  return {
    ...context,
    trace: [...(context.trace || []), trace],
  }
}

/**
 * Check if a value is a pipeline error
 *
 * @param error - Error to check
 * @returns True if error is a PipelineError
 */
export const isPipelineError = (error: unknown): error is PipelineError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'pillar' in error &&
    (error as { pillar: unknown }).pillar === 'PIPELINE'
  )
}

/**
 * Extract results from an array of Results, filtering out errors
 *
 * @param results - Array of Results
 * @returns Array of successful values
 */
export const extractSuccessful = <T>(results: PipelineResult<T>[]): T[] => {
  return results.filter(result => Result.isOk(result)).map(result => (result as { value: T }).value)
}

/**
 * Extract errors from an array of Results
 *
 * @param results - Array of Results
 * @returns Array of errors
 */
export const extractErrors = <T>(results: PipelineResult<T>[]): PipelineError[] => {
  return results
    .filter(result => Result.isErr(result))
    .map(result => (result as { error: PipelineError }).error)
}

/**
 * Combine multiple Results into a single Result
 *
 * @param results - Array of Results
 * @returns Combined Result
 */
export const combineResults = <T>(results: PipelineResult<T>[]): PipelineResult<T[]> => {
  const errors = extractErrors(results)

  if (errors.length > 0) {
    return Result.Err(
      createPipelineError('combineResults', `${errors.length} operation(s) failed`, {
        errors,
        totalResults: results.length,
      })
    )
  }

  const values = extractSuccessful(results)
  return Result.Ok(values)
}

/**
 * Check if all Results are successful
 *
 * @param results - Array of Results
 * @returns True if all Results are Ok
 */
export const allSuccessful = <T>(results: PipelineResult<T>[]): boolean => {
  return results.every(result => Result.isOk(result))
}

/**
 * Check if any Results are successful
 *
 * @param results - Array of Results
 * @returns True if any Result is Ok
 */
export const anySuccessful = <T>(results: PipelineResult<T>[]): boolean => {
  return results.some(result => Result.isOk(result))
}

/**
 * Convert a regular function to return a Result
 *
 * @param fn - Function to convert
 * @returns Function that returns Result
 */
export const toResult = <TInput, TOutput>(
  fn: (data: TInput) => TOutput
): ((data: TInput) => PipelineResult<TOutput>) => {
  return (data: TInput) => {
    try {
      const result = fn(data)
      return Result.Ok(result)
    } catch (error) {
      return Result.Err(
        createPipelineError('toResult', `Function execution failed: ${String(error)}`, {
          error,
          data,
        })
      )
    }
  }
}

/**
 * Convert an async function to return a Result
 *
 * @param fn - Async function to convert
 * @returns Async function that returns Result
 */
export const toAsyncResult = <TInput, TOutput>(
  fn: (data: TInput) => Promise<TOutput>
): ((data: TInput) => Promise<PipelineResult<TOutput>>) => {
  return async (data: TInput) => {
    try {
      const result = await fn(data)
      return Result.Ok(result)
    } catch (error) {
      return Result.Err(
        createPipelineError('toAsyncResult', `Async function execution failed: ${String(error)}`, {
          error,
          data,
        })
      )
    }
  }
}
