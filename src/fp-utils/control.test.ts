import { describe, it, expect } from 'vitest'
import { cond, condWith, when, unless, switchCase, guard, branch } from './control'

describe('control', () => {
  describe('cond', () => {
    it('should execute the first matching condition', () => {
      const classify = cond([
        [(_x: number) => _x < 0, (_x: number) => 'negative'],
        [(_x: number) => _x === 0, (_x: number) => 'zero'],
        [(_x: number) => _x > 0, (_x: number) => 'positive'],
      ])

      expect(classify(-5)).toBe('negative')
      expect(classify(0)).toBe('zero')
      expect(classify(10)).toBe('positive')
    })

    it('should return undefined if no condition matches', () => {
      const classify = cond([[(_x: number) => _x > 100, (_x: number) => 'large']])

      expect(classify(50)).toBe(undefined)
    })

    it('should work with different types', () => {
      const handleString = cond([
        [(s: string) => s.startsWith('hello'), (s: string) => `greeting: ${s}`],
        [(s: string) => s.length > 10, (s: string) => `long: ${s}`],
        [(s: string) => s.includes('test'), (s: string) => `test: ${s}`],
      ])

      expect(handleString('hello world')).toBe('greeting: hello world')
      expect(handleString('this is a very long string')).toBe('long: this is a very long string')
      expect(handleString('test case')).toBe('test: test case')
      expect(handleString('short')).toBe(undefined)
    })

    it('should execute only the first matching condition', () => {
      const multiMatch = cond([
        [(_x: number) => _x > 0, (_x: number) => 'first positive'],
        [(_x: number) => _x > 5, (_x: number) => 'greater than 5'],
        [(_x: number) => _x > 0, (_x: number) => 'second positive'],
      ])

      expect(multiMatch(10)).toBe('first positive')
    })
  })

  describe('condWith', () => {
    it('should execute the first matching condition', () => {
      const classify = condWith(
        [
          [(_x: number) => _x < 0, (_x: number) => 'negative'],
          [(_x: number) => _x === 0, (_x: number) => 'zero'],
          [(_x: number) => _x > 0, (_x: number) => 'positive'],
        ],
        (_x: number) => 'unknown'
      )

      expect(classify(-5)).toBe('negative')
      expect(classify(0)).toBe('zero')
      expect(classify(10)).toBe('positive')
    })

    it('should use default function if no condition matches', () => {
      const classify = condWith(
        [[(_x: number) => _x > 100, (_x: number) => 'large']],
        (_x: number) => `small: ${_x}`
      )

      expect(classify(50)).toBe('small: 50')
      expect(classify(150)).toBe('large')
    })
  })

  describe('when', () => {
    it('should execute function if predicate is true', () => {
      const incrementIfEven = when(
        (x: number) => x % 2 === 0,
        (x: number) => x + 1
      )

      expect(incrementIfEven(4)).toBe(5)
      expect(incrementIfEven(5)).toBe(5)
    })

    it('should return value unchanged if predicate is false', () => {
      const doubleIfPositive = when(
        (x: number) => x > 0,
        (x: number) => x * 2
      )

      expect(doubleIfPositive(5)).toBe(10)
      expect(doubleIfPositive(-3)).toBe(-3)
      expect(doubleIfPositive(0)).toBe(0)
    })

    it('should work with strings', () => {
      const addExclamationIfShort = when(
        (s: string) => s.length < 5,
        (s: string) => s + '!'
      )

      expect(addExclamationIfShort('hi')).toBe('hi!')
      expect(addExclamationIfShort('hello world')).toBe('hello world')
    })
  })

  describe('unless', () => {
    it('should execute function if predicate is false', () => {
      const incrementUnlessEven = unless(
        (x: number) => x % 2 === 0,
        (x: number) => x + 1
      )

      expect(incrementUnlessEven(4)).toBe(4)
      expect(incrementUnlessEven(5)).toBe(6)
    })

    it('should return value unchanged if predicate is true', () => {
      const doubleUnlessNegative = unless(
        (x: number) => x < 0,
        (x: number) => x * 2
      )

      expect(doubleUnlessNegative(5)).toBe(10)
      expect(doubleUnlessNegative(-3)).toBe(-3)
      expect(doubleUnlessNegative(0)).toBe(0)
    })
  })

  describe('switchCase', () => {
    it('should execute the correct case handler', () => {
      const statusHandlers = {
        200: (msg: string) => `OK: ${msg}`,
        404: (msg: string) => `Not Found: ${msg}`,
        500: (msg: string) => `Server Error: ${msg}`,
      } as const

      const handleHttpStatus = switchCase(statusHandlers)

      expect(handleHttpStatus(200)('Success')).toBe('OK: Success')
      expect(handleHttpStatus(404)('Page missing')).toBe('Not Found: Page missing')
      expect(handleHttpStatus(500)('Database down')).toBe('Server Error: Database down')
    })

    it('should use default handler if no case matches', () => {
      const knownHandlers = {
        200: (msg: string) => `OK: ${msg}`,
        404: (msg: string) => `Not Found: ${msg}`,
      } as const

      const handleHttpStatus = switchCase(knownHandlers, (msg: string) => `Unknown status: ${msg}`)

      expect(handleHttpStatus(200)('Success')).toBe('OK: Success')
      // Test with unknown status - this will use the default handler
      const handleUnknownStatus = switchCase(
        knownHandlers,
        (msg: string) => `Unknown status: ${msg}`
      )
      expect(handleUnknownStatus(500 as 200)('Error')).toBe('Unknown status: Error')
    })

    it('should throw error if no case and no default', () => {
      const singleHandler = {
        200: (msg: string) => `OK: ${msg}`,
      } as const

      const handleHttpStatus = switchCase(singleHandler)

      // This will throw because 404 is not in the handlers and no default is provided
      expect(() => handleHttpStatus(404 as 200)('Error')).toThrow('No case found for key: 404')
    })

    it('should work with string keys', () => {
      const handleAction = switchCase({
        create: (data: string) => `Creating: ${data}`,
        update: (data: string) => `Updating: ${data}`,
        delete: (data: string) => `Deleting: ${data}`,
      })

      expect(handleAction('create')('user')).toBe('Creating: user')
      expect(handleAction('update')('profile')).toBe('Updating: profile')
      expect(handleAction('delete')('record')).toBe('Deleting: record')
    })
  })

  describe('guard', () => {
    it('should return value if predicate passes', () => {
      const ensurePositive = guard((x: number) => x > 0, 'Number must be positive')

      expect(ensurePositive(5)).toBe(5)
      expect(ensurePositive(0.1)).toBe(0.1)
    })

    it('should throw error if predicate fails', () => {
      const ensurePositive = guard((x: number) => x > 0, 'Number must be positive')

      expect(() => ensurePositive(-5)).toThrow('Number must be positive')
      expect(() => ensurePositive(0)).toThrow('Number must be positive')
    })

    it('should use dynamic error message', () => {
      const ensureInRange = guard(
        (x: number) => x >= 0 && x <= 100,
        (x: number) => `Value ${x} is not in range 0-100`
      )

      expect(ensureInRange(50)).toBe(50)
      expect(() => ensureInRange(-10)).toThrow('Value -10 is not in range 0-100')
      expect(() => ensureInRange(150)).toThrow('Value 150 is not in range 0-100')
    })

    it('should work with complex objects', () => {
      interface User {
        name: string
        age: number
      }

      const ensureValidUser = guard(
        (user: User) => user.name.length > 0 && user.age >= 18,
        'User must have a name and be at least 18'
      )

      const validUser = { name: 'John', age: 25 }
      const invalidUser1 = { name: '', age: 25 }
      const invalidUser2 = { name: 'Jane', age: 16 }

      expect(ensureValidUser(validUser)).toBe(validUser)
      expect(() => ensureValidUser(invalidUser1)).toThrow(
        'User must have a name and be at least 18'
      )
      expect(() => ensureValidUser(invalidUser2)).toThrow(
        'User must have a name and be at least 18'
      )
    })
  })

  describe('branch', () => {
    it('should execute onTrue function if predicate is true', () => {
      const handleNumber = branch(
        (x: number) => x > 0,
        (x: number) => `positive: ${x}`,
        (x: number) => `non-positive: ${x}`
      )

      expect(handleNumber(5)).toBe('positive: 5')
      expect(handleNumber(-3)).toBe('non-positive: -3')
      expect(handleNumber(0)).toBe('non-positive: 0')
    })

    it('should work with different return types for branches', () => {
      const processValue = branch(
        (x: string) => x.length > 5,
        (x: string) => x.toUpperCase(),
        (x: string) => x.toLowerCase()
      )

      expect(processValue('hello world')).toBe('HELLO WORLD')
      expect(processValue('hi')).toBe('hi')
    })

    it('should handle complex branching logic', () => {
      interface Request {
        method: string
        authenticated: boolean
      }

      const handleRequest = branch(
        (req: Request) => req.authenticated,
        (req: Request) => `Processing ${req.method} request`,
        (req: Request) => `Unauthorized ${req.method} request`
      )

      expect(handleRequest({ method: 'GET', authenticated: true })).toBe('Processing GET request')
      expect(handleRequest({ method: 'POST', authenticated: false })).toBe(
        'Unauthorized POST request'
      )
    })
  })
})
