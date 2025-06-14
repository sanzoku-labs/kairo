import { isNil } from './logic'
import type { UnaryFunction, Predicate } from './types'

/**
 * Maybe type for handling nullable values functionally
 */
export type Maybe<T> = T | null | undefined

/**
 * Check if a value is present (not null or undefined)
 */
export const isSome = <T>(value: Maybe<T>): value is T => !isNil(value)

/**
 * Check if a value is absent (null or undefined)
 */
export const isNone = <T>(value: Maybe<T>): value is null | undefined => isNil(value)

/**
 * Transform a maybe value if present, otherwise return default
 */
export const maybe = <T, R>(value: Maybe<T>, transform: UnaryFunction<T, R>, defaultValue: R): R =>
  isSome(value) ? transform(value) : defaultValue

/**
 * Transform a maybe value if present, otherwise return undefined
 */
export const map =
  <T, R>(fn: UnaryFunction<T, R>) =>
  (value: Maybe<T>): Maybe<R> =>
    isSome(value) ? fn(value) : value

/**
 * Chain maybe transformations (flatMap for Maybe)
 */
export const chain =
  <T, R>(fn: UnaryFunction<T, Maybe<R>>) =>
  (value: Maybe<T>): Maybe<R> =>
    isSome(value) ? fn(value) : value

/**
 * Filter a maybe value based on predicate
 */
export const filter =
  <T>(predicate: Predicate<T>) =>
  (value: Maybe<T>): Maybe<T> =>
    isSome(value) && predicate(value) ? value : undefined

/**
 * Provide a default value for maybe
 */
export const withDefault =
  <T>(defaultValue: T) =>
  (value: Maybe<T>): T =>
    isSome(value) ? value : defaultValue

/**
 * Get value or throw error with custom message
 */
export const unwrap =
  <T>(errorMessage: string = 'Value is null or undefined') =>
  (value: Maybe<T>): T => {
    if (isNone(value)) {
      throw new Error(errorMessage)
    }
    return value
  }

/**
 * Convert a potentially throwing function to return Maybe
 */
export const fromTry =
  <T, Args extends unknown[]>(fn: (...args: Args) => T) =>
  (...args: Args): Maybe<T> => {
    try {
      return fn(...args)
    } catch {
      return undefined
    }
  }

/**
 * Convert a promise to return Maybe (undefined on rejection)
 */
export const fromPromise = async <T>(promise: Promise<T>): Promise<Maybe<T>> => {
  try {
    return await promise
  } catch {
    return undefined
  }
}

/**
 * Combine multiple maybe values - all must be present
 */
export const all = <T extends readonly Maybe<unknown>[]>(
  ...values: T
): Maybe<{ [K in keyof T]: NonNullable<T[K]> }> => {
  if (values.some(isNone)) return undefined
  return values as { [K in keyof T]: NonNullable<T[K]> }
}

/**
 * Return first present value from a list of maybes
 */
export const first = <T>(...values: Maybe<T>[]): Maybe<T> => {
  return values.find(isSome)
}

/**
 * Apply a function to value if present, otherwise do nothing
 */
export const when =
  <T>(fn: UnaryFunction<T, void>) =>
  (value: Maybe<T>): Maybe<T> => {
    if (isSome(value)) fn(value)
    return value
  }

/**
 * Convert Maybe to Result type
 */
export const toResult =
  <T, E>(error: E) =>
  (value: Maybe<T>): { tag: 'Ok'; value: T } | { tag: 'Err'; error: E } =>
    isSome(value) ? { tag: 'Ok', value } : { tag: 'Err', error }

/**
 * Partition array of maybes into present and absent values
 */
export const partition = <T>(values: Maybe<T>[]): [T[], (null | undefined)[]] => {
  const present: T[] = []
  const absent: (null | undefined)[] = []

  for (const value of values) {
    if (isSome(value)) {
      present.push(value)
    } else {
      absent.push(value)
    }
  }

  return [present, absent]
}
