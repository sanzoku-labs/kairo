# Contract Verification API

Contract verification is a core feature of the INTERFACE pillar that ensures your API integrations work correctly by verifying endpoints exist, accept expected parameters, and return data matching your schemas.

> **Core Feature**: Contract verification is fundamental to Kairo's "make infrastructure disappear" philosophy by providing built-in API reliability testing.

## Overview

The contract testing system provides three core capabilities:

1. **Contract Verification** - Validate that live APIs match your resource definitions
2. **Mock Generation** - Create type-safe mocks for testing and development
3. **Test Suite Generation** - Automatically generate test cases from resource definitions

## ResourceContract Interface

Every resource created with Kairo includes contract testing capabilities through the `ResourceContract` interface:

```typescript
interface ResourceContract<T extends ResourceConfig> {
  verify(baseURL?: string, options?: VerifyOptions): Promise<ContractResult>
  generateTests(): TestSuite
  mock(scenarios: MockScenarios<T>): MockedResource<T>
}
```

## Contract Verification

### Basic Usage

```typescript
const UserAPI = resource('users', {
  get: {
    method: 'GET',
    path: '/users/:id',
    params: schema.from(z.object({ id: z.string() })),
    response: UserSchema,
  },
})

// Verify against staging environment
const result = await UserAPI.contract().verify('https://api.staging.com')

if (result.success) {
  console.log('✅ All endpoints verified')
} else {
  console.log('❌ Verification failed:', result.errors)
}
```

### Verify Options

```typescript
interface VerifyOptions {
  timeout?: number // Request timeout in ms (default: 5000)
  headers?: Record<string, string> // Additional headers
  retries?: number // Number of retries
  validateResponses?: boolean // Validate response schemas (default: false)
}
```

### Contract Result

```typescript
interface ContractResult {
  success: boolean
  endpoint: string
  validations: {
    urlExists: boolean // Endpoint is reachable
    schemaMatches: boolean // Response matches schema
    methodSupported: boolean // HTTP method is accepted
    authenticationWorks: boolean // Auth is properly configured
  }
  errors: ContractError[]
  performance: {
    responseTime: number // Total time for all requests
    availability: number // Percentage of successful requests
  }
}
```

### Advanced Verification

```typescript
// Verify with authentication and response validation
const result = await UserAPI.contract().verify('https://api.example.com', {
  headers: {
    Authorization: 'Bearer ' + process.env.API_TOKEN,
  },
  validateResponses: true,
  timeout: 10000,
  retries: 3,
})

// Check specific validations
if (!result.validations.schemaMatches) {
  console.error('Schema drift detected!')
  result.errors
    .filter(e => e.type === 'schema')
    .forEach(error => {
      console.error(`- ${error.endpoint}: ${error.message}`)
    })
}
```

## Mock Generation

### Basic Mocking

```typescript
const mockedAPI = UserAPI.mock({
  get: {
    success: { id: '123', name: 'John Doe', email: 'john@example.com' },
  },
  create: {
    success: { id: '456', name: 'Jane Doe', email: 'jane@example.com' },
  },
})

// Use mocked methods exactly like real ones
const user = await mockedAPI.get.run({ id: '123' })
// Returns Ok({ id: '123', name: 'John Doe', email: 'john@example.com' })
```

### Mock Scenarios

```typescript
interface MockScenario {
  success?: unknown // Success response data
  failure?: KairoError // Error to return
  delay?: number // Simulate network delay (ms)
  probability?: number // Success probability (0-1)
}
```

### Advanced Mocking Examples

```typescript
const mockedAPI = UserAPI.mock({
  get: {
    // Simulate flaky endpoint
    success: { id: '123', name: 'John' },
    failure: createError('NETWORK_ERROR', 'Connection timeout'),
    probability: 0.8, // 80% success rate
    delay: 100, // 100ms delay
  },

  create: {
    // Always fail with validation error
    failure: createError('VALIDATION_ERROR', 'Email already exists'),
  },

  list: {
    // Return empty list with delay
    success: [],
    delay: 200,
  },
})

// Test error handling
const result = await mockedAPI.create.run({
  name: 'Test',
  email: 'test@example.com',
})
if (result.tag === 'Err') {
  console.log('Expected error:', result.error.message)
}
```

### Dynamic Mocks

While mock scenarios must be static data, you can create dynamic behavior by wrapping mocked resources:

