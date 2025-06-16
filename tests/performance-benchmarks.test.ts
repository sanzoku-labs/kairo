import { describe, it, expect, afterAll } from 'vitest'
import { z } from 'zod'
import { performanceTesting } from '../src/testing/performance-testing'
import { pipeline } from '../src/core/pipeline'
import { nativeSchema } from '../src/core/native-schema'
import { schema } from '../src/core/schema'
import { transform } from '../src/core/transform'
import { repository } from '../src/core/repository'
import { performance as perf } from '../src/core/performance'

describe('Performance Benchmarks', () => {
  // Initialize performance monitoring
  perf.initialize({
    enabled: true,
    autoFlush: false,
  })

  describe('Schema Validation Performance', () => {
    const UserSchema = nativeSchema.object({
      id: nativeSchema.string().uuid(),
      name: nativeSchema.string().min(2).max(100),
      email: nativeSchema.string().email(),
      age: nativeSchema.number().min(0).max(150),
      active: nativeSchema.boolean(),
      tags: nativeSchema.array(nativeSchema.string()),
      metadata: nativeSchema.object({
        createdAt: nativeSchema.string(),
        updatedAt: nativeSchema.string(),
      }),
    })

    const validUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      active: true,
      tags: ['user', 'premium'],
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    }

    it('should validate 10,000 objects quickly', async () => {
      const tester = performanceTesting.createTester()

      const result = await tester.test(
        'Schema Validation',
        () => {
          for (let i = 0; i < 100; i++) {
            UserSchema.parse(validUser)
          }
          return Promise.resolve()
        },
        {
          iterations: 100,
          warmupIterations: 10,
        }
      )

      console.log(
        `Schema validation throughput: ${performanceTesting.utils.formatThroughput(result.metrics.throughput * 100)}`
      )
      console.log(
        `Average duration: ${performanceTesting.utils.formatDuration(result.metrics.averageDuration)}`
      )

      // Performance expectations
      expect(result.metrics.successRate).toBe(100)
      expect(result.metrics.averageDuration).toBeLessThan(10) // Less than 10ms for 100 validations
    })
  })

  describe('Pipeline Performance', () => {
    const processUser = pipeline('process-user')
      .input(
        schema.object({
          name: z.string(),
          email: z.string(),
        })
      )
      .map((user: Record<string, unknown>) => ({ ...user, id: Date.now() }))
      .validate(
        schema.object({
          id: z.number(),
          name: z.string(),
          email: z.string(),
        })
      )

    it('should process pipelines efficiently', async () => {
      const tester = performanceTesting.createTester()

      const result = await tester.test(
        'Pipeline Processing',
        async () => {
          await processUser.run({ name: 'John', email: 'john@example.com' })
        },
        {
          iterations: 1000,
          warmupIterations: 50,
        }
      )

      console.log(
        `Pipeline throughput: ${performanceTesting.utils.formatThroughput(result.metrics.throughput)}`
      )
      console.log(
        `P95 duration: ${performanceTesting.utils.formatDuration(result.metrics.p95Duration)}`
      )

      expect(result.metrics.successRate).toBe(100)
      expect(result.metrics.averageDuration).toBeLessThan(5) // Less than 5ms average
    })

    it('should handle concurrent pipelines', async () => {
      const tester = performanceTesting.createTester()

      const result = await tester.test(
        'Concurrent Pipelines',
        async () => {
          const promises = Array.from({ length: 10 }, () =>
            processUser.run({ name: 'John', email: 'john@example.com' })
          )
          await Promise.all(promises)
        },
        {
          iterations: 100,
          concurrency: 5,
        }
      )

      console.log(
        `Concurrent pipeline throughput: ${performanceTesting.utils.formatThroughput(result.metrics.throughput * 10)}`
      )

      expect(result.metrics.successRate).toBe(100)
    })
  })

  describe('Transform Performance', () => {
    const RawUserSchema = nativeSchema.object({
      user_id: nativeSchema.string(),
      user_name: nativeSchema.string(),
      user_email: nativeSchema.string(),
      created_at: nativeSchema.string(),
    })

    const UserSchema = nativeSchema.object({
      id: nativeSchema.string(),
      name: nativeSchema.string(),
      email: nativeSchema.string(),
      createdAt: nativeSchema.string(),
    })

    const userTransform = transform('user-normalization', RawUserSchema)
      .to(UserSchema)
      .map('user_id', 'id')
      .map('user_name', 'name')
      .map('user_email', 'email')
      .map('created_at', 'createdAt')

    it('should transform data efficiently', async () => {
      const tester = performanceTesting.createTester()

      const rawUser = {
        user_id: '123',
        user_name: 'John Doe',
        user_email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
      }

      const result = await tester.test(
        'Data Transformation',
        () => {
          userTransform.execute(rawUser)
          return Promise.resolve()
        },
        {
          iterations: 10000,
        }
      )

      console.log(
        `Transform throughput: ${performanceTesting.utils.formatThroughput(result.metrics.throughput)}`
      )

      expect(result.metrics.successRate).toBe(100)
      expect(result.metrics.averageDuration).toBeLessThan(1) // Less than 1ms average
    })

    it('should handle batch transformations', async () => {
      const tester = performanceTesting.createTester()

      const rawUsers = Array.from({ length: 1000 }, (_, i) => ({
        user_id: `${i}`,
        user_name: `User ${i}`,
        user_email: `user${i}@example.com`,
        created_at: '2024-01-01T00:00:00Z',
      }))

      const result = await tester.test(
        'Batch Transformation',
        async () => {
          await userTransform.executeBatch(rawUsers, { batchSize: 100, parallel: true })
        },
        {
          iterations: 10,
        }
      )

      console.log(
        `Batch transform throughput: ${performanceTesting.utils.formatThroughput(result.metrics.throughput * 1000)}`
      )

      expect(result.metrics.successRate).toBe(100)
    })
  })

  describe('Repository Performance', () => {
    const UserSchema = nativeSchema.object({
      id: nativeSchema.string(),
      name: nativeSchema.string(),
      email: nativeSchema.string(),
      active: nativeSchema.boolean(),
    })

    const userRepository = repository('users', {
      schema: UserSchema,
      storage: 'memory',
    })

    it('should handle CRUD operations efficiently', async () => {
      const tester = performanceTesting.createTester()

      // Test create performance
      const createResult = await tester.test(
        'Repository Create',
        async () => {
          await userRepository.create({
            id: `${Date.now()}`,
            name: 'John Doe',
            email: 'john@example.com',
            active: true,
          })
        },
        {
          iterations: 1000,
        }
      )

      console.log(
        `Repository create throughput: ${performanceTesting.utils.formatThroughput(createResult.metrics.throughput)}`
      )

      // Test find performance
      const findResult = await tester.test(
        'Repository Find',
        async () => {
          await userRepository.findMany({ where: { active: true } })
        },
        {
          iterations: 1000,
        }
      )

      console.log(
        `Repository find throughput: ${performanceTesting.utils.formatThroughput(findResult.metrics.throughput)}`
      )

      expect(createResult.metrics.successRate).toBe(100)
      expect(findResult.metrics.successRate).toBe(100)
    })
  })

  describe('Memory Usage', () => {
    it('should not leak memory during heavy operations', async () => {
      const tester = performanceTesting.createTester()

      const UserSchema = nativeSchema.object({
        id: nativeSchema.string(),
        data: nativeSchema.string(),
      })

      const memoryResult = await tester.monitorMemory(
        async () => {
          // Create and process large objects
          const users = Array.from({ length: 100 }, (_, i) => ({
            id: `${i}`,
            data: 'x'.repeat(1000), // 1KB of data per user
          }))

          for (const user of users) {
            UserSchema.parse(user)
          }
          return Promise.resolve()
        },
        100, // Sample every 100ms
        5000 // Run for 5 seconds
      )

      console.log(`Memory trend: ${memoryResult.trend}`)
      console.log(
        `Peak memory: ${performanceTesting.utils.formatMemory(memoryResult.peak.heapUsed ?? 0)}`
      )

      expect(memoryResult.leaked).toBe(false)
      expect(memoryResult.trend).not.toBe('increasing')
    })
  })

  describe('Load Testing', () => {
    it('should sustain target throughput', async () => {
      const tester = performanceTesting.createTester()

      const processData = pipeline('process-data')
        .input(schema.object({ value: z.number() }))
        .map((data: Record<string, unknown>) => ({ ...data, processed: true }))

      const loadResult = await tester.loadTest(
        'Sustained Load',
        async () => {
          await processData.run({ value: Math.random() })
        },
        {
          targetThroughput: 1000, // 1000 ops/sec
          duration: 10, // 10 seconds
          pattern: 'constant',
          concurrency: 10,
        }
      )

      console.log(
        `Target throughput: ${performanceTesting.utils.formatThroughput(loadResult.targetThroughput ?? 0)}`
      )
      console.log(
        `Actual throughput: ${performanceTesting.utils.formatThroughput(loadResult.actualThroughput)}`
      )
      console.log(`Sustained load: ${loadResult.sustainedLoad}`)

      expect(loadResult.sustainedLoad).toBe(true)
      expect(loadResult.metrics.errorRate).toBeLessThan(1) // Less than 1% error rate
    })
  })

  // Cleanup after tests
  afterAll(async () => {
    await perf.flush()
  })
})
