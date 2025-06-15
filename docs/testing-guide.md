# Enhanced Testing Integration Guide

Kairo provides comprehensive testing utilities for all three pillars of the architecture, enabling thorough testing of pipelines, resources, schemas, transforms, repositories, and end-to-end integration flows.

## Quick Start

```typescript
import {
  pipelineTesting,
  resourceTesting,
  schemaTesting,
  transformTesting,
  repositoryTesting,
  integrationTesting,
  performanceTesting,
} from 'kairo/testing'
```

## Pipeline Testing

Test pipeline execution with fluent assertions and step-by-step validation.

### Basic Pipeline Testing

```typescript
import { pipeline, nativeSchema } from 'kairo'
import { pipelineTesting } from 'kairo/testing'

const userPipeline = pipeline('user-processing')
  .input(
    nativeSchema.object({
      name: nativeSchema.string(),
      email: nativeSchema.string().email(),
    })
  )
  .map(user => ({ ...user, id: Date.now() }))
  .map(user => ({ ...user, slug: user.name.toLowerCase().replace(/\s+/g, '-') }))

// Test successful execution
await pipelineTesting
  .expect(userPipeline, { name: 'John Doe', email: 'john@example.com' })
  .shouldSucceed()
  .shouldReturnValue({
    name: 'John Doe',
    email: 'john@example.com',
    id: expect.any(Number),
    slug: 'john-doe',
  })
  .shouldCompleteWithin(100)

// Test failure scenarios
await pipelineTesting
  .expect(userPipeline, { name: '', email: 'invalid-email' })
  .shouldFail()
  .shouldFailWithError({ code: 'VALIDATION_ERROR' })
```

### Batch Pipeline Testing

```typescript
const testCases = [
  pipelineTesting.testCase('valid user', { name: 'John', email: 'john@example.com' }),
  pipelineTesting.testCase(
    'invalid email',
    { name: 'Jane', email: 'invalid' },
    {
      expectedError: { code: 'VALIDATION_ERROR' },
    }
  ),
]

const results = await pipelineTesting.runTests(userPipeline, testCases)
console.log(`${results.passedTests}/${results.totalTests} tests passed`)
```

## Resource Testing

Test API resources with mock scenarios and contract verification.

### Mock Scenarios

```typescript
import { resource, nativeSchema } from 'kairo'
import { resourceTesting } from 'kairo/testing'

const UserAPI = resource('users', {
  get: {
    path: '/users/:id',
    params: nativeSchema.object({ id: nativeSchema.string() }),
    response: nativeSchema.object({
      id: nativeSchema.string(),
      name: nativeSchema.string(),
      email: nativeSchema.string(),
    }),
  },
})

const tester = resourceTesting.createTester(UserAPI)

// Create mock scenarios
const scenarios = [
  resourceTesting.mockScenario(
    'successful get',
    { method: 'GET', path: '/users/1' },
    resourceTesting.mockResponses.success({ id: '1', name: 'John', email: 'john@example.com' })
  ),
  resourceTesting.mockScenario(
    'user not found',
    { method: 'GET', path: '/users/999' },
    resourceTesting.mockResponses.error(404, 'User not found')
  ),
  resourceTesting.mockScenario(
    'delayed response',
    { method: 'GET', path: '/users/2' },
    resourceTesting.mockResponses.delayed({ id: '2', name: 'Jane' }, 1000)
  ),
]

// Test with mock data
const mockData = tester.createMockScenarios(scenarios)
const results = await tester.testOperations({
  get: [
    resourceTesting.testCase('get existing user', 'get', { params: { id: '1' } }),
    resourceTesting.testCase('get missing user', 'get', {
      params: { id: '999' },
      expectedError: { status: 404 },
    }),
  ],
})
```

### Contract Testing

