/**
 * Test Utilities for Kairo Three-Pillar Architecture
 *
 * Provides common testing patterns and utilities for SERVICE, DATA, and PIPELINE pillars.
 * Follows Kairo's Result pattern and configuration object design principles.
 */

import { Result } from '../core/shared'
import type { ServiceError, ServiceHttpError, DataError, PipelineError } from '../core/shared'
import type {
  BatchProcessingResult,
  DataNormalizationResult,
  SynchronizationResult,
  CircuitBreakerResult,
  EmptyDataResult,
  LargeDataResult,
  PipelineResult,
  RetryResult,
  FallbackResult,
  DegradationResult,
  DebugResult,
  ErrorPropagationResult,
  ValidationErrorResult,
  SchemaValidationResult,
  SchemaErrorResult,
  SchemaTransformResult,
  SchemaMigrationResult,
  SchemaContractResult,
} from '../integration/types/test-result-types'

/**
 * Test utilities for Result pattern validation
 */
export class ResultTestUtils {
  /**
   * Assert that a Result is Ok and return the value for further testing
   */
  static expectOk<T>(result: Result<unknown, T>): T {
    if (Result.isErr(result)) {
      throw new Error(`Expected Ok result, got Err: ${JSON.stringify(result.error)}`)
    }
    return result.value
  }

  /**
   * Assert that a Result is Err and return the error for further testing
   */
  static expectErr<E>(result: Result<E, unknown>): E {
    if (Result.isOk(result)) {
      throw new Error(`Expected Err result, got Ok: ${JSON.stringify(result.value)}`)
    }
    return result.error
  }

  /**
   * Assert that a Result is Ok with a specific value
   */
  static expectOkValue<T>(result: Result<unknown, T>, expectedValue: T): void {
    const value = this.expectOk(result)
    if (JSON.stringify(value) !== JSON.stringify(expectedValue)) {
      throw new Error(
        `Expected value ${JSON.stringify(expectedValue)}, got ${JSON.stringify(value)}`
      )
    }
  }

  /**
   * Assert that a Result is Err with a specific error type
   */
  static expectErrType<E extends { code: string }>(
    result: Result<E, unknown>,
    expectedCode: string
  ): E {
    const error = this.expectErr(result)
    if ((error as { code: string }).code !== expectedCode) {
      throw new Error(
        `Expected error code ${expectedCode}, got ${(error as { code: string }).code}`
      )
    }
    return error
  }

