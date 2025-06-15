import { z } from 'zod'
import { resource, schema } from '../src'

// Type definitions for our User data
interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

// Define schemas for our API
const UserSchema = schema.from(
  z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    createdAt: z.string().datetime(),
  })
)

const CreateUserSchema = schema.from(
  z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })
)

const UserListSchema = schema.array(UserSchema)

// Create a resource with contract testing capabilities
const UserAPI = resource(
  'users',
  {
    list: {
      method: 'GET',
      path: '/users',
      response: UserListSchema,
    },
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
  },
  {
    baseUrl: 'https://api.example.com',
    defaultRetry: { times: 3, delay: 1000 },
  }
)

// Example 1: Contract Verification
export async function verifyApiContract() {
  console.log('🔍 Verifying API Contract...\n')

  const contract = UserAPI.contract()
  const result = await contract.verify('https://api.staging.example.com', {
    validateResponses: true,
    timeout: 5000,
    headers: {
      Authorization: 'Bearer test-token',
    },
  })

  if (result.success) {
    console.log('✅ Contract verification passed!')
    console.log(`   - All endpoints reachable: ${result.validations.urlExists}`)
    console.log(`   - Response schemas match: ${result.validations.schemaMatches}`)
    console.log(`   - Authentication works: ${result.validations.authenticationWorks}`)
    console.log(`   - Average response time: ${Math.round(result.performance.responseTime / 3)}ms`)
  } else {
    console.log('❌ Contract verification failed!')
    console.log(`   - Errors: ${result.errors.length}`)
    result.errors.forEach(error => {
      console.log(`   - ${error.type}: ${error.message} (${error.endpoint})`)
    })
  }
}

// Example 2: Mock Generation for Testing
async function demonstrateMocking() {
  console.log('\n🎭 Demonstrating Mock Generation...\n')

  // Create mocked version of our API
  const mockedAPI = UserAPI.mock({
    list: {
      success: [
        { id: '1', name: 'Alice', email: 'alice@example.com', createdAt: '2024-01-01T00:00:00Z' },
        { id: '2', name: 'Bob', email: 'bob@example.com', createdAt: '2024-01-02T00:00:00Z' },
      ],
      delay: 50, // Simulate network delay
    },
    get: {
      success: {
        id: '1',
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: '2024-01-01T00:00:00Z',
      },
      probability: 0.9, // 90% success rate
      failure: {
        code: 'NOT_FOUND',
        message: 'User not found',
        timestamp: Date.now(),
        context: { status: 404 },
      },
    },
    create: {
      success: {
        id: '3',
        name: 'Charlie',
        email: 'charlie@example.com',
        createdAt: '2024-01-03T00:00:00Z',
      },
    },
  })

  // Use mocked endpoints
  console.log('📋 Fetching user list...')
  const listResult = await mockedAPI.list.run()
  if (listResult.tag === 'Ok') {
    console.log(`   Found ${(listResult.value as User[]).length} users`)
  }

  console.log('\n👤 Fetching specific user (90% success rate)...')
  const getResult = await mockedAPI.get.run({ id: '1' })
  if (getResult.tag === 'Ok') {
    console.log(`   Found user: ${(getResult.value as User).name}`)
  } else {
    console.log(`   Error: ${getResult.error.message}`)
  }

  console.log('\n➕ Creating new user...')
  const createResult = await mockedAPI.create.run({ name: 'Charlie', email: 'charlie@example.com' })
  if (createResult.tag === 'Ok') {
    console.log(`   Created user with ID: ${(createResult.value as User).id}`)
  }
}

// Example 3: Generate Test Suite
function generateTestSuite() {
  console.log('\n🧪 Generating Test Suite...\n')

  const contract = UserAPI.contract()
  const testSuite = contract.generateTests()

  console.log(`Test Suite: ${testSuite.name}`)
  console.log('Tests:')
  testSuite.tests.forEach(test => {
    console.log(`  - ${test.name}`)
    console.log(`    Method: ${test.method}`)
    console.log(`    Endpoint: ${test.endpoint}`)
    if (test.expectedSchema) {
      console.log(`    Has response validation: ✓`)
    }
  })
}

// Example 4: Development Workflow with Mocks
async function developmentWorkflow() {
  console.log('\n💻 Development Workflow Example...\n')

  // During development, use mocks for faster iteration
  const devAPI = UserAPI.mock({
    list: {
      success: Array.from({ length: 5 }, (_, i) => ({
        id: String(i + 1),
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        createdAt: new Date().toISOString(),
      })),
      delay: 20,
    },
    get: {
      success: {
        id: '1',
        name: 'User 1',
        email: 'user1@example.com',
        createdAt: new Date().toISOString(),
      },
    },
    create: {
      success: {
        id: String(Date.now()),
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date().toISOString(),
      },
    },
  })

  // Simulate a typical workflow
  console.log('1️⃣ Fetch initial user list')
  const users = await devAPI.list.run()
  console.log(`   Got ${users.tag === 'Ok' ? (users.value as User[]).length : 0} users`)

  console.log('\n2️⃣ Create a new user')
  const newUser = await devAPI.create.run({ name: 'Test User', email: 'test@example.com' })
  if (newUser.tag === 'Ok') {
    console.log(`   Created user with ID: ${(newUser.value as User).id}`)

    console.log('\n3️⃣ Fetch the created user')
    const fetchedUser = await devAPI.get.run({ id: (newUser.value as User).id })
    if (fetchedUser.tag === 'Ok') {
      console.log(`   Verified user: ${(fetchedUser.value as User).name}`)
    }
  }
}

// Run examples
async function main() {
  console.log('🚀 Kairo Contract Testing Examples\n')
  console.log('='.repeat(50))

  // Note: Contract verification requires a real API endpoint
  // await verifyApiContract()

  await demonstrateMocking()
  generateTestSuite()
  await developmentWorkflow()

  console.log('\n' + '='.repeat(50))
  console.log('✨ Examples completed!')
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { UserAPI, UserSchema, CreateUserSchema }
