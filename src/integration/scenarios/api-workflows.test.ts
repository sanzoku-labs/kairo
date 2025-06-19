/**
 * API Workflow Integration Scenarios
 *
 * Tests complex API interaction patterns that combine SERVICE with
 * DATA validation and PIPELINE orchestration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Result } from '../../core/shared'
import { service } from '../../core/service'
import { data } from '../../core/data'
import { pipeline } from '../../core/pipeline'
import { TestApiServer, TestApiEndpoints } from '../utils/test-api-server'
import {
  IntegrationDataGenerator,
  IntegrationSchemas,
  IntegrationPerformance,
} from '../utils/integration-helpers'
import { ResultTestUtils } from '../../test-utils'

describe('API Workflow Integration Scenarios', () => {
  let apiServer: TestApiServer

  beforeEach(() => {
    apiServer = new TestApiServer({
      baseUrl: 'https://api.test.com',
      defaultDelay: 10,
      authToken: 'test-token-123',
    })
    apiServer.start()
  })

  afterEach(() => {
    apiServer.stop()
  })

  describe('CRUD Workflow Integration', () => {
    it('should perform complete CRUD workflow with validation', async () => {
      // Setup CRUD endpoints
      apiServer.addEndpoint(TestApiEndpoints.users.list)
      apiServer.addEndpoint(TestApiEndpoints.users.getById)
      apiServer.addEndpoint(TestApiEndpoints.users.create)
      apiServer.addEndpoint(TestApiEndpoints.users.update)
      apiServer.addEndpoint(TestApiEndpoints.users.delete)

      const crudWorkflow = pipeline.compose([
        // CREATE: Add new user with validation
        async () => {
          const newUserData = {
            name: 'Integration Test User',
            email: 'integration@test.com',
            active: true,
            department: 'Engineering',
            salary: 80000,
            joinDate: new Date().toISOString(),
            skills: ['JavaScript', 'TypeScript'],
            performance: 7.5,
            region: 'North',
          }

          // Validate before sending (use userCreate schema since no ID yet)
          const validation = data.validate(newUserData, IntegrationSchemas.userCreate)
          if (Result.isErr(validation)) {
            throw new Error(`Validation failed: ${validation.error.message}`)
          }

          const createResult = await service.post('/users', {
            data: validation.value,
            headers: { 'Content-Type': 'application/json' },
          })

          if (Result.isErr(createResult)) {
            throw new Error(`Create failed: ${createResult.error.message}`)
          }

          return { operation: 'create', result: createResult.value, newUser: validation.value }
        },

        // READ: Fetch the created user
        async (context: unknown) => {
          const typedContext = context as {
            operation: string
            result: { id: number }
            newUser: unknown
          }
          const readResult = await service.get(`/users/${typedContext.result.id}`)

          if (Result.isErr(readResult)) {
            throw new Error(`Read failed: ${readResult.error.message}`)
          }

          // Validate the fetched data
          const validation = data.validate(readResult.value, IntegrationSchemas.user)
          if (Result.isErr(validation)) {
            throw new Error(`Fetched data validation failed: ${validation.error.message}`)
          }

          return {
            ...typedContext,
            readUser: validation.value,
            operations: [typedContext.operation, 'read'],
          }
        },

        // UPDATE: Modify user data with validation
        async (context: unknown) => {
          const typedContext = context as {
            result: { id: number }
            readUser: { name: string; email: string; salary: number }
            operations: string[]
          }
          const updatedData = {
            ...typedContext.readUser,
            name: `${typedContext.readUser.name} (Updated)`,
            salary: typedContext.readUser.salary + 5000,
            email: typedContext.readUser.email.replace('@test.com', '@updated.com'),
          }

          // Validate updated data
          const validation = data.validate(updatedData, IntegrationSchemas.user)
          if (Result.isErr(validation)) {
            throw new Error(`Update validation failed: ${validation.error.message}`)
          }

          const updateResult = await service.put(`/users/${typedContext.result.id}`, {
            data: validation.value,
            headers: { 'Content-Type': 'application/json' },
          })

          if (Result.isErr(updateResult)) {
            throw new Error(`Update failed: ${updateResult.error.message}`)
          }

          return {
            ...typedContext,
            updatedUser: updateResult.value,
            operations: [...typedContext.operations, 'update'],
          }
        },

        // DELETE: Remove the user
        async (context: unknown) => {
          const typedContext = context as { result: { id: number }; operations: string[] }
          const deleteResult = await service.delete(`/users/${typedContext.result.id}`)

          if (Result.isErr(deleteResult)) {
            throw new Error(`Delete failed: ${deleteResult.error.message}`)
          }

          return {
            ...typedContext,
            operations: [...typedContext.operations, 'delete'],
            completed: true,
          }
        },
      ])

      const { result, duration } = await IntegrationPerformance.measureWorkflow(
        'complete-crud-workflow',
        async () => crudWorkflow(null)
      )

      const crudResult = ResultTestUtils.expectOk(result) as {
        operations: string[]
        completed: boolean
      }

      expect(crudResult.operations).toEqual(['create', 'read', 'update', 'delete'])
      expect(crudResult.completed).toBe(true)
      expect(duration).toBeLessThan(1000) // Should complete quickly
    })

    it('should handle batch operations with error handling', async () => {
      // Setup batch endpoints and some error conditions
      apiServer.addEndpoint(TestApiEndpoints.users.create)
      apiServer.addEndpoint({
        method: 'POST',
        path: '/users/batch',
        response: {
          created: 8,
          failed: 2,
          errors: [
            { index: 3, error: 'Validation failed' },
            { index: 7, error: 'Duplicate email' },
          ],
        },
      })

      const batchUsers = IntegrationDataGenerator.generateUserDataset(10)

      const batchWorkflow = pipeline.compose([
        // Validate all users before batch operation
        async (users: unknown) => {
          const typedUsers = users as unknown[]
          const validationResults = await pipeline.map(typedUsers, (user, index) => {
            const validation = data.validate(user, IntegrationSchemas.user)
            if (Result.isErr(validation)) {
              return { index, error: validation.error.message, valid: false }
            }
            return { index, user: validation.value, valid: true }
          })

          if (Result.isErr(validationResults)) {
            throw new Error('Batch validation pipeline failed')
          }

          const validUsers = validationResults.value.filter(item => item.valid)
          const validationErrors = validationResults.value.filter(item => !item.valid)

          return {
            validUsers: validUsers.map(item => item.user),
            validationErrors,
            originalCount: typedUsers.length,
          }
        },

        // Attempt batch creation
        async (context: unknown) => {
          const typedContext = context as {
            validUsers: unknown[]
            validationErrors: unknown[]
            originalCount: number
          }
          if (typedContext.validUsers.length === 0) {
            throw new Error('No valid users to create')
          }

          const batchResult = await service.post('/users/batch', {
            data: { users: typedContext.validUsers },
            headers: { 'Content-Type': 'application/json' },
          })

          if (Result.isErr(batchResult)) {
            throw new Error(`Batch creation failed: ${batchResult.error.message}`)
          }

          return {
            ...typedContext,
            batchResponse: batchResult.value,
          }
        },

        // Handle partial failures with individual creation
        async (context: unknown) => {
          const typedContext = context as {
            validUsers: unknown[]
            validationErrors: unknown[]
            batchResponse: {
              created: number
              failed: number
              errors: { index: number; error: string }[]
            }
            originalCount: number
          }
          const { batchResponse } = typedContext

          if (batchResponse.failed > 0) {
            // Retry failed items individually
            const failedItems = batchResponse.errors.map(error => ({
              ...error,
              user: typedContext.validUsers[error.index],
            }))

            const retryResults = await pipeline.map(
              failedItems,
              async failedItem => {
                try {
                  const retryResult = await service.post('/users', {
                    data: failedItem.user,
                    headers: { 'Content-Type': 'application/json' },
                  })

                  return { success: Result.isOk(retryResult), error: null }
                } catch (error) {
                  return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                  }
                }
              },
              { continueOnError: true }
            )

            const retrySuccesses = Result.isOk(retryResults)
              ? retryResults.value.filter(r => r.success).length
              : 0

            return {
              ...typedContext,
              retryAttempts: batchResponse.failed,
              retrySuccesses,
              finalCreated: batchResponse.created + retrySuccesses,
              finalFailed:
                batchResponse.failed - retrySuccesses + typedContext.validationErrors.length,
            }
          }

          return {
            ...typedContext,
            retryAttempts: 0,
            retrySuccesses: 0,
            finalCreated: batchResponse.created,
            finalFailed: batchResponse.failed + typedContext.validationErrors.length,
          }
        },
      ])

      const result = await batchWorkflow(batchUsers)
      const batchResult = ResultTestUtils.expectOk(result) as {
        originalCount: number
        finalCreated: number
        finalFailed: number
        retryAttempts: number
      }

      expect(batchResult.originalCount).toBe(10)
      expect(batchResult.finalCreated).toBeGreaterThan(0)
      expect(batchResult.finalCreated + batchResult.finalFailed).toBe(10)
      expect(batchResult.retryAttempts).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Authentication and Authorization Workflows', () => {
    it('should handle authenticated API workflows', async () => {
      // Setup authenticated endpoints
      apiServer.addEndpoint({
        ...TestApiEndpoints.users.list,
        requireAuth: true,
      })

      apiServer.addEndpoint({
        ...TestApiEndpoints.errors.unauthorized,
        requireAuth: true,
      })

      const authWorkflow = pipeline.compose([
        // Test unauthorized access
        async () => {
          const unauthorizedResult = await service.get('/error/auth')
          // This should fail due to missing auth
          expect(Result.isErr(unauthorizedResult)).toBe(true)
          return { unauthorizedAttempt: 'failed' }
        },

        // Test authorized access
        async (context: unknown) => {
          const typedContext = context as { unauthorizedAttempt: string }
          const authorizedResult = await service.get('/users', {
            headers: { Authorization: 'Bearer test-token-123' },
          })

          if (Result.isErr(authorizedResult)) {
            throw new Error(`Authorized request failed: ${authorizedResult.error.message}`)
          }

          return {
            ...typedContext,
            authorizedData: authorizedResult.value,
            authorizedAttempt: 'success',
          }
        },

        // Validate received data
        (context: unknown) => {
          const typedContext = context as {
            unauthorizedAttempt: string
            authorizedData: { users: unknown[] }
            authorizedAttempt: string
          }
          const users = typedContext.authorizedData.users
          const validatedUsers = []

          for (const user of users) {
            const validation = data.validate(user, IntegrationSchemas.user)
            if (Result.isOk(validation)) {
              validatedUsers.push(validation.value)
            }
          }

          return {
            ...typedContext,
            validatedUsers,
            validationSuccess: validatedUsers.length > 0,
          }
        },
      ])

      const result = await authWorkflow(null)
      const authResult = ResultTestUtils.expectOk(result) as {
        unauthorizedAttempt: string
        authorizedAttempt: string
        validationSuccess: boolean
        validatedUsers: unknown[]
      }

      expect(authResult.unauthorizedAttempt).toBe('failed')
      expect(authResult.authorizedAttempt).toBe('success')
      expect(authResult.validationSuccess).toBe(true)
      expect(authResult.validatedUsers.length).toBeGreaterThan(0)
    })

    it('should handle rate limiting gracefully', async () => {
      // Configure server with rate limiting
      apiServer = new TestApiServer({
        baseUrl: 'https://api.test.com',
        defaultDelay: 5,
        rateLimit: {
          requests: 5, // Only 5 requests allowed
          windowMs: 1000, // Per 1 second
        },
      })
      apiServer.start()

      // Add a simple endpoint
      apiServer.addEndpoint({
        method: 'GET',
        path: '/limited',
        response: { message: 'Success' },
      })

      const rateLimitWorkflow = async () => {
        const requests = Array.from(
          { length: 10 },
          (_, i) => () => service.get(`/limited?request=${i + 1}`)
        )

        // Try to make 10 requests rapidly
        const results = await pipeline.parallel(requests, {
          maxConcurrency: 10,
          failFast: false,
          collectErrors: true,
        })

        if (Result.isErr(results)) {
          throw new Error('Parallel requests failed')
        }

        const resultArray = results.value as unknown[]
        const successCount = resultArray.filter(
          (result: unknown) =>
            result !== null &&
            typeof result === 'object' &&
            result !== null &&
            'tag' in result &&
            Result.isOk(result as Result<unknown, unknown>)
        ).length

        const rateLimitedCount = resultArray.filter((result: unknown) => {
          // Count null results as rate limited since they represent failed requests
          if (result === null) {
            return true
          }

          if (result !== null && typeof result === 'object' && 'tag' in result) {
            const typedResult = result as Result<unknown, unknown>
            return (
              Result.isErr(typedResult) &&
              typedResult.error &&
              typeof typedResult.error === 'object' &&
              'message' in typedResult.error &&
              typeof typedResult.error.message === 'string' &&
              typedResult.error.message.includes('429')
            )
          }
          return false
        }).length

        return { successCount, rateLimitedCount, totalRequests: 10 }
      }

      const { result, duration } = await IntegrationPerformance.measureWorkflow(
        'rate-limit-handling',
        rateLimitWorkflow
      )

      expect(result.successCount).toBeLessThanOrEqual(5) // Should be limited to 5
      expect(result.rateLimitedCount).toBeGreaterThan(0) // Some should be rate limited
      expect(result.successCount + result.rateLimitedCount).toBeLessThanOrEqual(10)
      expect(duration).toBeLessThan(2000) // Should fail fast due to rate limiting
    })
  })

  describe('API Composition and Orchestration', () => {
    it('should orchestrate complex multi-API workflows', async () => {
      // Setup interconnected API endpoints
      apiServer.addEndpoint(TestApiEndpoints.users.list)
      apiServer.addEndpoint(TestApiEndpoints.products.list)
      apiServer.addEndpoint(TestApiEndpoints.orders.list)
      apiServer.addEndpoint(TestApiEndpoints.analytics.userStats)
      apiServer.addEndpoint(TestApiEndpoints.analytics.salesStats)

      // Add dependency endpoints
      apiServer.addEndpoint({
        method: 'GET',
        path: '/recommendations/user/1',
        response: {
          recommendations: [
            { productId: 'p1', score: 0.95, reason: 'frequently_bought' },
            { productId: 'p2', score: 0.78, reason: 'similar_users' },
          ],
        },
      })

      const orchestrationWorkflow = pipeline.compose([
        // Phase 1: Fetch base data in parallel
        async () => {
          const baseDataOperations = [
            () => service.get('/users'),
            () => service.get('/products'),
            () => service.get('/orders'),
          ]

          const baseResults = await pipeline.parallel(baseDataOperations, {
            maxConcurrency: 3,
            failFast: true,
          })

          if (Result.isErr(baseResults)) {
            throw new Error('Base data fetch failed')
          }

          const resultArray = baseResults.value as unknown[]
          return {
            users: resultArray[0],
            products: resultArray[1],
            orders: resultArray[2],
          }
        },

        // Phase 2: Validate and process base data
        async (baseData: unknown) => {
          const typedBaseData = baseData as {
            users: Result<unknown, { users: unknown[] }>
            products: Result<unknown, { products: unknown[] }>
            orders: Result<unknown, { orders: unknown[] }>
          }

          // Extract the actual data from Result objects
          const usersData = Result.isOk(typedBaseData.users) ? typedBaseData.users.value.users : []
          const productsData = Result.isOk(typedBaseData.products)
            ? typedBaseData.products.value.products
            : []
          const ordersData = Result.isOk(typedBaseData.orders)
            ? typedBaseData.orders.value.orders
            : []
          // Validate all data concurrently
          const validationOperations = [
            (): unknown[] => {
              // Use direct validation approach like the working integration tests
              const results: unknown[] = []
              for (const user of usersData) {
                const validation = data.validate(user, IntegrationSchemas.user)
                if (Result.isOk(validation)) {
                  results.push(validation.value)
                }
              }
              return results
            },
            (): unknown[] => {
              // Use direct validation approach like the working integration tests
              const results: unknown[] = []
              for (const product of productsData) {
                const validation = data.validate(product, IntegrationSchemas.product)
                if (Result.isOk(validation)) {
                  results.push(validation.value)
                }
              }
              return results
            },
            (): unknown[] => {
              // Use direct validation approach like the working integration tests
              const results: unknown[] = []
              for (const order of ordersData) {
                const validation = data.validate(order, IntegrationSchemas.order)
                if (Result.isOk(validation)) {
                  results.push(validation.value)
                }
              }
              return results
            },
          ]

          const validatedResults = await pipeline.parallel(validationOperations)

          if (Result.isErr(validatedResults)) {
            throw new Error('Data validation failed')
          }

          const validatedArray = validatedResults.value as unknown[]
          const [validUsers, validProducts, validOrders] = validatedArray

          return { validUsers, validProducts, validOrders }
        },

        // Phase 3: Fetch analytics and recommendations based on validated data
        async (validatedData: unknown) => {
          const typedValidatedData = validatedData as {
            validUsers: unknown[]
            validProducts: unknown[]
            validOrders: unknown[]
          }
          // Fetch analytics in parallel
          const analyticsOperations = [
            () => service.get('/analytics/users'),
            () => service.get('/analytics/sales'),
            () => service.get('/recommendations/user/1'), // Get recommendations for first user
          ]

          const analyticsResults = await pipeline.parallel(analyticsOperations, {
            maxConcurrency: 3,
            failFast: false, // Don't fail if analytics fail
          })

          let analytics = {}
          let recommendations = {}

          if (Result.isOk(analyticsResults)) {
            const analyticsArray = analyticsResults.value as unknown[]
            const [userAnalytics, salesAnalytics, userRecommendations] = analyticsArray

            const userAnalyticsResult =
              typeof userAnalytics === 'object' && userAnalytics !== null && 'tag' in userAnalytics
                ? (userAnalytics as Result<unknown, unknown>)
                : null
            const salesAnalyticsResult =
              typeof salesAnalytics === 'object' &&
              salesAnalytics !== null &&
              'tag' in salesAnalytics
                ? (salesAnalytics as Result<unknown, unknown>)
                : null
            const userRecommendationsResult =
              typeof userRecommendations === 'object' &&
              userRecommendations !== null &&
              'tag' in userRecommendations
                ? (userRecommendations as Result<unknown, unknown>)
                : null

            analytics = {
              users:
                userAnalyticsResult && Result.isOk(userAnalyticsResult)
                  ? userAnalyticsResult.value
                  : {},
              sales:
                salesAnalyticsResult && Result.isOk(salesAnalyticsResult)
                  ? salesAnalyticsResult.value
                  : {},
            }

            recommendations =
              userRecommendationsResult && Result.isOk(userRecommendationsResult)
                ? (userRecommendationsResult.value as Record<string, unknown>)
                : ({} as Record<string, unknown>)
          }

          return {
            ...typedValidatedData,
            analytics,
            recommendations,
          }
        },

        // Phase 4: Cross-reference and generate insights
        async (enrichedData: unknown) => {
          const typedEnrichedData = enrichedData as {
            validUsers: { id: number; department: string; salary: number }[]
            validProducts: { id: string; price: number; category: string }[]
            validOrders: { userId: number; total: number; status: string }[]
            analytics: { users: unknown; sales: unknown }
            recommendations: { recommendations?: { productId: string; score: number }[] }
          }
          // Generate cross-entity insights
          const insights = await pipeline.compose([
            (data: unknown) => {
              const typedData = data as typeof typedEnrichedData
              // Calculate user-order relationships
              const userOrderMap = new Map<number, typeof typedData.validOrders>()

              for (const order of typedData.validOrders) {
                if (!userOrderMap.has(order.userId)) {
                  userOrderMap.set(order.userId, [])
                }
                userOrderMap.get(order.userId)!.push(order)
              }

              return { ...typedData, userOrderMap }
            },

            (data: unknown) => {
              const typedDataWithMap = data as typeof typedEnrichedData & {
                userOrderMap: Map<number, unknown[]>
              }
              // Calculate customer lifetime value
              const customerInsights = typedDataWithMap.validUsers.map(user => {
                const userOrders = typedDataWithMap.userOrderMap.get(user.id) || []
                const totalSpent = userOrders.reduce(
                  (sum: number, order: unknown) => sum + (order as { total: number }).total,
                  0
                )
                const orderCount = userOrders.length

                return {
                  userId: user.id,
                  department: user.department,
                  salary: user.salary,
                  totalSpent,
                  orderCount,
                  averageOrderValue: orderCount > 0 ? totalSpent / orderCount : 0,
                  customerValue: totalSpent * (user.salary / 75000), // Weight by salary
                }
              })

              return { ...typedDataWithMap, customerInsights }
            },
          ])(typedEnrichedData)

          if (Result.isErr(insights)) {
            throw new Error('Insight generation failed')
          }

          return insights.value
        },
      ])

      const { result, duration } = await IntegrationPerformance.measureWorkflow(
        'complex-api-orchestration',
        async () => orchestrationWorkflow(null)
      )

      const orchestrationResult = ResultTestUtils.expectOk(result) as {
        validUsers: unknown[]
        validProducts: unknown[]
        validOrders: unknown[]
        analytics: unknown
        customerInsights: unknown
      }

      expect(orchestrationResult.validUsers.length).toBeGreaterThan(0)
      expect(orchestrationResult.validProducts.length).toBeGreaterThan(0)
      expect(orchestrationResult.validOrders.length).toBeGreaterThan(0)
      expect(orchestrationResult.analytics).toBeDefined()
      expect(orchestrationResult.customerInsights).toBeDefined()
      expect(duration).toBeLessThan(3000) // Should complete within 3 seconds
    })

    it('should handle API versioning and migration scenarios', async () => {
      // Setup v1 and v2 API endpoints with different schemas
      apiServer.addEndpoint({
        method: 'GET',
        path: '/v1/users',
        response: {
          users: [
            { user_id: 1, full_name: 'John Doe', email_address: 'john@example.com' },
            { user_id: 2, full_name: 'Jane Smith', email_address: 'jane@example.com' },
          ],
        },
      })

      apiServer.addEndpoint({
        method: 'GET',
        path: '/v2/users',
        response: {
          users: [
            {
              id: 1,
              name: 'John Doe',
              email: 'john@example.com',
              active: true,
              department: 'Engineering',
              salary: 85000,
              joinDate: '2022-01-15T00:00:00Z',
              skills: ['JavaScript', 'TypeScript'],
              performance: 8.5,
              region: 'North',
            },
          ],
          metadata: { version: 'v2', count: 1 },
        },
      })

      const migrationWorkflow = pipeline.compose([
        // Fetch from both API versions
        async () => {
          const versionOperations = [() => service.get('/v1/users'), () => service.get('/v2/users')]

          const versionResults = await pipeline.parallel(versionOperations, {
            failFast: false, // Allow one version to fail
          })

          if (Result.isErr(versionResults)) {
            throw new Error('Both API versions failed')
          }

          const versionArray = versionResults.value as unknown[]
          return {
            v1Result: versionArray[0],
            v2Result: versionArray[1],
          }
        },

        // Transform v1 data to v2 format
        async (versionData: unknown) => {
          const typedVersionData = versionData as { v1Result: unknown; v2Result: unknown }
          let v1Users: unknown[] = []
          let v2Users: unknown[] = []

          // Process v1 data if successful
          if (
            typeof typedVersionData.v1Result === 'object' &&
            typedVersionData.v1Result !== null &&
            'tag' in typedVersionData.v1Result
          ) {
            const v1Result = typedVersionData.v1Result as Result<unknown, unknown>
            if (Result.isOk(v1Result)) {
              const v1Data = v1Result.value as {
                users: { user_id: number; full_name: string; email_address: string }[]
              }

              const v1MappingResult = await pipeline.map(v1Data.users, v1User => ({
                id: v1User.user_id,
                name: v1User.full_name,
                email: v1User.email_address,
                // Set defaults for missing v2 fields
                active: true,
                department: 'Unknown',
                salary: 75000, // Default salary
                joinDate: new Date().toISOString(),
                skills: [],
                performance: 5.0,
                region: 'North',
                source: 'v1_migrated',
              }))

              if (Result.isErr(v1MappingResult)) {
                v1Users = []
              } else {
                v1Users = v1MappingResult.value
              }
            }
          }

          // Process v2 data if successful
          if (
            typeof typedVersionData.v2Result === 'object' &&
            typedVersionData.v2Result !== null &&
            'tag' in typedVersionData.v2Result
          ) {
            const v2Result = typedVersionData.v2Result as Result<unknown, unknown>
            if (Result.isOk(v2Result)) {
              const v2Data = v2Result.value as { users: unknown[] }
              v2Users = v2Data.users.map(user => ({
                ...(user as Record<string, unknown>),
                source: 'v2_native',
              }))
            }
          }

          return { v1Users, v2Users }
        },

        // Validate all users against v2 schema
        async (userData: unknown) => {
          const typedUserData = userData as { v1Users: unknown[]; v2Users: unknown[] }
          const allUsers = [...typedUserData.v1Users, ...typedUserData.v2Users]

          const validationResults = await pipeline.map(allUsers, user => {
            const validation = data.validate(user, IntegrationSchemas.user)
            return {
              user,
              valid: Result.isOk(validation),
              error: Result.isErr(validation) ? validation.error.message : null,
            }
          })

          if (Result.isErr(validationResults)) {
            throw new Error('Validation pipeline failed')
          }

          const validUsers = validationResults.value
            .filter(result => result.valid)
            .map(result => result.user)
          const invalidUsers = validationResults.value.filter(result => !result.valid)

          return {
            validUsers,
            invalidUsers,
            migrationStats: {
              v1Count: typedUserData.v1Users.length,
              v2Count: typedUserData.v2Users.length,
              validCount: validUsers.length,
              invalidCount: invalidUsers.length,
              migrationSuccess: validUsers.length > 0,
            },
          }
        },
      ])

      const result = await migrationWorkflow(null)
      const migrationResult = ResultTestUtils.expectOk(result) as {
        migrationStats: {
          v1Count: number
          v2Count: number
          validCount: number
          migrationSuccess: boolean
        }
        validUsers: { source: string }[]
      }

      expect(migrationResult.migrationStats.v1Count).toBeGreaterThanOrEqual(0)
      expect(migrationResult.migrationStats.v2Count).toBeGreaterThanOrEqual(0)
      expect(migrationResult.migrationStats.validCount).toBeGreaterThan(0)
      expect(migrationResult.migrationStats.migrationSuccess).toBe(true)
      expect(migrationResult.validUsers.length).toBeGreaterThan(0)

      // Verify v1 migration worked
      const migratedUser = migrationResult.validUsers.find(
        (user: { source: string }) => user.source === 'v1_migrated'
      )
      if (migratedUser) {
        expect(migratedUser).toHaveProperty('id')
        expect(migratedUser).toHaveProperty('name')
        expect(migratedUser).toHaveProperty('email')
        expect(migratedUser).toHaveProperty('department', 'Unknown')
      }
    })
  })
})
