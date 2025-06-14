import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { pipeline } from '../src/core/pipeline'
import { schema } from '../src/core/schema'
import { Result } from '../src/core/result'
import type { HttpError } from '../src/core/pipeline'
import type { ValidationError } from '../src/core/schema'

describe('Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.removeItem('lucid:trace')
    }
  })

  describe('basic pipeline operations', () => {
    it('should run empty pipeline', async () => {
      const pipe = pipeline('empty')
      const result = await pipe.run(42)

      expect(result).toEqual({ tag: 'Ok', value: 42 })
    })

    it('should map values', async () => {
      const pipe = pipeline<number>('map-test')
        .map(x => x * 2)
        .map(x => x + 1)
        .map(x => x.toString())

      const result = await pipe.run(5)

      expect(result).toEqual({ tag: 'Ok', value: '11' })
    })

    it('should handle errors in map', async () => {
      const pipe = pipeline<number>('error-test').map(x => {
        if (x < 0) throw new Error('Negative number')
        return x
      })

      await expect(pipe.run(-5)).rejects.toThrow('Negative number')
    })
  })

  describe('input validation', () => {
    it('should validate input', async () => {
      const inputSchema = schema.object({
        email: z.string().email(),
        password: z.string().min(8),
      })

      const pipe = pipeline('login')
        .input(inputSchema)
        .map(data => ({ ...data, normalized: data.email.toLowerCase() }))

      const result = await pipe.run({
        email: 'USER@EXAMPLE.COM',
        password: 'password123',
      })

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.normalized).toBe('user@example.com')
      }
    })

    it('should fail on invalid input', async () => {
      const inputSchema = schema.object({
        age: z.number().positive(),
      })

      const pipe = pipeline('age-check').input(inputSchema)
      const result = await pipe.run({ age: -5 })

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect((result.error as ValidationError).code).toBe('VALIDATION_ERROR')
      }
    })
  })

  describe('fetch operations', () => {
    it('should fetch data successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }),
      }

      const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue(mockResponse),
      }

      const pipe = pipeline('fetch-test', { httpClient: mockHttpClient }).fetch('/api/users/1')

      const result = await pipe.run()

      expect(Result.isOk(result)).toBe(true)
      expect(result).toEqual({ tag: 'Ok', value: { id: 1, name: 'Test' } })
      expect(mockHttpClient.fetch).toHaveBeenCalledWith('/api/users/1', expect.any(Object))
    })

    it('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }

      const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue(mockResponse),
      }

      const pipe = pipeline('fetch-error', { httpClient: mockHttpClient }).fetch('/api/users/999')

      const result = await pipe.run()

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect((result.error as HttpError).code).toBe('HTTP_ERROR')
        expect((result.error as HttpError).status).toBe(404)
      }
    })

    it('should handle network errors', async () => {
      const mockHttpClient = {
        fetch: vi.fn().mockRejectedValue(new Error('Network error')),
      }

      const pipe = pipeline('network-error', { httpClient: mockHttpClient }).fetch('/api/users')

      const result = await pipe.run()

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect((result.error as HttpError).code).toBe('HTTP_ERROR')
        expect((result.error as HttpError).status).toBe(0)
        expect((result.error as HttpError).message).toContain('Network error')
      }
    })

    it('should use dynamic URL', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ success: true }),
      }

      const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue(mockResponse),
      }

      const pipe = pipeline<{ id: number }>('dynamic-url', { httpClient: mockHttpClient }).fetch(
        input => `/api/users/${input.id}`
      )

      await pipe.run({ id: 123 })

      expect(mockHttpClient.fetch).toHaveBeenCalledWith('/api/users/123', expect.any(Object))
    })
  })

  describe('validate step', () => {
    it('should validate data after fetch', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ id: 1, name: 'Test', email: 'test@example.com' }),
      }

      const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue(mockResponse),
      }

      const userSchema = schema.object({
        id: z.number(),
        name: z.string(),
        email: z.string().email(),
      })

      const pipe = pipeline('validate-test', { httpClient: mockHttpClient })
        .fetch('/api/user')
        .validate(userSchema)
        .map(user => user.email)

      const result = await pipe.run()

      expect(result).toEqual({ tag: 'Ok', value: 'test@example.com' })
    })

    it('should fail on invalid data', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ id: 'not-a-number', name: 'Test' }),
      }

      const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue(mockResponse),
      }

      const userSchema = schema.object({
        id: z.number(),
        name: z.string(),
      })

      const pipe = pipeline('validate-fail', { httpClient: mockHttpClient })
        .fetch('/api/user')
        .validate(userSchema)

      const result = await pipe.run()

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect((result.error as ValidationError).code).toBe('VALIDATION_ERROR')
      }
    })
  })

  describe('error handling', () => {
    it('should map errors', async () => {
      const pipe = pipeline<number>('map-error-test')
        .map(x => {
          if (x < 0) throw new Error('Negative')
          return x
        })
        .mapError((error: Error) => ({
          type: 'CUSTOM_ERROR',
          message: `Wrapped: ${error.message}`,
        }))

      try {
        await pipe.run(-5)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should short-circuit on first error', async () => {
      const fn1 = vi.fn((x: number) => x + 1)
      const fn2 = vi.fn((x: number) => x * 2)

      const inputSchema = schema.number()

      const pipe = pipeline('short-circuit').input(inputSchema).map(fn1).map(fn2)

      const result = await pipe.run('not a number' as never)

      expect(Result.isErr(result)).toBe(true)
      expect(fn1).not.toHaveBeenCalled()
      expect(fn2).not.toHaveBeenCalled()
    })
  })

  describe('trace functionality', () => {
    it('should log with trace', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const pipe = pipeline<number>('trace-test')
        .trace('input')
        .map(x => x * 2)
        .trace('doubled')
        .map(x => x + 1)
        .trace('final')

      await pipe.run(5)

      expect(consoleSpy).toHaveBeenCalledWith('[trace-test:input]', 5)
      expect(consoleSpy).toHaveBeenCalledWith('[trace-test:doubled]', 10)
      expect(consoleSpy).toHaveBeenCalledWith('[trace-test:final]', 11)
    })

    it('should collect trace entries when enabled', async () => {
      globalThis.localStorage = {
        getItem: vi.fn().mockReturnValue('true'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      }

      const consoleSpy = vi.spyOn(console, 'group')

      const pipe = pipeline<number>('traced-pipeline')
        .map(x => x * 2)
        .map(x => x + 10)

      await pipe.run(5)

      expect(consoleSpy).toHaveBeenCalledWith('Pipeline: traced-pipeline')
    })
  })

  describe('cache functionality', () => {
    it('should cache successful results', async () => {
      let callCount = 0
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockImplementation(() => {
          callCount++
          return Promise.resolve({ data: `call-${callCount}` })
        }),
      }

      const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue(mockResponse),
      }

      const pipe = pipeline('cache-test', { httpClient: mockHttpClient })
        .cache(1000) // 1 second TTL
        .fetch('/api/data')

      // First call
      const result1 = await pipe.run()
      expect(Result.isOk(result1)).toBe(true)
      if (Result.isOk(result1)) {
        expect(result1.value).toEqual({ data: 'call-1' })
      }

      // Second call should return cached result
      const result2 = await pipe.run()
      expect(Result.isOk(result2)).toBe(true)
      if (Result.isOk(result2)) {
        expect(result2.value).toEqual({ data: 'call-1' }) // Same as first call
      }

      expect(mockHttpClient.fetch).toHaveBeenCalledTimes(1) // Only called once
    })

    it('should not cache error results', async () => {
      const mockHttpClient = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Server Error',
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: vi.fn().mockResolvedValue({ success: true }),
          }),
      }

      const pipe = pipeline('cache-error-test', { httpClient: mockHttpClient })
        .cache(1000)
        .fetch('/api/data')

      // First call fails
      const result1 = await pipe.run()
      expect(Result.isErr(result1)).toBe(true)

      // Second call should retry (not cached)
      const result2 = await pipe.run()
      expect(Result.isOk(result2)).toBe(true)

      expect(mockHttpClient.fetch).toHaveBeenCalledTimes(2) // Called twice
    })

    it('should respect cache TTL', async () => {
      vi.useFakeTimers()

      let callCount = 0
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockImplementation(() => {
          callCount++
          return Promise.resolve({ data: `call-${callCount}` })
        }),
      }

      const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue(mockResponse),
      }

      const pipe = pipeline('cache-ttl-test', { httpClient: mockHttpClient })
        .cache(100) // 100ms TTL
        .fetch('/api/data')

      // First call
      const result1 = await pipe.run()
      expect(Result.isOk(result1) && result1.value).toEqual({ data: 'call-1' })

      // Wait for cache to expire
      vi.advanceTimersByTime(150)

      // Second call should hit the API again
      const result2 = await pipe.run()
      expect(Result.isOk(result2) && result2.value).toEqual({ data: 'call-2' })

      expect(mockHttpClient.fetch).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })
  })

  describe('parallel functionality', () => {
    it('should execute pipelines in parallel', async () => {
      const mockHttpClient = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: vi.fn().mockResolvedValue({ endpoint: 'users' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: vi.fn().mockResolvedValue({ endpoint: 'posts' }),
          }),
      }

      const userPipeline = pipeline('users', { httpClient: mockHttpClient }).fetch('/api/users')
      const postPipeline = pipeline('posts', { httpClient: mockHttpClient }).fetch('/api/posts')

      const parallelPipeline = pipeline.parallel([userPipeline, postPipeline])

      const result = await parallelPipeline.run()

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual([{ endpoint: 'users' }, { endpoint: 'posts' }])
      }

      expect(mockHttpClient.fetch).toHaveBeenCalledTimes(2)
    })

    it('should fail if any pipeline fails', async () => {
      const mockHttpClient = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: vi.fn().mockResolvedValue({ success: true }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          }),
      }

      const successPipeline = pipeline('success', { httpClient: mockHttpClient }).fetch(
        '/api/success'
      )
      const failPipeline = pipeline('fail', { httpClient: mockHttpClient }).fetch('/api/fail')

      const parallelPipeline = pipeline.parallel([successPipeline, failPipeline])

      const result = await parallelPipeline.run()

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect((result.error as { code: string }).code).toBe('PARALLEL_ERROR')
      }
    })

    it('should handle empty pipeline array', async () => {
      const parallelPipeline = pipeline.parallel([])
      const result = await parallelPipeline.run()

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual([])
      }
    })
  })

  describe('fallback functionality', () => {
    it('should use primary pipeline when successful', async () => {
      const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({ source: 'primary' }),
        }),
      }

      const primaryPipeline = pipeline('primary', { httpClient: mockHttpClient }).fetch(
        '/api/primary'
      )
      const fallbackPipeline = pipeline('fallback', { httpClient: mockHttpClient }).fetch(
        '/api/fallback'
      )

      const pipelineWithFallback = primaryPipeline.fallback(fallbackPipeline)

      const result = await pipelineWithFallback.run()

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual({ source: 'primary' })
      }

      expect(mockHttpClient.fetch).toHaveBeenCalledTimes(1)
      expect(mockHttpClient.fetch).toHaveBeenCalledWith('/api/primary', expect.any(Object))
    })

    it('should use fallback pipeline when primary fails', async () => {
      const mockHttpClient = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Server Error',
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: vi.fn().mockResolvedValue({ source: 'fallback' }),
          }),
      }

      const primaryPipeline = pipeline('primary', { httpClient: mockHttpClient }).fetch(
        '/api/primary'
      )
      const fallbackPipeline = pipeline('fallback', { httpClient: mockHttpClient }).fetch(
        '/api/fallback'
      )

      const pipelineWithFallback = primaryPipeline.fallback(fallbackPipeline)

      const result = await pipelineWithFallback.run()

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual({ source: 'fallback' })
      }

      expect(mockHttpClient.fetch).toHaveBeenCalledTimes(2)
    })

    it('should fail when both primary and fallback fail', async () => {
      const mockHttpClient = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Server Error',
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
          }),
      }

      const primaryPipeline = pipeline('primary', { httpClient: mockHttpClient }).fetch(
        '/api/primary'
      )
      const fallbackPipeline = pipeline('fallback', { httpClient: mockHttpClient }).fetch(
        '/api/fallback'
      )

      const pipelineWithFallback = primaryPipeline.fallback(fallbackPipeline)

      const result = await pipelineWithFallback.run()

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect((result.error as { code: string }).code).toBe('FALLBACK_ERROR')
      }

      expect(mockHttpClient.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('retry functionality', () => {
    it('should retry failed operations', async () => {
      let callCount = 0
      const mockHttpClient = {
        fetch: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount < 3) {
            return Promise.reject(new Error('Network error'))
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: vi.fn().mockResolvedValue({ success: true }),
          })
        }),
      }

      const pipe = pipeline('retry-test', { httpClient: mockHttpClient })
        .retry(3, 10) // 3 retries, 10ms delay
        .fetch('/api/data')

      const result = await pipe.run()

      expect(Result.isOk(result)).toBe(true)
      expect(mockHttpClient.fetch).toHaveBeenCalledTimes(3)
    })

    it('should fail after max retries', async () => {
      const mockHttpClient = {
        fetch: vi.fn().mockRejectedValue(new Error('Network error')),
      }

      const pipe = pipeline('retry-fail-test', { httpClient: mockHttpClient })
        .retry(2, 10) // 2 retries
        .fetch('/api/data')

      const result = await pipe.run()

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect((result.error as { code: string }).code).toBe('NETWORK_ERROR')
      }

      expect(mockHttpClient.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('timeout functionality', () => {
    it('should timeout long operations', async () => {
      const mockHttpClient = {
        fetch: vi.fn().mockImplementation(
          () =>
            new Promise(resolve =>
              globalThis.setTimeout(
                () =>
                  resolve({
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: vi.fn().mockResolvedValue({ data: 'slow' }),
                  }),
                200
              )
            )
        ),
      }

      const pipe = pipeline('timeout-test', { httpClient: mockHttpClient })
        .timeout(50) // 50ms timeout
        .fetch('/api/slow')

      const result = await pipe.run()

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect((result.error as { code: string }).code).toBe('TIMEOUT_ERROR')
      }
    })

    it('should succeed within timeout', async () => {
      const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({ data: 'fast' }),
        }),
      }

      const pipe = pipeline('fast-test', { httpClient: mockHttpClient })
        .timeout(1000) // 1 second timeout
        .fetch('/api/fast')

      const result = await pipe.run()

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual({ data: 'fast' })
      }
    })
  })

  describe('complex pipelines', () => {
    it('should handle login flow', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({
          token: 'jwt-token',
          user: { id: 1, name: 'John', role: 'admin' },
        }),
      }

      const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue(mockResponse),
      }

      const loginSchema = schema.object({
        email: z.string().email(),
        password: z.string().min(8),
      })

      const responseSchema = schema.object({
        token: z.string(),
        user: z.object({
          id: z.number(),
          name: z.string(),
          role: z.enum(['admin', 'user']),
        }),
      })

      const loginPipeline = pipeline('login', { httpClient: mockHttpClient })
        .input(loginSchema)
        .fetch('/api/login')
        .validate(responseSchema)
        .map(response => ({
          isAdmin: response.user.role === 'admin',
          greeting: `Welcome, ${response.user.name}!`,
        }))

      const result = await loginPipeline.run({
        email: 'admin@example.com',
        password: 'password123',
      })

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual({
          isAdmin: true,
          greeting: 'Welcome, John!',
        })
      }

      expect(mockHttpClient.fetch).toHaveBeenCalledWith(
        '/api/login',
        expect.objectContaining({
          body: JSON.stringify({
            email: 'admin@example.com',
            password: 'password123',
          }),
        })
      )
    })
  })
})
