/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/**
 * A lens provides a way to focus on a particular part of a data structure.
 */
export interface Lens<S, A> {
  get: (source: S) => A
  set: (source: S, value: A) => S
  modify: (fn: (value: A) => A) => (source: S) => S
}

/**
 * Creates a lens from getter and setter functions.
 */
export const lens = <S, A>(
  getter: (source: S) => A,
  setter: (source: S, value: A) => S
): Lens<S, A> => ({
  get: getter,
  set: setter,
  modify: (fn: (value: A) => A) => (source: S) => setter(source, fn(getter(source))),
})

/**
 * Creates a lens for a property of an object.
 */
export const prop = <T, K extends keyof T>(key: K): Lens<T, T[K]> =>
  lens(
    (obj: T) => obj[key],
    (obj: T, value: T[K]) => ({ ...obj, [key]: value }) as T
  )

/**
 * Creates a lens for an index in an array.
 */
export const index = <T>(i: number): Lens<T[], T | undefined> =>
  lens(
    (arr: T[]) => arr[i],
    (arr: T[], value: T | undefined) => {
      const newArr = [...arr]
      if (value !== undefined) {
        newArr[i] = value
      }
      return newArr
    }
  )

/**
 * Composes two lenses to create a lens that focuses deeper.
 */
export const compose = <S, A, B>(outer: Lens<S, A>, inner: Lens<A, B>): Lens<S, B> =>
  lens(
    (source: S) => inner.get(outer.get(source)),
    (source: S, value: B) => outer.set(source, inner.set(outer.get(source), value))
  )

/**
 * Creates a lens for a nested property path.
 */
 
export const path = <T, P extends string>(pathStr: P): Lens<T, any> => {
  const keys = pathStr.split('.')

  return lens(
    (obj: T) => keys.reduce((current: any, key) => current?.[key], obj),
    (obj: T, value: any) => {
      const clone = { ...obj } as any
      let current = clone

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i]
        if (key && !(key in current)) {
          current[key] = {}
        }
        if (key) {
          current = current[key]
        }
      }

      const lastKey = keys[keys.length - 1]
      if (lastKey) {
        current[lastKey] = value
      }
      return clone
    }
  )
}

/**
 * Creates a lens that focuses on multiple properties at once.
 */
export const pick = <T, K extends keyof T>(keys: K[]): Lens<T, Pick<T, K>> =>
  lens(
    (obj: T) => {
      const result = {} as Pick<T, K>
      for (const key of keys) {
        result[key] = obj[key]
      }
      return result
    },
    (obj: T, value: Pick<T, K>) => ({ ...obj, ...value })
  )

/**
 * Creates a lens that excludes certain properties.
 */
export const omit = <T, K extends keyof T>(keys: K[]): Lens<T, Omit<T, K>> =>
  lens(
    (obj: T) => {
      const result = { ...obj } as any
      for (const key of keys) {
        delete result[key]
      }
      return result as Omit<T, K>
    },
    (obj: T, value: Omit<T, K>) => {
      const result = { ...obj }
      // Remove omitted keys and add new values
      for (const key of keys) {
        delete (result as any)[key]
      }
      return { ...result, ...value }
    }
  )

/**
 * Utility to get a value using a lens.
 */
export const view =
  <S, A>(lens: Lens<S, A>) =>
  (source: S): A =>
    lens.get(source)

/**
 * Utility to set a value using a lens.
 */
export const set =
  <S, A>(lens: Lens<S, A>, value: A) =>
  (source: S): S =>
    lens.set(source, value)

/**
 * Utility to modify a value using a lens.
 */
export const over =
  <S, A>(lens: Lens<S, A>, fn: (value: A) => A) =>
  (source: S): S =>
    lens.modify(fn)(source)

/**
 * Creates a lens that applies a predicate filter.
 */
export const filtered = <T>(predicate: (item: T) => boolean): Lens<T[], T[]> =>
  lens(
    (arr: T[]) => arr.filter(predicate),
    (arr: T[], newFiltered: T[]) => {
      // This is a simplified implementation - in practice, this is complex
      // since we need to figure out how to merge the filtered results back
      return [...arr.filter(item => !predicate(item)), ...newFiltered]
    }
  )

/**
 * Creates a lens for the first element that matches a predicate.
 */
export const find = <T>(predicate: (item: T) => boolean): Lens<T[], T | undefined> =>
  lens(
    (arr: T[]) => arr.find(predicate),
    (arr: T[], value: T | undefined) => {
      const index = arr.findIndex(predicate)
      if (index === -1) {
        return value !== undefined ? [...arr, value] : arr
      }
      return value !== undefined
        ? arr.map((item, i) => (i === index ? value : item))
        : arr.filter((_, i) => i !== index)
    }
  )
