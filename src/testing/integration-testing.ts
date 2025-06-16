import { type Pipeline } from '../core/pipeline'
import { type Resource, type ResourceMethods } from '../core/resource'
import { type Repository } from '../core/repository'
import { type Transform } from '../core/transform'
import { type Workflow } from '../extensions/workflows/workflow'
import { Result } from '../core/result'

export interface IntegrationTestScenario<TInput = unknown, TOutput = unknown> {
  name: string
  description?: string
  input: TInput
  expectedOutput?: TOutput
  expectedError?: {
    step?: string
    code?: string
    message?: string
  }
  shouldSucceed: boolean
  timeout?: number
  setup?: () => Promise<void>
  teardown?: () => Promise<void>
}

export interface IntegrationTestResult {
  scenarioName: string
  passed: boolean
  duration: number
  actualOutput?: unknown
  actualError?: unknown
  message: string
  stepResults?: Array<{
    step: string
    success: boolean
    duration: number
    output?: unknown
    error?: unknown
  }>
}

export interface E2ETestCase<TInput = unknown, TOutput = unknown> {
  name: string
  description?: string
  steps: Array<{
    name: string
    type: 'pipeline' | 'resource' | 'repository' | 'transform' | 'workflow'
    component: unknown
    input?: unknown
    expectedOutput?: unknown
    shouldSucceed?: boolean
  }>
  input: TInput
  expectedFinalOutput?: TOutput
  shouldSucceed: boolean
}

export class IntegrationTester {
  private components: Map<string, unknown> = new Map()
  private mocks: Map<string, unknown> = new Map()

  // Register components for testing
  registerPipeline(name: string, pipeline: Pipeline<unknown, unknown>): void {
    this.components.set(`pipeline:${name}`, pipeline)
  }

  registerResource<T extends ResourceMethods>(name: string, resource: Resource<T>): void {
    this.components.set(`resource:${name}`, resource)
  }

  registerRepository(name: string, repository: Repository<unknown>): void {
    this.components.set(`repository:${name}`, repository)
  }

  registerTransform(name: string, transform: Transform<unknown, unknown>): void {
    this.components.set(`transform:${name}`, transform)
  }

  registerWorkflow(name: string, workflow: Workflow<unknown, unknown>): void {
    this.components.set(`workflow:${name}`, workflow)
  }

  // Register mocks for components
  registerMock(componentName: string, mock: unknown): void {
    this.mocks.set(componentName, mock)
  }