```typescript
let callCount = 0
const dynamicMock = {
  get: {
    async run(params: { id: string }) {
      callCount++
      const result = await mockedAPI.get.run(params)

      // Add dynamic behavior
      if (callCount > 3) {
        return Result.Err(createError('RATE_LIMIT', 'Too many requests'))
      }

      return result
    },
  },
}
```

## Test Suite Generation

### Generate Test Cases

```typescript
const testSuite = UserAPI.contract().generateTests()

console.log(testSuite)
// {
//   name: 'users Contract Tests',
//   tests: [
//     {
//       name: 'users.get',
//       method: 'GET',
//       endpoint: '/users/:id',
//       expectedSchema: UserSchema
//     },
//     {
//       name: 'users.create',
//       method: 'POST',
//       endpoint: '/users',
//       expectedSchema: UserSchema
//     }
//   ]
// }
```

### Integration with Test Frameworks

```typescript
// Vitest/Jest example
import { describe, it, expect } from 'vitest'

const testSuite = UserAPI.contract().generateTests()

describe(testSuite.name, () => {
  testSuite.tests.forEach(test => {
    it(`should handle ${test.name}`, async () => {
      const response = await fetch(baseURL + test.endpoint, {
        method: test.method,
      })

      expect(response.ok).toBe(true)

      if (test.expectedSchema) {
        const data = await response.json()
        const result = test.expectedSchema.parse(data)
        expect(result.tag).toBe('Ok')
      }
    })
  })
})
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: API Contract Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours

jobs:
  contract-verification:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run contract verification
        run: bun run verify-contracts
        env:
          API_URL: ${{ secrets.STAGING_API_URL }}
          API_TOKEN: ${{ secrets.API_TOKEN }}
```

### Verification Script

```typescript
// scripts/verify-contracts.ts
import { UserAPI, OrderAPI, ProductAPI } from './resources'

async function verifyAll() {
  const resources = [UserAPI, OrderAPI, ProductAPI]
  const results = []

  for (const resource of resources) {
    console.log(`Verifying ${resource.name}...`)
    const result = await resource.contract().verify(process.env.API_URL, {
      headers: { Authorization: `Bearer ${process.env.API_TOKEN}` },
      validateResponses: true,
    })

    results.push(result)

    if (!result.success) {
      console.error(`❌ ${resource.name} verification failed`)
      process.exit(1)
    }
  }

  console.log('✅ All contracts verified successfully')
}

verifyAll().catch(console.error)
```

## Best Practices

### 1. Regular Verification

Run contract verification:

- On every deployment to staging/production
- As scheduled jobs to detect API drift
- Before major releases

### 2. Mock Organization

```typescript
// mocks/users.ts
export const userMocks = {
  success: {
    get: { success: mockUser },
    create: { success: mockNewUser },
    list: { success: mockUserList },
  },

  errors: {
    get: { failure: notFoundError },
    create: { failure: validationError },
    list: { failure: serverError },
  },

  slow: {
    get: { success: mockUser, delay: 2000 },
    create: { success: mockNewUser, delay: 3000 },
    list: { success: mockUserList, delay: 5000 },
  },
}

// Use in tests
const api = UserAPI.mock(userMocks.errors)
```

### 3. Contract-First Development

1. Define your resource schemas first
2. Generate mocks for frontend development
3. Verify contracts once backend is ready
4. Keep contracts as regression tests

### 4. Error Scenario Testing

```typescript
describe('Error handling', () => {
  const errorMocks = UserAPI.mock({
    get: {
      failure: createError('NETWORK_ERROR', 'Service unavailable'),
      probability: 0, // Always fail
    },
  })

  it('handles network errors gracefully', async () => {
    const result = await errorMocks.get.run({ id: '123' })
    expect(result.tag).toBe('Err')
    expect(result.error.code).toBe('NETWORK_ERROR')
  })
})
```

## Troubleshooting

### Common Issues

**Contract verification fails with CORS errors**

- Run verification from a Node.js environment, not the browser
- Use appropriate headers for authentication

**Schema validation always passes**

- Ensure `validateResponses: true` is set in verify options
- Check that response schemas are properly defined

**Mocks not returning expected data**

- Mock scenarios must be static data defined upfront
- Use wrapper functions for dynamic behavior

**Type errors with mocked resources**

- Mocked resources maintain the same types as original resources
- Ensure mock data matches your schema definitions
