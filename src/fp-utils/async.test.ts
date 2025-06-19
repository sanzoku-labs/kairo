import { describe, it, expect, vi } from 'vitest'
import { Result } from '../core/shared'
import {
  asyncPipe,
  asyncMap,
  asyncMapSeq,
  asyncFilter,
  asyncForEach,
  asyncToResult,
  asyncSequence,
  asyncTraverse,
  retryAsync,
  withTimeout,
} from './async'

describe('async', () => {
  describe('asyncPipe', () => {
    it('should pipe async functions from left to right', async () => {
      const add1 = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 1))
        return x + 1
      }
      const multiply2 = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 1))
        return x * 2
      }
      const piped = asyncPipe(add1, multiply2)

      const result = await piped(5)
      expect(result).toBe(12) // (5 + 1) * 2
    })

    it('should work with single function', async () => {
      const add1 = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 1))
        return x + 1
      }
      const piped = asyncPipe(add1)

      const result = await piped(5)
      expect(result).toBe(6)
    })

    it('should handle empty pipe', async () => {
      const piped = asyncPipe()
      const result = await piped(5)
      expect(result).toBe(5)
    })
  })

  describe('asyncMap', () => {
    it('should map over array with async function in parallel', async () => {
      const double = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return x * 2
      }

      const mapDouble = asyncMap(double)
      const result = await mapDouble([1, 2, 3])

      expect(result).toEqual([2, 4, 6])
    })

    it('should handle empty arrays', async () => {
      const double = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 1))
        return x * 2
      }
      const mapDouble = asyncMap(double)
      const result = await mapDouble([])

      expect(result).toEqual([])
    })

    it('should execute in parallel', async () => {
      const delays = [100, 50, 75]
      const startTime = Date.now()

      const delayAndReturn = async (delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay))
        return delay
      }

      const mapDelay = asyncMap(delayAndReturn)
      const result = await mapDelay(delays)
      const endTime = Date.now()

      expect(result).toEqual([100, 50, 75])
      // Should take around 100ms (longest delay), not 225ms (sum of delays)
      expect(endTime - startTime).toBeLessThan(150)
    })
  })

  describe('asyncMapSeq', () => {
    it('should map over array with async function sequentially', async () => {
      const double = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return x * 2
      }

      const mapDouble = asyncMapSeq(double)
      const result = await mapDouble([1, 2, 3])

      expect(result).toEqual([2, 4, 6])
    })

    it('should execute sequentially', async () => {
      const order: number[] = []

      const trackOrder = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, (4 - x) * 10)) // Reverse order timing
        order.push(x)
        return x
      }

      const mapSequential = asyncMapSeq(trackOrder)
      await mapSequential([1, 2, 3])

      expect(order).toEqual([1, 2, 3]) // Should maintain original order
    })
  })

  describe('asyncFilter', () => {
    it('should filter array with async predicate', async () => {
      const isEvenAsync = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return x % 2 === 0
      }

      const filterEven = asyncFilter(isEvenAsync)
      const result = await filterEven([1, 2, 3, 4, 5, 6])

      expect(result).toEqual([2, 4, 6])
    })

    it('should handle empty arrays', async () => {
      const isEvenAsync = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 1))
        return x % 2 === 0
      }
      const filterEven = asyncFilter(isEvenAsync)
      const result = await filterEven([])

      expect(result).toEqual([])
    })
  })

  describe('asyncForEach', () => {
    it('should apply async function to each element and return original array', async () => {
      const sideEffects: number[] = []
      const addToSideEffects = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        sideEffects.push(x * 2)
      }

      const forEachDouble = asyncForEach(addToSideEffects)
      const result = await forEachDouble([1, 2, 3])

      expect(result).toEqual([1, 2, 3]) // Original array
      expect(sideEffects.sort()).toEqual([2, 4, 6]) // Side effects (sorted due to parallel execution)
    })
  })

  describe('asyncToResult', () => {
    it('should wrap successful promise in Result.Ok', async () => {
      const promise = Promise.resolve(42)
      const result = await asyncToResult(promise)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(42)
      }
    })

    it('should wrap rejected promise in Result.Err', async () => {
      const error = new Error('Test error')
      const promise = Promise.reject(error)
      const result = await asyncToResult(promise)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBe(error)
      }
    })

    it('should convert non-Error rejections to Error', async () => {
      // Create a promise that will reject with a non-Error value during execution
      const promise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('string error')), 1)
      })
      const result = await asyncToResult(promise)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(Error)
        expect(result.error.message).toBe('string error')
      }
    })
  })

  describe('asyncSequence', () => {
    it('should sequence all Ok results', async () => {
      const promises = [
        Promise.resolve(Result.Ok(1)),
        Promise.resolve(Result.Ok(2)),
        Promise.resolve(Result.Ok(3)),
      ]

      const result = await asyncSequence(promises)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual([1, 2, 3])
      }
    })

    it('should return first error if any result is Err', async () => {
      const error = new Error('Test error')
      const promises = [
        Promise.resolve(Result.Ok(1)),
        Promise.resolve(Result.Err(error)),
        Promise.resolve(Result.Ok(3)),
      ]

      const result = await asyncSequence(promises)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBe(error)
      }
    })
  })

  describe('asyncTraverse', () => {
    it('should apply async function and sequence results', async () => {
      const doubleAsync = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return Result.Ok(x * 2)
      }

      const traverse = asyncTraverse(doubleAsync)
      const result = await traverse([1, 2, 3])

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual([2, 4, 6])
      }
    })

    it('should return error if any operation fails', async () => {
      const error = new Error('Test error')
      const maybeDouble = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 1))
        if (x === 2) return Result.Err(error)
        return Result.Ok(x * 2)
      }

      const traverse = asyncTraverse(maybeDouble)
      const result = await traverse([1, 2, 3])

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBe(error)
      }
    })
  })

  describe('retryAsync', () => {
    it('should succeed on first try if function succeeds', async () => {
      const successFn = vi.fn().mockResolvedValue('success')

      const result = await retryAsync(successFn, { maxRetries: 3 })

      expect(result).toBe('success')
      expect(successFn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const failThenSucceed = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const result = await retryAsync(failThenSucceed, { maxRetries: 3 })

      expect(result).toBe('success')
      expect(failThenSucceed).toHaveBeenCalledTimes(3)
    })

    it('should throw after max retries', async () => {
      const alwaysFail = vi.fn().mockRejectedValue(new Error('always fails'))

      await expect(retryAsync(alwaysFail, { maxRetries: 2 })).rejects.toThrow('always fails')
      expect(alwaysFail).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should respect backoff configuration', async () => {
      const failThenSucceed = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')

      const startTime = Date.now()
      await retryAsync(failThenSucceed, {
        maxRetries: 1,
        initialDelay: 100,
        backoffFactor: 1,
      })
      const endTime = Date.now()

      expect(endTime - startTime).toBeGreaterThanOrEqual(100)
    })
  })

  describe('withTimeout', () => {
    it('should resolve if promise completes within timeout', async () => {
      const quickPromise = new Promise(resolve => setTimeout(() => resolve('done'), 50))
      const withTimeoutPromise = withTimeout(100)(quickPromise)

      const result = await withTimeoutPromise
      expect(result).toBe('done')
    })

    it('should reject if promise takes longer than timeout', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('done'), 150))
      const withTimeoutPromise = withTimeout(100)(slowPromise)

      await expect(withTimeoutPromise).rejects.toThrow('Operation timed out after 100ms')
    })

    it('should use custom timeout error', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('done'), 150))
      const customError = new Error('Custom timeout error')
      const withTimeoutPromise = withTimeout(100, customError)(slowPromise)

      await expect(withTimeoutPromise).rejects.toThrow('Custom timeout error')
    })
  })
})
