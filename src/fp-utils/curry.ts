/**
 * Curries a function with 2 parameters.
 */
export const curry2 =
  <A, B, R>(fn: (a: A, b: B) => R) =>
  (a: A) =>
  (b: B) =>
    fn(a, b)

/**
 * Curries a function with 3 parameters.
 */
export const curry3 =
  <A, B, C, R>(fn: (a: A, b: B, c: C) => R) =>
  (a: A) =>
  (b: B) =>
  (c: C) =>
    fn(a, b, c)

/**
 * Curries a function with 4 parameters.
 */
export const curry4 =
  <A, B, C, D, R>(fn: (a: A, b: B, c: C, d: D) => R) =>
  (a: A) =>
  (b: B) =>
  (c: C) =>
  (d: D) =>
    fn(a, b, c, d)

/**
 * Partial application - apply some arguments now, rest later.
 */

export const partial =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <R>(fn: (...args: any[]) => R, ...partialArgs: any[]) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...remainingArgs: any[]): R =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      fn(...partialArgs, ...remainingArgs)

/**
 * Partial application from the right side.
 */

export const partialRight =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <R>(fn: (...args: any[]) => R, ...partialArgs: any[]) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...remainingArgs: any[]): R =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      fn(...remainingArgs, ...partialArgs)

/**
 * Flips the order of the first two arguments of a function.
 */
export const flip =
  <A, B, R>(fn: (a: A, b: B) => R) =>
  (b: B, a: A) =>
    fn(a, b)

/**
 * Creates a function that applies arguments in reverse order.
 */
export const reverse =
  <T extends unknown[], R>(fn: (...args: T) => R) =>
  (...args: T): R =>
    fn(...(args.reverse() as T))

/**
 * Creates a unary function from any function (takes only first argument).
 */
export const unary =
  <T, R>(fn: (arg: T, ...rest: unknown[]) => R) =>
  (arg: T) =>
    fn(arg)

/**
 * Creates a binary function from any function (takes only first two arguments).
 */
export const binary =
  <A, B, R>(fn: (a: A, b: B, ...rest: unknown[]) => R) =>
  (a: A, b: B) =>
    fn(a, b)

/**
 * Spreads an array as arguments to a function.
 */
export const spread =
  <T extends readonly unknown[], R>(fn: (...args: T) => R) =>
  (args: T) =>
    fn(...args)

/**
 * Collects arguments into an array before passing to function.
 */
export const collect =
  <T, R>(fn: (args: T[]) => R) =>
  (...args: T[]) =>
    fn(args)

/**
 * Creates a function that always returns the same value.
 */
export const always =
  <T>(value: T) =>
  () =>
    value

/**
 * Creates a predicate that checks if value equals the given value.
 */
export const equals =
  <T>(target: T) =>
  (value: T): boolean =>
    value === target

/**
 * Creates a predicate that checks if value is greater than the given value.
 */
export const gt =
  (target: number) =>
  (value: number): boolean =>
    value > target

/**
 * Creates a predicate that checks if value is less than the given value.
 */
export const lt =
  (target: number) =>
  (value: number): boolean =>
    value < target

/**
 * Creates a predicate that checks if value is greater than or equal to the given value.
 */
export const gte =
  (target: number) =>
  (value: number): boolean =>
    value >= target

/**
 * Creates a predicate that checks if value is less than or equal to the given value.
 */
export const lte =
  (target: number) =>
  (value: number): boolean =>
    value <= target
