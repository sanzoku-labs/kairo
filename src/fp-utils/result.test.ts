import { describe, it, expect } from 'vitest'
import { Result } from '../core/shared'
import {
  sequence,
  traverse,
  mapResult,
  chainResult,
  filterResult,
  liftA2,
  firstOk,
  withDefault,
  mapError,
  recover,
  partitionResults,
} from './result'

describe('result', () => {
  describe('sequence', () => {
    it('should combine all Ok results into array', () => {
      const results = [Result.Ok(1), Result.Ok(2), Result.Ok(3)]

      const combined = sequence(results)

      expect(Result.isOk(combined)).toBe(true)
      if (Result.isOk(combined)) {
        expect(combined.value).toEqual([1, 2, 3])
      }
    })

    it('should return first error if any result is Err', () => {
      const error1 = new Error('First error')
      const error2 = new Error('Second error')

      const results = [Result.Ok(1), Result.Err(error1), Result.Ok(3), Result.Err(error2)]

      const combined = sequence(results)

      expect(Result.isErr(combined)).toBe(true)
      if (Result.isErr(combined)) {
        expect(combined.error).toBe(error1)
      }
    })

    it('should handle empty array', () => {
      const combined = sequence([])

      expect(Result.isOk(combined)).toBe(true)
      if (Result.isOk(combined)) {
        expect(combined.value).toEqual([])
      }
    })

    it('should handle single result', () => {
      const okResult = sequence([Result.Ok(42)])
      const errResult = sequence([Result.Err(new Error('test'))])

      expect(Result.isOk(okResult)).toBe(true)
      if (Result.isOk(okResult)) {
        expect(okResult.value).toEqual([42])
      }

      expect(Result.isErr(errResult)).toBe(true)
    })
  })

  describe('traverse', () => {
    it('should apply function to each item and sequence results', () => {
      const double = (x: number) => Result.Ok(x * 2)
      const traverseDouble = traverse(double)

      const result = traverseDouble([1, 2, 3])

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual([2, 4, 6])
      }
    })

    it('should return error if any operation fails', () => {
      const error = new Error('Division by zero')
      const safeDivide = (x: number) => (x === 0 ? Result.Err(error) : Result.Ok(10 / x))

      const traverseDivide = traverse(safeDivide)
      const result = traverseDivide([2, 5, 0, 1])

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBe(error)
      }
    })

    it('should handle empty array', () => {
      const identity = (x: number) => Result.Ok(x)
      const traverseIdentity = traverse(identity)
      const result = traverseIdentity([])

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual([])
      }
    })
  })

  describe('mapResult', () => {
    it('should transform Ok value', () => {
      const double = mapResult((x: number) => x * 2)
      const result = double(Result.Ok(5))

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(10)
      }
    })

    it('should pass through error unchanged', () => {
      const error = new Error('test error')
      const double = mapResult((x: number) => x * 2)
      const result = double(Result.Err(error))

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBe(error)
      }
    })

    it('should work with type transformations', () => {
      const toString = mapResult((x: number) => x.toString())
      const result = toString(Result.Ok(42))

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe('42')
        expect(typeof result.value).toBe('string')
      }
    })
  })

  describe('chainResult', () => {
    it('should chain successful operations', () => {
      const safeDivide = (y: number) => (x: number) =>
        y === 0 ? Result.Err(new Error('Division by zero')) : Result.Ok(x / y)

      const chainDivideBy2 = chainResult(safeDivide(2))
      const result = chainDivideBy2(Result.Ok(10))

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(5) // 10 / 2 = 5
      }
    })

    it('should short-circuit on error', () => {
      const error = new Error('Initial error')
      const neverCalled = chainResult(() => Result.Ok('should not be called'))
      const result = neverCalled(Result.Err(error))

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBe(error)
      }
    })

    it('should propagate error from chained operation', () => {
      const error = new Error('Chain error')
      const alwaysFails = chainResult(() => Result.Err(error))
      const result = alwaysFails(Result.Ok(42))

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBe(error)
      }
    })
  })

  describe('filterResult', () => {
    it('should keep value if predicate passes', () => {
      const filterEven = filterResult(
        (x: number) => x % 2 === 0,
        (x: number) => new Error(`${x} is not even`)
      )

      const result = filterEven(Result.Ok(4))

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(4)
      }
    })

    it('should return error if predicate fails', () => {
      const filterEven = filterResult(
        (x: number) => x % 2 === 0,
        (x: number) => new Error(`${x} is not even`)
      )

      const result = filterEven(Result.Ok(3))

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toBe('3 is not even')
      }
    })

    it('should pass through existing error', () => {
      const originalError = new Error('Original error')
      const filterEven = filterResult(
        (x: number) => x % 2 === 0,
        () => new Error('Should not be called')
      )

      const result = filterEven(Result.Err(originalError))

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBe(originalError)
      }
    })
  })

  describe('liftA2', () => {
    it('should combine two Ok results', () => {
      const add = liftA2((a: number, b: number) => a + b)
      const result = add(Result.Ok(3), Result.Ok(4))

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(7)
      }
    })

    it('should return first error if first result is Err', () => {
      const error1 = new Error('First error')
      const add = liftA2((a: number, b: number) => a + b)
      const result = add(Result.Err(error1), Result.Ok(4))

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBe(error1)
      }
    })

    it('should return second error if second result is Err', () => {
      const error2 = new Error('Second error')
      const add = liftA2((a: number, b: number) => a + b)
      const result = add(Result.Ok(3), Result.Err(error2))

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBe(error2)
      }
    })

    it('should return first error if both results are Err', () => {
      const error1 = new Error('First error')
      const error2 = new Error('Second error')
      const add = liftA2((a: number, b: number) => a + b)
      const result = add(Result.Err(error1), Result.Err(error2))

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBe(error1)
      }
    })
  })

  describe('firstOk', () => {
    it('should return first Ok result', () => {
      const results = [
        Result.Err(new Error('Error 1')),
        Result.Ok(42),
        Result.Ok(24),
        Result.Err(new Error('Error 2')),
      ]

      const result = firstOk(results)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(42)
      }
    })

    it('should return last error if all are errors', () => {
      const error1 = new Error('Error 1')
      const error2 = new Error('Error 2')
      const error3 = new Error('Error 3')

      const results = [Result.Err(error1), Result.Err(error2), Result.Err(error3)]

      const result = firstOk(results)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBe(error3)
      }
    })

    it('should handle empty array', () => {
      const result = firstOk([])

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect((result.error as Error).message).toBe('No results provided')
      }
    })
  })

  describe('withDefault', () => {
    it('should return value if Result is Ok', () => {
      const getWithDefault = withDefault(0)
      expect(getWithDefault(Result.Ok(42))).toBe(42)
      expect(getWithDefault(Result.Ok(0))).toBe(0) // 0 is valid
    })

    it('should return default if Result is Err', () => {
      const getWithDefault = withDefault(99)
      const error = new Error('test')
      expect(getWithDefault(Result.Err(error))).toBe(99)
    })

    it('should work with different types', () => {
      const getStringWithDefault = withDefault('N/A')
      expect(getStringWithDefault(Result.Ok('hello'))).toBe('hello')
      expect(getStringWithDefault(Result.Err(new Error('test')))).toBe('N/A')
    })
  })

  describe('mapError', () => {
    it('should transform error if Result is Err', () => {
      const enrichError = mapError((err: Error) => ({
        code: 'ENHANCED_ERROR',
        message: err.message,
        timestamp: '2023-01-01',
      }))

      const originalError = new Error('Original error')
      const result = enrichError(Result.Err(originalError))

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toEqual({
          code: 'ENHANCED_ERROR',
          message: 'Original error',
          timestamp: '2023-01-01',
        })
      }
    })

    it('should pass through Ok value unchanged', () => {
      const enrichError = mapError(() => 'should not be called')
      const result = enrichError(Result.Ok(42))

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(42)
      }
    })
  })

  describe('recover', () => {
    it('should recover from error with successful result', () => {
      const recoverWithZero = recover(() => Result.Ok(0))
      const error = new Error('test error')
      const result = recoverWithZero(Result.Err(error))

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(0)
      }
    })

    it('should propagate new error from recovery function', () => {
      const newError = new Error('Recovery failed')
      const failedRecover = recover(() => Result.Err(newError))
      const originalError = new Error('Original error')
      const result = failedRecover(Result.Err(originalError))

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBe(newError)
      }
    })

    it('should pass through Ok value unchanged', () => {
      const recoverWithZero = recover(() => Result.Ok(999))
      const result = recoverWithZero(Result.Ok(42))

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(42)
      }
    })

    it('should allow error-dependent recovery', () => {
      const smartRecover = recover((error: Error) => {
        if (error.message === 'divide by zero') {
          return Result.Ok(Infinity)
        }
        return Result.Err(new Error('Unrecoverable error'))
      })

      const divideByZeroError = new Error('divide by zero')
      const otherError = new Error('other error')

      const result1 = smartRecover(Result.Err(divideByZeroError))
      const result2 = smartRecover(Result.Err(otherError))

      expect(Result.isOk(result1)).toBe(true)
      if (Result.isOk(result1)) {
        expect(result1.value).toBe(Infinity)
      }

      expect(Result.isErr(result2)).toBe(true)
      if (Result.isErr(result2)) {
        expect(result2.error.message).toBe('Unrecoverable error')
      }
    })
  })

  describe('partitionResults', () => {
    it('should separate successes and failures', () => {
      const results = [
        Result.Ok(1),
        Result.Err(new Error('Error 1')),
        Result.Ok(2),
        Result.Ok(3),
        Result.Err(new Error('Error 2')),
      ]

      const { successes, failures } = partitionResults(results)

      expect(successes).toEqual([1, 2, 3])
      expect(failures).toHaveLength(2)
      expect((failures[0] as Error).message).toBe('Error 1')
      expect((failures[1] as Error).message).toBe('Error 2')
    })

    it('should handle all successes', () => {
      const results = [Result.Ok(1), Result.Ok(2), Result.Ok(3)]

      const { successes, failures } = partitionResults(results)

      expect(successes).toEqual([1, 2, 3])
      expect(failures).toEqual([])
    })

    it('should handle all failures', () => {
      const error1 = new Error('Error 1')
      const error2 = new Error('Error 2')

      const results = [Result.Err(error1), Result.Err(error2)]

      const { successes, failures } = partitionResults(results)

      expect(successes).toEqual([])
      expect(failures).toEqual([error1, error2])
    })

    it('should handle empty array', () => {
      const { successes, failures } = partitionResults([])

      expect(successes).toEqual([])
      expect(failures).toEqual([])
    })
  })
})
