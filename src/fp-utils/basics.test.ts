import { describe, it, expect } from 'vitest'
import { identity, constant, pipe, compose, noop } from './basics'

describe('basics', () => {
  describe('identity', () => {
    it('should return the same value passed to it', () => {
      expect(identity(42)).toBe(42)
      expect(identity('hello')).toBe('hello')
      expect(identity(null)).toBe(null)
      expect(identity(undefined)).toBe(undefined)

      const obj = { a: 1 }
      expect(identity(obj)).toBe(obj)
    })
  })

  describe('constant', () => {
    it('should return a function that always returns the given value', () => {
      const constantFive = constant(5)
      expect(constantFive()).toBe(5)
      expect(constantFive()).toBe(5)

      const constantObj = constant({ a: 1 })
      const obj = constantObj()
      expect(obj).toEqual({ a: 1 })
      expect(constantObj()).toBe(obj)
    })
  })

  describe('noop', () => {
    it('should return undefined and do nothing', () => {
      expect(noop()).toBe(undefined)
    })
  })

  describe('pipe', () => {
    it('should compose functions from left to right with one function', () => {
      const add1 = (x: number) => x + 1
      const piped = pipe(add1)
      expect(piped(5)).toBe(6)
    })

    it('should compose functions from left to right with two functions', () => {
      const add1 = (x: number) => x + 1
      const multiply2 = (x: number) => x * 2
      const piped = pipe(add1, multiply2)
      expect(piped(5)).toBe(12) // (5 + 1) * 2 = 12
    })

    it('should compose functions from left to right with three functions', () => {
      const add1 = (x: number) => x + 1
      const multiply2 = (x: number) => x * 2
      const subtract3 = (x: number) => x - 3
      const piped = pipe(add1, multiply2, subtract3)
      expect(piped(5)).toBe(9) // ((5 + 1) * 2) - 3 = 9
    })

    it('should work with different types', () => {
      const toString = (x: number) => x.toString()
      const addExclamation = (x: string) => x + '!'
      const piped = pipe(toString, addExclamation)
      expect(piped(42)).toBe('42!')
    })

    it('should handle complex pipelines', () => {
      const add1 = (x: number) => x + 1
      const multiply2 = (x: number) => x * 2
      const toString = (x: number) => x.toString()
      const addPrefix = (x: string) => `value: ${x}`
      const piped = pipe(add1, multiply2, toString, addPrefix)
      expect(piped(5)).toBe('value: 12')
    })
  })

  describe('compose', () => {
    it('should compose functions from right to left with one function', () => {
      const add1 = (x: number) => x + 1
      const composed = compose(add1)
      expect(composed(5)).toBe(6)
    })

    it('should compose functions from right to left with two functions', () => {
      const add1 = (x: number) => x + 1
      const multiply2 = (x: number) => x * 2
      const composed = compose(multiply2, add1)
      expect(composed(5)).toBe(12) // (5 + 1) * 2 = 12
    })

    it('should compose functions from right to left with three functions', () => {
      const add1 = (x: number) => x + 1
      const multiply2 = (x: number) => x * 2
      const subtract3 = (x: number) => x - 3
      const composed = compose(subtract3, multiply2, add1)
      expect(composed(5)).toBe(9) // ((5 + 1) * 2) - 3 = 9
    })

    it('should work with different types', () => {
      const toString = (x: number) => x.toString()
      const addExclamation = (x: string) => x + '!'
      const composed = compose(addExclamation, toString)
      expect(composed(42)).toBe('42!')
    })

    it('should be inverse of pipe for same operations', () => {
      const add1 = (x: number) => x + 1
      const multiply2 = (x: number) => x * 2

      const piped = pipe(add1, multiply2)
      const composed = compose(multiply2, add1)

      expect(piped(5)).toBe(composed(5))
    })
  })
})
