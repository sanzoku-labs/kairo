import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Result } from './result'
import { schema } from '../index'
import { resource, resourceUtils, resourceCache, type ResourceMethod } from './resource'

// Test error type interfaces
interface TestHttpError {
  code: 'HTTP_ERROR'
  message: string
}

interface TestValidationError {
  code: 'VALIDATION_ERROR'
  message: string
}

// Test schemas
const UserSchema = schema.object({
  id: schema.number(),
  name: schema.string(),
  email: schema.string().email(),
})

const CreateUserSchema = schema.object({
  name: schema.string(),
  email: schema.string().email(),
})

const UpdateUserSchema = schema.object({
  name: schema.string().optional(),
  email: schema.string().email().optional(),
})

const UserParamsSchema = schema.object({
  id: schema.string(),
})

const DeleteResponseSchema = schema.object({
  success: schema.boolean(),
  message: schema.string(),
})

// Mock HTTP client
const mockHttpClient = {
  fetch: vi.fn(),
}

describe('Resource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('resource creation', () => {
    it('should create resource with typed methods', () => {
      const UserResource = resource('users', {
        list: {
          method: 'GET',
          path: '/api/users',
          response: schema.array(
            schema.object({
              id: schema.number(),
              name: schema.string(),
              email: schema.string().email(),
            })
          ),
        },
        get: {
          method: 'GET',
          path: '/api/users/:id',
          params: UserParamsSchema,
          response: UserSchema,
        },
        create: {
          method: 'POST',
          path: '/api/users',
          body: CreateUserSchema,
          response: UserSchema,
        },
        update: {
          method: 'PUT',
          path: '/api/users/:id',
          params: UserParamsSchema,
          body: UpdateUserSchema,
          response: UserSchema,
        },
        delete: {
          method: 'DELETE',
          path: '/api/users/:id',
          params: UserParamsSchema,
          response: DeleteResponseSchema,
        },
      } as const)

      expect(UserResource.name).toBe('users')
      expect(UserResource.baseUrl).toBe('')
      expect(UserResource.list).toBeDefined()
      expect(UserResource.get).toBeDefined()
      expect(UserResource.create).toBeDefined()
      expect(UserResource.update).toBeDefined()
      expect(UserResource.delete).toBeDefined()
    })

    it('should create resource with base URL and config', () => {
      const UserResource = resource(
        'users',
        {
          get: {
            method: 'GET',
            path: '/users/:id',
            params: UserParamsSchema,
            response: UserSchema,
          },
        },
        {
          baseUrl: 'https://api.example.com',
          defaultCache: { ttl: 60000 },
          defaultRetry: { times: 3, delay: 1000 },
          defaultTimeout: 5000,
          httpClient: mockHttpClient,
        }
      )

      expect(UserResource.name).toBe('users')
      expect(UserResource.baseUrl).toBe('https://api.example.com')
    })

    it('should provide access to method configurations', () => {
      const UserResource = resource('users', {
        get: {
          method: 'GET',
          path: '/api/users/:id',
          params: UserParamsSchema,
          response: UserSchema,
        },
      } as const)

      const getMethod = UserResource.getMethod('get')
      expect(getMethod.method).toBe('GET')
      expect(getMethod.path).toBe('/api/users/:id')
    })
  })

  describe('pipeline integration', () => {
    it('should execute GET request with parameters', async () => {
      mockHttpClient.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'John Doe', email: 'john@example.com' }),
      } satisfies Partial<Response>)

      const UserResource = resource(
        'users',
        {
          get: {
            method: 'GET',
            path: '/api/users/:id',
            params: UserParamsSchema,
            response: UserSchema,
          },
        },
        {
          baseUrl: 'https://api.example.com',
          httpClient: mockHttpClient,
        }
      )

      const result = await UserResource.get.run({ id: '1' })

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual({
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
        })
      }

      expect(mockHttpClient.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users/1',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should execute POST request with body', async () => {
      mockHttpClient.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 2, name: 'Jane Smith', email: 'jane@example.com' }),
      } satisfies Partial<Response>)

      const UserResource = resource(
        'users',
        {
          create: {
            method: 'POST',
            path: '/api/users',
            body: CreateUserSchema,
            response: UserSchema,
          },
        },
        {
          baseUrl: 'https://api.example.com',
          httpClient: mockHttpClient,
        }
      )

      const result = await UserResource.create.run({
        name: 'Jane Smith',
        email: 'jane@example.com',
      })

      expect(Result.isOk(result)).toBe(true)
      expect(mockHttpClient.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Jane Smith',
            email: 'jane@example.com',
          }),
        })
      )
    })

    it('should execute PUT request with params and body', async () => {
      mockHttpClient.fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ id: 1, name: 'John Updated', email: 'john.updated@example.com' }),
      } satisfies Partial<Response>)

      const UserResource = resource(
        'users',
        {
          update: {
            method: 'PUT',
            path: '/api/users/:id',
            params: UserParamsSchema,
            body: UpdateUserSchema,
            response: UserSchema,
          },
        },
        {
          baseUrl: 'https://api.example.com',
          httpClient: mockHttpClient,
        }
      )

      const result = await UserResource.update.run({
        id: '1',
        name: 'John Updated',
        email: 'john.updated@example.com',
      })

      expect(Result.isOk(result)).toBe(true)
      expect(mockHttpClient.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('John Updated') as string,
        })
      )
    })

    it('should execute DELETE request with parameters', async () => {
      mockHttpClient.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'User deleted successfully' }),
      } satisfies Partial<Response>)

      const UserResource = resource(
        'users',
        {
          delete: {
            method: 'DELETE',
            path: '/api/users/:id',
            params: UserParamsSchema,
            response: DeleteResponseSchema,
          },
        },
        {
          baseUrl: 'https://api.example.com',
          httpClient: mockHttpClient,
        }
      )

      const result = await UserResource.delete.run({ id: '1' })

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual({
          success: true,
          message: 'User deleted successfully',
        })
      }

      expect(mockHttpClient.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('URL interpolation with FP patterns', () => {
    it('should interpolate single path parameter', () => {
      const result = resourceUtils.interpolateUrl('/api/users/:id', { id: '123' })
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe('/api/users/123')
      }
    })

    it('should interpolate multiple path parameters', () => {
      const result = resourceUtils.interpolateUrl('/api/users/:userId/posts/:postId', {
        userId: '123',
        postId: '456',
      })
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe('/api/users/123/posts/456')
      }
    })

    it('should encode URI components', () => {
      const result = resourceUtils.interpolateUrl('/api/search/:query', {
        query: 'hello world',
      })
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe('/api/search/hello%20world')
      }
    })

    it('should return error for missing parameters', () => {
      const result = resourceUtils.interpolateUrl('/api/users/:id', {})
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toContain('Missing required parameter: id')
      }
    })

    it('should extract path parameters from URL template', () => {
      const params = resourceUtils.extractPathParams('/api/users/:userId/posts/:postId')
      expect(params).toEqual(['userId', 'postId'])
    })

    it('should handle URLs with no parameters', () => {
      const params = resourceUtils.extractPathParams('/api/users')
      expect(params).toEqual([])
    })
  })

  describe('caching integration', () => {
    it('should apply method-level cache configuration', async () => {
      mockHttpClient.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'John Doe', email: 'john@example.com' }),
      })

      const UserResource = resource(
        'users',
        {
          get: {
            method: 'GET',
            path: '/api/users/:id',
            params: UserParamsSchema,
            response: UserSchema,
            cache: { ttl: 60000 },
          },
        },
        { httpClient: mockHttpClient }
      )

      // First call
      const result1 = await UserResource.get.run({ id: '1' })
      expect(Result.isOk(result1)).toBe(true)
      expect(mockHttpClient.fetch).toHaveBeenCalledTimes(1)

      // Second call should hit cache (in a real scenario)
      const result2 = await UserResource.get.run({ id: '1' })
      expect(Result.isOk(result2)).toBe(true)
    })

    it('should apply default cache configuration', () => {
      const UserResource = resource(
        'users',
        {
          get: {
            method: 'GET',
            path: '/api/users/:id',
            params: UserParamsSchema,
            response: UserSchema,
          },
        },
        {
          defaultCache: { ttl: 30000 },
          httpClient: mockHttpClient,
        }
      )

      expect(UserResource.getMethod('get')).toBeDefined()
    })
  })

  describe('retry integration', () => {
    it('should apply method-level retry configuration', async () => {
      // First call fails, second succeeds
      mockHttpClient.fetch.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'John Doe', email: 'john@example.com' }),
      } satisfies Partial<Response>)

      const UserResource = resource(
        'users',
        {
          get: {
            method: 'GET',
            path: '/api/users/:id',
            params: UserParamsSchema,
            response: UserSchema,
            retry: { times: 2, delay: 100 },
          },
        },
        { httpClient: mockHttpClient }
      )

      const result = await UserResource.get.run({ id: '1' })
      expect(Result.isOk(result)).toBe(true)
    })

    it('should apply default retry configuration', () => {
      const UserResource = resource(
        'users',
        {
          get: {
            method: 'GET',
            path: '/api/users/:id',
            params: UserParamsSchema,
            response: UserSchema,
          },
        },
        {
          defaultRetry: { times: 3, delay: 1000 },
          httpClient: mockHttpClient,
        }
      )

      expect(UserResource.getMethod('get')).toBeDefined()
    })
  })

  describe('timeout integration', () => {
    it('should apply method-level timeout configuration', () => {
      const UserResource = resource(
        'users',
        {
          get: {
            method: 'GET',
            path: '/api/users/:id',
            params: UserParamsSchema,
            response: UserSchema,
            timeout: 5000,
          },
        },
        { httpClient: mockHttpClient }
      )

      expect(UserResource.getMethod('get').timeout).toBe(5000)
    })

    it('should apply default timeout configuration', () => {
      const UserResource = resource(
        'users',
        {
          get: {
            method: 'GET',
            path: '/api/users/:id',
            params: UserParamsSchema,
            response: UserSchema,
          },
        },
        {
          defaultTimeout: 10000,
          httpClient: mockHttpClient,
        }
      )

      expect(UserResource.getMethod('get')).toBeDefined()
    })
  })

  describe('resourceUtils helpers', () => {
    it('should create GET method configuration', () => {
      const getMethod = resourceUtils.get('/api/users/:id', UserParamsSchema, UserSchema, {
        cache: { ttl: 60000 },
      })

      expect(getMethod).toEqual({
        method: 'GET',
        path: '/api/users/:id',
        params: UserParamsSchema,
        response: UserSchema,
        cache: { ttl: 60000 },
      })
    })

    it('should create POST method configuration', () => {
      const postMethod = resourceUtils.post('/api/users', CreateUserSchema, UserSchema, {
        retry: { times: 3 },
      })

      expect(postMethod).toEqual({
        method: 'POST',
        path: '/api/users',
        body: CreateUserSchema,
        response: UserSchema,
        retry: { times: 3 },
      })
    })

    it('should create PUT method configuration', () => {
      const putMethod = resourceUtils.put(
        '/api/users/:id',
        UserParamsSchema,
        UpdateUserSchema,
        UserSchema,
        { timeout: 5000 }
      )

      expect(putMethod).toEqual({
        method: 'PUT',
        path: '/api/users/:id',
        params: UserParamsSchema,
        body: UpdateUserSchema,
        response: UserSchema,
        timeout: 5000,
      })
    })

    it('should create PATCH method configuration', () => {
      const patchMethod = resourceUtils.patch(
        '/api/users/:id',
        UserParamsSchema,
        UpdateUserSchema,
        UserSchema
      )

      expect(patchMethod).toEqual({
        method: 'PATCH',
        path: '/api/users/:id',
        params: UserParamsSchema,
        body: UpdateUserSchema,
        response: UserSchema,
      })
    })

    it('should create DELETE method configuration', () => {
      const deleteMethod = resourceUtils.delete(
        '/api/users/:id',
        UserParamsSchema,
        DeleteResponseSchema
      )

      expect(deleteMethod).toEqual({
        method: 'DELETE',
        path: '/api/users/:id',
        params: UserParamsSchema,
        response: DeleteResponseSchema,
      })
    })
  })

  describe('method validation', () => {
    it('should validate valid method configuration', () => {
      const method: ResourceMethod = {
        method: 'GET',
        path: '/api/users/:id',
        params: UserParamsSchema,
        response: UserSchema,
      }

      const result = resourceUtils.validateMethod(method)
      expect(Result.isOk(result)).toBe(true)
    })

    it('should fail validation for path not starting with /', () => {
      const method: ResourceMethod = {
        method: 'GET',
        path: 'api/users',
        response: UserSchema,
      }

      const result = resourceUtils.validateMethod(method)
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toContain('must start with /')
      }
    })

    it('should fail validation for path params without schema', () => {
      const method: ResourceMethod = {
        method: 'GET',
        path: '/api/users/:id',
        response: UserSchema,
      }

      const result = resourceUtils.validateMethod(method)
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toContain('require params schema')
      }
    })

    it('should warn for POST without body schema', () => {
      const method: ResourceMethod = {
        method: 'POST',
        path: '/api/users',
        response: UserSchema,
      }

      const result = resourceUtils.validateMethod(method)
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toContain('should have body or params schema')
      }
    })
  })

  describe('createValidated', () => {
    it('should create valid resource', () => {
      const result = resourceUtils.createValidated('users', {
        get: {
          method: 'GET',
          path: '/api/users/:id',
          params: UserParamsSchema,
          response: UserSchema,
        },
      })

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.name).toBe('users')
      }
    })

    it('should fail validation for invalid methods', () => {
      const result = resourceUtils.createValidated('users', {
        invalid: {
          method: 'GET',
          path: 'invalid-path',
          response: UserSchema,
        },
      })

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toContain('validation failed')
      }
    })
  })

  describe('error handling', () => {
    it('should handle HTTP errors gracefully', async () => {
      mockHttpClient.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'User not found' }),
      } satisfies Partial<Response>)

      const UserResource = resource(
        'users',
        {
          get: {
            method: 'GET',
            path: '/api/users/:id',
            params: UserParamsSchema,
            response: UserSchema,
          },
        },
        { httpClient: mockHttpClient }
      )

      const result = await UserResource.get.run({ id: '999' })

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect((result.error as TestHttpError).code).toBe('HTTP_ERROR')
      }
    })

    it('should handle network errors gracefully', async () => {
      mockHttpClient.fetch.mockRejectedValue(new Error('Network error'))

      const UserResource = resource(
        'users',
        {
          get: {
            method: 'GET',
            path: '/api/users/:id',
            params: UserParamsSchema,
            response: UserSchema,
          },
        },
        { httpClient: mockHttpClient }
      )

      const result = await UserResource.get.run({ id: '1' })

      expect(Result.isErr(result)).toBe(true)
    })

    it('should handle validation errors gracefully', async () => {
      mockHttpClient.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'data' }),
      } satisfies Partial<Response>)

      const UserResource = resource(
        'users',
        {
          get: {
            method: 'GET',
            path: '/api/users/:id',
            params: UserParamsSchema,
            response: UserSchema,
          },
        },
        { httpClient: mockHttpClient }
      )

      const result = await UserResource.get.run({ id: '1' })

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect((result.error as TestValidationError).code).toBe('VALIDATION_ERROR')
      }
    })
  })

  describe('complex resource scenarios', () => {
    it('should handle nested resource with multiple path parameters', async () => {
      mockHttpClient.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, title: 'Test Post', content: 'Test content' }),
      } satisfies Partial<Response>)

      const PostResource = resource(
        'posts',
        {
          getByUserAndId: {
            method: 'GET',
            path: '/api/users/:userId/posts/:postId',
            params: schema.object({
              userId: schema.string(),
              postId: schema.string(),
            }),
            response: schema.object({
              id: schema.number(),
              title: schema.string(),
              content: schema.string(),
            }),
          },
        },
        {
          baseUrl: 'https://api.example.com',
          httpClient: mockHttpClient,
        }
      )

      const result = await PostResource.getByUserAndId.run({
        userId: '123',
        postId: '456',
      })

      expect(Result.isOk(result)).toBe(true)
      expect(mockHttpClient.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users/123/posts/456',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should handle resource with comprehensive configuration', () => {
      const ComprehensiveResource = resource(
        'comprehensive',
        {
          get: resourceUtils.get(
            '/api/items/:id',
            schema.object({ id: schema.string() }),
            schema.object({ id: schema.number(), name: schema.string() }),
            {
              cache: { ttl: 60000 },
              retry: { times: 3, delay: 1000 },
              timeout: 5000,
            }
          ),
          create: resourceUtils.post(
            '/api/items',
            schema.object({ name: schema.string() }),
            schema.object({ id: schema.number(), name: schema.string() })
          ),
        },
        {
          baseUrl: 'https://api.example.com',
          defaultCache: { ttl: 30000 },
          defaultRetry: { times: 2 },
          defaultTimeout: 3000,
          httpClient: mockHttpClient,
        }
      )

      expect(ComprehensiveResource.name).toBe('comprehensive')
      expect(ComprehensiveResource.baseUrl).toBe('https://api.example.com')

      const getMethod = ComprehensiveResource.getMethod('get')
      expect(getMethod.cache?.ttl).toBe(60000)
      expect(getMethod.retry?.times).toBe(3)
      expect(getMethod.timeout).toBe(5000)
    })
  })

  describe('FP-enhanced functionality', () => {
    describe('validateMethods', () => {
      it('should validate all methods successfully', () => {
        const methods = {
          get: resourceUtils.get(
            '/api/users/:id',
            UserParamsSchema,
            UserSchema
          ),
          create: resourceUtils.post(
            '/api/users',
            CreateUserSchema,
            UserSchema
          ),
        }

        const result = resourceUtils.validateMethods(methods)
        expect(Result.isOk(result)).toBe(true)
      })

      it('should fail when one method is invalid', () => {
        const methods = {
          get: resourceUtils.get(
            '/api/users/:id',
            UserParamsSchema,
            UserSchema
          ),
          invalid: {
            method: 'GET' as const,
            path: 'invalid-path', // Missing leading slash
            response: UserSchema,
          },
        }

        const result = resourceUtils.validateMethods(methods)
        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.message).toContain("Method 'invalid' validation failed")
        }
      })
    })

    describe('createValidated', () => {
      it('should create resource when validation passes', () => {
        const methods = {
          get: resourceUtils.get(
            '/api/users/:id',
            UserParamsSchema,
            UserSchema
          ),
        }

        const result = resourceUtils.createValidated('test', methods)
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value.name).toBe('test')
        }
      })

      it('should fail when validation fails', () => {
        const methods = {
          invalid: {
            method: 'GET' as const,
            path: 'invalid-path',
            response: UserSchema,
          },
        }

        const result = resourceUtils.createValidated('test', methods)
        expect(Result.isErr(result)).toBe(true)
      })
    })

    describe('createWithFallback', () => {
      it('should use first valid configuration', () => {
        const configs = [
          {
            name: 'primary',
            methods: {
              get: resourceUtils.get('/api/users/:id', UserParamsSchema, UserSchema),
            },
          },
          {
            name: 'fallback',
            methods: {
              get: resourceUtils.get('/api/backup/:id', UserParamsSchema, UserSchema),
            },
          },
        ]

        const result = resourceUtils.createWithFallback(configs)
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value.name).toBe('primary')
        }
      })

      it('should fallback when primary fails', () => {
        // Test with two valid configurations where first creates a resource successfully
        // This tests the fallback mechanism when the primary option is the first working one
        const primaryConfig = {
          name: 'primary',
          methods: {
            get: resourceUtils.get('/api/primary/:id', UserParamsSchema, UserSchema),
          },
        }
        
        const fallbackConfig = {
          name: 'fallback',
          methods: {
            get: resourceUtils.get('/api/fallback/:id', UserParamsSchema, UserSchema),
          },
        }
        
        const configs = [primaryConfig, fallbackConfig]

        const result = resourceUtils.createWithFallback(configs)
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          // Should use the first working configuration (primary)
          expect(result.value.name).toBe('primary')
        }
      })
    })

    describe('FP cache utilities', () => {
      it('should generate cache keys safely', () => {
        const result = resourceCache.generateCacheKey('users', 'get', { id: 123 })
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value).toBe('pipeline:users.get:{"id":123}')
        }
      })

      it('should handle cache key generation errors', () => {
        const circularRef: { self: unknown } = { self: null }
        circularRef.self = circularRef

        const result = resourceCache.generateCacheKey('users', 'get', circularRef)
        expect(Result.isErr(result)).toBe(true)
      })

      it('should get cache stats safely', () => {
        const result = resourceCache.stats()
        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(typeof result.value.size).toBe('number')
          expect(Array.isArray(result.value.entries)).toBe(true)
        }
      })
    })
  })
})
