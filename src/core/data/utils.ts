/**
 * DATA Pillar Utilities
 * 
 * Public utility functions for DATA pillar following V2 specifications.
 * These utilities can be used within DATA methods and by users.
 */

import { Result, Schema } from '../foundation'
import { DataError, createDataError } from '../errors'
import { DataType, PropertyPath, UniqueKeyFunction, DataResult } from './types'

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
  
  let current: any = obj
  
  for (const key of pathArray) {
    if (current == null || typeof current !== 'object') {
      return undefined
    }
    
    current = current[key]
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
  let current: any = result
  
  // Navigate to parent of target property
  for (let i = 0; i < pathArray.length - 1; i++) {
    const key = pathArray[i]
    
    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = {}
    } else {
      current[key] = { ...current[key] }
    }
    
    current = current[key]
  }
  
  // Set the final property
  current[pathArray[pathArray.length - 1]] = value
  
  return result
}

/**
 * Check if nested property exists
 * 
 * @param obj - Object to check
 * @param path - Property path
 * @returns True if property exists
 */
export const has = (
  obj: Record<string, unknown>,
  path: PropertyPath
): boolean => {
  if (!obj || typeof obj !== 'object') {
    return false
  }
  
  const pathArray = Array.isArray(path) 
    ? path 
    : typeof path === 'string' 
      ? path.split('.') 
      : [String(path)]
  
  let current: any = obj
  
  for (const key of pathArray) {
    if (current == null || typeof current !== 'object') {
      return false
    }
    
    if (!(key in current)) {
      return false
    }
    
    current = current[key]
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
export const isValid = <T>(
  value: unknown,
  schema: Schema<T>
): boolean => {
  try {
    const result = schema.validate(value)
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
export const unique = <T>(
  array: T[],
  keyFn?: UniqueKeyFunction<T>
): T[] => {
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
export const flatten = <T>(
  array: (T | T[])[],
  depth: number = 1
): T[] => {
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
  const { preservePrototype = false, handleCircular = true } = options
  const seen = handleCircular ? new WeakMap() : null
  
  function clone(obj: any): any {
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
      const arr: any[] = []
      if (seen) seen.set(obj, arr)
      
      for (let i = 0; i < obj.length; i++) {
        arr[i] = clone(obj[i])
      }
      
      return arr
    }
    
    // Handle Objects
    const cloned = preservePrototype 
      ? Object.create(Object.getPrototypeOf(obj))
      : {}
    
    if (seen) seen.set(obj, cloned)
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = clone(obj[key])
      }
    }
    
    return cloned
  }
  
  return clone(value)
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
      delete result[pathArray[0]]
    } else {
      // For nested paths, we need to traverse and delete
      let current: any = result
      for (let i = 0; i < pathArray.length - 1; i++) {
        if (current[pathArray[i]] && typeof current[pathArray[i]] === 'object') {
          current = current[pathArray[i]]
        } else {
          break
        }
      }
      
      if (current && typeof current === 'object') {
        delete current[pathArray[pathArray.length - 1]]
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
  const { pretty = false, maxDepth = 10, replacer } = options
  
  try {
    return JSON.stringify(value, replacer as any, pretty ? 2 : undefined)
  } catch (error) {
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
    (error as any).pillar === 'DATA'
  )
}