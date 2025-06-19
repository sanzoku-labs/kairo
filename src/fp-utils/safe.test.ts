import { describe, it, expect } from 'vitest'
import { Result } from '../core/shared'
import { tryCatch } from './safe'

describe('safe', () => {
  describe('tryCatch', () => {
    it('should return Result.Ok for successful function execution', () => {
      const safeDivide = () => 10 / 2
      const result = tryCatch(safeDivide)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(5)
      }
    })

    it('should return Result.Err for function that throws', () => {
      const throwingFn = () => {
        throw new Error('Something went wrong')
      }
      const result = tryCatch(throwingFn)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error as Error).toBeInstanceOf(Error)
        expect((result.error as Error).message).toBe('Something went wrong')
      }
    })

    it('should use custom error transformer', () => {
      const throwingFn = () => {
        throw new Error('Original error')
      }

      const errorTransformer = (error: unknown) => ({
        code: 'CUSTOM_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        originalError: error,
      })

      const result = tryCatch(throwingFn, errorTransformer)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toEqual({
          code: 'CUSTOM_ERROR',
          message: 'Original error',
          originalError: expect.any(Error) as Error,
        })
      }
    })

    it('should handle non-Error throws', () => {
      const throwingFn = () => {
        throw new Error('string error')
      }
      const result = tryCatch(throwingFn)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(Error)
        expect((result.error as Error).message).toBe('string error')
      }
    })

    it('should handle null/undefined throws', () => {
      const throwNull = () => {
        throw new Error('null error')
      }
      const throwUndefined = () => {
        throw new Error('undefined error')
      }

      const resultNull = tryCatch(throwNull)
      const resultUndefined = tryCatch(throwUndefined)

      expect(Result.isErr(resultNull)).toBe(true)
      if (Result.isErr(resultNull)) {
        expect((resultNull.error as Error).message).toBe('null error')
      }
      expect(Result.isErr(resultUndefined)).toBe(true)
      if (Result.isErr(resultUndefined)) {
        expect((resultUndefined.error as Error).message).toBe('undefined error')
      }
    })

    it('should work with functions that return different types', () => {
      const returnString = () => 'hello world'
      const returnObject = () => ({ key: 'value' })
      const returnArray = () => [1, 2, 3]

      const stringResult = tryCatch(returnString)
      const objectResult = tryCatch(returnObject)
      const arrayResult = tryCatch(returnArray)

      expect(Result.isOk(stringResult)).toBe(true)
      expect(Result.isOk(objectResult)).toBe(true)
      expect(Result.isOk(arrayResult)).toBe(true)

      if (Result.isOk(stringResult)) {
        expect(stringResult.value).toBe('hello world')
      }
      if (Result.isOk(objectResult)) {
        expect(objectResult.value).toEqual({ key: 'value' })
      }
      if (Result.isOk(arrayResult)) {
        expect(arrayResult.value).toEqual([1, 2, 3])
      }
    })

    it('should handle JSON parsing safely', () => {
      const parseValidJson = (): unknown => JSON.parse('{"valid": true}')
      const parseInvalidJson = (): unknown => JSON.parse('invalid json')

      const validResult = tryCatch(parseValidJson)
      const invalidResult = tryCatch(parseInvalidJson)

      expect(Result.isOk(validResult)).toBe(true)
      if (Result.isOk(validResult)) {
        expect(validResult.value).toEqual({ valid: true })
      }

      expect(Result.isErr(invalidResult)).toBe(true)
      if (Result.isErr(invalidResult)) {
        expect(invalidResult.error).toBeInstanceOf(SyntaxError)
      }
    })

    it('should handle division by zero', () => {
      const divideByZero = () => 1 / 0
      const result = tryCatch(divideByZero)

      // Division by zero returns Infinity, doesn't throw
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(Infinity)
      }
    })

    it('should work with complex error transformation', () => {
      const complexFn = () => {
        const data: { someProperty?: unknown } = JSON.parse('invalid') as { someProperty?: unknown }
        return data.someProperty
      }

      const enrichError = (error: unknown) => {
        if (error instanceof SyntaxError) {
          return {
            type: 'PARSE_ERROR',
            message: 'Failed to parse JSON',
            details: error.message,
            timestamp: new Date().toISOString(),
          }
        }
        return {
          type: 'UNKNOWN_ERROR',
          message: 'An unknown error occurred',
          originalError: error,
        }
      }

      const result = tryCatch(complexFn, enrichError)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.type).toBe('PARSE_ERROR')
        expect(result.error.message).toBe('Failed to parse JSON')
        expect(result.error.details).toBeTruthy()
        expect(result.error.timestamp).toBeTruthy()
      }
    })
  })
})
