import type { UnaryFunction, Predicate } from './types'
import { equals } from './logic'

export const map =
  <T, U>(fn: UnaryFunction<T, U>) =>
  (arr: readonly T[]): U[] =>
    arr.map(fn)

export const filter =
  <T>(fn: Predicate<T>) =>
  (arr: readonly T[]): T[] =>
    arr.filter(fn)

export const flatMap =
  <T, U>(fn: UnaryFunction<T, U | U[]>) =>
  (arr: readonly T[]): U[] =>
    arr.flatMap(item => {
      const result = fn(item)
      return Array.isArray(result) ? result : [result]
    })

export const uniq = <T>(arr: readonly T[]): T[] => {
  const seen = new Set<T>()
  const result: T[] = []

  for (const item of arr) {
    const isDuplicate = Array.from(seen).some(seenItem => equals(seenItem, item))
    if (!isDuplicate) {
      seen.add(item)
      result.push(item)
    }
  }

  return result
}

export const groupBy =
  <T>(keyFn: UnaryFunction<T, string>) =>
  (arr: readonly T[]): Record<string, T[]> => {
    return arr.reduce(
      (acc, item) => {
        const key = keyFn(item)
        return {
          ...acc,
          [key]: [...(acc[key] || []), item],
        }
      },
      {} as Record<string, T[]>
    )
  }
