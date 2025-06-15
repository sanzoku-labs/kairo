import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import { resource, schema, createError } from '../src'
import type { NetworkError, ValidationError } from '../src'

describe('Contract Testing', () => {
  const UserSchema = schema.from(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
      age: z.number().min(0),
    })
  )

  const CreateUserSchema = schema.from(
    z.object({
      name: z.string(),
      email: z.string().email(),
      age: z.number().min(0),
    })
  )

  const UserAPI = resource('users', {
    get: {
      method: 'GET',
      path: '/users/:id',
      params: schema.from(z.object({ id: z.string() })),
      response: UserSchema,
    },
    create: {
      method: 'POST',
      path: '/users',
      body: CreateUserSchema,
      response: UserSchema,
    },
    list: {
      method: 'GET',
      path: '/users',
      response: schema.array(UserSchema),
    },
  })

  describe('Contract Verification', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
      fetchMock = vi.fn()
      global.fetch = fetchMock
    })

    it('should verify successful API contract', async () => {
      // Mock responses for all three methods
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ id: '123', name: 'John', email: 'john@example.com', age: 30 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ id: '456', name: 'Jane', email: 'jane@example.com', age: 25 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve([
              { id: '123', name: 'John', email: 'john@example.com', age: 30 },
              { id: '456', name: 'Jane', email: 'jane@example.com', age: 25 },
            ]),
        })

      const contract = UserAPI.contract()
      const result = await contract.verify('https://api.example.com', {
        validateResponses: true,
      })

      expect(result.success).toBe(true)
      expect(result.validations.urlExists).toBe(true)
      expect(result.validations.schemaMatches).toBe(true)
      expect(result.validations.methodSupported).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect schema mismatch', async () => {
      // Mock responses - first one has schema mismatch
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ id: 123, name: 'John' }), // Missing required fields
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ id: '456', name: 'Jane', email: 'jane@example.com', age: 25 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
        })

      const contract = UserAPI.contract()
      const result = await contract.verify('https://api.example.com', {
        validateResponses: true,
      })

      expect(result.success).toBe(false)
      expect(result.validations.schemaMatches).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.type === 'schema')).toBe(true)
    })

    it('should detect authentication failures', async () => {
      // All methods return 401
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({ ok: false, status: 401 })

      const contract = UserAPI.contract()
      const result = await contract.verify('https://api.example.com')

      expect(result.success).toBe(false)
      expect(result.validations.authenticationWorks).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.every(e => e.type === 'auth')).toBe(true)
    })

    it('should handle network errors', async () => {
      // All methods fail with network errors
      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))

      const contract = UserAPI.contract()
      const result = await contract.verify('https://api.example.com')

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.every(e => e.type === 'network')).toBe(true)
      expect(result.performance.availability).toBe(0)
    })

    it('should generate test suite', () => {
      const contract = UserAPI.contract()
      const testSuite = contract.generateTests()

      expect(testSuite.name).toBe('users Contract Tests')
      expect(testSuite.tests).toHaveLength(3)
      expect(testSuite.tests[0]).toMatchObject({
        name: 'users.get',
        method: 'GET',
        endpoint: '/users/:id',
      })
      expect(testSuite.tests[1]).toMatchObject({
        name: 'users.create',
        method: 'POST',
        endpoint: '/users',
      })
    })
  })

  describe('Mock Generation', () => {
    it('should create mocked resource with success scenarios', async () => {
      const mockUser = { id: '123', name: 'John Mock', email: 'john@mock.com', age: 25 }

      const mocks = UserAPI.mock({
        get: {
          success: mockUser,
        },
        create: {
          success: { ...mockUser, id: '456' },
        },
      })

      const getResult = await mocks.get.run({ id: '123' })
      expect(getResult.tag).toBe('Ok')
      if (getResult.tag === 'Ok') {
        expect(getResult.value).toEqual(mockUser)
      }

      const createResult = await mocks.create.run({
        name: 'Jane',
        email: 'jane@example.com',
        age: 30,
      })
      expect(createResult.tag).toBe('Ok')
      if (createResult.tag === 'Ok') {
        expect(createResult.value).toEqual({ ...mockUser, id: '456' })
      }
    })

    it('should create mocked resource with failure scenarios', async () => {
      const mocks = UserAPI.mock({
        get: {
          failure: createError<NetworkError>('NETWORK_ERROR', 'User not found', { status: 404 }),
        },
        create: {
          failure: createError<ValidationError>('VALIDATION_ERROR', 'Email already exists'),
        },
      })

      const getResult = await mocks.get.run({ id: '999' })
      expect(getResult.tag).toBe('Err')
      if (getResult.tag === 'Err') {
        expect(getResult.error.message).toBe('User not found')
      }

      const createResult = await mocks.create.run({
        name: 'Jane',
        email: 'existing@example.com',
        age: 30,
      })
      expect(createResult.tag).toBe('Err')
      if (createResult.tag === 'Err') {
        expect(createResult.error.message).toBe('Email already exists')
      }
    })

    it('should handle delay in mock scenarios', async () => {
      const mocks = UserAPI.mock({
        get: {
          success: { id: '123', name: 'John', email: 'john@example.com', age: 30 },
          delay: 100,
        },
      })

      const start = Date.now()
      await mocks.get.run({ id: '123' })
      const duration = Date.now() - start

      expect(duration).toBeGreaterThanOrEqual(100)
    })

    it('should handle probability-based scenarios', async () => {
      const mocks = UserAPI.mock({
        get: {
          success: { id: '123', name: 'John', email: 'john@example.com', age: 30 },
          failure: createError<NetworkError>('NETWORK_ERROR', 'Random failure'),
          probability: 0, // Always fail
        },
      })

      const result = await mocks.get.run({ id: '123' })
      expect(result.tag).toBe('Err')
      if (result.tag === 'Err') {
        expect(result.error.message).toBe('Random failure')
      }
    })

    it('should handle empty mock scenarios', async () => {
      const mocks = UserAPI.mock({})

      const result = await mocks.get.run({ id: '123' })
      expect(result.tag).toBe('Ok')
      if (result.tag === 'Ok') {
        expect(result.value).toBe(null)
      }
    })
  })

  describe('Resource Integration', () => {
    it('should access contract through resource', () => {
      const contract = UserAPI.contract()
      expect(contract).toBeDefined()
      expect(typeof contract.verify).toBe('function')
      expect(typeof contract.generateTests).toBe('function')
      expect(typeof contract.mock).toBe('function')
    })

    it('should support withContract method', () => {
      const contractResource = UserAPI.withContract()
      expect(typeof contractResource.contract).toBe('function')
      expect(contractResource.get).toBeDefined()
      expect(contractResource.create).toBeDefined()
    })

    it('should create mocks directly from resource', () => {
      const scenarios = {
        get: {
          success: { id: '123', name: 'Mock User', email: 'mock@example.com', age: 25 },
        },
      }

      const mocks = UserAPI.mock(scenarios)
      expect(mocks.get).toBeDefined()
      expect(mocks.get.run).toBeDefined()
      expect(mocks.get.scenario).toEqual(scenarios.get)
    })
  })
})
