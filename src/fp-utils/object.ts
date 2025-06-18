import type { Path, PickKeys, OmitKeys } from './types'
import { isNil } from './logic'

export const pick =
  <T extends object, K extends keyof T>(...keys: K[]) =>
  (obj: T): PickKeys<T, K> => {
    const result = {} as PickKeys<T, K>
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = obj[key]
      }
    }
    return result
  }

export const omit =
  <T extends object, K extends keyof T>(...keys: K[]) =>
  (obj: T): OmitKeys<T, K> => {
    const result = { ...obj }
    for (const key of keys) {
      delete result[key]
    }
    return result as OmitKeys<T, K>
  }

export const merge = <T extends object, U extends object>(obj1: T, obj2: U): T & U => ({
  ...obj1,
  ...obj2,
})

export const deepClone = <T>(obj: T): T => {
  if (isNil(obj) || typeof obj !== 'object') return obj

  if (obj instanceof Date) return new Date(obj.getTime()) as T
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags) as T
  if (obj instanceof Map) {
    const cloned = new Map()
    obj.forEach((value, key) => cloned.set(deepClone(key), deepClone(value)))
    return cloned as T
  }
  if (obj instanceof Set) {
    const cloned = new Set()
    obj.forEach(value => cloned.add(deepClone(value)))
    return cloned as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item: unknown) => deepClone(item)) as T
  }

  const cloned = {} as Record<string, unknown>
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone((obj as Record<string, unknown>)[key])
    }
  }
  return cloned as T
}

export const path =
  (pathArray: Path) =>
  <T>(obj: unknown): T | undefined => {
    let current = obj as Record<string | number, unknown>

    for (const key of pathArray) {
      if (isNil(current)) return undefined
      current = current[key] as Record<string | number, unknown>
    }

    return current as T
  }
