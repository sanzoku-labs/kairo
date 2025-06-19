/**
 * Integration Test Helpers
 *
 * Utilities specifically designed for testing cross-pillar functionality
 * and complex workflow scenarios.
 */

import { Result } from '../../core/shared'
import { service } from '../../core/service'
import { data } from '../../core/data'
import { pipeline } from '../../core/pipeline'
import type { Schema } from '../../core/shared'
import type { PipelineResult } from '../../core/pipeline/types'
import { createPipelineError } from '../../core/shared/errors'

/**
 * Complex data generators for integration testing
 */
export class IntegrationDataGenerator {
  /**
   * Generate realistic user dataset for testing
   */
  static generateUserDataset(count = 100) {
    const departments = ['Engineering', 'Sales', 'Marketing', 'Support', 'Finance']
    const skills = ['JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS']

    return Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      email: `user${index + 1}@company.com`,
      active: Math.random() > 0.1, // 90% active
      department: departments[Math.floor(Math.random() * departments.length)],
      salary: Math.floor(Math.random() * 50000) + 50000, // 50k - 100k
      joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 3).toISOString(), // Within 3 years
      skills: skills.slice(0, Math.floor(Math.random() * 4) + 2), // 2-5 skills
      performance: Math.random() * 5 + 3, // 3-8 rating
      region: ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)],
    }))
  }

  /**
   * Generate e-commerce product dataset
   */
  static generateProductDataset(count = 50) {
    const categories = ['Electronics', 'Furniture', 'Clothing', 'Books', 'Sports']
    const brands = ['TechCorp', 'HomeStyle', 'Fashion+', 'BookWorld', 'SportsPro']

    return Array.from({ length: count }, (_, index) => ({
      id: `p${index + 1}`,
      name: `Product ${index + 1}`,
      price: Math.floor(Math.random() * 500) + 10, // $10 - $510
      category: categories[Math.floor(Math.random() * categories.length)],
      brand: brands[Math.floor(Math.random() * brands.length)],
      inStock: Math.random() > 0.2, // 80% in stock
      rating: Math.random() * 2 + 3, // 3-5 stars
      reviews: Math.floor(Math.random() * 1000),
      tags: ['popular', 'new', 'sale', 'featured'].filter(() => Math.random() > 0.7),
    }))
  }

  /**
   * Generate order dataset with relationships
   */
  static generateOrderDataset(users: unknown[], products: unknown[], count = 200) {
    return Array.from({ length: count }, (_, index) => {
      const user = users[Math.floor(Math.random() * users.length)] as { id: number }
      const orderProducts = []
      const numProducts = Math.floor(Math.random() * 3) + 1 // 1-3 products per order

      for (let i = 0; i < numProducts; i++) {
        const product = products[Math.floor(Math.random() * products.length)] as {
          id: string
          price: number
        }
        const quantity = Math.floor(Math.random() * 3) + 1
        orderProducts.push({
          productId: product.id,
          quantity,
          price: product.price,
        })
      }

      const total = orderProducts.reduce((sum, p) => sum + p.price * p.quantity, 0)

      return {
        id: `o${index + 1}`,
        userId: user.id,
        products: orderProducts,
        total,
        status:
          index < Math.floor(count * 0.4) // Ensure 40% are pending
            ? 'pending'
            : ['processing', 'shipped', 'delivered', 'cancelled'][Math.floor(Math.random() * 4)],
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(), // Within 90 days
        region: ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)],
      }
    })
  }
}

/**
 * Schema definitions for integration testing
 */
export class IntegrationSchemas {
  /**
   * User schema for validation (complete with ID)
   */
  static user = data.schema({
    id: { type: 'number', min: 1 },
    name: { type: 'string', min: 2, max: 100 },
    email: { type: 'string', format: 'email' },
    active: { type: 'boolean' },
    department: {
      type: 'string',
      enum: ['Engineering', 'Sales', 'Marketing', 'Support', 'Finance'],
    },
    salary: { type: 'number', min: 0, max: 1000000 },
    joinDate: { type: 'string' }, // ISO date string
    skills: { type: 'array', items: { type: 'string' } },
    performance: { type: 'number', min: 0, max: 10 },
    region: { type: 'string', enum: ['North', 'South', 'East', 'West'] },
  })

  /**
   * User creation schema (without ID for new users)
   */
  static userCreate = data.schema({
    name: { type: 'string', min: 2, max: 100 },
    email: { type: 'string', format: 'email' },
    active: { type: 'boolean' },
    department: {
      type: 'string',
      enum: ['Engineering', 'Sales', 'Marketing', 'Support', 'Finance'],
    },
    salary: { type: 'number', min: 0, max: 1000000 },
    joinDate: { type: 'string' }, // ISO date string
    skills: { type: 'array', items: { type: 'string' } },
    performance: { type: 'number', min: 0, max: 10 },
    region: { type: 'string', enum: ['North', 'South', 'East', 'West'] },
  })

