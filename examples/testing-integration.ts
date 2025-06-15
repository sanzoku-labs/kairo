// Example demonstrating the Enhanced Testing Integration capabilities
import { z } from 'zod'
import {
  pipeline,
  resource,
  schema,
  nativeSchema,
  transform,
  repository,
  MemoryStorageAdapter,
  Result,

  // New testing utilities
  pipelineTesting,
  resourceTesting,
  schemaTesting,
  transformTesting,
  repositoryTesting,
  performanceTesting,
  integrationTesting,
} from '../src/index'

interface MockConfig {
  data?: unknown
  success?: unknown
  failure?: {
    code: string
    message: string
    timestamp: number
    context: Record<string, unknown>
  }
  rate?: number
}

interface MockFunction {
  call: (...args: unknown[]) => Result<unknown, unknown>
  getCallCount: () => number
}

// Create a minimal mock factory placeholder for the example
const mockFactory = {
  createFunction: (config: MockConfig): MockFunction => ({
    call: (..._args: unknown[]) => Result.Ok(config.data || config),
    getCallCount: () => 1,
  }),
  success: (data: unknown) => ({ data }),
  probabilistic: (success: unknown, failure: unknown, rate: number) => ({ success, failure, rate }),
  sequence: (items: unknown[]) => items,
}

// Example 1: Pipeline Testing
const userPipeline = pipeline('user-processing')
  .input(
    schema.object({
      name: z.string(),
      email: z.string().email(),
    })
  )
  .map(user => ({ ...user, id: Date.now() }))

async function testPipeline() {
  console.log('🧪 Testing Pipeline...')

  // Create test cases
  const testCases = [
    pipelineTesting.testCase('valid user creation', {
      name: 'John Doe',
      email: 'john@example.com',
    }),
    pipelineTesting.testCase(
      'invalid email format',
      { name: 'Jane', email: 'invalid-email' },
      { expectedError: { code: 'VALIDATION_ERROR' } }
    ),
  ]

  // Run tests
  const results = await pipelineTesting.runTests(userPipeline, testCases)
  console.log(`  ✅ ${results.passedTests}/${results.totalTests} tests passed`)

  // Test with assertions
  const assertion = pipelineTesting.expect(userPipeline, {
    name: 'Test User',
    email: 'test@example.com',
  })
  await assertion.shouldSucceed()
  await assertion.shouldCompleteWithin(100)
}

// Example 2: Resource Testing
const userApi = resource('users', {
  get: {
    method: 'GET',
    path: '/users/:id',
    params: schema.object({ id: z.string() }),
    response: schema.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  },
  create: {
    method: 'POST',
    path: '/users',
    body: schema.object({
      name: z.string(),
      email: z.string(),
    }),
    response: schema.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  },
})

function testResource() {
  console.log('🧪 Testing Resource...')

  const tester = resourceTesting.createTester(userApi)

  // Create test scenarios
  const testCases = {
    get: [
      resourceTesting.testCase('get existing user', 'get', {
        params: { id: '123' },
        expectedData: { id: '123', name: 'John', email: 'john@example.com' },
      }),
      resourceTesting.testCase('get non-existing user', 'get', {
        params: { id: '999' },
        expectedError: { status: 404 },
      }),
    ],
  }

  console.log('Resource tester created:', tester.constructor.name)
  console.log('Test cases prepared:', Object.keys(testCases).length)

  // Create mock scenarios
  const mockScenarios = [
    resourceTesting.mockScenario(
      'successful user fetch',
      { method: 'GET', path: '/users/123' },
      resourceTesting.mockResponses.success({ id: '123', name: 'John', email: 'john@example.com' })
    ),
    resourceTesting.mockScenario(
      'user not found',
      { method: 'GET', path: '/users/999' },
      resourceTesting.mockResponses.error(404, 'User not found')
    ),
  ]

  console.log('  📋 Mock scenarios created:', mockScenarios.length)
}

// Example 3: Schema Testing
const UserSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(2).max(50),
  email: nativeSchema.string().email(),
  age: nativeSchema.number().min(0).max(150),
})

