import { describe, it, expect } from 'vitest'
import { pick, omit, merge, deepClone, path } from './object'

describe('object', () => {
  describe('pick', () => {
    it('should pick specified properties', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 }
      const picked = pick<typeof obj, 'a' | 'c'>('a', 'c')(obj)
      expect(picked).toEqual({ a: 1, c: 3 })
    })

    it('should ignore non-existent properties', () => {
      const obj = { a: 1, b: 2 }
      const picked = pick<typeof obj, 'a'>('a')(obj)
      expect(picked).toEqual({ a: 1 })
    })

    it('should handle empty picks', () => {
      const obj = { a: 1, b: 2 }
      const picked = pick<typeof obj, never>()(obj)
      expect(picked).toEqual({})
    })

    it('should maintain types', () => {
      interface User {
        id: number
        name: string
        email: string
        age: number
      }
      const user: User = { id: 1, name: 'John', email: 'john@example.com', age: 30 }
      const publicInfo = pick<User, 'id' | 'name'>('id', 'name')(user)
      
      // Type test - should compile
      const id: number = publicInfo.id
      const name: string = publicInfo.name
      // Type test - email should not exist
      // @ts-expect-error - property does not exist
      expect(publicInfo.email).toBeUndefined()
      
      expect(id).toBe(1)
      expect(name).toBe('John')
    })
  })

  describe('omit', () => {
    it('should omit specified properties', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 }
      const omitted = omit<typeof obj, 'b' | 'd'>('b', 'd')(obj)
      expect(omitted).toEqual({ a: 1, c: 3 })
    })

    it('should handle non-existent properties', () => {
      const obj = { a: 1, b: 2 }
      const omitted = omit<typeof obj, never>()(obj)
      expect(omitted).toEqual({ a: 1, b: 2 })
    })

    it('should handle empty omits', () => {
      const obj = { a: 1, b: 2 }
      const omitted = omit<typeof obj, never>()(obj)
      expect(omitted).toEqual({ a: 1, b: 2 })
    })

    it('should not mutate original object', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const omitted = omit<typeof obj, 'b'>('b')(obj)
      expect(obj).toEqual({ a: 1, b: 2, c: 3 })
      expect(omitted).toEqual({ a: 1, c: 3 })
    })
  })

  describe('merge', () => {
    it('should merge two objects', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { c: 3, d: 4 }
      const merged = merge(obj1, obj2)
      expect(merged).toEqual({ a: 1, b: 2, c: 3, d: 4 })
    })

    it('should override properties from first object', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { b: 3, c: 4 }
      const merged = merge(obj1, obj2)
      expect(merged).toEqual({ a: 1, b: 3, c: 4 })
    })

    it('should handle empty objects', () => {
      expect(merge({}, { a: 1 })).toEqual({ a: 1 })
      expect(merge({ a: 1 }, {})).toEqual({ a: 1 })
      expect(merge({}, {})).toEqual({})
    })

    it('should maintain types', () => {
      const defaults = { theme: 'dark', fontSize: 14 }
      const userPrefs = { fontSize: 16, language: 'en' }
      const settings = merge(defaults, userPrefs)
      
      // Type test
      const theme: string = settings.theme
      const fontSize: number = settings.fontSize
      const language: string = settings.language
      
      expect(theme).toBe('dark')
      expect(fontSize).toBe(16)
      expect(language).toBe('en')
    })
  })

  describe('deepClone', () => {
    it('should handle primitives', () => {
      expect(deepClone(42)).toBe(42)
      expect(deepClone('hello')).toBe('hello')
      expect(deepClone(true)).toBe(true)
      expect(deepClone(null)).toBe(null)
      expect(deepClone(undefined)).toBe(undefined)
    })

    it('should clone objects deeply', () => {
      const obj = {
        a: 1,
        b: { c: 2, d: { e: 3 } },
        f: [1, 2, { g: 4 }]
      }
      const cloned = deepClone(obj)
      
      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
      expect(cloned.b).not.toBe(obj.b)
      expect(cloned.b.d).not.toBe(obj.b.d)
      expect(cloned.f).not.toBe(obj.f)
      expect(cloned.f[2]).not.toBe(obj.f[2])
    })

    it('should handle arrays', () => {
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
      expect(cloned.getTime()).toBe(date.getTime())
    })

    it('should handle RegExp objects', () => {
      const regex = /test/gi
      const cloned = deepClone(regex)
      
      expect(cloned).toEqual(regex)
      expect(cloned).not.toBe(regex)
      expect(cloned.source).toBe(regex.source)
      expect(cloned.flags).toBe(regex.flags)
    })

    it('should handle Map objects', () => {
      const map = new Map<string, unknown>([
        ['a', 1],
        ['b', { c: 2 }]
      ])
      const cloned = deepClone(map)
      
      expect(cloned).toEqual(map)
      expect(cloned).not.toBe(map)
      expect(cloned.get('b')).not.toBe(map.get('b'))
      expect(cloned.get('b')).toEqual({ c: 2 })
    })

    it('should handle Set objects', () => {
      const set = new Set([1, { a: 2 }, [3, 4]])
      const cloned = deepClone(set)
      
      expect(cloned).toEqual(set)
      expect(cloned).not.toBe(set)
      expect(cloned.size).toBe(set.size)
      
      const clonedArray = Array.from(cloned)
      const originalArray = Array.from(set)
      expect(clonedArray[1]).not.toBe(originalArray[1])
      expect(clonedArray[2]).not.toBe(originalArray[2])
    })
  })

  describe('path', () => {
    it('should access nested properties', () => {
      const obj = {
        a: {
          b: {
            c: 42
          }
        }
      }
      expect(path(['a', 'b', 'c'])(obj)).toBe(42)
    })

    it('should handle array indices', () => {
      const obj = {
        users: [
          { name: 'Alice' },
          { name: 'Bob' }
        ]
      }
      expect(path(['users', 1, 'name'])(obj)).toBe('Bob')
    })

    it('should return undefined for non-existent paths', () => {
      const obj = { a: { b: 1 } }
      expect(path(['a', 'c'])(obj)).toBeUndefined()
      expect(path(['x', 'y', 'z'])(obj)).toBeUndefined()
    })

    it('should handle null/undefined in path', () => {
      const obj = { a: { b: null } }
      expect(path(['a', 'b', 'c'])(obj)).toBeUndefined()
    })

    it('should work with empty path', () => {
      const obj = { a: 1 }
      expect(path([])(obj)).toBe(obj)
    })

    it('should work with mixed nested structures', () => {
      const data = {
        config: {
          servers: [
            { host: 'localhost', port: 3000 },
            { host: 'example.com', port: 8080 }
          ]
        }
      }
      expect(path(['config', 'servers', 0, 'host'])(data)).toBe('localhost')
      expect(path(['config', 'servers', 1, 'port'])(data)).toBe(8080)
    })
  })
})