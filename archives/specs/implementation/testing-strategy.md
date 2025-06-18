# Testing Strategy ✅ IMPLEMENTED

> **Comprehensive testing approach for Kairo V2's three-pillar architecture**  
> **Status: ✅ Testing framework implemented and ready for comprehensive test suite**

## Overview ✅ Implementation Complete

Kairo V2 requires a robust testing strategy that covers unit tests, integration tests, performance tests, and type safety validation. This document outlines the testing approach for each pillar and cross-pillar interactions.

**Implementation Status**: ✅ **Testing infrastructure complete - Ready for comprehensive test suite development**

## ✅ Testing Philosophy - Framework Implemented

### **✅ Test-Driven Development - Framework Ready**
- ✅ Write tests before implementation - **Infrastructure ready**
- ✅ Tests as living documentation - **Documentation framework ready**
- ✅ 90% code coverage target - **Coverage tooling ready**
- ✅ Focus on public API behavior - **All 23 public methods ready for testing**

### **Testing Pyramid**
```
                    ┌─────────────┐
                    │ E2E Tests   │  < 10%
                    │ (Integration)│
                ┌───┴─────────────┴───┐
                │  Integration Tests  │  ~20%
                │  (Cross-pillar)     │
            ┌───┴─────────────────────┴───┐
            │      Unit Tests             │  ~70%
            │   (Individual functions)    │
        └───────────────────────────────────┘
```

## Test Framework Setup

### **Core Testing Stack**
```json
// package.json - Testing dependencies
{
  "devDependencies": {
    "vitest": "^1.0.0",           // Test runner
    "@vitest/coverage-v8": "^1.0.0", // Coverage
    "@vitest/ui": "^1.0.0",       // Test UI
    "jsdom": "^23.0.0",           // DOM simulation
    "happy-dom": "^12.0.0",       // Alternative DOM
    "msw": "^2.0.0",              // API mocking
    "faker": "^8.0.0",            // Test data generation
    "@types/node": "^20.0.0"      // Node types
  },
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:types": "tsc --noEmit",
    "test:e2e": "vitest run --config vitest.e2e.config.ts"
  }
}
```

