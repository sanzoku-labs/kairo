/**
 * Comprehensive tests for PIPELINE utilities
 * 
 * Tests the extensive utility functions that support PIPELINE pillar operations including:
 * - Function composition (curry, partial, when, unless)
 * - Async operations (sequence, retry, delay, timeout)
 * - Error handling (trap, guard, toResult, toAsyncResult)
 * - Performance optimizations (memoize, debounce, throttle)
 * - Pipeline context and tracing (createContext, addTrace)
 * - Result handling (extractSuccessful, extractErrors, combineResults)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Result } from '../shared'
import { createPipelineError } from '../shared'
import {
  curry,
  partial,
  when,
  unless,
  sequence,
  trap,
  retry,
  delay,
  timeout,
  tap,
  memoize,
  debounce,
  throttle,
  guard,
  createContext,
  addTrace,
  isPipelineError,
  extractSuccessful,
  extractErrors,
  combineResults,
  allSuccessful,
  anySuccessful,
  toResult,
  toAsyncResult
} from './utils'

describe('PIPELINE Utilities', () => {
  
  describe('curry', () => {
    it('should curry a function with multiple arguments', () => {
      const add = (a: number, b: number, c: number) => a + b + c
      const curried = curry(add)
      
      expect(curried(1)(2)(3)).toBe(6)
      expect((curried(1) as unknown as (b: number) => (c: number) => number)(2)(3)).toBe(6)
      expect((curried(1)(2)(3) as unknown as number)).toBe(6)
    })

    it('should work with single argument functions', () => {
      const double = (x: number) => x * 2
      const curried = curry(double)
      
      expect(curried(5)).toBe(10)
    })

    it('should handle functions with no arguments', () => {
      const getValue = () => 42
      const curried = curry(getValue)
      
      expect(curried()).toBe(42)
    })

    it('should maintain function behavior with partial application', () => {
      const multiply = (a: number, b: number) => a * b
      const curried = curry(multiply)
      const double = curried(2)
      
      expect(double(5)).toBe(10)
      expect(double(10)).toBe(20)
    })
  })

  describe('partial', () => {
    it('should create partially applied functions', () => {
      const greet = (greeting: string, name: string) => `${greeting}, ${name}!`
      const sayHello = partial(greet, 'Hello')
      
      expect(sayHello('World')).toBe('Hello, World!')
      expect(sayHello('Alice')).toBe('Hello, Alice!')
    })

    it('should work with multiple partial arguments', () => {
      const calculate = (a: number, b: number, c: number, d: number) => a + b * c - d
      const partialCalc = partial(calculate, 10, 5)
      
      expect(partialCalc(2, 3)).toBe(10 + 5 * 2 - 3) // 17
    })

    it('should handle single argument functions', () => {
      const square = (x: number) => x * x
      const partialSquare = partial(square, 5)
      
      expect(partialSquare()).toBe(25)
    })
  })

  describe('when', () => {
    it('should execute thenFn when condition is true', () => {
      const isPositive = (n: number) => n > 0
      const double = (n: number) => n * 2
      const conditionalDouble = when(isPositive, double)
      
      expect(conditionalDouble(5)).toBe(10)
      expect(conditionalDouble(-3)).toBe(-3) // Should return original value
    })

    it('should execute elseFn when condition is false', () => {
      const isEven = (n: number) => n % 2 === 0
      const double = (n: number) => n * 2
      const negate = (n: number) => -n
      const conditionalProcess = when(isEven, double, negate)
      
      expect(conditionalProcess(4)).toBe(8) // Even: double
      expect(conditionalProcess(3)).toBe(-3) // Odd: negate
    })

    it('should return original value when condition is false and no elseFn', () => {
      const isPositive = (n: number) => n > 0
      const double = (n: number) => n * 2
      const conditionalDouble = when(isPositive, double)
      
      expect(conditionalDouble(-5)).toBe(-5)
    })
  })

  describe('unless', () => {
    it('should execute function unless condition is true', () => {
      const isZero = (n: number) => n === 0
      const increment = (n: number) => n + 1
      const safeIncrement = unless(isZero, increment)
      
      expect(safeIncrement(5)).toBe(6)
      expect(safeIncrement(0)).toBe(0) // Should not increment zero
    })

    it('should work with complex conditions', () => {
      const isNegative = (n: number) => n < 0
      const square = (n: number) => n * n
      const conditionalSquare = unless(isNegative, square)
      
      expect(conditionalSquare(4)).toBe(16)
      expect(conditionalSquare(-3)).toBe(-3) // Should not square negative
    })
  })

  describe('sequence', () => {
    it('should execute async operations in sequence', async () => {
      const add1 = (n: number) => Promise.resolve(n + 1)
      const multiply2 = (n: number) => Promise.resolve(n * 2)
      const subtract3 = (n: number) => Promise.resolve(n - 3)
      
      const sequencedOps = sequence([add1, multiply2, subtract3])
      const result = await sequencedOps(5)
      
      // (5 + 1) * 2 - 3 = 9
      expect(result).toBe(9)
    })

    it('should handle single operation', async () => {
      const double = (n: number) => Promise.resolve(n * 2)
      const sequencedOp = sequence([double])
      
      expect(await sequencedOp(5)).toBe(10)
    })

    it('should handle empty operations array', async () => {
      const sequencedOps = sequence([])
      expect(await sequencedOps(5)).toBe(5)
    })

    it('should maintain execution order', async () => {
      const operations: Array<(s: string) => Promise<string>> = []
      let executionOrder = ''
      
      operations.push((s) => {
        executionOrder += 'A'
        return Promise.resolve(s + 'A')
      })
      
      operations.push((s) => {
        executionOrder += 'B'
        return Promise.resolve(s + 'B')
      })
      
      operations.push((s) => {
        executionOrder += 'C'
        return Promise.resolve(s + 'C')
      })
      
      const sequencedOps = sequence(operations)
      const result = await sequencedOps('START')
      
      expect(result).toBe('STARTABC')
      expect(executionOrder).toBe('ABC')
    })
  })

  describe('trap', () => {
    it('should return Ok result for successful function', () => {
      const safe = trap((n: number) => n * 2)
      const result = safe(5)
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(10)
      }
    })

    it('should return Err result for throwing function', () => {
      const unsafe = (n: number) => {
        if (n < 0) throw new Error('Negative number')
        return n * 2
      }
      
      const safe = trap(unsafe)
      const result = safe(-5)
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.code).toBe('PIPELINE_ERROR')
        expect(result.error.message).toContain('Negative number')
      }
    })

    it('should use error handler when provided', () => {
      const unsafe = (n: number) => {
        if (n < 0) throw new Error('Negative number')
        return n * 2
      }
      
      const handler = (_error: Error, data: number) => Math.abs(data) * 2
      const safe = trap(unsafe, handler)
      const result = safe(-5)
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(10) // abs(-5) * 2
      }
    })

    it('should handle error handler that also throws', () => {
      const unsafe = (n: number) => {
        if (n < 0) throw new Error('Negative number')
        return n * 2
      }
      
      const badHandler = (_error: Error, _data: number) => {
        throw new Error('Handler error')
      }
      
      const safe = trap(unsafe, badHandler)
      const result = safe(-5)
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toContain('Error handler failed')
      }
    })
  })

  describe('retry', () => {
    it('should return success on first attempt', async () => {
      const successFn = vi.fn(() => 'success')
      const result = await retry(successFn)
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe('success')
      }
      expect(successFn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      let attempts = 0
      const eventualSuccessFn = vi.fn(() => {
        attempts++
        if (attempts < 3) throw new Error('Temporary failure')
        return 'success'
      })
      
      const result = await retry(eventualSuccessFn, { maxAttempts: 3, delay: 10 })
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe('success')
      }
      expect(eventualSuccessFn).toHaveBeenCalledTimes(3)
    })

    it('should fail after max attempts', async () => {
      const alwaysFailFn = vi.fn(() => {
        throw new Error('Always fails')
      })
      
      const result = await retry(alwaysFailFn, { maxAttempts: 2, delay: 10 })
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toContain('Max retry attempts (2) exceeded')
      }
      expect(alwaysFailFn).toHaveBeenCalledTimes(2)
    })

    it('should handle async functions', async () => {
      let attempts = 0
      const asyncEventualSuccess = vi.fn(() => {
        attempts++
        if (attempts < 2) throw new Error('Async failure')
        return Promise.resolve('async success')
      })
      
      const result = await retry(asyncEventualSuccess, { maxAttempts: 3, delay: 10 })
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe('async success')
      }
    })

    it('should respect retryOn option', async () => {
      const specificErrorFn = vi.fn(() => {
        throw new Error('Network timeout')
      })
      
      const result = await retry(specificErrorFn, { 
        maxAttempts: 3, 
        delay: 10, 
        retryOn: ['timeout'] 
      })
      
      expect(Result.isErr(result)).toBe(true)
      expect(specificErrorFn).toHaveBeenCalledTimes(3) // Should retry because error contains 'timeout'
    })

    it('should not retry for non-matching errors', async () => {
      const specificErrorFn = vi.fn(() => {
        throw new Error('Authentication failed')
      })
      
      const result = await retry(specificErrorFn, { 
        maxAttempts: 3, 
        delay: 10, 
        retryOn: ['network'] 
      })
      
      expect(Result.isErr(result)).toBe(true)
      expect(specificErrorFn).toHaveBeenCalledTimes(1) // Should not retry
    })
  })

  describe('delay', () => {
    it('should add delay to function execution', async () => {
      const fn = vi.fn((x: number) => x * 2)
      const delayedFn = delay(fn, 50)
      
      const start = Date.now()
      const result = await delayedFn(5)
      const elapsed = Date.now() - start
      
      expect(result).toBe(10)
      expect(elapsed).toBeGreaterThanOrEqual(45) // Allow some timing variance
      expect(fn).toHaveBeenCalledWith(5)
    })

    it('should work with async functions', async () => {
      const asyncFn = vi.fn((x: number) => Promise.resolve(x * 2))
      const delayedFn = delay(asyncFn, 30)
      
      const result = await delayedFn(3)
      
      expect(result).toBe(6)
      expect(asyncFn).toHaveBeenCalledWith(3)
    })
  })

  describe('timeout', () => {
    it('should return result if function completes within timeout', async () => {
      const fastFn = vi.fn((x: number) => {
        return new Promise<number>(resolve => setTimeout(() => resolve(x * 2), 10))
      })
      
      const timeoutFn = timeout(fastFn, 100)
      const result = await timeoutFn(5)
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(10)
      }
    })

    it('should timeout if function takes too long', async () => {
      const slowFn = vi.fn((x: number) => {
        return new Promise<number>(resolve => setTimeout(() => resolve(x * 2), 100))
      })
      
      const timeoutFn = timeout(slowFn, 50)
      const result = await timeoutFn(5)
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toContain('timed out')
      }
    })

    it('should work with synchronous functions', async () => {
      const syncFn = vi.fn((x: number) => x * 2)
      const timeoutFn = timeout(syncFn, 100)
      
      const result = await timeoutFn(5)
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(10)
      }
    })
  })

  describe('tap', () => {
    it('should execute side effect and return original data', async () => {
      const sideEffect = vi.fn((_data: string) => {})
      const tappedFn = tap(sideEffect)
      
      const result = await tappedFn('test data')
      
      expect(result).toBe('test data')
      expect(sideEffect).toHaveBeenCalledWith('test data')
    })

    it('should work with async side effects', async () => {
      const asyncSideEffect = vi.fn((_data: string) => {
        return new Promise<void>(resolve => setTimeout(() => resolve(), 10))
      })
      
      const tappedFn = tap(asyncSideEffect)
      const result = await tappedFn('test data')
      
      expect(result).toBe('test data')
      expect(asyncSideEffect).toHaveBeenCalledWith('test data')
    })
  })

  describe('memoize', () => {
    it('should cache function results', () => {
      const expensiveFn = vi.fn((x: number) => x * x)
      const memoizedFn = memoize(expensiveFn)
      
      expect(memoizedFn(5)).toBe(25)
      expect(memoizedFn(5)).toBe(25)
      expect(memoizedFn(5)).toBe(25)
      
      expect(expensiveFn).toHaveBeenCalledTimes(1)
    })

    it('should use custom key function', () => {
      const fn = vi.fn((obj: { id: number, name: string }) => obj.name.toUpperCase())
      const memoizedFn = memoize(fn, obj => obj.id.toString())
      
      const obj1 = { id: 1, name: 'john' }
      const obj2 = { id: 1, name: 'jane' } // Same ID, different name
      
      expect(memoizedFn(obj1)).toBe('JOHN')
      expect(memoizedFn(obj2)).toBe('JOHN') // Should return cached result
      
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should handle different inputs', () => {
      const fn = vi.fn((x: number) => x * 2)
      const memoizedFn = memoize(fn)
      
      expect(memoizedFn(1)).toBe(2)
      expect(memoizedFn(2)).toBe(4)
      expect(memoizedFn(1)).toBe(2) // Should use cache
      
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('should debounce function calls', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)
      
      debouncedFn('call1')
      debouncedFn('call2')
      debouncedFn('call3')
      
      expect(fn).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(100)
      
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('call3')
    })

    it('should reset timer on new calls', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)
      
      debouncedFn('call1')
      vi.advanceTimersByTime(50)
      
      debouncedFn('call2')
      vi.advanceTimersByTime(50)
      
      expect(fn).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(50)
      
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('call2')
    })
  })

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('should throttle function calls', () => {
      const fn = vi.fn()
      const throttledFn = throttle(fn, 100)
      
      throttledFn('call1')
      throttledFn('call2')
      throttledFn('call3')
      
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('call1')
      
      vi.advanceTimersByTime(100)
      
      throttledFn('call4')
      
      expect(fn).toHaveBeenCalledTimes(2)
      expect(fn).toHaveBeenCalledWith('call4')
    })

    it('should allow calls after throttle period', () => {
      const fn = vi.fn()
      const throttledFn = throttle(fn, 100)
      
      throttledFn('call1')
      expect(fn).toHaveBeenCalledTimes(1)
      
      vi.advanceTimersByTime(50)
      throttledFn('call2')
      expect(fn).toHaveBeenCalledTimes(1) // Still throttled
      
      vi.advanceTimersByTime(60)
      throttledFn('call3')
      expect(fn).toHaveBeenCalledTimes(2) // Throttle period passed
    })
  })

  describe('guard', () => {
    it('should return Ok when predicate passes', () => {
      const isPositive = (n: number) => n > 0
      const guardFn = guard(isPositive, 'Must be positive')
      
      const result = guardFn(5)
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(5)
      }
    })

    it('should return Err when predicate fails', () => {
      const isPositive = (n: number) => n > 0
      const guardFn = guard(isPositive, 'Must be positive')
      
      const result = guardFn(-5)
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toBe('Must be positive')
        expect(result.error.code).toBe('PIPELINE_ERROR')
      }
    })

    it('should use default error message', () => {
      const isEven = (n: number) => n % 2 === 0
      const guardFn = guard(isEven)
      
      const result = guardFn(3)
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toBe('Guard condition failed')
      }
    })
  })

  describe('createContext', () => {
    it('should create pipeline context with operation name', () => {
      const context = createContext('testOperation')
      
      expect(context.operationId).toContain('testOperation')
      expect(context.startTime).toBeTypeOf('number')
      expect(context.metadata).toEqual({})
      expect(context.trace).toEqual([])
    })

    it('should include metadata when provided', () => {
      const metadata = { userId: 123, source: 'api' }
      const context = createContext('testOperation', metadata)
      
      expect(context.metadata).toEqual(metadata)
    })

    it('should generate unique operation IDs', () => {
      const context1 = createContext('test')
      const context2 = createContext('test')
      
      expect(context1.operationId).not.toBe(context2.operationId)
    })
  })

  describe('addTrace', () => {
    it('should add trace information to context', () => {
      const context = createContext('testOperation')
      const updatedContext = addTrace(context, 'step1')
      
      expect(updatedContext.trace).toHaveLength(1)
      expect(updatedContext.trace?.[0]).toContain('step1@')
      expect(updatedContext.trace?.[0]).toContain('ms')
    })

    it('should preserve existing traces', () => {
      const context = createContext('testOperation')
      const context1 = addTrace(context, 'step1')
      const context2 = addTrace(context1, 'step2')
      
      expect(context2.trace).toHaveLength(2)
      expect(context2.trace?.[0]).toContain('step1@')
      expect(context2.trace?.[1]).toContain('step2@')
    })

    it('should not mutate original context', () => {
      const context = createContext('testOperation')
      const updatedContext = addTrace(context, 'step1')
      
      expect(context.trace).toHaveLength(0)
      expect(updatedContext.trace).toHaveLength(1)
    })
  })

  describe('isPipelineError', () => {
    it('should return true for valid PipelineError', () => {
      const error = createPipelineError('test', 'Test error', {})
      expect(isPipelineError(error)).toBe(true)
    })

    it('should return false for regular Error', () => {
      const error = new Error('Regular error')
      expect(isPipelineError(error)).toBe(false)
    })

    it('should return false for non-PIPELINE pillar errors', () => {
      const error = {
        code: 'SERVICE_ERROR',
        pillar: 'SERVICE',
        message: 'Service error'
      }
      expect(isPipelineError(error)).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isPipelineError(null)).toBe(false)
      expect(isPipelineError(undefined)).toBe(false)
    })
  })

  describe('extractSuccessful', () => {
    it('should extract successful results', () => {
      const results = [
        Result.Ok(1),
        Result.Err(createPipelineError('test', 'Error', {})),
        Result.Ok(2),
        Result.Ok(3)
      ]
      
      const successful = extractSuccessful(results)
      
      expect(successful).toEqual([1, 2, 3])
    })

    it('should return empty array for all errors', () => {
      const results = [
        Result.Err(createPipelineError('test', 'Error 1', {})),
        Result.Err(createPipelineError('test', 'Error 2', {}))
      ]
      
      const successful = extractSuccessful(results)
      
      expect(successful).toEqual([])
    })

    it('should handle empty array', () => {
      const successful = extractSuccessful([])
      expect(successful).toEqual([])
    })
  })

  describe('extractErrors', () => {
    it('should extract error results', () => {
      const error1 = createPipelineError('test', 'Error 1', {})
      const error2 = createPipelineError('test', 'Error 2', {})
      
      const results = [
        Result.Ok(1),
        Result.Err(error1),
        Result.Ok(2),
        Result.Err(error2)
      ]
      
      const errors = extractErrors(results)
      
      expect(errors).toEqual([error1, error2])
    })

    it('should return empty array for all successes', () => {
      const results = [
        Result.Ok(1),
        Result.Ok(2),
        Result.Ok(3)
      ]
      
      const errors = extractErrors(results)
      
      expect(errors).toEqual([])
    })
  })

  describe('combineResults', () => {
    it('should combine successful results', () => {
      const results = [
        Result.Ok(1),
        Result.Ok(2),
        Result.Ok(3)
      ]
      
      const combined = combineResults(results)
      
      expect(Result.isOk(combined)).toBe(true)
      if (Result.isOk(combined)) {
        expect(combined.value).toEqual([1, 2, 3])
      }
    })

    it('should return error if any result is error', () => {
      const results = [
        Result.Ok(1),
        Result.Err(createPipelineError('test', 'Error', {})),
        Result.Ok(3)
      ]
      
      const combined = combineResults(results)
      
      expect(Result.isErr(combined)).toBe(true)
      if (Result.isErr(combined)) {
        expect(combined.error.message).toContain('1 operation(s) failed')
      }
    })

    it('should handle empty results', () => {
      const combined = combineResults([])
      
      expect(Result.isOk(combined)).toBe(true)
      if (Result.isOk(combined)) {
        expect(combined.value).toEqual([])
      }
    })
  })

  describe('allSuccessful', () => {
    it('should return true when all results are successful', () => {
      const results = [
        Result.Ok(1),
        Result.Ok(2),
        Result.Ok(3)
      ]
      
      expect(allSuccessful(results)).toBe(true)
    })

    it('should return false when any result is error', () => {
      const results = [
        Result.Ok(1),
        Result.Err(createPipelineError('test', 'Error', {})),
        Result.Ok(3)
      ]
      
      expect(allSuccessful(results)).toBe(false)
    })

    it('should return true for empty array', () => {
      expect(allSuccessful([])).toBe(true)
    })
  })

  describe('anySuccessful', () => {
    it('should return true when any result is successful', () => {
      const results = [
        Result.Err(createPipelineError('test', 'Error', {})),
        Result.Ok(2),
        Result.Err(createPipelineError('test', 'Error', {}))
      ]
      
      expect(anySuccessful(results)).toBe(true)
    })

    it('should return false when all results are errors', () => {
      const results = [
        Result.Err(createPipelineError('test', 'Error 1', {})),
        Result.Err(createPipelineError('test', 'Error 2', {}))
      ]
      
      expect(anySuccessful(results)).toBe(false)
    })

    it('should return false for empty array', () => {
      expect(anySuccessful([])).toBe(false)
    })
  })

  describe('toResult', () => {
    it('should convert successful function to Result', () => {
      const fn = (x: number) => x * 2
      const resultFn = toResult(fn)
      
      const result = resultFn(5)
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(10)
      }
    })

    it('should convert throwing function to Result', () => {
      const fn = (x: number) => {
        if (x < 0) throw new Error('Negative number')
        return x * 2
      }
      
      const resultFn = toResult(fn)
      const result = resultFn(-5)
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toContain('Negative number')
      }
    })
  })

  describe('toAsyncResult', () => {
    it('should convert successful async function to Result', async () => {
      const fn = (x: number) => Promise.resolve(x * 2)
      const resultFn = toAsyncResult(fn)
      
      const result = await resultFn(5)
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(10)
      }
    })

    it('should convert rejecting async function to Result', async () => {
      const fn = (x: number) => {
        if (x < 0) throw new Error('Negative number')
        return Promise.resolve(x * 2)
      }
      
      const resultFn = toAsyncResult(fn)
      const result = await resultFn(-5)
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toContain('Negative number')
      }
    })
  })
})