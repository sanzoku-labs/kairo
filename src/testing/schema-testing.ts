import { type Schema as KairoSchema } from '../core/native-schema'

export interface SchemaTestCase<T = unknown> {
  name: string
  description?: string
  input: unknown
  expectedValid: boolean
  expectedOutput?: T
  expectedError?: {
    field?: string
    code?: string
    message?: string
  }
}

export interface SchemaProperty {
  name: string
  type: string
  required: boolean
  constraints?: Record<string, unknown>
}

export interface SchemaTestResult {
  testName: string
  passed: boolean
  duration: number
  actualOutput?: unknown
  actualError?: unknown
  message: string
}

export class SchemaTester<T = unknown> {
  constructor(private schema: KairoSchema<T>) {}

  // Test a single case
  testCase(testCase: SchemaTestCase<T>): SchemaTestResult {
    const start = performance.now()

    try {
      const result = this.schema.safeParse(testCase.input)
      const duration = performance.now() - start

      if (result.success) {
        // Validation succeeded
        if (!testCase.expectedValid) {
          return {
            testName: testCase.name,
            passed: false,
            duration,
            actualOutput: result.data,
            message: 'Expected validation to fail but it succeeded',
          }
        }

        if (testCase.expectedOutput !== undefined) {
          const outputMatches = this.deepEqual(result.data, testCase.expectedOutput)
          if (!outputMatches) {
            return {
              testName: testCase.name,
              passed: false,
              duration,
              actualOutput: result.data,
              message: `Expected output ${JSON.stringify(testCase.expectedOutput)} but got ${JSON.stringify(result.data)}`,
            }
          }
        }

        return {
          testName: testCase.name,
          passed: true,
          duration,
          actualOutput: result.data,
          message: 'Validation succeeded as expected',
        }
      } else {
        // Validation failed
        if (testCase.expectedValid) {
          return {
            testName: testCase.name,
            passed: false,
            duration,
            actualError: result.error,
            message: `Expected validation to succeed but it failed: ${result.error?.message || 'Unknown error'}`,
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
              message: "Validation error doesn't match expected error",
            }
          }
        }

        return {
          testName: testCase.name,
          passed: true,
          duration,
          actualError: result.error,
          message: 'Validation failed as expected',
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
  testCases(testCases: SchemaTestCase<T>[]): {
    totalTests: number
    passedTests: number
    failedTests: number
    duration: number
    results: SchemaTestResult[]
  } {
    const start = performance.now()
    const results: SchemaTestResult[] = []

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

  // Generate test cases automatically
  generateTestCases(
    options: {
      includeValidCases?: boolean
      includeInvalidCases?: boolean
      includeEdgeCases?: boolean
      customCases?: SchemaTestCase<T>[]
    } = {}
  ): SchemaTestCase<T>[] {
    const cases: SchemaTestCase<T>[] = []

    if (options.includeValidCases !== false) {
      cases.push(...this.generateValidCases())
    }

    if (options.includeInvalidCases !== false) {
      cases.push(...this.generateInvalidCases())
    }

    if (options.includeEdgeCases !== false) {
      cases.push(...this.generateEdgeCases())
    }

    if (options.customCases) {
      cases.push(...options.customCases)
    }

    return cases
  }

  // Analyze schema structure
  analyzeSchema(): {
    type: string
    properties?: SchemaProperty[]
    constraints?: Record<string, unknown>
    examples?: unknown[]
  } {
    // This would need to be implemented based on the actual schema structure
    // For now, we'll return a basic analysis
    return {
      type: 'unknown',
      properties: [],
      constraints: {},
      examples: [],
    }
  }

  // Property-based testing
  propertyTest(
    generator: () => unknown,
    iterations = 100
  ): {
    totalIterations: number
    passed: number
    failed: number
    counterExamples: unknown[]
    duration: number
  } {
    const start = performance.now()
    let passed = 0
    let failed = 0
    const counterExamples: unknown[] = []

    for (let i = 0; i < iterations; i++) {
      const input = generator()
      const result = this.schema.safeParse(input)

      if (result.success) {
        // Check if the parsed result is valid by parsing it again
        const reParseResult = this.schema.safeParse(result.data)
        if (reParseResult.success) {
          passed++
        } else {
          failed++
          counterExamples.push(input)
        }
      } else {
        // Invalid input is expected sometimes in property testing
        passed++
      }
    }

    return {
      totalIterations: iterations,
      passed,
      failed,
      counterExamples,
      duration: performance.now() - start,
    }
  }

  private generateValidCases(): SchemaTestCase<T>[] {
    // This would generate valid test cases based on schema analysis
    // For now, return empty array
    return []
  }

  private generateInvalidCases(): SchemaTestCase<T>[] {
    // Common invalid cases
    return [
      {
        name: 'null input',
        input: null,
        expectedValid: false,
      },
      {
        name: 'undefined input',
        input: undefined,
        expectedValid: false,
      },
    ]
  }

  private generateEdgeCases(): SchemaTestCase<T>[] {
    // Common edge cases
    return [
      {
        name: 'empty object',
        input: {},
        expectedValid: false,
      },
      {
        name: 'empty array',
        input: [],
        expectedValid: false,
      },
      {
        name: 'empty string',
        input: '',
        expectedValid: false,
      },
    ]
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

// Factory functions for schema testing
export const schemaTesting = {
  // Create a schema tester
  createTester: <T = unknown>(schema: KairoSchema<T>): SchemaTester<T> => {
    return new SchemaTester(schema)
  },

  // Create a test case
  testCase: <T = unknown>(
    name: string,
    input: unknown,
    expectedValid: boolean,
    options: Partial<Omit<SchemaTestCase<T>, 'name' | 'input' | 'expectedValid'>> = {}
  ): SchemaTestCase<T> => ({
    name,
    input,
    expectedValid,
    ...options,
  }),

  // Utility functions for generating test data
  generators: {
    // Generate random strings
    randomString: (length = 10): string => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let result = ''
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    },

    // Generate random numbers
    randomNumber: (min = 0, max = 100): number => {
      return Math.floor(Math.random() * (max - min + 1)) + min
    },

    // Generate random booleans
    randomBoolean: (): boolean => {
      return Math.random() < 0.5
    },

    // Generate random arrays
    randomArray: <T>(generator: () => T, length = 5): T[] => {
      return Array.from({ length }, generator)
    },

    // Generate random objects
    randomObject: (fields: Record<string, () => unknown>): Record<string, unknown> => {
      const result: Record<string, unknown> = {}
      for (const [key, generator] of Object.entries(fields)) {
        result[key] = generator()
      }
      return result
    },
  },
}