  /**
   * Type-safe expectOk for BatchProcessingResult
   */
  static expectBatchProcessingResult<T>(
    result: Result<unknown, BatchProcessingResult<T>>
  ): BatchProcessingResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for DataNormalizationResult
   */
  static expectDataNormalizationResult<T>(
    result: Result<unknown, DataNormalizationResult<T>>
  ): DataNormalizationResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for SynchronizationResult
   */
  static expectSynchronizationResult<T>(
    result: Result<unknown, SynchronizationResult<T>>
  ): SynchronizationResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for CircuitBreakerResult
   */
  static expectCircuitBreakerResult<T>(
    result: Result<unknown, CircuitBreakerResult<T>>
  ): CircuitBreakerResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for PipelineResult
   */
  static expectPipelineResult<T>(
    result: Result<unknown, PipelineResult<T>>
  ): PipelineResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for RetryResult
   */
  static expectRetryResult<T>(
    result: Result<unknown, RetryResult<T>>
  ): RetryResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for FallbackResult
   */
  static expectFallbackResult<T>(
    result: Result<unknown, FallbackResult<T>>
  ): FallbackResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for DegradationResult
   */
  static expectDegradationResult<T>(
    result: Result<unknown, DegradationResult<T>>
  ): DegradationResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for DebugResult
   */
  static expectDebugResult(
    result: Result<unknown, DebugResult>
  ): DebugResult {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for ErrorPropagationResult
   */
  static expectErrorPropagationResult<T>(
    result: Result<unknown, ErrorPropagationResult<T>>
  ): ErrorPropagationResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for ValidationErrorResult
   */
  static expectValidationErrorResult<T>(
    result: Result<unknown, ValidationErrorResult<T>>
  ): ValidationErrorResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for EmptyDataResult
   */
  static expectEmptyDataResult(
    result: Result<unknown, EmptyDataResult>
  ): EmptyDataResult {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for LargeDataResult
   */
  static expectLargeDataResult<T>(
    result: Result<unknown, LargeDataResult<T>>
  ): LargeDataResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for SchemaValidationResult
   */
  static expectSchemaValidationResult<T>(
    result: Result<unknown, SchemaValidationResult<T>>
  ): SchemaValidationResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for SchemaErrorResult
   */
  static expectSchemaErrorResult<T>(
    result: Result<unknown, SchemaErrorResult<T>>
  ): SchemaErrorResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for SchemaTransformResult
   */
  static expectSchemaTransformResult<T>(
    result: Result<unknown, SchemaTransformResult<T>>
  ): SchemaTransformResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for SchemaMigrationResult
   */
  static expectSchemaMigrationResult<T>(
    result: Result<unknown, SchemaMigrationResult<T>>
  ): SchemaMigrationResult<T> {
    return this.expectOk(result)
  }

  /**
   * Type-safe expectOk for SchemaContractResult
   */
  static expectSchemaContractResult<T>(
    result: Result<unknown, SchemaContractResult<T>>
  ): SchemaContractResult<T> {
    return this.expectOk(result)
  }
}

/**
 * Mock data generators for testing
 */
export class MockDataGenerator {
  /**
   * Generate mock user data for testing
   */
  static user(
    overrides: Partial<{
      id: string
      name: string
      email: string
      active: boolean
      department: string
      salary: number
    }> = {}
  ) {
    return {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      active: true,
      department: 'Engineering',
      salary: 75000,
      ...overrides,
    }
  }

  /**
   * Generate an array of mock users
   */
  static users(count = 3, baseOverrides: Parameters<typeof MockDataGenerator.user>[0] = {}) {
    return Array.from({ length: count }, (_, index) =>
      this.user({
        ...baseOverrides,
        id: `user-${index + 1}`,
        name: `User ${index + 1}`,
        email: `user${index + 1}@example.com`,
      })
    )
  }

  /**
   * Generate mock API response data
   */
  static apiResponse<T>(
    data: T,
    overrides: Partial<{
      status: number
      statusText: string
      headers: Record<string, string>
    }> = {}
  ) {
    return {
      data,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      ...overrides,
    }
  }

  /**
   * Generate mock error objects for different pillars
   */
  static serviceError(overrides: Partial<ServiceError> = {}): ServiceError {
    return {
      code: 'SERVICE_ERROR',
      pillar: 'SERVICE',
      operation: 'test-operation',
      message: 'Test service error',
      timestamp: Date.now(),
      context: {},
      ...overrides,
    }
  }

  static serviceHttpError(overrides: Partial<ServiceHttpError> = {}): ServiceHttpError {
    return {
      code: 'SERVICE_HTTP_ERROR',
      pillar: 'SERVICE',
      operation: 'test-operation',
      message: 'Test HTTP error',
      status: 404,
      statusText: 'Not Found',
      url: 'https://api.example.com/test',
      timestamp: Date.now(),
      context: {},
      ...overrides,
    }
  }

  static dataError(overrides: Partial<DataError> = {}): DataError {
    return {
      code: 'DATA_ERROR',
      pillar: 'DATA',
      operation: 'test-operation',
      message: 'Test data error',
      timestamp: Date.now(),
      context: {},
      ...overrides,
    }
  }

  static pipelineError(overrides: Partial<PipelineError> = {}): PipelineError {
    return {
      code: 'PIPELINE_ERROR',
      pillar: 'PIPELINE',
      operation: 'test-operation',
      message: 'Test pipeline error',
      timestamp: Date.now(),
      context: {},
      ...overrides,
    }
  }
}

/**
 * HTTP Mock utilities for SERVICE pillar testing
 */
export class HttpMockUtils {
  private static mockFetch: typeof global.fetch | undefined

  /**
   * Setup fetch mock for testing
   */
  static setup() {
    this.mockFetch = global.fetch
    global.fetch = this.createMockFetch()
  }

  /**
   * Restore original fetch
   */
  static teardown() {
    if (this.mockFetch) {
      global.fetch = this.mockFetch
    }
  }

  /**
   * Create a mock fetch implementation
   */
  private static createMockFetch() {
    return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      await Promise.resolve() // Add async work
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : 'unknown'
      const method = init?.method || 'GET'

      // Default mock response
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        url,
        json: async () => {
          await Promise.resolve()
          return { message: 'Mock response', url, method }
        },
        text: async () => {
          await Promise.resolve()
          return JSON.stringify({ message: 'Mock response', url, method })
        },
        blob: async () => {
          await Promise.resolve()
          return new Blob([JSON.stringify({ message: 'Mock response' })])
        },
      }

      return mockResponse as Response
    }
  }

