/**
 * Comprehensive tests for error handling functions
 */

import { describe, it, expect } from 'vitest'
import {
  createError,
  chainError,
  isKairoError,
  getErrorChain,
  serializeError,
  findErrorByCode,
  hasErrorCode,
  createServiceError,
  createServiceHttpError,
  createDataError,
  createDataValidationError,
  createPipelineError,
  createPipelineCompositionError,
  type KairoError,
  type DataValidationError,
  type PipelineCompositionError
} from './errors'

describe('Error Handling Functions', () => {
  describe('createError', () => {
    it('should create basic error with required fields', () => {
      const error = createError('TEST_ERROR', 'Test message')
      
      expect(error.code).toBe('TEST_ERROR')
      expect(error.message).toBe('Test message')
      expect(error.timestamp).toBeTypeOf('number')
      expect(error.timestamp).toBeLessThanOrEqual(Date.now())
      expect(error.context).toEqual({})
    })

    it('should create error with context', () => {
      const context = { userId: 123, action: 'login' }
      const error = createError('AUTH_ERROR', 'Authentication failed', context)
      
      expect(error.code).toBe('AUTH_ERROR')
      expect(error.message).toBe('Authentication failed')
      expect(error.context).toEqual(context)
    })

    it('should handle complex context objects', () => {
      const context = {
        nested: { value: 'test' },
        array: [1, 2, 3],
        func: () => 'test'
      }
      const error = createError('COMPLEX_ERROR', 'Complex context', context)
      
      expect(error.context).toEqual(context)
    })
  })

  describe('chainError', () => {
    it('should create chained error with cause', () => {
      const originalError = createError('ORIGINAL_ERROR', 'Original message')
      const newError = createError('CHAINED_ERROR', 'Chained message')
      const chainedError = chainError(newError, originalError)
      
      expect(chainedError.code).toBe('CHAINED_ERROR')
      expect(chainedError.message).toBe('Chained message')
      expect(chainedError.cause).toBe(originalError)
    })

    it('should preserve context in chained error', () => {
      const originalError = createError('ORIGINAL_ERROR', 'Original message', { original: true })
      const newError = createError('CHAINED_ERROR', 'Chained message', { chained: true })
      const chainedError = chainError(newError, originalError)
      
      expect(chainedError.context).toEqual({ chained: true })
      expect(chainedError.cause?.context).toEqual({ original: true })
    })

    it('should handle deep error chains', () => {
      const error1 = createError('ERROR_1', 'First error')
      const error2 = chainError(createError('ERROR_2', 'Second error'), error1)
      const error3 = chainError(createError('ERROR_3', 'Third error'), error2)
      
      expect(error3.cause).toBe(error2)
      expect(error3.cause?.cause).toBe(error1)
    })
  })

  describe('isKairoError', () => {
    it('should return true for valid Kairo errors', () => {
      const error = createError('TEST_ERROR', 'Test message')
      expect(isKairoError(error)).toBe(true)
    })

    it('should return false for regular Error objects', () => {
      const error = new Error('Regular error')
      expect(isKairoError(error)).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isKairoError(null)).toBe(false)
      expect(isKairoError(undefined)).toBe(false)
    })

    it('should return false for objects missing required fields', () => {
      const incompleteError = { code: 'TEST', message: 'Test' } // Missing timestamp and context
      expect(isKairoError(incompleteError)).toBe(false)
    })
  })

  describe('getErrorChain', () => {
    it('should return single error for non-chained error', () => {
      const error = createError('TEST_ERROR', 'Test message')
      const chain = getErrorChain(error)
      
      expect(chain).toHaveLength(1)
      expect(chain[0]).toBe(error)
    })

    it('should return full chain for chained errors', () => {
      const error1 = createError('ERROR_1', 'First error')
      const error2 = createError('ERROR_2', 'Second error')
      const error3 = createError('ERROR_3', 'Third error')
      const chained2 = chainError(error2, error1)
      const chained3 = chainError(error3, chained2)
      
      const chain = getErrorChain(chained3)
      
      expect(chain).toHaveLength(3)
      expect(chain[0]).toBe(chained3) // ERROR_3
      expect(chain[1]).toBe(chained2) // ERROR_2 -> ERROR_1  
      expect(chain[2]).toBe(error1) // ERROR_1
    })

    it('should handle non-Kairo errors in chain', () => {
      const regularError = new Error('Regular error')
      const chain = getErrorChain(regularError as unknown as KairoError)
      
      expect(chain).toHaveLength(1)
      expect(chain[0]).toBe(regularError)
    })
  })

  describe('serializeError', () => {
    it('should serialize basic error', () => {
      const error = createError('TEST_ERROR', 'Test message', { test: true })
      const serialized = serializeError(error)
      
      expect(serialized.code).toBe('TEST_ERROR')
      expect(serialized.message).toBe('Test message')
      expect(serialized.context).toEqual({ test: true })
      expect(serialized.timestamp).toBe(error.timestamp)
    })

    it('should serialize chained errors', () => {
      const error1 = createError('ERROR_1', 'First error')
      const error2 = createError('ERROR_2', 'Second error')
      const chained = chainError(error2, error1)
      const serialized = serializeError(chained)
      
      expect(serialized.code).toBe('ERROR_2')
      expect(serialized.cause).toEqual({
        code: 'ERROR_1',
        message: 'First error',
        timestamp: error1.timestamp,
        context: {},
        trace: ['ERROR_1'], // Error trace is included
        cause: undefined
      })
      expect(serialized.trace).toEqual(['ERROR_1', 'ERROR_2']) // Full trace chain
    })

    it('should handle non-Kairo errors', () => {
      const regularError = new Error('Regular error')
      const serialized = serializeError(regularError as unknown as KairoError)
      
      expect(serialized).toEqual({
        code: undefined, // Regular Error has no code
        message: 'Regular error',
        timestamp: undefined, // Regular Error has no timestamp
        context: undefined, // Regular Error has no context
        trace: undefined, // Regular Error has no trace
        cause: undefined // Regular Error has no cause
      })
    })
  })

  describe('findErrorByCode', () => {
    it('should find error by code in single error', () => {
      const error = createError('TARGET_ERROR', 'Target message')
      const found = findErrorByCode(error, 'TARGET_ERROR')
      
      expect(found).toBe(error)
    })

    it('should find error by code in error chain', () => {
      const error1 = createError('ERROR_1', 'First error')
      const error2 = createError('ERROR_2', 'Second error')
      const error3 = createError('ERROR_3', 'Third error')
      const chained2 = chainError(error2, error1)
      const chained3 = chainError(error3, chained2)
      
      const found = findErrorByCode(chained3, 'ERROR_1')
      expect(found).toBe(error1)
    })

    it('should return undefined if code not found', () => {
      const error = createError('TEST_ERROR', 'Test message')
      const found = findErrorByCode(error, 'MISSING_ERROR')
      
      expect(found).toBe(undefined)
    })
  })

  describe('hasErrorCode', () => {
    it('should return true if error has code', () => {
      const error = createError('TEST_ERROR', 'Test message')
      expect(hasErrorCode(error, 'TEST_ERROR')).toBe(true)
    })

    it('should return true if error chain has code', () => {
      const error1 = createError('ERROR_1', 'First error')
      const error2 = createError('ERROR_2', 'Second error')
      const chained = chainError(error2, error1)
      
      expect(hasErrorCode(chained, 'ERROR_1')).toBe(true)
      expect(hasErrorCode(chained, 'ERROR_2')).toBe(true)
    })

    it('should return false if code not found', () => {
      const error = createError('TEST_ERROR', 'Test message')
      expect(hasErrorCode(error, 'MISSING_ERROR')).toBe(false)
    })
  })

  describe('Service Error Factories', () => {
    describe('createServiceError', () => {
      it('should create service error with required fields', () => {
        const error = createServiceError('GET', 'Request failed')
        
        expect(error.pillar).toBe('SERVICE')
        expect(error.operation).toBe('GET')
        expect(error.code).toBe('SERVICE_ERROR')
        expect(error.message).toBe('Request failed')
        expect(error.timestamp).toBeTypeOf('number')
      })

      it('should create service error with context', () => {
        const context = { url: '/api/users', status: 500 }
        const error = createServiceError('GET', 'Request failed', context)
        
        expect(error.context).toEqual(context)
      })
    })

    describe('createServiceHttpError', () => {
      it('should create HTTP service error', () => {
        const error = createServiceHttpError('GET', 'Request failed', 404, 'Not Found', '/api/users')
        
        expect(error.pillar).toBe('SERVICE')
        expect(error.operation).toBe('GET')
        expect(error.message).toBe('Request failed')
        expect(error.status).toBe(404)
        expect(error.statusText).toBe('Not Found')
        expect(error.url).toBe('/api/users')
        expect(error.code).toBe('SERVICE_HTTP_ERROR')
      })

      it('should include context in HTTP error', () => {
        const context = { retry: true, timeout: 5000 }
        const error = createServiceHttpError('POST', 'Request failed', 500, 'Internal Server Error', '/api/data', context)
        
        expect(error.context).toEqual(context)
      })
    })
  })

  describe('Data Error Factories', () => {
    describe('createDataError', () => {
      it('should create data error with required fields', () => {
        const error = createDataError('validate', 'Validation failed')
        
        expect(error.pillar).toBe('DATA')
        expect(error.operation).toBe('validate')
        expect(error.code).toBe('DATA_ERROR')
        expect(error.message).toBe('Validation failed')
      })
    })

    describe('createDataValidationError', () => {
      it('should create validation error', () => {
        const error = createDataValidationError('validate', 'Invalid input', 'email')
        
        expect(error.pillar).toBe('DATA')
        expect(error.operation).toBe('validate')
        expect(error.code).toBe('DATA_VALIDATION_ERROR')
        expect(error.message).toBe('Invalid input')
        expect(error.field).toBe('email')
      })
    })
  })

  describe('Pipeline Error Factories', () => {
    describe('createPipelineError', () => {
      it('should create pipeline error with required fields', () => {
        const error = createPipelineError('map', 'Transform failed')
        
        expect(error.pillar).toBe('PIPELINE')
        expect(error.operation).toBe('map')
        expect(error.code).toBe('PIPELINE_ERROR')
        expect(error.message).toBe('Transform failed')
      })
    })

    describe('createPipelineCompositionError', () => {
      it('should create composition error', () => {
        const error = createPipelineCompositionError('compose', 'Function composition failed', 2)
        
        expect(error.pillar).toBe('PIPELINE')
        expect(error.operation).toBe('compose')
        expect(error.code).toBe('PIPELINE_COMPOSITION_ERROR')
        expect(error.message).toBe('Function composition failed')
        expect(error.step).toBe(2)
      })
    })
  })

  describe('Error Type Integration', () => {
    it('should work with Result pattern', () => {
      const error = createServiceError('GET', 'Request failed')
      expect(isKairoError(error)).toBe(true)
      
      const chain = getErrorChain(error)
      expect(chain).toHaveLength(1)
      expect(chain[0]).toBe(error)
    })

    it('should handle cross-pillar error chains', () => {
      const dataError = createDataError('validate', 'Validation failed')
      const serviceError = createServiceError('get', 'Service failed due to validation')
      const pipelineError = createPipelineError('compose', 'Pipeline failed')
      
      const serviceChained = chainError(serviceError, dataError)
      const pipelineChained = chainError(pipelineError, serviceChained)
      
      const chain = getErrorChain(pipelineChained)
      expect(chain).toHaveLength(3)
      
      expect(hasErrorCode(pipelineChained, 'DATA_ERROR')).toBe(true)
      expect(hasErrorCode(pipelineChained, 'SERVICE_ERROR')).toBe(true)
      expect(hasErrorCode(pipelineChained, 'PIPELINE_ERROR')).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle circular references in context', () => {
      const circularObj: Record<string, unknown> = { name: 'test' }
      circularObj.self = circularObj
      
      const error = createError('CIRCULAR_ERROR', 'Circular reference', circularObj)
      expect(error.context).toBe(circularObj)
      
      // Serialization should handle circular references gracefully
      const serialized = serializeError(error)
      expect(serialized.context).toBe(circularObj)
    })

    it('should handle very long error chains', () => {
      let currentError = createError('ERROR_0', 'Initial error')
      
      for (let i = 1; i < 100; i++) {
        const newError = createError(`ERROR_${i}`, `Error ${i}`)
        currentError = chainError(newError, currentError)
      }
      
      const chain = getErrorChain(currentError)
      expect(chain).toHaveLength(100)
      expect(chain[0]?.code).toBe('ERROR_99')
      expect(chain[99]?.code).toBe('ERROR_0')
    })

    it('should handle empty or null messages', () => {
      const error1 = createError('TEST_ERROR', '')
      const error2 = createError('TEST_ERROR', null as unknown as string)
      
      expect(error1.message).toBe('')
      expect(error2.message).toBe(null)
    })
  })

  describe('Advanced Error Handling Edge Cases', () => {
    describe('Error trace propagation edge cases', () => {
      it('should handle createError when cause has no trace property', () => {
        // Create a cause without trace property (line 26 edge case)
        const causeWithoutTrace: KairoError = {
          code: 'CAUSE_ERROR',
          message: 'Cause without trace',
          timestamp: Date.now(),
          context: {},
          // No trace property
        }

        const newError = createError('NEW_ERROR', 'New error with cause', {}, causeWithoutTrace)
        
        expect(newError.trace).toEqual(['NEW_ERROR'])
        expect(newError.cause).toBe(causeWithoutTrace)
      })

      it('should handle createError when cause has existing trace', () => {
        // Create a cause with existing trace property (line 26 other branch)
        const causeWithTrace: KairoError = {
          code: 'CAUSE_ERROR',
          message: 'Cause with trace',
          timestamp: Date.now(),
          context: {},
          trace: ['ORIGINAL_ERROR', 'CAUSE_ERROR'],
        }

        const newError = createError('NEW_ERROR', 'New error with traced cause', {}, causeWithTrace)
        
        expect(newError.trace).toEqual(['ORIGINAL_ERROR', 'CAUSE_ERROR', 'NEW_ERROR'])
        expect(newError.cause).toBe(causeWithTrace)
      })

      it('should handle chainError with undefined context (line 35)', () => {
        const baseError = createError('BASE_ERROR', 'Base error')
        const errorToChain: KairoError = {
          code: 'CHAIN_ERROR',
          message: 'Error to chain',
          timestamp: Date.now(),
          // context is undefined, should default to {} (line 35)
        } as KairoError

        const chainedError = chainError(errorToChain, baseError)
        
        expect(chainedError.context).toEqual({})
        expect(chainedError.cause).toBe(baseError)
        expect(chainedError.code).toBe('CHAIN_ERROR')
      })

      it('should handle chainError when cause has existing trace', () => {
        const baseError = createError('BASE_ERROR', 'Base error')
        baseError.trace = ['ORIGINAL', 'BASE_ERROR']

        const newError: KairoError = {
          code: 'CHAIN_ERROR',
          message: 'Chain error',
          timestamp: Date.now(),
          context: { step: 'chain' },
        }

        const chainedError = chainError(newError, baseError)
        
        expect(chainedError.trace).toEqual(['ORIGINAL', 'BASE_ERROR', 'CHAIN_ERROR'])
        expect(chainedError.context).toEqual({ step: 'chain' })
      })
    })

    describe('Factory function default value edge cases', () => {
      it('should handle createDataValidationError with undefined field (line 243)', () => {
        // Pass undefined for field parameter to trigger line 243: field || ''
        const error = createDataValidationError(
          'validate',
          'Validation error',
          undefined, // field is undefined
          { invalid: 'data' },
          'REQUIRED'
        )

        expect(error.field).toBe('') // Should default to empty string
        expect(error.code).toBe('DATA_VALIDATION_ERROR')
        expect(error.pillar).toBe('DATA')
        expect(error.operation).toBe('validate')
        expect(error.value).toEqual({ invalid: 'data' })
        expect(error.constraint).toBe('REQUIRED')
      })

      it('should handle createDataValidationError with null field', () => {
        const error = createDataValidationError(
          'validate',
          'Validation error',
          null as unknown as string, // field is null
          { data: 'test' },
          'TYPE_ERROR'
        )

        expect(error.field).toBe('') // Should default to empty string
        expect(error.constraint).toBe('TYPE_ERROR')
      })

      it('should handle createDataValidationError with undefined constraint', () => {
        const error = createDataValidationError(
          'validate',
          'Validation error',
          'user.email',
          'invalid-email',
          undefined // constraint is undefined
        )

        expect(error.field).toBe('user.email')
        expect(error.constraint).toBe('') // Should default to empty string
      })

      it('should handle createPipelineCompositionError with undefined step (line 274)', () => {
        // Pass undefined for step parameter to trigger line 274: step || 0
        const error = createPipelineCompositionError(
          'compose',
          'Composition failed',
          undefined, // step is undefined
          'transformStep'
        )

        expect(error.step).toBe(0) // Should default to 0
        expect(error.stepName).toBe('transformStep')
        expect(error.code).toBe('PIPELINE_COMPOSITION_ERROR')
        expect(error.pillar).toBe('PIPELINE')
      })

      it('should handle createPipelineCompositionError with undefined stepName', () => {
        const error = createPipelineCompositionError(
          'compose',
          'Composition failed',
          5,
          undefined // stepName is undefined
        )

        expect(error.step).toBe(5)
        expect(error.stepName).toBe('') // Should default to empty string
      })

      it('should handle createPipelineCompositionError with both step and stepName undefined', () => {
        const error = createPipelineCompositionError(
          'compose',
          'Composition failed',
          undefined, // step is undefined
          undefined  // stepName is undefined
        )

        expect(error.step).toBe(0) // Should default to 0
        expect(error.stepName).toBe('') // Should default to empty string
        expect(error.operation).toBe('compose')
        expect(error.message).toBe('Composition failed')
      })
    })

    describe('Complex error propagation scenarios', () => {
      it('should handle deeply nested error chains with mixed trace states', () => {
        // Create base error with no trace
        const baseError: KairoError = {
          code: 'BASE_ERROR',
          message: 'Base error',
          timestamp: Date.now(),
          context: { level: 0 },
        }

        // Chain an error that will add trace
        const level1Error = createError('LEVEL1_ERROR', 'Level 1 error', { level: 1 }, baseError)
        expect(level1Error.trace).toEqual(['LEVEL1_ERROR'])

        // Chain another error
        const level2Error = chainError(
          { code: 'LEVEL2_ERROR', message: 'Level 2', timestamp: Date.now(), context: { level: 2 } } as KairoError,
          level1Error
        )
        expect(level2Error.trace).toEqual(['LEVEL1_ERROR', 'LEVEL2_ERROR'])

        // Create final error with the chain
        const finalError = createError('FINAL_ERROR', 'Final error', { level: 3 }, level2Error)
        expect(finalError.trace).toEqual(['LEVEL1_ERROR', 'LEVEL2_ERROR', 'FINAL_ERROR'])
      })

      it('should preserve error context through chaining operations', () => {
        const dataError = createDataValidationError('validate', 'Invalid data', 'email', 'invalid@', 'EMAIL_FORMAT')
        const serviceError = createServiceError('fetchUser', 'Service failed', { userId: 123 })
        
        // Chain service error with data error as cause
        const chainedServiceError = chainError(serviceError, dataError)
        
        expect(chainedServiceError.context).toEqual({ userId: 123 })
        expect(chainedServiceError.cause?.code).toBe('DATA_VALIDATION_ERROR')
        
        // Create pipeline error and chain with service error
        const pipelineError = createPipelineCompositionError('process', 'Pipeline failed', 2, 'validation')
        const finalError = chainError(pipelineError, chainedServiceError)
        
        expect(finalError.step).toBe(2)
        expect(finalError.stepName).toBe('validation')
        expect(finalError.cause?.code).toBe('SERVICE_ERROR')
        expect(finalError.cause?.cause?.code).toBe('DATA_VALIDATION_ERROR')
      })

      it('should handle error serialization with deep chains and undefined values', () => {
        // Create chain with some undefined values
        const baseError = createDataValidationError(
          'validate',
          'Base validation error',
          undefined, // field will be ''
          null,
          undefined // constraint will be ''
        )

        const compositionError = createPipelineCompositionError(
          'compose',
          'Composition error',
          undefined, // step will be 0
          undefined  // stepName will be ''
        )

        const chainedError: PipelineCompositionError = chainError(compositionError, baseError)
        const serialized = serializeError(chainedError)

        expect(serialized.code).toBe('PIPELINE_COMPOSITION_ERROR')
        expect(serialized.cause).toBeDefined()
        expect((serialized.cause as KairoError).code).toBe('DATA_VALIDATION_ERROR')
        
        // Verify defaults were applied
        expect(chainedError.step).toBe(0)
        expect(chainedError.stepName).toBe('')
        expect((chainedError.cause as DataValidationError)?.field).toBe('')
        expect((chainedError.cause as DataValidationError)?.constraint).toBe('')
      })
    })

    describe('Error factory comprehensive coverage', () => {
      it('should create service HTTP errors with all parameters', () => {
        const httpError = createServiceHttpError(
          'GET',
          'HTTP request failed',
          404,
          'Not Found',
          '/api/users/123',
          { requestId: 'abc123' }
        )

        expect(httpError.code).toBe('SERVICE_HTTP_ERROR')
        expect(httpError.pillar).toBe('SERVICE')
        expect(httpError.operation).toBe('GET')
        expect(httpError.status).toBe(404)
        expect(httpError.statusText).toBe('Not Found')
        expect(httpError.url).toBe('/api/users/123')
        expect(httpError.context.requestId).toBe('abc123')
      })

      it('should create service HTTP errors with minimal parameters', () => {
        const httpError = createServiceHttpError(
          'POST',
          'Request failed',
          500,
          'Internal Server Error',
          '/api/data'
        )

        expect(httpError.code).toBe('SERVICE_HTTP_ERROR')
        expect(httpError.status).toBe(500)
        expect(httpError.statusText).toBe('Internal Server Error')
        expect(httpError.url).toBe('/api/data')
        expect(httpError.context).toEqual({})
      })
    })
  })
})