### **Vitest Configuration**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Test files
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'build'],
    
    // Environment
    environment: 'jsdom',
    globals: true,
    
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/__tests__/**',
        'src/**/__fixtures__/**'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    
    // Setup
    setupFiles: ['./src/test/setup.ts'],
    
    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Parallel execution
    threads: true,
    maxThreads: 4,
    
    // Reporting
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html'
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@test': resolve(__dirname, './src/test')
    }
  }
})
```

### **Test Setup**
```typescript
// src/test/setup.ts
import { vi } from 'vitest'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'

// Global test utilities
declare global {
  var testServer: ReturnType<typeof setupServer>
}

// Setup MSW server for API mocking
global.testServer = setupServer(
  // Default handlers
  http.get('/api/test', () => {
    return HttpResponse.json({ message: 'Test API response' })
  })
)

// Start server before all tests
beforeAll(() => {
  global.testServer.listen({ onUnhandledRequest: 'error' })
})

// Reset handlers after each test
afterEach(() => {
  global.testServer.resetHandlers()
  vi.clearAllMocks()
})

// Close server after all tests
afterAll(() => {
  global.testServer.close()
})

// Global test helpers
export const createMockResponse = (data: unknown, status = 200) => {
  return HttpResponse.json(data, { status })
}

export const createMockError = (message: string, status = 500) => {
  return HttpResponse.json({ error: message }, { status })
}
```

## Unit Testing Strategy

### **SERVICE Pillar Tests**
```typescript
// src/service/__tests__/get.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { service } from '../index'
import { Result } from '../../core/result'

describe('service.get', () => {
  const testUrl = '/api/users'
  
  it('should return successful result for valid request', async () => {
    const mockData = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
    
    global.testServer.use(
      http.get(testUrl, () => HttpResponse.json(mockData))
    )
    
    const result = await service.get(testUrl)
    
    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      expect(result.value).toEqual(mockData)
    }
  })
  
  it('should return error result for network failure', async () => {
    global.testServer.use(
      http.get(testUrl, () => HttpResponse.error())
    )
    
    const result = await service.get(testUrl)
    
    expect(Result.isErr(result)).toBe(true)
    if (Result.isErr(result)) {
      expect(result.error.code).toBe('SERVICE_ERROR')
      expect(result.error.operation).toBe('get')
      expect(result.error.networkError).toBe(true)
    }
  })
  
  it('should handle timeout correctly', async () => {
    global.testServer.use(
      http.get(testUrl, async () => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        return HttpResponse.json({})
      })
    )
    
    const result = await service.get(testUrl, { timeout: 1000 })
    
    expect(Result.isErr(result)).toBe(true)
    if (Result.isErr(result)) {
      expect(result.error.timeout).toBe(true)
    }
  })
  
  it('should validate response with schema', async () => {
    const UserSchema = data.schema({
      id: data.number(),
      name: data.string()
    })
    
    global.testServer.use(
      http.get(testUrl, () => HttpResponse.json([
        { id: 1, name: 'John' },
        { id: 'invalid', name: 123 } // Invalid data
      ]))
    )
    
    const result = await service.get(testUrl, { validate: UserSchema })
    
    expect(Result.isErr(result)).toBe(true)
    if (Result.isErr(result)) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
    }
  })
  
  it('should cache responses when enabled', async () => {
    const mockData = { cached: true }
    let callCount = 0
    
    global.testServer.use(
      http.get(testUrl, () => {
        callCount++
        return HttpResponse.json(mockData)
      })
    )
    
    // First call
    const result1 = await service.get(testUrl, { cache: { ttl: 5000 } })
    expect(callCount).toBe(1)
    
    // Second call should use cache
    const result2 = await service.get(testUrl, { cache: { ttl: 5000 } })
    expect(callCount).toBe(1) // Should not increment
    
    expect(Result.isOk(result1)).toBe(true)
    expect(Result.isOk(result2)).toBe(true)
    if (Result.isOk(result1) && Result.isOk(result2)) {
      expect(result1.value).toEqual(result2.value)
    }
  })
})

// src/service/__tests__/post.test.ts
describe('service.post', () => {
  it('should send data correctly', async () => {
    const testData = { name: 'New User', email: 'user@test.com' }
    let receivedData: any
    
    global.testServer.use(
      http.post('/api/users', async ({ request }) => {
        receivedData = await request.json()
        return HttpResponse.json({ id: 123, ...receivedData })
      })
    )
    
    const result = await service.post('/api/users', testData)
    
    expect(receivedData).toEqual(testData)
    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      expect(result.value).toEqual({ id: 123, ...testData })
    }
  })
})
```

### **DATA Pillar Tests**
```typescript
// src/data/__tests__/validate.test.ts
import { describe, it, expect } from 'vitest'
import { data } from '../index'
import { Result } from '../../core/result'

describe('data.validate', () => {
  const UserSchema = data.schema({
    name: data.string().min(1).max(100),
    email: data.string().email(),
    age: data.number().min(0).max(150),
    isActive: data.boolean().optional()
  })
  
  it('should validate correct data', () => {
    const validUser = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      isActive: true
    }
    
    const result = data.validate(validUser, UserSchema)
    
    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      expect(result.value).toEqual(validUser)
    }
  })
  
  it('should return validation errors for invalid data', () => {
    const invalidUser = {
      name: '',
      email: 'invalid-email',
      age: -5,
      isActive: 'yes'
    }
    
    const result = data.validate(invalidUser, UserSchema)
    
    expect(Result.isErr(result)).toBe(true)
    if (Result.isErr(result)) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.issues).toHaveLength(4)
      
      const issueCodes = result.error.issues.map(issue => issue.code)
      expect(issueCodes).toContain('too_small') // name too short
      expect(issueCodes).toContain('invalid_email') // invalid email
      expect(issueCodes).toContain('too_small') // age too small
      expect(issueCodes).toContain('invalid_type') // isActive wrong type
    }
  })
  
  it('should handle nested object validation', () => {
    const NestedSchema = data.schema({
      user: UserSchema,
      metadata: data.object({
        source: data.string(),
        timestamp: data.date()
      })
    })
    
    const validData = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      },
      metadata: {
        source: 'api',
        timestamp: new Date()
      }
    }
    
    const result = data.validate(validData, NestedSchema)
    expect(Result.isOk(result)).toBe(true)
  })
  
  it('should support partial validation', () => {
    const partialData = {
      name: 'John Doe',
      email: 'john@example.com'
      // age missing
    }
    
    const result = data.partial(partialData, UserSchema)
    
    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      expect(result.value.name).toBe('John Doe')
      expect(result.value.email).toBe('john@example.com')
      expect(result.value.age).toBeUndefined()
    }
  })
})

// src/data/__tests__/aggregate.test.ts
describe('data.aggregate', () => {
  const salesData = [
    { region: 'North', product: 'A', revenue: 100, quantity: 2 },
    { region: 'North', product: 'B', revenue: 200, quantity: 1 },
    { region: 'South', product: 'A', revenue: 150, quantity: 3 },
    { region: 'South', product: 'B', revenue: 250, quantity: 1 }
  ]
  
  it('should group and aggregate data correctly', () => {
    const result = data.aggregate(salesData, {
      groupBy: ['region'],
      sum: ['revenue', 'quantity'],
      count: true
    })
    
    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      const groups = result.value.groups
      
      expect(groups['North']).toBeDefined()
      expect(groups['North'].revenue).toBe(300)
      expect(groups['North'].quantity).toBe(3)
      expect(groups['North'].count).toBe(2)
      
      expect(groups['South']).toBeDefined()
      expect(groups['South'].revenue).toBe(400)
      expect(groups['South'].quantity).toBe(4)
      expect(groups['South'].count).toBe(2)
    }
  })
  
  it('should handle custom aggregation functions', () => {
    const result = data.aggregate(salesData, {
      groupBy: ['region'],
      custom: {
        avgRevenue: (group) => group.reduce((sum, item) => sum + item.revenue, 0) / group.length,
        topProduct: (group) => {
          const productRevenue = group.reduce((acc, item) => {
            acc[item.product] = (acc[item.product] || 0) + item.revenue
            return acc
          }, {})
          return Object.keys(productRevenue).reduce((a, b) => 
            productRevenue[a] > productRevenue[b] ? a : b
          )
        }
      }
    })
    
    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      const groups = result.value.groups
      expect(groups['North'].avgRevenue).toBe(150)
      expect(groups['North'].topProduct).toBe('B')
    }
  })
})
```

### **PIPELINE Pillar Tests**
```typescript
// src/pipeline/__tests__/map.test.ts
import { describe, it, expect } from 'vitest'
import { pipeline } from '../index'
import { Result } from '../../core/result'

describe('pipeline.map', () => {
  it('should transform array elements', () => {
    const numbers = [1, 2, 3, 4, 5]
    const double = (x: number) => x * 2
    
    const result = pipeline.map(numbers, double)
    
    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      expect(result.value).toEqual([2, 4, 6, 8, 10])
    }
  })
  
  it('should handle async transformations', async () => {
    const numbers = [1, 2, 3]
    const asyncDouble = async (x: number) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return x * 2
    }
    
    const result = await pipeline.map(numbers, asyncDouble, { async: true })
    
    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      expect(result.value).toEqual([2, 4, 6])
    }
  })
  
  it('should handle transformation errors', () => {
    const numbers = [1, 2, 3]
    const faultyTransform = (x: number) => {
      if (x === 2) throw new Error('Transform failed')
      return x * 2
    }
    
    const result = pipeline.map(numbers, faultyTransform)
    
    expect(Result.isErr(result)).toBe(true)
    if (Result.isErr(result)) {
      expect(result.error.code).toBe('PIPELINE_ERROR')
      expect(result.error.operation).toBe('map')
      expect(result.error.itemIndex).toBe(1)
    }
  })
  
  it('should continue on error when configured', () => {
    const numbers = [1, 2, 3, 4]
    const faultyTransform = (x: number) => {
      if (x === 2) throw new Error('Transform failed')
      return x * 2
    }
    
    const result = pipeline.map(numbers, faultyTransform, {
      continueOnError: true,
      fallback: 0
    })
    
    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      expect(result.value).toEqual([2, 0, 6, 8]) // Failed item becomes 0
    }
  })
})

// src/pipeline/__tests__/compose.test.ts
describe('pipeline.compose', () => {
  it('should compose functions correctly', () => {
    const add5 = (x: number) => x + 5
    const multiply2 = (x: number) => x * 2
    const toString = (x: number) => x.toString()
    
    const composed = pipeline.compose(add5, multiply2, toString)
    const result = composed(10)
    
    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      expect(result.value).toBe('30') // (10 + 5) * 2 = 30, then toString
    }
  })
  
  it('should propagate errors in composition', () => {
    const add5 = (x: number) => x + 5
    const throwError = (x: number) => {
      throw new Error('Composition failed')
    }
    const multiply2 = (x: number) => x * 2
    
    const composed = pipeline.compose(add5, throwError, multiply2)
    const result = composed(10)
    
    expect(Result.isErr(result)).toBe(true)
    if (Result.isErr(result)) {
      expect(result.error.code).toBe('PIPELINE_ERROR')
      expect(result.error.operation).toBe('compose')
      expect(result.error.step).toBe(1) // Error at second function
    }
  })
})
```

## Integration Testing

### **Cross-Pillar Integration Tests**
```typescript
// src/__tests__/integration/service-data-integration.test.ts
import { describe, it, expect } from 'vitest'
import { service, data, pipeline } from '../../index'
import { http, HttpResponse } from 'msw'
import { Result } from '../../core/result'

describe('Service + Data Integration', () => {
  const UserSchema = data.schema({
    id: data.number(),
    name: data.string(),
    email: data.string().email()
  })
  
  it('should fetch and validate data end-to-end', async () => {
    const mockUsers = [
      { id: 1, name: 'John', email: 'john@test.com' },
      { id: 2, name: 'Jane', email: 'jane@test.com' }
    ]
    
    global.testServer.use(
      http.get('/api/users', () => HttpResponse.json(mockUsers))
    )
    
    // Fetch data
    const serviceResult = await service.get('/api/users')
    expect(Result.isOk(serviceResult)).toBe(true)
    
    if (Result.isOk(serviceResult)) {
      // Validate data
      const validationResult = data.validate(serviceResult.value, data.array(UserSchema))
      expect(Result.isOk(validationResult)).toBe(true)
      
      if (Result.isOk(validationResult)) {
        expect(validationResult.value).toHaveLength(2)
        expect(validationResult.value[0].name).toBe('John')
      }
    }
  })
  
  it('should handle service + validation in one call', async () => {
    const mockUsers = [
      { id: 1, name: 'John', email: 'john@test.com' },
      { id: 'invalid', name: 123, email: 'not-email' }
    ]
    
    global.testServer.use(
      http.get('/api/users', () => HttpResponse.json(mockUsers))
    )
    
    const result = await service.get('/api/users', {
      validate: data.array(UserSchema)
    })
    
    expect(Result.isErr(result)).toBe(true)
    if (Result.isErr(result)) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
    }
  })
})

// src/__tests__/integration/full-workflow.test.ts
describe('Full Data Processing Workflow', () => {
  it('should handle complete data workflow', async () => {
    const rawSalesData = [
      { region: 'North', product: 'Laptop', revenue: '1299.99', date: '2024-01-15' },
      { region: 'South', product: 'Mouse', revenue: '29.99', date: '2024-01-16' },
      { region: 'North', product: 'Keyboard', revenue: '89.99', date: '2024-01-17' }
    ]
    
    global.testServer.use(
      http.get('/api/sales', () => HttpResponse.json(rawSalesData))
    )
    
    const SalesSchema = data.schema({
      region: data.string(),
      product: data.string(),
      revenue: data.number(),
      date: data.date()
    })
    
    // 1. Fetch data
    const fetchResult = await service.get('/api/sales')
    expect(Result.isOk(fetchResult)).toBe(true)
    
    if (Result.isOk(fetchResult)) {
      // 2. Transform data (strings to proper types)
      const transformResult = data.transform(fetchResult.value, data.array(SalesSchema), {
        customTransforms: {
          revenue: (item: any) => parseFloat(item.revenue),
          date: (item: any) => new Date(item.date)
        }
      })
      
      expect(Result.isOk(transformResult)).toBe(true)
      
      if (Result.isOk(transformResult)) {
        // 3. Process with pipeline
        const enriched = pipeline.map(transformResult.value, (sale) => ({
          ...sale,
          quarter: Math.ceil((sale.date.getMonth() + 1) / 3),
          category: sale.revenue > 100 ? 'high-value' : 'low-value'
        }))
        
        expect(Result.isOk(enriched)).toBe(true)
        
        if (Result.isOk(enriched)) {
          // 4. Aggregate results
          const aggregated = data.aggregate(enriched.value, {
            groupBy: ['region'],
            sum: ['revenue'],
            count: true,
            custom: {
              avgRevenue: (group) => group.reduce((sum, item) => sum + item.revenue, 0) / group.length
            }
          })
          
          expect(Result.isOk(aggregated)).toBe(true)
          
          if (Result.isOk(aggregated)) {
            const groups = aggregated.value.groups
            expect(groups['North']).toBeDefined()
            expect(groups['North'].revenue).toBeCloseTo(1389.98)
            expect(groups['North'].count).toBe(2)
          }
        }
      }
    }
  })
})
```

## Performance Testing

### **Performance Test Suite**
```typescript
// src/__tests__/performance/performance.test.ts
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'
import { data, pipeline, service } from '../../index'
import { generateTestData } from '../fixtures/generators'

describe('Performance Tests', () => {
  it('should validate large datasets efficiently', () => {
    const largeDataset = generateTestData(10000) // 10K records
    const UserSchema = data.schema({
      id: data.string(),
      name: data.string(),
      email: data.string().email(),
      age: data.number().min(0).max(150)
    })
    
    const start = performance.now()
    const result = data.validate(largeDataset, data.array(UserSchema))
    const duration = performance.now() - start
    
    expect(Result.isOk(result)).toBe(true)
    expect(duration).toBeLessThan(1000) // Should complete in under 1 second
    
    console.log(`Validated 10K records in ${duration.toFixed(2)}ms`)
  })
  
  it('should handle large pipeline transformations', () => {
    const largeArray = Array.from({ length: 100000 }, (_, i) => i)
    
    const start = performance.now()
    const result = pipeline.map(largeArray, x => x * 2)
    const duration = performance.now() - start
    
    expect(Result.isOk(result)).toBe(true)
    expect(duration).toBeLessThan(500) // Should complete in under 500ms
    
    console.log(`Processed 100K items in ${duration.toFixed(2)}ms`)
  })
  
  it('should handle memory efficiently with large datasets', () => {
    const initialMemory = process.memoryUsage().heapUsed
    
    // Process large dataset in chunks
    const largeDataset = generateTestData(50000)
    const result = data.aggregate(largeDataset, {
      groupBy: ['category'],
      sum: ['value'],
      count: true
    }, {
      chunk: 1000 // Process in 1K chunks
    })
    
    expect(Result.isOk(result)).toBe(true)
    
    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024 // MB
    
    expect(memoryIncrease).toBeLessThan(100) // Should not increase memory by more than 100MB
    
    console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`)
  })
})

// src/test/fixtures/generators.ts
import { faker } from '@faker-js/faker'

export const generateTestData = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    age: faker.number.int({ min: 18, max: 80 }),
    category: faker.helpers.arrayElement(['A', 'B', 'C', 'D']),
    value: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
    createdAt: faker.date.recent()
  }))
}

export const generateSalesData = (count: number) => {
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    region: faker.helpers.arrayElement(['North', 'South', 'East', 'West']),
    product: faker.commerce.productName(),
    revenue: faker.number.float({ min: 10, max: 5000, fractionDigits: 2 }),
    quantity: faker.number.int({ min: 1, max: 100 }),
    date: faker.date.between({ from: '2024-01-01', to: '2024-12-31' }),
    salesRep: faker.person.fullName()
  }))
}
```

## Type Safety Testing

### **Type-Level Tests**
```typescript
// src/__tests__/types/type-tests.ts
import type { Equal, Expect } from '@type-challenges/utils'
import type { service, data, pipeline } from '../../index'
import type { Result } from '../../core/result'

// Test service type inference
type ServiceGetResult = Awaited<ReturnType<typeof service.get>>
type ServiceExpected = Result<any, unknown>
type ServiceTest = Expect<Equal<ServiceGetResult, ServiceExpected>>

// Test data validation type inference
const UserSchema = data.schema({
  name: data.string(),
  email: data.string().email(),
  age: data.number()
})

type DataValidateResult = ReturnType<typeof data.validate<typeof UserSchema>>
type DataExpected = Result<any, { name: string; email: string; age: number }>
type DataTest = Expect<Equal<DataValidateResult, DataExpected>>

// Test pipeline type inference
type PipelineMapResult = ReturnType<typeof pipeline.map<number, string>>
type PipelineExpected = Result<any, string[]> | Promise<Result<any, string[]>>
type PipelineTest = Expect<Equal<PipelineMapResult, PipelineExpected>>

// Compile-time tests pass if file compiles without errors
const typeTests: [ServiceTest, DataTest, PipelineTest] = [true, true, true]
```

## E2E Testing

### **End-to-End Test Configuration**
```typescript
// vitest.e2e.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['e2e/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000, // Longer timeout for E2E
    threads: false, // Run E2E tests sequentially
    reporter: ['verbose'],
    setupFiles: ['./e2e/setup.ts']
  }
})

// e2e/setup.ts
import { startTestServer } from './test-server'

let testServer: any

beforeAll(async () => {
  testServer = await startTestServer()
})

afterAll(async () => {
  await testServer.close()
})

export { testServer }
```

### **E2E Test Examples**
```typescript
// e2e/user-workflow.test.ts
import { describe, it, expect } from 'vitest'
import { service, data, pipeline } from '../src/index'

describe('User Management Workflow E2E', () => {
  it('should complete full user lifecycle', async () => {
    const UserSchema = data.schema({
      id: data.number(),
      name: data.string(),
      email: data.string().email(),
      status: data.enum(['active', 'inactive'])
    })
    
    // 1. Create user
    const newUser = {
      name: 'Test User',
      email: 'test@example.com'
    }
    
    const createResult = await service.post('/api/users', newUser)
    expect(Result.isOk(createResult)).toBe(true)
    
    let userId: number
    if (Result.isOk(createResult)) {
      userId = createResult.value.id
      expect(userId).toBeDefined()
    }
    
    // 2. Fetch user
    const fetchResult = await service.get(`/api/users/${userId}`, {
      validate: UserSchema
    })
    expect(Result.isOk(fetchResult)).toBe(true)
    
    // 3. Update user
    const updateData = { status: 'active' }
    const updateResult = await service.patch(`/api/users/${userId}`, updateData)
    expect(Result.isOk(updateResult)).toBe(true)
    
    // 4. Fetch all users and process
    const allUsersResult = await service.get('/api/users', {
      validate: data.array(UserSchema)
    })
    expect(Result.isOk(allUsersResult)).toBe(true)
    
    if (Result.isOk(allUsersResult)) {
      // Filter active users
      const activeUsers = pipeline.filter(
        allUsersResult.value,
        user => user.status === 'active'
      )
      expect(Result.isOk(activeUsers)).toBe(true)
      
      if (Result.isOk(activeUsers)) {
        expect(activeUsers.value.length).toBeGreaterThan(0)
      }
    }
    
    // 5. Delete user
    const deleteResult = await service.delete(`/api/users/${userId}`)
    expect(Result.isOk(deleteResult)).toBe(true)
  })
})
```

## Test Organization

### **Directory Structure**
```
src/
├── service/
│   ├── __tests__/
│   │   ├── get.test.ts
│   │   ├── post.test.ts
│   │   ├── cache.test.ts
│   │   └── retry.test.ts
│   └── __fixtures__/
│       └── responses.ts
├── data/
│   ├── __tests__/
│   │   ├── validate.test.ts
│   │   ├── transform.test.ts
│   │   ├── aggregate.test.ts
│   │   └── serialize.test.ts
│   └── __fixtures__/
│       └── schemas.ts
├── pipeline/
│   ├── __tests__/
│   │   ├── map.test.ts
│   │   ├── filter.test.ts
│   │   ├── compose.test.ts
│   │   └── parallel.test.ts
│   └── __fixtures__/
│       └── transforms.ts
├── __tests__/
│   ├── integration/
│   │   ├── service-data.test.ts
│   │   ├── data-pipeline.test.ts
│   │   └── full-workflow.test.ts
│   ├── performance/
│   │   ├── benchmarks.test.ts
│   │   └── memory.test.ts
│   └── types/
│       └── type-tests.ts
└── test/
    ├── setup.ts
    ├── helpers.ts
    └── fixtures/
        ├── generators.ts
        └── mock-data.ts
```

## CI/CD Integration

### **GitHub Actions Workflow**
```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18, 20, 21]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run test:types
      
      - name: Run unit tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Bundle size check
        run: npm run build && npm run analyze
```

## Best Practices

### **1. Test Organization**
- Group tests by feature/pillar
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent and isolated

### **2. Mock Strategy**
- Mock external dependencies (APIs, databases)
- Use MSW for HTTP mocking
- Avoid mocking internal Kairo functions
- Test real integration paths when possible

### **3. Coverage Goals**
- 90% overall coverage
- 100% coverage for core utilities (Result, errors)
- Focus on critical paths and edge cases
- Don't sacrifice quality for coverage percentage

### **4. Performance Testing**
- Set realistic performance benchmarks
- Test memory usage patterns
- Validate large dataset handling
- Monitor regression in CI/CD

---

**This testing strategy ensures comprehensive coverage of Kairo V2's functionality while maintaining fast feedback loops and high confidence in the codebase.**