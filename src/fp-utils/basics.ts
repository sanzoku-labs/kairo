import type { UnaryFunction } from './types'

export const identity = <T>(x: T): T => x

export const constant =
  <T>(x: T) =>
  (): T =>
    x

export const noop = (): void => undefined

export function pipe<A, B>(fn1: UnaryFunction<A, B>): UnaryFunction<A, B>
export function pipe<A, B, C>(
  fn1: UnaryFunction<A, B>,
  fn2: UnaryFunction<B, C>
): UnaryFunction<A, C>
export function pipe<A, B, C, D>(
  fn1: UnaryFunction<A, B>,
  fn2: UnaryFunction<B, C>,
  fn3: UnaryFunction<C, D>
): UnaryFunction<A, D>
export function pipe<A, B, C, D, E>(
  fn1: UnaryFunction<A, B>,
  fn2: UnaryFunction<B, C>,
  fn3: UnaryFunction<C, D>,
  fn4: UnaryFunction<D, E>
): UnaryFunction<A, E>
export function pipe<A, B, C, D, E, F>(
  fn1: UnaryFunction<A, B>,
  fn2: UnaryFunction<B, C>,
  fn3: UnaryFunction<C, D>,
  fn4: UnaryFunction<D, E>,
  fn5: UnaryFunction<E, F>
): UnaryFunction<A, F>
export function pipe<A, B, C, D, E, F, G>(
  fn1: UnaryFunction<A, B>,
  fn2: UnaryFunction<B, C>,
  fn3: UnaryFunction<C, D>,
  fn4: UnaryFunction<D, E>,
  fn5: UnaryFunction<E, F>,
  fn6: UnaryFunction<F, G>
): UnaryFunction<A, G>
export function pipe(...fns: UnaryFunction<unknown, unknown>[]): UnaryFunction<unknown, unknown> {
  return (x: unknown) => fns.reduce((acc, fn) => fn(acc), x)
}

export function compose<A, B>(fn1: UnaryFunction<A, B>): UnaryFunction<A, B>
export function compose<A, B, C>(
  fn2: UnaryFunction<B, C>,
  fn1: UnaryFunction<A, B>
): UnaryFunction<A, C>
export function compose<A, B, C, D>(
  fn3: UnaryFunction<C, D>,
  fn2: UnaryFunction<B, C>,
  fn1: UnaryFunction<A, B>
): UnaryFunction<A, D>
export function compose<A, B, C, D, E>(
  fn4: UnaryFunction<D, E>,
  fn3: UnaryFunction<C, D>,
  fn2: UnaryFunction<B, C>,
  fn1: UnaryFunction<A, B>
): UnaryFunction<A, E>
export function compose<A, B, C, D, E, F>(
  fn5: UnaryFunction<E, F>,
  fn4: UnaryFunction<D, E>,
  fn3: UnaryFunction<C, D>,
  fn2: UnaryFunction<B, C>,
  fn1: UnaryFunction<A, B>
): UnaryFunction<A, F>
export function compose<A, B, C, D, E, F, G>(
  fn6: UnaryFunction<F, G>,
  fn5: UnaryFunction<E, F>,
  fn4: UnaryFunction<D, E>,
  fn3: UnaryFunction<C, D>,
  fn2: UnaryFunction<B, C>,
  fn1: UnaryFunction<A, B>
): UnaryFunction<A, G>
export function compose(
  ...fns: UnaryFunction<unknown, unknown>[]
): UnaryFunction<unknown, unknown> {
  return (x: unknown) => fns.reduceRight((acc, fn) => fn(acc), x)
}