```typescript
// Verify resource contract against live API
const contractResults = await tester.verifyContract({
  baseUrl: 'https://api.staging.com',
  timeout: 5000,
  headers: { Authorization: 'Bearer test-token' },
})

console.log(
  `${contractResults.passedOperations}/${contractResults.totalOperations} operations verified`
)
```

## Schema Testing

Test schema validation with property-based testing and automatic test case generation.

### Basic Schema Testing

```typescript
import { nativeSchema } from 'kairo'
import { schemaTesting } from 'kairo/testing'

const UserSchema = nativeSchema.object({
  name: nativeSchema.string().min(2).max(50),
  email: nativeSchema.string().email(),
  age: nativeSchema.number().min(0).max(150),
  active: nativeSchema.boolean().optional(),
})

const tester = schemaTesting.createTester(UserSchema)

// Test individual cases
const testCases = [
  schemaTesting.testCase(
    'valid user',
    {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    },
    true
  ),
  schemaTesting.testCase(
    'invalid email',
    {
      name: 'Jane',
      email: 'invalid-email',
      age: 25,
    },
    false,
    {
      expectedError: { field: 'email', code: 'INVALID_EMAIL' },
    }
  ),
]

const results = await tester.testCases(testCases)
```

### Property-Based Testing

```typescript
// Automatic property-based testing
const propertyResults = tester.propertyTest(
  () => ({
    name: schemaTesting.generators.randomString(10),
    email: `${schemaTesting.generators.randomString(5)}@example.com`,
    age: schemaTesting.generators.randomNumber(0, 150),
    active: schemaTesting.generators.randomBoolean(),
  }),
  1000
)

console.log(`Property test: ${propertyResults.passed}/${propertyResults.totalIterations} passed`)
```

### Automatic Test Case Generation

```typescript
// Generate comprehensive test cases automatically
const generatedCases = tester.generateTestCases({
  includeValidCases: true,
  includeInvalidCases: true,
  includeEdgeCases: true,
  customCases: [
    schemaTesting.testCase(
      'custom case',
      { name: 'Special', email: 'special@example.com', age: 100 },
      true
    ),
  ],
})

const allResults = await tester.testCases(generatedCases)
```

## Transform Testing

Test data transformations with field mapping validation and batch processing.

### Field Mapping Testing

```typescript
import { transform, nativeSchema } from 'kairo'
import { transformTesting } from 'kairo/testing'

const sourceSchema = nativeSchema.object({
  user_name: nativeSchema.string(),
  user_email: nativeSchema.string(),
  created_at: nativeSchema.string(),
})

const targetSchema = nativeSchema.object({
  name: nativeSchema.string(),
  email: nativeSchema.string(),
  createdAt: nativeSchema.string(),
})

const userTransform = transform('user-normalization', sourceSchema)
  .to(targetSchema)
  .map('user_name', 'name')
  .map('user_email', 'email')
  .map('created_at', 'createdAt', source => new Date(source.created_at).toISOString())
  .compute('displayName', source => `${source.user_name} <${source.user_email}>`)
  .filter(user => user.user_name.length > 0)

const tester = transformTesting.createTester(userTransform)

// Test field mappings
const mappingTests = [
  transformTesting.fieldMappingTest('user_name', 'name', 'John Doe', 'John Doe'),
  transformTesting.fieldMappingTest('user_email', 'email', 'john@example.com', 'john@example.com'),
  transformTesting.fieldMappingTest('created_at', 'createdAt', '2023-01-01', source =>
    new Date(source).toISOString()
  ),
]

const mappingResults = await tester.testFieldMappings(mappingTests)
```

### Transform Performance Testing

```typescript
// Performance testing with large datasets
const performanceResults = await tester.performanceTest(
  {
    user_name: 'John Doe',
    user_email: 'john@example.com',
    created_at: '2023-01-01',
  },
  10000
)

console.log(`
  Average duration: ${performanceResults.averageDuration.toFixed(2)}ms
  Throughput: ${performanceResults.throughputPerSecond.toFixed(0)} ops/sec
  Success rate: ${performanceResults.successRate.toFixed(1)}%
