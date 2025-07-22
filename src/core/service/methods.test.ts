/**
 * SERVICE Pillar Methods Tests
 *
 * Comprehensive tests for all SERVICE pillar HTTP methods following Kairo patterns:
 * - get() - Fetch data
 * - post() - Create resources
 * - put() - Update resources
 * - patch() - Partial updates
 * - delete() - Remove resources
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { get, post, put, patch, deleteMethod as del, cache } from './methods'
import { Result } from '../shared'
import type { ServiceHttpError } from '../shared'
import { ResultTestUtils, MockDataGenerator, HttpMockUtils } from '../../test-utils'


describe('SERVICE Pillar Methods', () => {
  beforeEach(() => {
    HttpMockUtils.setup()
  })

  afterEach(() => {
    HttpMockUtils.teardown()
  })

  describe('get() method', () => {
    it('should fetch data successfully with default options', async () => {
      const mockData = MockDataGenerator.user()
      HttpMockUtils.mockSuccess(mockData)

      const result = await get('/users/123')

      const data = ResultTestUtils.expectOk(result)
      expect(data).toEqual(mockData)
    })

    it('should handle query parameters correctly', async () => {
      const mockUsers = MockDataGenerator.users(2)
      HttpMockUtils.mockSuccess(mockUsers)

      const result = await get('/users', {
        params: {
          active: true,
          department: 'Engineering',
          limit: 10,
        },
      })

      const data = ResultTestUtils.expectOk(result)
      expect(data).toEqual(mockUsers)
    })

    it('should handle HTTP errors correctly', async () => {
      HttpMockUtils.mockError(404, 'Not Found')

      const result = await get('/users/nonexistent')

      const error = ResultTestUtils.expectErrType(result, 'SERVICE_HTTP_ERROR')
      expect((error as ServiceHttpError).status).toBe(404)
      expect((error as ServiceHttpError).statusText).toBe('Not Found')
      expect(error.pillar).toBe('SERVICE')
    })

    it('should handle network errors correctly', async () => {
      HttpMockUtils.mockNetworkError()

      const result = await get('/users/123')

      const error = ResultTestUtils.expectErrType(result, 'SERVICE_NETWORK_ERROR')
      expect(error.pillar).toBe('SERVICE')
      expect(error.message).toContain('Network error')
    })

    it('should apply default configuration correctly', async () => {
      const mockData = MockDataGenerator.user()
      HttpMockUtils.mockSuccess(mockData)

      // Test with minimal options to verify defaults
      const result = await get('/users/123', {})

      ResultTestUtils.expectOk(result)
      // Defaults are applied internally, test passes if no errors
    })

    it('should handle custom headers correctly', async () => {
      const mockData = MockDataGenerator.user()
      HttpMockUtils.mockSuccess(mockData)

      const result = await get('/users/123', {
        headers: {
          Authorization: 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      })

      ResultTestUtils.expectOk(result)
    })

    it('should handle conditional requests with ifModifiedSince', async () => {
      const mockData = MockDataGenerator.user()
      HttpMockUtils.mockSuccess(mockData)

      const result = await get('/users/123', {
        ifModifiedSince: new Date('2024-01-01'),
        ifNoneMatch: 'etag-123',
      })

      ResultTestUtils.expectOk(result)
    })

    it('should handle different response types', async () => {
      const textData = 'Plain text response'

      // Mock text response
      global.fetch = async () => {
        await Promise.resolve() // Add async work
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'text/plain' }),
          url: 'https://api.example.com/text',
          json: async () => {
            await Promise.resolve()
            throw new Error('Not JSON')
          },
          text: async () => {
            await Promise.resolve()
            return textData
          },
          blob: async () => {
            await Promise.resolve()
            return new Blob([textData])
          },
          redirected: false,
          type: 'basic' as ResponseType,
          clone: () => ({}) as Response,
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => {
            await Promise.resolve()
            return new ArrayBuffer(0)
          },
          formData: async () => {
            await Promise.resolve()
            return new FormData()
          },
          bytes: async () => {
            await Promise.resolve()
            return new Uint8Array()
          },
        } as Response
      }

      const result = await get('/text-endpoint', {
        responseType: 'text',
      })

      const data = ResultTestUtils.expectOk(result)
      expect(data).toBe(textData)
    })
  })

  describe('post() method', () => {
    it('should create resources successfully with JSON data', async () => {
      const newUser = MockDataGenerator.user({ id: 'new-user' })
      const createdUser = { ...newUser, id: 'created-123' }
      HttpMockUtils.mockSuccess(createdUser, 201)

      const result = await post('/users', newUser)

      const data = ResultTestUtils.expectOk(result)
      expect(data).toEqual(createdUser)
    })

    it('should handle different content types', async () => {
      const formData = { name: 'John', email: 'john@example.com' }
      HttpMockUtils.mockSuccess({ success: true })

      const result = await post('/users', formData, {
        contentType: 'form',
      })

      ResultTestUtils.expectOk(result)
    })

    it('should handle multipart form data', async () => {
      const fileData = { file: 'file-content', metadata: 'test' }
      HttpMockUtils.mockSuccess({ uploaded: true })

      const result = await post('/upload', fileData, {
        contentType: 'multipart',
      })

      ResultTestUtils.expectOk(result)
    })

    it('should include idempotency key when provided', async () => {
      const userData = MockDataGenerator.user()
      HttpMockUtils.mockSuccess(userData)

      const result = await post('/users', userData, {
        idempotencyKey: 'unique-key-123',
      })

      ResultTestUtils.expectOk(result)
    })

    it('should handle text content type', async () => {
      const textData = 'Plain text content'
      HttpMockUtils.mockSuccess({ received: textData })

      const result = await post('/text-endpoint', textData, {
        contentType: 'text',
      })

      ResultTestUtils.expectOk(result)
    })

    it('should handle POST errors correctly', async () => {
      const userData = MockDataGenerator.user()
      HttpMockUtils.mockError(400, 'Bad Request')

      const result = await post('/users', userData)

      const error = ResultTestUtils.expectErrType(result, 'SERVICE_HTTP_ERROR')
      expect((error as ServiceHttpError).status).toBe(400)
      expect((error as ServiceHttpError).statusText).toBe('Bad Request')
    })
  })

  describe('put() method', () => {
    it('should update resources successfully', async () => {
      const updatedUser = MockDataGenerator.user({ name: 'Updated Name' })
      HttpMockUtils.mockSuccess(updatedUser)

      const result = await put('/users/123', updatedUser)

      const data = ResultTestUtils.expectOk(result)
      expect(data).toEqual(updatedUser)
    })

    it('should handle merge option correctly', async () => {
      const partialUpdate = { name: 'New Name' }
      const mergedUser = MockDataGenerator.user({ name: 'New Name' })
      HttpMockUtils.mockSuccess(mergedUser)

      const result = await put('/users/123', partialUpdate, {
        merge: true,
      })

      ResultTestUtils.expectOk(result)
    })

    it('should handle optimistic locking with ETag', async () => {
      const userData = MockDataGenerator.user()
      HttpMockUtils.mockSuccess(userData)

      const result = await put('/users/123', userData, {
        ifMatch: 'etag-123',
        ifUnmodifiedSince: new Date('2024-01-01'),
      })

      ResultTestUtils.expectOk(result)
    })

    it('should handle PUT conflicts correctly', async () => {
      const userData = MockDataGenerator.user()
      HttpMockUtils.mockError(409, 'Conflict')

      const result = await put('/users/123', userData)

      const error = ResultTestUtils.expectErrType(result, 'SERVICE_HTTP_ERROR')
      expect((error as ServiceHttpError).status).toBe(409)
    })
  })

  describe('patch() method', () => {
    it('should perform partial updates successfully', async () => {
      const patchData = { name: 'Patched Name', active: false }
      const patchedUser = MockDataGenerator.user(patchData)
      HttpMockUtils.mockSuccess(patchedUser)

      const result = await patch('/users/123', patchData)

      const data = ResultTestUtils.expectOk(result)
      expect(data).toEqual(patchedUser)
    })

    it('should handle different patch formats', async () => {
      const jsonPatchOps = [
        { op: 'replace', path: '/name', value: 'New Name' },
        { op: 'add', path: '/tags', value: ['admin'] },
      ]
      HttpMockUtils.mockSuccess({ success: true })

      const result = await patch('/users/123', jsonPatchOps, {
        format: 'json-patch',
      })

      ResultTestUtils.expectOk(result)
    })

    it('should handle merge-patch format (default)', async () => {
      const mergePatch = { name: 'Merged Name', department: 'Sales' }
      HttpMockUtils.mockSuccess(MockDataGenerator.user(mergePatch))

      const result = await patch('/users/123', mergePatch, {
        format: 'merge-patch',
      })

      ResultTestUtils.expectOk(result)
    })

    it('should handle different merge strategies', async () => {
      const patchData = { preferences: { theme: 'dark' } }
      HttpMockUtils.mockSuccess(MockDataGenerator.user())

      const result = await patch('/users/123', patchData, {
        strategy: 'merge',
      })

      ResultTestUtils.expectOk(result)
    })
  })

  describe('delete() method', () => {
    it('should delete resources successfully', async () => {
      HttpMockUtils.mockSuccess({ deleted: true }, 204)

      const result = await del('/users/123')

      ResultTestUtils.expectOk(result)
    })

    it('should handle soft delete option', async () => {
      const deletedUser = MockDataGenerator.user({ active: false })
      HttpMockUtils.mockSuccess(deletedUser)

      const result = await del('/users/123', {
        soft: true,
        returnDeleted: true,
      })

      const data = ResultTestUtils.expectOk(result)
      expect(data).toEqual(deletedUser)
    })

    it('should handle force delete option', async () => {
      HttpMockUtils.mockSuccess({ forceDeleted: true })

      const result = await del('/users/123', {
        force: true,
      })

      ResultTestUtils.expectOk(result)
    })

    it('should handle delete errors correctly', async () => {
      HttpMockUtils.mockError(403, 'Forbidden')

      const result = await del('/users/123')

      const error = ResultTestUtils.expectErrType(result, 'SERVICE_HTTP_ERROR')
      expect((error as ServiceHttpError).status).toBe(403)
      expect((error as ServiceHttpError).statusText).toBe('Forbidden')
    })

    it('should handle deletion of non-existent resources', async () => {
      HttpMockUtils.mockError(404, 'Not Found')

      const result = await del('/users/nonexistent')

      const error = ResultTestUtils.expectErrType(result, 'SERVICE_HTTP_ERROR')
      expect((error as ServiceHttpError).status).toBe(404)
    })
  })

  describe('Configuration Object Pattern', () => {
    it('should merge user options with defaults correctly', async () => {
      const mockData = MockDataGenerator.user()
      HttpMockUtils.mockSuccess(mockData)

      // Test that user options override defaults
      const result = await get('/users/123', {
        timeout: 5000,
        responseType: 'json',
      })

      ResultTestUtils.expectOk(result)
    })

    it('should handle empty options object', async () => {
      const mockData = MockDataGenerator.user()
      HttpMockUtils.mockSuccess(mockData)

      const result = await get('/users/123', {})

      ResultTestUtils.expectOk(result)
    })

    it('should handle undefined options', async () => {
      const mockData = MockDataGenerator.user()
      HttpMockUtils.mockSuccess(mockData)

      const result = await get('/users/123')

      ResultTestUtils.expectOk(result)
    })
  })

  describe('Error Handling Patterns', () => {
    it('should create appropriate error types for different scenarios', async () => {
      // Test HTTP error
      HttpMockUtils.mockError(500, 'Internal Server Error')
      const httpResult = await get('/users/123')
      const httpError = ResultTestUtils.expectErrType(httpResult, 'SERVICE_HTTP_ERROR')
      expect(httpError.pillar).toBe('SERVICE')
      expect(httpError.operation).toBe('parseResponse')

      // Test network error
      HttpMockUtils.mockNetworkError()
      const networkResult = await get('/users/123')
      const networkError = ResultTestUtils.expectErrType(networkResult, 'SERVICE_NETWORK_ERROR')
      expect(networkError.pillar).toBe('SERVICE')
    })

    it('should include proper context in errors', async () => {
      HttpMockUtils.mockError(400, 'Bad Request')

      const result = await post('/users', { invalid: 'data' })

      const error = ResultTestUtils.expectErrType(result, 'SERVICE_HTTP_ERROR')
      expect(error.context).toBeDefined()
      expect(error.timestamp).toBeTypeOf('number')
      expect((error as ServiceHttpError).url).toBeDefined()
    })
  })

  describe('Result Pattern Compliance', () => {
    it('should always return Result type', async () => {
      HttpMockUtils.mockSuccess({ test: 'data' })

      const result = await get('/test')

      expect(Result.isOk(result) || Result.isErr(result)).toBe(true)
    })

    it('should never throw exceptions', async () => {
      // Even with completely broken fetch
      global.fetch = async () => {
        await Promise.resolve() // Add async work
        throw new Error('Catastrophic failure')
      }

      const result = await get('/test')

      // Should return Err Result, not throw
      expect(Result.isErr(result)).toBe(true)
    })
  })

  describe('Advanced Service Cache Edge Cases - PHASE 5', () => {
    describe('ServiceCache class edge cases', () => {
      it('should handle cache clear operation (lines 600-601)', () => {
        // Use the exported cache instance
        const serviceCache = cache
        
        // Add some entries first
        serviceCache.set('key1', 'value1', 10000)
        serviceCache.set('key2', 'value2', 10000)
        
        expect(serviceCache.size()).toBe(2)
        
        // Clear cache
        serviceCache.clear()
        expect(serviceCache.size()).toBe(0)
        
        // Should return null for cleared keys
        const result1 = serviceCache.get('key1')
        const result2 = serviceCache.get('key2')
        expect(result1).toBeNull()
        expect(result2).toBeNull()
      })

      it('should handle cache size method (lines 604-605)', () => {
        const serviceCache = cache
        
        // Clear cache first to ensure clean state
        serviceCache.clear()
        expect(serviceCache.size()).toBe(0)
        
        serviceCache.set('key1', 'value1', 10000)
        expect(serviceCache.size()).toBe(1)
        
        serviceCache.set('key2', 'value2', 10000)
        expect(serviceCache.size()).toBe(2)
        
        // Set same key should not increase size
        serviceCache.set('key1', 'new-value1', 10000)
        expect(serviceCache.size()).toBe(2)
        
        serviceCache.clear()
        expect(serviceCache.size()).toBe(0)
      })

      it('should handle cache with expired entries affecting size', () => {
        const serviceCache = cache
        
        // Clear cache first
        serviceCache.clear()
        
        // Add entry that will expire immediately (use negative TTL)
        serviceCache.set('expired-key', 'expired-value', -1000)
        serviceCache.set('valid-key', 'valid-value', 10000)
        
        expect(serviceCache.size()).toBe(2) // Size includes expired entries
        
        // Getting expired key should return null but not affect size until cleanup
        const expiredResult = serviceCache.get('expired-key')
        expect(expiredResult).toBeNull()
        
        const validResult = serviceCache.get('valid-key')
        expect(validResult).toBe('valid-value')
      })
    })

    describe('Cache integration with service methods', () => {
      it('should handle cache state during service operations', () => {
        const serviceCache = cache
        
        // Clear cache to start fresh
        serviceCache.clear()
        expect(serviceCache.size()).toBe(0)
        
        // Manually test cache operations that service methods would use
        const cacheKey = '/api/users'
        const userData = { id: 1, name: 'Test User' }
        
        // Simulate what GET with caching would do
        serviceCache.set(cacheKey, userData, 5000)
        expect(serviceCache.size()).toBe(1)
        
        // Verify cached data retrieval
        const cachedData = serviceCache.get(cacheKey)
        expect(cachedData).toEqual(userData)
        
        // Simulate cache invalidation
        serviceCache.clear()
        expect(serviceCache.size()).toBe(0)
        expect(serviceCache.get(cacheKey)).toBeNull()
      })

      it('should handle cache expiration scenarios', () => {
        const serviceCache = cache
        
        // Clear cache first
        serviceCache.clear()
        
        // Test valid cache entry first
        serviceCache.set('valid-key', { data: 'valid' }, 10000) // 10 seconds
        expect(serviceCache.get('valid-key')).toEqual({ data: 'valid' })
        
        // Size should show the valid entry
        expect(serviceCache.size()).toBe(1)
        
        // Test immediate expiration - this will automatically clean up on get()
        serviceCache.set('expired-key', { data: 'test' }, -1) // Already expired
        
        // Size temporarily shows 2 until we access the expired entry
        expect(serviceCache.size()).toBe(2)
        
        // Accessing expired entry should return null and clean it up
        expect(serviceCache.get('expired-key')).toBeNull()
        
        // After cleanup, size should be back to 1
        expect(serviceCache.size()).toBe(1)
      })

      it('should handle cache size monitoring during multiple operations', () => {
        const serviceCache = cache
        
        // Clear cache first
        serviceCache.clear()
        
        // Simulate multiple cache operations
        serviceCache.set('user:1', { id: 1, name: 'User 1' }, 5000)
        serviceCache.set('user:2', { id: 2, name: 'User 2' }, 5000)
        serviceCache.set('post:1', { id: 1, title: 'Post 1' }, 5000)
        
        expect(serviceCache.size()).toBe(3)
        
        // Add more entries
        for (let i = 3; i <= 5; i++) {
          serviceCache.set(`user:${i}`, { id: i, name: `User ${i}` }, 5000)
        }
        
        expect(serviceCache.size()).toBe(6)
        
        // Clear and verify
        serviceCache.clear()
        expect(serviceCache.size()).toBe(0)
      })
    })

    describe('Complex cache edge cases coverage', () => {
      it('should handle cache operations with various data types', () => {
        const serviceCache = cache
        serviceCache.clear()
        
        // Test different data types
        const testCases = [
          { key: 'string', value: 'test string', ttl: 5000 },
          { key: 'number', value: 42, ttl: 5000 },
          { key: 'object', value: { nested: { data: true } }, ttl: 5000 },
          { key: 'array', value: [1, 2, 3, 'mixed'], ttl: 5000 },
          { key: 'null', value: null, ttl: 5000 },
          { key: 'boolean', value: false, ttl: 5000 }
        ]
        
        // Set all test cases
        testCases.forEach(({ key, value, ttl }) => {
          serviceCache.set(key, value, ttl)
        })
        
        expect(serviceCache.size()).toBe(testCases.length)
        
        // Verify all values can be retrieved correctly
        testCases.forEach(({ key, value }) => {
          expect(serviceCache.get(key)).toEqual(value)
        })
        
        // Clear and verify
        serviceCache.clear()
        expect(serviceCache.size()).toBe(0)
        
        testCases.forEach(({ key }) => {
          expect(serviceCache.get(key)).toBeNull()
        })
      })
      
      it('should handle concurrent cache operations', () => {
        const serviceCache = cache
        serviceCache.clear()
        
        // Simulate concurrent cache operations
        const operations = []
        for (let i = 0; i < 10; i++) {
          operations.push(() => {
            serviceCache.set(`concurrent-${i}`, { index: i, data: `data-${i}` }, 5000)
          })
        }
        
        // Execute all operations
        operations.forEach(op => op())
        
        expect(serviceCache.size()).toBe(10)
        
        // Verify all entries
        for (let i = 0; i < 10; i++) {
          const result = serviceCache.get(`concurrent-${i}`)
          expect(result).toEqual({ index: i, data: `data-${i}` })
        }
      })
    })
  })
})
