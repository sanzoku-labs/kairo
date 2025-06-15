import { Result } from '../core/result'
import { type Pipeline } from '../core/pipeline'
import { type KairoError } from '../core/errors'

export interface PipelineTestCase<TInput, TOutput> {
  name: string
  description?: string
  input: TInput
  expectedOutput?: TOutput
  expectedError?: Partial<KairoError>
  timeout?: number
  setup?: () => Promise<void>
  teardown?: () => Promise<void>
}

export interface PipelineTestResult {
  testName: string
  passed: boolean
  duration: number
  actualOutput?: unknown
  actualError?: KairoError
  message: string
  steps?: StepTestResult[]
}

export interface StepTestResult {
  stepName: string
  input: unknown
  output: unknown
  duration: number
  success: boolean
  error?: KairoError
}

export interface PipelineAssertion<TInput, TOutput> {
  pipeline: Pipeline<TInput, TOutput>
  input: TInput

  shouldSucceed(): Promise<PipelineAssertion<TInput, TOutput>>
  shouldFail(): Promise<PipelineAssertion<TInput, TOutput>>
  shouldFailWithError(
    expectedError: Partial<KairoError>
  ): Promise<PipelineAssertion<TInput, TOutput>>
  shouldReturnValue(expectedValue: TOutput): Promise<PipelineAssertion<TInput, TOutput>>
  shouldCompleteWithin(timeoutMs: number): Promise<PipelineAssertion<TInput, TOutput>>
  shouldTransformCorrectly(
    stepAssertions: Array<{
      stepIndex: number
      expectedOutput: unknown
    }>
  ): Promise<PipelineAssertion<TInput, TOutput>>
}

class PipelineAssertionImpl<TInput, TOutput> implements PipelineAssertion<TInput, TOutput> {
  constructor(
    public readonly pipeline: Pipeline<TInput, TOutput>,
    public readonly input: TInput
  ) {}

  async shouldSucceed(): Promise<PipelineAssertion<TInput, TOutput>> {
    const result = await this.pipeline.run(this.input)

    if (Result.isErr(result)) {
      throw new Error(
        `Expected pipeline to succeed but it failed: ${String((result.error as Record<string, unknown>)?.message) || 'Unknown error'}`
      )
    }

    return this
  }

  async shouldFail(): Promise<PipelineAssertion<TInput, TOutput>> {
    const result = await this.pipeline.run(this.input)

    if (Result.isOk(result)) {
      throw new Error(
        `Expected pipeline to fail but it succeeded with result: ${JSON.stringify(result.value)}`
      )
    }

    return this
  }

  async shouldFailWithError(
    expectedError: Partial<KairoError>
  ): Promise<PipelineAssertion<TInput, TOutput>> {
    const result = await this.pipeline.run(this.input)

    if (Result.isOk(result)) {
      throw new Error(`Expected pipeline to fail but it succeeded`)
    }

    const actual = result.error as Record<string, unknown>
    if (expectedError.code && actual.code !== expectedError.code) {
      throw new Error(
        `Expected error code '${expectedError.code}' but got '${String(actual.code)}'`
      )
    }
    if (
      expectedError.message &&
      typeof actual.message === 'string' &&
      !actual.message.includes(expectedError.message)
    ) {
      throw new Error(
        `Expected error message to contain '${expectedError.message}' but got '${actual.message}'`
      )
    }

    return this
  }

  async shouldReturnValue(expectedValue: TOutput): Promise<PipelineAssertion<TInput, TOutput>> {
    const result = await this.pipeline.run(this.input)

    if (Result.isErr(result)) {
      throw new Error(
        `Expected pipeline to return value but it failed: ${String((result.error as Record<string, unknown>)?.message) || 'Unknown error'}`
      )
    }

    if (!this.deepEqual(result.value, expectedValue)) {
      throw new Error(
        `Expected pipeline to return ${JSON.stringify(expectedValue)} but got ${JSON.stringify(result.value)}`
      )
    }

    return this
  }

