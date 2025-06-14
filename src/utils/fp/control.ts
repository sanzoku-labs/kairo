import type { Predicate, UnaryFunction } from './types'

/**
 * Conditional execution utility - pattern matching for functional code
 * Executes the first matching condition, similar to cond in Clojure
 */
export const cond = <T, R>(
  conditions: Array<[Predicate<T>, UnaryFunction<T, R>]>
) => (value: T): R | undefined => {
  const match = conditions.find(([predicate]) => predicate(value))
  return match ? match[1](value) : undefined
}

/**
 * Conditional execution with fallback
 * Like cond but requires a default case
 */
export const condWith = <T, R>(
  conditions: Array<[Predicate<T>, UnaryFunction<T, R>]>,
  defaultFn: UnaryFunction<T, R>
) => (value: T): R => {
  const match = conditions.find(([predicate]) => predicate(value))
  return match ? match[1](value) : defaultFn(value)
}

/**
 * Execute function if predicate is true, otherwise return value unchanged
 */
export const when = <T>(
  predicate: Predicate<T>, 
  fn: UnaryFunction<T, T>
) => (value: T): T => predicate(value) ? fn(value) : value

/**
 * Execute function if predicate is false, otherwise return value unchanged
 */
export const unless = <T>(
  predicate: Predicate<T>, 
  fn: UnaryFunction<T, T>
) => (value: T): T => !predicate(value) ? fn(value) : value

/**
 * Switch-like utility for string/number matching
 */
export const switchCase = <K extends string | number, T, R>(
  cases: Record<K, UnaryFunction<T, R>>,
  defaultFn?: UnaryFunction<T, R>
) => (key: K) => (value: T): R => {
  const caseHandler = cases[key]
  if (caseHandler) return caseHandler(value)
  if (defaultFn) return defaultFn(value)
  throw new Error(`No case found for key: ${key}`)
}

/**
 * Guard utility - throws error if predicate fails
 */
export const guard = <T>(
  predicate: Predicate<T>,
  errorMessage: string | ((value: T) => string)
) => (value: T): T => {
  if (!predicate(value)) {
    const message = typeof errorMessage === 'string' 
      ? errorMessage 
      : errorMessage(value)
    throw new Error(message)
  }
  return value
}

/**
 * Branch utility - if/else for functional code
 */
export const branch = <T, R>(
  predicate: Predicate<T>,
  onTrue: UnaryFunction<T, R>,
  onFalse: UnaryFunction<T, R>
) => (value: T): R => predicate(value) ? onTrue(value) : onFalse(value)