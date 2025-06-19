import { describe, it, expect } from 'vitest'
import {
  curry2,
  curry3,
  curry4,
  partial,
  partialRight,
  flip,
  reverse,
  unary,
  binary,
  spread,
  collect,
  always,
  equals,
  gt,
  lt,
  gte,
  lte,
} from './curry'

describe('curry', () => {
  describe('curry2', () => {
    it('should curry a two-parameter function', () => {
      const add = (a: number, b: number) => a + b
      const curriedAdd = curry2(add)

      expect(curriedAdd(5)(3)).toBe(8)

      // Can be partially applied
      const add5 = curriedAdd(5)
      expect(add5(3)).toBe(8)
      expect(add5(10)).toBe(15)
    })

    it('should work with different types', () => {
      const concat = (a: string, b: string) => a + b
      const curriedConcat = curry2(concat)

      expect(curriedConcat('hello')(' world')).toBe('hello world')

      const addHello = curriedConcat('hello')
      expect(addHello(' there')).toBe('hello there')
    })
  })

  describe('curry3', () => {
    it('should curry a three-parameter function', () => {
      const addThree = (a: number, b: number, c: number) => a + b + c
      const curriedAddThree = curry3(addThree)

      expect(curriedAddThree(1)(2)(3)).toBe(6)

      // Can be partially applied at each stage
      const add1 = curriedAddThree(1)
      const add1And2 = add1(2)
      expect(add1And2(3)).toBe(6)
    })

    it('should work with mixed types', () => {
      const formatMessage = (prefix: string, message: string, suffix: string) =>
        `${prefix}${message}${suffix}`
      const curriedFormat = curry3(formatMessage)

      expect(curriedFormat('[')('hello')(']')).toBe('[hello]')

      const withBrackets = curriedFormat('[')
      const bracketHello = withBrackets('hello')
      expect(bracketHello(']')).toBe('[hello]')
    })
  })

  describe('curry4', () => {
    it('should curry a four-parameter function', () => {
      const addFour = (a: number, b: number, c: number, d: number) => a + b + c + d
      const curriedAddFour = curry4(addFour)

      expect(curriedAddFour(1)(2)(3)(4)).toBe(10)

      // Can be partially applied at each stage
      const add1 = curriedAddFour(1)
      const add1And2 = add1(2)
      const add1And2And3 = add1And2(3)
      expect(add1And2And3(4)).toBe(10)
    })
  })

  describe('partial', () => {
    it('should apply some arguments now, rest later', () => {
      const add = (a: number, b: number, c: number) => a + b + c
      const partialAdd = partial(add, 1, 2)

      expect(partialAdd(3)).toBe(6)
    })

    it('should work with different argument combinations', () => {
      const greet = (greeting: string, name: string, punctuation: string) =>
        `${greeting} ${name}${punctuation}`

      const sayHello = partial(greet, 'Hello')
      expect(sayHello('World', '!')).toBe('Hello World!')

      const sayHelloToJohn = partial(greet, 'Hello', 'John')
      expect(sayHelloToJohn('.')).toBe('Hello John.')
    })
  })

  describe('partialRight', () => {
    it('should apply arguments from the right side', () => {
      const subtract = (a: number, b: number, c: number) => a - b - c
      const partialSubtract = partialRight(subtract, 2, 1) // c=1, b=2

      expect(partialSubtract(10)).toBe(7) // 10 - 2 - 1
    })

    it('should work with string formatting', () => {
      const format = (prefix: string, message: string, suffix: string) =>
        `${prefix}${message}${suffix}`

      const withSuffix = partialRight(format, '.txt')
      expect(withSuffix('log_', 'data')).toBe('log_data.txt')
    })
  })

  describe('flip', () => {
    it('should flip the order of first two arguments', () => {
      const divide = (a: number, b: number) => a / b
      const flippedDivide = flip(divide)

      expect(divide(10, 2)).toBe(5)
      expect(flippedDivide(2, 10)).toBe(5) // Same result with flipped args
    })

    it('should work with string operations', () => {
      const prepend = (prefix: string, text: string) => prefix + text
      const append = flip(prepend)

      expect(prepend('Hello ', 'World')).toBe('Hello World')
      expect(append('World', 'Hello ')).toBe('Hello World')
    })
  })

  describe('reverse', () => {
    it('should reverse the order of all arguments', () => {
      const subtract = (a: number, b: number, c: number) => a - b - c
      const reversedSubtract = reverse(subtract)

      expect(subtract(10, 3, 2)).toBe(5) // 10 - 3 - 2
      expect(reversedSubtract(10, 3, 2)).toBe(-11) // 2 - 3 - 10 = -11
    })

    it('should work with string concatenation', () => {
      const concat = (...parts: string[]) => parts.join('')
      const reversedConcat = reverse(concat)

      expect(concat('a', 'b', 'c')).toBe('abc')
      expect(reversedConcat('a', 'b', 'c')).toBe('cba')
    })
  })

  describe('unary', () => {
    it('should create a function that takes only the first argument', () => {
      const add = (a: number, b?: number, c?: number) => {
        return a + (b || 0) + (c || 0)
      }

      const unaryAdd = unary(add as (arg: number, ...rest: unknown[]) => number)

      // Original function would use all arguments
      expect(add(10, 5, 3)).toBe(18) // 10 + 5 + 3

      // Unary version only passes first argument
      expect(unaryAdd(10)).toBe(10) // Just the first number
    })

    it('should work with array methods', () => {
      const numbers = ['1', '2', '3', '4', '5']

      // parseInt normally takes (string, radix), but map passes (item, index, array)
      // This can cause issues: parseInt('1', 0), parseInt('2', 1), etc.
      const problematicParse = numbers.map(parseInt)
      expect(problematicParse).toEqual([1, NaN, NaN, NaN, NaN])

      // Using unary fixes this by only passing the first argument
      const safeParse = numbers.map(unary(parseInt as (arg: string, ...rest: unknown[]) => number))
      expect(safeParse).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('binary', () => {
    it('should create a function that takes only the first two arguments', () => {
      const addWithDefault = (a: number, b: number, c: number = 0) => a + b + c
      const addTwoNumbers = binary(
        addWithDefault as (a: number, b: number, ...rest: unknown[]) => number
      )

      // Binary function ignores the third argument
      expect(addTwoNumbers(1, 2)).toBe(3) // 1 + 2 + 0 (default)

      // More realistic example
      const formatName = (first: string, last: string, middle?: string) => {
        if (middle) return `${first} ${middle} ${last}`
        return `${first} ${last}`
      }

      const binaryFormatName = binary(
        formatName as (a: string, b: string, ...rest: unknown[]) => string
      )
      expect(binaryFormatName('John', 'Doe')).toBe('John Doe')
    })
  })

  describe('spread', () => {
    it('should spread array as arguments to function', () => {
      const add = (a: number, b: number, c: number) => a + b + c
      const spreadAdd = spread(add)

      expect(spreadAdd([1, 2, 3])).toBe(6)
    })

    it('should work with Math functions', () => {
      const spreadMax = spread(Math.max)
      const spreadMin = spread(Math.min)

      expect(spreadMax([1, 5, 3, 9, 2])).toBe(9)
      expect(spreadMin([1, 5, 3, 9, 2])).toBe(1)
    })
  })

  describe('collect', () => {
    it('should collect arguments into an array', () => {
      const sumArray = (numbers: number[]) => numbers.reduce((sum, n) => sum + n, 0)
      const collectSum = collect(sumArray)

      expect(collectSum(1, 2, 3, 4, 5)).toBe(15)
    })

    it('should work with array processing functions', () => {
      const joinWithCommas = (strings: string[]) => strings.join(', ')
      const collectJoin = collect(joinWithCommas)

      expect(collectJoin('apple', 'banana', 'cherry')).toBe('apple, banana, cherry')
    })
  })

  describe('always', () => {
    it('should return a function that always returns the same value', () => {
      const alwaysTrue = always(true)
      const alwaysZero = always(0)
      const alwaysHello = always('hello')

      expect(alwaysTrue()).toBe(true)
      expect(alwaysZero()).toBe(0)
      expect(alwaysHello()).toBe('hello')

      // Multiple calls return same value
      expect(alwaysTrue()).toBe(true)
      expect(alwaysZero()).toBe(0)
    })

    it('should work with objects (same reference)', () => {
      const obj = { a: 1 }
      const alwaysObj = always(obj)

      expect(alwaysObj()).toBe(obj)
      expect(alwaysObj()).toBe(obj) // Same reference
    })
  })

  describe('equals', () => {
    it('should create a predicate that checks equality', () => {
      const isZero = equals(0)
      const isHello = equals('hello')

      expect(isZero(0)).toBe(true)
      expect(isZero(1)).toBe(false)
      expect(isZero(-1)).toBe(false)

      expect(isHello('hello')).toBe(true)
      expect(isHello('world')).toBe(false)
    })

    it('should work with arrays for filtering', () => {
      const numbers = [1, 2, 3, 2, 4, 2, 5]
      const isTwo = equals(2)

      expect(numbers.filter(isTwo)).toEqual([2, 2, 2])
    })
  })

  describe('gt', () => {
    it('should create a predicate for greater than', () => {
      const greaterThanFive = gt(5)

      expect(greaterThanFive(6)).toBe(true)
      expect(greaterThanFive(10)).toBe(true)
      expect(greaterThanFive(5)).toBe(false)
      expect(greaterThanFive(4)).toBe(false)
    })

    it('should work with arrays for filtering', () => {
      const numbers = [1, 6, 3, 8, 4, 9, 2]
      const greaterThanFive = gt(5)

      expect(numbers.filter(greaterThanFive)).toEqual([6, 8, 9])
    })
  })

  describe('lt', () => {
    it('should create a predicate for less than', () => {
      const lessThanFive = lt(5)

      expect(lessThanFive(4)).toBe(true)
      expect(lessThanFive(1)).toBe(true)
      expect(lessThanFive(5)).toBe(false)
      expect(lessThanFive(6)).toBe(false)
    })

    it('should work with arrays for filtering', () => {
      const numbers = [1, 6, 3, 8, 4, 9, 2]
      const lessThanFive = lt(5)

      expect(numbers.filter(lessThanFive)).toEqual([1, 3, 4, 2])
    })
  })

  describe('gte', () => {
    it('should create a predicate for greater than or equal', () => {
      const greaterThanOrEqualToFive = gte(5)

      expect(greaterThanOrEqualToFive(5)).toBe(true)
      expect(greaterThanOrEqualToFive(6)).toBe(true)
      expect(greaterThanOrEqualToFive(4)).toBe(false)
    })

    it('should work with arrays for filtering', () => {
      const numbers = [1, 6, 3, 8, 4, 5, 2]
      const greaterThanOrEqualToFive = gte(5)

      expect(numbers.filter(greaterThanOrEqualToFive)).toEqual([6, 8, 5])
    })
  })

  describe('lte', () => {
    it('should create a predicate for less than or equal', () => {
      const lessThanOrEqualToFive = lte(5)

      expect(lessThanOrEqualToFive(5)).toBe(true)
      expect(lessThanOrEqualToFive(4)).toBe(true)
      expect(lessThanOrEqualToFive(6)).toBe(false)
    })

    it('should work with arrays for filtering', () => {
      const numbers = [1, 6, 3, 8, 4, 5, 2]
      const lessThanOrEqualToFive = lte(5)

      expect(numbers.filter(lessThanOrEqualToFive)).toEqual([1, 3, 4, 5, 2])
    })
  })
})
