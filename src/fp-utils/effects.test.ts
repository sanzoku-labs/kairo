import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  effect,
  conditionalEffect,
  effectWhen,
  effectUnless,
  log,
  debug,
  trace,
  asyncEffect,
  effects,
  throttleEffect,
  debounceEffect,
  measure,
  countCalls,
  collect,
  catchEffect,
} from './effects'

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
}

describe('effects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(mockConsole.log)
    vi.spyOn(console, 'debug').mockImplementation(mockConsole.debug)
    vi.spyOn(console, 'error').mockImplementation(mockConsole.error)

    // Mock performance.now
    vi.spyOn(performance, 'now').mockReturnValue(1000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('effect', () => {
    it('should execute side effect and return original value', () => {
      const sideEffects: number[] = []
      const recordValue = effect((x: number) => sideEffects.push(x))

      expect(recordValue(42)).toBe(42)
      expect(recordValue(10)).toBe(10)
      expect(sideEffects).toEqual([42, 10])
    })

    it('should work with different types', () => {
      const logs: string[] = []
      const logString = effect((s: string) => logs.push(s.toUpperCase()))

      expect(logString('hello')).toBe('hello')
      expect(logs).toEqual(['HELLO'])
    })
  })

  describe('conditionalEffect', () => {
    it('should execute effect only when predicate is true', () => {
      const sideEffects: number[] = []
      const recordIfEven = conditionalEffect(
        (x: number) => x % 2 === 0,
        (x: number) => sideEffects.push(x)
      )

      expect(recordIfEven(2)).toBe(2)
      expect(recordIfEven(3)).toBe(3)
      expect(recordIfEven(4)).toBe(4)
      expect(recordIfEven(5)).toBe(5)

      expect(sideEffects).toEqual([2, 4]) // Only even numbers
    })

    it('should not execute effect when predicate is false', () => {
      const sideEffects: string[] = []
      const recordIfLong = conditionalEffect(
        (s: string) => s.length > 5,
        (s: string) => sideEffects.push(s)
      )

      expect(recordIfLong('hi')).toBe('hi')
      expect(recordIfLong('hello world')).toBe('hello world')

      expect(sideEffects).toEqual(['hello world'])
    })
  })

  describe('effectWhen', () => {
    it('should execute effect only for truthy values', () => {
      const sideEffects: unknown[] = []
      const recordIfTruthy = effectWhen((x: unknown) => sideEffects.push(x))

      expect(recordIfTruthy(42)).toBe(42)
      expect(recordIfTruthy(0)).toBe(0)
      expect(recordIfTruthy('')).toBe('')
      expect(recordIfTruthy('hello')).toBe('hello')
      expect(recordIfTruthy(null)).toBe(null)
      expect(recordIfTruthy(undefined)).toBe(undefined)

      expect(sideEffects).toEqual([42, 'hello']) // Only truthy values
    })
  })

  describe('effectUnless', () => {
    it('should execute effect only for falsy values', () => {
      const sideEffects: unknown[] = []
      const recordIfFalsy = effectUnless((x: unknown) => sideEffects.push(x))

      expect(recordIfFalsy(42)).toBe(42)
      expect(recordIfFalsy(0)).toBe(0)
      expect(recordIfFalsy('')).toBe('')
      expect(recordIfFalsy('hello')).toBe('hello')
      expect(recordIfFalsy(null)).toBe(null)

      expect(sideEffects).toEqual([0, '', null]) // Only falsy values
    })
  })

  describe('log', () => {
    it('should log value and return it unchanged', () => {
      const logValue = log()
      expect(logValue(42)).toBe(42)
      expect(mockConsole.log).toHaveBeenCalledWith('', 42)
    })

    it('should log with custom message', () => {
      const logWithMessage = log('DEBUG')
      expect(logWithMessage('hello')).toBe('hello')
      expect(mockConsole.log).toHaveBeenCalledWith('[DEBUG]', 'hello')
    })
  })

  describe('debug', () => {
    it('should debug log with default formatter', () => {
      const debugValue = debug()
      const obj = { a: 1, b: 2 }

      expect(debugValue(obj)).toBe(obj)
      expect(mockConsole.debug).toHaveBeenCalledWith('[DEBUG]', JSON.stringify(obj, null, 2))
    })

    it('should debug log with custom formatter', () => {
      const debugWithFormatter = debug((x: number) => `Number: ${x}`)

      expect(debugWithFormatter(42)).toBe(42)
      expect(mockConsole.debug).toHaveBeenCalledWith('[DEBUG]', 'Number: 42')
    })
  })

  describe('trace', () => {
    it('should trace execution and return value', () => {
      const traceOperation = trace('test-op')

      expect(traceOperation(42)).toBe(42)
      expect(mockConsole.log).toHaveBeenCalledWith('[TRACE test-op] 0.00ms')
    })

    it('should work with different labels', () => {
      const traceA = trace('operation-a')
      const traceB = trace('operation-b')

      traceA('valueA')
      traceB('valueB')

      expect(mockConsole.log).toHaveBeenCalledWith('[TRACE operation-a] 0.00ms')
      expect(mockConsole.log).toHaveBeenCalledWith('[TRACE operation-b] 0.00ms')
    })
  })

  describe('asyncEffect', () => {
    it('should execute async side effect and return value immediately', async () => {
      const asyncSideEffects: number[] = []
      const asyncRecord = asyncEffect(async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        asyncSideEffects.push(x)
      })

      expect(asyncRecord(42)).toBe(42) // Returns immediately

      // Wait for async effect to complete
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(asyncSideEffects).toEqual([42])
    })

    it('should handle async errors gracefully', async () => {
      const failingAsyncEffect = asyncEffect(async () => {
        await new Promise(resolve => setTimeout(resolve, 1))
        throw new Error('Async error')
      })

      expect(failingAsyncEffect(42)).toBe(42) // Still returns value

      // Wait for the async effect to fail and error to be logged
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(mockConsole.error).toHaveBeenCalled()
    })
  })

  describe('effects', () => {
    it('should execute multiple effects in order', () => {
      const sideEffects: string[] = []
      const multiEffect = effects(
        (x: string) => sideEffects.push(`effect1: ${x}`),
        (x: string) => sideEffects.push(`effect2: ${x}`),
        (x: string) => sideEffects.push(`effect3: ${x}`)
      )

      expect(multiEffect('test')).toBe('test')
      expect(sideEffects).toEqual(['effect1: test', 'effect2: test', 'effect3: test'])
    })

    it('should handle empty effects list', () => {
      const noEffects = effects()
      expect(noEffects(42)).toBe(42)
    })
  })

  describe('throttleEffect', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.runOnlyPendingTimers()
      vi.useRealTimers()
    })

    it('should throttle effect execution', () => {
      const sideEffects: number[] = []
      const throttledEffect = throttleEffect(1000, (x: number) => sideEffects.push(x))

      throttledEffect(1)
      throttledEffect(2)
      throttledEffect(3)

      expect(sideEffects).toEqual([1]) // Only first call executed

      vi.advanceTimersByTime(1000)

      throttledEffect(4)
      expect(sideEffects).toEqual([1, 4]) // Next call after interval
    })
  })

  describe('debounceEffect', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.runOnlyPendingTimers()
      vi.useRealTimers()
    })

    it('should debounce effect execution', () => {
      const sideEffects: number[] = []
      const debouncedEffect = debounceEffect(1000, (x: number) => sideEffects.push(x))

      debouncedEffect(1)
      debouncedEffect(2)
      debouncedEffect(3)

      expect(sideEffects).toEqual([]) // Nothing executed yet

      vi.advanceTimersByTime(500)
      expect(sideEffects).toEqual([]) // Still waiting

      vi.advanceTimersByTime(500)
      expect(sideEffects).toEqual([3]) // Only last call executed
    })

    it('should reset timer on new calls', () => {
      const sideEffects: number[] = []
      const debouncedEffect = debounceEffect(1000, (x: number) => sideEffects.push(x))

      debouncedEffect(1)
      vi.advanceTimersByTime(500)

      debouncedEffect(2) // This should reset the timer
      vi.advanceTimersByTime(500)
      expect(sideEffects).toEqual([]) // Timer was reset

      vi.advanceTimersByTime(500)
      expect(sideEffects).toEqual([2]) // Only last call executed
    })
  })

  describe('measure', () => {
    it('should measure execution time', () => {
      const double = (x: number) => x * 2
      const measuredDouble = measure<number>('double')(double)

      expect(measuredDouble(21)).toBe(42)
      expect(mockConsole.log).toHaveBeenCalledWith('⏱️  double: 0.00ms')
    })

    it('should use default label', () => {
      const identity = (x: number) => x
      const measuredIdentity = measure<number>()(identity)

      expect(measuredIdentity(42)).toBe(42)
      expect(mockConsole.log).toHaveBeenCalledWith('⏱️  Operation: 0.00ms')
    })
  })

  describe('countCalls', () => {
    it('should count function calls and log periodically', () => {
      const counter = countCalls('test-fn', 3) // Log every 3 calls

      counter(1)
      counter(2)
      expect(mockConsole.log).not.toHaveBeenCalled()

      counter(3)
      expect(mockConsole.log).toHaveBeenCalledWith('📊 test-fn: 3 calls')

      counter(4)
      counter(5)
      expect(mockConsole.log).toHaveBeenCalledTimes(1) // Still only 1 log

      counter(6)
      expect(mockConsole.log).toHaveBeenCalledWith('📊 test-fn: 6 calls')
      expect(mockConsole.log).toHaveBeenCalledTimes(2)
    })

    it('should use default log interval', () => {
      const counter = countCalls('default-test')

      // Call 100 times to trigger default interval
      for (let i = 1; i <= 100; i++) {
        counter(i)
      }

      expect(mockConsole.log).toHaveBeenCalledWith('📊 default-test: 100 calls')
    })
  })

  describe('collect', () => {
    it('should collect values for batch processing', () => {
      const batches: number[][] = []
      const batchCollector = collect(3, (batch: number[]) => batches.push([...batch]))

      batchCollector(1)
      batchCollector(2)
      expect(batches).toEqual([]) // Not enough for batch yet

      batchCollector(3)
      expect(batches).toEqual([[1, 2, 3]]) // First batch processed

      batchCollector(4)
      batchCollector(5)
      batchCollector(6)
      expect(batches).toEqual([
        [1, 2, 3],
        [4, 5, 6],
      ]) // Second batch processed
    })

    it('should clear batch after processing', () => {
      const processedBatches: string[][] = []
      const collector = collect(2, (batch: string[]) => {
        processedBatches.push([...batch])
      })

      collector('a')
      collector('b') // Triggers first batch: ['a', 'b']
      collector('c')
      collector('d') // Triggers second batch: ['c', 'd']

      expect(processedBatches).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ])
    })
  })

  describe('catchEffect', () => {
    it('should catch errors and continue execution', () => {
      const throwingEffect = catchEffect(() => {
        throw new Error('Effect error')
      })

      expect(throwingEffect(42)).toBe(42) // Returns value despite error
      expect(mockConsole.error).toHaveBeenCalledWith('Effect error:', expect.any(Error))
    })

    it('should use custom error handler', () => {
      const errors: unknown[] = []
      const customErrorHandler = (error: unknown) => errors.push(error)

      const throwingEffect = catchEffect(() => {
        throw new Error('Custom error')
      }, customErrorHandler)

      expect(throwingEffect(42)).toBe(42)
      expect(errors).toHaveLength(1)
      expect(errors[0]).toBeInstanceOf(Error)
      expect(mockConsole.error).not.toHaveBeenCalled() // Custom handler used
    })

    it('should not catch errors from successful effects', () => {
      const sideEffects: number[] = []
      const safeEffect = catchEffect((x: number) => sideEffects.push(x))

      expect(safeEffect(42)).toBe(42)
      expect(sideEffects).toEqual([42])
      expect(mockConsole.error).not.toHaveBeenCalled()
    })
  })
})
