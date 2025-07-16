import { describe, it, expect, vi } from 'vitest'
import {
  resolve,
  resolveAll,
  resolveWith,
  resolveIf,
  memoizeResolver,
  apply,
  tap,
  delay,
  retry,
} from './function'

describe('function', () => {
  describe('resolve', () => {
    it('should return value if not a function', () => {
      const resolveValue = resolve(42)
      expect(resolveValue('anything')).toBe(42)
    })

    it('should call function with input if value is a function', () => {
      const resolveFn = resolve((x: number) => x * 2)
      expect(resolveFn(5)).toBe(10)
    })

    it('should work with different types', () => {
      const resolveString = resolve('constant')
      const resolveFnString = resolve((x: number) => `value: ${x}`)

      expect(resolveString(123)).toBe('constant')
      expect(resolveFnString(123)).toBe('value: 123')
    })
  })

  describe('resolveAll', () => {
    it('should resolve all properties in config object', () => {
      interface User {
        name: string
        age: number
      }

      const config = {
        name: 'John' as const,
        age: (user: User) => user.age,
        greeting: (user: User) => `Hello, ${user.name}!`,
        isAdult: (user: User) => user.age >= 18,
      }

      const resolveConfig = resolveAll<User, typeof config>(config)
      const user: User = { name: 'John', age: 25 }
      const result = resolveConfig(user)

      expect(result).toEqual({
        name: 'John',
        age: 25,
        greeting: 'Hello, John!',
        isAdult: true,
      })
    })

    it('should handle empty config', () => {
      const resolveConfig = resolveAll({})
      expect(resolveConfig('input')).toEqual({})
    })

    it('should handle all constant values', () => {
      const config = {
        a: 1,
        b: 'hello',
        c: true,
      }

      const resolveConfig = resolveAll(config)
      expect(resolveConfig('anything')).toEqual({
        a: 1,
        b: 'hello',
        c: true,
      })
    })
  })

  describe('resolveWith', () => {
    it('should create a resolver function for specific input type', () => {
      interface User {
        name: string
        age: number
      }

      const createUserResolver = resolveWith<User>()
      const userConfig = createUserResolver({
        displayName: (user: User) => user.name.toUpperCase(),
        category: 'member',
        canVote: (user: User) => user.age >= 18,
      })

      const user = { name: 'Alice', age: 20 }
      const result = userConfig(user)

      expect(result).toEqual({
        displayName: 'ALICE',
        category: 'member',
        canVote: true,
      })
    })
  })

  describe('resolveIf', () => {
    it('should resolve truthy value when predicate passes', () => {
      const resolveIfPositive = resolveIf(
        (x: number) => x > 0,
        (x: number) => `positive: ${x}`,
        'not positive'
      )

      expect(resolveIfPositive(5)).toBe('positive: 5')
      expect(resolveIfPositive(-3)).toBe('not positive')
      expect(resolveIfPositive(0)).toBe('not positive')
    })

    it('should work with constant values', () => {
      const resolveIfEven = resolveIf((x: number) => x % 2 === 0, 'even', 'odd')

      expect(resolveIfEven(4)).toBe('even')
      expect(resolveIfEven(5)).toBe('odd')
    })

    it('should handle complex predicates', () => {
      interface User {
        name: string
        age: number
        isActive: boolean
      }

      const resolveUserAccess = resolveIf(
        (user: User) => user.age >= 18 && user.isActive,
        (user: User) => `Welcome, ${user.name}!`,
        'Access denied'
      )

      expect(resolveUserAccess({ name: 'Alice', age: 25, isActive: true })).toBe('Welcome, Alice!')
      expect(resolveUserAccess({ name: 'Bob', age: 16, isActive: true })).toBe('Access denied')
      expect(resolveUserAccess({ name: 'Charlie', age: 25, isActive: false })).toBe('Access denied')
    })
  })

  describe('memoizeResolver', () => {
    it('should cache function results', () => {
      const expensiveFunction = vi.fn((x: number) => x * x)
      const memoized = memoizeResolver(expensiveFunction)

      expect(memoized(5)).toBe(25)
      expect(memoized(5)).toBe(25) // Should use cache
      expect(memoized(3)).toBe(9)
      expect(memoized(5)).toBe(25) // Should still use cache

      expect(expensiveFunction).toHaveBeenCalledTimes(2) // Only called for unique inputs
    })

    it('should use custom key function', () => {
      const fn = vi.fn((obj: { id: number; name: string }) => obj.name.toUpperCase())
      const memoized = memoizeResolver(fn, obj => obj.id.toString())

      const obj1 = { id: 1, name: 'alice' }
      const obj2 = { id: 1, name: 'bob' } // Same id, different name
      const obj3 = { id: 2, name: 'charlie' }

      expect(memoized(obj1)).toBe('ALICE')
      expect(memoized(obj2)).toBe('ALICE') // Uses cached result based on id
      expect(memoized(obj3)).toBe('CHARLIE')

      expect(fn).toHaveBeenCalledTimes(2) // Only called for unique ids
    })

    it('should handle complex objects', () => {
      const fn = vi.fn((data: { values: number[] }) =>
        data.values.reduce((sum, val) => sum + val, 0)
      )
      const memoized = memoizeResolver(fn)

      const data1 = { values: [1, 2, 3] }
      const data2 = { values: [1, 2, 3] } // Same content, different object

      expect(memoized(data1)).toBe(6)
      expect(memoized(data2)).toBe(6) // Should use cache due to JSON.stringify

      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('apply', () => {
    it('should return tuple of input and function result', () => {
      const double = (x: number) => x * 2
      const applyDouble = apply(double)

      expect(applyDouble(5)).toEqual([5, 10])
    })

    it('should work with different types', () => {
      const getLength = (str: string) => str.length
      const applyLength = apply(getLength)

      expect(applyLength('hello')).toEqual(['hello', 5])
    })

    it('should preserve original input', () => {
      const obj = { value: 42 }
      const extract = (o: { value: number }) => o.value
      const applyExtract = apply(extract)
      const [original, extracted] = applyExtract(obj)

      expect(original).toBe(obj)
      expect(extracted).toBe(42)
    })
  })

  describe('tap', () => {
    it('should call side effect function and return original value', () => {
      const sideEffects: number[] = []
      const recordValue = tap((x: number) => sideEffects.push(x))

      expect(recordValue(5)).toBe(5)
      expect(recordValue(10)).toBe(10)
      expect(sideEffects).toEqual([5, 10])
    })

    it('should work in a pipeline', () => {
      const logs: string[] = []
      const logStep = tap((x: number) => logs.push(`Processing: ${x}`))

      const pipeline = (x: number) => {
        const step1 = logStep(x)
        const step2 = logStep(step1 * 2)
        return step2 + 1
      }

      expect(pipeline(5)).toBe(11)
      expect(logs).toEqual(['Processing: 5', 'Processing: 10'])
    })

    it('should not affect return value even if side effect throws', () => {
      const throwingTap = tap(() => {
        throw new Error('Side effect error')
      })

      expect(() => throwingTap(42)).toThrow('Side effect error')
    })
  })

  describe('delay', () => {
    it('should delay function execution', async () => {
      const startTime = Date.now()
      const add1 = (x: number) => x + 1
      const delayedAdd1 = delay(100, add1)

      const result = await delayedAdd1(5)
      const endTime = Date.now()

      expect(result).toBe(6)
      expect(endTime - startTime).toBeGreaterThanOrEqual(90) // Allow for slight timing variations
    })

    it('should work with different function types', async () => {
      const uppercase = (str: string) => str.toUpperCase()
      const delayedUppercase = delay(50, uppercase)

      const result = await delayedUppercase('hello')
      expect(result).toBe('HELLO')
    })

    it('should handle zero delay', async () => {
      const identity = (x: number) => x
      const immediateIdentity = delay(0, identity)

      const result = await immediateIdentity(42)
      expect(result).toBe(42)
    })
  })

  describe('retry', () => {
    it('should succeed on first try if function succeeds', async () => {
      const successFn = vi.fn<(input: string) => string>().mockReturnValue('success')
      const retryFn = retry(successFn, 3, 10)

      const result = await retryFn('input')

      expect(result).toBe('success')
      expect(successFn).toHaveBeenCalledTimes(1)
      expect(successFn).toHaveBeenCalledWith('input')
    })

    it('should retry on failure and eventually succeed', async () => {
      const failThenSucceed = vi
        .fn<(input: string) => Promise<string>>()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce('success')

      const retryFn = retry(failThenSucceed, 3, 10)
      const result = await retryFn('input')

      expect(result).toBe('success')
      expect(failThenSucceed).toHaveBeenCalledTimes(3)
    })

    it('should throw after max attempts', async () => {
      const alwaysFail = vi
        .fn<(input: string) => Promise<never>>()
        .mockRejectedValue(new Error('always fails'))
      const retryFn = retry(alwaysFail, 2, 10) // maxAttempts = 2, so 2 calls total

      await expect(retryFn('input')).rejects.toThrow('always fails')
      expect(alwaysFail).toHaveBeenCalledTimes(2) // Two attempts
    })

    it('should respect exponential backoff timing', async () => {
      const startTime = Date.now()
      const failThenSucceed = vi
        .fn<(input: string) => Promise<string>>()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')

      const retryFn = retry(failThenSucceed, 2, 100) // 100ms base delay
      await retryFn('input')
      const endTime = Date.now()

      // Should have delayed at least 100ms (base delay * 2^0)
      expect(endTime - startTime).toBeGreaterThanOrEqual(100)
    })

    it('should work with async functions', async () => {
      const asyncFailThenSucceed = vi
        .fn<(input: string) => Promise<string>>()
        .mockRejectedValueOnce(new Error('async fail'))
        .mockResolvedValue('async success')

      const retryFn = retry(asyncFailThenSucceed, 2, 10)
      const result = await retryFn('input')

      expect(result).toBe('async success')
      expect(asyncFailThenSucceed).toHaveBeenCalledTimes(2)
    })

    it('should handle synchronous functions that return values', async () => {
      const syncFn = vi.fn((x: string) => x.toUpperCase())
      const retryFn = retry(syncFn, 1, 10)

      const result = await retryFn('hello')
      expect(result).toBe('HELLO')
      expect(syncFn).toHaveBeenCalledTimes(1)
    })
  })
})