function testSchema() {
  console.log('🧪 Testing Schema...')

  const tester = schemaTesting.createTester(UserSchema)

  // Create test cases
  const testCases = [
    schemaTesting.testCase(
      'valid user data',
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      },
      true
    ),
    schemaTesting.testCase(
      'invalid email',
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'invalid-email',
        age: 30,
      },
      false
    ),
    schemaTesting.testCase(
      'age too high',
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john@example.com',
        age: 200,
      },
      false
    ),
  ]

  const results = tester.testCases(testCases as Parameters<typeof tester.testCases>[0])
  console.log(`  ✅ ${results.passedTests}/${results.totalTests} schema tests passed`)

  // Property-based testing
  const propertyResults = tester.propertyTest(
    () => ({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: schemaTesting.generators.randomString(10),
      email: `${schemaTesting.generators.randomString(5)}@example.com`,
      age: schemaTesting.generators.randomNumber(0, 150),
    }),
    50
  )

  console.log(
    `  🎲 Property test: ${propertyResults.passed}/${propertyResults.totalIterations} passed`
  )
}

// Example 4: Transform Testing
const userTransform = transform(
  'user-normalization',
  nativeSchema.object({
    user_name: nativeSchema.string(),
    user_email: nativeSchema.string(),
    user_age: nativeSchema.number(),
  })
)
  .to(UserSchema.omit(['id']))
  .map('user_name', 'name')
  .map('user_email', 'email')
  .map('user_age', 'age')

function testTransform() {
  console.log('🧪 Testing Transform...')

  const tester = transformTesting.createTester(userTransform)

  // Test field mappings
  const mappingTests = [
    transformTesting.fieldMappingTest('user_name', 'name', 'John Doe', 'John Doe'),
    transformTesting.fieldMappingTest(
      'user_email',
      'email',
      'john@example.com',
      'john@example.com'
    ),
    transformTesting.fieldMappingTest('user_age', 'age', 30, 30),
  ]

  const mappingResults = tester.testFieldMappings(mappingTests)
  console.log(
    `  ✅ ${mappingResults.passedMappings}/${mappingResults.totalMappings} field mappings correct`
  )

  // Performance test
  const performanceResults = tester.performanceTest(
    {
      user_name: 'Test User',
      user_email: 'test@example.com',
      user_age: 25,
    },
    1000
  )

  if ('averageDuration' in performanceResults) {
    console.log(
      `  ⚡ Transform performance: ${performanceResults.averageDuration.toFixed(2)}ms average, ${performanceResults.successRate.toFixed(1)}% success rate`
    )
  }
}

// Example 5: Repository Testing
const userRepository = repository('users', {
  schema: UserSchema,
  storage: new MemoryStorageAdapter(),
  timestamps: true,
})

async function testRepository() {
  console.log('🧪 Testing Repository...')

  const tester = repositoryTesting.createTester(userRepository)

  // Test CRUD operations
  const crudResults = await tester.testCRUD({
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test User',
    email: 'test@example.com',
    age: 30,
  })

  console.log(
    `  ✅ ${crudResults.passedOperations}/${crudResults.totalOperations} CRUD operations passed`
  )

  // Performance test
  const perfResults = await tester.performanceTest(
    'create',
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Perf Test User',
      email: 'perf@example.com',
      age: 25,
    },
    100
  )

  console.log(
    `  ⚡ Repository performance: ${perfResults.averageDuration.toFixed(2)}ms average, ${perfResults.throughputPerSecond.toFixed(0)} ops/sec`
  )
}

// Example 6: Performance Testing
async function testPerformance() {
  console.log('🧪 Testing Performance...')

  const performanceTester = performanceTesting.createTester()

  // Test async function performance
  const result = await performanceTester.test(
    'schema validation',
    async () => {
      await Promise.resolve(
        UserSchema.parse({
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Performance Test',
          email: 'perf@example.com',
          age: 30,
        })
      )
    },
    { iterations: 1000, concurrency: 10 }
  )

  console.log(
    `  ⚡ Performance: ${result.metrics.averageDuration.toFixed(2)}ms avg, ${result.metrics.throughput.toFixed(0)} ops/sec`
  )
  console.log(
    `  📊 P95: ${result.metrics.p95Duration.toFixed(2)}ms, Success Rate: ${result.metrics.successRate.toFixed(1)}%`
  )
}

