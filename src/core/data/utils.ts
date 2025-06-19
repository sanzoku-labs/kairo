/**
 * DATA Pillar Utilities
 *
 * Public utility functions for DATA pillar.
 * These utilities can be used within DATA methods and by users.
 */

import { Result } from '../shared'
import type { Schema, DataError } from '../shared'
import type { DataType, PropertyPath, UniqueKeyFunction } from './types'

/**
 * Safely access nested object properties
 *
 * @param obj - Object to access
 * @param path - Property path (string or array)
 * @returns Property value or undefined
 */
export const get = <T = unknown>(
  obj: Record<string, unknown>,
  path: PropertyPath
): T | undefined => {
  if (!obj || typeof obj !== 'object') {
    return undefined
  }

  const pathArray = Array.isArray(path)
    ? path
    : typeof path === 'string'
      ? path.split('.')
      : [String(path)]

  let current: unknown = obj

  for (const key of pathArray) {
    if (current == null || typeof current !== 'object') {
      return undefined
    }

    current = (current as Record<string, unknown>)[key]
  }

  return current as T
}

/**
 * Safely set nested object properties (immutable)
 *
 * @param obj - Object to update
 * @param path - Property path
 * @param value - Value to set
 * @returns New object with updated property
 */
export const set = <T = unknown>(
  obj: Record<string, unknown>,
  path: PropertyPath,
  value: T
): Record<string, unknown> => {
  const pathArray = Array.isArray(path)
    ? path
    : typeof path === 'string'
      ? path.split('.')
      : [String(path)]

  if (pathArray.length === 0) {
    return obj
  }

  const result = { ...obj }
  let current: Record<string, unknown> = result

  // Navigate to parent of target property
  for (let i = 0; i < pathArray.length - 1; i++) {
    const key = pathArray[i]
    if (key === undefined) continue

    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = {}
    } else {
      current[key] = { ...(current[key] as Record<string, unknown>) }
    }

    current = current[key] as Record<string, unknown>
  }

  // Set the final property
  const finalKey = pathArray[pathArray.length - 1]
  if (finalKey !== undefined) {
    current[finalKey] = value
  }

  return result
}

/**
 * Check if nested property exists
 *
 * @param obj - Object to check
 * @param path - Property path
 * @returns True if property exists
 */
export const has = (obj: Record<string, unknown>, path: PropertyPath): boolean => {
  if (!obj || typeof obj !== 'object') {
    return false
  }

  const pathArray = Array.isArray(path)
    ? path
    : typeof path === 'string'
      ? path.split('.')
      : [String(path)]

  let current: unknown = obj

  for (const key of pathArray) {
    if (current == null || typeof current !== 'object') {
      return false
    }

    const currentObj = current as Record<string, unknown>
    if (!(key in currentObj)) {
      return false
    }

    current = currentObj[key]
  }

  return true
}

/**
 * Infer data type for schema generation
 *
 * @param value - Value to analyze
 * @returns Inferred data type
 */
export const inferType = (value: unknown): DataType => {
  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    return 'undefined'
  }

  if (Array.isArray(value)) {
    return 'array'
  }

  if (value instanceof Date) {
    return 'date'
  }

  const primitiveType = typeof value

  if (primitiveType === 'object') {
    return 'object'
  }

  return primitiveType as DataType
}

/**
 * Quick validation check without full Result
 *
 * @param value - Value to validate
 * @param schema - Schema to validate against
 * @returns True if value is valid
 */
export const isValid = <T>(value: unknown, schema: Schema<T>): boolean => {
  try {
    const result = schema.parse(value)
    return Result.isOk(result)
  } catch {
    return false
  }
}

/**
 * Remove duplicates from arrays
 *
 * @param array - Array to deduplicate
 * @param keyFn - Optional function to extract comparison key
 * @returns Array with duplicates removed
 */
export const unique = <T>(array: T[], keyFn?: UniqueKeyFunction<T>): T[] => {
  if (!Array.isArray(array)) {
    return []
  }

  if (!keyFn) {
    // Simple deduplication for primitives
    return [...new Set(array)]
  }

  // Complex deduplication using key function
  const seen = new Set()
  const result: T[] = []

  for (const item of array) {
    const key = keyFn(item)

    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }

  return result
}

/**
 * Flatten nested arrays
 *
 * @param array - Array to flatten
 * @param depth - Maximum depth to flatten (default: 1)
 * @returns Flattened array
 */
export const flatten = <T>(array: (T | T[])[], depth: number = 1): T[] => {
  if (!Array.isArray(array)) {
    return []
  }

  if (depth <= 0) {
    return array as T[]
  }

  const result: T[] = []

  for (const item of array) {
    if (Array.isArray(item) && depth > 0) {
      result.push(...flatten(item, depth - 1))
    } else {
      result.push(item as T)
    }
  }

  return result
}