  /**
   * Product schema for validation
   */
  static product = data.schema({
    id: { type: 'string', min: 1 },
    name: { type: 'string', min: 1, max: 200 },
    price: { type: 'number', min: 0 },
    category: { type: 'string' },
    brand: { type: 'string' },
    inStock: { type: 'boolean' },
    rating: { type: 'number', min: 0, max: 5 },
    reviews: { type: 'number', min: 0 },
    tags: { type: 'array', items: { type: 'string' } },
  })

  /**
   * Order schema for validation
   */
  static order = data.schema({
    id: { type: 'string', min: 1 },
    userId: { type: 'number', min: 1 },
    products: {
      type: 'array',
      items: { type: 'string' }, // Simplified for compatibility
    },
    total: { type: 'number', min: 0 },
    status: {
      type: 'string',
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    },
    createdAt: { type: 'string' },
    region: { type: 'string', enum: ['North', 'South', 'East', 'West'] },
  })
}

/**
 * Common workflow patterns for integration testing
 */
export class IntegrationWorkflows {
  /**
   * Fetch and validate data workflow
   */
  static async fetchAndValidate<T>(
    url: string,
    schema: Schema<T>,
    options?: { retries?: number; timeout?: number }
  ): Promise<PipelineResult<T[]>> {
    const opts = { retries: 3, timeout: 5000, ...options }

    // Fetch data from API
    const result = await service.get<{ data?: T[] }>(url, { timeout: opts.timeout })
    if (Result.isErr(result)) {
      return Result.Err(
        createPipelineError('fetchAndValidate', `Service request failed: ${result.error.message}`, {
          serviceError: result.error,
        })
      )
    }

    // Handle different response structures: {data: []} or {users: []} or {products: []} etc.
    const responseValue = result.value as Record<string, unknown>
    const items =
      (responseValue.data as unknown[]) ||
      (responseValue.users as unknown[]) ||
      (responseValue.products as unknown[]) ||
      (responseValue.orders as unknown[]) ||
      []
    const validatedItems: T[] = []
    const errors: string[] = []

    for (const item of items) {
      const validation = data.validate(item, schema)
      if (Result.isOk(validation)) {
        validatedItems.push(validation.value)
      } else {
        errors.push(`Validation failed: ${validation.error.message}`)
      }
    }

    if (errors.length > 0 && validatedItems.length === 0) {
      return Result.Err(
        createPipelineError('fetchAndValidate', `All validations failed: ${errors.join(', ')}`, {
          errors,
        })
      )
    }

    return Result.Ok(validatedItems)
  }

  /**
   * Batch process with aggregation workflow
   */
  static async batchProcessAndAggregate<T>(
    items: T[],
    processor: (item: T) => T | Promise<T>,
    aggregationOptions: { groupBy?: string[]; sum?: string[]; avg?: string[] }
  ): Promise<PipelineResult<unknown>> {
    // Step 1: Process items in batches
    const processingResult = await pipeline.map(items, processor, {
      parallel: true,
      batchSize: 50,
      continueOnError: true,
    })

    if (Result.isErr(processingResult)) {
      return processingResult
    }

    // Step 2: Aggregate results
    const aggregationResult = data.aggregate(processingResult.value, aggregationOptions)

    if (Result.isErr(aggregationResult)) {
      return Result.Err(
        createPipelineError('batchProcessAndAggregate', aggregationResult.error.message, {
          originalError: aggregationResult.error,
        })
      )
    }

    return Result.Ok(aggregationResult.value)
  }

  /**
   * Multi-source data integration workflow
   */
  static async integrateSources(sources: { url: string; schema: Schema<unknown> }[]) {
    // Fetch all sources in parallel
    const fetchOperations = sources.map(
      source => async () => this.fetchAndValidate(source.url, source.schema)
    )

    const results = await pipeline.parallel(fetchOperations, {
      maxConcurrency: 5,
      failFast: false,
      collectErrors: true,
    })

    if (Result.isErr(results)) {
      throw new Error(`Multi-source integration failed: ${results.error.message}`)
    }

    return results.value
  }

  /**
   * Error-resilient processing workflow
   */
  static async resilientProcess<T, R>(
    data: T[],
    processor: (item: T) => R | Promise<R>,
    options: {
      maxRetries?: number
      fallbackValue?: R
      onError?: (error: unknown, item: T) => void
    } = {}
  ): Promise<PipelineResult<R[]>> {
    const opts = { maxRetries: 3, ...options }

    const resilientProcessor = async (item: T): Promise<R> => {
      for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        try {
          return await processor(item)
        } catch (error) {
          if (attempt === opts.maxRetries) {
            opts.onError?.(error, item)
            if (opts.fallbackValue !== undefined) {
              return opts.fallbackValue
            }
            throw error
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
        }
      }
      throw new Error('Unreachable code')
    }

    return pipeline.map(data, resilientProcessor, {
      parallel: true,
      continueOnError: true,
      errorValue: opts.fallbackValue,
    })
  }
}

