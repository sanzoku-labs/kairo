# Contract Testing Examples

Learn how to use Kairo's contract testing features to ensure API reliability and speed up development with mocks.

## Basic Contract Verification

Verify that your API endpoints match your resource definitions:

```typescript
import { resource, schema } from 'kairo'
import { z } from 'zod'

const UserAPI = resource('users', {
  get: {
    method: 'GET',
    path: '/users/:id',
    params: schema.from(z.object({ id: z.string() })),
    response: schema.from(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
      })
    ),
  },
})

// Verify the contract
async function verifyUserAPI() {
  const result = await UserAPI.contract().verify('https://api.example.com', {
    validateResponses: true,
    timeout: 5000,
  })

  if (!result.success) {
    console.error('Contract verification failed!')
    result.errors.forEach(error => {
      console.error(`${error.type}: ${error.message}`)
    })
    process.exit(1)
  }

  console.log('✅ API contract verified successfully')
}
```

## Development with Mocks

Speed up frontend development by working with mocked APIs:

```typescript
// Create mocked version of your API
const mockedAPI = UserAPI.mock({
  get: {
    success: {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
    },
    delay: 50, // Simulate network latency
  },
  create: {
    success: {
      id: '456',
      name: 'New User',
      email: 'new@example.com',
    },
  },
})

// Use mocked API exactly like the real one
async function developWithMocks() {
  const result = await mockedAPI.get.run({ id: '123' })

  if (result.tag === 'Ok') {
    console.log('User:', result.value.name)
  }
}
```

## Testing Error Scenarios

Test how your application handles various error conditions:

```typescript
import { createError } from 'kairo'

const errorScenarios = UserAPI.mock({
  get: {
    failure: createError('NOT_FOUND', 'User not found'),
    probability: 0, // Always fail
  },
  create: {
    failure: createError('VALIDATION_ERROR', 'Email already exists'),
  },
  list: {
    success: [],
    failure: createError('NETWORK_ERROR', 'Service unavailable'),
    probability: 0.5, // 50% failure rate
  },
})

// Test error handling
describe('Error handling', () => {
  it('handles not found errors', async () => {
    const result = await errorScenarios.get.run({ id: '999' })

    expect(result.tag).toBe('Err')
    expect(result.error.code).toBe('NOT_FOUND')
  })

  it('handles validation errors', async () => {
    const result = await errorScenarios.create.run({
      name: 'Test User',
      email: 'existing@example.com',
    })

    expect(result.tag).toBe('Err')
    expect(result.error.code).toBe('VALIDATION_ERROR')
  })
})
```

## CI/CD Integration

Set up automated contract verification in your CI/CD pipeline:

```typescript
// verify-contracts.ts
import { UserAPI, OrderAPI, ProductAPI } from './resources'

const APIs = [
  { name: 'Users', resource: UserAPI },
  { name: 'Orders', resource: OrderAPI },
  { name: 'Products', resource: ProductAPI },
]

async function verifyAllContracts() {
  const baseURL = process.env.API_URL || 'https://api.staging.com'
  const token = process.env.API_TOKEN

  console.log(`Verifying contracts against ${baseURL}...`)

  let allPassed = true

  for (const { name, resource } of APIs) {
    console.log(`\nVerifying ${name} API...`)

    const result = await resource.contract().verify(baseURL, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      validateResponses: true,
      timeout: 10000,
      retries: 3,
    })

    if (result.success) {
      console.log(`✅ ${name} API: All endpoints verified`)
      console.log(`   Response time: ${result.performance.responseTime}ms`)
      console.log(`   Availability: ${result.performance.availability}%`)
    } else {
      console.log(`❌ ${name} API: Verification failed`)
      result.errors.forEach(error => {
        console.log(`   - ${error.type}: ${error.message} (${error.endpoint})`)
      })
      allPassed = false
    }
  }

  if (!allPassed) {
    process.exit(1)
  }
}

verifyAllContracts().catch(console.error)
```

## Advanced Mock Patterns

### Stateful Mocks

Create mocks that maintain state between calls:

```typescript
class StatefulMockWrapper {
  private users = new Map([
    ['1', { id: '1', name: 'Alice', email: 'alice@example.com' }],
    ['2', { id: '2', name: 'Bob', email: 'bob@example.com' }],
  ])

  private mocked = UserAPI.mock({
    list: {
      success: [], // Will be overridden
    },
    get: {
      success: null, // Will be overridden
    },
    create: {
      success: null, // Will be overridden
    },
  })

  list = {
    run: async () => {
      const users = Array.from(this.users.values())
      return Result.Ok(users)
    },
  }

  get = {
    run: async ({ id }: { id: string }) => {
      const user = this.users.get(id)
      if (!user) {
        return Result.Err(createError('NOT_FOUND', 'User not found'))
      }
      return Result.Ok(user)
    },
  }

  create = {
    run: async (data: { name: string; email: string }) => {
      const id = String(Date.now())
      const user = { id, ...data }
      this.users.set(id, user)
      return Result.Ok(user)
    },
  }
}

const statefulMock = new StatefulMockWrapper()
```

### Testing Different Network Conditions

```typescript
// Simulate various network conditions
const networkConditions = {
  fast: UserAPI.mock({
    get: { success: userData, delay: 20 },
    list: { success: userList, delay: 30 },
  }),

  slow: UserAPI.mock({
    get: { success: userData, delay: 2000 },
    list: { success: userList, delay: 3000 },
  }),

  flaky: UserAPI.mock({
    get: {
      success: userData,
      failure: createError('NETWORK_ERROR', 'Connection reset'),
      probability: 0.7, // 70% success rate
      delay: 500,
    },
  }),
}

// Test UI behavior under different conditions
async function testNetworkResilience() {
  console.log('Testing fast network...')
  await testWithAPI(networkConditions.fast)

  console.log('Testing slow network...')
  await testWithAPI(networkConditions.slow)

  console.log('Testing flaky network...')
  await testWithAPI(networkConditions.flaky)
}
```

## Best Practices

1. **Run contract tests regularly** - Set up scheduled jobs to detect API drift early
2. **Mock early, verify later** - Start development with mocks, verify when backend is ready
3. **Test error paths** - Use mocks to ensure your app handles all error scenarios
4. **Document mock scenarios** - Keep mock definitions close to your test files
5. **Version your contracts** - Track API changes over time

## Complete Example

See the full [contract testing example](https://github.com/sanzok/kairo/blob/main/examples/contract-testing.ts) for a comprehensive demonstration of all features.