`)
```

### Batch Transform Testing

```typescript
// Test batch processing
const batchInputs = Array.from({ length: 100 }, (_, i) => ({
  user_name: `User ${i}`,
  user_email: `user${i}@example.com`,
  created_at: new Date().toISOString(),
}))

const batchResults = await tester.testBatch(batchInputs)
console.log(`Batch test: ${batchResults.successful}/${batchResults.totalInputs} successful`)
```

## Repository Testing

Test repository CRUD operations, relationships, and lifecycle hooks.

### Basic Repository Testing

```typescript
import { repository, nativeSchema, hasMany } from 'kairo'
import { repositoryTesting } from 'kairo/testing'

const UserSchema = nativeSchema.object({
  id: nativeSchema.string(),
  name: nativeSchema.string(),
  email: nativeSchema.string(),
})

const userRepository = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  relationships: {
    posts: hasMany('posts', 'userId', PostSchema),
  },
  hooks: {
    beforeCreate: data => ({ ...data, createdAt: new Date().toISOString() }),
    afterCreate: user => console.log(`User ${user.name} created`),
  },
})

const tester = repositoryTesting.createTester(userRepository)

// Test CRUD operations
const crudResults = await tester.testCRUD([
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' },
])

// Test relationships
const relationshipResults = await tester.testRelationships('users', 'posts', {
  userId: 'user-1',
  title: 'Test Post',
  content: 'Test content',
})

// Test hooks
const hookResults = await tester.testHooks({
  beforeCreate: data => expect(data).toHaveProperty('createdAt'),
  afterCreate: user => expect(user).toHaveProperty('id'),
})
```

## Integration Testing

Test end-to-end flows across multiple pillars.

### Cross-Pillar Integration Testing

```typescript
import { integrationTesting } from 'kairo/testing'

const integrationTest = integrationTesting
  .createTest('user-onboarding')
  .withResource('userAPI', UserAPI)
  .withPipeline('processor', userPipeline)
  .withTransform('normalizer', userTransform)
  .withRepository('userRepo', userRepository)

// Define test scenarios
integrationTest.scenario('complete user flow', async context => {
  const rawUserData = {
    user_name: 'John Doe',
    user_email: 'john@example.com',
    created_at: '2023-01-01',
  }

  // Test the complete flow
  const normalized = await context.transform('normalizer').execute(rawUserData)
  context.expect(normalized).toBeOk()

  const processed = await context.pipeline('processor').run(normalized.value)
  context.expect(processed).toBeOk()

  const stored = await context.repository('userRepo').create(processed.value)
  context.expect(stored).toBeOk()

  const retrieved = await context.resource('userAPI').get.run({ id: stored.value.id })
  context.expect(retrieved).toBeOk()
  context.expect(retrieved.value.name).toBe('John Doe')
})

// Run integration tests
const integrationResults = await integrationTest.run()
```

## Performance Testing

Comprehensive performance testing utilities for load testing and benchmarking.

### Load Testing

```typescript
import { performanceTesting } from 'kairo/testing'

// Pipeline load testing
const pipelineLoadResults = await performanceTesting.loadTest(userPipeline, testData, {
  concurrency: 10,
  requests: 1000,
  duration: 30000, // 30 seconds
  rampUp: 5000, // 5 second ramp-up
})

console.log(`
  Total requests: ${pipelineLoadResults.totalRequests}
  Success rate: ${pipelineLoadResults.successRate}%
  Average response time: ${pipelineLoadResults.averageResponseTime}ms
  Requests per second: ${pipelineLoadResults.requestsPerSecond}
`)

// Resource load testing
const resourceLoadResults = await performanceTesting.loadTestResource(
  UserAPI.get,
  { id: 'test-user' },
  {
    concurrency: 20,
    requests: 2000,
  }
)
```

