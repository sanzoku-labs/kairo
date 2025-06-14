import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSignal, signal, signalEffect, type Signal } from '../src/core/signal'
import { pipeline } from '../src/core/pipeline'
import { schema } from '../src/core/schema'
import { Result } from '../src/core/result'
import { z } from 'zod'

describe('Signal Primitive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Signal Operations', () => {
    it('should create a signal with initial value', () => {
      const numberSignal = createSignal(42)

      expect(numberSignal.get()).toBe(42)
      expect(numberSignal.value).toBe(42)
    })

    it('should set new values', () => {
      const textSignal = createSignal('hello')

      const result = textSignal.set('world')

      expect(Result.isOk(result)).toBe(true)
      expect(textSignal.get()).toBe('world')
      expect(textSignal.value).toBe('world')
    })

    it('should update values with function', () => {
      const countSignal = createSignal(0)

      const result = countSignal.update(x => x + 1)

      expect(Result.isOk(result)).toBe(true)
      expect(countSignal.get()).toBe(1)
    })

    it('should handle errors in update function', () => {
      const numberSignal = createSignal(5)

      const result = numberSignal.update(_x => {
        throw new Error('Update failed')
      })

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect((result.error as { code: string }).code).toBe('SIGNAL_ERROR')
        expect((result.error as { operation: string }).operation).toBe('update')
      }
      // Original value should be unchanged
      expect(numberSignal.get()).toBe(5)
    })
  })

  describe('Signal Subscriptions', () => {
    it('should notify subscribers when value changes', () => {
      const textSignal = createSignal('initial')
      const subscriber = vi.fn()

      const subscription = textSignal.subscribe(subscriber)

      // Should be called immediately with current value
      expect(subscriber).toHaveBeenCalledWith('initial')
      expect(subscriber).toHaveBeenCalledTimes(1)

      textSignal.set('updated')

      expect(subscriber).toHaveBeenCalledWith('updated')
      expect(subscriber).toHaveBeenCalledTimes(2)

      subscription.unsubscribe()
    })

    it('should handle multiple subscribers', () => {
      const numberSignal = createSignal(10)
      const subscriber1 = vi.fn()
      const subscriber2 = vi.fn()

      const sub1 = numberSignal.subscribe(subscriber1)
      const sub2 = numberSignal.subscribe(subscriber2)

      numberSignal.set(20)

      expect(subscriber1).toHaveBeenCalledWith(20)
      expect(subscriber2).toHaveBeenCalledWith(20)

      sub1.unsubscribe()
      sub2.unsubscribe()
    })

    it('should stop notifying after unsubscribe', () => {
      const signal = createSignal('test')
      const subscriber = vi.fn()

      const subscription = signal.subscribe(subscriber)
      signal.set('update1')

      subscription.unsubscribe()
      signal.set('update2')

      // Should only be called for initial value and first update
      expect(subscriber).toHaveBeenCalledTimes(2)
      expect(subscriber).toHaveBeenNthCalledWith(1, 'test')
      expect(subscriber).toHaveBeenNthCalledWith(2, 'update1')
    })

    it('should handle subscription errors gracefully', () => {
      const signal = createSignal(1)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const subscription = signal.subscribe(() => {
        throw new Error('Subscription error')
      })

      signal.set(2)

      expect(consoleSpy).toHaveBeenCalledWith('Signal subscription error:', expect.any(Error))

      subscription.unsubscribe()
      consoleSpy.mockRestore()
    })
  })

  describe('Signal Transformations', () => {
    it('should map values with pipe', () => {
      const numberSignal = createSignal(5)
      const doubledSignal = numberSignal.pipe(x => x * 2)

      expect(doubledSignal.get()).toBe(10)

      numberSignal.set(10)
      expect(doubledSignal.get()).toBe(20)
    })

    it('should map values with map method', () => {
      const textSignal = createSignal('hello')
      const upperSignal = textSignal.map(x => x.toUpperCase())

      expect(upperSignal.get()).toBe('HELLO')

      textSignal.set('world')
      expect(upperSignal.get()).toBe('WORLD')
    })

    it('should filter values', () => {
      const numberSignal = createSignal(5)
      const evenSignal = numberSignal.filter(x => x % 2 === 0)

      // Initial value is odd, so filtered signal keeps it
      expect(evenSignal.get()).toBe(5)

      numberSignal.set(4) // Even number
      expect(evenSignal.get()).toBe(4)

      numberSignal.set(7) // Odd number - should not update filtered signal
      expect(evenSignal.get()).toBe(4) // Should remain 4
    })

    it('should handle map transformation errors', () => {
      const numberSignal = createSignal(1)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const errorSignal = numberSignal.map((x: number) => {
        if (x > 5) throw new Error('Too big')
        return x * 2
      })

      expect(errorSignal.get()).toBe(2)

      numberSignal.set(10) // Should trigger error

      expect(consoleSpy).toHaveBeenCalledWith('Signal map transformation error:', expect.any(Error))
      // Derived signal should keep its previous value
      expect(errorSignal.get()).toBe(2)

      consoleSpy.mockRestore()
    })

    it('should handle filter predicate errors', () => {
      const numberSignal = createSignal(1)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      numberSignal.filter((x: number) => {
        if (x > 5) throw new Error('Filter error')
        return x % 2 === 0
      })

      numberSignal.set(10) // Should trigger error

      expect(consoleSpy).toHaveBeenCalledWith('Signal filter predicate error:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('Signal Utilities', () => {
    it('should create signal with signal.of', () => {
      const testSignal = signal.of('test')

      expect(testSignal.get()).toBe('test')
    })

    it('should combine multiple signals', () => {
      const firstSignal = createSignal('Hello')
      const secondSignal = createSignal('World')

      const combinedSignal = signal.combine(
        [firstSignal, secondSignal] as const,
        (first, second) => `${first} ${second}`
      )

      expect(combinedSignal.get()).toBe('Hello World')

      firstSignal.set('Hi')
      expect(combinedSignal.get()).toBe('Hi World')

      secondSignal.set('Universe')
      expect(combinedSignal.get()).toBe('Hi Universe')
    })

    it('should handle combine transformation errors', () => {
      const num1Signal = createSignal(1)
      const num2Signal = createSignal(2)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const combinedSignal = signal.combine([num1Signal, num2Signal] as const, (a, b) => {
        if (a + b > 10) throw new Error('Sum too big')
        return a + b
      })

      expect(combinedSignal.get()).toBe(3)

      num1Signal.set(8) // 8 + 2 = 10, should work
      expect(combinedSignal.get()).toBe(10)

      num2Signal.set(5) // 8 + 5 = 13, should trigger error
      expect(consoleSpy).toHaveBeenCalledWith('Signal combine error:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should create conditional signals', () => {
      const numberSignal = createSignal(1)
      const evenOnlySignal = signal.conditional(numberSignal, x => x % 2 === 0)

      expect(evenOnlySignal.get()).toBe(1) // Initial value

      numberSignal.set(2) // Even - should update
      expect(evenOnlySignal.get()).toBe(2)

      numberSignal.set(3) // Odd - should not update
      expect(evenOnlySignal.get()).toBe(2) // Should remain 2

      numberSignal.set(4) // Even - should update
      expect(evenOnlySignal.get()).toBe(4)
    })

    it('should create validated signals', () => {
      const validatedSignal: Signal<number> = signal.validated(5, (x: number) => x >= 0 && x <= 10)

      expect(validatedSignal.get()).toBe(5)

      // Test valid value
      const validResult = validatedSignal.set(8)
      expect(Result.isOk(validResult)).toBe(true)
      expect(validatedSignal.get()).toBe(8)

      // Test invalid value
      const invalidResult = validatedSignal.set(15) // Should fail validation
      expect(Result.isErr(invalidResult)).toBe(true)
      expect(validatedSignal.get()).toBe(8) // Should remain unchanged

      if (Result.isErr(invalidResult)) {
        expect((invalidResult.error as { code: string }).code).toBe('SIGNAL_ERROR')
        expect((invalidResult.error as { operation: string }).operation).toBe('validated_set')
      }
    })
  })

  describe('Signal Effects', () => {
    it('should run effects on change', () => {
      const numberSignal = createSignal(1)
      const effectFn = vi.fn()

      const subscription = signalEffect.onChange(numberSignal, effectFn)

      expect(effectFn).toHaveBeenCalledWith(1) // Initial call

      numberSignal.set(2)
      expect(effectFn).toHaveBeenCalledWith(2)
      expect(effectFn).toHaveBeenCalledTimes(2)

      subscription.unsubscribe()
    })

    it('should run effects only on changes (skip initial)', () => {
      const textSignal = createSignal('initial')
      const effectFn = vi.fn()

      const subscription = signalEffect.onChangeOnly(textSignal, effectFn)

      expect(effectFn).not.toHaveBeenCalled() // Should skip initial

      textSignal.set('changed')
      expect(effectFn).toHaveBeenCalledWith('changed')
      expect(effectFn).toHaveBeenCalledTimes(1)

      subscription.unsubscribe()
    })

    it('should run effects when signal becomes truthy', () => {
      const boolSignal = createSignal(false)
      const effectFn = vi.fn()

      const subscription = signalEffect.onTrue(boolSignal, effectFn)

      expect(effectFn).not.toHaveBeenCalled() // Initial value is falsy

      boolSignal.set(true)
      expect(effectFn).toHaveBeenCalledWith(true)

      boolSignal.set(false)
      expect(effectFn).toHaveBeenCalledTimes(1) // Should not call for falsy

      subscription.unsubscribe()
    })

    it('should batch multiple effects', () => {
      const effect1 = vi.fn()
      const effect2 = vi.fn()
      const effect3 = vi.fn()

      signalEffect.batch([effect1, effect2, effect3])

      expect(effect1).toHaveBeenCalledTimes(1)
      expect(effect2).toHaveBeenCalledTimes(1)
      expect(effect3).toHaveBeenCalledTimes(1)
    })
  })

  describe('Pipeline Integration', () => {
    it('should convert pipeline to signal', async () => {
      const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({ id: 1, name: 'Test User' }),
        }),
      }

      const userSchema = schema.object({
        id: z.number(),
        name: z.string(),
      })

      const userPipeline = pipeline('fetch-user', { httpClient: mockHttpClient })
        .fetch('/api/user/1')
        .validate(userSchema)

      const userSignal = userPipeline.asSignal()

      // Should start with placeholder value
      expect(Result.isOk(userSignal.get())).toBe(true)

      // Wait for pipeline to complete
      await new Promise(resolve => globalThis.setTimeout(resolve, 10))

      const finalResult = userSignal.get()
      expect(Result.isOk(finalResult)).toBe(true)
      if (Result.isOk(finalResult)) {
        expect(finalResult.value).toEqual({ id: 1, name: 'Test User' })
      }
    })

    it('should handle pipeline errors in signal', async () => {
      const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        }),
      }

      const errorPipeline = pipeline('error-pipeline', { httpClient: mockHttpClient }).fetch(
        '/api/notfound'
      )

      const errorSignal = errorPipeline.asSignal()

      // Wait for pipeline to complete
      await new Promise(resolve => globalThis.setTimeout(resolve, 10))

      const result = errorSignal.get()
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect((result.error as { code: string }).code).toBe('HTTP_ERROR')
      }
    })

    it('should handle pipeline exceptions in signal', async () => {
      const mockHttpClient = {
        fetch: vi.fn().mockRejectedValue(new Error('Network error')),
      }

      const exceptionPipeline = pipeline('exception-pipeline', {
        httpClient: mockHttpClient,
      }).fetch('/api/error')

      const exceptionSignal = exceptionPipeline.asSignal()

      // Wait for pipeline to complete
      await new Promise(resolve => globalThis.setTimeout(resolve, 10))

      const result = exceptionSignal.get()
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect((result.error as { code: string }).code).toBe('HTTP_ERROR')
      }
    })
  })

  describe('Complex Signal Patterns', () => {
    it('should handle chained transformations', () => {
      const numberSignal = createSignal(2)

      const transformedSignal = numberSignal
        .map(x => x * 2) // 4
        .map(x => x + 1) // 5
        .filter(x => x > 3) // 5 (passes filter)
        .map(x => x.toString()) // "5"

      expect(transformedSignal.get()).toBe('5')

      numberSignal.set(1) // -> 2 -> 3 (fails filter)
      expect(transformedSignal.get()).toBe('5') // Should remain "5"

      numberSignal.set(3) // -> 6 -> 7 (passes filter) -> "7"
      expect(transformedSignal.get()).toBe('7')
    })

    it('should work with complex object updates', () => {
      interface User {
        id: number
        name: string
        email: string
      }

      const userSignal = createSignal<User>({
        id: 1,
        name: 'John',
        email: 'john@example.com',
      })

      const nameSignal = userSignal.map(user => user.name)
      const emailSignal = userSignal.map(user => user.email)

      expect(nameSignal.get()).toBe('John')
      expect(emailSignal.get()).toBe('john@example.com')

      userSignal.update(user => ({
        ...user,
        name: 'Jane',
        email: 'jane@example.com',
      }))

      expect(nameSignal.get()).toBe('Jane')
      expect(emailSignal.get()).toBe('jane@example.com')
    })

    it('should support reactive computation chains', () => {
      const firstNameSignal = createSignal('John')
      const lastNameSignal = createSignal('Doe')
      const ageSignal = createSignal(30)

      const fullNameSignal = signal.combine(
        [firstNameSignal, lastNameSignal] as const,
        (first, last) => `${first} ${last}`
      )

      const profileSignal = signal.combine(
        [fullNameSignal, ageSignal] as const,
        (name, age) => `${name} (${age} years old)`
      )

      expect(profileSignal.get()).toBe('John Doe (30 years old)')

      firstNameSignal.set('Jane')
      expect(profileSignal.get()).toBe('Jane Doe (30 years old)')

      ageSignal.set(25)
      expect(profileSignal.get()).toBe('Jane Doe (25 years old)')
    })
  })
})
