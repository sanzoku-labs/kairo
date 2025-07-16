import type { UnaryFunction } from './types'

/**
 * Value or function that takes an input and returns a value
 */
export type Resolvable<T, R> = R | UnaryFunction<T, R>

/**
 * Resolve a value or function with the given input
 */
export const resolve =
  <T, R>(valueOrFn: Resolvable<T, R>) =>
  (input: T): R =>
    typeof valueOrFn === 'function' ? (valueOrFn as UnaryFunction<T, R>)(input) : valueOrFn

/**
 * Resolve all properties of an object that may contain values or functions
 */
export const resolveAll =
  <T, R extends Record<string, unknown>>(config: { [K in keyof R]: Resolvable<T, R[K]> }) =>
  (input: T): R => {
    const result = {} as R
    for (const [key, valueOrFn] of Object.entries(config)) {
      result[key as keyof R] = resolve(valueOrFn as Resolvable<T, R[keyof R]>)(input)
    }
    return result
  }

/**
 * Create a function that resolves multiple values at once
 */
export const resolveWith =
  <T>() =>
  <R extends Record<string, unknown>>(config: { [K in keyof R]: Resolvable<T, R[K]> }): UnaryFunction<T, R> =>
    resolveAll(config)

/**
 * Conditional resolver - resolve different values based on predicate
 */
export const resolveIf =
  <T, R>(
    predicate: (input: T) => boolean,
    truthyValue: Resolvable<T, R>,
    falsyValue: Resolvable<T, R>
  ) =>
  (input: T): R => {
    const resolver = predicate(input) ? truthyValue : falsyValue
    return resolve(resolver)(input)
  }

/**
 * Memoize a resolver function (cache results)
 */
export const memoizeResolver = <T, R>(
  resolver: UnaryFunction<T, R>,
  keyFn: UnaryFunction<T, string> = JSON.stringify
): UnaryFunction<T, R> => {
  const cache = new Map<string, R>()

  return (input: T): R => {
    const key = keyFn(input)
    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = resolver(input)
    cache.set(key, result)
    return result
  }
}

/**
 * Apply a function to input and return both input and result
 */
export const apply =
  <T, R>(fn: UnaryFunction<T, R>) =>
  (input: T): [T, R] => [input, fn(input)]

/**
 * Tap function - apply side effect and return original value
 */
export const tap =
  <T>(fn: UnaryFunction<T, void>): UnaryFunction<T, T> =>
  (input: T): T => {
    fn(input)
    return input
  }

/**
 * Delay execution of a function
 */
export const delay =
  <T, R>(ms: number, fn: UnaryFunction<T, R>) =>
  async (input: T): Promise<R> => {
    await new Promise(resolve => globalThis.setTimeout(resolve, ms))
    return fn(input)
  }

/**
 * Retry a function with exponential backoff
 */
export const retry =
  <T, R>(fn: UnaryFunction<T, R | Promise<R>>, maxAttempts = 3, baseDelay = 1000) =>
  async (input: T): Promise<R> => {
    let lastError: unknown

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn(input)
      } catch (error) {
        lastError = error
        if (attempt < maxAttempts) {
          const delayMs = baseDelay * Math.pow(2, attempt - 1)
          await new Promise(resolve => globalThis.setTimeout(resolve, delayMs))
        }
      }
    }

    throw lastError
  }
