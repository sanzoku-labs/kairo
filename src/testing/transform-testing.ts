import { type Transform } from '../core/transform'
import { Result } from '../core/result'

export interface TransformTestCase<TSource = unknown, TTarget = unknown> {
  name: string
  description?: string
  input: TSource
  expectedOutput?: TTarget
  expectedError?: {
    field?: string
    code?: string
    message?: string
  }
  shouldSucceed: boolean
}

export interface TransformTestResult {
  testName: string
  passed: boolean
  duration: number
  actualOutput?: unknown
  actualError?: unknown
  message: string
}

export interface FieldMappingTest {
  sourceField: string
  targetField: string
  sourceValue: unknown
  expectedTargetValue: unknown
  transformFn?: (value: unknown) => unknown
}

export class TransformTester<TSource = unknown, TTarget = unknown> {
  constructor(private transform: Transform<TSource, TTarget>) {}

  // Test a single case
  testCase(testCase: TransformTestCase<TSource, TTarget>): TransformTestResult {
    const start = performance.now()

    try {
      const result = this.transform.execute(testCase.input)
      const duration = performance.now() - start

      if (Result.isOk(result)) {
        // Transform succeeded
        if (!testCase.shouldSucceed) {
          return {
            testName: testCase.name,
            passed: false,
            duration,
            actualOutput: result.value,
            message: 'Expected transform to fail but it succeeded',
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
          message: 'Transform succeeded as expected',
        }
      } else {
        // Transform failed
        if (testCase.shouldSucceed) {
          return {
            testName: testCase.name,
            passed: false,
            duration,
            actualError: result.error,
            message: `Expected transform to succeed but it failed: ${result.error.message}`,
          }
        }

        if (testCase.expectedError) {
          const errorMatches = this.matchesExpectedError(result.error, testCase.expectedError)
          if (!errorMatches) {
            return {
              testName: testCase.name,
              passed: false,
              duration,
              actualError: result.error,
              message: "Transform error doesn't match expected error",
            }
          }
        }

        return {
          testName: testCase.name,
          passed: true,
          duration,
          actualError: result.error,
          message: 'Transform failed as expected',
        }
      }
    } catch (error) {
      return {
        testName: testCase.name,
        passed: false,
        duration: performance.now() - start,
        actualError: error,
        message: `Test threw unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  // Test multiple cases
  testCases(testCases: TransformTestCase<TSource, TTarget>[]): {
    totalTests: number
    passedTests: number
    failedTests: number
    duration: number
    results: TransformTestResult[]
  } {
    const start = performance.now()
    const results: TransformTestResult[] = []

    for (const testCase of testCases) {
      const result = this.testCase(testCase)
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
  }

  // Test field mappings specifically
  testFieldMappings(mappingTests: FieldMappingTest[]): {
    totalMappings: number
    passedMappings: number
    failedMappings: number
    results: Array<{
      sourceField: string
      targetField: string
      passed: boolean
      message: string
      actualValue?: unknown
      expectedValue?: unknown
    }>
  } {
    const results: Array<{
      sourceField: string
      targetField: string
      passed: boolean
      message: string
      actualValue?: unknown
      expectedValue?: unknown
    }> = []

    for (const mappingTest of mappingTests) {
      try {
        // Create a test object with just this field
        const testInput = {
          [mappingTest.sourceField]: mappingTest.sourceValue,
        } as TSource

        const result = this.transform.execute(testInput)

        if (Result.isOk(result)) {
          const actualValue = (result.value as Record<string, unknown>)[mappingTest.targetField]

          let expectedValue = mappingTest.expectedTargetValue
          if (mappingTest.transformFn) {
            expectedValue = mappingTest.transformFn(mappingTest.sourceValue)
          }

          const matches = this.deepEqual(actualValue, expectedValue)

          results.push({
            sourceField: mappingTest.sourceField,
            targetField: mappingTest.targetField,
            passed: matches,
            message: matches
              ? 'Field mapping correct'
              : `Expected ${JSON.stringify(expectedValue)} but got ${JSON.stringify(actualValue)}`,
            actualValue,
            expectedValue,
          })
        } else {
          results.push({
            sourceField: mappingTest.sourceField,
            targetField: mappingTest.targetField,
            passed: false,
            message: `Transform failed: ${result.error.message}`,
          })
        }
      } catch (error) {
        results.push({
          sourceField: mappingTest.sourceField,
          targetField: mappingTest.targetField,
          passed: false,
          message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    }

    const passedMappings = results.filter(r => r.passed).length
    const failedMappings = results.length - passedMappings

    return {
      totalMappings: results.length,
      passedMappings,
      failedMappings,
      results,
    }
  }

  // Test transform performance with large datasets
  performanceTest(
    input: TSource,
    iterations = 1000
  ): {
    iterations: number
    totalDuration: number
    averageDuration: number
    minDuration: number
    maxDuration: number
    throughputPerSecond: number
    successRate: number
  } {
    const durations: number[] = []
    let successes = 0

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()

      try {
        const result = this.transform.execute(input)
        const duration = performance.now() - start
        durations.push(duration)

        if (Result.isOk(result)) {
          successes++
        }
      } catch {
        const duration = performance.now() - start
        durations.push(duration)
      }
    }

    const totalDuration = durations.reduce((a, b) => a + b, 0)
    const averageDuration = totalDuration / durations.length
    const minDuration = Math.min(...durations)
    const maxDuration = Math.max(...durations)
    const throughputPerSecond = 1000 / averageDuration
    const successRate = (successes / iterations) * 100

    return {
      iterations,
      totalDuration,
      averageDuration,
      minDuration,
      maxDuration,
      throughputPerSecond,
      successRate,
    }
  }

  // Test with batch data
  testBatch(inputs: TSource[]): {
    totalInputs: number
    successful: number
    failed: number
    duration: number
    results: Array<{
      index: number
      success: boolean
      output?: TTarget
      error?: unknown
    }>
  } {
    const start = performance.now()
    const results: Array<{
      index: number
      success: boolean
      output?: TTarget
      error?: unknown
    }> = []

    for (let i = 0; i < inputs.length; i++) {
      try {
        const input = inputs[i]
        if (input === undefined) continue
        const result = this.transform.execute(input)

        if (Result.isOk(result)) {
          results.push({
            index: i,
            success: true,
            output: result.value,
          })
        } else {
          results.push({
            index: i,
            success: false,
            error: result.error,
          })
        }
      } catch (batchError) {
        results.push({
          index: i,
          success: false,
          error: batchError,
        })
      }
    }

    const duration = performance.now() - start
    const successful = results.filter(r => r.success).length
    const failed = results.length - successful

    return {
      totalInputs: inputs.length,
      successful,
      failed,
      duration,
      results,
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
    expected: { field?: string; code?: string; message?: string }
  ): boolean {
    const error = actual as Record<string, unknown>
    if (expected.field && error.field !== expected.field) return false
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

// Factory functions for transform testing
export const transformTesting = {
  // Create a transform tester
  createTester: <TSource = unknown, TTarget = unknown>(
    transform: Transform<TSource, TTarget>
  ): TransformTester<TSource, TTarget> => {
    return new TransformTester(transform)
  },

  // Create a test case
  testCase: <TSource = unknown, TTarget = unknown>(
    name: string,
    input: TSource,
    shouldSucceed: boolean,
    options: Partial<
      Omit<TransformTestCase<TSource, TTarget>, 'name' | 'input' | 'shouldSucceed'>
    > = {}
  ): TransformTestCase<TSource, TTarget> => ({
    name,
    input,
    shouldSucceed,
    ...options,
  }),

  // Create a field mapping test
  fieldMappingTest: (
    sourceField: string,
    targetField: string,
    sourceValue: unknown,
    expectedTargetValue: unknown,
    transformFn?: (value: unknown) => unknown
  ): FieldMappingTest => {
    const test: FieldMappingTest = {
      sourceField,
      targetField,
      sourceValue,
      expectedTargetValue,
    }

    if (transformFn) {
      test.transformFn = transformFn
    }

    return test
  },

  // Utility functions for generating test data
  generators: {
    // Generate test objects with specific field patterns
    objectWithFields: (fields: Record<string, unknown>): Record<string, unknown> => fields,

    // Generate arrays of test objects
    arrayOfObjects: <T>(template: T, count: number): T[] => {
      return Array.from({ length: count }, () => ({ ...template }))
    },

    // Generate nested objects
    nestedObject: (depth: number, fields: Record<string, unknown>): Record<string, unknown> => {
      if (depth <= 0) return fields

      return {
        ...fields,
        nested: transformTesting.generators.nestedObject(depth - 1, fields),
      }
    },
  },
}