/**
 * Deep clone objects and arrays
 *
 * @param value - Value to clone
 * @param options - Clone options
 * @returns Deep cloned value
 */
export const deepClone = <T>(
  value: T,
  options: {
    preservePrototype?: boolean
    handleCircular?: boolean
  } = {}
): T => {
  const { handleCircular = true } = options
  const seen = handleCircular ? new WeakMap() : null

  function clone(obj: unknown): unknown {
    // Handle primitives and null
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    // Handle circular references
    if (seen && seen.has(obj)) {
      return seen.get(obj)
    }

    // Handle Date
    if (obj instanceof Date) {
      return new Date(obj.getTime())
    }

    // Handle RegExp
    if (obj instanceof RegExp) {
      return new RegExp(obj.source, obj.flags)
    }

    // Handle Arrays
    if (Array.isArray(obj)) {
      const arr: unknown[] = []
      if (seen) seen.set(obj, arr)

      for (let i = 0; i < obj.length; i++) {
        arr[i] = clone(obj[i])
      }

      return arr
    }

    // Handle Objects
    const cloned: Record<string, unknown> = {}

    if (seen) seen.set(obj, cloned)

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = clone((obj as Record<string, unknown>)[key])
      }
    }

    return cloned
  }

  return clone(value) as T
}

/**
 * Extract multiple properties from an object
 *
 * @param obj - Source object
 * @param paths - Array of property paths to extract
 * @returns Object with extracted properties
 */
export const pick = (
  obj: Record<string, unknown>,
  paths: PropertyPath[]
): Record<string, unknown> => {
  const result: Record<string, unknown> = {}

  for (const path of paths) {
    const value = get(obj, path)
    if (value !== undefined) {
      const key = Array.isArray(path) ? path.join('.') : String(path)
      result[key] = value
    }
  }

  return result
}

/**
 * Omit properties from an object
 *
 * @param obj - Source object
 * @param paths - Array of property paths to omit
 * @returns Object with omitted properties
 */
export const omit = (
  obj: Record<string, unknown>,
  paths: PropertyPath[]
): Record<string, unknown> => {
  const result = { ...obj }

  for (const path of paths) {
    const pathArray = Array.isArray(path)
      ? path
      : typeof path === 'string'
        ? path.split('.')
        : [String(path)]

    if (pathArray.length === 1) {
      const key = pathArray[0]
      if (key !== undefined) {
        delete result[key]
      }
    } else {
      // For nested paths, we need to traverse and delete
      let current: unknown = result
      for (let i = 0; i < pathArray.length - 1; i++) {
        const key = pathArray[i]
        if (key === undefined) continue

        const currentObj = current as Record<string, unknown>
        if (currentObj[key] && typeof currentObj[key] === 'object') {
          current = currentObj[key]
        } else {
          break
        }
      }

      if (current && typeof current === 'object') {
        const lastKey = pathArray[pathArray.length - 1]
        if (lastKey !== undefined) {
          delete (current as Record<string, unknown>)[lastKey]
        }
      }
    }
  }

  return result
}

/**
 * Check if a value is a plain object (not array, date, etc.)
 *
 * @param value - Value to check
 * @returns True if value is a plain object
 */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp) &&
    value.constructor === Object
  )
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 *
 * @param value - Value to check
 * @returns True if value is empty
 */
export const isEmpty = (value: unknown): boolean => {
  if (value == null) {
    return true
  }

  if (typeof value === 'string') {
    return value.length === 0
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  if (isPlainObject(value)) {
    return Object.keys(value).length === 0
  }

  return false
}

/**
 * Convert any value to a string representation
 *
 * @param value - Value to stringify
 * @param options - Stringify options
 * @returns String representation
 */
export const stringify = (
  value: unknown,
  options: {
    pretty?: boolean
    maxDepth?: number
    replacer?: (key: string, value: unknown) => unknown
  } = {}
): string => {
  const { pretty = false, replacer } = options

  try {
    return JSON.stringify(
      value,
      replacer as ((key: string, value: unknown) => unknown) | undefined,
      pretty ? 2 : undefined
    )
  } catch {
    // Handle circular references and other JSON.stringify issues
    return String(value)
  }
}

/**
 * Type guard for data errors
 *
 * @param error - Error to check
 * @returns True if error is a DataError
 */
export const isDataError = (error: unknown): error is DataError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'pillar' in error &&
    (error as { pillar: unknown }).pillar === 'DATA'
  )
}
