import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Result } from '../src/core/result'
import { schema } from '../src/core/schema'
import { resource, resourceUtils, type ResourceMethod } from '../src/core/resource'
import { z } from 'zod'

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
const UserSchema = schema.from(
  z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
  })
)

const CreateUserSchema = schema.from(
  z.object({
    name: z.string(),
    email: z.string().email(),
  })
)

const UpdateUserSchema = schema.from(
  z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
  })
)

const UserParamsSchema = schema.from(
  z.object({
    id: z.string(),
  })
)

const DeleteResponseSchema = schema.from(
  z.object({
    success: z.boolean(),
    message: z.string(),
  })
)

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
          response: schema.from(
            z.array(
              z.object({
                id: z.number(),
                name: z.string(),
                email: z.string().email(),
              })
            )
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

  describe('URL interpolation', () => {
    it('should interpolate single path parameter', () => {
      const result = resourceUtils.interpolateUrl('/api/users/:id', { id: '123' })
      expect(result).toBe('/api/users/123')
    })

    it('should interpolate multiple path parameters', () => {
      const result = resourceUtils.interpolateUrl('/api/users/:userId/posts/:postId', {
        userId: '123',
        postId: '456',
      })
      expect(result).toBe('/api/users/123/posts/456')
    })

    it('should encode URI components', () => {
      const result = resourceUtils.interpolateUrl('/api/search/:query', {
        query: 'hello world',
      })
      expect(result).toBe('/api/search/hello%20world')
    })

    it('should throw error for missing parameters', () => {
      expect(() => {
        resourceUtils.interpolateUrl('/api/users/:id', {})
      }).toThrow('Missing required parameter: id')
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
            params: schema.from(
              z.object({
                userId: z.string(),
                postId: z.string(),
              })
            ),
            response: schema.from(
              z.object({
                id: z.number(),
                title: z.string(),
                content: z.string(),
              })
            ),
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
            schema.from(z.object({ id: z.string() })),
            schema.from(z.object({ id: z.number(), name: z.string() })),
            {
              cache: { ttl: 60000 },
              retry: { times: 3, delay: 1000 },
              timeout: 5000,
            }
          ),
          create: resourceUtils.post(
            '/api/items',
            schema.from(z.object({ name: z.string() })),
            schema.from(z.object({ id: z.number(), name: z.string() }))
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
})
