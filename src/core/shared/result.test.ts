/**
 * Comprehensive tests for Result pattern functions
 */

import { describe, it, expect } from 'vitest'
import { Result } from './result'

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
})