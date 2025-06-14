export type Result<E, T> = 
  | { readonly tag: 'Ok'; readonly value: T }
  | { readonly tag: 'Err'; readonly error: E }

export type OkResult<T> = { readonly tag: 'Ok'; readonly value: T }
export type ErrResult<E> = { readonly tag: 'Err'; readonly error: E }

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Result = {
  Ok<T>(value: T): OkResult<T> {
    return { tag: 'Ok', value }
  },

  Err<E>(error: E): ErrResult<E> {
    return { tag: 'Err', error }
  },

  isOk<E, T>(result: Result<E, T>): result is OkResult<T> {
    return result.tag === 'Ok'
  },

  isErr<E, T>(result: Result<E, T>): result is ErrResult<E> {
    return result.tag === 'Err'
  },

  map<E, T, U>(result: Result<E, T>, fn: (value: T) => U): Result<E, U> {
    if (result.tag === 'Ok') {
      return Result.Ok(fn(result.value))
    }
    return result
  },

  flatMap<E, T, U>(result: Result<E, T>, fn: (value: T) => Result<E, U>): Result<E, U> {
    if (result.tag === 'Ok') {
      return fn(result.value)
    }
    return result
  },

  mapError<E, F, T>(result: Result<E, T>, fn: (error: E) => F): Result<F, T> {
    if (result.tag === 'Err') {
      return Result.Err(fn(result.error))
    }
    return result
  },

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

  unwrap<E, T>(result: Result<E, T>): T {
    if (result.tag === 'Ok') {
      return result.value
    }
    throw new Error('Called unwrap on an Err value')
  },

  unwrapOr<E, T>(result: Result<E, T>, defaultValue: T): T {
    if (result.tag === 'Ok') {
      return result.value
    }
    return defaultValue
  },

  unwrapOrElse<E, T>(result: Result<E, T>, fn: (error: E) => T): T {
    if (result.tag === 'Ok') {
      return result.value
    }
    return fn(result.error)
  },

  async fromPromise<T>(promise: Promise<T>): Promise<Result<unknown, T>> {
    return promise
      .then(value => Result.Ok(value))
      .catch(error => Result.Err(error))
  },

  fromTry<T>(fn: () => T): Result<unknown, T> {
    try {
      return Result.Ok(fn())
    } catch (error) {
      return Result.Err(error)
    }
  }
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