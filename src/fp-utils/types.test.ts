import { describe, it, expect } from 'vitest'
import type {
  UnaryFunction,
  Predicate,
  Comparator,
  DeepPartial,
  Path,
  PickKeys,
  OmitKeys,
} from './types'

describe('types', () => {
  describe('UnaryFunction', () => {
    it('should type a function that takes one argument', () => {
      const double: UnaryFunction<number, number> = x => x * 2
      const toString: UnaryFunction<number, string> = x => x.toString()

      expect(double(5)).toBe(10)
      expect(toString(42)).toBe('42')
    })
  })

  describe('Predicate', () => {
    it('should type a function that returns boolean', () => {
      const isEven: Predicate<number> = x => x % 2 === 0
      const isLongString: Predicate<string> = s => s.length > 5

      expect(isEven(4)).toBe(true)
      expect(isEven(3)).toBe(false)
      expect(isLongString('hello world')).toBe(true)
      expect(isLongString('hi')).toBe(false)
    })
  })

  describe('Comparator', () => {
    it('should type a function that compares two values', () => {
      const isEqual: Comparator<number> = (a, b) => a === b
      const isGreater: Comparator<number> = (a, b) => a > b

      expect(isEqual(5, 5)).toBe(true)
      expect(isEqual(5, 3)).toBe(false)
      expect(isGreater(5, 3)).toBe(true)
      expect(isGreater(3, 5)).toBe(false)
    })
  })

  describe('DeepPartial', () => {
    it('should make all properties optional recursively', () => {
      interface User {
        name: string
        age: number
        address: {
          street: string
          city: string
          coordinates: {
            lat: number
            lng: number
          }
        }
        preferences: {
          theme: 'light' | 'dark'
          notifications: boolean
        }
      }

      // These should all be valid DeepPartial<User> objects
      const partial1: DeepPartial<User> = {}
      const partial2: DeepPartial<User> = { name: 'John' }
      const partial3: DeepPartial<User> = {
        address: {
          city: 'New York',
        },
      }
      const partial4: DeepPartial<User> = {
        address: {
          coordinates: {
            lat: 40.7128,
          },
        },
        preferences: {
          theme: 'dark',
        },
      }

      expect(partial1).toEqual({})
      expect(partial2.name).toBe('John')
      expect(partial3.address?.city).toBe('New York')
      expect(partial4.address?.coordinates?.lat).toBe(40.7128)
      expect(partial4.preferences?.theme).toBe('dark')
    })
  })

  describe('Path', () => {
    it('should type an array of string or number keys', () => {
      const stringPath: Path = ['user', 'address', 'city']
      const mixedPath: Path = ['users', 0, 'name']
      const numberPath: Path = [0, 1, 2]

      expect(stringPath).toEqual(['user', 'address', 'city'])
      expect(mixedPath).toEqual(['users', 0, 'name'])
      expect(numberPath).toEqual([0, 1, 2])
    })
  })

  describe('PickKeys', () => {
    it('should pick specified keys from a type', () => {
      interface User {
        id: number
        name: string
        email: string
        password: string
        createdAt: Date
      }

      const publicUser: PickKeys<User, 'id' | 'name' | 'email'> = {
        id: 1,
        name: 'John',
        email: 'john@example.com',
      }

      expect(publicUser).toEqual({
        id: 1,
        name: 'John',
        email: 'john@example.com',
      })
    })
  })

  describe('OmitKeys', () => {
    it('should omit specified keys from a type', () => {
      interface User {
        id: number
        name: string
        email: string
        password: string
        createdAt: Date
      }

      const safeUser: OmitKeys<User, 'password'> = {
        id: 1,
        name: 'John',
        email: 'john@example.com',
        createdAt: new Date(),
      }

      expect(safeUser.id).toBe(1)
      expect(safeUser.name).toBe('John')
      expect(safeUser.email).toBe('john@example.com')
      expect(safeUser.createdAt).toBeInstanceOf(Date)
      // password should not exist on the type
    })
  })

  describe('Type compatibility and usage', () => {
    it('should work together in functional compositions', () => {
      interface User {
        id: number
        name: string
        active: boolean
      }

      const isActive: Predicate<User> = user => user.active
      const getName: UnaryFunction<User, string> = user => user.name
      const compareById: Comparator<User> = (a, b) => a.id === b.id

      const users: User[] = [
        { id: 1, name: 'John', active: true },
        { id: 2, name: 'Jane', active: false },
        { id: 3, name: 'Bob', active: true },
      ]

      const activeUsers = users.filter(isActive)
      const activeNames = activeUsers.map(getName)
      const firstTwoEqual = compareById(users[0]!, users[1]!)

      expect(activeUsers).toHaveLength(2)
      expect(activeNames).toEqual(['John', 'Bob'])
      expect(firstTwoEqual).toBe(false)
    })

    it('should support complex nested structures with DeepPartial', () => {
      interface Config {
        api: {
          baseUrl: string
          timeout: number
          retries: {
            max: number
            delay: number
          }
        }
        ui: {
          theme: 'light' | 'dark'
          language: string
        }
      }

      const partialConfig: DeepPartial<Config> = {
        api: {
          timeout: 5000,
          retries: {
            max: 3,
          },
        },
      }

      expect(partialConfig.api?.timeout).toBe(5000)
      expect(partialConfig.api?.retries?.max).toBe(3)
      expect(partialConfig.ui).toBeUndefined()
    })
  })
})
