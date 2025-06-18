// Internal helper to avoid circular imports
const safeTry = <T>(
  fn: () => T
): { success: true; value: T } | { success: false; error: unknown } => {
  try {
    return { success: true, value: fn() }
  } catch (error) {
    return { success: false, error }
  }
}

/**
 * Core Result type for safe error handling across all Kairo pillars.
 *
 * Represents either a successful value (Ok) or an error (Err). This type is used
 * throughout Kairo to eliminate throwing exceptions and provide explicit,
 * type-safe error handling. Integrates seamlessly with functional programming
 * patterns and pipeline composition.
 *
 * @template E - The error type
 * @template T - The success value type
 *
 * @example
 * ```typescript
 * // Function that returns a Result
 * function divide(a: number, b: number): Result<string, number> {
 *   if (b === 0) {
 *     return Result.Err('Division by zero')
 *   }
 *   return Result.Ok(a / b)
 * }
 *
 * // Using Results
 * const result = divide(10, 2)
 * if (Result.isOk(result)) {
 *   console.log('Success:', result.value) // 5
 * } else {
 *   console.error('Error:', result.error)
 * }
 *
 * // Pipeline integration
 * const mathPipeline = pipeline('math')
 *   .input(schema.object({ a: schema.number(), b: schema.number() }))
 *   .map(({ a, b }) => divide(a, b))
 *   .flatMap(result => result) // Unwrap nested Result
 * ```
 */
export type Result<E, T> =
  | { readonly tag: 'Ok'; readonly value: T }
  | { readonly tag: 'Err'; readonly error: E }

/**
 * Success variant of Result containing a value.
 * @template T - The success value type
 */
export type OkResult<T> = { readonly tag: 'Ok'; readonly value: T }

/**
 * Error variant of Result containing an error.
 * @template E - The error type
 */
export type ErrResult<E> = { readonly tag: 'Err'; readonly error: E }