### Memory and Performance Profiling

```typescript
// Memory usage profiling
const memoryProfile = await performanceTesting.profileMemory(async () => {
  for (let i = 0; i < 10000; i++) {
    await userPipeline.run(testData)
  }
})

console.log(`
  Initial memory: ${memoryProfile.initialMemory}MB
  Peak memory: ${memoryProfile.peakMemory}MB
  Final memory: ${memoryProfile.finalMemory}MB
  Memory growth: ${memoryProfile.memoryGrowth}MB
`)

// CPU profiling
const cpuProfile = await performanceTesting.profileCPU(async () => {
  await Promise.all(Array.from({ length: 1000 }, () => userPipeline.run(testData)))
})
```

## Advanced Mock Factory

Create sophisticated mocks with probabilistic behaviors and sequences.

### Probabilistic Mocking

```typescript
import { mockFactory } from 'kairo/testing'

// Create a mock that fails 20% of the time
const probabilisticMock = mockFactory.create({
  success: { data: { success: true } },
  failure: { code: 'RANDOM_FAILURE', message: 'Random failure occurred' },
  probability: 0.8, // 80% success rate
})

// Mock with sequence behaviors
const sequenceMock = mockFactory.createSequence([
  { data: { attempt: 1 } },
  { code: 'TEMPORARY_ERROR', message: 'Temporary error' },
  { data: { attempt: 3, success: true } },
])

// Mock with delayed responses
const delayedMock = mockFactory.createDelayed({
  data: { delayed: true },
  delay: { min: 100, max: 500 }, // Random delay between 100-500ms
})
```

## Best Practices

### Test Organization

```typescript
// Organize tests by pillar and feature
describe('User Management', () => {
  describe('Pipeline Tests', () => {
    it('should process valid user data', async () => {
      await pipelineTesting.expect(userPipeline, validData).shouldSucceed()
    })
  })

  describe('Resource Tests', () => {
    it('should handle API errors gracefully', async () => {
      const tester = resourceTesting.createTester(UserAPI)
      // Test implementation
    })
  })

  describe('Integration Tests', () => {
    it('should complete full user onboarding flow', async () => {
      const test = integrationTesting.createTest('onboarding')
      // Test implementation
    })
  })
})
```

### Test Data Management

```typescript
// Use factories for consistent test data
const testDataFactory = {
  user: (overrides = {}) => ({
    name: 'Test User',
    email: 'test@example.com',
    age: 30,
    ...overrides,
  }),

  rawUser: (overrides = {}) => ({
    user_name: 'Test User',
    user_email: 'test@example.com',
    created_at: new Date().toISOString(),
    ...overrides,
  }),
}

// Use the factory in tests
const userData = testDataFactory.user({ name: 'John Doe' })
const rawUserData = testDataFactory.rawUser({ user_name: 'Jane Doe' })
```

### Continuous Testing

```typescript
// Set up automated testing pipelines
const testSuite = {
  unit: async () => {
    const results = await Promise.all([
      pipelineTesting.runTests(userPipeline, pipelineTestCases),
      schemaTesting.createTester(UserSchema).testCases(schemaTestCases),
      transformTesting.createTester(userTransform).testCases(transformTestCases),
    ])
    return results
  },

  integration: async () => {
    return await integrationTesting.createTest('full-suite').withAllComponents().runAllScenarios()
  },

  performance: async () => {
    return await performanceTesting.runFullSuite({
      pipelines: [userPipeline],
      resources: [UserAPI],
      transforms: [userTransform],
      repositories: [userRepository],
    })
  },
}

// Run comprehensive test suite
const allResults = await Promise.all([
  testSuite.unit(),
  testSuite.integration(),
  testSuite.performance(),
])
```

This comprehensive testing framework ensures that all aspects of your Kairo application are thoroughly tested, from individual components to complex end-to-end flows, with performance characteristics and edge cases covered.
