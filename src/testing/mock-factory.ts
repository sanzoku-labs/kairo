import { Result } from '../core/result'
import { type KairoError } from '../core/errors'

export interface MockOptions {
  delay?: number
  probability?: number // 0-1, probability of success
  callCount?: number // Number of times to return success before switching behavior
}

export interface MockBehavior<T = unknown> {
  success?: T
  failure?: KairoError
  sequence?: Array<{ success?: T; failure?: KairoError }>
  options?: MockOptions
}

export interface CallRecord {
  timestamp: number
  args: unknown[]
  result: 'success' | 'failure'
  output?: unknown
  error?: KairoError
  duration: number
}

export class MockFunction<TInput extends unknown[] = unknown[], TOutput = unknown> {
  private callHistory: CallRecord[] = []
  private callCount = 0
  private currentSequenceIndex = 0

  constructor(private behavior: MockBehavior<TOutput>) {}

  async call(...args: TInput): Promise<Result<KairoError, TOutput>> {
    const start = performance.now()
    this.callCount++

    // Apply delay if specified
    if (this.behavior.options?.delay) {
      await new Promise(resolve => setTimeout(resolve, this.behavior.options!.delay))
    }

    // Check probability
    if (this.behavior.options?.probability !== undefined) {
      const random = Math.random()
      if (random > this.behavior.options.probability) {
        // Force failure based on probability
        const error: KairoError = this.behavior.failure || {
          code: 'MOCK_PROBABILITY_FAILURE',
          message: 'Mock failed due to probability setting',
          timestamp: Date.now(),
          context: {},
        }

        this.recordCall(args, 'failure', undefined, error, start)
        return Result.Err(error)
      }
    }

    // Check call count limit
    if (this.behavior.options?.callCount && this.callCount > this.behavior.options.callCount) {
      const error: KairoError = this.behavior.failure || {
        code: 'MOCK_CALL_LIMIT_EXCEEDED',
        message: 'Mock call limit exceeded',
        timestamp: Date.now(),
        context: {},
      }

      this.recordCall(args, 'failure', undefined, error, start)
      return Result.Err(error)
    }

    // Handle sequence behavior
    if (this.behavior.sequence && this.behavior.sequence.length > 0) {
      const currentBehavior = this.behavior.sequence[this.currentSequenceIndex]
      if (!currentBehavior) {
        const error: KairoError = {
          code: 'MOCK_SEQUENCE_ERROR',
          message: 'Mock sequence behavior is undefined',
          timestamp: Date.now(),
          context: {},
        }
        this.recordCall(args, 'failure', undefined, error, start)
        return Result.Err(error)
      }

      this.currentSequenceIndex = (this.currentSequenceIndex + 1) % this.behavior.sequence.length

      if (currentBehavior.failure) {
        this.recordCall(args, 'failure', undefined, currentBehavior.failure, start)
        return Result.Err(currentBehavior.failure)
      } else {
        const output = currentBehavior.success
        this.recordCall(args, 'success', output, undefined, start)
        return Result.Ok(output as TOutput)
      }
    }

    // Handle simple success/failure behavior
    if (this.behavior.failure) {
      this.recordCall(args, 'failure', undefined, this.behavior.failure, start)
      return Result.Err(this.behavior.failure)
    } else {
      const output = this.behavior.success
      this.recordCall(args, 'success', output, undefined, start)
      return Result.Ok(output as TOutput)
    }
  }

  // Get call history
  getCallHistory(): CallRecord[] {
    return [...this.callHistory]
  }

  // Get call count
  getCallCount(): number {
    return this.callCount
  }

  // Check if mock was called
  wasCalled(): boolean {
    return this.callCount > 0
  }

  // Check if mock was called with specific arguments
  wasCalledWith(...args: Partial<TInput>): boolean {
    return this.callHistory.some(record => this.deepEqual(record.args, args))
  }

  // Get calls with specific arguments
  getCallsWithArgs(...args: Partial<TInput>): CallRecord[] {
    return this.callHistory.filter(record => this.deepEqual(record.args, args))
  }

  // Reset mock state
  reset(): void {
    this.callHistory = []
    this.callCount = 0
    this.currentSequenceIndex = 0
  }

