/**
 * Schema Integration Scenarios
 *
 * Tests the comprehensive integration of the native schema system
 * across all three pillars, focusing on validation, transformation,
 * and error handling in complex workflows.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Result } from '../../core/shared'
import { nativeSchema } from '../../core/shared/schema'
import { service } from '../../core/service'
import { data } from '../../core/data'
import { pipeline } from '../../core/pipeline'
import { TestApiServer } from '../utils/test-api-server'
import { ResultTestUtils } from '../../test-utils'
import type { 
  User, 
  TransformedUser, 
  MigratedUser,
  SchemaValidationResult,
  SchemaErrorResult,
  SchemaTransformResult,
  SchemaMigrationResult,
  SchemaContractResult,
} from '../types/test-result-types'

describe('Schema Integration Scenarios', () => {
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

  describe('API Response Validation', () => {
    it('should validate complex API responses with nested schemas', async () => {
      // Complex API response schema
      const ApiResponseSchema = nativeSchema.object({
        status: nativeSchema.literal('success'),
        data: nativeSchema.object({
          users: nativeSchema.array(
            nativeSchema.object({
              id: nativeSchema.number().integer().positive(),
              profile: nativeSchema.object({
                name: nativeSchema.string().min(1).max(100),
                email: nativeSchema.string().email(),
                age: nativeSchema.number().integer().min(18).max(120).optional(),
                preferences: nativeSchema.object({
                  theme: nativeSchema.enum(['light', 'dark']).default('light'),
                  notifications: nativeSchema.boolean().default(true),
                  language: nativeSchema.string().default('en'),
                }).optional(),
              }),
              metadata: nativeSchema.object({
                createdAt: nativeSchema.string(), // ISO date string
                lastLogin: nativeSchema.string().optional(),
                permissions: nativeSchema.array(nativeSchema.string()).default([]),
              }),
            })
          ),
          pagination: nativeSchema.object({
            page: nativeSchema.number().integer().positive(),
            limit: nativeSchema.number().integer().positive(),
            total: nativeSchema.number().integer().min(0),
            hasMore: nativeSchema.boolean(),
          }),
        }),
        version: nativeSchema.string().regex(/^\d+\.\d+\.\d+$/),
      })

      // Setup API endpoint with complex response
      apiServer.addEndpoint({
        method: 'GET',
        path: '/api/users',
        response: {
          status: 'success',
          data: {
            users: [
              {
                id: 1,
                profile: {
                  name: 'John Doe',
                  email: 'john@example.com',
                  age: 30,
                  preferences: {
                    theme: 'dark',
                    notifications: false,
                    language: 'en',
                  },
                },
                metadata: {
                  createdAt: '2023-01-01T00:00:00Z',
                  lastLogin: '2023-12-01T10:30:00Z',
                  permissions: ['read', 'write'],
                },
              },
              {
                id: 2,
                profile: {
                  name: 'Jane Smith',
                  email: 'jane@example.com',
                  // age is optional
                },
                metadata: {
                  createdAt: '2023-01-02T00:00:00Z',
                  permissions: ['read'],
                },
              },
            ],
            pagination: {
              page: 1,
              limit: 10,
              total: 2,
              hasMore: false,
            },
          },
          version: '1.0.0',
        },
      })

      const apiValidationPipeline = pipeline.compose([
        // Fetch API response
        async () => {
          const result = await service.get('/api/users')
          if (Result.isErr(result)) {
            throw new Error(`API fetch failed: ${result.error.message}`)
          }
          return result.value
        },

        // Validate entire response
        (response: unknown) => {
          const validation = data.validate(response, ApiResponseSchema)
          if (Result.isErr(validation)) {
            throw new Error(`Response validation failed: ${validation.error.message}`)
          }
          return validation.value
        },

        // Extract and further validate user data
        async (validatedResponse: unknown) => {
          const typedResponse = validatedResponse as {
            data: { users: unknown[] }
          }
          
          const userValidations = await pipeline.map(
            typedResponse.data.users,
            (user: unknown) => {
              // Additional custom validation
              const customValidation = nativeSchema.object({
                id: nativeSchema.number().refine(id => id > 0, 'ID must be positive'),
                profile: nativeSchema.object({
                  name: nativeSchema.string().refine(
                    name => name.trim().length >= 2,
                    'Name must be at least 2 characters after trimming'
                  ),
                  email: nativeSchema.string().refine(
                    email => email.includes('@') && email.includes('.'),
                    'Email must contain @ and .'
                  ),
                }),
              })
              
              return data.validate(user, customValidation)
            }
          )
          
          if (Result.isErr(userValidations)) {
            throw new Error('User validation pipeline failed')
          }
          
          const validUsers = userValidations.value
            .filter((r: Result<unknown, unknown>) => Result.isOk(r))
            .map((r: Result<unknown, unknown>) => (r as { value: unknown }).value)
          
          return {
            totalUsers: typedResponse.data.users.length,
            validUsers: validUsers.length,
            users: validUsers,
          }
        },
      ])

      const result = await apiValidationPipeline(null)
      const validationResult = ResultTestUtils.expectOk(result) as SchemaValidationResult<User>
      
      expect(validationResult.totalUsers).toBe(2)
      expect(validationResult.validUsers).toBe(2)
      expect(validationResult.users).toHaveLength(2)
    })

    it('should handle schema validation errors gracefully', async () => {
      // Schema for expected data
      const StrictUserSchema = nativeSchema.object({
        id: nativeSchema.number().integer().positive(),
        name: nativeSchema.string().min(3).max(50),
        email: nativeSchema.string().email(),
        age: nativeSchema.number().integer().min(18).max(100),
        status: nativeSchema.enum(['active', 'inactive']),
      })

      // Setup API with invalid data
      apiServer.addEndpoint({
        method: 'GET',
        path: '/api/invalid-users',
        response: {
          users: [
            {
              id: 1,
              name: 'John Doe',
              email: 'john@example.com',
              age: 25,
              status: 'active',
            },
            {
              id: 'invalid', // Invalid ID
              name: 'X', // Too short
              email: 'invalid-email', // Invalid email
              age: 15, // Too young
              status: 'unknown', // Invalid status
            },
            {
              id: 3,
              name: 'Jane Smith',
              email: 'jane@example.com',
              age: 30,
              status: 'inactive',
            },
          ],
        },
      })

      const errorHandlingPipeline = pipeline.compose([
        // Fetch data
        async () => {
          const result = await service.get<{ users: unknown[] }>('/api/invalid-users')
          if (Result.isErr(result)) {
            throw new Error('API fetch failed')
          }
          return result.value.users
        },

        // Validate with error collection
        async (users: unknown) => {
          const typedUsers = users as unknown[]
          
          const validationResults = await pipeline.map(
            typedUsers,
            (user: unknown, index: number) => {
              const validation = data.validate(user, StrictUserSchema)
              
              if (Result.isErr(validation)) {
                return {
                  index,
                  user,
                  valid: false,
                  errors: (validation.error as { issues?: unknown[] }).issues || [],
                  errorMessage: validation.error.message,
                }
              }
              
              return {
                index,
                user: validation.value,
                valid: true,
                errors: [],
                errorMessage: null,
              }
            },
            { continueOnError: true }
          )
          
          if (Result.isErr(validationResults)) {
            throw new Error('Validation pipeline failed')
          }
          
          const results = validationResults.value
          
          return {
            totalUsers: typedUsers.length,
            validUsers: results.filter(r => r.valid),
            invalidUsers: results.filter(r => !r.valid),
            errorSummary: results
              .filter(r => !r.valid)
              .map(r => ({
                index: r.index,
                errorCount: (r.errors as unknown[]).length,
                message: r.errorMessage,
              })),
          }
        },
      ])

      const result = await errorHandlingPipeline(null)
      const errorResult = ResultTestUtils.expectOk(result) as SchemaErrorResult<User>
      
      expect(errorResult.totalUsers).toBe(3)
      expect(errorResult.validUsers).toHaveLength(2)
      expect(errorResult.invalidUsers).toHaveLength(1)
      expect(errorResult.errorSummary).toHaveLength(1)
      expect(errorResult.errorSummary[0]?.index).toBe(1)
    })
  })

  describe('Data Transformation with Schema Validation', () => {
    it('should transform and validate data through complex pipelines', async () => {
      // Input schema
      const InputSchema = nativeSchema.object({
        user_id: nativeSchema.number(),
        full_name: nativeSchema.string(),
        email_address: nativeSchema.string(),
        birth_date: nativeSchema.string(),
        account_status: nativeSchema.string(),
      })

      // Output schema
      const OutputSchema = nativeSchema.object({
        id: nativeSchema.number().integer().positive(),
        name: nativeSchema.string().min(1).max(100),
        email: nativeSchema.string().email(),
        age: nativeSchema.number().integer().min(0).max(150),
        status: nativeSchema.enum(['active', 'inactive', 'pending']),
        profile: nativeSchema.object({
          displayName: nativeSchema.string(),
          initials: nativeSchema.string().length(2),
          emailDomain: nativeSchema.string(),
        }),
      })

      // Setup transformation data
      apiServer.addEndpoint({
        method: 'GET',
        path: '/api/raw-users',
        response: {
          users: [
            {
              user_id: 1,
              full_name: 'John Doe',
              email_address: 'john@example.com',
              birth_date: '1990-01-01',
              account_status: 'ACTIVE',
            },
            {
              user_id: 2,
              full_name: 'Jane Smith',
              email_address: 'jane@company.org',
              birth_date: '1985-05-15',
              account_status: 'INACTIVE',
            },
          ],
        },
      })

      const transformationPipeline = pipeline.compose([
        // Fetch raw data
        async () => {
          const result = await service.get<{ users: unknown[] }>('/api/raw-users')
          if (Result.isErr(result)) {
            throw new Error('Raw data fetch failed')
          }
          return result.value.users
        },

        // Validate input format
        async (rawUsers: unknown) => {
          const typedUsers = rawUsers as unknown[]
          
          const inputValidations = await pipeline.map(
            typedUsers,
            (user: unknown) => data.validate(user, InputSchema)
          )
          
          if (Result.isErr(inputValidations)) {
            throw new Error('Input validation failed')
          }
          
          const validInputs = inputValidations.value
            .filter((r: Result<unknown, unknown>) => Result.isOk(r))
            .map((r: Result<unknown, unknown>) => (r as { value: unknown }).value)
          
          return validInputs
        },

        // Transform data
        async (validInputs: unknown) => {
          const typedInputs = validInputs as Array<{
            user_id: number
            full_name: string
            email_address: string
            birth_date: string
            account_status: string
          }>
          
          const transformedData = await pipeline.map(
            typedInputs,
            (input: {
              user_id: number
              full_name: string
              email_address: string
              birth_date: string
              account_status: string
            }) => {
              // Calculate age
              const birthDate = new Date(input.birth_date)
              const age = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
              
              // Normalize status
              const statusMap: Record<string, string> = {
                'ACTIVE': 'active',
                'INACTIVE': 'inactive',
                'PENDING': 'pending',
              }
              
              // Create initials
              const nameParts = input.full_name.split(' ')
              const initials = nameParts.map(part => part[0]).join('').toUpperCase().slice(0, 2)
              
              // Extract email domain
              const emailDomain = input.email_address.split('@')[1] || ''
              
              return {
                id: input.user_id,
                name: input.full_name,
                email: input.email_address,
                age,
                status: statusMap[input.account_status] || 'pending',
                profile: {
                  displayName: input.full_name,
                  initials,
                  emailDomain,
                },
              }
            }
          )
          
          if (Result.isErr(transformedData)) {
            throw new Error('Data transformation failed')
          }
          
          return transformedData.value
        },

        // Validate output format
        async (transformedData: unknown) => {
          const typedData = transformedData as unknown[]
          
          const outputValidations = await pipeline.map(
            typedData,
            (user: unknown) => data.validate(user, OutputSchema)
          )
          
          if (Result.isErr(outputValidations)) {
            throw new Error('Output validation failed')
          }
          
          const validOutputs = outputValidations.value
            .filter((r: Result<unknown, unknown>) => Result.isOk(r))
            .map((r: Result<unknown, unknown>) => (r as { value: unknown }).value)
          
          return {
            inputCount: typedData.length,
            validOutputCount: validOutputs.length,
            transformedUsers: validOutputs,
          }
        },
      ])

      const result = await transformationPipeline(null)
      const transformResult = ResultTestUtils.expectOk(result) as SchemaTransformResult<User>
      
      expect(transformResult.inputCount).toBe(2)
      expect(transformResult.validOutputCount).toBe(2)
      expect(transformResult.transformedUsers).toHaveLength(2)
      
      // Verify transformation
      const firstUser = transformResult.transformedUsers[0] as unknown as TransformedUser
      expect(firstUser.id).toBe(1)
      expect(firstUser.name).toBe('John Doe')
      expect(firstUser.email).toBe('john@example.com')
      expect(firstUser.age).toBeGreaterThan(30)
      expect(firstUser.status).toBe('active')
      expect(firstUser.profile.initials).toBe('JD')
      expect(firstUser.profile.emailDomain).toBe('example.com')
    })

    it('should handle schema evolution and migration', async () => {
      // V1 Schema
      const SchemaV1 = nativeSchema.object({
        id: nativeSchema.number(),
        name: nativeSchema.string(),
        email: nativeSchema.string(),
      })

      // V2 Schema (with new fields)
      const SchemaV2 = nativeSchema.object({
        id: nativeSchema.number().integer().positive(),
        name: nativeSchema.string().min(1).max(100),
        email: nativeSchema.string().email(),
        profile: nativeSchema.object({
          displayName: nativeSchema.string(),
          avatar: nativeSchema.string().url().optional(),
          bio: nativeSchema.string().max(500).optional(),
        }),
        settings: nativeSchema.object({
          theme: nativeSchema.enum(['light', 'dark']).default('light'),
          notifications: nativeSchema.boolean().default(true),
        }),
        version: nativeSchema.literal(2),
      })

      // Setup mixed version data
      apiServer.addEndpoint({
        method: 'GET',
        path: '/api/mixed-users',
        response: {
          users: [
            // V1 format
            {
              id: 1,
              name: 'John Doe',
              email: 'john@example.com',
            },
            // V2 format
            {
              id: 2,
              name: 'Jane Smith',
              email: 'jane@example.com',
              profile: {
                displayName: 'Jane Smith',
                avatar: 'https://example.com/avatar.jpg',
                bio: 'Software developer',
              },
              settings: {
                theme: 'dark',
                notifications: false,
              },
              version: 2,
            },
          ],
        },
      })

      const migrationPipeline = pipeline.compose([
        // Fetch mixed data
        async () => {
          const result = await service.get<{ users: unknown[] }>('/api/mixed-users')
          if (Result.isErr(result)) {
            throw new Error('Mixed data fetch failed')
          }
          return result.value.users
        },

        // Detect and migrate schemas
        async (users: unknown) => {
          const typedUsers = users as unknown[]
          
          const migrationResults = await pipeline.map(
            typedUsers,
            (user: unknown) => {
              // Try V2 first
              const v2Validation = data.validate(user, SchemaV2)
              if (Result.isOk(v2Validation)) {
                return {
                  originalVersion: 2,
                  migratedUser: v2Validation.value,
                  migrationNeeded: false,
                }
              }
              
              // Try V1 and migrate
              const v1Validation = data.validate(user, SchemaV1)
              if (Result.isOk(v1Validation)) {
                const v1User = v1Validation.value as {
                  id: number
                  name: string
                  email: string
                }
                
                // Migrate to V2
                const migratedUser = {
                  id: v1User.id,
                  name: v1User.name,
                  email: v1User.email,
                  profile: {
                    displayName: v1User.name,
                    avatar: undefined,
                    bio: undefined,
                  },
                  settings: {
                    theme: 'light' as const,
                    notifications: true,
                  },
                  version: 2 as const,
                }
                
                return {
                  originalVersion: 1,
                  migratedUser,
                  migrationNeeded: true,
                }
              }
              
              throw new Error('User format not recognized')
            }
          )
          
          if (Result.isErr(migrationResults)) {
            throw new Error('Migration pipeline failed')
          }
          
          return migrationResults.value
        },

        // Validate migrated data
        async (migrationResults: unknown) => {
          const typedResults = migrationResults as Array<{
            originalVersion: number
            migratedUser: unknown
            migrationNeeded: boolean
          }>
          
          const finalValidations = await pipeline.map(
            typedResults,
            (result: {
              originalVersion: number
              migratedUser: unknown
              migrationNeeded: boolean
            }) => {
              const validation = data.validate(result.migratedUser, SchemaV2)
              
              if (Result.isErr(validation)) {
                throw new Error('Final validation failed')
              }
              
              return {
                ...result,
                validatedUser: validation.value,
              }
            }
          )
          
          if (Result.isErr(finalValidations)) {
            throw new Error('Final validation pipeline failed')
          }
          
          const results = finalValidations.value
          
          return {
            totalUsers: results.length,
            v1Users: results.filter(r => r.originalVersion === 1).length,
            v2Users: results.filter(r => r.originalVersion === 2).length,
            migratedUsers: results.filter(r => r.migrationNeeded).length,
            finalUsers: results.map(r => r.validatedUser),
          }
        },
      ])

      const result = await migrationPipeline(null)
      const migrationResult = ResultTestUtils.expectOk(result) as SchemaMigrationResult<User>
      
      expect(migrationResult.totalUsers).toBe(2)
      expect(migrationResult.v1Users).toBe(1)
      expect(migrationResult.v2Users).toBe(1)
      expect(migrationResult.migratedUsers).toBe(1)
      expect(migrationResult.finalUsers).toHaveLength(2)
      
      // Verify all users are now in V2 format
      migrationResult.finalUsers.forEach((user: unknown) => {
        const migratedUser = user as MigratedUser
        expect(migratedUser.version).toBe(2)
        expect(migratedUser.profile).toBeDefined()
        expect(migratedUser.settings).toBeDefined()
      })
    })
  })

  describe('Schema-Driven API Design', () => {
    it('should enforce consistent API contracts across endpoints', async () => {
      // Define consistent schemas
      const UserSchema = nativeSchema.object({
        id: nativeSchema.number().integer().positive(),
        name: nativeSchema.string().min(1).max(100),
        email: nativeSchema.string().email(),
        active: nativeSchema.boolean(),
      })

      const ApiResponseSchema = nativeSchema.object({
        success: nativeSchema.boolean(),
        data: nativeSchema.unknown(),
        error: nativeSchema.string().optional(),
        timestamp: nativeSchema.string(),
      })

      // Setup multiple endpoints with consistent schema
      const endpoints = [
        {
          path: '/users/1',
          data: {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            active: true,
          },
        },
        {
          path: '/users/2',
          data: {
            id: 2,
            name: 'Jane Smith',
            email: 'jane@example.com',
            active: false,
          },
        },
        {
          path: '/users/3',
          data: {
            id: 3,
            name: 'Bob Johnson',
            email: 'bob@example.com',
            active: true,
          },
        },
      ]

      endpoints.forEach(endpoint => {
        apiServer.addEndpoint({
          method: 'GET',
          path: endpoint.path,
          response: {
            success: true,
            data: endpoint.data,
            timestamp: new Date().toISOString(),
          },
        })
      })

      const contractTestPipeline = pipeline.compose([
        // Test all endpoints
        async () => {
          const endpointTests = endpoints.map(endpoint => 
            async () => {
              const result = await service.get(endpoint.path)
              if (Result.isErr(result)) {
                throw new Error(`Endpoint ${endpoint.path} failed`)
              }
              return { path: endpoint.path, response: result.value }
            }
          )
          
          const results = await pipeline.parallel(endpointTests)
          
          if (Result.isErr(results)) {
            throw new Error('Endpoint testing failed')
          }
          
          return results.value
        },

        // Validate API response format
        async (responses: unknown) => {
          const typedResponses = responses as Array<{
            path: string
            response: unknown
          }>
          
          const responseValidations = await pipeline.map(
            typedResponses,
            (response: { path: string; response: unknown }) => {
              const validation = data.validate(response.response, ApiResponseSchema)
              
              if (Result.isErr(validation)) {
                throw new Error(`API response validation failed for ${response.path}`)
              }
              
              return {
                path: response.path,
                validResponse: validation.value,
              }
            }
          )
          
          if (Result.isErr(responseValidations)) {
            throw new Error('Response validation pipeline failed')
          }
          
          return responseValidations.value
        },

        // Validate user data format
        async (validResponses: unknown) => {
          const typedResponses = validResponses as Array<{
            path: string
            validResponse: { success: boolean; data: unknown }
          }>
          
          const userValidations = await pipeline.map(
            typedResponses,
            (response: { path: string; validResponse: { success: boolean; data: unknown } }) => {
              const validation = data.validate(response.validResponse.data, UserSchema)
              
              if (Result.isErr(validation)) {
                throw new Error(`User data validation failed for ${response.path}`)
              }
              
              return {
                path: response.path,
                validUser: validation.value,
              }
            }
          )
          
          if (Result.isErr(userValidations)) {
            throw new Error('User validation pipeline failed')
          }
          
          return {
            totalEndpoints: endpoints.length,
            validResponses: userValidations.value.length,
            users: userValidations.value.map(r => r.validUser),
          }
        },
      ])

      const result = await contractTestPipeline(null)
      const contractResult = ResultTestUtils.expectOk(result) as SchemaContractResult<User>
      
      expect(contractResult.totalEndpoints).toBe(3)
      expect(contractResult.validResponses).toBe(3)
      expect(contractResult.users).toHaveLength(3)
      
      // Verify all users follow the same schema
      contractResult.users.forEach((user: unknown) => {
        const typedUser = user as User
        expect(typeof typedUser.id).toBe('number')
        expect(typeof typedUser.name).toBe('string')
        expect(typeof typedUser.email).toBe('string')
        expect(typeof typedUser.active).toBe('boolean')
        expect(typedUser.email).toMatch(/@/)
      })
    })
  })
})