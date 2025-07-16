/**
 * Comprehensive tests for SERVICE utilities
 * 
 * Tests the 6 utility functions that support SERVICE pillar operations:
 * - buildURL: URL construction with query parameters
 * - parseURL: URL parsing into components
 * - isServiceError: Type guard for service errors
 * - isRetryable: Retry logic for various error types
 * - parseResponse: HTTP response parsing with content type handling
 * - extractHeaders: Header extraction from responses
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { Result } from '../shared'
import { createServiceError, createServiceHttpError } from '../shared'
import type { ServiceError, ServiceHttpError, ServiceNetworkError } from '../shared'
import type { ServiceResponse } from './types'
import {
  buildURL,
  parseURL,
  isServiceError,
  isRetryable,
  parseResponse,
  extractHeaders
} from './utils'

describe('SERVICE Utilities', () => {
  
  describe('buildURL', () => {
    describe('Basic URL building', () => {
      it('should return base URL when no path or params', () => {
        const result = buildURL('https://api.example.com')
        expect(result).toBe('https://api.example.com')
      })

      it('should append path to base URL', () => {
        const result = buildURL('https://api.example.com', '/users')
        expect(result).toBe('https://api.example.com/users')
      })

      it('should handle base URL with trailing slash', () => {
        const result = buildURL('https://api.example.com/', '/users')
        expect(result).toBe('https://api.example.com/users')
      })

      it('should handle path without leading slash', () => {
        const result = buildURL('https://api.example.com', 'users')
        expect(result).toBe('https://api.example.com/users')
      })

      it('should handle both base with trailing slash and path without leading slash', () => {
        const result = buildURL('https://api.example.com/', 'users')
        expect(result).toBe('https://api.example.com/users')
      })
    })

    describe('Query parameter handling', () => {
      it('should add simple query parameters', () => {
        const result = buildURL('https://api.example.com', undefined, { page: 1, limit: 10 })
        expect(result).toBe('https://api.example.com?page=1&limit=10')
      })

      it('should add parameters to URL with path', () => {
        const result = buildURL('https://api.example.com', '/users', { active: true })
        expect(result).toBe('https://api.example.com/users?active=true')
      })

      it('should handle string parameters', () => {
        const result = buildURL('https://api.example.com', undefined, { 
          search: 'john doe', 
          category: 'users' 
        })
        expect(result).toBe('https://api.example.com?search=john+doe&category=users')
      })

      it('should handle object parameters by JSON stringifying', () => {
        const result = buildURL('https://api.example.com', undefined, { 
          filter: { name: 'john', age: 30 } 
        })
        expect(result).toBe('https://api.example.com?filter=%7B%22name%22%3A%22john%22%2C%22age%22%3A30%7D')
      })

      it('should skip null and undefined parameters', () => {
        const result = buildURL('https://api.example.com', undefined, { 
          page: 1, 
          limit: null, 
          offset: undefined,
          search: 'test'
        })
        expect(result).toBe('https://api.example.com?page=1&search=test')
      })

      it('should handle boolean parameters', () => {
        const result = buildURL('https://api.example.com', undefined, { 
          active: true, 
          deleted: false 
        })
        expect(result).toBe('https://api.example.com?active=true&deleted=false')
      })

      it('should handle number parameters', () => {
        const result = buildURL('https://api.example.com', undefined, { 
          page: 1, 
          limit: 50, 
          price: 29.99 
        })
        expect(result).toBe('https://api.example.com?page=1&limit=50&price=29.99')
      })

      it('should handle URLs that already have query parameters', () => {
        const result = buildURL('https://api.example.com?existing=param', undefined, { 
          new: 'value' 
        })
        expect(result).toBe('https://api.example.com?existing=param&new=value')
      })

      it('should handle empty parameters object', () => {
        const result = buildURL('https://api.example.com', '/users', {})
        expect(result).toBe('https://api.example.com/users')
      })
    })

    describe('Edge cases', () => {
      it('should handle special characters in parameters', () => {
        const result = buildURL('https://api.example.com', undefined, { 
          'special-key': 'value with spaces & symbols!' 
        })
        expect(result).toContain('special-key=value+with+spaces+%26+symbols%21')
      })

      it('should handle symbols and functions as parameters', () => {
        const symbol = Symbol('test')
        const func = () => 'test'
        const result = buildURL('https://api.example.com', undefined, { 
          symbolParam: symbol,
          functionParam: func
        })
        expect(result).toContain('symbolParam=Symbol%28test%29')
        expect(result).toContain('functionParam=')
      })
    })
  })

  describe('parseURL', () => {
    describe('Valid URL parsing', () => {
      it('should parse simple URL', () => {
        const result = parseURL('https://api.example.com/users')
        
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value).toEqual({
            base: 'https://api.example.com',
            path: '/users',
            params: {}
          })
        }
      })

      it('should parse URL with query parameters', () => {
        const result = parseURL('https://api.example.com/users?page=1&limit=10')
        
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value).toEqual({
            base: 'https://api.example.com',
            path: '/users',
            params: {
              page: '1',
              limit: '10'
            }
          })
        }
      })

      it('should parse URL with hash fragment', () => {
        const result = parseURL('https://api.example.com/users#section1')
        
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value).toEqual({
            base: 'https://api.example.com',
            path: '/users',
            params: {},
            hash: 'section1'
          })
        }
      })

      it('should parse URL with custom port', () => {
        const result = parseURL('https://api.example.com:8080/api/users')
        
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value).toEqual({
            base: 'https://api.example.com:8080',
            path: '/api/users',
            params: {}
          })
        }
      })

      it('should parse URL with complex query parameters', () => {
        const result = parseURL('https://api.example.com/search?q=hello+world&filter=active&sort=name')
        
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value.params).toEqual({
            q: 'hello world',
            filter: 'active',
            sort: 'name'
          })
        }
      })
    })

    describe('Invalid URL handling', () => {
      it('should return error for invalid URL', () => {
        const result = parseURL('not-a-valid-url')
        
        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.code).toBe('SERVICE_ERROR')
          expect(result.error.message).toContain('Invalid URL')
        }
      })

      it('should return error for malformed URL', () => {
        const result = parseURL('https://[invalid')
        
        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.code).toBe('SERVICE_ERROR')
          expect(result.error.message).toContain('Invalid URL')
        }
      })

      it('should return error for empty string', () => {
        const result = parseURL('')
        
        expect(Result.isErr(result)).toBe(true)
      })
    })
  })

  describe('isServiceError', () => {
    it('should return true for valid ServiceError', () => {
      const error = createServiceError('test', 'Test error', {})
      expect(isServiceError(error)).toBe(true)
    })

    it('should return true for ServiceHttpError', () => {
      const error = createServiceHttpError('test', 'HTTP error', 404, 'Not Found', 'https://example.com')
      expect(isServiceError(error)).toBe(true)
    })

    it('should return false for regular Error', () => {
      const error = new Error('Regular error')
      expect(isServiceError(error)).toBe(false)
    })

    it('should return false for non-SERVICE pillar errors', () => {
      const error = {
        code: 'DATA_ERROR',
        pillar: 'DATA',
        message: 'Data error'
      }
      expect(isServiceError(error)).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isServiceError(null)).toBe(false)
      expect(isServiceError(undefined)).toBe(false)
    })

    it('should return false for primitives', () => {
      expect(isServiceError('string')).toBe(false)
      expect(isServiceError(123)).toBe(false)
      expect(isServiceError(true)).toBe(false)
    })

    it('should return false for objects without required properties', () => {
      expect(isServiceError({ message: 'error' })).toBe(false)
      expect(isServiceError({ code: 'ERROR' })).toBe(false)
      expect(isServiceError({ pillar: 'SERVICE' })).toBe(false)
    })
  })

  describe('isRetryable', () => {
    describe('Network errors', () => {
      it('should return true for network errors', () => {
        const networkError: ServiceNetworkError = {
          code: 'SERVICE_NETWORK_ERROR',
          pillar: 'SERVICE',
          operation: 'get',
          message: 'Network error',
          url: 'https://example.com',
          timestamp: Date.now(),
          context: {}
        }
        expect(isRetryable(networkError)).toBe(true)
      })
    })

    describe('HTTP errors', () => {
      it('should return true for retryable HTTP status codes', () => {
        const retryableStatuses = [408, 429, 500, 502, 503, 504]
        
        retryableStatuses.forEach(status => {
          const httpError: ServiceHttpError = {
            code: 'SERVICE_HTTP_ERROR',
            pillar: 'SERVICE',
            operation: 'get',
            message: `HTTP ${status}`,
            status,
            statusText: 'Error',
            url: 'https://example.com',
            timestamp: Date.now(),
            context: {}
          }
          expect(isRetryable(httpError)).toBe(true)
        })
      })

      it('should return false for non-retryable HTTP status codes', () => {
        const nonRetryableStatuses = [400, 401, 403, 404, 405, 409, 410, 422]
        
        nonRetryableStatuses.forEach(status => {
          const httpError: ServiceHttpError = {
            code: 'SERVICE_HTTP_ERROR',
            pillar: 'SERVICE',
            operation: 'get',
            message: `HTTP ${status}`,
            status,
            statusText: 'Error',
            url: 'https://example.com',
            timestamp: Date.now(),
            context: {}
          }
          expect(isRetryable(httpError)).toBe(false)
        })
      })
    })

    describe('Other service errors', () => {
      it('should return false for general service errors', () => {
        const serviceError: ServiceError = {
          code: 'SERVICE_ERROR',
          pillar: 'SERVICE',
          operation: 'get',
          message: 'General error',
          timestamp: Date.now(),
          context: {}
        }
        expect(isRetryable(serviceError)).toBe(false)
      })
    })
  })

  describe('parseResponse', () => {
    describe('Successful responses', () => {
      it('should parse JSON response', async () => {
        const mockResponse = new Response(
          JSON.stringify({ id: 1, name: 'John' }),
          {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' }
          }
        )
        
        const result = await parseResponse(mockResponse)
        
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value.data).toEqual({ id: 1, name: 'John' })
          expect(result.value.status).toBe(200)
          expect(result.value.statusText).toBe('OK')
          expect(result.value.headers['content-type']).toBe('application/json')
        }
      })

      it('should parse text response', async () => {
        const mockResponse = new Response(
          'Hello World',
          {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'text/plain' }
          }
        )
        
        const result = await parseResponse(mockResponse)
        
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value.data).toBe('Hello World')
          expect(result.value.status).toBe(200)
        }
      })

      it('should parse blob response for binary data', async () => {
        const mockResponse = new Response(
          'binary data',
          {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/octet-stream' }
          }
        )
        
        const result = await parseResponse(mockResponse)
        
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value.data instanceof Blob).toBe(true)
          expect(result.value.status).toBe(200)
        }
      })

      it('should handle response without explicit content type', async () => {
        const mockResponse = new Response(
          'default content',
          {
            status: 200,
            statusText: 'OK'
          }
        )
        
        const result = await parseResponse(mockResponse)
        
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          // When no content-type is provided, Response defaults to 'text/plain'
          // So the data should be a string, not a blob
          expect(typeof result.value.data).toBe('string')
          expect(result.value.data).toBe('default content')
        }
      })
    })

    describe('Error responses', () => {
      it('should handle HTTP error responses', async () => {
        const mockResponse = new Response(
          JSON.stringify({ error: 'Not Found' }),
          {
            status: 404,
            statusText: 'Not Found',
            headers: { 'Content-Type': 'application/json' }
          }
        )
        
        const result = await parseResponse(mockResponse)
        
        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.code).toBe('SERVICE_HTTP_ERROR')
          expect(result.error.message).toContain('HTTP 404')
        }
      })

      it('should handle different HTTP error status codes', async () => {
        const errorStatuses = [400, 401, 403, 500, 502, 503]
        
        for (const status of errorStatuses) {
          const mockResponse = new Response(
            null,
            {
              status,
              statusText: 'Error',
              headers: { 'Content-Type': 'application/json' }
            }
          )
          
          const result = await parseResponse(mockResponse)
          
          expect(Result.isErr(result)).toBe(true)
          if (Result.isErr(result)) {
            expect(result.error.code).toBe('SERVICE_HTTP_ERROR')
            expect(result.error.message).toContain(`HTTP ${status}`)
          }
        }
      })
    })

    describe('Parsing errors', () => {
      it('should handle invalid JSON', async () => {
        const mockResponse = new Response(
          'invalid json {',
          {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' }
          }
        )
        
        const result = await parseResponse(mockResponse)
        
        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.code).toBe('SERVICE_ERROR')
          expect(result.error.message).toContain('Failed to parse response')
        }
      })
    })
  })

  describe('extractHeaders', () => {
    let mockResponse: ServiceResponse<unknown>

    beforeEach(() => {
      mockResponse = {
        data: { test: 'data' },
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'custom-value',
          'authorization': 'Bearer token123',
          'cache-control': 'no-cache'
        },
        url: 'https://example.com'
      }
    })

    it('should return all headers when no keys specified', () => {
      const result = extractHeaders(mockResponse)
      
      expect(result).toEqual({
        'content-type': 'application/json',
        'x-custom-header': 'custom-value',
        'authorization': 'Bearer token123',
        'cache-control': 'no-cache'
      })
    })

    it('should extract specific headers by key', () => {
      const result = extractHeaders(mockResponse, ['content-type', 'authorization'])
      
      expect(result).toEqual({
        'content-type': 'application/json',
        'authorization': 'Bearer token123'
      })
    })

    it('should handle case-insensitive header extraction', () => {
      const result = extractHeaders(mockResponse, ['Content-Type', 'AUTHORIZATION'])
      
      expect(result).toEqual({
        'Content-Type': 'application/json',
        'AUTHORIZATION': 'Bearer token123'
      })
    })

    it('should handle missing headers gracefully', () => {
      const result = extractHeaders(mockResponse, ['content-type', 'nonexistent-header'])
      
      expect(result).toEqual({
        'content-type': 'application/json'
      })
    })

    it('should return empty object for empty keys array', () => {
      const result = extractHeaders(mockResponse, [])
      
      expect(result).toEqual({})
    })

    it('should handle empty headers object', () => {
      const emptyResponse: ServiceResponse<unknown> = {
        ...mockResponse,
        headers: {}
      }
      
      const result = extractHeaders(emptyResponse, ['content-type'])
      
      expect(result).toEqual({})
    })
  })
})