import type { UnaryFunction, Predicate } from './types'

/**
 * Execute a side effect and return the original value
 */
export const effect =
  <T>(fn: UnaryFunction<T, void>) =>
  (value: T): T => {
    fn(value)
    return value
  }

/**
 * Execute a side effect only if predicate is true
 */
export const conditionalEffect =
  <T>(predicate: Predicate<T>, fn: UnaryFunction<T, void>) =>
  (value: T): T =>
    predicate(value) ? effect(fn)(value) : value

/**
 * Execute side effect only if value is truthy
 */
export const effectWhen = <T>(fn: UnaryFunction<T, void>) =>
  conditionalEffect((value: T) => !!value, fn)

/**
 * Execute side effect only if value is falsy
 */
export const effectUnless = <T>(fn: UnaryFunction<T, void>) =>
  conditionalEffect((value: T) => !value, fn)

/**
 * Log value and return it unchanged
 */
export const log = <T>(message?: string) =>
  effect<T>((value: T) => {
    const prefix = message ? `[${message}]` : ''
    console.log(prefix, value)
  })

/**
 * Debug log with custom formatter
 */
export const debug = <T>(formatter?: UnaryFunction<T, string>) =>
  effect<T>((value: T) => {
    const formatted = formatter ? formatter(value) : JSON.stringify(value, null, 2)
    console.debug('[DEBUG]', formatted)
  })

/**
 * Trace execution time of a function
 */
export const trace =
  <T>(label: string) =>
  (value: T): T => {
    const start = performance.now()
    const result = value
    const duration = performance.now() - start
    console.log(`[TRACE ${label}] ${duration.toFixed(2)}ms`)
    return result
  }

/**
 * Execute async side effect (useful for logging, metrics, etc.)
 */
export const asyncEffect =
  <T>(fn: UnaryFunction<T, Promise<void>>) =>
  (value: T): T => {
    fn(value).catch(console.error) // Fire and forget
    return value
  }

/**
 * Batch effects - execute multiple side effects
 */
export const effects = <T>(...fns: Array<UnaryFunction<T, void>>) =>
  effect<T>((value: T) => {
    for (const fn of fns) {
      fn(value)
    }
  })

/**
 * Throttle side effects (execute at most once per interval)
 */
export const throttleEffect = <T>(intervalMs: number, fn: UnaryFunction<T, void>) => {
  let lastExecution = 0

  return effect<T>((value: T) => {
    const now = Date.now()
    if (now - lastExecution >= intervalMs) {
      fn(value)
      lastExecution = now
    }
  })
}

/**
 * Debounce side effects (execute only after delay with no new calls)
 */
export const debounceEffect = <T>(delayMs: number, fn: UnaryFunction<T, void>) => {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined

  return effect<T>((value: T) => {
    if (timeoutId) {
      globalThis.clearTimeout(timeoutId)
    }
    timeoutId = globalThis.setTimeout(() => fn(value), delayMs)
  })
}

/**
 * Measure and log execution time
 */
export const measure =
  <T>(label: string = 'Operation') =>
  (fn: UnaryFunction<T, T>) =>
  (value: T): T => {
    const start = performance.now()
    const result = fn(value)
    const duration = performance.now() - start
    console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms`)
    return result
  }

/**
 * Count function calls and log periodically
 */
export const countCalls = <T>(label: string, logInterval: number = 100) => {
  let count = 0

  return effect<T>(() => {
    count++
    if (count % logInterval === 0) {
      console.log(`📊 ${label}: ${count} calls`)
    }
  })
}

/**
 * Collect values for batch processing
 */
export const collect = <T>(batchSize: number, processor: (batch: T[]) => void) => {
  const batch: T[] = []

  return effect<T>((value: T) => {
    batch.push(value)
    if (batch.length >= batchSize) {
      processor([...batch])
      batch.length = 0 // Clear array
    }
  })
}

/**
 * Error handling effect - catch and log errors without throwing
 */
export const catchEffect = <T>(
  fn: UnaryFunction<T, void>,
  errorHandler?: (error: unknown) => void
) =>
  effect<T>((value: T) => {
    try {
      fn(value)
    } catch (error) {
      if (errorHandler) {
        errorHandler(error)
      } else {
        console.error('Effect error:', error)
      }
    }
  })
