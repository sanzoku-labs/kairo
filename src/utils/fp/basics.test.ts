import { describe, it, expect } from 'vitest'
import { identity, constant, pipe, compose, noop } from './basics'

describe('basics', () => {
  describe('identity', () => {
    it('should return the same value', () => {
      expect(identity(5)).toBe(5)
      expect(identity('hello')).toBe('hello')
      expect(identity({ a: 1 })).toEqual({ a: 1 })
      expect(identity(null)).toBe(null)
      expect(identity(undefined)).toBe(undefined)
    })
  })

  describe('constant', () => {
    it('should return a function that always returns the same value', () => {
      const always5 = constant(5)
      expect(always5()).toBe(5)
      expect(always5()).toBe(5)

      const alwaysObj = constant({ x: 1 })
      const result1 = alwaysObj()
      const result2 = alwaysObj()
      expect(result1).toBe(result2)
      expect(result1).toEqual({ x: 1 })
    })
  })

  describe('noop', () => {
    it('should return undefined', () => {
      expect(noop()).toBeUndefined()
    })
  })

  describe('pipe', () => {
    it('should compose functions left to right', () => {
      const add = (x: number) => x + 1
      const multiply = (x: number) => x * 2
      const toString = (x: number) => x.toString()

      const pipeline = pipe(add, multiply, toString)
      expect(pipeline(5)).toBe('12') // (5 + 1) * 2 = 12
    })

    it('should work with single function', () => {
      const double = (x: number) => x * 2
      const pipeline = pipe(double)
      expect(pipeline(5)).toBe(10)
    })

    it('should handle type transformations', () => {
      const toLength = (s: string) => s.length
      const isEven = (n: number) => n % 2 === 0
      const pipeline = pipe(toLength, isEven)

      expect(pipeline('hello')).toBe(false) // length 5 is odd
      expect(pipeline('test')).toBe(true) // length 4 is even
    })
  })

  describe('compose', () => {
    it('should compose functions right to left', () => {
      const add = (x: number) => x + 1
      const multiply = (x: number) => x * 2
      const toString = (x: number) => x.toString()

      const composition = compose(toString, multiply, add)
      expect(composition(5)).toBe('12') // toString((5 + 1) * 2) = '12'
    })

    it('should work with single function', () => {
      const double = (x: number) => x * 2
      const composition = compose(double)
      expect(composition(5)).toBe(10)
    })

    it('should be opposite of pipe', () => {
      const add = (x: number) => x + 1
      const multiply = (x: number) => x * 2

      const piped = pipe(add, multiply)
      const composed = compose(multiply, add)

      expect(piped(5)).toBe(composed(5))
    })
  })
})
