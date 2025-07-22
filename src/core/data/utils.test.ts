/**
 * Comprehensive tests for DATA utilities
 * 
 * Tests the utility functions that support DATA pillar operations including:
 * - Object property access and manipulation (get, set, has, pick, omit)
 * - Data type inference and validation (inferType, isValid, isDataError)
 * - Array operations (unique, flatten)
 * - Object utilities (deepClone, isPlainObject, isEmpty, stringify)
 */

import { describe, it, expect } from 'vitest'
import { createDataError } from '../shared'
import { nativeSchema } from '../shared/schema'
import {
  get,
  set,
  has,
  inferType,
  isValid,
  unique,
  flatten,
  deepClone,
  pickData as pick,
  omitData as omit,
  isPlainObject,
  isEmpty,
  stringify,
  isDataError
} from './utils'

describe('DATA Utilities', () => {
  
  describe('get', () => {
    const testObj = {
      user: {
        name: 'John',
        profile: {
          age: 30,
          address: {
            city: 'New York',
            country: 'USA'
          }
        }
      },
      tags: ['developer', 'javascript'],
      active: true,
      count: 0
    }

    describe('Property path access', () => {
      it('should get top-level properties', () => {
        expect(get(testObj, 'active')).toBe(true)
        expect(get(testObj, 'count')).toBe(0)
        expect(get(testObj, 'tags')).toEqual(['developer', 'javascript'])
      })

      it('should get nested properties using dot notation', () => {
        expect(get(testObj, 'user.name')).toBe('John')
        expect(get(testObj, 'user.profile.age')).toBe(30)
        expect(get(testObj, 'user.profile.address.city')).toBe('New York')
      })

      it('should get nested properties using array notation', () => {
        expect(get(testObj, ['user', 'name'])).toBe('John')
        expect(get(testObj, ['user', 'profile', 'age'])).toBe(30)
        expect(get(testObj, ['user', 'profile', 'address', 'city'])).toBe('New York')
      })

      it('should handle array indices', () => {
        expect(get(testObj, ['tags', '0'])).toBe('developer')
        expect(get(testObj, ['tags', '1'])).toBe('javascript')
      })

      it('should handle number paths', () => {
        expect(get(testObj, 'count')).toBe(0)
        expect(get(testObj, ['count'])).toBe(0)
      })
    })

    describe('Edge cases', () => {
      it('should return undefined for non-existent properties', () => {
        expect(get(testObj, 'nonexistent')).toBeUndefined()
        expect(get(testObj, 'user.nonexistent')).toBeUndefined()
        expect(get(testObj, 'user.profile.nonexistent')).toBeUndefined()
      })

      it('should return undefined for null/undefined objects', () => {
        expect(get(null as unknown as Record<string, unknown>, 'property')).toBeUndefined()
        expect(get(undefined as unknown as Record<string, unknown>, 'property')).toBeUndefined()
      })

      it('should return undefined for non-object inputs', () => {
        expect(get('string' as unknown as Record<string, unknown>, 'property')).toBeUndefined()
        expect(get(123 as unknown as Record<string, unknown>, 'property')).toBeUndefined()
        expect(get(true as unknown as Record<string, unknown>, 'property')).toBeUndefined()
      })

      it('should handle accessing properties on null/undefined values', () => {
        const objWithNull = { nested: null }
        expect(get(objWithNull, 'nested.property')).toBeUndefined()
      })

      it('should handle empty path arrays', () => {
        expect(get(testObj, [])).toEqual(testObj)
      })
    })
  })

  describe('set', () => {
    const baseObj = {
      user: {
        name: 'John',
        profile: {
          age: 30
        }
      },
      active: true
    }

    describe('Property setting', () => {
      it('should set top-level properties', () => {
        const result = set(baseObj, 'active', false)
        expect(result.active).toBe(false)
        expect(result.user).toEqual(baseObj.user) // Should not mutate other properties
        expect(baseObj.active).toBe(true) // Should not mutate original
      })

      it('should set nested properties using dot notation', () => {
        const result = set(baseObj, 'user.name', 'Jane') as typeof baseObj
        expect((result.user).name).toBe('Jane')
        expect((result.user).profile).toEqual(baseObj.user.profile)
        expect(baseObj.user.name).toBe('John') // Should not mutate original
      })

      it('should set nested properties using array notation', () => {
        const result = set(baseObj, ['user', 'profile', 'age'], 25) as typeof baseObj
        expect((result.user).profile.age).toBe(25)
        expect(baseObj.user.profile.age).toBe(30) // Should not mutate original
      })

      it('should create nested objects if they don\'t exist', () => {
        const result = set(baseObj, 'user.profile.address.city', 'Boston') as typeof baseObj & { user: { profile: { address?: { city: string } } } }
        expect((result.user as typeof baseObj.user & { profile: { address?: { city: string } } }).profile.address?.city).toBe('Boston')
        expect((baseObj.user.profile as { address?: { city: string } }).address).toBeUndefined() // Should not mutate original
      })

      it('should handle deep nesting creation', () => {
        const result = set({}, 'a.b.c.d.e', 'deep') as { a: { b: { c: { d: { e: string } } } } }
        expect((result.a as { b: { c: { d: { e: string } } } }).b.c.d.e).toBe('deep')
      })
    })

    describe('Immutability', () => {
      it('should not mutate the original object', () => {
        const original = { count: 0, nested: { value: 'test' } }
        const result = set(original, 'count', 10)
        
        expect(original.count).toBe(0)
        expect(result.count).toBe(10)
        expect(original.nested === result.nested).toBe(true) // set() does shallow copy for unmodified properties
      })

      it('should handle setting null/undefined values', () => {
        const result = set(baseObj, 'user.profile.age', null) as typeof baseObj
        expect((result.user).profile.age).toBeNull()
      })
    })

    describe('Edge cases', () => {
      it('should handle empty paths', () => {
        const result = set(baseObj, [], 'new-value')
        expect(result).toEqual(baseObj)
      })

      it('should handle single-element paths', () => {
        const result = set(baseObj, ['newProp'], 'new-value')
        expect(result.newProp).toBe('new-value')
      })

      it('should replace non-object values when creating nested paths', () => {
        const obj = { primitive: 'string' }
        const result = set(obj, 'primitive.nested', 'value') as { primitive: { nested: string } }
        expect((result.primitive as { nested: string }).nested).toBe('value')
      })
    })
  })

  describe('has', () => {
    const testObj = {
      user: {
        name: 'John',
        profile: {
          age: 30,
          settings: null
        }
      },
      active: true,
      count: 0,
      empty: ''
    }

    describe('Property existence checking', () => {
      it('should return true for existing top-level properties', () => {
        expect(has(testObj, 'active')).toBe(true)
        expect(has(testObj, 'count')).toBe(true)
        expect(has(testObj, 'empty')).toBe(true)
      })

      it('should return true for existing nested properties', () => {
        expect(has(testObj, 'user.name')).toBe(true)
        expect(has(testObj, 'user.profile.age')).toBe(true)
        expect(has(testObj, ['user', 'profile', 'age'])).toBe(true)
      })

      it('should return true for properties with null values', () => {
        expect(has(testObj, 'user.profile.settings')).toBe(true)
      })

      it('should return false for non-existent properties', () => {
        expect(has(testObj, 'nonexistent')).toBe(false)
        expect(has(testObj, 'user.nonexistent')).toBe(false)
        expect(has(testObj, 'user.profile.nonexistent')).toBe(false)
      })

      it('should return false for properties on null/undefined values', () => {
        expect(has(testObj, 'user.profile.settings.nested')).toBe(false)
      })
    })

    describe('Edge cases', () => {
      it('should return false for null/undefined objects', () => {
        expect(has(null as unknown as Record<string, unknown>, 'property')).toBe(false)
        expect(has(undefined as unknown as Record<string, unknown>, 'property')).toBe(false)
      })

      it('should return false for non-object inputs', () => {
        expect(has('string' as unknown as Record<string, unknown>, 'property')).toBe(false)
        expect(has(123 as unknown as Record<string, unknown>, 'property')).toBe(false)
      })

      it('should handle empty path arrays', () => {
        expect(has(testObj, [])).toBe(true)
      })
    })
  })

  describe('inferType', () => {
    it('should infer primitive types', () => {
      expect(inferType('string')).toBe('string')
      expect(inferType(123)).toBe('number')
      expect(inferType(true)).toBe('boolean')
      expect(inferType(false)).toBe('boolean')
    })

    it('should infer special values', () => {
      expect(inferType(null)).toBe('null')
      expect(inferType(undefined)).toBe('undefined')
    })

    it('should infer complex types', () => {
      expect(inferType([])).toBe('array')
      expect(inferType([1, 2, 3])).toBe('array')
      expect(inferType({})).toBe('object')
      expect(inferType({ key: 'value' })).toBe('object')
    })

    it('should infer Date objects', () => {
      expect(inferType(new Date())).toBe('date')
    })

    it('should infer function type', () => {
      expect(inferType(() => {})).toBe('function')
      expect(inferType(function() {})).toBe('function')
    })

    it('should infer symbol type', () => {
      expect(inferType(Symbol('test'))).toBe('symbol')
    })

    it('should infer bigint type', () => {
      expect(inferType(BigInt(123))).toBe('bigint')
    })
  })

  describe('isValid', () => {
    it('should return true for valid values', () => {
      const stringSchema = nativeSchema.string()
      const numberSchema = nativeSchema.number()
      const objectSchema = nativeSchema.object({
        name: nativeSchema.string(),
        age: nativeSchema.number()
      })

      expect(isValid('hello', stringSchema)).toBe(true)
      expect(isValid(123, numberSchema)).toBe(true)
      expect(isValid({ name: 'John', age: 30 }, objectSchema)).toBe(true)
    })

    it('should return false for invalid values', () => {
      const stringSchema = nativeSchema.string()
      const numberSchema = nativeSchema.number()
      const objectSchema = nativeSchema.object({
        name: nativeSchema.string(),
        age: nativeSchema.number()
      })

      expect(isValid(123, stringSchema)).toBe(false)
      expect(isValid('hello', numberSchema)).toBe(false)
      expect(isValid({ name: 'John' }, objectSchema)).toBe(false) // Missing age
    })

    it('should handle schema parse errors gracefully', () => {
      const schema = nativeSchema.string()
      // This should not throw even if schema.parse throws
      expect(isValid(null, schema)).toBe(false)
      expect(isValid(undefined, schema)).toBe(false)
    })
  })

  describe('unique', () => {
    describe('Primitive arrays', () => {
      it('should remove duplicate primitives', () => {
        expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
        expect(unique(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c'])
        expect(unique([true, false, true, true])).toEqual([true, false])
      })

      it('should handle empty arrays', () => {
        expect(unique([])).toEqual([])
      })

      it('should handle single-element arrays', () => {
        expect(unique([1])).toEqual([1])
      })

      it('should handle arrays with no duplicates', () => {
        expect(unique([1, 2, 3])).toEqual([1, 2, 3])
      })
    })

    describe('Object arrays with key function', () => {
      const users = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
        { id: 1, name: 'John Doe' }, // Duplicate ID
        { id: 3, name: 'Bob' }
      ]

      it('should remove duplicates using key function', () => {
        const result = unique(users, user => user.id)
        expect(result).toEqual([
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
          { id: 3, name: 'Bob' }
        ])
      })

      it('should keep first occurrence of duplicates', () => {
        const result = unique(users, user => user.id)
        expect(result[0]?.name).toBe('John') // First occurrence kept
      })

      it('should handle complex key functions', () => {
        const products = [
          { category: 'electronics', name: 'laptop' },
          { category: 'books', name: 'novel' },
          { category: 'electronics', name: 'phone' }
        ]
        
        const result = unique(products, product => product.category)
        expect(result).toHaveLength(2)
        expect(result.map(p => p.category)).toEqual(['electronics', 'books'])
      })
    })

    describe('Edge cases', () => {
      it('should handle non-array inputs', () => {
        expect(unique('not-array' as unknown as unknown[])).toEqual([])
        expect(unique(null as unknown as unknown[])).toEqual([])
        expect(unique(undefined as unknown as unknown[])).toEqual([])
      })

      it('should handle null/undefined values in arrays', () => {
        expect(unique([1, null, 2, null, undefined, 3])).toEqual([1, null, 2, undefined, 3])
      })
    })
  })

  describe('flatten', () => {
    describe('Basic flattening', () => {
      it('should flatten one level by default', () => {
        expect(flatten([[1, 2], [3, 4], [5]])).toEqual([1, 2, 3, 4, 5])
        expect(flatten([['a', 'b'], ['c'], ['d', 'e']])).toEqual(['a', 'b', 'c', 'd', 'e'])
      })

      it('should handle mixed nested and non-nested items', () => {
        expect(flatten([1, [2, 3], 4, [5]])).toEqual([1, 2, 3, 4, 5])
      })

      it('should handle empty arrays', () => {
        expect(flatten([])).toEqual([])
        expect(flatten([[], [], []])).toEqual([])
      })
    })

    describe('Deep flattening', () => {
      it('should flatten multiple levels when depth specified', () => {
        expect(flatten([[[1, 2]], [[3, 4]]], 2)).toEqual([1, 2, 3, 4])
        expect(flatten([1, [2, [3, [4]]]], 3)).toEqual([1, 2, 3, 4])
      })

      it('should stop at specified depth', () => {
        expect(flatten([[[1, 2]], [[3, 4]]], 1)).toEqual([[1, 2], [3, 4]])
        expect(flatten([1, [2, [3, [4]]]], 2)).toEqual([1, 2, 3, [4]])
      })

      it('should handle depth 0', () => {
        expect(flatten([[1, 2], [3, 4]], 0)).toEqual([[1, 2], [3, 4]])
      })

      it('should handle negative depth', () => {
        expect(flatten([[1, 2], [3, 4]], -1)).toEqual([[1, 2], [3, 4]])
      })
    })

    describe('Edge cases', () => {
      it('should handle non-array inputs', () => {
        expect(flatten('not-array' as unknown as unknown[])).toEqual([])
        expect(flatten(null as unknown as unknown[])).toEqual([])
        expect(flatten(undefined as unknown as unknown[])).toEqual([])
      })

      it('should handle deeply nested structures', () => {
        const deep = [1, [2, [3, [4, [5]]]]];
        expect(flatten(deep, 10)).toEqual([1, 2, 3, 4, 5])
      })
    })
  })

  describe('deepClone', () => {
    describe('Primitive values', () => {
      it('should return primitives unchanged', () => {
        expect(deepClone('string')).toBe('string')
        expect(deepClone(123)).toBe(123)
        expect(deepClone(true)).toBe(true)
        expect(deepClone(null)).toBe(null)
        expect(deepClone(undefined)).toBe(undefined)
      })
    })

    describe('Arrays', () => {
      it('should clone arrays', () => {
        const arr = [1, 2, 3]
        const cloned = deepClone(arr)
        
        expect(cloned).toEqual(arr)
        expect(cloned).not.toBe(arr)
      })

      it('should clone nested arrays', () => {
        const arr = [[1, 2], [3, 4]]
        const cloned = deepClone(arr)
        
        expect(cloned).toEqual(arr)
        expect(cloned).not.toBe(arr)
        expect(cloned[0]).not.toBe(arr[0])
      })
    })

    describe('Objects', () => {
      it('should clone objects', () => {
        const obj = { a: 1, b: 2 }
        const cloned = deepClone(obj)
        
        expect(cloned).toEqual(obj)
        expect(cloned).not.toBe(obj)
      })

      it('should clone nested objects', () => {
        const obj = { user: { name: 'John', age: 30 } }
        const cloned = deepClone(obj)
        
        expect(cloned).toEqual(obj)
        expect(cloned).not.toBe(obj)
        expect(cloned.user).not.toBe(obj.user)
      })
    })

    describe('Special objects', () => {
      it('should clone Date objects', () => {
        const date = new Date('2023-01-01')
        const cloned = deepClone(date)
        
        expect(cloned).toEqual(date)
        expect(cloned).not.toBe(date)
        expect(cloned instanceof Date).toBe(true)
      })

      it('should clone RegExp objects', () => {
        const regex = /test/gi
        const cloned = deepClone(regex)
        
        expect(cloned).toEqual(regex)
        expect(cloned).not.toBe(regex)
        expect(cloned instanceof RegExp).toBe(true)
        expect(cloned.flags).toBe(regex.flags)
      })
    })

    describe('Circular references', () => {
      it('should handle circular references', () => {
        const obj: Record<string, unknown> = { a: 1 }
        obj.self = obj
        
        const cloned = deepClone(obj)
        
        expect((cloned as { a: number }).a).toBe(1)
        expect((cloned as { self: unknown }).self).toBe(cloned)
        expect(cloned).not.toBe(obj)
      })

      it('should handle deep circular references', () => {
        const obj: Record<string, unknown> = { nested: { value: 1 } }
        ;(obj.nested as Record<string, unknown>).parent = obj
        
        const cloned = deepClone(obj)
        
        expect((cloned.nested as Record<string, unknown>).value).toBe(1)
        expect((cloned.nested as Record<string, unknown>).parent).toBe(cloned)
        expect(cloned).not.toBe(obj)
      })
    })
  })

  describe('pick', () => {
    const testObj = {
      user: {
        name: 'John',
        age: 30,
        email: 'john@example.com'
      },
      active: true,
      tags: ['developer', 'javascript'],
      settings: {
        theme: 'dark',
        notifications: true
      }
    }

    describe('Property extraction', () => {
      it('should pick top-level properties', () => {
        const result = pick(testObj, ['active', 'tags'])
        expect(result).toEqual({
          active: true,
          tags: ['developer', 'javascript']
        })
      })

      it('should pick nested properties', () => {
        const result = pick(testObj, ['user.name', 'user.email'])
        expect(result).toEqual({
          'user.name': 'John',
          'user.email': 'john@example.com'
        })
      })

      it('should handle array path notation', () => {
        const result = pick(testObj, [['user', 'name'], ['settings', 'theme']])
        expect(result).toEqual({
          'user.name': 'John',
          'settings.theme': 'dark'
        })
      })

      it('should skip undefined properties', () => {
        const result = pick(testObj, ['active', 'nonexistent', 'tags'])
        expect(result).toEqual({
          active: true,
          tags: ['developer', 'javascript']
        })
      })
    })

    describe('Edge cases', () => {
      it('should handle empty paths array', () => {
        const result = pick(testObj, [])
        expect(result).toEqual({})
      })

      it('should handle non-existent nested paths', () => {
        const result = pick(testObj, ['user.nonexistent', 'other.missing'])
        expect(result).toEqual({})
      })
    })
  })

  describe('omit', () => {
    const testObj = {
      user: {
        name: 'John',
        age: 30,
        email: 'john@example.com'
      },
      active: true,
      tags: ['developer', 'javascript'],
      settings: {
        theme: 'dark',
        notifications: true
      }
    }

    describe('Property omission', () => {
      it('should omit top-level properties', () => {
        const result = omit(testObj, ['active', 'tags'])
        expect(result).toEqual({
          user: testObj.user,
          settings: testObj.settings
        })
        expect(result.active).toBeUndefined()
        expect(result.tags).toBeUndefined()
      })

      it('should omit nested properties', () => {
        const result = omit(testObj, ['user.email']) as typeof testObj
        expect((result.user).name).toBe('John')
        expect((result.user).age).toBe(30)
        expect((result.user).email).toBeUndefined()
      })

      it('should handle array path notation', () => {
        const result = omit(testObj, [['user', 'age'], ['settings', 'notifications']]) as typeof testObj
        expect((result.user).name).toBe('John')
        expect((result.user).age).toBeUndefined()
        expect((result.settings).theme).toBe('dark')
        expect((result.settings).notifications).toBeUndefined()
      })

      it('should not mutate original object', () => {
        const original = { a: 1, b: 2, c: 3 }
        const result = omit(original, ['b'])
        
        expect(original).toEqual({ a: 1, b: 2, c: 3 })
        expect(result).toEqual({ a: 1, c: 3 })
      })
    })

    describe('Edge cases', () => {
      it('should handle empty paths array', () => {
        const result = omit(testObj, [])
        expect(result).toEqual(testObj)
      })

      it('should handle non-existent paths', () => {
        const result = omit(testObj, ['nonexistent', 'user.missing'])
        expect(result).toEqual(testObj)
      })
    })
  })

  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true)
      expect(isPlainObject({ key: 'value' })).toBe(true)
      expect(isPlainObject(Object.create(null))).toBe(false) // No Object prototype
    })

    it('should return false for non-objects', () => {
      expect(isPlainObject(null)).toBe(false)
      expect(isPlainObject(undefined)).toBe(false)
      expect(isPlainObject('string')).toBe(false)
      expect(isPlainObject(123)).toBe(false)
      expect(isPlainObject(true)).toBe(false)
    })

    it('should return false for arrays', () => {
      expect(isPlainObject([])).toBe(false)
      expect(isPlainObject([1, 2, 3])).toBe(false)
    })

    it('should return false for special objects', () => {
      expect(isPlainObject(new Date())).toBe(false)
      expect(isPlainObject(/regex/)).toBe(false)
      expect(isPlainObject(new Map())).toBe(false)
      expect(isPlainObject(new Set())).toBe(false)
    })

    it('should return false for class instances', () => {
      class TestClass {}
      expect(isPlainObject(new TestClass())).toBe(false)
    })
  })

  describe('isEmpty', () => {
    describe('Null and undefined', () => {
      it('should return true for null/undefined', () => {
        expect(isEmpty(null)).toBe(true)
        expect(isEmpty(undefined)).toBe(true)
      })
    })

    describe('Strings', () => {
      it('should return true for empty strings', () => {
        expect(isEmpty('')).toBe(true)
      })

      it('should return false for non-empty strings', () => {
        expect(isEmpty('hello')).toBe(false)
        expect(isEmpty(' ')).toBe(false) // Space is not empty
      })
    })

    describe('Arrays', () => {
      it('should return true for empty arrays', () => {
        expect(isEmpty([])).toBe(true)
      })

      it('should return false for non-empty arrays', () => {
        expect(isEmpty([1])).toBe(false)
        expect(isEmpty([null])).toBe(false) // Array with null is not empty
      })
    })

    describe('Objects', () => {
      it('should return true for empty objects', () => {
        expect(isEmpty({})).toBe(true)
      })

      it('should return false for non-empty objects', () => {
        expect(isEmpty({ key: 'value' })).toBe(false)
        expect(isEmpty({ key: null })).toBe(false) // Object with null property is not empty
      })
    })

    describe('Other types', () => {
      it('should return false for numbers', () => {
        expect(isEmpty(0)).toBe(false)
        expect(isEmpty(123)).toBe(false)
      })

      it('should return false for booleans', () => {
        expect(isEmpty(true)).toBe(false)
        expect(isEmpty(false)).toBe(false)
      })

      it('should return false for dates', () => {
        expect(isEmpty(new Date())).toBe(false)
      })
    })
  })

  describe('stringify', () => {
    describe('Basic stringification', () => {
      it('should stringify primitives', () => {
        expect(stringify('string')).toBe('"string"')
        expect(stringify(123)).toBe('123')
        expect(stringify(true)).toBe('true')
        expect(stringify(null)).toBe('null')
      })

      it('should stringify objects', () => {
        expect(stringify({ key: 'value' })).toBe('{"key":"value"}')
        expect(stringify([])).toBe('[]')
        expect(stringify([1, 2, 3])).toBe('[1,2,3]')
      })
    })

    describe('Pretty printing', () => {
      it('should format with indentation when pretty is true', () => {
        const obj = { name: 'John', age: 30 }
        const result = stringify(obj, { pretty: true })
        expect(result).toContain('  ') // Should have indentation
        expect(result).toContain('\n') // Should have newlines
      })
    })

    describe('Custom replacer', () => {
      it('should use custom replacer function', () => {
        const obj = { password: 'secret', name: 'John' }
        const result = stringify(obj, {
          replacer: (key, value) => key === 'password' ? '[REDACTED]' : value
        })
        expect(result).toContain('[REDACTED]')
        expect(result).toContain('John')
      })
    })

    describe('Error handling', () => {
      it('should handle circular references', () => {
        const obj: Record<string, unknown> = { name: 'test' }
        obj.self = obj
        
        const result = stringify(obj)
        expect(typeof result).toBe('string')
        // Should not throw, but exact result depends on implementation
      })

      it('should handle functions', () => {
        const obj = { func: () => 'test' }
        const result = stringify(obj)
        expect(typeof result).toBe('string')
      })
    })
  })

  describe('isDataError', () => {
    it('should return true for valid DataError', () => {
      const error = createDataError('test', 'Test error', {})
      expect(isDataError(error)).toBe(true)
    })

    it('should return false for regular Error', () => {
      const error = new Error('Regular error')
      expect(isDataError(error)).toBe(false)
    })

    it('should return false for non-DATA pillar errors', () => {
      const error = {
        code: 'SERVICE_ERROR',
        pillar: 'SERVICE',
        message: 'Service error'
      }
      expect(isDataError(error)).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isDataError(null)).toBe(false)
      expect(isDataError(undefined)).toBe(false)
    })

    it('should return false for primitives', () => {
      expect(isDataError('string')).toBe(false)
      expect(isDataError(123)).toBe(false)
      expect(isDataError(true)).toBe(false)
    })

    it('should return false for objects without required properties', () => {
      expect(isDataError({ message: 'error' })).toBe(false)
      expect(isDataError({ code: 'ERROR' })).toBe(false)
      expect(isDataError({ pillar: 'DATA' })).toBe(false)
    })
  })
})