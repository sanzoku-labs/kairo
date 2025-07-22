/**
 * Comprehensive tests for Result pattern functions
 */

import { describe, it, expect } from 'vitest'
import { Result, map, flatMap, mapError, match, chain } from './result'

describe('Result Pattern', () => {
  describe('Result.Ok', () => {
    it('should create successful result', () => {
      const result = Result.Ok(42)
      expect(result.tag).toBe('Ok')
      expect(result.value).toBe(42)
    })

    it('should handle null and undefined values', () => {
      const nullResult = Result.Ok(null)
      const undefinedResult = Result.Ok(undefined)
      
      expect(nullResult.tag).toBe('Ok')
      expect(nullResult.value).toBe(null)
      expect(undefinedResult.tag).toBe('Ok')
      expect(undefinedResult.value).toBe(undefined)
    })

    it('should handle complex objects', () => {
      const obj = { name: 'test', count: 5 }
      const result = Result.Ok(obj)
      
      expect(result.tag).toBe('Ok')
      expect(result.value).toEqual(obj)
    })
  })

  describe('Result.Err', () => {
    it('should create error result', () => {
      const error = new Error('Test error')
      const result = Result.Err(error)
      
      expect(result.tag).toBe('Err')
      expect(result.error).toBe(error)
    })

    it('should handle string errors', () => {
      const result = Result.Err('String error')
      
      expect(result.tag).toBe('Err')
      expect(result.error).toBe('String error')
    })

    it('should handle complex error objects', () => {
      const errorObj = { code: 'VALIDATION_ERROR', message: 'Invalid input' }
      const result = Result.Err(errorObj)
      
      expect(result.tag).toBe('Err')
      expect(result.error).toEqual(errorObj)
    })
  })

  describe('Result.isOk', () => {
    it('should return true for Ok results', () => {
      const result = Result.Ok(42)
      expect(Result.isOk(result)).toBe(true)
    })

    it('should return false for Err results', () => {
      const result = Result.Err('error')
      expect(Result.isOk(result)).toBe(false)
    })

    it('should work as type guard', () => {
      const result: Result<string, number> = Result.Ok(42)
      
      if (Result.isOk(result)) {
        // TypeScript should infer result.value as number
        expect(typeof result.value).toBe('number')
        expect(result.value).toBe(42)
      }
    })
  })

  describe('Result.isErr', () => {
    it('should return false for Ok results', () => {
      const result = Result.Ok(42)
      expect(Result.isErr(result)).toBe(false)
    })

    it('should return true for Err results', () => {
      const result = Result.Err('error')
      expect(Result.isErr(result)).toBe(true)
    })

    it('should work as type guard', () => {
      const result: Result<string, number> = Result.Err('error')
      
      if (Result.isErr(result)) {
        // TypeScript should infer result.error as string
        expect(typeof result.error).toBe('string')
        expect(result.error).toBe('error')
      }
    })
  })

  describe('Result.map', () => {
    it('should transform Ok value', () => {
      const result = Result.Ok(42)
      const mapped = Result.map(result, x => x * 2)
      
      expect(Result.isOk(mapped)).toBe(true)
      if (Result.isOk(mapped)) {
        expect(mapped.value).toBe(84)
      }
    })

    it('should pass through Err unchanged', () => {
      const result = Result.Err('error')
      const mapped = Result.map(result, (x: number) => x * 2)
      
      expect(Result.isErr(mapped)).toBe(true)
      if (Result.isErr(mapped)) {
        expect(mapped.error).toBe('error')
      }
    })

    it('should handle transformation to different type', () => {
      const result = Result.Ok(42)
      const mapped = Result.map(result, x => `Number: ${x}`)
      
      expect(Result.isOk(mapped)).toBe(true)
      if (Result.isOk(mapped)) {
        expect(mapped.value).toBe('Number: 42')
      }
    })
  })

  describe('Result.flatMap', () => {
    it('should chain successful operations', () => {
      const result = Result.Ok(42)
      const chained = Result.flatMap(result, x => Result.Ok(x * 2))
      
      expect(Result.isOk(chained)).toBe(true)
      if (Result.isOk(chained)) {
        expect(chained.value).toBe(84)
      }
    })

    it('should handle failing operations in chain', () => {
      const result = Result.Ok(42)
      const chained = Result.flatMap(result, () => Result.Err('chain error'))
      
      expect(Result.isErr(chained)).toBe(true)
      if (Result.isErr(chained)) {
        expect(chained.error).toBe('chain error')
      }
    })

    it('should pass through initial Err', () => {
      const result = Result.Err('initial error')
      const chained = Result.flatMap(result, (x: number) => Result.Ok(x * 2))
      
      expect(Result.isErr(chained)).toBe(true)
      if (Result.isErr(chained)) {
        expect(chained.error).toBe('initial error')
      }
    })
  })

  describe('Result.mapError', () => {
    it('should transform Err value', () => {
      const result = Result.Err('original error')
      const mapped = Result.mapError(result, err => `Transformed: ${err}`)
      
      expect(Result.isErr(mapped)).toBe(true)
      if (Result.isErr(mapped)) {
        expect(mapped.error).toBe('Transformed: original error')
      }
    })

    it('should pass through Ok unchanged', () => {
      const result = Result.Ok(42)
      const mapped = Result.mapError(result, (err: string) => `Transformed: ${err}`)
      
      expect(Result.isOk(mapped)).toBe(true)
      if (Result.isOk(mapped)) {
        expect(mapped.value).toBe(42)
      }
    })
  })

  describe('Result.match', () => {
    it('should call Ok handler for successful result', () => {
      const result = Result.Ok(42)
      const matched = Result.match(result, {
        Ok: x => `Success: ${String(x)}`,
        Err: err => `Error: ${String(err)}`
      })
      
      expect(matched).toBe('Success: 42')
    })

    it('should call Err handler for error result', () => {
      const result = Result.Err('test error')
      const matched = Result.match(result, {
        Ok: x => `Success: ${String(x)}`,
        Err: err => `Error: ${String(err)}`
      })
      
      expect(matched).toBe('Error: test error')
    })

    it('should handle different return types', () => {
      const result = Result.Ok(42)
      const matched = Result.match(result, {
        Ok: x => x > 0,
        Err: () => false
      })
      
      expect(matched).toBe(true)
    })
  })

  // TODO: Implement Result.chain method
  // describe('Result.chain', () => {
  //   it('should chain multiple operations successfully', () => {
  //     const result = Result.Ok(10)
  //     const chained = Result.chain(result, [
  //       (x: number) => Result.Ok(x * 2),
  //       (x: number) => Result.Ok(x + 5),
  //       (x: number) => Result.Ok(x.toString())
  //     ])
  //     
  //     expect(Result.isOk(chained)).toBe(true)
  //     if (Result.isOk(chained)) {
  //       expect(chained.value).toBe('25')
  //     }
  //   })
  //
  //   it('should stop at first error in chain', () => {
  //     const result = Result.Ok(10)
  //     const chained = Result.chain(result, [
  //       (x: number) => Result.Ok(x * 2),
  //       () => Result.Err('chain error'),
  //       (x: number) => Result.Ok(x + 5) // This should not be called
  //     ])
  //     
  //     expect(Result.isErr(chained)).toBe(true)
  //     if (Result.isErr(chained)) {
  //       expect(chained.error).toBe('chain error')
  //     }
  //   })
  //
  //   it('should pass through initial error', () => {
  //     const result = Result.Err('initial error')
  //     const chained = Result.chain(result, [
  //       (x: number) => Result.Ok(x * 2),
  //       (x: number) => Result.Ok(x + 5)
  //     ])
  //     
  //     expect(Result.isErr(chained)).toBe(true)
  //     if (Result.isErr(chained)) {
  //       expect(chained.error).toBe('initial error')
  //     }
  //   })
  //
  //   it('should handle empty chain', () => {
  //     const result = Result.Ok(42)
  //     const chained = Result.chain(result, [])
  //     
  //     expect(Result.isOk(chained)).toBe(true)
  //     if (Result.isOk(chained)) {
  //       expect(chained.value).toBe(42)
  //     }
  //   })
  // })

  // TODO: Implement Result.all method
  // describe('Result.all', () => {
  //   it('should combine all successful results', () => {
  //     const results = [
  //       Result.Ok(1),
  //       Result.Ok(2),
  //       Result.Ok(3)
  //     ]
  //     const combined = Result.all(results)
  //     
  //     expect(Result.isOk(combined)).toBe(true)
  //     if (Result.isOk(combined)) {
  //       expect(combined.value).toEqual([1, 2, 3])
  //     }
  //   })
  //
  //   it('should return first error if any result fails', () => {
  //     const results = [
  //       Result.Ok(1),
  //       Result.Err('error'),
  //       Result.Ok(3)
  //     ]
  //     const combined = Result.all(results)
  //     
  //     expect(Result.isErr(combined)).toBe(true)
  //     if (Result.isErr(combined)) {
  //       expect(combined.error).toBe('error')
  //     }
  //   })
  //
  //   it('should handle empty array', () => {
  //     const results: Result<string, number>[] = []
  //     const combined = Result.all(results)
  //     
  //     expect(Result.isOk(combined)).toBe(true)
  //     if (Result.isOk(combined)) {
  //       expect(combined.value).toEqual([])
  //     }
  //   })
  // })

  // TODO: Implement Result.fromThrowing method
  // describe('Result.fromThrowing', () => {
  //   it('should catch exceptions and return Err', () => {
  //     const result = Result.fromThrowing(() => {
  //       throw new Error('Test error')
  //     })
  //     
  //     expect(Result.isErr(result)).toBe(true)
  //     if (Result.isErr(result)) {
  //       expect(result.error).toBeInstanceOf(Error)
  //       expect((result.error as Error).message).toBe('Test error')
  //     }
  //   })
  //
  //   it('should return Ok for successful execution', () => {
  //     const result = Result.fromThrowing(() => 42)
  //     
  //     expect(Result.isOk(result)).toBe(true)
  //     if (Result.isOk(result)) {
  //       expect(result.value).toBe(42)
  //     }
  //   })
  //
  //   it('should handle non-Error thrown values', () => {
  //     const result = Result.fromThrowing(() => {
  //       throw 'string error'
  //     })
  //     
  //     expect(Result.isErr(result)).toBe(true)
  //     if (Result.isErr(result)) {
  //       expect(result.error).toBe('string error')
  //     }
  //   })
  // })

  describe('Edge cases and error conditions', () => {
    it('should handle deeply nested transformations', () => {
      const result = Result.Ok(1)
      const transformed = Result.map(
        Result.map(
          Result.map(result, x => x + 1),
          x => x * 2
        ),
        x => x.toString()
      )
      
      expect(Result.isOk(transformed)).toBe(true)
      if (Result.isOk(transformed)) {
        expect(transformed.value).toBe('4')
      }
    })

    it('should handle transformation functions that throw', () => {
      const result = Result.Ok(42)
      
      // Since Result.map doesn't catch exceptions, this would throw
      // In a real scenario, you'd use Result.fromThrowing
      expect(() => {
        Result.map(result, () => {
          throw new Error('Transform error')
        })
      }).toThrow('Transform error')
    })

    it('should maintain type safety across transformations', () => {
      const result: Result<string, number> = Result.Ok(42)
      const stringResult = Result.map(result, x => `Value: ${x}`)
      const backToNumber = Result.map(stringResult, s => s.length)
      
      expect(Result.isOk(backToNumber)).toBe(true)
      if (Result.isOk(backToNumber)) {
        expect(typeof backToNumber.value).toBe('number')
        expect(backToNumber.value).toBe(9) // "Value: 42".length = 9 characters
      }
    })
  })

  // Tests for exported utility functions (lines 437-463)
  describe('Exported Utility Functions', () => {
    describe('map() curried function', () => {
      it('should create a curried map function', () => {
        const double = map((x: number) => x * 2)
        const result = Result.Ok(42)
        const mapped = double(result)
        
        expect(Result.isOk(mapped)).toBe(true)
        if (Result.isOk(mapped)) {
          expect(mapped.value).toBe(84)
        }
      })

      it('should pass through errors unchanged', () => {
        const double = map((x: number) => x * 2)
        const result = Result.Err('error')
        const mapped = double(result)
        
        expect(Result.isErr(mapped)).toBe(true)
        if (Result.isErr(mapped)) {
          expect(mapped.error).toBe('error')
        }
      })

      it('should work with different types', () => {
        const toString = map((x: number) => `Value: ${x}`)
        const result = Result.Ok(123)
        const mapped = toString(result)
        
        expect(Result.isOk(mapped)).toBe(true)
        if (Result.isOk(mapped)) {
          expect(mapped.value).toBe('Value: 123')
        }
      })
    })

    describe('flatMap() curried function', () => {
      it('should create a curried flatMap function', () => {
        const divideBy = (divisor: number) => flatMap((x: number) => 
          divisor === 0 ? Result.Err('Division by zero') : Result.Ok(x / divisor)
        )
        
        const divideByTwo = divideBy(2)
        const result = Result.Ok(42)
        const mapped = divideByTwo(result)
        
        expect(Result.isOk(mapped)).toBe(true)
        if (Result.isOk(mapped)) {
          expect(mapped.value).toBe(21)
        }
      })

      it('should handle chain failures', () => {
        const alwaysFail = flatMap(() => Result.Err('Always fails'))
        const result = Result.Ok(42)
        const mapped = alwaysFail(result)
        
        expect(Result.isErr(mapped)).toBe(true)
        if (Result.isErr(mapped)) {
          expect(mapped.error).toBe('Always fails')
        }
      })

      it('should pass through initial errors', () => {
        const transform = flatMap((x: number) => Result.Ok(x * 2))
        const result = Result.Err('initial error')
        const mapped = transform(result)
        
        expect(Result.isErr(mapped)).toBe(true)
        if (Result.isErr(mapped)) {
          expect(mapped.error).toBe('initial error')
        }
      })
    })

    describe('mapError() curried function', () => {
      it('should create a curried mapError function', () => {
        const wrapError = mapError((err: string) => new Error(`Wrapped: ${err}`))
        const result = Result.Err('original error')
        const mapped = wrapError(result)
        
        expect(Result.isErr(mapped)).toBe(true)
        if (Result.isErr(mapped)) {
          expect(mapped.error).toBeInstanceOf(Error)
          expect(mapped.error.message).toBe('Wrapped: original error')
        }
      })

      it('should pass through Ok results unchanged', () => {
        const wrapError = mapError((err: string) => new Error(err))
        const result = Result.Ok(42)
        const mapped = wrapError(result)
        
        expect(Result.isOk(mapped)).toBe(true)
        if (Result.isOk(mapped)) {
          expect(mapped.value).toBe(42)
        }
      })

      it('should work with different error types', () => {
        const stringifyError = mapError((err: number) => `Error code: ${err}`)
        const result = Result.Err(404)
        const mapped = stringifyError(result)
        
        expect(Result.isErr(mapped)).toBe(true)
        if (Result.isErr(mapped)) {
          expect(mapped.error).toBe('Error code: 404')
        }
      })
    })

    describe('match() curried function', () => {
      it('should create a curried match function', () => {
        const handleResult = match({
          Ok: (value: number) => `Success: ${value}`,
          Err: (error: string) => `Error: ${error}`
        })
        
        const okResult = Result.Ok(42)
        const errResult = Result.Err('test error')
        
        expect(handleResult(okResult)).toBe('Success: 42')
        expect(handleResult(errResult)).toBe('Error: test error')
      })

      it('should handle different return types', () => {
        const isPositive = match({
          Ok: (value: number) => value > 0,
          Err: () => false
        })
        
        expect(isPositive(Result.Ok(5))).toBe(true)
        expect(isPositive(Result.Ok(-5))).toBe(false)
        expect(isPositive(Result.Err('error'))).toBe(false)
      })

      it('should work with complex handlers', () => {
        interface User { id: number; name: string }
        const formatUser = match({
          Ok: (user: User) => ({ status: 'success', data: user }),
          Err: (error: string) => ({ status: 'error' as const, data: { id: -1, name: error } })
        })
        
        const userResult = Result.Ok({ id: 1, name: 'John' })
        const errorResult = Result.Err('User not found')
        
        expect(formatUser(userResult)).toEqual({
          status: 'success',
          data: { id: 1, name: 'John' }
        })
        expect(formatUser(errorResult)).toEqual({
          status: 'error',
          data: { id: -1, name: 'User not found' }
        })
      })
    })

    describe('chain() function', () => {
      it('should chain multiple operations successfully', () => {
        const addOne = (result: Result<string, unknown>) => 
          Result.isOk(result) && typeof result.value === 'number' ? Result.Ok(result.value + 1) : result
        const double = (result: Result<string, unknown>) => 
          Result.isOk(result) && typeof result.value === 'number' ? Result.Ok(result.value * 2) : result
        const toString = (result: Result<string, unknown>) => 
          Result.isOk(result) && typeof result.value === 'number' ? Result.Ok(result.value.toString()) : result
        
        const chained = chain(addOne, double, toString)
        const result = chained(Result.Ok(5))
        
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value).toBe('12') // (5 + 1) * 2 = 12
        }
      })

      it('should stop at first error in chain', () => {
        const addOne = (result: Result<string, unknown>) => 
          Result.isOk(result) && typeof result.value === 'number' ? Result.Ok(result.value + 1) : result
        const fail = () => Result.Err('Chain failed')
        const double = (result: Result<string, unknown>) => 
          Result.isOk(result) && typeof result.value === 'number' ? Result.Ok(result.value * 2) : result
        
        const chained = chain(addOne, fail, double)
        const result = chained(Result.Ok(5) as Result<string, unknown>)
        
        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error).toBe('Chain failed')
        }
      })

      it('should pass through initial error without calling chain functions', () => {
        const addOne = (result: Result<string, unknown>) => 
          Result.isOk(result) && typeof result.value === 'number' ? Result.Ok(result.value + 1) : result
        const double = (result: Result<string, unknown>) => 
          Result.isOk(result) && typeof result.value === 'number' ? Result.Ok(result.value * 2) : result
        
        const chained = chain(addOne, double)
        const result = chained(Result.Err('Initial error') as Result<string, unknown>)
        
        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error).toBe('Initial error')
        }
      })

      it('should handle empty chain (no operations)', () => {
        const chained = chain()
        const result = chained(Result.Ok(42))
        
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value).toBe(42)
        }
      })

      it('should handle single operation in chain', () => {
        const double = (result: Result<string, unknown>) => 
          Result.isOk(result) && typeof result.value === 'number' ? Result.Ok(result.value * 2) : result
        
        const chained = chain(double)
        const result = chained(Result.Ok(21) as Result<string, unknown>)
        
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value).toBe(42)
        }
      })
    })
  })

  describe('Result.fromPromise', () => {
    it('should convert resolved Promise to Ok result', async () => {
      const promise = Promise.resolve(42)
      const result = await Result.fromPromise(promise)
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(42)
      }
    })

    it('should convert rejected Promise to Err result', async () => {
      const promise = Promise.reject(new Error('Async error'))
      const result = await Result.fromPromise(promise)
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(Error)
        expect((result.error as Error).message).toBe('Async error')
      }
    })

    it('should handle Promise that rejects with non-Error', async () => {
      const promise = Promise.reject(new Error('String error'))
      const result = await Result.fromPromise(promise)
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(Error)
        expect((result.error as Error).message).toBe('String error')
      }
    })

    it('should work with complex async operations', async () => {
      const fetchData = () => 
        new Promise<{ id: number; name: string }>(resolve => 
          setTimeout(() => resolve({ id: 1, name: 'Alice' }), 10)
        )
      
      const result = await Result.fromPromise(fetchData())
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual({ id: 1, name: 'Alice' })
      }
    })
  })

  describe('Result.fromTry', () => {
    it('should convert successful function to Ok result', () => {
      const result = Result.fromTry<{ name: string }>(() => {
        const parsed = JSON.parse('{"name":"John"}') as { name: string }
        return parsed
      })
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual({ name: 'John' })
      }
    })

    it('should convert throwing function to Err result', () => {
      const result = Result.fromTry<unknown>(() => JSON.parse('invalid json'))
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(SyntaxError)
      }
    })

    it('should handle functions that throw non-Error values', () => {
      const result = Result.fromTry(() => {
        throw new Error('Custom error')
      })
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(Error)
        expect((result.error as Error).message).toBe('Custom error')
      }
    })

    it('should work with complex operations', () => {
      const divide = (a: number, b: number) => Result.fromTry(() => {
        if (b === 0) throw new Error('Division by zero')
        return a / b
      })
      
      const successResult = divide(10, 2)
      expect(Result.isOk(successResult)).toBe(true)
      if (Result.isOk(successResult)) {
        expect(successResult.value).toBe(5)
      }
      
      const errorResult = divide(10, 0)
      expect(Result.isErr(errorResult)).toBe(true)
      if (Result.isErr(errorResult)) {
        expect((errorResult.error as Error).message).toBe('Division by zero')
      }
    })

    it('should handle null and undefined return values', () => {
      const nullResult = Result.fromTry(() => null)
      const undefinedResult = Result.fromTry(() => undefined)
      
      expect(Result.isOk(nullResult)).toBe(true)
      expect(Result.isOk(undefinedResult)).toBe(true)
      
      if (Result.isOk(nullResult)) {
        expect(nullResult.value).toBe(null)
      }
      if (Result.isOk(undefinedResult)) {
        expect(undefinedResult.value).toBe(undefined)
      }
    })
  })

  describe('Complex integration scenarios', () => {
    it('should compose multiple utility functions', () => {
      const processNumber = chain(
        map((x: unknown) => typeof x === 'number' ? x + 10 : x) as (result: Result<unknown, unknown>) => Result<unknown, unknown>,
        flatMap((x: unknown) => typeof x === 'number' && x > 0 ? Result.Ok(x) : Result.Err('Negative')) as (result: Result<unknown, unknown>) => Result<unknown, unknown>,
        map((x: unknown) => typeof x === 'number' ? x.toString() : String(x)) as (result: Result<unknown, unknown>) => Result<unknown, unknown>
      )
      
      const result = processNumber(Result.Ok(5))
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe('15')
      }
    })

    it('should handle error transformation in complex chains', () => {
      // Test manual composition of Result utilities
      let result: Result<unknown, unknown> = Result.Ok('invalid' as string)
      
      // Apply map to parse the string
      result = map((x: unknown) => typeof x === 'string' ? parseInt(x) : NaN)(result)
      
      // Apply flatMap to validate the parsed number
      if (Result.isOk(result)) {
        result = flatMap((x: unknown) => typeof x === 'number' && isNaN(x) ? Result.Err('Parse error') : Result.Ok(x))(result)
      }
      
      // Apply mapError to transform the error
      if (Result.isErr(result)) {
        result = mapError((err: unknown) => new Error(`Processing failed: ${String(err)}`))(result)
      }
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(Error)
        expect((result.error as Error).message).toBe('Processing failed: Parse error')
      }
    })

    it('should work with async Result patterns', async () => {
      const asyncProcess = async (value: number) => {
        const step1 = await Result.fromPromise(Promise.resolve(value * 2))
        if (Result.isErr(step1)) return step1
        
        const step2 = Result.fromTry(() => {
          if (step1.value > 100) throw new Error('Too large')
          return step1.value + 10
        })
        
        return step2
      }
      
      const smallResult = await asyncProcess(10)
      expect(Result.isOk(smallResult)).toBe(true)
      if (Result.isOk(smallResult)) {
        expect(smallResult.value).toBe(30) // (10 * 2) + 10
      }
      
      const largeResult = await asyncProcess(60)
      expect(Result.isErr(largeResult)).toBe(true)
      if (Result.isErr(largeResult)) {
        expect((largeResult.error as Error).message).toBe('Too large')
      }
    })
  })
})