/**
 * Result utility functions for creating and manipulating Result types.
 *
 * Provides a complete API for working with Results including constructors,
 * type guards, transformations, error handling, and async support.
 * Essential for safe error handling across all Kairo operations.
 *
 * @namespace Result
 * @example
 * ```typescript
 * // Creating Results
 * const success = Result.Ok(42)
 * const failure = Result.Err('Something went wrong')
 *
 * // Type checking
 * if (Result.isOk(result)) {
 *   console.log(result.value) // TypeScript knows this is safe
 * }
 *
 * // Transformations
 * const doubled = Result.map(success, x => x * 2) // Result.Ok(84)
 * const handled = Result.mapError(failure, err => new Error(err))
 *
 * // Pattern matching
 * const output = Result.match(result, {
 *   Ok: value => `Success: ${value}`,
 *   Err: error => `Error: ${error}`
 * })
 *
 * // Chaining operations
 * const chained = Result.flatMap(success, value =>
 *   value > 0 ? Result.Ok(value * 2) : Result.Err('Negative value')
 * )
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Result = {
  /**
   * Creates a successful Result containing a value.
   *
   * @template T - Type of the success value
   * @param value - The success value to wrap
   * @returns OkResult containing the value
   *
   * @example
   * ```typescript
   * const user = { id: 1, name: 'John' }
   * const result = Result.Ok(user)
   * // result: { tag: 'Ok', value: { id: 1, name: 'John' } }
   * ```
   */
  Ok<T>(value: T): OkResult<T> {
    return { tag: 'Ok', value }
  },

  /**
   * Creates a failed Result containing an error.
   *
   * @template E - Type of the error
   * @param error - The error to wrap
   * @returns ErrResult containing the error
   *
   * @example
   * ```typescript
   * const validationError = { code: 'INVALID_EMAIL', message: 'Invalid email format' }
   * const result = Result.Err(validationError)
   * // result: { tag: 'Err', error: { code: 'INVALID_EMAIL', ... } }
   * ```
   */
  Err<E>(error: E): ErrResult<E> {
    return { tag: 'Err', error }
  },

  /**
   * Type guard to check if a Result is successful.
   * Narrows the type to OkResult for safe value access.
   *
   * @template E - Error type
   * @template T - Success value type
   * @param result - Result to check
   * @returns True if Result is Ok, with type narrowing
   *
   * @example
   * ```typescript
   * if (Result.isOk(result)) {
   *   // TypeScript knows result.value is safe to access
   *   console.log(result.value)
   * }
   * ```
   */
  isOk<E, T>(result: Result<E, T>): result is OkResult<T> {
    return result.tag === 'Ok'
  },

  /**
   * Type guard to check if a Result is an error.
   * Narrows the type to ErrResult for safe error access.
   *
   * @template E - Error type
   * @template T - Success value type
   * @param result - Result to check
   * @returns True if Result is Err, with type narrowing
   *
   * @example
   * ```typescript
   * if (Result.isErr(result)) {
   *   // TypeScript knows result.error is safe to access
   *   console.error(result.error)
   * }
   * ```
   */
  isErr<E, T>(result: Result<E, T>): result is ErrResult<E> {
    return result.tag === 'Err'
  },

  /**
   * Transforms the value inside an Ok Result, leaving Err Results unchanged.
   * This is the functor map operation for Results.
   *
   * @template E - Error type
   * @template T - Input value type
   * @template U - Output value type
   * @param result - Result to transform
   * @param fn - Pure function to apply to the value
   * @returns New Result with transformed value or original error
   *
   * @example
   * ```typescript
   * const result = Result.Ok(5)
   * const doubled = Result.map(result, x => x * 2) // Result.Ok(10)
   *
   * const error = Result.Err('failed')
   * const stillError = Result.map(error, x => x * 2) // Result.Err('failed')
   * ```
   */
  map<E, T, U>(result: Result<E, T>, fn: (value: T) => U): Result<E, U> {
    if (result.tag === 'Ok') {
      return Result.Ok(fn(result.value))
    }
    return result
  },

  /**
   * Chains Result-returning operations, flattening nested Results.
   * Also known as bind or chain in functional programming.
   *
   * @template E - Error type
   * @template T - Input value type
   * @template U - Output value type
   * @param result - Result to chain from
   * @param fn - Function that returns a new Result
   * @returns Flattened Result or original error
   *
   * @example
   * ```typescript
   * const validateUser = (data: unknown): Result<string, User> => { ... }
   * const saveUser = (user: User): Result<string, User> => { ... }
   *
   * const result = Result.flatMap(
   *   validateUser(inputData),
   *   user => saveUser(user)
   * )
   * // Avoids Result<string, Result<string, User>>
   * ```
   */
  flatMap<E, T, U>(result: Result<E, T>, fn: (value: T) => Result<E, U>): Result<E, U> {
    if (result.tag === 'Ok') {
      return fn(result.value)
    }
    return result
  },

  /**
   * Transforms the error inside an Err Result, leaving Ok Results unchanged.
   * Useful for error transformation and enrichment.
   *
   * @template E - Input error type
   * @template F - Output error type
   * @template T - Value type
   * @param result - Result to transform
   * @param fn - Function to transform the error
   * @returns Result with transformed error or original value
   *
   * @example
   * ```typescript
   * const result = Result.Err('validation failed')
   * const enriched = Result.mapError(result, msg => ({
   *   code: 'VALIDATION_ERROR',
   *   message: msg,
   *   timestamp: Date.now()
   * }))
   * ```
   */
  mapError<E, F, T>(result: Result<E, T>, fn: (error: E) => F): Result<F, T> {
    if (result.tag === 'Err') {
      return Result.Err(fn(result.error))
    }
    return result
  },

  /**
   * Pattern matching for Results - handles both success and error cases.
   * Provides exhaustive case handling with guaranteed return value.
   *
   * @template E - Error type
   * @template T - Value type
   * @template U - Return type
   * @param result - Result to match against
   * @param handlers - Object with Ok and Err handlers
   * @returns Value from appropriate handler
   *
   * @example
   * ```typescript
   * const message = Result.match(apiResult, {
   *   Ok: user => `Welcome, ${user.name}!`,
   *   Err: error => `Login failed: ${error.message}`
   * })
   *
   * // Always returns a string, no null/undefined
   * console.log(message)
   * ```
   */
  match<E, T, U>(
    result: Result<E, T>,
    handlers: {
      Ok: (value: T) => U
      Err: (error: E) => U
    }
  ): U {
    if (result.tag === 'Ok') {
      return handlers.Ok(result.value)
    }
    return handlers.Err(result.error)
  },

  /**
   * Extracts the value from an Ok Result or throws an error.
   * Use with caution - prefer pattern matching or isOk checks.
   *
   * @template E - Error type
   * @template T - Value type
   * @param result - Result to unwrap
   * @returns The value if Ok
   * @throws Error if the Result is Err
   *
   * @example
   * ```typescript
   * const result = Result.Ok(42)
   * const value = Result.unwrap(result) // 42
   *
   * const error = Result.Err('failed')
   * const value2 = Result.unwrap(error) // Throws!
   *
   * // Prefer safe alternatives:
   * if (Result.isOk(result)) {
   *   const value = result.value // Safe
   * }
   * ```
   */
  unwrap<E, T>(result: Result<E, T>): T {
    if (result.tag === 'Ok') {
      return result.value
    }
    throw new Error('Called unwrap on an Err value')
  },

  /**
   * Extracts the value from a Result or returns a default value.
   * Safe alternative to unwrap() that never throws.
   *
   * @template E - Error type
   * @template T - Value type
   * @param result - Result to unwrap
   * @param defaultValue - Value to return if Result is Err
   * @returns The value if Ok, otherwise the default value
   *
   * @example
   * ```typescript
   * const success = Result.Ok(42)
   * const value1 = Result.unwrapOr(success, 0) // 42
   *
   * const failure = Result.Err('failed')
   * const value2 = Result.unwrapOr(failure, 0) // 0
   * ```
   */
  unwrapOr<E, T>(result: Result<E, T>, defaultValue: T): T {
    if (result.tag === 'Ok') {
      return result.value
    }
    return defaultValue
  },

  /**
   * Extracts the value from a Result or computes a value from the error.
   * Provides error-specific recovery logic.
   *
   * @template E - Error type
   * @template T - Value type
   * @param result - Result to unwrap
   * @param fn - Function to compute fallback value from error
   * @returns The value if Ok, otherwise computed fallback
   *
   * @example
   * ```typescript
   * const result = Result.Err({ code: 'NOT_FOUND', message: 'User not found' })
   * const user = Result.unwrapOrElse(result, error => ({
   *   id: 'unknown',
   *   name: 'Anonymous',
   *   error: error.code
   * }))
   * ```
   */
  unwrapOrElse<E, T>(result: Result<E, T>, fn: (error: E) => T): T {
    if (result.tag === 'Ok') {
      return result.value
    }
    return fn(result.error)
  },

  /**
   * Converts a Promise to a Result, catching any rejections as errors.
   * Essential for safe async operation handling in pipelines.
   *
   * @template T - Promise value type
   * @param promise - Promise to convert
   * @returns Promise resolving to Result
   *
   * @example
   * ```typescript
   * const fetchUser = async (id: string) => {
   *   const result = await Result.fromPromise(
   *     fetch(`/api/users/${id}`).then(r => r.json())
   *   )
   *
   *   return Result.match(result, {
   *     Ok: user => console.log('User:', user),
   *     Err: error => console.error('Fetch failed:', error)
   *   })
   * }
   * ```
   */
  async fromPromise<T>(promise: Promise<T>): Promise<Result<unknown, T>> {
    return promise.then(value => Result.Ok(value)).catch(error => Result.Err(error))
  },

  /**
   * Executes a function and captures any thrown errors as Result.
   * Converts exception-based code to Result-based code.
   *
   * @template T - Function return type
   * @param fn - Function that might throw
   * @returns Result with value or caught error
   *
   * @example
   * ```typescript
   * const parseJson = (text: string) => Result.fromTry(() => JSON.parse(text))
   *
   * const result1 = parseJson('{"name": "John"}') // Result.Ok({name: "John"})
   * const result2 = parseJson('invalid json')     // Result.Err(SyntaxError)
   *
   * // Safe division
   * const divide = (a: number, b: number) => Result.fromTry(() => {
   *   if (b === 0) throw new Error('Division by zero')
   *   return a / b
   * })
   * ```
   */
  fromTry<T>(fn: () => T): Result<unknown, T> {
    const result = safeTry(fn)
    return result.success ? Result.Ok(result.value) : Result.Err(result.error)
  },
}

export function map<E, T, U>(fn: (value: T) => U) {
  return (result: Result<E, T>): Result<E, U> => Result.map(result, fn)
}

export function flatMap<E, T, U>(fn: (value: T) => Result<E, U>) {
  return (result: Result<E, T>): Result<E, U> => Result.flatMap(result, fn)
}

export function mapError<E, F, T>(fn: (error: E) => F) {
  return (result: Result<E, T>): Result<F, T> => Result.mapError(result, fn)
}

export function match<E, T, U>(handlers: { Ok: (value: T) => U; Err: (error: E) => U }) {
  return (result: Result<E, T>): U => Result.match(result, handlers)
}

export function chain<E, T>(...fns: Array<(result: Result<E, unknown>) => Result<E, unknown>>) {
  return (result: Result<E, T>): Result<E, unknown> => {
    return fns.reduce(
      (acc, fn) => {
        if (Result.isErr(acc)) return acc
        return fn(acc)
      },
      result as Result<E, unknown>
    )
  }
}
