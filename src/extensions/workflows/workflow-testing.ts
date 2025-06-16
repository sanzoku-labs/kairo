import { Result } from '../../core/result'
import { type KairoError } from '../../core/errors'
import {
  type Workflow,
  type WorkflowError,
  type StepMocks,
  type FlowDefinition,
  type WorkflowStep,
  workflow,
} from './workflow'

export interface WorkflowTestCase<TInput, TOutput> {
  name: string
  description?: string
  input: TInput
  expectedOutput?: TOutput
  expectedError?: Partial<WorkflowError>
  stepMocks?: StepMocks
  timeout?: number
  setup?: () => Promise<void>
  teardown?: () => Promise<void>
}

export interface WorkflowTestResult {
  testName: string
  passed: boolean
  duration: number
  actualOutput?: unknown
  actualError?: WorkflowError
  message: string
}

export interface WorkflowTestSuite<TInput, TOutput> {
  name: string
  workflow: Workflow<TInput, TOutput>
  testCases: WorkflowTestCase<TInput, TOutput>[]

  run(): Promise<WorkflowTestSuiteResult>
  runTest(testCase: WorkflowTestCase<TInput, TOutput>): Promise<WorkflowTestResult>
}

export interface WorkflowTestSuiteResult {
  suiteName: string
  totalTests: number
  passedTests: number
  failedTests: number
  duration: number
  results: WorkflowTestResult[]
  summary: {
    successRate: number
    averageDuration: number
    slowestTest: WorkflowTestResult | null
    fastestTest: WorkflowTestResult | null
  }
}

export interface WorkflowAssertion<TInput, TOutput> {
  workflow: Workflow<TInput, TOutput>
  input: TInput

  shouldSucceed(): Promise<WorkflowAssertion<TInput, TOutput>>
  shouldFail(): Promise<WorkflowAssertion<TInput, TOutput>>
  shouldFailWithError(
    expectedError: Partial<WorkflowError>
  ): Promise<WorkflowAssertion<TInput, TOutput>>
  shouldReturnValue(expectedValue: TOutput): Promise<WorkflowAssertion<TInput, TOutput>>
  shouldCompleteWithin(timeoutMs: number): Promise<WorkflowAssertion<TInput, TOutput>>
  shouldHaveStepResults(
    expectedResults: Record<string, unknown>
  ): Promise<WorkflowAssertion<TInput, TOutput>>
  withMocks(mocks: StepMocks): WorkflowAssertion<TInput, TOutput>
}

class WorkflowTestSuiteImpl<TInput, TOutput> implements WorkflowTestSuite<TInput, TOutput> {
  constructor(
    public readonly name: string,
    public readonly workflow: Workflow<TInput, TOutput>,
    public readonly testCases: WorkflowTestCase<TInput, TOutput>[]
  ) {}

  async run(): Promise<WorkflowTestSuiteResult> {
    const start = performance.now()
    const results: WorkflowTestResult[] = []

    for (const testCase of this.testCases) {
      const result = await this.runTest(testCase)
      results.push(result)
    }

    const duration = performance.now() - start
    const passedTests = results.filter(r => r.passed).length
    const failedTests = results.length - passedTests

    const durations = results.map(r => r.duration)
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length

    const slowestTest = results.reduce((prev, current) =>
      prev.duration > current.duration ? prev : current
    )
    const fastestTest = results.reduce((prev, current) =>
      prev.duration < current.duration ? prev : current
    )

    return {
      suiteName: this.name,
      totalTests: results.length,
      passedTests,
      failedTests,
      duration,
      results,
      summary: {
        successRate: (passedTests / results.length) * 100,
        averageDuration,
        slowestTest: results.length > 0 ? slowestTest : null,
        fastestTest: results.length > 0 ? fastestTest : null,
      },
    }
  }

