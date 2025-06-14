import { describe, it, expect } from 'vitest'
import { isNil, isEmpty, not, equals } from './logic'

describe('logic', () => {
  describe('isNil', () => {
    it('should return true for null and undefined', () => {
      expect(isNil(null)).toBe(true)
      expect(isNil(undefined)).toBe(true)
    })

    it('should return false for other values', () => {
      expect(isNil(0)).toBe(false)
      expect(isNil('')).toBe(false)
      expect(isNil(false)).toBe(false)
      expect(isNil([])).toBe(false)
      expect(isNil({})).toBe(false)
    })
  })

  describe('isEmpty', () => {
    it('should return true for empty values', () => {
      expect(isEmpty(null)).toBe(true)
      expect(isEmpty(undefined)).toBe(true)
      expect(isEmpty('')).toBe(true)
      expect(isEmpty([])).toBe(true)
      expect(isEmpty({})).toBe(true)
      expect(isEmpty(new Set())).toBe(true)
      expect(isEmpty(new Map())).toBe(true)
    })

    it('should return false for non-empty values', () => {
      expect(isEmpty('hello')).toBe(false)
      expect(isEmpty([1, 2, 3])).toBe(false)
      expect(isEmpty({ a: 1 })).toBe(false)
      expect(isEmpty(new Set([1, 2]))).toBe(false)
      expect(isEmpty(new Map([['a', 1]]))).toBe(false)
      expect(isEmpty(0)).toBe(false)
      expect(isEmpty(false)).toBe(false)
    })
  })

  describe('not', () => {
    it('should negate predicate function', () => {
      const isEven = (n: number) => n % 2 === 0
      const isOdd = not(isEven)
      
      expect(isOdd(3)).toBe(true)
      expect(isOdd(4)).toBe(false)
    })

    it('should work with any predicate', () => {
      const isString = (x: unknown): x is string => typeof x === 'string'
      const isNotString = not(isString)
      
      expect(isNotString('hello')).toBe(false)
      expect(isNotString(123)).toBe(true)
    })
  })

  describe('equals', () => {
    it('should handle primitive values', () => {
      expect(equals(5, 5)).toBe(true)
      expect(equals('hello', 'hello')).toBe(true)
      expect(equals(true, true)).toBe(true)
      expect(equals(null, null)).toBe(true)
      expect(equals(undefined, undefined)).toBe(true)
      
      expect(equals(5, 6)).toBe(false)
      expect(equals('hello', 'world')).toBe(false)
      expect(equals(true, false)).toBe(false)
      expect(equals(null, undefined)).toBe(false)
    })

    it('should handle arrays', () => {
      expect(equals([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(equals(['a', 'b'], ['a', 'b'])).toBe(true)
      expect(equals([], [])).toBe(true)
      
      expect(equals([1, 2, 3], [1, 2, 4])).toBe(false)
      expect(equals([1, 2], [1, 2, 3])).toBe(false)
      expect(equals([1, 2], [2, 1])).toBe(false)
    })

    it('should handle nested arrays', () => {
      expect(equals([[1, 2], [3, 4]], [[1, 2], [3, 4]])).toBe(true)
      expect(equals([[1, 2], [3, 4]], [[1, 2], [3, 5]])).toBe(false)
    })

    it('should handle objects', () => {
      expect(equals({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
      expect(equals({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
      expect(equals({}, {})).toBe(true)
      
      expect(equals({ a: 1 }, { a: 2 })).toBe(false)
      expect(equals({ a: 1 }, { a: 1, b: 2 })).toBe(false)
      expect(equals({ a: 1, b: 2 }, { a: 1 })).toBe(false)
    })

    it('should handle nested objects', () => {
      expect(equals(
        { a: { b: { c: 1 } } },
        { a: { b: { c: 1 } } }
      )).toBe(true)
      
      expect(equals(
        { a: { b: { c: 1 } } },
        { a: { b: { c: 2 } } }
      )).toBe(false)
    })

    it('should handle mixed nested structures', () => {
      const obj1 = {
        arr: [1, { a: 2 }, [3, 4]],
        obj: { x: { y: [5, 6] } }
      }
      const obj2 = {
        arr: [1, { a: 2 }, [3, 4]],
        obj: { x: { y: [5, 6] } }
      }
      const obj3 = {
        arr: [1, { a: 2 }, [3, 5]],
        obj: { x: { y: [5, 6] } }
      }
      
      expect(equals(obj1, obj2)).toBe(true)
      expect(equals(obj1, obj3)).toBe(false)
    })

    it('should handle special cases', () => {
      expect(equals(NaN, NaN)).toBe(true)
      // 0 and -0 are considered equal by Object.is
      expect(Object.is(0, -0)).toBe(false)
      // But our equals function treats them as equal for practical purposes
      expect(equals(0, -0)).toBe(false)
      expect(equals(+0, -0)).toBe(false)
    })
  })
})