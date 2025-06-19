import { describe, it, expect } from 'vitest'
import { pick, omit, merge, deepClone, path } from './object'

describe('object', () => {
  describe('pick', () => {
    it('should pick specified keys from object', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 }
      const pickAC = pick<typeof obj, 'a' | 'c'>('a', 'c')

      expect(pickAC(obj)).toEqual({ a: 1, c: 3 })
    })

    it('should handle non-existent keys', () => {
      const obj = { a: 1, b: 2 }
      const pickABC = pick<typeof obj, 'a' | 'b'>('a', 'b')

      expect(pickABC(obj)).toEqual({ a: 1, b: 2 })
    })

    it('should handle empty object', () => {
      const obj = {}
      const pickA = pick('a' as keyof typeof obj)

      expect(pickA(obj)).toEqual({})
    })

    it('should handle no keys specified', () => {
      const obj = { a: 1, b: 2 }
      const pickNone = pick()

      expect(pickNone(obj)).toEqual({})
    })

    it('should preserve value types', () => {
      const obj = {
        str: 'hello',
        num: 42,
        bool: true,
        arr: [1, 2, 3],
        nested: { x: 1 },
      }
      const pickSome = pick<typeof obj, 'str' | 'num' | 'nested'>('str', 'num', 'nested')
      const result = pickSome(obj)

      expect(result).toEqual({
        str: 'hello',
        num: 42,
        nested: { x: 1 },
      })
      expect(result.nested).toBe(obj.nested) // Should be same reference
    })
  })

  describe('omit', () => {
    it('should omit specified keys from object', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 }
      const omitBD = omit<typeof obj, 'b' | 'd'>('b', 'd')

      expect(omitBD(obj)).toEqual({ a: 1, c: 3 })
    })

    it('should handle non-existent keys', () => {
      const obj = { a: 1, b: 2 }
      const omitBC = omit<typeof obj, 'b'>('b')

      expect(omitBC(obj)).toEqual({ a: 1 })
    })

    it('should handle empty object', () => {
      const obj = {}
      const omitA = omit('a' as keyof typeof obj)

      expect(omitA(obj)).toEqual({})
    })

    it('should handle no keys specified', () => {
      const obj = { a: 1, b: 2 }
      const omitNone = omit()

      expect(omitNone(obj)).toEqual({ a: 1, b: 2 })
    })

    it('should not mutate original object', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const omitB = omit<typeof obj, 'b'>('b')
      const result = omitB(obj)

      expect(obj).toEqual({ a: 1, b: 2, c: 3 })
      expect(result).toEqual({ a: 1, c: 3 })
      expect(result).not.toBe(obj)
    })
  })

  describe('merge', () => {
    it('should merge two objects', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { c: 3, d: 4 }

      expect(merge(obj1, obj2)).toEqual({ a: 1, b: 2, c: 3, d: 4 })
    })

    it('should handle overlapping keys (second object wins)', () => {
      const obj1 = { a: 1, b: 2, c: 3 }
      const obj2 = { b: 20, c: 30, d: 4 }

      expect(merge(obj1, obj2)).toEqual({ a: 1, b: 20, c: 30, d: 4 })
    })

    it('should handle empty objects', () => {
      const obj1 = { a: 1 }
      const obj2 = {}

      expect(merge(obj1, obj2)).toEqual({ a: 1 })
      expect(merge({}, obj1)).toEqual({ a: 1 })
      expect(merge({}, {})).toEqual({})
    })

    it('should not mutate original objects', () => {
      const obj1 = { a: 1 }
      const obj2 = { b: 2 }
      const result = merge(obj1, obj2)

      expect(obj1).toEqual({ a: 1 })
      expect(obj2).toEqual({ b: 2 })
      expect(result).toEqual({ a: 1, b: 2 })
    })
  })

  describe('deepClone', () => {
    it('should clone primitive values', () => {
      expect(deepClone(42)).toBe(42)
      expect(deepClone('hello')).toBe('hello')
      expect(deepClone(true)).toBe(true)
      expect(deepClone(null)).toBe(null)
      expect(deepClone(undefined)).toBe(undefined)
    })

    it('should deep clone simple objects', () => {
      const obj = { a: 1, b: 2 }
      const cloned = deepClone(obj)

      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
    })

    it('should deep clone nested objects', () => {
      const obj = { a: { b: { c: 1 } }, d: 2 }
      const cloned = deepClone(obj)

      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
      expect(cloned.a).not.toBe(obj.a)
      expect(cloned.a.b).not.toBe(obj.a.b)
    })

    it('should deep clone arrays', () => {
      const arr = [1, [2, 3], { a: 4 }]
      const cloned = deepClone(arr)

      expect(cloned).toEqual(arr)
      expect(cloned).not.toBe(arr)
      expect(cloned[1]).not.toBe(arr[1])
      expect(cloned[2]).not.toBe(arr[2])
    })

    it('should handle Date objects', () => {
      const date = new Date('2023-01-01')
      const cloned = deepClone(date)

      expect(cloned).toEqual(date)
      expect(cloned).not.toBe(date)
      expect(cloned instanceof Date).toBe(true)
    })

    it('should handle RegExp objects', () => {
      const regex = /test/gi
      const cloned = deepClone(regex)

      expect(cloned).toEqual(regex)
      expect(cloned).not.toBe(regex)
      expect(cloned instanceof RegExp).toBe(true)
      expect(cloned.source).toBe(regex.source)
      expect(cloned.flags).toBe(regex.flags)
    })

    it('should handle Map objects', () => {
      const map = new Map([
        ['a', 1],
        ['b', { x: 2 }],
      ] as [string, unknown][])
      const cloned = deepClone(map)

      expect(cloned).not.toBe(map)
      expect(cloned instanceof Map).toBe(true)
      expect(cloned.size).toBe(2)
      expect(cloned.get('a')).toBe(1)
      expect(cloned.get('b')).toEqual({ x: 2 })
      expect(cloned.get('b')).not.toBe(map.get('b'))
    })

    it('should handle Set objects', () => {
      const set = new Set([1, { a: 2 }, [3, 4]])
      const cloned = deepClone(set)

      expect(cloned).not.toBe(set)
      expect(cloned instanceof Set).toBe(true)
      expect(cloned.size).toBe(3)
      expect(Array.from(cloned)).toEqual(Array.from(set))
    })

    it('should handle complex nested structures', () => {
      const complex = {
        arr: [1, { nested: true }],
        map: new Map([['key', { value: 42 }]]),
        set: new Set([{ item: 1 }]),
        date: new Date('2023-01-01'),
        regex: /test/g,
        deep: {
          level1: {
            level2: {
              data: [1, 2, 3],
            },
          },
        },
      }

      const cloned = deepClone(complex)

      expect(cloned).toEqual(complex)
      expect(cloned).not.toBe(complex)
      expect(cloned.arr).not.toBe(complex.arr)
      expect(cloned.map).not.toBe(complex.map)
      expect(cloned.set).not.toBe(complex.set)
      expect(cloned.deep.level1.level2.data).not.toBe(complex.deep.level1.level2.data)
    })
  })

  describe('path', () => {
    it('should access nested object properties', () => {
      const obj = { a: { b: { c: 42 } } }
      const getABC = path(['a', 'b', 'c'])

      expect(getABC(obj)).toBe(42)
    })

    it('should access array indices', () => {
      const obj = { items: [{ name: 'first' }, { name: 'second' }] }
      const getFirstName = path(['items', 0, 'name'])
      const getSecondName = path(['items', 1, 'name'])

      expect(getFirstName(obj)).toBe('first')
      expect(getSecondName(obj)).toBe('second')
    })

    it('should return undefined for non-existent paths', () => {
      const obj = { a: { b: 1 } }
      const getNonExistent = path(['a', 'c', 'd'])

      expect(getNonExistent(obj)).toBe(undefined)
    })

    it('should return undefined when encountering null/undefined in path', () => {
      const obj = { a: null }
      const getDeepPath = path(['a', 'b', 'c'])

      expect(getDeepPath(obj)).toBe(undefined)
    })

    it('should handle empty path', () => {
      const obj = { a: 1 }
      const getRoot = path([])

      expect(getRoot(obj)).toBe(obj)
    })

    it('should handle primitive values in path', () => {
      const obj = { a: 'hello' }
      const getLength = path(['a', 'length'])

      expect(getLength(obj)).toBe(5)
    })

    it('should work with complex nested structures', () => {
      const obj = {
        users: [
          {
            id: 1,
            profile: {
              name: 'John',
              address: {
                city: 'NYC',
                coordinates: [40.7128, -74.006],
              },
            },
          },
        ],
      }

      const getName = path(['users', 0, 'profile', 'name'])
      const getCity = path(['users', 0, 'profile', 'address', 'city'])
      const getLat = path(['users', 0, 'profile', 'address', 'coordinates', 0])

      expect(getName(obj)).toBe('John')
      expect(getCity(obj)).toBe('NYC')
      expect(getLat(obj)).toBe(40.7128)
    })
  })
})
