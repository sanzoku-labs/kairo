import { describe, it, expect } from 'vitest'
import { tryCatch } from './safe'
import { Result } from '../../core/result'

describe('safe', () => {
  describe('tryCatch', () => {
    it('should return Ok result for successful execution', () => {
      const result = tryCatch(() => 42)
      expect(Result.isOk(result)).toBe(true)
      expect(Result.unwrap(result)).toBe(42)
    })

    it('should return Err result for throwing functions', () => {
      const error = new Error('Something went wrong')
      const result = tryCatch(() => {
        throw error
      })
      
      expect(Result.isErr(result)).toBe(true)
      expect(Result.unwrapOr(result, null)).toBe(null)
      expect(Result.match(result, {
        Ok: () => null,
        Err: (e) => e
      })).toBe(error)
    })

    it('should handle custom error transformation', () => {
      const result = tryCatch(
        () => {
          throw new Error('Network error')
        },
        (error) => ({
          code: 'NETWORK_ERROR',
          message: (error as Error).message
        })
      )
      
      expect(Result.isErr(result)).toBe(true)
      expect(Result.match(result, {
        Ok: () => null,
        Err: (e) => e
      })).toEqual({
        code: 'NETWORK_ERROR',
        message: 'Network error'
      })
    })

    it('should handle complex computations', () => {
      const divide = (a: number, b: number) => {
        if (b === 0) throw new Error('Division by zero')
        return a / b
      }
      
      const result1 = tryCatch(() => divide(10, 2))
      expect(Result.unwrap(result1)).toBe(5)
      
      const result2 = tryCatch(() => divide(10, 0))
      expect(Result.isErr(result2)).toBe(true)
    })

    it('should work with async-like patterns', () => {
      const fetchUser = (id: number) => {
        if (id < 0) throw new Error('Invalid user ID')
        return { id, name: 'John' }
      }
      
      const result = tryCatch(() => fetchUser(1))
      expect(Result.unwrap(result)).toEqual({ id: 1, name: 'John' })
      
      const errorResult = tryCatch(() => fetchUser(-1))
      expect(Result.isErr(errorResult)).toBe(true)
    })

    it('should compose with Result methods', () => {
      const parseJSON = (str: string) => tryCatch(() => JSON.parse(str) as unknown)
      
      const validResult = parseJSON('{"name": "Alice"}')
      const transformed = Result.map(validResult, (data: unknown) => (data as { name: string }).name)
      expect(Result.unwrap(transformed)).toBe('Alice')
      
      const invalidResult = parseJSON('invalid json')
      const withDefault = Result.unwrapOr(invalidResult, { name: 'Unknown' })
      expect(withDefault).toEqual({ name: 'Unknown' })
    })
  })
})