/**
 * Basic Integration Tests - Working Examples
 *
 * Simplified integration tests that demonstrate core cross-pillar functionality
 * without complex composition issues.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Result } from '../core/shared'
import { service } from '../core/service'
import { data } from '../core/data'
import { pipeline } from '../core/pipeline'
import { TestApiServer, TestApiEndpoints } from './utils/test-api-server'
import { IntegrationDataGenerator, IntegrationSchemas } from './utils/integration-helpers'
import { ResultTestUtils } from '../test-utils'
import type { TransformMapping } from '../core/data/types'

// Common interfaces used across tests
interface ValidatedUser {
  id: number
  name: string
  email: string
  active: boolean
  department: string
  salary: number
  joinDate: string
  skills: string[]
  performance: number
  region: string
}

describe('Basic Cross-Pillar Integration', () => {
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

  describe('SERVICE + DATA Integration', () => {
    it('should fetch and validate user data', async () => {
      // Setup API endpoint
      apiServer.addEndpoint(TestApiEndpoints.users.list)

      // Fetch data using SERVICE
      const apiResult = await service.get<{ users: unknown[] }>('/users')
      const apiData = ResultTestUtils.expectOk(apiResult)

      expect(apiData.users).toBeDefined()
      expect(Array.isArray(apiData.users)).toBe(true)
      expect(apiData.users.length).toBe(3)

      // Validate first user using DATA
      const firstUser = apiData.users[0]
      const validation = data.validate(firstUser, IntegrationSchemas.user)
      const validUser = ResultTestUtils.expectOk(validation)

      expect(validUser).toHaveProperty('id', 1)
      expect(validUser).toHaveProperty('name', 'John Doe')
      expect(validUser).toHaveProperty('email', 'john@example.com')
      expect(validUser).toHaveProperty('department', 'Engineering')
    })

    it('should transform API data format', async () => {
      // Setup API with old format
      apiServer.addEndpoint({
        method: 'GET',
        path: '/legacy/users',
        response: {
          data: [{ user_id: 1, full_name: 'John Doe', email_addr: 'john@example.com' }],
        },
      })

      const apiResult = await service.get<{ data: unknown[] }>('/legacy/users')
      const rawData = ResultTestUtils.expectOk(apiResult)

      // Transform using DATA methods - transform each item individually
      interface SourceUser {
        user_id: number
        full_name: string
        email_addr: string
      }

      const transformMapping: TransformMapping<SourceUser, ValidatedUser> = {
        id: 'user_id',
        name: 'full_name',
        email: 'email_addr',
        active: () => true,
        department: () => 'Engineering',
        salary: () => 75000,
        joinDate: () => new Date().toISOString(),
        skills: () => ['JavaScript'],
        performance: () => 7.5,
        region: () => 'North',
      }

      // Transform the first item to test
      const firstItem = rawData.data[0] as SourceUser
      const transformedData = data.transform(firstItem, transformMapping)
      const transformed = ResultTestUtils.expectOk(transformedData)

      expect(transformed).toHaveProperty('id', 1)
      expect(transformed).toHaveProperty('name', 'John Doe')
      expect(transformed).toHaveProperty('email', 'john@example.com')

      // Validate transformed data
      const validation = data.validate(transformed, IntegrationSchemas.user)
      ResultTestUtils.expectOk(validation)
    })
  })

  describe('DATA + PIPELINE Integration', () => {
    it('should validate data in pipeline operations', async () => {
      const users = IntegrationDataGenerator.generateUserDataset(5)

      // Process users through pipeline with validation
      const validationResult = await pipeline.map(users, user => {
        const validation = data.validate(user, IntegrationSchemas.user)
        if (Result.isErr(validation)) {
          throw new Error(`Invalid user: ${validation.error.message}`)
        }
        return validation.value
      })

      const validatedUsers = ResultTestUtils.expectOk(validationResult)
      expect(validatedUsers).toHaveLength(5)

      // All users should be valid
      validatedUsers.forEach(user => {
        expect(user).toHaveProperty('id')
        expect(user).toHaveProperty('name')
        expect(user).toHaveProperty('email')
      })
    })

    it('should aggregate validated data', async () => {
      const users = IntegrationDataGenerator.generateUserDataset(10)

      // First validate all users
      const validationResults = await pipeline.map(
        users,
        user => {
          const validation = data.validate(user, IntegrationSchemas.user)
          return Result.isOk(validation) ? validation.value : null
        },
        { continueOnError: true }
      )

      const processedUsers = ResultTestUtils.expectOk(validationResults)
      const validUsers = processedUsers.filter(user => user !== null)

      expect(validUsers.length).toBeGreaterThan(0)

      // Now aggregate the valid users
      const aggregation = data.aggregate(validUsers, {
        groupBy: ['department'],
        avg: ['salary'],
        count: 'id',
      })

      const stats = ResultTestUtils.expectOk(aggregation)
      expect(stats).toBeDefined()
      expect(typeof stats).toBe('object')
    })
  })

  describe('SERVICE + PIPELINE Integration', () => {
    it('should perform parallel API requests', async () => {
      // Setup multiple endpoints
      apiServer.addEndpoint(TestApiEndpoints.users.list)
      apiServer.addEndpoint(TestApiEndpoints.products.list)

      const operations = [
        async () => await service.get('/users'),
        async () => await service.get('/products'),
      ]

      const results = await pipeline.parallel(operations)
      const parallelResults = ResultTestUtils.expectOk(results) as unknown[]

      expect(parallelResults).toHaveLength(2)
      parallelResults.forEach((result: unknown) => {
        if (typeof result === 'object' && result !== null && 'tag' in result) {
          expect(Result.isOk(result as Result<unknown, unknown>)).toBe(true)
        } else {
          expect(result).toBeDefined()
        }
      })
    })

    it('should chain API requests', async () => {
      // Setup user and user-specific data endpoints
      apiServer.addEndpoint(TestApiEndpoints.users.getById)
      apiServer.addEndpoint({
        method: 'GET',
        path: '/users/1/orders',
        response: {
          orders: [{ id: 'o1', total: 299.99, status: 'completed' }],
        },
      })

      // Chain: get user -> get their orders
      const userResult = await service.get('/users/1')
      const userData = ResultTestUtils.expectOk(userResult)
      expect(userData).toHaveProperty('id', 1)

      const ordersResult = await service.get<{
        orders: { id: string; total: number; status: string }[]
      }>('/users/1/orders')
      const ordersData = ResultTestUtils.expectOk(ordersResult)
      expect(ordersData.orders).toHaveLength(1)
      expect(ordersData.orders[0]).toHaveProperty('total', 299.99)
    })
  })

  describe('Three-Pillar Integration', () => {
    it('should perform complete workflow: fetch → validate → process', async () => {
      // Setup API
      apiServer.addEndpoint(TestApiEndpoints.users.list)

      // Step 1: Fetch data (SERVICE)
      const apiResult = await service.get<{ users: unknown[] }>('/users')
      const apiData = ResultTestUtils.expectOk(apiResult)

      // Step 2: Validate data (DATA)
      interface ValidatedUser {
        id: number
        name: string
        email: string
        active: boolean
        department: string
        salary: number
        joinDate: string
        skills: string[]
        performance: number
        region: string
      }

      const validUsers: ValidatedUser[] = []
      for (const user of apiData.users) {
        const validation = data.validate(user, IntegrationSchemas.user)
        if (Result.isOk(validation)) {
          validUsers.push(validation.value as ValidatedUser)
        }
      }

      expect(validUsers.length).toBe(3) // All test users should be valid

      // Step 3: Process data (PIPELINE)
      const activeUsersResult = await pipeline.filter(
        validUsers,
        (user: ValidatedUser) => user.active
      )
      const activeUsers = ResultTestUtils.expectOk(activeUsersResult)

      expect(activeUsers.length).toBe(2) // 2 active users in test data

      // Step 4: Aggregate results (DATA)
      const analytics = data.aggregate(activeUsers, {
        groupBy: ['department'],
        avg: ['salary'],
        count: 'id',
      })

      const stats = ResultTestUtils.expectOk(analytics)
      expect(stats).toBeDefined()
      expect(typeof stats).toBe('object')
    })

    it('should handle errors gracefully across pillars', async () => {
      // Setup error endpoint
      apiServer.addEndpoint(TestApiEndpoints.errors.serverError)

      // SERVICE error should be handled
      const errorResult = await service.get('/error/server')
      expect(Result.isErr(errorResult)).toBe(true)

      // But we can still work with valid local data
      const validUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        active: true,
        department: 'Engineering',
        salary: 75000,
        joinDate: new Date().toISOString(),
        skills: ['JavaScript'],
        performance: 7.5,
        region: 'North',
      }

      // DATA validation should work
      const validation = data.validate(validUser, IntegrationSchemas.user)
      const validatedUser = ResultTestUtils.expectOk(validation)

      // PIPELINE processing should work
      const processingResult = await pipeline.map(
        [validatedUser],
        (user: typeof validatedUser) => ({
          ...user,
          salaryCategory: (user as ValidatedUser).salary > 70000 ? 'high' : 'medium',
        })
      )

      const processedUsers = ResultTestUtils.expectOk(processingResult)
      expect(processedUsers[0]).toHaveProperty('salaryCategory', 'high')
    })
  })

  describe('Performance Integration', () => {
    it('should handle reasonable dataset sizes efficiently', async () => {
      const users = IntegrationDataGenerator.generateUserDataset(50)

      const startTime = performance.now()

      // Process through all pillars
      const validationResults = await pipeline.map(
        users,
        user => {
          const validation = data.validate(user, IntegrationSchemas.user)
          return Result.isOk(validation) ? validation.value : null
        },
        { continueOnError: true, parallel: true }
      )

      const validUsers = ResultTestUtils.expectOk(validationResults)
      const cleanUsers = validUsers.filter(user => user !== null)

      const aggregation = data.aggregate(cleanUsers, {
        groupBy: ['department'],
        avg: ['salary', 'performance'],
        count: 'id',
      })

      const endTime = performance.now()

      ResultTestUtils.expectOk(aggregation)
      expect(cleanUsers.length).toBe(50) // All generated users should be valid
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle concurrent operations efficiently', async () => {
      // Setup multiple fast endpoints
      for (let i = 1; i <= 5; i++) {
        apiServer.addEndpoint({
          method: 'GET',
          path: `/data/${i}`,
          response: { id: i, data: `response${i}` },
          delay: 20, // 20ms delay each
        })
      }

      const startTime = performance.now()

      const operations = Array.from(
        { length: 5 },
        (_, i) => async () => await service.get(`/data/${i + 1}`)
      )

      const results = await pipeline.parallel(operations)
      const endTime = performance.now()

      const parallelResults = ResultTestUtils.expectOk(results) as unknown[]
      expect(parallelResults).toHaveLength(5)

      // All requests should succeed
      parallelResults.forEach((result: unknown) => {
        if (typeof result === 'object' && result !== null && 'tag' in result) {
          expect(Result.isOk(result as Result<unknown, unknown>)).toBe(true)
        } else {
          expect(result).toBeDefined()
        }
      })

      // Should complete much faster than sequential (< 100ms vs 100ms+)
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('Real-World Patterns', () => {
    it('should support common business workflow pattern', async () => {
      // Simulate: fetch users, filter active, calculate metrics
      const users = IntegrationDataGenerator.generateUserDataset(20)

      // Step 1: Validate all users
      const validUsers: ValidatedUser[] = []
      for (const user of users) {
        const validation = data.validate(user, IntegrationSchemas.user)
        if (Result.isOk(validation)) {
          validUsers.push(validation.value as ValidatedUser)
        }
      }

      // Step 2: Filter active users
      const activeUsersResult = await pipeline.filter(
        validUsers,
        (user: ValidatedUser) => user.active
      )
      const activeUsers = ResultTestUtils.expectOk(activeUsersResult)

      // Step 3: Calculate business metrics
      const metrics = data.aggregate(activeUsers, {
        groupBy: ['department'],
        avg: ['salary', 'performance'],
        sum: ['salary'],
        count: 'id',
      })

      const businessMetrics = ResultTestUtils.expectOk(metrics)

      // Should have meaningful business data
      expect(Object.keys(businessMetrics).length).toBeGreaterThan(0)
      expect(activeUsers.length).toBeGreaterThan(0)
      expect(activeUsers.length).toBeLessThanOrEqual(20)
    })

    it('should support data transformation and enrichment pattern', async () => {
      // Start with simple data
      const simpleUsers = [
        { id: 1, name: 'John', email: 'john@test.com' },
        { id: 2, name: 'Jane', email: 'jane@test.com' },
      ]

      // Step 1: Enrich with required fields
      interface SimpleUser {
        id: number
        name: string
        email: string
      }

      const enrichMapping: TransformMapping<SimpleUser, ValidatedUser> = {
        id: 'id',
        name: 'name',
        email: 'email',
        active: () => true,
        department: (item: SimpleUser) => (item.name.startsWith('J') ? 'Engineering' : 'Sales'),
        salary: () => Math.floor(Math.random() * 30000) + 70000,
        joinDate: () => new Date().toISOString(),
        skills: (item: SimpleUser) => [item.name.includes('John') ? 'JavaScript' : 'Python'],
        performance: () => Math.random() * 3 + 7,
        region: () => 'North',
      }

      // Transform each user individually since we have an array
      const enrichedResults = await pipeline.map(simpleUsers, (user: unknown) => {
        const typedUser = user as SimpleUser
        return data.transform(typedUser, enrichMapping)
      })

      const enrichedMapped = ResultTestUtils.expectOk(enrichedResults)
      const enrichedUsers = enrichedMapped.map(result => ResultTestUtils.expectOk(result))

      // Step 2: Validate enriched data
      const validationResults = await pipeline.map(enrichedUsers, (user: ValidatedUser) => {
        return data.validate(user, IntegrationSchemas.user)
      })

      const validatedResults = ResultTestUtils.expectOk(validationResults)

      // All should be valid now
      validatedResults.forEach((validation: unknown) => {
        if (typeof validation === 'object' && validation !== null && 'tag' in validation) {
          expect(Result.isOk(validation as Result<unknown, unknown>)).toBe(true)
        }
      })

      // Step 3: Process for analytics
      const validUserData = validatedResults
        .filter((v: unknown) => {
          if (typeof v === 'object' && v !== null && 'tag' in v) {
            return Result.isOk(v as Result<unknown, unknown>)
          }
          return false
        })
        .map((v: unknown) => {
          if (typeof v === 'object' && v !== null && 'value' in v) {
            return (v as { value: ValidatedUser }).value
          }
          return v
        })
      const analytics = data.aggregate(validUserData, {
        groupBy: ['department'],
        count: 'id',
      })

      ResultTestUtils.expectOk(analytics)
    })
  })
})
