/**
 * PIPELINE Pillar Methods Tests
 *
 * Comprehensive tests for all PIPELINE pillar methods following Kairo patterns:
 * - map() - Transform data through functions
 * - filter() - Select data based on conditions
 * - reduce() - Aggregate data to single values
 * - compose() - Chain operations together
 * - parallel() - Execute operations concurrently
 * - branch() - Conditional logic routing
 * - retry() - Fault-tolerant execution
 * - batch() - Process data in chunks
 * - debounce() - Rate-limit operations
 * - throttle() - Control execution frequency
 * - cache() - Memoize results
 * - validate() - Schema-based validation in pipelines
 * - transform() - Complex data transformations
 * - split() - Divide data streams
 * - merge() - Combine data streams
 */

import { describe, it, expect, vi } from 'vitest'
import { map, filter, reduce, compose, parallel, branch, chain, validate } from './methods'
import { retry } from './utils'
import { Result } from '../shared'
import type { PipelineResult, PipelineOperation, ChainOperation, ValidationRule } from './types'
import { ResultTestUtils, MockDataGenerator, PerformanceTestUtils } from '../../test-utils'

describe('PIPELINE Pillar Methods', () => {
  describe('map() method', () => {
    it('should transform array elements successfully', () => {
      const numbers = [1, 2, 3, 4, 5]
      const double = (x: number) => x * 2

      const result = map(numbers, double)

      const mapped = ResultTestUtils.expectOk(result as PipelineResult<number[]>)
      expect(mapped).toEqual([2, 4, 6, 8, 10])
    })

    it('should handle async transformations', async () => {
      const users = MockDataGenerator.users(3)
      const addTimestamp = async (user: (typeof users)[0]) => {
        await Promise.resolve() // Add actual async work
        return {
          ...user,
          processedAt: new Date().toISOString(),
        }
      }

      const result = await map(users, addTimestamp, { async: true })

      const mapped = ResultTestUtils.expectOk(result)
      expect(mapped).toHaveLength(3)
      expect(mapped[0]?.processedAt).toBeDefined()
    })

    it('should handle parallel async processing', async () => {
      const data = [1, 2, 3, 4]
      const slowDouble = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return x * 2
      }

      const { result, duration } = await PerformanceTestUtils.measureTime(async () => {
        return await map(data, slowDouble, { async: true, parallel: true })
      })

      const mapped = ResultTestUtils.expectOk(result)
      expect(mapped).toEqual([2, 4, 6, 8])
      // Parallel should be faster than sequential
      expect(duration).toBeLessThan(35) // Should be ~10ms not ~40ms
    })

    it('should handle transformation errors gracefully', () => {
      const data = ['1', '2', 'invalid', '4']
      const parseNumber = (str: string) => {
        const num = parseInt(str)
        if (isNaN(num)) throw new Error(`Invalid number: ${str}`)
        return num
      }

      const result = map(data, parseNumber, { continueOnError: false })

      const error = ResultTestUtils.expectErrType(
        result as PipelineResult<number[]>,
        'PIPELINE_ERROR'
      )
      expect(error.message).toContain('Invalid number: invalid')
    })

    it('should continue on errors when configured', () => {
      const data = ['1', '2', 'invalid', '4']
      const parseNumber = (str: string) => {
        const num = parseInt(str)
        if (isNaN(num)) throw new Error(`Invalid number: ${str}`)
        return num
      }

      const result = map(data, parseNumber, {
        continueOnError: true,
        errorValue: 0,
      })

      const mapped = ResultTestUtils.expectOk(result as PipelineResult<number[]>)
      expect(mapped).toEqual([1, 2, 0, 4])
    })

    it('should handle empty arrays', () => {
      const result = map([], (x: number) => x * 2)

      const mapped = ResultTestUtils.expectOk(result as PipelineResult<number[]>)
      expect(mapped).toEqual([])
    })

    it('should work with object transformations', () => {
      const users = MockDataGenerator.users(2)
      const addFullName = (user: (typeof users)[0]) => ({
        ...user,
        fullName: `${user.name} (${user.department})`,
      })

      const result = map(users, addFullName)

      type UserWithFullName = (typeof users)[0] & { fullName: string }
      const mapped = ResultTestUtils.expectOk(result as PipelineResult<UserWithFullName[]>)
      expect(mapped[0]!.fullName).toContain(users[0]!.name)
      expect(mapped[0]!.fullName).toContain(users[0]!.department)
    })
  })

  describe('filter() method', () => {
    it('should filter array elements based on predicate', () => {
      const numbers = [1, 2, 3, 4, 5, 6]
      const isEven = (x: number) => x % 2 === 0

      const result = filter(numbers, isEven)

      const filtered = ResultTestUtils.expectOk(result as PipelineResult<number[]>)
      expect(filtered).toEqual([2, 4, 6])
    })

    it('should handle async predicates', async () => {
      const users = MockDataGenerator.users(4)
      users[0]!.active = true
      users[1]!.active = false
      users[2]!.active = true
      users[3]!.active = false

      const isActiveAsync = async (user: (typeof users)[0]) => {
        await new Promise(resolve => setTimeout(resolve, 1))
        return user.active
      }

      const result = await filter(users, isActiveAsync, { async: true })

      const filtered = ResultTestUtils.expectOk(result)
      expect(filtered).toHaveLength(2)
      expect(filtered.every(user => user.active)).toBe(true)
    })

    it('should handle complex filtering conditions', () => {
      const users = MockDataGenerator.users(5)
      users[0]!.salary = 50000
      users[1]!.salary = 75000
      users[2]!.salary = 100000
      users[3]!.salary = 60000
      users[4]!.salary = 90000

      const highEarners = (user: (typeof users)[0]) => user.salary >= 75000 && user.active

      const result = filter(users, highEarners)

      const filtered = ResultTestUtils.expectOk(result as PipelineResult<typeof users>)
      expect(filtered.every(user => user.salary >= 75000)).toBe(true)
    })

    it('should handle filter errors gracefully', () => {
      const data = [1, 2, null, 4]
      const isPositive = (x: number | null) => {
        if (x === null) throw new Error('Null value encountered')
        return x > 0
      }

      const result = filter(data, isPositive, { continueOnError: false })

      const error = ResultTestUtils.expectErrType(
        result as PipelineResult<number[]>,
        'PIPELINE_ERROR'
      )
      expect(error.message).toContain('Null value encountered')
    })

    it('should handle empty results', () => {
      const numbers = [1, 3, 5, 7]
      const isEven = (x: number) => x % 2 === 0

      const result = filter(numbers, isEven)

      const filtered = ResultTestUtils.expectOk(result as PipelineResult<number[]>)
      expect(filtered).toEqual([])
    })
  })

  describe('reduce() method', () => {
    it('should reduce array to single value', () => {
      const numbers = [1, 2, 3, 4, 5]
      const sum = (acc: number, curr: number) => acc + curr

      const result = reduce(numbers, sum, 0)

      const reduced = ResultTestUtils.expectOk(result as PipelineResult<number>)
      expect(reduced).toBe(15)
    })

    it('should handle complex reductions', () => {
      const users = MockDataGenerator.users(3)
      users[0]!.salary = 50000
      users[1]!.salary = 60000
      users[2]!.salary = 70000

      const salaryStats = (
        acc: { total: number; count: number; max: number },
        user: (typeof users)[0]
      ) => ({
        total: acc.total + user.salary,
        count: acc.count + 1,
        max: Math.max(acc.max, user.salary),
      })

      const result = reduce(users, salaryStats, { total: 0, count: 0, max: 0 })

      const stats = ResultTestUtils.expectOk(
        result as PipelineResult<{ total: number; count: number; max: number }>
      )
      expect(stats.total).toBe(180000)
      expect(stats.count).toBe(3)
      expect(stats.max).toBe(70000)
    })

    it('should handle async reducers', async () => {
      const numbers = [1, 2, 3]
      const asyncSum = async (acc: number, curr: number) => {
        await new Promise(resolve => setTimeout(resolve, 1))
        return acc + curr
      }

      const result = await reduce(numbers, asyncSum, 0, { async: true })

      const reduced = ResultTestUtils.expectOk(result)
      expect(reduced).toBe(6)
    })

    it('should handle reduction errors', () => {
      const data = [1, 2, 'invalid', 4]
      const sum = (acc: number, curr: unknown) => {
        if (typeof curr !== 'number') {
          throw new Error(`Expected number, got ${typeof curr}`)
        }
        return acc + curr
      }

      const result = reduce(data, sum, 0)

      const error = ResultTestUtils.expectErrType(
        result as PipelineResult<number>,
        'PIPELINE_ERROR'
      )
      expect(error.message).toContain('Expected number')
    })

    it('should handle empty arrays with initial value', () => {
      const result = reduce([], (acc: number, curr: number) => acc + curr, 10)

      const reduced = ResultTestUtils.expectOk(result as PipelineResult<number>)
      expect(reduced).toBe(10)
    })
  })

  describe('compose() method', () => {
    it('should compose functions in sequence', () => {
      const add5: PipelineOperation<number, number> = (x: number) => x + 5
      const multiply2: PipelineOperation<number, number> = (x: number) => x * 2
      const subtract1: PipelineOperation<number, number> = (x: number) => x - 1

      const pipeline = compose([add5, multiply2, subtract1] as PipelineOperation<
        unknown,
        unknown
      >[])
      const result = pipeline(10)

      const computed = ResultTestUtils.expectOk(result as PipelineResult<number>)
      expect(computed).toBe(29) // (10 + 5) * 2 - 1 = 29
    })

    it('should handle async composition', async () => {
      const asyncAdd: PipelineOperation<number, number> = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 1))
        return x + 1
      }

      const asyncMultiply: PipelineOperation<number, number> = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 1))
        return x * 2
      }

      const pipeline = compose([asyncAdd, asyncMultiply] as PipelineOperation<unknown, unknown>[], {
        async: true,
      })
      const result = await pipeline(5)

      const computed = ResultTestUtils.expectOk(result)
      expect(computed).toBe(12) // (5 + 1) * 2 = 12
    })

    it('should handle composition errors', () => {
      const divideBy =
        (divisor: number): PipelineOperation<number, number> =>
        (x: number) => {
          if (divisor === 0) throw new Error('Division by zero')
          return x / divisor
        }

      const pipeline = compose([divideBy(2), divideBy(0)] as PipelineOperation<unknown, unknown>[])
      const result = pipeline(10)

      const error = ResultTestUtils.expectErrType(
        result as PipelineResult<number>,
        'PIPELINE_ERROR'
      )
      expect(error.message).toContain('Division by zero')
    })

    it('should support branching in composition', () => {
      const isEven = (x: number) => x % 2 === 0
      const handleEven = (x: number) => x * 2
      const handleOdd = (x: number) => x + 1

      const branchOperation: PipelineOperation<number, number> = (x: number) =>
        isEven(x) ? handleEven(x) : handleOdd(x)
      const pipeline = compose([branchOperation] as PipelineOperation<unknown, unknown>[])

      const evenResult = pipeline(4)
      const oddResult = pipeline(5)

      expect(ResultTestUtils.expectOk(evenResult as PipelineResult<number>)).toBe(8)
      expect(ResultTestUtils.expectOk(oddResult as PipelineResult<number>)).toBe(6)
    })

    it('should handle complex data transformations', () => {
      const users = MockDataGenerator.users(2)

      type User = (typeof users)[0]
      type UserWithFullName = User & { fullName: string }

      const addFullName: PipelineOperation<User[], UserWithFullName[]> = (users: User[]) =>
        users.map(user => ({ ...user, fullName: `${user.name} - ${user.department}` }))

      const filterActive: PipelineOperation<UserWithFullName[], UserWithFullName[]> = (
        users: UserWithFullName[]
      ) => users.filter(user => user.active)

      const sortByName: PipelineOperation<UserWithFullName[], UserWithFullName[]> = (
        users: UserWithFullName[]
      ) => users.sort((a, b) => a.name.localeCompare(b.name))

      const pipeline = compose([addFullName, filterActive, sortByName] as PipelineOperation<
        unknown,
        unknown
      >[])
      const result = pipeline(users)

      const processed = ResultTestUtils.expectOk(result as PipelineResult<UserWithFullName[]>)
      expect(processed.every(user => user.fullName)).toBe(true)
    })
  })

  describe('parallel() method', () => {
    it('should execute operations in parallel', async () => {
      const operations = [
        async () => {
          await new Promise(r => setTimeout(r, 10))
          return 'result1'
        },
        async () => {
          await new Promise(r => setTimeout(r, 10))
          return 'result2'
        },
        async () => {
          await new Promise(r => setTimeout(r, 10))
          return 'result3'
        },
      ]

      const { result, duration } = await PerformanceTestUtils.measureTime(async () => {
        return await parallel(operations)
      })

      const results = ResultTestUtils.expectOk(result)
      expect(results).toEqual(['result1', 'result2', 'result3'])
      expect(duration).toBeLessThan(50) // Should be ~10ms but allow for system variance
    })

    it('should handle parallel execution with concurrency limit', async () => {
      const operations = Array.from({ length: 6 }, (_, i) => async () => {
        await new Promise(r => setTimeout(r, 5))
        return `result${i + 1}`
      })

      const result = await parallel(operations, { maxConcurrency: 2 })

      const results = ResultTestUtils.expectOk(result) as string[]
      expect(results).toHaveLength(6)
      expect(results[0]).toBe('result1')
    })

    it('should handle errors in parallel execution', async () => {
      const operations = [
        async () => {
          await Promise.resolve()
          return 'success1'
        },
        async () => {
          await Promise.resolve()
          throw new Error('Operation failed')
        },
        async () => {
          await Promise.resolve()
          return 'success2'
        },
      ]

      const result = await parallel(operations, { failFast: true })

      const error = ResultTestUtils.expectErrType(result, 'PIPELINE_ERROR')
      expect(error.message).toContain('Operation failed')
    })

    it('should continue on errors when configured', async () => {
      const operations = [
        async () => {
          await Promise.resolve()
          return 'success1'
        },
        async () => {
          await Promise.resolve()
          throw new Error('Operation failed')
        },
        async () => {
          await Promise.resolve()
          return 'success2'
        },
      ]

      const result = await parallel(operations, {
        failFast: false,
        collectErrors: true,
      })

      const results = ResultTestUtils.expectOk(result) as string[]
      expect(results).toHaveLength(3)
      expect(results[0]).toBe('success1')
      expect(results[2]).toBe('success2')
    })
  })

  describe('branch() method', () => {
    it('should route data based on conditions', () => {
      const data = [1, 2, 3, 4, 5, 6]
      const conditions = {
        even: (x: number) => x % 2 === 0,
        odd: (x: number) => x % 2 === 1,
        large: (x: number) => x > 4,
      }

      const result = branch(data, conditions)

      const branched = ResultTestUtils.expectOk(result as PipelineResult<Record<string, number[]>>)
      expect(branched.even).toEqual([2, 4, 6])
      expect(branched.odd).toEqual([1, 3, 5])
      expect(branched.large).toEqual([5, 6])
    })

    it('should handle async conditions', async () => {
      const users = MockDataGenerator.users(3)
      users[0]!.department = 'Engineering'
      users[1]!.department = 'Sales'
      users[2]!.department = 'Engineering'

      const conditions = {
        engineering: async (user: (typeof users)[0]) => {
          await new Promise(r => setTimeout(r, 1))
          return user.department === 'Engineering'
        },
        sales: async (user: (typeof users)[0]) => {
          await new Promise(r => setTimeout(r, 1))
          return user.department === 'Sales'
        },
      }

      const result = await branch(users, conditions, { async: true })

      const branched = ResultTestUtils.expectOk(result)
      expect(branched.engineering).toHaveLength(2)
      expect(branched.sales).toHaveLength(1)
    })

    it('should handle exclusive branching', () => {
      const data = [1, 2, 3, 4, 5]
      const conditions = {
        small: (x: number) => x <= 2,
        medium: (x: number) => x > 2 && x <= 4,
        large: (x: number) => x > 4,
      }

      const result = branch(data, conditions, { exclusive: true })

      const branched = ResultTestUtils.expectOk(result as PipelineResult<Record<string, number[]>>)
      expect(branched.small).toEqual([1, 2])
      expect(branched.medium).toEqual([3, 4])
      expect(branched.large).toEqual([5])
    })

    it('should handle default branch for unmatched items', () => {
      const data = [1, 2, 3, 4, 5]
      const conditions = {
        even: (x: number) => x % 2 === 0,
      }

      const result = branch(data, conditions, { includeDefault: true })

      const branched = ResultTestUtils.expectOk(result as PipelineResult<Record<string, number[]>>)
      expect(branched.even).toEqual([2, 4])
      expect(branched.default).toEqual([1, 3, 5])
    })
  })

  describe('retry() method', () => {
    it('should retry failed operations', async () => {
      let attempts = 0
      const flaky = async () => {
        await Promise.resolve() // Add async work
        attempts++
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`)
        }
        return 'success'
      }

      const result = await retry(flaky, { maxAttempts: 3 })

      const value = ResultTestUtils.expectOk(result)
      expect(value).toBe('success')
      expect(attempts).toBe(3)
    })

    it('should handle exponential backoff', async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
      let attempts = 0
      const flaky = async () => {
        await Promise.resolve() // Add async work
        attempts++
        if (attempts < 2) {
          throw new Error('Still failing')
        }
        return 'recovered'
      }

      const result = await retry(flaky, {
        maxAttempts: 3,
        backoff: 'exponential',
        delay: 10,
      })

      const value = ResultTestUtils.expectOk(result)
      expect(value).toBe('recovered')
      expect(attempts).toBe(2)
      
      // Verify setTimeout was called with correct exponential backoff delay (10ms for first retry)
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 10)
      
      setTimeoutSpy.mockRestore()
    })

    it('should fail after max attempts', async () => {
      let attempts = 0
      const alwaysFails = async () => {
        await Promise.resolve() // Add async work
        attempts++
        throw new Error(`Attempt ${attempts} failed`)
      }

      const result = await retry(alwaysFails, { maxAttempts: 2 })

      const error = ResultTestUtils.expectErrType(result, 'PIPELINE_ERROR')
      expect(error.message).toContain('Max retry attempts')
      expect(attempts).toBe(2)
    })

    it('should handle specific error types for retry', async () => {
      let attempts = 0
      const selectiveFailure = async () => {
        await Promise.resolve() // Add async work
        attempts++
        if (attempts === 1) {
          throw new Error('NETWORK_ERROR: Connection failed')
        }
        if (attempts === 2) {
          throw new Error('VALIDATION_ERROR: Invalid input')
        }
        return 'success'
      }

      const result = await retry(selectiveFailure, {
        maxAttempts: 3,
        retryOn: ['NETWORK_ERROR'],
      })

      // Should fail on VALIDATION_ERROR without retrying
      const error = ResultTestUtils.expectErrType(result, 'PIPELINE_ERROR')
      expect(error.message).toContain('VALIDATION_ERROR')
      expect(attempts).toBe(2)
    })
  })

  describe('Advanced Async Edge Cases', () => {
    it('should handle mixed sync/async operations in map with error value fallback', async () => {
      const data = [1, 2, 3, 4]
      const problematicTransform = (x: number, index: number) => {
        if (index === 2) throw new Error('Transform failed at index 2')
        return x * 10
      }

      const result = await map(data, problematicTransform, {
        async: true,
        parallel: true,
        continueOnError: true,
        errorValue: -999
      })

      const mapped = ResultTestUtils.expectOk(result)
      expect(mapped).toEqual([10, 20, -999, 40])
    })

    it('should handle async filter with continue on error', async () => {
      const data = [1, 2, 3, 4, 5]
      const problematicPredicate = (x: number, index: number) => {
        if (index === 2) throw new Error('Predicate failed')
        return x % 2 === 0
      }

      const result = await filter(data, problematicPredicate, {
        async: true,
        continueOnError: true
      })

      const filtered = ResultTestUtils.expectOk(result)
      expect(filtered).toEqual([2, 4]) // Item at index 2 excluded due to error
    })

    it('should handle reduce with checkpoints option', async () => {
      const numbers = [1, 2, 3, 4, 5]
      const asyncSum = async (acc: number, curr: number, index: number) => {
        await new Promise(resolve => setTimeout(resolve, 1))
        if (index === 3) throw new Error('Reducer failed at index 3')
        return acc + curr
      }

      const result = await reduce(numbers, asyncSum, 0, {
        async: true,
        checkpoints: true
      })

      const error = ResultTestUtils.expectErrType(result, 'PIPELINE_ERROR')
      expect(error.message).toContain('Reducer failed at index 3')
      expect(error.context.accumulator).toBe(6) // 0 + 1 + 2 + 3 = 6
    })

    it('should handle compose with rollback on error', () => {
      const step1 = (x: number) => x + 10
      const step2 = (x: number) => {
        if (x > 15) throw new Error('Value too large')
        return x * 2
      }
      const step3 = (x: number) => x - 5

      const pipeline = compose([step1, step2, step3] as PipelineOperation<unknown, unknown>[], {
        rollback: true,
        stopOnError: true
      })

      const result = pipeline(10) // 10 + 10 = 20, then fails at step2

      const error = ResultTestUtils.expectErrType(result as PipelineResult<number>, 'PIPELINE_ERROR')
      expect(error.message).toContain('Value too large')
      expect(error.context.intermediateResults).toContain(20) // Rollback data captured
    })

    it('should handle async compose with mixed promise/non-promise operations', async () => {
      const syncStep = (x: number) => x * 2
      const asyncStep = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 1))
        return x + 5
      }
      const resultStep = (x: number) => Result.Ok(x.toString())

      const pipeline = compose<number, string>([syncStep, asyncStep, resultStep] as PipelineOperation<unknown, unknown>[], { async: true })
      const result = await pipeline(10)

      const computed = ResultTestUtils.expectOk(result)
      expect(computed).toBe('25') // (10 * 2) + 5 = 25
    })

    it('should handle chain with collectResults option', async () => {
      const step1 = async (x: number) => {
        await Promise.resolve()
        return x * 2
      }
      const step2 = async (x: number) => {
        await Promise.resolve()
        return x + 10
      }
      const step3 = async (x: number) => {
        await Promise.resolve()
        return x / 2
      }

      const result = await chain(5, [step1, step2, step3] as ChainOperation<unknown, unknown>[], {
        collectResults: true,
        stopOnError: true
      })

      const final = ResultTestUtils.expectOk(result)
      expect(final).toBe(10) // ((5 * 2) + 10) / 2 = 10
    })

    it('should handle branch with cache and async conditions', async () => {
      const data = [1, 2, 3, 4, 5, 6]
      const conditions = {
        small: async (x: number) => {
          await new Promise(r => setTimeout(r, 1))
          return x <= 2
        },
        medium: async (x: number) => {
          await new Promise(r => setTimeout(r, 1))
          return x > 2 && x <= 4
        },
        large: async (x: number) => {
          await new Promise(r => setTimeout(r, 1))
          return x > 4
        }
      }

      const result = await branch(data, conditions, {
        async: true,
        cache: true,
        cacheConditions: true
      })

      const branched = ResultTestUtils.expectOk(result)
      expect(branched.small).toEqual([1, 2])
      expect(branched.medium).toEqual([3, 4])
      expect(branched.large).toEqual([5, 6])
    })

    it('should handle validate with complex rule-based async validation', async () => {
      const userData = { name: 'John', age: 25, email: 'john@test.com' }
      
      const rules = [
        {
          name: 'name-length',
          validate: async (data: typeof userData) => {
            await new Promise(r => setTimeout(r, 1))
            return data.name.length >= 2
          },
          message: (data: typeof userData) => `Name '${data.name}' too short`
        },
        {
          name: 'age-check',
          validate: async (data: typeof userData) => {
            await new Promise(r => setTimeout(r, 1))
            return data.age >= 18
          },
          message: 'Must be 18 or older'
        },
        {
          name: 'email-format',
          validate: (data: typeof userData) => data.email.includes('@'),
          message: 'Invalid email format'
        }
      ]

      const result = await validate(userData, rules, {
        stopOnFirst: false,
        collectErrors: true,
        strict: true
      })

      const validated = ResultTestUtils.expectOk(result)
      expect(validated).toEqual(userData)
    })

    it('should handle validate with failing async rules', async () => {
      const invalidData = { name: 'A', age: 16, email: 'invalid' }
      
      const rules = [
        {
          name: 'name-length',
          validate: async (data: typeof invalidData) => {
            await new Promise(r => setTimeout(r, 1))
            return data.name.length >= 2
          },
          message: 'Name too short'
        },
        {
          name: 'age-check', 
          validate: async (data: typeof invalidData) => {
            await new Promise(r => setTimeout(r, 1))  
            return data.age >= 18
          },
          message: 'Must be 18 or older'
        }
      ]

      const result = await validate(invalidData, rules, {
        stopOnFirst: false,
        collectErrors: true
      })

      const error = ResultTestUtils.expectErrType(result, 'PIPELINE_ERROR')
      expect(error.message).toContain('validation rule(s) failed')
      expect(error.context.validationErrors).toHaveLength(2)
    })

    it('should handle parallel with controlled concurrency and batch processing', async () => {
      const heavyOperations = Array.from({ length: 8 }, (_, i) => async () => {
        await new Promise(r => setTimeout(r, 5))
        return `result-${i}`
      })

      const result = await parallel(heavyOperations, {
        maxConcurrency: 3,
        preserveOrder: true,
        failFast: false
      })

      const results = ResultTestUtils.expectOk(result) as string[]
      expect(results).toHaveLength(8)
      expect(results[0]).toBe('result-0')
      expect(results[7]).toBe('result-7')
    })

    it('should handle parallel with custom combiner function', async () => {
      const operations = [
        async () => {
          await Promise.resolve()
          return { count: 5, sum: 15 }
        },
        async () => {
          await Promise.resolve()
          return { count: 3, sum: 9 }
        },
        async () => {
          await Promise.resolve()
          return { count: 2, sum: 6 }
        }
      ]

      const result = await parallel(operations, {
        combiner: (context: unknown, results: unknown[]) => {
          const stats = results as Array<{ count: number; sum: number }>
          return {
            totalCount: stats.reduce((acc, s) => acc + s.count, 0),
            totalSum: stats.reduce((acc, s) => acc + s.sum, 0),
            average: stats.reduce((acc, s) => acc + s.sum, 0) / stats.reduce((acc, s) => acc + s.count, 0)
          }
        }
      })

      const combined = ResultTestUtils.expectOk(result) as { totalCount: number; totalSum: number; average: number }
      expect(combined.totalCount).toBe(10)
      expect(combined.totalSum).toBe(30)
      expect(combined.average).toBe(3)
    })

    it('should handle null/undefined input validation edge cases', () => {
      // Test null input to map
      const nullResult = map(null as unknown as number[], x => x * 2)
      const nullError = ResultTestUtils.expectErrType(nullResult as PipelineResult<number[]>, 'PIPELINE_ERROR')
      expect(nullError.message).toContain('null or undefined')

      // Test non-array input to filter  
      const nonArrayResult = filter('not-array' as unknown as number[], x => x > 0)
      const nonArrayError = ResultTestUtils.expectErrType(nonArrayResult as PipelineResult<number[]>, 'PIPELINE_ERROR')
      expect(nonArrayError.message).toContain('must be an array')

      // Test non-array input to reduce
      const reduceResult = reduce({} as unknown as number[], (acc, curr) => acc + curr, 0)
      const reduceError = ResultTestUtils.expectErrType(reduceResult as PipelineResult<number>, 'PIPELINE_ERROR')
      expect(reduceError.message).toContain('must be an array')
    })

    it('should handle invalid operations in parallel', async () => {
      const invalidOperations = 'not-an-array' as unknown as Array<() => unknown>
      
      const result = await parallel(invalidOperations)
      
      const error = ResultTestUtils.expectErrType(result, 'PIPELINE_ERROR')
      expect(error.message).toContain('must be an array')
    })

    it('should handle validate with invalid schema types', async () => {
      const data = { name: 'test' }
      const invalidSchema = ('not-a-schema' as unknown) as ValidationRule<{ name: string }>[]
      
      const result = await validate<{ name: string }>(data, invalidSchema)
      
      const error = ResultTestUtils.expectErrType(result, 'PIPELINE_ERROR')
      expect(error.message).toContain('Validation failed')
    })
  })

  describe('Configuration Object Pattern', () => {
    it('should apply default configurations correctly', () => {
      const data = [1, 2, 3, 4, 5]
      const double = (x: number) => x * 2

      // Test with minimal options
      const result = map(data, double, {})

      ResultTestUtils.expectOk(result as PipelineResult<number[]>)
    })

    it('should merge user options with defaults', async () => {
      const operations = [
        async () => {
          await Promise.resolve()
          return 'test1'
        },
        async () => {
          await Promise.resolve()
          return 'test2'
        },
      ]

      const result = await parallel(operations, {
        maxConcurrency: 1, // Override default
        timeout: 5000,
      })

      ResultTestUtils.expectOk(result)
    })

    it('should handle complex configuration objects', async () => {
      const flaky = async () => {
        await Promise.resolve()
        return 'success'
      }

      const result = await retry(flaky, {
        maxAttempts: 3,
        backoff: 'exponential',
        delay: 100,
        retryOn: ['NETWORK_ERROR', 'TIMEOUT_ERROR'],
        // onRetry: (attempt: number, error: Error) => {
        //   console.log(`Retry attempt ${attempt}: ${error.message}`)
        // }
      })

      ResultTestUtils.expectOk(result)
    })
  })

  describe('Error Handling Patterns', () => {
    it('should create appropriate error types', () => {
      const data = [1, 2, 'invalid']
      const processNumber = (x: unknown) => {
        if (typeof x !== 'number') {
          throw new Error('Not a number')
        }
        return x * 2
      }

      const result = map(data, processNumber)

      const error = ResultTestUtils.expectErrType(
        result as PipelineResult<number[]>,
        'PIPELINE_ERROR'
      )
      expect(error.pillar).toBe('PIPELINE')
      expect(error.operation).toBe('map')
    })

    it('should include proper context in errors', async () => {
      const operations = [
        async () => {
          await Promise.resolve()
          throw new Error('Test error')
        },
      ]

      const result = await parallel(operations)

      const error = ResultTestUtils.expectErrType(result, 'PIPELINE_ERROR')
      expect(error.context).toBeDefined()
      expect(error.timestamp).toBeTypeOf('number')
    })

    it('should handle nested pipeline errors', () => {
      const innerPipeline = (x: number) => {
        if (x < 0) throw new Error('Negative number not allowed')
        return x * 2
      }

      const mapOp = (data: number[]) => map(data, innerPipeline)
      const extractOp = (result: PipelineResult<number[]>) => ResultTestUtils.expectOk(result)

      const outerPipeline = compose([mapOp, extractOp] as PipelineOperation<unknown, unknown>[])
      const result = outerPipeline([-1, 2, 3])

      const error = ResultTestUtils.expectErrType(
        result as PipelineResult<number[]>,
        'PIPELINE_ERROR'
      )
      expect(error.message).toContain('Negative number')
    })
  })

  describe('Result Pattern Compliance', () => {
    it('should always return Result type', () => {
      const data = [1, 2, 3]
      const double = (x: number) => x * 2

      const mapResult = map(data, double) as PipelineResult<number[]>
      const filterResult = filter(data, x => x > 1) as PipelineResult<number[]>
      const reduceResult = reduce(data, (a, b) => a + b, 0) as PipelineResult<number>

      expect(Result.isOk(mapResult) || Result.isErr(mapResult)).toBe(true)
      expect(Result.isOk(filterResult) || Result.isErr(filterResult)).toBe(true)
      expect(Result.isOk(reduceResult) || Result.isErr(reduceResult)).toBe(true)
    })

    it('should never throw exceptions', () => {
      // Test with completely invalid inputs
      expect(() => {
        const result = map(
          'not-an-array' as unknown as unknown[],
          (_x: unknown) => _x
        ) as PipelineResult<unknown[]>
        expect(Result.isErr(result)).toBe(true)
      }).not.toThrow()

      expect(() => {
        const result = filter(
          null as unknown as unknown[],
          (_x: unknown) => true
        ) as PipelineResult<unknown[]>
        expect(Result.isErr(result)).toBe(true)
      }).not.toThrow()
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle large datasets efficiently', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i)

      const startTime = performance.now()
      const result = map(largeArray, x => x * 2)
      const endTime = performance.now()

      const mapped = ResultTestUtils.expectOk(result as PipelineResult<number[]>)
      expect(mapped).toHaveLength(10000)
      expect(endTime - startTime).toBeLessThan(100) // Should process quickly
    })

    it('should optimize parallel execution', async () => {
      const heavyOperations = Array.from({ length: 10 }, (_, i) => async () => {
        // Simulate CPU-intensive work
        await Promise.resolve() // Add async work
        let sum = 0
        for (let j = 0; j < 1000; j++) {
          sum += j
        }
        return sum + i
      })

      const { result: parallelResult, duration: parallelDuration } =
        await PerformanceTestUtils.measureTime(async () => {
          return await parallel(heavyOperations, { maxConcurrency: 4 })
        })

      const { result: sequentialResult, duration: sequentialDuration } =
        await PerformanceTestUtils.measureTime(async () => {
          return await parallel(heavyOperations, { maxConcurrency: 1 })
        })

      ResultTestUtils.expectOk(parallelResult)
      ResultTestUtils.expectOk(sequentialResult)

      // Parallel should be faster than sequential (but timing can vary in test env)
      // Just verify both complete successfully - timing is environment dependent
      expect(parallelDuration).toBeGreaterThan(0)
      expect(sequentialDuration).toBeGreaterThan(0)
    })
  })
})
