import { describe, it, expect } from 'vitest'
import { Result, map, flatMap, match } from '../src/core/result'

describe('Result', () => {
  describe('when creating Ok result', () => {
    it('should preserve value', () => {
      const result = Result.Ok(42)
      expect(result).toEqual({ tag: 'Ok', value: 42 })
    })

    it('should preserve value through map operations', () => {
      const result = Result.Ok(10)
      const mapped = Result.map(result, x => x * 2)
      
      expect(Result.isOk(mapped)).toBe(true)
      expect(mapped).toEqual({ tag: 'Ok', value: 20 })
    })

    it('should chain multiple map operations', () => {
      let result: Result<unknown, unknown> = Result.Ok(5)
      result = map((x: number) => x * 2)(result as Result<unknown, number>)
      result = map((x: number) => x + 1)(result as Result<unknown, number>)
      result = map((x: number) => x.toString())(result as Result<unknown, number>)
      
      expect(result).toEqual({ tag: 'Ok', value: '11' })
    })

    it('should handle flatMap correctly', () => {
      const result = Result.Ok(10)
      const flatMapped = Result.flatMap(result, x => 
        x > 5 ? Result.Ok(x * 2) : Result.Err('too small')
      )
      
      expect(flatMapped).toEqual({ tag: 'Ok', value: 20 })
    })

    it('should not apply mapError on Ok result', () => {
      const result = Result.Ok(42)
      const mapped = Result.mapError(result, () => 'new error')
      
      expect(mapped).toEqual({ tag: 'Ok', value: 42 })
    })
  })

  describe('when creating Err result', () => {
    it('should preserve error', () => {
      const result = Result.Err('error message')
      expect(result).toEqual({ tag: 'Err', error: 'error message' })
    })

    it('should short-circuit map operations', () => {
      const result = Result.Err('error')
      const mapped = Result.map(result, (x: unknown) => (x as number) * 2)
      
      expect(Result.isErr(mapped)).toBe(true)
      expect(mapped).toEqual({ tag: 'Err', error: 'error' })
    })

    it('should short-circuit flatMap operations', () => {
      const result = Result.Err('initial error')
      const flatMapped = Result.flatMap(result, (x: unknown) => Result.Ok((x as number) * 2))
      
      expect(flatMapped).toEqual({ tag: 'Err', error: 'initial error' })
    })

    it('should apply mapError on Err result', () => {
      const result = Result.Err('error')
      const mapped = Result.mapError(result, err => `transformed: ${err}`)
      
      expect(mapped).toEqual({ tag: 'Err', error: 'transformed: error' })
    })
  })

  describe('match', () => {
    it('should execute Ok handler for Ok result', () => {
      const result = Result.Ok(42)
      const value = Result.match(result, {
        Ok: x => `success: ${x}`,
        Err: err => `error: ${String(err)}`
      })
      
      expect(value).toBe('success: 42')
    })

    it('should execute Err handler for Err result', () => {
      const result = Result.Err('failed')
      const value = Result.match(result, {
        Ok: (x: number) => `success: ${x}`,
        Err: err => `error: ${String(err)}`
      })
      
      expect(value).toBe('error: failed')
    })

    it('should work with curried match function', () => {
      const handler = match<string, number, string>({
        Ok: x => `ok: ${x}`,
        Err: err => `err: ${String(err)}`
      })
      
      expect(handler(Result.Ok(10))).toBe('ok: 10')
      expect(handler(Result.Err('oops'))).toBe('err: oops')
    })
  })

  describe('unwrap operations', () => {
    it('should unwrap Ok value', () => {
      const result = Result.Ok(42)
      expect(Result.unwrap(result)).toBe(42)
    })

    it('should throw on unwrap Err', () => {
      const result = Result.Err('error')
      expect(() => Result.unwrap(result)).toThrow('Called unwrap on an Err value')
    })

    it('should return value with unwrapOr on Ok', () => {
      const result = Result.Ok(42)
      expect(Result.unwrapOr(result, 0)).toBe(42)
    })

    it('should return default with unwrapOr on Err', () => {
      const result = Result.Err('error')
      expect(Result.unwrapOr(result, 0)).toBe(0)
    })

    it('should execute function with unwrapOrElse on Err', () => {
      const result = Result.Err('error')
      expect(Result.unwrapOrElse(result, err => err.length)).toBe(5)
    })
  })

  describe('fromPromise', () => {
    it('should convert resolved promise to Ok', async () => {
      const promise = Promise.resolve(42)
      const result = await Result.fromPromise(promise)
      
      expect(result).toEqual({ tag: 'Ok', value: 42 })
    })

    it('should convert rejected promise to Err', async () => {
      const promise = Promise.reject(new Error('failed'))
      const result = await Result.fromPromise(promise)
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(Error)
        expect((result.error as Error).message).toBe('failed')
      }
    })
  })

  describe('fromTry', () => {
    it('should convert successful function to Ok', () => {
      const result = Result.fromTry(() => 1 + 1)
      expect(result).toEqual({ tag: 'Ok', value: 2 })
    })

    it('should convert throwing function to Err', () => {
      const result = Result.fromTry(() => {
        throw new Error('boom')
      })
      
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(Error)
        expect((result.error as Error).message).toBe('boom')
      }
    })
  })

  describe('edge cases', () => {
    it('should handle null and undefined values', () => {
      const nullResult = Result.Ok(null)
      const undefinedResult = Result.Ok(undefined)
      
      expect(nullResult).toEqual({ tag: 'Ok', value: null })
      expect(undefinedResult).toEqual({ tag: 'Ok', value: undefined })
    })

    it('should handle complex error types', () => {
      interface CustomError {
        code: string
        message: string
        context: Record<string, unknown>
      }
      
      const error: CustomError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        context: { field: 'email' }
      }
      
      const result = Result.Err(error)
      if (Result.isErr(result)) {
        expect(result.error).toEqual(error)
      }
    })

    it('should compose multiple operations', () => {
      const divide = (a: number, b: number): Result<string, number> =>
        b === 0 ? Result.Err('division by zero') : Result.Ok(a / b)
      
      const compute = (x: number): Result<string, number> => {
        let result: Result<string, number> = Result.Ok(x)
        result = flatMap((n: number) => divide(n, 2))(result)
        result = flatMap((n: number) => divide(n, 2))(result)
        const mappedResult = map((n: number) => Math.round(n))(result)
        return mappedResult as Result<string, number>
      }
      
      expect(compute(20)).toEqual({ tag: 'Ok', value: 5 })
      expect(compute(10)).toEqual({ tag: 'Ok', value: 3 })
    })
  })
})