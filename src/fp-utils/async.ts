import { Result } from '../core/shared'

/**
 * Composes async functions in a pipeline, passing the result of each to the next.
 */
export const asyncPipe =
  <T>(...fns: Array<(input: T) => Promise<T>>) =>
  async (input: T): Promise<T> => {
    let result = input
    for (const fn of fns) {
      result = await fn(result)
    }
    return result
  }

/**
 * Maps over an array with an async function, executing all in parallel.
 */
export const asyncMap =
  <T, U>(fn: (item: T) => Promise<U>) =>
  async (items: T[]): Promise<U[]> =>
    Promise.all(items.map(fn))

/**
 * Maps over an array with an async function, executing sequentially.
 */
export const asyncMapSeq =
  <T, U>(fn: (item: T) => Promise<U>) =>
  async (items: T[]): Promise<U[]> => {
    const results: U[] = []
    for (const item of items) {
      results.push(await fn(item))
    }
    return results
  }

/**
 * Filters an array with an async predicate function.
 */
export const asyncFilter =
  <T>(predicate: (item: T) => Promise<boolean>) =>
  async (items: T[]): Promise<T[]> => {
    const results = await Promise.all(
      items.map(async item => ({
        item,
        passes: await predicate(item),
      }))
    )
    return results.filter(({ passes }) => passes).map(({ item }) => item)
  }

/**
 * Applies an async function to each item in an array, executing in parallel.
 * Returns the original array (useful for side effects).
 */
export const asyncForEach =
  <T>(fn: (item: T) => Promise<void>) =>
  async (items: T[]): Promise<T[]> => {
    await Promise.all(items.map(fn))
    return items
  }

/**
 * Wraps a Promise in a Result, catching any errors.
 */
export const asyncToResult = async <T>(promise: Promise<T>): Promise<Result<Error, T>> => {
  try {
    const value = await promise
    return Result.Ok(value)
  } catch (error) {
    return Result.Err(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Sequences async Results, waiting for all to complete.
 */
export const asyncSequence = async <E, T>(
  asyncResults: Promise<Result<E, T>>[]
): Promise<Result<E, T[]>> => {
  const results = await Promise.all(asyncResults)
  const values: T[] = []

  for (const result of results) {
    if (Result.isErr(result)) return result
    values.push(result.value)
  }

  return Result.Ok(values)
}

/**
 * Applies an async function that returns a Result to each item, then sequences.
 */
export const asyncTraverse =
  <T, E, U>(fn: (item: T) => Promise<Result<E, U>>) =>
  async (items: T[]): Promise<Result<E, U[]>> => {
    const asyncResults = items.map(fn)
    return asyncSequence(asyncResults)
  }

/**
 * Retries an async operation with exponential backoff.
 */
export const retryAsync = <T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number
    initialDelay?: number
    backoffFactor?: number
    maxDelay?: number
  }
): Promise<T> => {
  const { maxRetries, initialDelay = 100, backoffFactor = 2, maxDelay = 10000 } = options

  const attempt = async (retryCount: number): Promise<T> => {
    try {
      return await fn()
    } catch (error) {
      if (retryCount >= maxRetries) {
        throw error
      }

      const delay = Math.min(initialDelay * Math.pow(backoffFactor, retryCount), maxDelay)
      await new Promise(resolve => setTimeout(resolve, delay))
      return attempt(retryCount + 1)
    }
  }

  return attempt(0)
}

/**
 * Creates a timeout for a Promise.
 */
export const withTimeout =
  <T>(timeoutMs: number, timeoutError?: Error) =>
  (promise: Promise<T>): Promise<T> => {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    return Promise.race([promise, timeout])
  }