  /**
   * Mock a successful HTTP response
   */
  static mockSuccess<T>(data: T, status = 200) {
    global.fetch = async () => {
      await Promise.resolve() // Add async work
      return {
        ok: true,
        status,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        url: 'https://api.example.com/test',
        json: async () => {
          await Promise.resolve()
          return data
        },
        text: async () => {
          await Promise.resolve()
          return JSON.stringify(data)
        },
        blob: async () => {
          await Promise.resolve()
          return new Blob([JSON.stringify(data)])
        },
      } as Response
    }
  }

  /**
   * Mock an HTTP error response
   */
  static mockError(status = 500, statusText = 'Internal Server Error') {
    global.fetch = async () => {
      await Promise.resolve() // Add async work
      return {
        ok: false,
        status,
        statusText,
        headers: new Headers({ 'content-type': 'application/json' }),
        url: 'https://api.example.com/test',
        json: async () => {
          await Promise.resolve()
          return { error: statusText }
        },
        text: async () => {
          await Promise.resolve()
          return JSON.stringify({ error: statusText })
        },
        blob: async () => {
          await Promise.resolve()
          return new Blob([JSON.stringify({ error: statusText })])
        },
      } as Response
    }
  }

  /**
   * Mock a network error
   */
  static mockNetworkError() {
    global.fetch = async () => {
      await Promise.resolve() // Add async work
      throw new TypeError('Failed to fetch')
    }
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    return { result, duration: end - start }
  }

  /**
   * Run performance benchmark with multiple iterations
   */
  static async benchmark<T>(
    fn: () => Promise<T> | T,
    iterations = 100
  ): Promise<{
    averageDuration: number
    minDuration: number
    maxDuration: number
    totalDuration: number
  }> {
    const durations: number[] = []

    for (let i = 0; i < iterations; i++) {
      const { duration } = await this.measureTime(fn)
      durations.push(duration)
    }

    const totalDuration = durations.reduce((sum, d) => sum + d, 0)
    const averageDuration = totalDuration / iterations
    const minDuration = Math.min(...durations)
    const maxDuration = Math.max(...durations)

    return {
      averageDuration,
      minDuration,
      maxDuration,
      totalDuration,
    }
  }
}

/**
 * Configuration object testing utilities
 */
export class ConfigTestUtils {
  /**
   * Test that default configuration is applied correctly
   */
  static expectDefaultConfig<T>(actualConfig: T, expectedDefaults: Partial<T>): void {
    for (const [key, expectedValue] of Object.entries(expectedDefaults)) {
      const actualValue = (actualConfig as Record<string, unknown>)[key]
      if (actualValue !== expectedValue) {
        throw new Error(
          `Expected default ${key} to be ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`
        )
      }
    }
  }

  /**
   * Test that user configuration overrides defaults
   */
  static expectConfigOverride<T>(
    actualConfig: T,
    _userConfig: Partial<T>,
    expectedOverrides: Partial<T>
  ): void {
    for (const [key, expectedValue] of Object.entries(expectedOverrides)) {
      const actualValue = (actualConfig as Record<string, unknown>)[key]
      if (actualValue !== expectedValue) {
        throw new Error(
          `Expected override ${key} to be ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`
        )
      }
    }
  }
}

/**
 * Schema testing utilities for DATA pillar
 */
export class SchemaTestUtils {
  /**
   * Test schema validation with valid data
   */
  static expectValidData<T>(
    schema: { parse: (data: unknown) => Result<unknown, T> },
    data: unknown
  ): T {
    const result = schema.parse(data)
    return ResultTestUtils.expectOk(result)
  }

  /**
   * Test schema validation with invalid data
   */
  static expectInvalidData(
    schema: { parse: (data: unknown) => Result<unknown, unknown> },
    data: unknown
  ): unknown {
    const result = schema.parse(data)
    return ResultTestUtils.expectErr(result)
  }
}

// All utilities are already exported above as individual classes