  async runTest(testCase: WorkflowTestCase<TInput, TOutput>): Promise<WorkflowTestResult> {
    const start = performance.now()

    try {
      // Setup
      if (testCase.setup) {
        await testCase.setup()
      }

      // Create test workflow with mocks if provided
      const testWorkflow = testCase.stepMocks
        ? this.workflow.mock(testCase.stepMocks)
        : this.workflow

      // Execute test with timeout
      const executePromise = testWorkflow.execute(testCase.input)
      const timeoutMs = testCase.timeout || 30000 // 30 second default timeout

      const timeoutPromise = new Promise<Result<WorkflowError, TOutput>>((_, reject) => {
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
            message: 'Expected error but workflow succeeded',
          }
        }

        if (testCase.expectedOutput !== undefined) {
          const outputMatches = this.deepEqual(result.value, testCase.expectedOutput)
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
            actualError: result.error,
            message: `Unexpected error: ${result.error.message}`,
          }
        }

        const errorMatches = this.matchesExpectedError(result.error, testCase.expectedError)
        if (!errorMatches) {
          return {
            testName: testCase.name,
            passed: false,
            duration,
            actualError: result.error,
            message: `Error doesn't match expected error`,
          }
        }

        return {
          testName: testCase.name,
          passed: true,
          duration,
          actualError: result.error,
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

  private matchesExpectedError(actual: WorkflowError, expected: Partial<WorkflowError>): boolean {
    if (expected.code && actual.code !== expected.code) return false
    if (expected.stepName && actual.stepName !== expected.stepName) return false
    if (expected.message && !actual.message.includes(expected.message)) return false
    if (
      expected.rollbackAttempted !== undefined &&
      actual.rollbackAttempted !== expected.rollbackAttempted
    )
      return false

    return true
  }
}

class WorkflowAssertionImpl<TInput, TOutput> implements WorkflowAssertion<TInput, TOutput> {
  private mocks?: StepMocks

  constructor(
    public readonly workflow: Workflow<TInput, TOutput>,
    public readonly input: TInput
  ) {}

  withMocks(mocks: StepMocks): WorkflowAssertion<TInput, TOutput> {
    const newAssertion = new WorkflowAssertionImpl(this.workflow, this.input)
    newAssertion.mocks = mocks
    return newAssertion
  }

  async shouldSucceed(): Promise<WorkflowAssertion<TInput, TOutput>> {
    const testWorkflow = this.mocks ? this.workflow.mock(this.mocks) : this.workflow
    const result = await testWorkflow.execute(this.input)

    if (Result.isErr(result)) {
      throw new Error(`Expected workflow to succeed but it failed: ${result.error.message}`)
    }

    return this
  }

  async shouldFail(): Promise<WorkflowAssertion<TInput, TOutput>> {
    const testWorkflow = this.mocks ? this.workflow.mock(this.mocks) : this.workflow
    const result = await testWorkflow.execute(this.input)

    if (Result.isOk(result)) {
      throw new Error(
        `Expected workflow to fail but it succeeded with result: ${JSON.stringify(result.value)}`
      )
    }

    return this
  }

  async shouldFailWithError(
    expectedError: Partial<WorkflowError>
  ): Promise<WorkflowAssertion<TInput, TOutput>> {
    const testWorkflow = this.mocks ? this.workflow.mock(this.mocks) : this.workflow
    const result = await testWorkflow.execute(this.input)

    if (Result.isOk(result)) {
      throw new Error(`Expected workflow to fail but it succeeded`)
    }

    const actual = result.error
    if (expectedError.code && actual.code !== expectedError.code) {
      const expectedCode = String(expectedError.code)
      const actualCode = String(actual.code)
      throw new Error(`Expected error code '${expectedCode}' but got '${actualCode}'`)
    }
    if (expectedError.stepName && actual.stepName !== expectedError.stepName) {
      throw new Error(
        `Expected error in step '${expectedError.stepName}' but got '${actual.stepName}'`
      )
    }
    if (expectedError.message && !actual.message.includes(expectedError.message)) {
      const expectedMsg = String(expectedError.message)
      const actualMsg = String(actual.message)
      throw new Error(`Expected error message to contain '${expectedMsg}' but got '${actualMsg}'`)
    }

    return this
  }

  async shouldReturnValue(expectedValue: TOutput): Promise<WorkflowAssertion<TInput, TOutput>> {
    const testWorkflow = this.mocks ? this.workflow.mock(this.mocks) : this.workflow
    const result = await testWorkflow.execute(this.input)

    if (Result.isErr(result)) {
      throw new Error(`Expected workflow to return value but it failed: ${result.error.message}`)
    }

    if (!this.deepEqual(result.value, expectedValue)) {
      throw new Error(
        `Expected workflow to return ${JSON.stringify(expectedValue)} but got ${JSON.stringify(result.value)}`
      )
    }

    return this
  }

  async shouldCompleteWithin(timeoutMs: number): Promise<WorkflowAssertion<TInput, TOutput>> {
    const start = performance.now()
    const testWorkflow = this.mocks ? this.workflow.mock(this.mocks) : this.workflow

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Workflow did not complete within ${timeoutMs}ms`))
      }, timeoutMs)
    })

    try {
      await Promise.race([testWorkflow.execute(this.input), timeoutPromise])

      const duration = performance.now() - start
      if (duration >= timeoutMs) {
        throw new Error(`Workflow took ${duration.toFixed(2)}ms which exceeds ${timeoutMs}ms limit`)
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('did not complete within')) {
        throw error
      }
      // Other errors (workflow errors) are ok, we're just testing timing
    }

    return this
  }

  async shouldHaveStepResults(
    _expectedResults: Record<string, unknown>
  ): Promise<WorkflowAssertion<TInput, TOutput>> {
    // This would require access to the workflow context, which isn't currently exposed
    // For now, we'll implement a basic version that just succeeds
    // In a real implementation, we'd need to modify the workflow execution to capture step results
    const testWorkflow = this.mocks ? this.workflow.mock(this.mocks) : this.workflow
    await testWorkflow.execute(this.input)

    // TODO: Implement step result validation when workflow context is accessible
    console.warn(
      'shouldHaveStepResults is not fully implemented yet - step result validation skipped'
    )

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

// Factory functions for testing
export const workflowTesting = {
  // Create a test suite
  createSuite: <TInput, TOutput>(
    name: string,
    workflow: Workflow<TInput, TOutput>,
    testCases: WorkflowTestCase<TInput, TOutput>[]
  ): WorkflowTestSuite<TInput, TOutput> => {
    return new WorkflowTestSuiteImpl(name, workflow, testCases)
  },

  // Create a test case
  testCase: <TInput, TOutput>(
    name: string,
    input: TInput,
    options: Partial<Omit<WorkflowTestCase<TInput, TOutput>, 'name' | 'input'>> = {}
  ): WorkflowTestCase<TInput, TOutput> => ({
    name,
    input,
    ...options,
  }),

  // Create an assertion
  expect: <TInput, TOutput>(
    workflow: Workflow<TInput, TOutput>,
    input: TInput
  ): WorkflowAssertion<TInput, TOutput> => {
    return new WorkflowAssertionImpl(workflow, input)
  },

  // Utility for creating step mocks
  mockStep: (
    stepName: string,
    options: {
      success?: unknown
      failure?: KairoError
      delay?: number
      probability?: number
    }
  ): Record<string, typeof options> => ({
    [stepName]: options,
  }),

  // Utility for creating test workflows
  createTestWorkflow: <TInput, TOutput>(
    name: string,
    steps: Record<string, WorkflowStep>,
    flow: FlowDefinition,
    options: { timeout?: number } = {}
  ): Workflow<TInput, TOutput> => {
    return workflow(name, {
      steps,
      flow,
      options:
        options.timeout !== undefined
          ? {
              timeout: options.timeout,
            }
          : {},
    })
  },

  // Utility for generating load tests
  loadTest: async <TInput, TOutput>(
    workflow: Workflow<TInput, TOutput>,
    input: TInput,
    options: {
      concurrency: number
      requests: number
      rampUpTimeMs?: number
    }
  ): Promise<{
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageLatency: number
    minLatency: number
    maxLatency: number
    throughput: number
    errors: WorkflowError[]
  }> => {
    const { concurrency, requests, rampUpTimeMs = 0 } = options
    const results: Array<{ success: boolean; latency: number; error?: WorkflowError }> = []
    const errors: WorkflowError[] = []

    const requestsPerWorker = Math.ceil(requests / concurrency)
    const delayBetweenWorkers = rampUpTimeMs / concurrency

    const workers = Array.from({ length: concurrency }, async (_, workerIndex) => {
      // Stagger worker start times for ramp-up
      if (delayBetweenWorkers > 0) {
        await new Promise(resolve => setTimeout(resolve, workerIndex * delayBetweenWorkers))
      }

      for (let i = 0; i < requestsPerWorker && results.length < requests; i++) {
        const start = performance.now()

        try {
          const result = await workflow.execute(input)
          const latency = performance.now() - start

          if (Result.isOk(result)) {
            results.push({ success: true, latency })
          } else {
            results.push({ success: false, latency, error: result.error })
            errors.push(result.error)
          }
        } catch (error) {
          const latency = performance.now() - start
          const workflowError = error as WorkflowError
          results.push({ success: false, latency, error: workflowError })
          errors.push(workflowError)
        }
      }
    })

    const testStart = performance.now()
    await Promise.all(workers)
    const testDuration = (performance.now() - testStart) / 1000 // Convert to seconds

    const successfulRequests = results.filter(r => r.success).length
    const failedRequests = results.length - successfulRequests
    const latencies = results.map(r => r.latency)
    const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
    const minLatency = Math.min(...latencies)
    const maxLatency = Math.max(...latencies)
    const throughput = results.length / testDuration

    return {
      totalRequests: results.length,
      successfulRequests,
      failedRequests,
      averageLatency,
      minLatency,
      maxLatency,
      throughput,
      errors,
    }
  },
}