/**
 * Performance measurement utilities for integration tests
 */
export class IntegrationPerformance {
  /**
   * Measure cross-pillar workflow performance
   */
  static async measureWorkflow<T>(
    _workflowName: string,
    workflow: () => Promise<T>
  ): Promise<{
    result: T
    duration: number
    memoryUsage: { before: number; after: number; delta: number } | undefined
  }> {
    // Memory measurement (if available)
    const beforeMemory = typeof process !== 'undefined' ? process.memoryUsage().heapUsed : 0

    const startTime = performance.now()
    const result = await workflow()
    const endTime = performance.now()

    const afterMemory = typeof process !== 'undefined' ? process.memoryUsage().heapUsed : 0

    const memoryUsage =
      beforeMemory > 0
        ? {
            before: beforeMemory,
            after: afterMemory,
            delta: afterMemory - beforeMemory,
          }
        : undefined

    return {
      result,
      duration: endTime - startTime,
      memoryUsage,
    }
  }

  /**
   * Benchmark different approaches to the same problem
   */
  static async benchmark<T>(
    scenarios: Record<string, () => Promise<T>>,
    iterations = 5
  ): Promise<
    Record<
      string,
      {
        averageDuration: number
        minDuration: number
        maxDuration: number
        successRate: number
      }
    >
  > {
    const results: Record<
      string,
      {
        averageDuration: number
        minDuration: number
        maxDuration: number
        successRate: number
      }
    > = {}

    for (const [name, scenario] of Object.entries(scenarios)) {
      const durations: number[] = []
      let successes = 0

      for (let i = 0; i < iterations; i++) {
        try {
          const { duration } = await this.measureWorkflow(name, scenario)
          durations.push(duration)
          successes++
        } catch {
          // Count as failure, don't include duration
        }
      }

      if (durations.length > 0) {
        results[name] = {
          averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
          minDuration: Math.min(...durations),
          maxDuration: Math.max(...durations),
          successRate: successes / iterations,
        }
      } else {
        results[name] = {
          averageDuration: 0,
          minDuration: 0,
          maxDuration: 0,
          successRate: 0,
        }
      }
    }

    return results
  }
}

/**
 * Test scenario builders for common integration patterns
 */
export class IntegrationScenarios {
  /**
   * Build a user analytics scenario
   */
  static buildUserAnalyticsScenario() {
    return {
      description: 'Fetch users, validate data, and generate analytics',
      setup: () => {
        // Setup would configure mock API endpoints
        return { users: IntegrationDataGenerator.generateUserDataset(100) }
      },
      execute: async () => {
        // Execute the full workflow
        const users = await IntegrationWorkflows.fetchAndValidate('/users', IntegrationSchemas.user)

        if (Result.isErr(users)) {
          throw new Error('User fetch failed')
        }

        const analytics = await IntegrationWorkflows.batchProcessAndAggregate(
          users.value,
          (user: unknown) => user, // Pass through
          {
            groupBy: ['department'],
            avg: ['salary', 'performance'],
            sum: ['salary'],
          }
        )

        return analytics
      },
      validate: (result: unknown) => {
        // Validation logic for the result
        return result !== null && typeof result === 'object'
      },
    }
  }

  /**
   * Build an e-commerce analytics scenario
   */
  static buildEcommerceAnalyticsScenario() {
    return {
      description: 'Multi-source e-commerce data integration and analysis',
      setup: () => {
        return {
          users: IntegrationDataGenerator.generateUserDataset(50),
          products: IntegrationDataGenerator.generateProductDataset(30),
          orders: IntegrationDataGenerator.generateOrderDataset(
            IntegrationDataGenerator.generateUserDataset(50),
            IntegrationDataGenerator.generateProductDataset(30),
            100
          ),
        }
      },
      execute: async () => {
        const sources = [
          { url: '/users', schema: IntegrationSchemas.user },
          { url: '/products', schema: IntegrationSchemas.product },
          { url: '/orders', schema: IntegrationSchemas.order },
        ]

        const allData = await IntegrationWorkflows.integrateSources(sources)

        // Process and combine the data
        if (Array.isArray(allData) && allData.length >= 3) {
          const [users, products, orders] = allData as [unknown[], unknown[], unknown[]]
          const combinedAnalytics = {
            userCount: users.length,
            productCount: products.length,
            orderCount: orders.length,
            // Add more complex analytics
          }
          return combinedAnalytics
        } else {
          throw new Error('Invalid data structure from multi-source integration')
        }
      },
      validate: (result: unknown) => {
        return result !== null && typeof result === 'object'
      },
    }
  }
}
