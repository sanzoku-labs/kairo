import { Result } from '../../core/result'
import type { UnaryFunction } from './types'

export const tryCatch = <T, E = unknown>(
  fn: () => T,
  onError?: UnaryFunction<unknown, E>
): Result<E, T> => {
  try {
    return Result.Ok(fn())
  } catch (error) {
    return Result.Err(onError ? onError(error) : (error as E))
  }
}