  // Update behavior
  updateBehavior(behavior: MockBehavior<TOutput>): void {
    this.behavior = behavior
  }

  private recordCall(
    args: unknown[],
    result: 'success' | 'failure',
    output?: unknown,
    error?: KairoError,
    startTime?: number
  ): void {
    const record: CallRecord = {
      timestamp: Date.now(),
      args: [...args],
      result,
      duration: startTime ? performance.now() - startTime : 0,
    }

    if (output !== undefined) {
      record.output = output
    }

    if (error !== undefined) {
      record.error = error
    }

    this.callHistory.push(record)
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (a == null || b == null) return false
    if (typeof a !== typeof b) return false

    if (typeof a === 'object') {
      const aKeys = Object.keys(a)
      const bKeys = Object.keys(b)

      if (aKeys.length !== bKeys.length) return false

      for (const key of aKeys) {
        if (!bKeys.includes(key)) return false
        const aValue = (a as Record<string, unknown>)[key]
        const bValue = (b as Record<string, unknown>)[key]
        if (!this.deepEqual(aValue, bValue)) return false
      }

      return true
    }

    return false
  }
}

export class MockObject {
  private mocks: Map<string, MockFunction> = new Map()
  private callHistory: Array<{ method: string; record: CallRecord }> = []

  // Add a mock method
  addMethod<TInput extends unknown[], TOutput>(
    methodName: string,
    behavior: MockBehavior<TOutput>
  ): MockFunction<TInput, TOutput> {
    const mockFunction = new MockFunction<TInput, TOutput>(behavior)
    this.mocks.set(methodName, mockFunction as MockFunction<unknown[], unknown>)
    return mockFunction
  }

  // Get a mock method
  getMethod<TInput extends unknown[], TOutput>(
    methodName: string
  ): MockFunction<TInput, TOutput> | undefined {
    return this.mocks.get(methodName) as MockFunction<TInput, TOutput> | undefined
  }

  // Call a mock method
  async callMethod<TInput extends unknown[], TOutput>(
    methodName: string,
    ...args: TInput
  ): Promise<Result<KairoError, TOutput>> {
    const mockFunction = this.getMethod<TInput, TOutput>(methodName)
    if (!mockFunction) {
      return Result.Err({
        code: 'MOCK_METHOD_NOT_FOUND',
        message: `Mock method '${methodName}' not found`,
        timestamp: Date.now(),
        context: {},
      })
    }

    const result = await mockFunction.call(...args)

    // Record in global call history
    const latestCall = mockFunction.getCallHistory().slice(-1)[0]
    if (latestCall) {
      this.callHistory.push({
        method: methodName,
        record: latestCall,
      })
    }

    return result
  }

  // Get all call history
  getAllCallHistory(): Array<{ method: string; record: CallRecord }> {
    return [...this.callHistory]
  }

  // Reset all mocks
  resetAll(): void {
    for (const mock of this.mocks.values()) {
      mock.reset()
    }
    this.callHistory = []
  }

  // Get call statistics
  getStats(): {
    totalCalls: number
    methodStats: Record<
      string,
      {
        calls: number
        successes: number
        failures: number
        averageDuration: number
      }
    >
  } {
    const methodStats: Record<
      string,
      {
        calls: number
        successes: number
        failures: number
        averageDuration: number
      }
    > = {}

    for (const [methodName, mock] of this.mocks.entries()) {
      const history = mock.getCallHistory()
      const successes = history.filter(r => r.result === 'success').length
      const failures = history.filter(r => r.result === 'failure').length
      const avgDuration =
        history.length > 0 ? history.reduce((sum, r) => sum + r.duration, 0) / history.length : 0

      methodStats[methodName] = {
        calls: history.length,
        successes,
        failures,
        averageDuration: avgDuration,
      }
    }

    return {
      totalCalls: this.callHistory.length,
      methodStats,
    }
  }
}

