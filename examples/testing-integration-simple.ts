// Simplified example demonstrating the Enhanced Testing Integration capabilities
import {
  pipeline,
  schema,

  // Testing utilities
  pipelineTesting,
  schemaTesting,
  performanceTesting,
} from '../src/index'

// Example 1: Pipeline Testing with Native Schema
const userPipeline = pipeline<{ name: string; email: string }>('user-processing').map(user => ({
  ...user,
  id: Date.now(),
}))

async function testPipeline() {
  console.log('🧪 Testing Pipeline...')

  // Test with assertions
  const assertion = pipelineTesting.expect(userPipeline, {
    name: 'Test User',
    email: 'test@example.com',
  })
  await assertion.shouldSucceed()
  await assertion.shouldCompleteWithin(100)
}

// Example 2: Native Schema Testing
const UserSchema = schema.object({
  id: schema.string().uuid(),
  name: schema.string().min(2).max(50),
  email: schema.string().email(),
  age: schema.number().min(0).max(150),
})

function testSchema() {
  console.log('🧪 Testing Native Schema...')

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
    100
  )
  console.log(
    `  🎲 Property testing: ${propertyResults.passed}/${propertyResults.totalIterations} passed`
  )
}

// Example 3: Performance Testing
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
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Kairo Enhanced Testing Integration Demo (Simplified)\n')

  try {
    await testPipeline()
    testSchema()
    await testPerformance()
    console.log('\n✨ All tests completed!')
  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error))
    // Exit with error code if available
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1)
    }
  }
}

// Execute if run directly (Node.js environment)
declare const process: { env: Record<string, string | undefined>; exit?: (code: number) => void }
if (typeof process !== 'undefined' && process.env) {
  void runAllTests()
}
