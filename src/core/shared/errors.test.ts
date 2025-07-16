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
  type KairoError
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
})