// Example 7: Mock Factory
function testMocks() {
  console.log('🧪 Testing Mocks...')

  // Create various mock behaviors
  const successMock = mockFactory.createFunction(mockFactory.success({ message: 'Success!' }))

  const probabilisticMock = mockFactory.createFunction(
    mockFactory.probabilistic(
      { data: 'success' },
      { code: 'RANDOM_FAILURE', message: 'Random failure', timestamp: Date.now(), context: {} },
      0.8 // 80% success rate
    ) as MockConfig
  )

  console.log('Probabilistic mock created:', typeof probabilisticMock)

  const sequenceMock = mockFactory.createFunction(
    mockFactory.sequence([
      {
        failure: {
          code: 'FIRST_FAIL',
          message: 'First call fails',
          timestamp: Date.now(),
          context: {},
        },
      },
      {
        failure: {
          code: 'SECOND_FAIL',
          message: 'Second call fails',
          timestamp: Date.now(),
          context: {},
        },
      },
      { success: { data: 'Third call succeeds' } },
    ]) as MockConfig
  )

  // Test the mocks
  const successResult = successMock.call('test')
  console.log(`  ✅ Success mock: ${Result.isOk(successResult) ? 'PASS' : 'FAIL'}`)

  const sequenceResults = []
  for (let i = 0; i < 3; i++) {
    const result = sequenceMock.call(`call-${i}`)
    sequenceResults.push(Result.isOk(result) ? 'SUCCESS' : 'FAILURE')
  }
  console.log(`  📊 Sequence mock: [${sequenceResults.join(', ')}]`)
  console.log(`  📈 Success mock called ${successMock.getCallCount()} times`)
}

// Example 8: Integration Testing
async function testIntegration() {
  console.log('🧪 Testing Integration...')

  const integrationTester = integrationTesting.createTester()

  // Register components
  integrationTester.registerPipeline('user-pipeline', userPipeline)
  integrationTester.registerResource('user-api', userApi)
  integrationTester.registerRepository('user-repo', userRepository)

  // Create integration scenario
  const scenario = integrationTesting.scenario(
    'complete user flow',
    { name: 'Integration Test User', email: 'integration@example.com' },
    true,
    {
      description: 'Test complete user creation flow',
      expectedOutput: {
        name: 'Integration Test User',
        email: 'integration@example.com',
        id: 123, // Using a placeholder number
      },
    }
  )

  // Test the scenario
  const result = await integrationTester.testScenario(scenario, {
    pipeline: userPipeline,
  })

  console.log(
    `  ✅ Integration test: ${result.passed ? 'PASS' : 'FAIL'} (${result.duration.toFixed(2)}ms)`
  )
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Kairo Enhanced Testing Integration Demo\n')

  try {
    await testPipeline()
    testResource()
    testSchema()
    testTransform()
    await testRepository()
    await testPerformance()
    testMocks()
    await testIntegration()

    console.log('\n✨ All testing examples completed successfully!')
    console.log('\n📚 Available Testing Utilities:')
    console.log('  • pipelineTesting - Test pipeline execution and composition')
    console.log('  • resourceTesting - Test API resources with mocking')
    console.log('  • schemaTesting - Validate schemas with property-based testing')
    console.log('  • transformTesting - Test data transformations and mappings')
    console.log('  • repositoryTesting - Test CRUD operations and relationships')
    console.log('  • performanceTesting - Benchmark and load testing')
    console.log('  • mockFactory - Create sophisticated mocks and behaviors')
    console.log('  • integrationTesting - End-to-end workflow testing')
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Note: This is a demonstration file - uncomment to run
// runAllTests()

export {
  runAllTests,
  testPipeline,
  testResource,
  testSchema,
  testTransform,
  testRepository,
  testPerformance,
  testMocks,
  testIntegration,
}