  async shouldCompleteWithin(timeoutMs: number): Promise<PipelineAssertion<TInput, TOutput>> {
    const start = performance.now()

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Pipeline did not complete within ${timeoutMs}ms`))
      }, timeoutMs)
    })

    try {
      await Promise.race([this.pipeline.run(this.input), timeoutPromise])

      const duration = performance.now() - start
      if (duration >= timeoutMs) {
        throw new Error(`Pipeline took ${duration.toFixed(2)}ms which exceeds ${timeoutMs}ms limit`)
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('did not complete within')) {
        throw error
      }
      // Other errors (pipeline errors) are ok, we're just testing timing
    }

    return this
  }

  async shouldTransformCorrectly(
    _stepAssertions: Array<{
      stepIndex: number
      expectedOutput: unknown
    }>
  ): Promise<PipelineAssertion<TInput, TOutput>> {
    // This would require step-by-step execution tracking
    // For now, we'll implement a basic version
    await this.pipeline.run(this.input)

    // TODO: Implement step-by-step validation when pipeline execution tracking is available
    console.warn('shouldTransformCorrectly is not fully implemented yet - step validation skipped')

    return this
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

// Factory functions for pipeline testing
export const pipelineTesting = {
  // Create a test case
  testCase: <TInput, TOutput>(
    name: string,
    input: TInput,
    options: Partial<Omit<PipelineTestCase<TInput, TOutput>, 'name' | 'input'>> = {}
  ): PipelineTestCase<TInput, TOutput> => ({
    name,
    input,
    ...options,
  }),

  // Create an assertion
  expect: <TInput, TOutput>(
    pipeline: Pipeline<TInput, TOutput>,
    input: TInput
  ): PipelineAssertion<TInput, TOutput> => {
    return new PipelineAssertionImpl(pipeline, input)
  },

  // Run a single test case
  runTest: async <TInput, TOutput>(
    pipeline: Pipeline<TInput, TOutput>,
    testCase: PipelineTestCase<TInput, TOutput>
  ): Promise<PipelineTestResult> => {
    const start = performance.now()

    try {
      // Setup
      if (testCase.setup) {
        await testCase.setup()
      }

      // Execute test with timeout
      const executePromise = pipeline.run(testCase.input)
      const timeoutMs = testCase.timeout || 30000

      const timeoutPromise = new Promise<Result<KairoError, TOutput>>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Test timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      })

      const result = await Promise.race([executePromise, timeoutPromise])
      const duration = performance.now() - start

      // Teardown
      if (testCase.teardown) {
        await testCase.teardown()
      }

      // Validate result
      if (Result.isOk(result)) {
        if (testCase.expectedError) {
          return {
            testName: testCase.name,
            passed: false,
            duration,
            actualOutput: result.value,
            message: 'Expected error but pipeline succeeded',
          }
        }

        if (testCase.expectedOutput !== undefined) {
          const outputMatches = deepEqual(result.value, testCase.expectedOutput)
          if (!outputMatches) {
            return {
              testName: testCase.name,
              passed: false,
              duration,
              actualOutput: result.value,
              message: `Expected output ${JSON.stringify(testCase.expectedOutput)} but got ${JSON.stringify(result.value)}`,
            }
          }
        }

        return {
          testName: testCase.name,
          passed: true,
          duration,
          actualOutput: result.value,
          message: 'Test passed',
        }
      } else {
        if (!testCase.expectedError) {
          return {
            testName: testCase.name,
            passed: false,
            duration,
            actualError: result.error as KairoError,
            message: `Unexpected error: ${String((result.error as Record<string, unknown>)?.message) || 'Unknown error'}`,
          }
        }

        const errorMatches = matchesExpectedError(
          result.error as KairoError,
          testCase.expectedError
        )
        if (!errorMatches) {
          return {
            testName: testCase.name,
            passed: false,
            duration,
            actualError: result.error as KairoError,
            message: `Error doesn't match expected error`,
          }
        }

        return {
          testName: testCase.name,
          passed: true,
          duration,
          actualError: result.error as KairoError,
          message: 'Test passed (expected error)',
        }
      }
    } catch (error) {
      const duration = performance.now() - start

      // Cleanup in case of unexpected error
      if (testCase.teardown) {
        try {
          await testCase.teardown()
        } catch (teardownError) {
          console.warn('Teardown failed:', teardownError)
        }
      }

      return {
        testName: testCase.name,
        passed: false,
        duration,
        message: `Test threw unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  // Run multiple test cases
  runTests: async <TInput, TOutput>(
    pipeline: Pipeline<TInput, TOutput>,
    testCases: PipelineTestCase<TInput, TOutput>[]
  ): Promise<{
    totalTests: number
    passedTests: number
    failedTests: number
    duration: number
    results: PipelineTestResult[]
  }> => {
    const start = performance.now()
    const results: PipelineTestResult[] = []

    for (const testCase of testCases) {
      const result = await pipelineTesting.runTest(pipeline, testCase)
      results.push(result)
    }

    const duration = performance.now() - start
    const passedTests = results.filter(r => r.passed).length
    const failedTests = results.length - passedTests

    return {
      totalTests: results.length,
      passedTests,
      failedTests,
      duration,
      results,
    }
  },
}

// Helper functions
function deepEqual(a: unknown, b: unknown): boolean {
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
      if (!deepEqual(aValue, bValue)) return false
    }

    return true
  }

  return false
}

function matchesExpectedError(actual: KairoError, expected: Partial<KairoError>): boolean {
  if (expected.code && actual.code !== expected.code) return false
  if (expected.message && !actual.message.includes(expected.message)) return false
  return true
}