  // Test integration scenarios
  async testScenario<TInput, TOutput>(
    scenario: IntegrationTestScenario<TInput, TOutput>,
    components: {
      pipeline?: Pipeline<TInput, TOutput>
      workflow?: Workflow<TInput, TOutput>
    }
  ): Promise<IntegrationTestResult> {
    const start = performance.now()

    try {
      // Setup
      if (scenario.setup) {
        await scenario.setup()
      }

      let result: unknown
      let error: unknown

      // Execute the main component
      try {
        if (components.pipeline) {
          const pipelineResult = await components.pipeline.run(scenario.input)
          if (Result.isOk(pipelineResult)) {
            result = pipelineResult.value
          } else {
            error = pipelineResult.error
          }
        } else if (components.workflow) {
          const workflow = components.workflow as {
            execute: (input: unknown) => Promise<Result<unknown, unknown>>
          }
          const workflowResult = await workflow.execute(scenario.input)
          if (Result.isOk(workflowResult)) {
            result = workflowResult.value
          } else {
            error = workflowResult.error
          }
        } else {
          throw new Error('No component provided for testing')
        }
      } catch (executionError) {
        error = executionError
      }

      const duration = performance.now() - start

      // Teardown
      if (scenario.teardown) {
        await scenario.teardown()
      }

      // Validate result
      if (error) {
        if (scenario.shouldSucceed) {
          return {
            scenarioName: scenario.name,
            passed: false,
            duration,
            actualError: error,
            message: `Expected scenario to succeed but it failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }
        }

        if (scenario.expectedError) {
          const errorMatches = this.matchesExpectedError(error, scenario.expectedError)
          if (!errorMatches) {
            return {
              scenarioName: scenario.name,
              passed: false,
              duration,
              actualError: error,
              message: "Scenario error doesn't match expected error",
            }
          }
        }

        return {
          scenarioName: scenario.name,
          passed: true,
          duration,
          actualError: error,
          message: 'Scenario failed as expected',
        }
      } else {
        if (!scenario.shouldSucceed) {
          return {
            scenarioName: scenario.name,
            passed: false,
            duration,
            actualOutput: result,
            message: 'Expected scenario to fail but it succeeded',
          }
        }

        if (scenario.expectedOutput !== undefined) {
          const outputMatches = this.deepEqual(result, scenario.expectedOutput)
          if (!outputMatches) {
            return {
              scenarioName: scenario.name,
              passed: false,
              duration,
              actualOutput: result,
              message: `Expected output ${JSON.stringify(scenario.expectedOutput)} but got ${JSON.stringify(result)}`,
            }
          }
        }

        return {
          scenarioName: scenario.name,
          passed: true,
          duration,
          actualOutput: result,
          message: 'Scenario succeeded as expected',
        }
      }
    } catch (error) {
      // Cleanup in case of unexpected error
      if (scenario.teardown) {
        try {
          await scenario.teardown()
        } catch (teardownError) {
          console.warn('Teardown failed:', teardownError)
        }
      }

      return {
        scenarioName: scenario.name,
        passed: false,
        duration: performance.now() - start,
        actualError: error,
        message: `Scenario threw unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  // Test multiple integration scenarios
  async testScenarios(
    scenarios: IntegrationTestScenario[],
    components: {
      pipeline?: Pipeline<unknown, unknown>
      workflow?: Workflow<unknown, unknown>
    }
  ): Promise<{
    totalScenarios: number
    passedScenarios: number
    failedScenarios: number
    duration: number
    results: IntegrationTestResult[]
  }> {
    const start = performance.now()
    const results: IntegrationTestResult[] = []

    for (const scenario of scenarios) {
      const result = await this.testScenario(scenario, components)
      results.push(result)
    }

    const duration = performance.now() - start
    const passedScenarios = results.filter(r => r.passed).length
    const failedScenarios = results.length - passedScenarios

    return {
      totalScenarios: results.length,
      passedScenarios,
      failedScenarios,
      duration,
      results,
    }
  }

  // End-to-end testing
  async testE2E<TInput, TOutput>(
    testCase: E2ETestCase<TInput, TOutput>
  ): Promise<{
    testName: string
    passed: boolean
    duration: number
    stepResults: Array<{
      stepName: string
      passed: boolean
      message: string
      duration: number
    }>
    finalOutput?: TOutput
    finalError?: unknown
  }> {
    const start = performance.now()
    const stepResults: Array<{
      stepName: string
      passed: boolean
      message: string
      duration: number
    }> = []

    let currentInput: unknown = testCase.input
    let finalOutput: TOutput | undefined
    let finalError: unknown

    try {
      for (const step of testCase.steps) {
        const stepStart = performance.now()

        try {
          // This would need to be implemented based on the actual component types
          // For now, we'll create a placeholder implementation
          const stepResult = await this.executeStep(step, currentInput)
          const stepDuration = performance.now() - stepStart

          if (stepResult.success) {
            currentInput = stepResult.output
            stepResults.push({
              stepName: step.name,
              passed: true,
              message: 'Step completed successfully',
              duration: stepDuration,
            })
          } else {
            stepResults.push({
              stepName: step.name,
              passed: false,
              message: `Step failed: ${stepResult.error instanceof Error ? stepResult.error.message : String(stepResult.error)}`,
              duration: stepDuration,
            })

            if (step.shouldSucceed !== false) {
              // Step was expected to succeed but failed
              finalError = stepResult.error
              break
            }
          }
        } catch (stepError) {
          const stepDuration = performance.now() - stepStart
          stepResults.push({
            stepName: step.name,
            passed: false,
            message: `Step threw error: ${stepError instanceof Error ? stepError.message : String(stepError)}`,
            duration: stepDuration,
          })
          finalError = stepError
          break
        }
      }

      if (!finalError) {
        finalOutput = currentInput as TOutput
      }

      const duration = performance.now() - start
      const allStepsPassed = stepResults.every(r => r.passed)
      const testPassed = testCase.shouldSucceed ? allStepsPassed && !finalError : !!finalError

      const result: {
        testName: string
        passed: boolean
        duration: number
        stepResults: Array<{
          stepName: string
          passed: boolean
          message: string
          duration: number
        }>
        finalOutput?: TOutput
        finalError?: unknown
      } = {
        testName: testCase.name,
        passed: testPassed,
        duration,
        stepResults,
      }

      if (finalOutput !== undefined) {
        result.finalOutput = finalOutput
      }

      if (finalError !== undefined) {
        result.finalError = finalError
      }

      return result
    } catch (error) {
      return {
        testName: testCase.name,
        passed: false,
        duration: performance.now() - start,
        stepResults,
        finalError: error,
      }
    }
  }

  private async executeStep(
    step: E2ETestCase['steps'][0],
    input: unknown
  ): Promise<{ success: boolean; output?: unknown; error?: unknown }> {
    // Placeholder implementation
    // In a real implementation, this would execute the actual component
    console.warn(`Step execution for ${step.type} not fully implemented yet`)

    await Promise.resolve() // Make it actually async

    return {
      success: true,
      output: input,
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

  private matchesExpectedError(
    actual: unknown,
    expected: { step?: string; code?: string; message?: string }
  ): boolean {
    if (typeof actual !== 'object' || actual === null) return false

    const error = actual as Record<string, unknown>
    if (expected.step && error.step !== expected.step) return false
    if (expected.code && error.code !== expected.code) return false
    if (
      expected.message &&
      typeof error.message === 'string' &&
      !error.message.includes(expected.message)
    )
      return false
    return true
  }
}

// Factory functions for integration testing
export const integrationTesting = {
  // Create an integration tester
  createTester: (): IntegrationTester => {
    return new IntegrationTester()
  },

  // Create an integration test scenario
  scenario: <TInput, TOutput>(
    name: string,
    input: TInput,
    shouldSucceed: boolean,
    options: Partial<
      Omit<IntegrationTestScenario<TInput, TOutput>, 'name' | 'input' | 'shouldSucceed'>
    > = {}
  ): IntegrationTestScenario<TInput, TOutput> => ({
    name,
    input,
    shouldSucceed,
    ...options,
  }),

  // Create an E2E test case
  e2eTestCase: <TInput, TOutput>(
    name: string,
    steps: E2ETestCase<TInput, TOutput>['steps'],
    input: TInput,
    shouldSucceed: boolean,
    options: Partial<
      Omit<E2ETestCase<TInput, TOutput>, 'name' | 'steps' | 'input' | 'shouldSucceed'>
    > = {}
  ): E2ETestCase<TInput, TOutput> => ({
    name,
    steps,
    input,
    shouldSucceed,
    ...options,
  }),

  // Create a test step
  step: (
    name: string,
    type: E2ETestCase['steps'][0]['type'],
    component: unknown,
    options: Partial<Omit<E2ETestCase['steps'][0], 'name' | 'type' | 'component'>> = {}
  ): E2ETestCase['steps'][0] => ({
    name,
    type,
    component,
    ...options,
  }),
}
