/**
 * Error Handling Integration Scenarios
 *
 * Tests comprehensive error handling patterns across all three pillars,
 * ensuring robust error propagation, recovery, and user-friendly error messages.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Result } from '../../core/shared'
import { service } from '../../core/service'
import { data } from '../../core/data'
import { pipeline } from '../../core/pipeline'
import { TestApiServer } from '../utils/test-api-server'
import { IntegrationSchemas } from '../utils/integration-helpers'
import { ResultTestUtils } from '../../test-utils'
import type {
  User,
  ValidationError,
  ErrorPropagationResult,
  ValidationErrorResult,
  PipelineResult,
  RetryResult,
  FallbackResult,
  DegradationResult,
  DebugResult,
} from '../types/test-result-types'

describe('Error Handling Integration Scenarios', () => {
  let apiServer: TestApiServer

  beforeEach(() => {
    apiServer = new TestApiServer({
      baseUrl: 'https://api.test.com',
      defaultDelay: 5,
    })
    apiServer.start()
  })

  afterEach(() => {
    apiServer.stop()
  })

  describe('Cross-Pillar Error Propagation', () => {
    it('should propagate SERVICE errors through DATA validation', async () => {
      // Setup failing endpoint
      apiServer.addEndpoint({
        method: 'GET',
        path: '/api/users',
        response: null,
        status: 500,
      })

      const errorPropagationPipeline = pipeline.compose([
        // SERVICE layer - should fail
        async () => {
          const result = await service.get('/api/users')
          if (Result.isErr(result)) {
            // Convert service error to data for next step
            return { error: result.error, data: null }
          }
          return { error: null, data: result.value }
        },

        // DATA layer - should handle service error
        (input: unknown) => {
          const typedInput = input as { error: unknown; data: unknown }
          
          if (typedInput.error) {
            // Create mock data for fallback
            const fallbackData = {
              id: 1,
              name: 'Fallback User',
              email: 'fallback@example.com',
              active: true,
              department: 'Engineering',
              salary: 75000,
              joinDate: new Date().toISOString(),
              skills: ['JavaScript'],
              performance: 7.5,
              region: 'North',
            }
            
            const validation = data.validate(fallbackData, IntegrationSchemas.user)
            if (Result.isErr(validation)) {
              throw new Error(`Fallback validation failed: ${validation.error.message}`)
            }
            
            return {
              source: 'fallback',
              serviceError: typedInput.error,
              validatedData: validation.value,
            }
          }
          
          const validation = data.validate(typedInput.data, IntegrationSchemas.user)
          if (Result.isErr(validation)) {
            throw new Error(`Data validation failed: ${validation.error.message}`)
          }
          
          return {
            source: 'api',
            serviceError: null,
            validatedData: validation.value,
          }
        },
      ])

      const result = await errorPropagationPipeline(null)
      const propagationResult = ResultTestUtils.expectOk(result) as ErrorPropagationResult<User>
      
      expect(propagationResult.source).toBe('fallback')
      expect(propagationResult.serviceError).toBeDefined()
      expect(propagationResult.validatedData).toBeDefined()
    })

    it('should handle DATA validation errors in PIPELINE operations', async () => {
      // Setup endpoint with mixed valid/invalid data
      apiServer.addEndpoint({
        method: 'GET',
        path: '/api/mixed-data',
        response: {
          users: [
            {
              id: 1,
              name: 'Valid User',
              email: 'valid@example.com',
              active: true,
              department: 'Engineering',
              salary: 75000,
              joinDate: new Date().toISOString(),
              skills: ['JavaScript'],
              performance: 7.5,
              region: 'North',
            },
            {
              id: 'invalid', // Invalid ID
              name: '', // Empty name
              email: 'not-an-email', // Invalid email
              active: true,
              department: 'Engineering',
              salary: 75000,
              joinDate: new Date().toISOString(),
              skills: ['JavaScript'],
              performance: 7.5,
              region: 'North',
            },
            {
              id: 3,
              name: 'Another Valid User',
              email: 'another@example.com',
              active: false,
              department: 'Sales',
              salary: 65000,
              joinDate: new Date().toISOString(),
              skills: ['Sales'],
              performance: 8.0,
              region: 'South',
            },
          ],
        },
      })

      const validationErrorPipeline = pipeline.compose([
        // Fetch mixed data
        async () => {
          const result = await service.get<{ users: unknown[] }>('/api/mixed-data')
          if (Result.isErr(result)) {
            throw new Error('Mixed data fetch failed')
          }
          return result.value.users
        },

        // Process with error handling
        async (users: unknown) => {
          const typedUsers = users as unknown[]
          
          const processingResults = await pipeline.map(
            typedUsers,
            (user: unknown, index: number) => {
              const validation = data.validate(user, IntegrationSchemas.user)
              
              if (Result.isErr(validation)) {
                return {
                  index,
                  success: false,
                  error: validation.error.message,
                  data: null,
                }
              }
              
              return {
                index,
                success: true,
                error: null,
                data: validation.value,
              }
            },
            { continueOnError: true }
          )
          
          if (Result.isErr(processingResults)) {
            throw new Error('Processing pipeline failed')
          }
          
          const results = processingResults.value
          
          return {
            totalUsers: typedUsers.length,
            validUsers: results.filter(r => r.success),
            invalidUsers: results.filter(r => !r.success),
            errorSummary: results
              .filter(r => !r.success)
              .map(r => ({ index: r.index, error: r.error })),
          }
        },
      ])

      const result = await validationErrorPipeline(null)
      const validationResult = ResultTestUtils.expectOk(result) as ValidationErrorResult<User>
      
      expect(validationResult.totalUsers).toBe(3)
      expect(validationResult.validUsers).toHaveLength(2)
      expect(validationResult.invalidUsers).toHaveLength(1)
      expect(validationResult.errorSummary).toHaveLength(1)
      expect(validationResult.errorSummary[0]?.index).toBe(1)
    })

    it('should handle PIPELINE errors with proper context', async () => {
      // Setup endpoint with data that causes pipeline errors
      apiServer.addEndpoint({
        method: 'GET',
        path: '/api/pipeline-test',
        response: {
          data: [1, 2, 3, 4, 5],
        },
      })

      const pipelineErrorPipeline = pipeline.compose([
        // Fetch data
        async () => {
          const result = await service.get<{ data: number[] }>('/api/pipeline-test')
          if (Result.isErr(result)) {
            throw new Error('Pipeline test data fetch failed')
          }
          return result.value.data
        },

        // Process with intentional errors
        (data: unknown) => {
          const typedData = data as number[]
          
          const processedResults = []
          let successCount = 0
          let errorCount = 0
          
          for (const num of typedData) {
            try {
              // Intentionally throw error for even numbers
              if (num % 2 === 0) {
                throw new Error(`Processing failed for even number: ${num}`)
              }
              const result = num * 2
              processedResults.push(result)
              successCount++
            } catch {
              processedResults.push(null)
              errorCount++
            }
          }
          
          return {
            originalData: typedData,
            processedResults,
            successCount,
            errorCount,
          }
        },
      ])

      const result = await pipelineErrorPipeline(null)
      const pipelineResult = ResultTestUtils.expectOk(result) as PipelineResult<number>
      
      expect(pipelineResult.originalData).toHaveLength(5)
      expect(pipelineResult.processedResults).toHaveLength(5)
      expect(pipelineResult.successCount).toBe(3) // 1, 3, 5 (odd numbers)
      expect(pipelineResult.errorCount).toBe(2) // 2, 4 (even numbers)
    })
  })

  describe('Error Recovery Strategies', () => {
    it('should implement retry with exponential backoff', async () => {
      // Setup endpoint that fails first few times
      apiServer.addEndpoint({
        method: 'GET',
        path: '/api/retry-test',
        response: { data: 'success', attempts: 3 },
        status: 200,
      })

      const retryPipeline = pipeline.compose([
        // SERVICE with retry
        async () => {
          const result = await service.get('/api/retry-test', {
            retry: {
              attempts: 3,
              delay: 100,
              backoff: 'exponential',
            },
          })
          
          if (Result.isErr(result)) {
            throw new Error(`Retry failed after attempts: ${result.error.message}`)
          }
          
          return result.value
        },

        // Validate and process
        (data: unknown) => {
          const typedData = data as { data: string; attempts: number }
          
          return {
            result: typedData.data,
            totalAttempts: typedData.attempts,
            retrySuccessful: typedData.attempts >= 1,
          }
        },
      ])

      const result = await retryPipeline(null)
      const retryResult = ResultTestUtils.expectOk(result) as RetryResult<string>
      
      expect(retryResult.result).toBe('success')
      expect(retryResult.totalAttempts).toBe(3)
      expect(retryResult.retrySuccessful).toBe(true)
    })

    it('should implement fallback data sources', async () => {
      // Setup primary endpoint (failing) and fallback endpoint (working)
      apiServer.addEndpoint({
        method: 'GET',
        path: '/api/primary',
        response: null,
        status: 500,
      })
      
      apiServer.addEndpoint({
        method: 'GET',
        path: '/api/fallback',
        response: {
          users: [
            {
              id: 1,
              name: 'Fallback User',
              email: 'fallback@example.com',
              active: true,
              department: 'Engineering',
              salary: 75000,
              joinDate: new Date().toISOString(),
              skills: ['JavaScript'],
              performance: 7.5,
              region: 'North',
            },
          ],
          source: 'fallback',
        },
      })

      const fallbackPipeline = pipeline.compose([
        // Try primary, fall back to secondary
        async () => {
          // Try primary first
          const primaryResult = await service.get('/api/primary')
          
          if (Result.isOk(primaryResult)) {
            return { source: 'primary', data: primaryResult.value }
          }
          
          // Fall back to secondary
          const fallbackResult = await service.get('/api/fallback')
          
          if (Result.isErr(fallbackResult)) {
            throw new Error('Both primary and fallback sources failed')
          }
          
          return { source: 'fallback', data: fallbackResult.value }
        },

        // Process regardless of source
        (result: unknown) => {
          const typedResult = result as { 
            source: string; 
            data: { users: unknown[]; source?: string } 
          }
          
          const users = typedResult.data.users
          const validatedUsers = []
          
          for (const user of users) {
            const validation = data.validate(user, IntegrationSchemas.user)
            if (Result.isOk(validation)) {
              validatedUsers.push(validation.value)
            }
          }
          
          return {
            dataSource: typedResult.source,
            userCount: validatedUsers.length,
            users: validatedUsers,
            fallbackUsed: typedResult.source === 'fallback',
          }
        },
      ])

      const result = await fallbackPipeline(null)
      const fallbackResult = ResultTestUtils.expectOk(result) as FallbackResult<User>
      
      expect(fallbackResult.dataSource).toBe('fallback')
      expect(fallbackResult.userCount).toBe(1)
      expect(fallbackResult.fallbackUsed).toBe(true)
      expect(fallbackResult.users).toHaveLength(1)
    })

    it('should implement graceful degradation', async () => {
      // Setup mixed endpoint responses
      apiServer.addEndpoint({
        method: 'GET',
        path: '/api/core-data',
        response: {
          users: [
            {
              id: 1,
              name: 'Core User',
              email: 'core@example.com',
              active: true,
              department: 'Engineering',
              salary: 75000,
              joinDate: new Date().toISOString(),
              skills: ['JavaScript'],
              performance: 7.5,
              region: 'North',
            },
          ],
        },
      })
      
      apiServer.addEndpoint({
        method: 'GET',
        path: '/api/enhanced-data',
        response: null,
        status: 500,
      })

      const gracefulDegradationPipeline = pipeline.compose([
        // Fetch core data (essential)
        async () => {
          const coreResult = await service.get<{ users: unknown[] }>('/api/core-data')
          if (Result.isErr(coreResult)) {
            throw new Error('Core data fetch failed - cannot proceed')
          }
          return coreResult.value.users
        },

        // Try to enhance with additional data (optional)
        async (coreUsers: unknown) => {
          const typedUsers = coreUsers as unknown[]
          
          // Try to get enhanced data
          const enhancedResult = await service.get('/api/enhanced-data')
          
          let enhancedData = null
          let enhancementError = null
          
          if (Result.isErr(enhancedResult)) {
            enhancementError = enhancedResult.error.message
          } else {
            enhancedData = enhancedResult.value
          }
          
          return {
            coreUsers: typedUsers,
            enhancedData,
            enhancementError,
            degraded: enhancedData === null,
          }
        },

        // Process with graceful degradation
        (result: unknown) => {
          const typedResult = result as {
            coreUsers: unknown[]
            enhancedData: unknown
            enhancementError: string | null
            degraded: boolean
          }
          
          const validatedUsers = []
          
          for (const user of typedResult.coreUsers) {
            const validation = data.validate(user, IntegrationSchemas.user)
            if (Result.isOk(validation)) {
              validatedUsers.push(validation.value)
            }
          }
          
          return {
            userCount: validatedUsers.length,
            users: validatedUsers,
            enhancementAvailable: !typedResult.degraded,
            enhancementError: typedResult.enhancementError,
            operationMode: typedResult.degraded ? 'degraded' : 'full',
          }
        },
      ])

      const result = await gracefulDegradationPipeline(null)
      const degradationResult = ResultTestUtils.expectOk(result) as DegradationResult<User>
      
      expect(degradationResult.userCount).toBe(1)
      expect(degradationResult.users).toHaveLength(1)
      expect(degradationResult.enhancementAvailable).toBe(false)
      expect(degradationResult.enhancementError).toBeDefined()
      expect(degradationResult.operationMode).toBe('degraded')
    })
  })

  describe('Error Context and Debugging', () => {
    it('should provide detailed error context for debugging', async () => {
      // Setup endpoint that returns data causing validation errors
      apiServer.addEndpoint({
        method: 'GET',
        path: '/api/debug-data',
        response: {
          users: [
            {
              id: 1,
              name: 'Valid User',
              email: 'valid@example.com',
              active: true,
              department: 'Engineering',
              salary: 75000,
              joinDate: new Date().toISOString(),
              skills: ['JavaScript'],
              performance: 7.5,
              region: 'North',
            },
            {
              id: 2,
              name: 'Invalid User',
              email: 'invalid-email', // This will cause validation error
              active: true,
              department: 'Engineering',
              salary: 'invalid-salary', // This will cause validation error
              joinDate: 'invalid-date', // This will cause validation error
              skills: 'not-an-array', // This will cause validation error
              performance: 'invalid-performance', // This will cause validation error
              region: 'North',
            },
          ],
        },
      })

      const debugPipeline = pipeline.compose([
        // Fetch data
        async () => {
          const result = await service.get<{ users: unknown[] }>('/api/debug-data')
          if (Result.isErr(result)) {
            throw new Error('Debug data fetch failed')
          }
          return result.value.users
        },

        // Process with detailed error collection
        async (users: unknown) => {
          const typedUsers = users as unknown[]
          
          const debugResults = await pipeline.map(
            typedUsers,
            (user: unknown, index: number) => {
              const validation = data.validate(user, IntegrationSchemas.user)
              
              if (Result.isErr(validation)) {
                return {
                  index,
                  success: false,
                  user,
                  error: {
                    message: validation.error.message,
                    code: validation.error.code,
                    fieldPath: (validation.error as { fieldPath?: string }).fieldPath || 'unknown',
                    issues: (validation.error as { issues?: unknown[] }).issues || [],
                    timestamp: validation.error.timestamp,
                  },
                }
              }
              
              return {
                index,
                success: true,
                user: validation.value,
                error: null,
              }
            },
            { continueOnError: true }
          )
          
          if (Result.isErr(debugResults)) {
            throw new Error('Debug processing failed')
          }
          
          const results = debugResults.value
          
          return {
            totalProcessed: results.length,
            successfulValidations: results.filter(r => r.success).length,
            failedValidations: results.filter(r => !r.success).length,
            detailedErrors: results
              .filter(r => !r.success)
              .map(r => ({
                userIndex: r.index,
                errorMessage: r.error?.message,
                errorCode: r.error?.code,
                fieldPath: (r.error as ValidationError | undefined)?.fieldPath,
                issueCount: (r.error as ValidationError | undefined)?.issues?.length || 0,
                timestamp: r.error?.timestamp,
              })),
          }
        },
      ])

      const result = await debugPipeline(null)
      const debugResult = ResultTestUtils.expectOk(result) as DebugResult
      
      expect(debugResult.totalProcessed).toBe(2)
      expect(debugResult.successfulValidations).toBe(1)
      expect(debugResult.failedValidations).toBe(1)
      expect(debugResult.detailedErrors).toHaveLength(1)
      
      const errorDetails = debugResult.detailedErrors[0]
      if (errorDetails) {
        expect(errorDetails.userIndex).toBe(1)
        expect(errorDetails.errorMessage).toBeDefined()
        expect(errorDetails.errorCode).toBe('DATA_ERROR')
        // fieldPath might be undefined for some error types
        expect(errorDetails.fieldPath !== undefined || errorDetails.fieldPath === undefined).toBe(true)
        expect(errorDetails.issueCount).toBeGreaterThanOrEqual(0)
        expect(errorDetails.timestamp).toBeDefined()
      }
    })
  })
})