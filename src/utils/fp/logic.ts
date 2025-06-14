import type { Predicate } from './types'

export const isNil = (x: unknown): x is null | undefined => 
  x === null || x === undefined

export const isEmpty = (x: unknown): boolean => {
  if (isNil(x)) return true
  if (typeof x === 'string') return x.length === 0
  if (Array.isArray(x)) return x.length === 0
  if (x instanceof Set || x instanceof Map) return x.size === 0
  if (typeof x === 'object') return Object.keys(x).length === 0
  return false
}

export const not = <T>(fn: Predicate<T>): Predicate<T> => 
  (x: T): boolean => !fn(x)

export const equals = <T>(a: T, b: T): boolean => {
  if (Object.is(a, b)) return true
  
  if (isNil(a) || isNil(b)) return false
  
  if (typeof a !== typeof b) return false
  
  if (typeof a !== 'object') return false
  
  const aIsArray = Array.isArray(a)
  const bIsArray = Array.isArray(b)
  
  if (aIsArray !== bIsArray) return false
  
  if (aIsArray && bIsArray) {
    if (a.length !== b.length) return false
    return a.every((val, idx) => equals(val, b[idx]))
  }
  
  const aKeys = Object.keys(a as object)
  const bKeys = Object.keys(b as object)
  
  if (aKeys.length !== bKeys.length) return false
  
  return aKeys.every(key => 
    Object.prototype.hasOwnProperty.call(b, key) &&
    equals((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  )
}