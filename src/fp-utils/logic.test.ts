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
      expect(isNil('hello')).toBe(false)
      expect(isNil(42)).toBe(false)
    })
  })

  describe('isEmpty', () => {
    it('should return true for null and undefined', () => {
      expect(isEmpty(null)).toBe(true)
      expect(isEmpty(undefined)).toBe(true)
    })

    it('should return true for empty strings', () => {
      expect(isEmpty('')).toBe(true)
      expect(isEmpty('hello')).toBe(false)
    })

    it('should return true for empty arrays', () => {
      expect(isEmpty([])).toBe(true)
      expect(isEmpty([1, 2, 3])).toBe(false)
    })

    it('should return true for empty Sets', () => {
      expect(isEmpty(new Set())).toBe(true)
      expect(isEmpty(new Set([1, 2, 3]))).toBe(false)
    })

    it('should return true for empty Maps', () => {
      expect(isEmpty(new Map())).toBe(true)
      expect(isEmpty(new Map([['a', 1]]))).toBe(false)
    })

    it('should return true for empty objects', () => {
      expect(isEmpty({})).toBe(true)
      expect(isEmpty({ a: 1 })).toBe(false)
    })

    it('should return false for non-empty primitives', () => {
      expect(isEmpty(0)).toBe(false)
      expect(isEmpty(false)).toBe(false)
      expect(isEmpty(42)).toBe(false)
      expect(isEmpty(true)).toBe(false)
    })
  })

  describe('not', () => {
    it('should negate a predicate function', () => {
      const isEven = (x: number) => x % 2 === 0
      const isOdd = not(isEven)

      expect(isOdd(1)).toBe(true)
      expect(isOdd(2)).toBe(false)
      expect(isOdd(3)).toBe(true)
      expect(isOdd(4)).toBe(false)
    })

    it('should work with boolean predicates', () => {
      const isTruthy = (x: unknown) => Boolean(x)
      const isFalsy = not(isTruthy)

      expect(isFalsy(0)).toBe(true)
      expect(isFalsy('')).toBe(true)
      expect(isFalsy(null)).toBe(true)
      expect(isFalsy(undefined)).toBe(true)
      expect(isFalsy(false)).toBe(true)

      expect(isFalsy(1 as unknown)).toBe(false)
      expect(isFalsy('hello' as unknown)).toBe(false)
      expect(isFalsy(true)).toBe(false)
      expect(isFalsy([])).toBe(false)
      expect(isFalsy({})).toBe(false)
    })
  })

  describe('equals', () => {
    it('should handle primitive equality', () => {
      expect(equals(1, 1)).toBe(true)
      expect(equals(1, 2)).toBe(false)
      expect(equals('hello', 'hello')).toBe(true)
      expect(equals('hello', 'world')).toBe(false)
      expect(equals(true, true)).toBe(true)
      expect(equals(true, false)).toBe(false)
    })

    it('should handle special cases', () => {
      expect(equals(NaN, NaN)).toBe(true)
      expect(equals(0, -0)).toBe(false)
      expect(equals(+0, -0)).toBe(false)
    })

    it('should handle null and undefined', () => {
      expect(equals(null, null)).toBe(true)
      expect(equals(undefined, undefined)).toBe(true)
      expect(equals(null, undefined)).toBe(false)
      expect(equals(null, 0)).toBe(false)
      expect(equals(undefined, '')).toBe(false)
    })

    it('should handle different types', () => {
      expect(equals(1 as unknown, '1' as unknown)).toBe(false)
      expect(equals(true as unknown, 1 as unknown)).toBe(false)
      expect(equals([], {})).toBe(false)
    })

    it('should handle array equality', () => {
      expect(equals([], [])).toBe(true)
      expect(equals([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(equals([1, 2, 3], [1, 2, 4])).toBe(false)
      expect(equals([1, 2], [1, 2, 3])).toBe(false)
      expect(equals([1, [2, 3]], [1, [2, 3]])).toBe(true)
      expect(equals([1, [2, 3]], [1, [2, 4]])).toBe(false)
    })

    it('should handle object equality', () => {
      expect(equals({}, {})).toBe(true)
      expect(equals({ a: 1 }, { a: 1 })).toBe(true)
      expect(equals({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
      expect(equals({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
      expect(equals({ a: 1 }, { a: 2 })).toBe(false)
      expect(equals({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    })

    it('should handle nested object equality', () => {
      const obj1 = { a: { b: { c: 1 } } }
      const obj2 = { a: { b: { c: 1 } } }
      const obj3 = { a: { b: { c: 2 } } }

      expect(equals(obj1, obj2)).toBe(true)
      expect(equals(obj1, obj3)).toBe(false)
    })

    it('should handle mixed arrays and objects', () => {
      const obj1 = { items: [1, 2, { nested: true }] }
      const obj2 = { items: [1, 2, { nested: true }] }
      const obj3 = { items: [1, 2, { nested: false }] }

      expect(equals(obj1, obj2)).toBe(true)
      expect(equals(obj1, obj3)).toBe(false)
    })

    it('should handle circular references (note: current implementation has limitations)', () => {
      type CircularObj = { a: number; self?: CircularObj }
      const obj1: CircularObj = { a: 1 }
      obj1.self = obj1

      const obj2: CircularObj = { a: 1 }
      obj2.self = obj2

      // The current implementation will cause infinite recursion
      // This is a known limitation - in production, you'd want to add cycle detection
      expect(() => equals(obj1, obj2)).toThrow('Maximum call stack size exceeded')
    })
  })
})
