import { describe, it, expect } from 'vitest'
import {
  isSome,
  isNone,
  maybe,
  map,
  chain,
  filter,
  withDefault,
  unwrap,
  fromTry,
  fromPromise,
  all,
  first,
  when,
  toResult,
  partition,
  type Maybe,
} from './maybe'

describe('maybe', () => {
  describe('isSome', () => {
    it('should return true for non-null/undefined values', () => {
      expect(isSome(42)).toBe(true)
      expect(isSome('hello')).toBe(true)
      expect(isSome(0)).toBe(true)
      expect(isSome('')).toBe(true)
      expect(isSome(false)).toBe(true)
      expect(isSome([])).toBe(true)
      expect(isSome({})).toBe(true)
    })

    it('should return false for null and undefined', () => {
      expect(isSome(null)).toBe(false)
      expect(isSome(undefined)).toBe(false)
    })
  })

  describe('isNone', () => {
    it('should return true for null and undefined', () => {
      expect(isNone(null)).toBe(true)
      expect(isNone(undefined)).toBe(true)
    })

    it('should return false for other values', () => {
      expect(isNone(42)).toBe(false)
      expect(isNone('hello')).toBe(false)
      expect(isNone(0)).toBe(false)
      expect(isNone('')).toBe(false)
      expect(isNone(false)).toBe(false)
    })
  })

  describe('maybe', () => {
    it('should transform value if present', () => {
      const double = (x: number) => x * 2
      expect(maybe(5, double, 0)).toBe(10)
      expect(maybe(0, double, 99)).toBe(0) // 0 is present
    })

    it('should return default if value is absent', () => {
      const double = (x: number) => x * 2
      expect(maybe(null, double, 0)).toBe(0)
      expect(maybe(undefined, double, 0)).toBe(0)
    })

    it('should work with different types', () => {
      const getLength = (s: string) => s.length
      expect(maybe('hello', getLength, -1)).toBe(5)
      expect(maybe(null, getLength, -1)).toBe(-1)
    })
  })

  describe('map', () => {
    it('should transform value if present', () => {
      const double = map((x: number) => x * 2)
      expect(double(5)).toBe(10)
      expect(double(0)).toBe(0)
    })

    it('should return original value if absent', () => {
      const double = map((x: number) => x * 2)
      expect(double(null)).toBe(null)
      expect(double(undefined)).toBe(undefined)
    })

    it('should work with type transformations', () => {
      const toString = map((x: number) => x.toString())
      expect(toString(42)).toBe('42')
      expect(toString(null)).toBe(null)
    })
  })

  describe('chain', () => {
    it('should chain transformations that return Maybe', () => {
      const safeDivide =
        (x: number) =>
        (y: number): Maybe<number> =>
          y === 0 ? undefined : x / y

      const chainSafeDivide = chain(safeDivide(10))

      expect(chainSafeDivide(2)).toBe(5)
      expect(chainSafeDivide(0)).toBe(undefined)
      expect(chainSafeDivide(null)).toBe(null)
      expect(chainSafeDivide(undefined)).toBe(undefined)
    })

    it('should handle multiple chaining operations', () => {
      const addOne = (x: number): Maybe<number> => x + 1
      const multiplyTwo = (x: number): Maybe<number> => x * 2
      const makeSurePositive = (x: number): Maybe<number> => (x > 0 ? x : undefined)

      const chainAddOne = chain(addOne)
      const chainMultiplyTwo = chain(multiplyTwo)
      const chainMakeSurePositive = chain(makeSurePositive)

      // Test successful chain: 5 -> 6 -> 12 -> 12 (positive)
      const result = chainMakeSurePositive(chainMultiplyTwo(chainAddOne(5)))
      expect(result).toBe(12)

      // Test chain that fails: -2 -> -1 -> -2 -> undefined (not positive)
      const result2 = chainMakeSurePositive(chainMultiplyTwo(chainAddOne(-2)))
      expect(result2).toBe(undefined)
    })
  })

  describe('filter', () => {
    it('should keep value if predicate passes', () => {
      const filterEven = filter((x: number) => x % 2 === 0)
      expect(filterEven(4)).toBe(4)
      expect(filterEven(0)).toBe(0)
    })

    it('should return undefined if predicate fails', () => {
      const filterEven = filter((x: number) => x % 2 === 0)
      expect(filterEven(3)).toBe(undefined)
      expect(filterEven(1)).toBe(undefined)
    })

    it('should return original if value is absent', () => {
      const filterEven = filter((x: number) => x % 2 === 0)
      expect(filterEven(null)).toBe(undefined)
      expect(filterEven(undefined)).toBe(undefined)
    })

    it('should work with complex predicates', () => {
      interface User {
        name: string
        age: number
      }

      const filterAdults = filter((user: User) => user.age >= 18)

      const adult = { name: 'John', age: 25 }
      const minor = { name: 'Jane', age: 16 }

      expect(filterAdults(adult)).toBe(adult)
      expect(filterAdults(minor)).toBe(undefined)
    })
  })

  describe('withDefault', () => {
    it('should return value if present', () => {
      const withDefaultZero = withDefault(0)
      expect(withDefaultZero(42)).toBe(42)
      expect(withDefaultZero(0)).toBe(0) // 0 is present
    })

    it('should return default if value is absent', () => {
      const withDefaultZero = withDefault(0)
      expect(withDefaultZero(null)).toBe(0)
      expect(withDefaultZero(undefined)).toBe(0)
    })

    it('should work with different default types', () => {
      const withDefaultString = withDefault('N/A')
      expect(withDefaultString('hello')).toBe('hello')
      expect(withDefaultString(null)).toBe('N/A')

      const withDefaultArray = withDefault([] as number[])
      expect(withDefaultArray([1, 2, 3])).toEqual([1, 2, 3])
      expect(withDefaultArray(null)).toEqual([])
    })
  })

  describe('unwrap', () => {
    it('should return value if present', () => {
      const unwrapDefault = unwrap()
      expect(unwrapDefault(42)).toBe(42)
      expect(unwrapDefault('hello')).toBe('hello')
      expect(unwrapDefault(0)).toBe(0)
    })

    it('should throw with default message if value is absent', () => {
      const unwrapDefault = unwrap()
      expect(() => unwrapDefault(null)).toThrow('Value is null or undefined')
      expect(() => unwrapDefault(undefined)).toThrow('Value is null or undefined')
    })

    it('should throw with custom message', () => {
      const unwrapCustom = unwrap('Custom error message')
      expect(() => unwrapCustom(null)).toThrow('Custom error message')
      expect(() => unwrapCustom(undefined)).toThrow('Custom error message')
    })
  })

  describe('fromTry', () => {
    it('should return result if function succeeds', () => {
      const safeParse = fromTry((str: string): unknown => JSON.parse(str))
      expect(safeParse('{"valid": true}')).toEqual({ valid: true })
      expect(safeParse('42')).toBe(42)
    })

    it('should return undefined if function throws', () => {
      const safeParse = fromTry((str: string): unknown => JSON.parse(str))
      expect(safeParse('invalid json')).toBe(undefined)
    })

    it('should work with multiple arguments', () => {
      const safeDivide = fromTry((a: number, b: number) => {
        if (b === 0) throw new Error('Division by zero')
        return a / b
      })

      expect(safeDivide(10, 2)).toBe(5)
      expect(safeDivide(10, 0)).toBe(undefined)
    })
  })

  describe('fromPromise', () => {
    it('should return value if promise resolves', async () => {
      const promise = Promise.resolve(42)
      const result = await fromPromise(promise)
      expect(result).toBe(42)
    })

    it('should return undefined if promise rejects', async () => {
      const promise = Promise.reject(new Error('Failed'))
      const result = await fromPromise(promise)
      expect(result).toBe(undefined)
    })

    it('should work with different value types', async () => {
      const stringPromise = Promise.resolve('hello')
      const objectPromise = Promise.resolve({ key: 'value' })
      const arrayPromise = Promise.resolve([1, 2, 3])

      expect(await fromPromise(stringPromise)).toBe('hello')
      expect(await fromPromise(objectPromise)).toEqual({ key: 'value' })
      expect(await fromPromise(arrayPromise)).toEqual([1, 2, 3])
    })
  })

  describe('all', () => {
    it('should return all values if all are present', () => {
      const result = all(1 as unknown, 'hello' as unknown, true as unknown, [] as unknown)
      expect(result).toEqual([1, 'hello', true, []])
    })

    it('should return undefined if any value is absent', () => {
      expect(all(1, null, true)).toBe(undefined)
      expect(all(1, 'hello', undefined)).toBe(undefined)
      expect(all(null, undefined)).toBe(undefined)
    })

    it('should handle empty input', () => {
      expect(all()).toEqual([])
    })

    it('should handle single values', () => {
      expect(all(42)).toEqual([42])
      expect(all(null)).toBe(undefined)
    })
  })

  describe('first', () => {
    it('should return first present value', () => {
      expect(first(null as unknown, undefined as unknown, 42 as unknown, 'hello' as unknown)).toBe(
        42
      )
      expect(first(undefined, 'first', 'second')).toBe('first')
      expect(first(0, 1, 2)).toBe(0) // 0 is present
    })

    it('should return undefined if all values are absent', () => {
      expect(first(null, undefined)).toBe(undefined)
      expect(first()).toBe(undefined)
    })

    it('should work with mixed types', () => {
      expect(first(null as unknown, false as unknown, 'hello' as unknown)).toBe(false)
      expect(first(undefined, 0 as unknown, 42)).toBe(0)
    })
  })

  describe('when', () => {
    it('should execute function if value is present', () => {
      const sideEffects: number[] = []
      const recordValue = when((x: number) => sideEffects.push(x))

      expect(recordValue(42)).toBe(42)
      expect(recordValue(0)).toBe(0)
      expect(sideEffects).toEqual([42, 0])
    })

    it('should not execute function if value is absent', () => {
      const sideEffects: unknown[] = []
      const recordValue = when((x: unknown) => sideEffects.push(x))

      expect(recordValue(null)).toBe(null)
      expect(recordValue(undefined)).toBe(undefined)
      expect(sideEffects).toEqual([])
    })
  })

  describe('toResult', () => {
    it('should convert present value to Ok result', () => {
      const toResultWithError = toResult('Error occurred')
      const result = toResultWithError(42)

      expect(result.tag).toBe('Ok')
      if (result.tag === 'Ok') {
        expect(result.value).toBe(42)
      }
    })

    it('should convert absent value to Err result', () => {
      const toResultWithError = toResult('Value is missing')

      const nullResult = toResultWithError(null)
      const undefinedResult = toResultWithError(undefined)

      expect(nullResult.tag).toBe('Err')
      if (nullResult.tag === 'Err') {
        expect(nullResult.error).toBe('Value is missing')
      }

      expect(undefinedResult.tag).toBe('Err')
      if (undefinedResult.tag === 'Err') {
        expect(undefinedResult.error).toBe('Value is missing')
      }
    })
  })

  describe('partition', () => {
    it('should separate present and absent values', () => {
      const values: Maybe<number>[] = [1, null, 3, undefined, 5, 0]
      const [present, absent] = partition(values)

      expect(present).toEqual([1, 3, 5, 0])
      expect(absent).toEqual([null, undefined])
    })

    it('should handle all present values', () => {
      const values: Maybe<string>[] = ['a', 'b', 'c']
      const [present, absent] = partition(values)

      expect(present).toEqual(['a', 'b', 'c'])
      expect(absent).toEqual([])
    })

    it('should handle all absent values', () => {
      const values: Maybe<number>[] = [null, undefined, null]
      const [present, absent] = partition(values)

      expect(present).toEqual([])
      expect(absent).toEqual([null, undefined, null])
    })

    it('should handle empty array', () => {
      const values: Maybe<unknown>[] = []
      const [present, absent] = partition(values)

      expect(present).toEqual([])
      expect(absent).toEqual([])
    })
  })
})
