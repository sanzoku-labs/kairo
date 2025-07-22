/**
 * Comprehensive Tests for Test Utilities - PHASE 6
 *
 * Tests all utility classes and methods in the test-utils package to achieve 80%+ coverage.
 * This ensures our testing infrastructure is robust and well-tested.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Result } from '../core/shared'
import {
  ResultTestUtils,
  MockDataGenerator,
  HttpMockUtils,
  PerformanceTestUtils,
  ConfigTestUtils,
  SchemaTestUtils,
} from './index'
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

describe('Test Utilities - PHASE 6 Coverage Enhancement', () => {
  describe('ResultTestUtils', () => {
    describe('Basic Result testing utilities', () => {
      it('should extract Ok values with expectOk', () => {
        const okResult = Result.Ok('test-value')
        const value = ResultTestUtils.expectOk(okResult)
        expect(value).toBe('test-value')
      })

      it('should throw error for Err result in expectOk', () => {
        const errResult = Result.Err({ code: 'TEST_ERROR', message: 'Test error' })
        expect(() => ResultTestUtils.expectOk(errResult)).toThrow(
          'Expected Ok result, got Err: {"code":"TEST_ERROR","message":"Test error"}'
        )
      })

      it('should extract Err values with expectErr', () => {
        const error = { code: 'TEST_ERROR', message: 'Test error' }
        const errResult = Result.Err(error)
        const extractedError = ResultTestUtils.expectErr(errResult)
        expect(extractedError).toEqual(error)
      })

      it('should throw error for Ok result in expectErr', () => {
        const okResult = Result.Ok('test-value')
        expect(() => ResultTestUtils.expectErr(okResult)).toThrow(
          'Expected Err result, got Ok: "test-value"'
        )
      })

      it('should validate Ok values with expectOkValue', () => {
        const okResult = Result.Ok({ id: 1, name: 'test' })
        expect(() => 
          ResultTestUtils.expectOkValue(okResult, { id: 1, name: 'test' })
        ).not.toThrow()
      })

      it('should throw error for mismatched Ok value in expectOkValue', () => {
        const okResult = Result.Ok({ id: 1, name: 'test' })
        expect(() => 
          ResultTestUtils.expectOkValue(okResult, { id: 2, name: 'different' })
        ).toThrow('Expected value {"id":2,"name":"different"}, got {"id":1,"name":"test"}')
      })

      it('should validate error types with expectErrType', () => {
        const error = { code: 'SERVICE_ERROR', message: 'Service failed', pillar: 'SERVICE' }
        const errResult = Result.Err(error)
        const extractedError = ResultTestUtils.expectErrType(errResult, 'SERVICE_ERROR')
        expect(extractedError).toEqual(error)
      })

      it('should throw error for mismatched error code in expectErrType', () => {
        const error = { code: 'SERVICE_ERROR', message: 'Service failed' }
        const errResult = Result.Err(error)
        expect(() => 
          ResultTestUtils.expectErrType(errResult, 'DATA_ERROR')
        ).toThrow('Expected error code DATA_ERROR, got SERVICE_ERROR')
      })
    })

    describe('Type-specific Result testing utilities', () => {
      it('should handle BatchProcessingResult', () => {
        const batchResult: BatchProcessingResult<string> = {
          totalChunks: 1,
          processedCount: 2,
          results: ['item1', 'item2'],
        }
        const okResult = Result.Ok(batchResult)
        const extracted = ResultTestUtils.expectBatchProcessingResult(okResult)
        expect(extracted).toEqual(batchResult)
      })

      it('should handle DataNormalizationResult', () => {
        const normResult: DataNormalizationResult<{ id: number }> = {
          totalRecords: 1,
          validRecords: 1,
          uniqueRecords: 1,
          data: [{ id: 1 }],
        }
        const okResult = Result.Ok(normResult)
        const extracted = ResultTestUtils.expectDataNormalizationResult(okResult)
        expect(extracted).toEqual(normResult)
      })

      it('should handle SynchronizationResult', () => {
        const syncResult: SynchronizationResult<string> = {
          totalUpdates: 2,
          successCount: 2,
          conflictCount: 0,
          results: ['sync1', 'sync2'],
        }
        const okResult = Result.Ok(syncResult)
        const extracted = ResultTestUtils.expectSynchronizationResult(okResult)
        expect(extracted).toEqual(syncResult)
      })

      it('should handle CircuitBreakerResult', () => {
        const circuitResult: CircuitBreakerResult<string> = {
          totalEndpoints: 1,
          validResponses: 1,
          users: ['success'],
        }
        const okResult = Result.Ok(circuitResult)
        const extracted = ResultTestUtils.expectCircuitBreakerResult(okResult)
        expect(extracted).toEqual(circuitResult)
      })

      it('should handle PipelineResult', () => {
        const pipelineResult: PipelineResult<number> = {
          originalData: [20, 22],
          processedResults: [42],
          successCount: 1,
          errorCount: 0,
        }
        const okResult = Result.Ok(pipelineResult)
        const extracted = ResultTestUtils.expectPipelineResult(okResult)
        expect(extracted).toEqual(pipelineResult)
      })

      it('should handle RetryResult', () => {
        const retryResult: RetryResult<string> = {
          result: 'success',
          totalAttempts: 3,
          retrySuccessful: true,
        }
        const okResult = Result.Ok(retryResult)
        const extracted = ResultTestUtils.expectRetryResult(okResult)
        expect(extracted).toEqual(retryResult)
      })

      it('should handle FallbackResult', () => {
        const fallbackResult: FallbackResult<string> = {
          dataSource: 'fallback',
          userCount: 1,
          users: ['fallback-value'],
          fallbackUsed: true,
        }
        const okResult = Result.Ok(fallbackResult)
        const extracted = ResultTestUtils.expectFallbackResult(okResult)
        expect(extracted).toEqual(fallbackResult)
      })

      it('should handle DegradationResult', () => {
        const degradationResult: DegradationResult<string> = {
          userCount: 1,
          users: ['degraded-service'],
          enhancementAvailable: false,
          enhancementError: null,
          operationMode: 'degraded',
        }
        const okResult = Result.Ok(degradationResult)
        const extracted = ResultTestUtils.expectDegradationResult(okResult)
        expect(extracted).toEqual(degradationResult)
      })

      it('should handle DebugResult', () => {
        const debugResult: DebugResult = {
          totalProcessed: 2,
          successfulValidations: 1,
          failedValidations: 1,
          detailedErrors: [{
            userIndex: 0,
            errorMessage: 'validation failed',
            errorCode: 'INVALID',
            fieldPath: 'name',
            issueCount: 1,
            timestamp: Date.now()
          }],
        }
        const okResult = Result.Ok(debugResult)
        const extracted = ResultTestUtils.expectDebugResult(okResult)
        expect(extracted).toEqual(debugResult)
      })

      it('should handle ErrorPropagationResult', () => {
        const errorPropResult: ErrorPropagationResult<string> = {
          source: 'api',
          serviceError: new Error('service failed'),
          validatedData: 'partial-success',
        }
        const okResult = Result.Ok(errorPropResult)
        const extracted = ResultTestUtils.expectErrorPropagationResult(okResult)
        expect(extracted).toEqual(errorPropResult)
      })

      it('should handle ValidationErrorResult', () => {
        const validationResult: ValidationErrorResult<string> = {
          totalUsers: 1,
          validUsers: [{ index: 0, success: true, error: null, data: 'validated-data' }],
          invalidUsers: [],
          errorSummary: [],
        }
        const okResult = Result.Ok(validationResult)
        const extracted = ResultTestUtils.expectValidationErrorResult(okResult)
        expect(extracted).toEqual(validationResult)
      })

      it('should handle EmptyDataResult', () => {
        const emptyResult: EmptyDataResult = {
          inputCount: 0,
          processedCount: 0,
          aggregation: { summary: 'no-data-available' },
        }
        const okResult = Result.Ok(emptyResult)
        const extracted = ResultTestUtils.expectEmptyDataResult(okResult)
        expect(extracted).toEqual(emptyResult)
      })

      it('should handle LargeDataResult', () => {
        const largeResult: LargeDataResult<number[]> = {
          totalBatches: 1,
          batchResults: [[1, 2, 3, 4, 5]],
          totalProcessed: 5,
        }
        const okResult = Result.Ok(largeResult)
        const extracted = ResultTestUtils.expectLargeDataResult(okResult)
        expect(extracted).toEqual(largeResult)
      })

      it('should handle SchemaValidationResult', () => {
        const schemaValidationResult: SchemaValidationResult<{ name: string }> = {
          totalUsers: 1,
          validUsers: 1,
          users: [{ name: 'test' }],
        }
        const okResult = Result.Ok(schemaValidationResult)
        const extracted = ResultTestUtils.expectSchemaValidationResult(okResult)
        expect(extracted).toEqual(schemaValidationResult)
      })

      it('should handle SchemaErrorResult', () => {
        const schemaErrorResult: SchemaErrorResult<string> = {
          totalUsers: 1,
          validUsers: [],
          invalidUsers: ['invalid-data'],
          errorSummary: [{
            index: 0,
            errorCount: 1,
            message: 'missing-field'
          }],
        }
        const okResult = Result.Ok(schemaErrorResult)
        const extracted = ResultTestUtils.expectSchemaErrorResult(okResult)
        expect(extracted).toEqual(schemaErrorResult)
      })

      it('should handle SchemaTransformResult', () => {
        const transformResult: SchemaTransformResult<{ id: number }> = {
          inputCount: 1,
          validOutputCount: 1,
          transformedUsers: [{ id: 123 }],
        }
        const okResult = Result.Ok(transformResult)
        const extracted = ResultTestUtils.expectSchemaTransformResult(okResult)
        expect(extracted).toEqual(transformResult)
      })

      it('should handle SchemaMigrationResult', () => {
        const migrationResult: SchemaMigrationResult<{ version: string }> = {
          totalUsers: 2,
          v1Users: 1,
          v2Users: 1,
          migratedUsers: 1,
          finalUsers: [{ version: '2.0.0' }],
        }
        const okResult = Result.Ok(migrationResult)
        const extracted = ResultTestUtils.expectSchemaMigrationResult(okResult)
        expect(extracted).toEqual(migrationResult)
      })

      it('should handle SchemaContractResult', () => {
        const contractResult: SchemaContractResult<boolean> = {
          totalEndpoints: 1,
          validResponses: 1,
          users: [true],
        }
        const okResult = Result.Ok(contractResult)
        const extracted = ResultTestUtils.expectSchemaContractResult(okResult)
        expect(extracted).toEqual(contractResult)
      })
    })
  })

  describe('MockDataGenerator', () => {
    describe('User data generation', () => {
      it('should generate default user data', () => {
        const user = MockDataGenerator.user()
        expect(user).toEqual({
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          active: true,
          department: 'Engineering',
          salary: 75000,
        })
      })

      it('should generate user data with overrides', () => {
        const overrides = { 
          id: 'custom-id',
          name: 'Jane Smith',
          salary: 85000,
          department: 'Sales'
        }
        const user = MockDataGenerator.user(overrides)
        expect(user).toEqual({
          id: 'custom-id',
          name: 'Jane Smith',
          email: 'john@example.com',
          active: true,
          department: 'Sales',
          salary: 85000,
        })
      })

      it('should generate multiple users', () => {
        const users = MockDataGenerator.users(3)
        expect(users).toHaveLength(3)
        expect(users[0]).toEqual({
          id: 'user-1',
          name: 'User 1',
          email: 'user1@example.com',
          active: true,
          department: 'Engineering',
          salary: 75000,
        })
        expect(users[2]).toEqual({
          id: 'user-3',
          name: 'User 3',
          email: 'user3@example.com',
          active: true,
          department: 'Engineering',
          salary: 75000,
        })
      })

      it('should generate multiple users with base overrides', () => {
        const baseOverrides = { department: 'Marketing', salary: 70000 }
        const users = MockDataGenerator.users(2, baseOverrides)
        expect(users).toHaveLength(2)
        expect(users[0]?.department).toBe('Marketing')
        expect(users[0]?.salary).toBe(70000)
        expect(users[1]?.department).toBe('Marketing')
        expect(users[1]?.salary).toBe(70000)
      })
    })

    describe('API response generation', () => {
      it('should generate API response with default values', () => {
        const data = { message: 'test' }
        const response = MockDataGenerator.apiResponse(data)
        expect(response).toEqual({
          data: { message: 'test' },
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
        })
      })

      it('should generate API response with overrides', () => {
        const data = { error: 'not found' }
        const overrides = {
          status: 404,
          statusText: 'Not Found',
          headers: { 'content-type': 'text/plain' },
        }
        const response = MockDataGenerator.apiResponse(data, overrides)
        expect(response).toEqual({
          data: { error: 'not found' },
          status: 404,
          statusText: 'Not Found',
          headers: { 'content-type': 'text/plain' },
        })
      })
    })

    describe('Error object generation', () => {
      it('should generate default service error', () => {
        const error = MockDataGenerator.serviceError()
        expect(error).toMatchObject({
          code: 'SERVICE_ERROR',
          pillar: 'SERVICE',
          operation: 'test-operation',
          message: 'Test service error',
          context: {},
        })
        expect(typeof error.timestamp).toBe('number')
      })

      it('should generate service error with overrides', () => {
        const overrides = {
          operation: 'custom-operation',
          message: 'Custom error message',
          context: { userId: '123' },
        }
        const error = MockDataGenerator.serviceError(overrides)
        expect(error).toMatchObject({
          code: 'SERVICE_ERROR',
          pillar: 'SERVICE',
          operation: 'custom-operation',
          message: 'Custom error message',
          context: { userId: '123' },
        })
      })

      it('should generate service HTTP error', () => {
        const error = MockDataGenerator.serviceHttpError()
        expect(error).toMatchObject({
          code: 'SERVICE_HTTP_ERROR',
          pillar: 'SERVICE',
          operation: 'test-operation',
          message: 'Test HTTP error',
          status: 404,
          statusText: 'Not Found',
          url: 'https://api.example.com/test',
          context: {},
        })
      })

      it('should generate service HTTP error with overrides', () => {
        const overrides = {
          status: 500,
          statusText: 'Internal Server Error',
          url: 'https://custom-api.com/endpoint',
          message: 'Custom HTTP error',
        }
        const error = MockDataGenerator.serviceHttpError(overrides)
        expect(error).toMatchObject({
          status: 500,
          statusText: 'Internal Server Error',
          url: 'https://custom-api.com/endpoint',
          message: 'Custom HTTP error',
        })
      })

      it('should generate data error', () => {
        const error = MockDataGenerator.dataError()
        expect(error).toMatchObject({
          code: 'DATA_ERROR',
          pillar: 'DATA',
          operation: 'test-operation',
          message: 'Test data error',
          context: {},
        })
      })

      it('should generate data error with overrides', () => {
        const overrides = {
          operation: 'validation',
          message: 'Validation failed',
          context: { field: 'email' },
        }
        const error = MockDataGenerator.dataError(overrides)
        expect(error).toMatchObject({
          operation: 'validation',
          message: 'Validation failed',
          context: { field: 'email' },
        })
      })

      it('should generate pipeline error', () => {
        const error = MockDataGenerator.pipelineError()
        expect(error).toMatchObject({
          code: 'PIPELINE_ERROR',
          pillar: 'PIPELINE',
          operation: 'test-operation',
          message: 'Test pipeline error',
          context: {},
        })
      })

      it('should generate pipeline error with overrides', () => {
        const overrides = {
          operation: 'transform',
          message: 'Transform step failed',
          context: { step: 2 },
        }
        const error = MockDataGenerator.pipelineError(overrides)
        expect(error).toMatchObject({
          operation: 'transform',
          message: 'Transform step failed',
          context: { step: 2 },
        })
      })
    })
  })

  describe('HttpMockUtils', () => {
    let originalFetch: typeof global.fetch

    beforeEach(() => {
      originalFetch = global.fetch
    })

    afterEach(() => {
      global.fetch = originalFetch
    })

    describe('Mock setup and teardown', () => {
      it('should setup and teardown fetch mock', () => {
        HttpMockUtils.setup()
        expect(global.fetch).not.toBe(originalFetch)
        
        HttpMockUtils.teardown()
        expect(global.fetch).toBe(originalFetch)
      })

      it('should handle teardown without prior setup', () => {
        // Should not throw
        HttpMockUtils.teardown()
        expect(global.fetch).toBe(originalFetch)
      })
    })

    describe('Mock fetch implementation', () => {
      beforeEach(() => {
        HttpMockUtils.setup()
      })

      afterEach(() => {
        HttpMockUtils.teardown()
      })

      it('should create default mock response', async () => {
        const response = await global.fetch('https://api.example.com/test')
        
        expect(response.ok).toBe(true)
        expect(response.status).toBe(200)
        expect(response.statusText).toBe('OK')
        expect(response.url).toBe('https://api.example.com/test')
        
        const json = await response.json() as Record<string, unknown>
        expect(json).toEqual({
          message: 'Mock response',
          url: 'https://api.example.com/test',
          method: 'GET',
        })
      })

      it('should handle different HTTP methods', async () => {
        const response = await global.fetch('https://api.example.com/test', {
          method: 'POST',
        })
        
        const json = await response.json() as Record<string, unknown>
        expect(json.method as string).toBe('POST')
      })

      it('should handle URL objects', async () => {
        const url = new URL('https://api.example.com/test')
        const response = await global.fetch(url)
        
        const json = await response.json() as Record<string, unknown>
        expect(json.url as string).toBe('https://api.example.com/test')
      })

      it('should handle Request objects', async () => {
        const request = new Request('https://api.example.com/test')
        const response = await global.fetch(request)
        
        const json = await response.json() as Record<string, unknown>
        expect(json.url as string).toBe('unknown') // Request objects return 'unknown' in our mock
      })

      it('should provide text response', async () => {
        const response = await global.fetch('https://api.example.com/test')
        const text = await response.text()
        expect(text).toBe('{"message":"Mock response","url":"https://api.example.com/test","method":"GET"}')
      })

      it('should provide blob response', async () => {
        const response = await global.fetch('https://api.example.com/test')
        const blob = await response.blob()
        expect(blob).toBeInstanceOf(Blob)
      })
    })

    describe('Success mocking', () => {
      it('should mock successful response', async () => {
        const testData = { id: 1, name: 'Test' }
        HttpMockUtils.mockSuccess(testData, 201)
        
        const response = await global.fetch('https://api.example.com/test')
        expect(response.ok).toBe(true)
        expect(response.status).toBe(201)
        
        const json = await response.json() as Record<string, unknown>
        expect(json).toEqual(testData)
      })

      it('should mock successful response with default status', async () => {
        const testData = { message: 'success' }
        HttpMockUtils.mockSuccess(testData)
        
        const response = await global.fetch('https://api.example.com/test')
        expect(response.status).toBe(200)
        
        const json = await response.json() as Record<string, unknown>
        expect(json).toEqual(testData)
      })

      it('should provide text response for success mock', async () => {
        const testData = { test: 'data' }
        HttpMockUtils.mockSuccess(testData)
        
        const response = await global.fetch('https://api.example.com/test')
        const text = await response.text()
        expect(text).toBe('{"test":"data"}')
      })
    })

    describe('Error mocking', () => {
      it('should mock error response', async () => {
        HttpMockUtils.mockError(404, 'Not Found')
        
        const response = await global.fetch('https://api.example.com/test')
        expect(response.ok).toBe(false)
        expect(response.status).toBe(404)
        expect(response.statusText).toBe('Not Found')
        
        const json = await response.json() as Record<string, unknown>
        expect(json).toEqual({ error: 'Not Found' })
      })

      it('should mock error response with default values', async () => {
        HttpMockUtils.mockError()
        
        const response = await global.fetch('https://api.example.com/test')
        expect(response.ok).toBe(false)
        expect(response.status).toBe(500)
        expect(response.statusText).toBe('Internal Server Error')
      })

      it('should provide text response for error mock', async () => {
        HttpMockUtils.mockError(400, 'Bad Request')
        
        const response = await global.fetch('https://api.example.com/test')
        const text = await response.text()
        expect(text).toBe('{"error":"Bad Request"}')
      })
    })

    describe('Network error mocking', () => {
      it('should mock network error', async () => {
        HttpMockUtils.mockNetworkError()
        
        await expect(global.fetch('https://api.example.com/test')).rejects.toThrow(
          'Failed to fetch'
        )
      })
    })
  })

  describe('PerformanceTestUtils', () => {
    describe('Time measurement', () => {
      it('should measure execution time for sync function', async () => {
        const testFn = () => {
          // Simulate some work
          let sum = 0
          for (let i = 0; i < 1000; i++) {
            sum += i
          }
          return sum
        }
        
        const { result, duration } = await PerformanceTestUtils.measureTime(testFn)
        expect(result).toBe(499500) // Sum of 0 to 999
        expect(duration).toBeGreaterThanOrEqual(0)
        expect(typeof duration).toBe('number')
      })

      it('should measure execution time for async function', async () => {
        const testFn = async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return 'async-result'
        }
        
        const { result, duration } = await PerformanceTestUtils.measureTime(testFn)
        expect(result).toBe('async-result')
        expect(duration).toBeGreaterThanOrEqual(10)
      })
    })

    describe('Benchmarking', () => {
      it('should run performance benchmark', async () => {
        const testFn = () => Math.random()
        
        const benchmark = await PerformanceTestUtils.benchmark(testFn, 10)
        
        expect(benchmark.averageDuration).toBeGreaterThanOrEqual(0)
        expect(benchmark.minDuration).toBeGreaterThanOrEqual(0)
        expect(benchmark.maxDuration).toBeGreaterThanOrEqual(benchmark.minDuration)
        expect(benchmark.totalDuration).toBeGreaterThanOrEqual(0)
        expect(benchmark.averageDuration).toBeLessThanOrEqual(benchmark.maxDuration)
      })

      it('should handle single iteration benchmark', async () => {
        const testFn = () => 'test'
        
        const benchmark = await PerformanceTestUtils.benchmark(testFn, 1)
        
        expect(benchmark.averageDuration).toBe(benchmark.minDuration)
        expect(benchmark.averageDuration).toBe(benchmark.maxDuration)
        expect(benchmark.totalDuration).toBe(benchmark.averageDuration)
      })

      it('should use default iterations when not specified', async () => {
        const testFn = vi.fn(() => 'test')
        
        await PerformanceTestUtils.benchmark(testFn)
        
        expect(testFn).toHaveBeenCalledTimes(100) // default iterations
      })
    })
  })

  describe('ConfigTestUtils', () => {
    describe('Default configuration testing', () => {
      it('should validate default configuration', () => {
        const config = {
          timeout: 5000,
          retries: 3,
          enabled: true,
          name: 'test-config',
        }
        
        const expectedDefaults = {
          timeout: 5000,
          enabled: true,
        }
        
        expect(() => 
          ConfigTestUtils.expectDefaultConfig(config, expectedDefaults)
        ).not.toThrow()
      })

      it('should throw error for mismatched default configuration', () => {
        const config = {
          timeout: 3000,
          retries: 3,
          enabled: false,
        }
        
        const expectedDefaults = {
          timeout: 5000,
          enabled: true,
        }
        
        expect(() => 
          ConfigTestUtils.expectDefaultConfig(config, expectedDefaults)
        ).toThrow('Expected default timeout to be 5000, got 3000')
      })
    })

    describe('Configuration override testing', () => {
      it('should validate configuration overrides', () => {
        const actualConfig = {
          timeout: 10000,
          retries: 5,
          enabled: false,
        }
        
        const userConfig = {
          timeout: 10000,
          enabled: false,
        }
        
        const expectedOverrides = {
          timeout: 10000,
          enabled: false,
        }
        
        expect(() => 
          ConfigTestUtils.expectConfigOverride(actualConfig, userConfig, expectedOverrides)
        ).not.toThrow()
      })

      it('should throw error for mismatched configuration override', () => {
        const actualConfig = {
          timeout: 5000,
          enabled: true,
        }
        
        const userConfig = {
          timeout: 10000,
        }
        
        const expectedOverrides = {
          timeout: 10000,
        }
        
        expect(() => 
          ConfigTestUtils.expectConfigOverride(actualConfig, userConfig, expectedOverrides)
        ).toThrow('Expected override timeout to be 10000, got 5000')
      })
    })
  })

  describe('SchemaTestUtils', () => {
    describe('Schema validation testing', () => {
      it('should test valid data with expectValidData', () => {
        const mockSchema = {
          parse: vi.fn().mockReturnValue(Result.Ok({ id: 1, name: 'test' }))
        }
        
        const data = { id: 1, name: 'test' }
        const result = SchemaTestUtils.expectValidData(mockSchema, data)
        
        expect(result).toEqual({ id: 1, name: 'test' })
        expect(mockSchema.parse).toHaveBeenCalledWith(data)
      })

      it('should throw error when expectValidData receives invalid result', () => {
        const mockSchema = {
          parse: vi.fn().mockReturnValue(Result.Err({ code: 'VALIDATION_ERROR', message: 'Invalid' }))
        }
        
        const data = { invalid: 'data' }
        
        expect(() => 
          SchemaTestUtils.expectValidData(mockSchema, data)
        ).toThrow('Expected Ok result, got Err:')
      })

      it('should test invalid data with expectInvalidData', () => {
        const error = { code: 'VALIDATION_ERROR', message: 'Invalid data' }
        const mockSchema = {
          parse: vi.fn().mockReturnValue(Result.Err(error))
        }
        
        const data = { invalid: 'data' }
        const result = SchemaTestUtils.expectInvalidData(mockSchema, data)
        
        expect(result).toEqual(error)
        expect(mockSchema.parse).toHaveBeenCalledWith(data)
      })

      it('should throw error when expectInvalidData receives valid result', () => {
        const mockSchema = {
          parse: vi.fn().mockReturnValue(Result.Ok({ valid: 'data' }))
        }
        
        const data = { valid: 'data' }
        
        expect(() => 
          SchemaTestUtils.expectInvalidData(mockSchema, data)
        ).toThrow('Expected Err result, got Ok:')
      })
    })
  })
})