// Factory functions and utilities
export const mockFactory = {
  // Create a simple successful mock
  success: <T>(value: T, options?: MockOptions): MockBehavior<T> => {
    const behavior: MockBehavior<T> = { success: value }
    if (options) {
      behavior.options = options
    }
    return behavior
  },

  // Create a simple failure mock
  failure: (error: KairoError, options?: MockOptions): MockBehavior => {
    const behavior: MockBehavior = { failure: error }
    if (options) {
      behavior.options = options
    }
    return behavior
  },

  // Create a probabilistic mock
  probabilistic: <T>(
    successValue: T,
    failureError: KairoError,
    successProbability: number
  ): MockBehavior<T> => ({
    success: successValue,
    failure: failureError,
    options: { probability: successProbability },
  }),

  // Create a sequential mock
  sequence: <T>(behaviors: Array<{ success?: T; failure?: KairoError }>): MockBehavior<T> => ({
    sequence: behaviors,
  }),

  // Create a delayed mock
  delayed: <T>(value: T, delayMs: number): MockBehavior<T> => ({
    success: value,
    options: { delay: delayMs },
  }),

  // Create a limited call count mock
  limitedCalls: <T>(value: T, callLimit: number, afterLimitError?: KairoError): MockBehavior<T> => {
    const behavior: MockBehavior<T> = {
      success: value,
      options: { callCount: callLimit },
    }
    if (afterLimitError) {
      behavior.failure = afterLimitError
    }
    return behavior
  },

  // Create a mock function
  createFunction: <TInput extends unknown[] = unknown[], TOutput = unknown>(
    behavior: MockBehavior<TOutput>
  ): MockFunction<TInput, TOutput> => {
    return new MockFunction<TInput, TOutput>(behavior)
  },

  // Create a mock object
  createObject: (): MockObject => {
    return new MockObject()
  },

  // Common mock scenarios
  scenarios: {
    // HTTP-like responses
    httpSuccess: <T>(data: T, status = 200): MockBehavior<{ status: number; data: T }> => ({
      success: { status, data },
    }),

    httpError: (status: number, message: string): MockBehavior => ({
      failure: {
        code: `HTTP_${status}`,
        message,
        timestamp: Date.now(),
        context: {},
      },
    }),

    // Database-like operations
    dbSuccess: <T>(record: T): MockBehavior<T> => ({
      success: record,
    }),

    dbNotFound: (): MockBehavior => ({
      failure: {
        code: 'NOT_FOUND',
        message: 'Record not found',
        timestamp: Date.now(),
        context: {},
      },
    }),

    dbConnectionError: (): MockBehavior => ({
      failure: {
        code: 'CONNECTION_ERROR',
        message: 'Database connection failed',
        timestamp: Date.now(),
        context: {},
      },
    }),

    // Validation scenarios
    validationSuccess: <T>(validatedData: T): MockBehavior<T> => ({
      success: validatedData,
    }),

    validationError: (field: string, message: string): MockBehavior => ({
      failure: {
        code: 'VALIDATION_ERROR',
        message: `Validation failed for field '${field}': ${message}`,
        timestamp: Date.now(),
        context: {},
      },
    }),

    // Network scenarios
    networkTimeout: (): MockBehavior => ({
      failure: {
        code: 'TIMEOUT',
        message: 'Network request timed out',
        timestamp: Date.now(),
        context: {},
      },
    }),

    networkIntermittent: <T>(successValue: T, failureRate = 0.3): MockBehavior<T> => ({
      success: successValue,
      failure: {
        code: 'NETWORK_ERROR',
        message: 'Intermittent network failure',
        timestamp: Date.now(),
        context: {},
      },
      options: { probability: 1 - failureRate },
    }),
  },

  // Utilities
  utils: {
    // Create a mock that alternates between success and failure
    alternating: <T>(successValue: T, failureError: KairoError): MockBehavior<T> => ({
      sequence: [{ success: successValue }, { failure: failureError }],
    }),

    // Create a mock that fails the first N times then succeeds
    eventualSuccess: <T>(
      successValue: T,
      failureError: KairoError,
      failureCount: number
    ): MockBehavior<T> => ({
      sequence: [
        ...Array<{ failure: KairoError }>(failureCount).fill({ failure: failureError }),
        { success: successValue },
      ],
    }),

    // Create a mock that succeeds the first N times then fails
    eventualFailure: <T>(
      successValue: T,
      failureError: KairoError,
      successCount: number
    ): MockBehavior<T> => ({
      sequence: [
        ...Array<{ success: T }>(successCount).fill({ success: successValue }),
        { failure: failureError },
      ],
    }),
  },
}
