import { Result } from '../core/shared'

/**
 * Combines multiple Results into a single Result containing an array.
 * If any Result is an error, returns the first error encountered.
 */
export const sequence = <E, T>(results: Result<E, T>[]): Result<E, T[]> => {
  const values: T[] = []
  for (const result of results) {
    if (Result.isErr(result)) return result
    values.push(result.value)
  }
  return Result.Ok(values)
}

/**
 * Maps over an array with a function that returns Results, then sequences them.
 * Useful for applying validations or transformations that can fail.
 */
export const traverse =
  <T, E, U>(fn: (item: T) => Result<E, U>) =>
  (items: T[]): Result<E, U[]> =>
    sequence(items.map(fn))

/**
 * Applies a function to the value inside an Ok Result, otherwise passes through the error.
 * This is the standard functor map for Result.
 */
export const mapResult =
  <E, T, U>(fn: (value: T) => U) =>
  (result: Result<E, T>): Result<E, U> => {
    return Result.isOk(result) ? Result.Ok(fn(result.value)) : result
  }

/**
 * Chains together Results, applying a function that returns a Result.
 * Also known as flatMap or bind in functional programming.
 */
export const chainResult =
  <E, T, U>(fn: (value: T) => Result<E, U>) =>
  (result: Result<E, T>): Result<E, U> => {
    return Result.isOk(result) ? fn(result.value) : result
  }

/**
 * Applies a predicate to the value in an Ok Result.
 * If the predicate fails, returns an error using the provided error function.
 */
export const filterResult =
  <E, T>(predicate: (value: T) => boolean, onError: (value: T) => E) =>
  (result: Result<E, T>): Result<E, T> => {
    if (Result.isErr(result)) return result
    return predicate(result.value) ? result : Result.Err(onError(result.value))
  }

/**
 * Combines two Results with a function. Both must be Ok for the result to be Ok.
 */
export const liftA2 =
  <E, A, B, C>(fn: (a: A, b: B) => C) =>
  (resultA: Result<E, A>, resultB: Result<E, B>): Result<E, C> => {
    if (Result.isErr(resultA)) return resultA
    if (Result.isErr(resultB)) return resultB
    return Result.Ok(fn(resultA.value, resultB.value))
  }

/**
 * Returns the first Ok Result, or the last error if all are errors.
 * Useful for fallback patterns.
 */
export const firstOk = <E, T>(results: Result<E, T>[]): Result<E, T> => {
  let lastError: Result<E, T> | undefined
  for (const result of results) {
    if (Result.isOk(result)) return result
    lastError = result
  }
  return lastError || Result.Err(new Error('No results provided') as E)
}

/**
 * Provides a default value if the Result is an error.
 */
export const withDefault =
  <E, T>(defaultValue: T) =>
  (result: Result<E, T>): T => {
    return Result.isOk(result) ? result.value : defaultValue
  }

/**
 * Transforms an error in a Result to a different error type.
 */
export const mapError =
  <E1, E2, T>(fn: (error: E1) => E2) =>
  (result: Result<E1, T>): Result<E2, T> => {
    return Result.isErr(result) ? Result.Err(fn(result.error)) : result
  }

/**
 * Recovers from an error by applying a function that returns a new Result.
 */
export const recover =
  <E, T>(fn: (error: E) => Result<E, T>) =>
  (result: Result<E, T>): Result<E, T> => {
    return Result.isErr(result) ? fn(result.error) : result
  }

/**
 * Partitions an array of Results into successes and failures.
 */
export const partitionResults = <E, T>(
  results: Result<E, T>[]
): { successes: T[]; failures: E[] } => {
  const successes: T[] = []
  const failures: E[] = []

  for (const result of results) {
    if (Result.isOk(result)) {
      successes.push(result.value)
    } else {
      failures.push(result.error)
    }
  }

  return { successes, failures }
}
