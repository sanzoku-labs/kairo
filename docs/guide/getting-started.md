# Getting Started

This guide will help you install Kairo and explore its **Three-Pillar Declarative Architecture** - **INTERFACE**, **PROCESS**, and **DATA** pillars that eliminate infrastructure boilerplate.

## Installation

Install Kairo using your preferred package manager:

::: code-group

```bash [npm]
npm install kairo
```

```bash [bun]
bun add kairo
```

```bash [yarn]
yarn add kairo
```

```bash [pnpm]
pnpm add kairo
```

:::

**Zero Dependencies Required!** Kairo now includes native schema validation (3x faster than Zod) with no external dependencies.

## The Three-Pillar Quick Start

Kairo's architecture consists of three foundational pillars. Let's explore each one:

### 1. DATA Pillar - Native Schema Validation

Start with native, high-performance data validation:

```typescript
import { nativeSchema } from 'kairo'

// Define schemas with native validation (3x faster than Zod!)
const UserSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(2).max(100),
  email: nativeSchema.string().email(),
  age: nativeSchema.number().min(0).max(150),
  active: nativeSchema.boolean().default(true),
})

// Schema composition and transformation
const CreateUserSchema = UserSchema.omit(['id'])
const UpdateUserSchema = UserSchema.partial().required(['id'])

// Type-safe validation with Result pattern
const result = UserSchema.parse({
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
})

result.match({
  Ok: user => {
    // user is fully typed as User
    console.log('Valid user:', user.name)
  },
  Err: error => {
    // Rich validation error with field paths
    console.error('Validation failed:', error.field, error.message)
  },
})
```

### 2. INTERFACE Pillar - Zero-Boilerplate APIs

Declare your APIs without service classes:

```typescript
import { resource } from 'kairo'

// Declarative API definition
const UserAPI = resource('users', {
  get: {
    method: 'GET',
    path: '/users/:id',
    params: nativeSchema.object({ id: nativeSchema.string().uuid() }),
    response: UserSchema,
  },
  create: {
    method: 'POST',
    path: '/users',
    body: CreateUserSchema,
    response: UserSchema,
  },
  update: {
    method: 'PUT',
    path: '/users/:id',
    params: nativeSchema.object({ id: nativeSchema.string().uuid() }),
    body: UpdateUserSchema,
    response: UserSchema,
  },
})

// Type-safe usage with Result pattern
const result = await UserAPI.get.run({ id: '550e8400-e29b-41d4-a716-446655440000' })
result.match({
  Ok: user => console.log('Found user:', user),
  Err: error => console.error('API error:', error),
})

// Built-in contract testing and mocking
const contractResult = await UserAPI.contract().verify('https://api.staging.com')
const mocked = UserAPI.mock({
  get: { success: mockUser, delay: 50 },
})
```

### 3. PROCESS Pillar - Declarative Business Logic

Compose complex business logic declaratively:

```typescript
import { pipeline, rules, rule } from 'kairo'

// Define business rules declaratively
const userRules = rules('user-validation', {
  ageRequirement: rule()
    .when(user => user.country === 'US')
    .require(user => user.age >= 21)
    .message('Must be 21+ in US'),

  emailUniqueness: rule()
    .async(user => UserAPI.checkEmail.run({ email: user.email }))
    .require(result => result.match({ Ok: available => available, Err: () => false }))
    .message('Email already exists'),
})

// Create a complete user processing pipeline
const processUser = pipeline('process-user')
  .input(CreateUserSchema)
  .validateAll(userRules)
  .map(user => ({ ...user, slug: slugify(user.name) }))
  .pipeline(UserAPI.create)
  .map(user => ({ ...user, welcomeEmailSent: true }))
  .trace('user-processing')

// Execute with automatic error handling
const result = await processUser.run({
  name: 'John Doe',
  email: 'john@example.com',
  age: 25,
})

result.match({
  Ok: processedUser => {
    console.log('User created successfully:', processedUser.name)
  },
  Err: error => {
    console.error('Failed to process user:', error.message)
  },
})
```

### Complete Three-Pillar Integration

Here's how all three pillars work together in a real application:

```typescript
import { nativeSchema, resource, pipeline, repository, transform, hasMany } from 'kairo'

// DATA: Define your domain model
const UserSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(2).max(100),
  email: nativeSchema.string().email(),
  createdAt: nativeSchema.string(),
})

// DATA: Repository for data access
const userRepository = repository('users', {
  schema: UserSchema,
  storage: 'memory', // or custom StorageAdapter
  relationships: {
    posts: hasMany('posts', 'userId', PostSchema),
  },
  hooks: {
    beforeCreate: data => ({ ...data, createdAt: new Date().toISOString() }),
  },
})

// INTERFACE: External API integration
const ExternalUserAPI = resource('external-users', {
  fetch: {
    method: 'GET',
    path: '/api/external/users/:id',
    params: nativeSchema.object({ id: nativeSchema.string() }),
    response: nativeSchema.object({
      user_id: nativeSchema.string(),
      full_name: nativeSchema.string(),
      email_address: nativeSchema.string(),
    }),
  },
})

// DATA: Transform external data to internal format
const userTransform = transform('normalize-user', ExternalUserAPI.fetch.response)
  .to(UserSchema)
  .map('user_id', 'id')
  .map('full_name', 'name')
  .map('email_address', 'email')
  .compute('createdAt', () => new Date().toISOString())

// PROCESS: Complete user import workflow
const importUser = pipeline('import-user')
  .input(nativeSchema.object({ externalId: nativeSchema.string() }))
  .pipeline(data => ExternalUserAPI.fetch.run({ id: data.externalId }))
  .transform(userTransform)
  .run(user => userRepository.create(user))
  .trace('user-imported')

// Execute the complete workflow
const result = await importUser.run({ externalId: 'ext-123' })
result.match({
  Ok: user => console.log('User imported:', user.name),
  Err: error => console.error('Import failed:', error.message),
})
```

## Understanding the Result Pattern

Kairo uses the `Result<Error, Value>` pattern for predictable error handling without exceptions:

```typescript
import { Result } from 'kairo'

// Results have two possible states
type Result<E, T> = { tag: 'Ok'; value: T } | { tag: 'Err'; error: E }

// Pattern matching with match() method
result.match({
  Ok: value => {
    // TypeScript knows this is the success case
    console.log('Success:', value) // ✅ Type-safe access
  },
  Err: error => {
    // TypeScript knows this is the error case
    console.error('Error:', error) // ✅ Type-safe error handling
  },
})

// Or traditional pattern matching
if (result.tag === 'Ok') {
  console.log(result.value) // ✅ Type-safe access
} else {
  console.log(result.error) // ✅ Type-safe error handling
}

// Helper functions for checking result state
if (Result.isOk(result)) {
  console.log(result.value) // ✅ Type-safe
}

if (Result.isErr(result)) {
  console.log(result.error) // ✅ Type-safe
}
```

## Comprehensive Error Handling

Kairo provides structured error handling with rich error information:

```typescript
import { pipeline, nativeSchema } from 'kairo'

const userPipeline = pipeline('user-processing')
  .input(
    nativeSchema.object({
      email: nativeSchema.string().email(),
      age: nativeSchema.number().min(0),
    })
  )
  .map(user => ({ ...user, processed: true }))

const result = await userPipeline.run({
  email: 'invalid-email',
  age: -5,
})

result.match({
  Ok: user => {
    console.log('User processed:', user)
  },
  Err: error => {
    // Handle different error types
    switch (error.code) {
      case 'VALIDATION_ERROR':
        console.log(`Validation failed on field '${error.field}': ${error.message}`)
        // Rich error information includes field path, expected vs actual values
        console.log('Field path:', error.fieldPath)
        console.log('Expected:', error.expected)
        console.log('Actual:', error.actual)
        break

      case 'HTTP_ERROR':
        console.log(`HTTP ${error.status}: ${error.statusText}`)
        console.log('URL:', error.url)
        break

      case 'NETWORK_ERROR':
        console.log(`Network error on attempt ${error.attempt}/${error.maxAttempts}`)
        console.log('URL:', error.url, 'Method:', error.method)
        break

      case 'TIMEOUT_ERROR':
        console.log(`Operation timed out after ${error.duration}ms (limit: ${error.timeout}ms)`)
        console.log('Operation:', error.operation)
        break

      default:
        console.log('Unknown error:', error.message)
    }
  },
})
```

## Advanced Pipeline Patterns

### Pipeline Composition and Reusability

```typescript
import { pipeline, nativeSchema } from 'kairo'

// Base pipeline for authenticated API calls
const authenticatedApiPipeline = pipeline('authenticated-api')
  .input(
    nativeSchema.object({
      endpoint: nativeSchema.string(),
      token: nativeSchema.string(),
    })
  )
  .map(({ endpoint, token }) => ({
    url: endpoint,
    headers: { Authorization: `Bearer ${token}` },
  }))
  .fetch(({ url, headers }) => ({ url, headers }))

// Specialized user pipeline
const userPipeline = authenticatedApiPipeline.validate(UserSchema).map(user => ({
  ...user,
  displayName: `${user.name} (${user.email})`,
}))

// Posts pipeline with pagination
const postsPipeline = authenticatedApiPipeline
  .validate(
    nativeSchema.object({
      posts: nativeSchema.array(PostSchema),
      total: nativeSchema.number(),
    })
  )
  .map(({ posts, total }) => ({
    items: posts.slice(0, 10), // Take first 10
    hasMore: total > 10,
  }))
```

### Parallel Pipeline Execution

```typescript
import { pipeline } from 'kairo'

// Execute multiple pipelines in parallel
const userDashboard = pipeline('user-dashboard')
  .input(nativeSchema.object({ userId: nativeSchema.string() }))
  .parallel([
    userPipeline, // Get user info
    postsPipeline, // Get user posts
    friendsPipeline, // Get user friends
  ])
  .map(([user, posts, friends]) => ({
    user,
    postsCount: posts.items.length,
    friendsCount: friends.length,
    summary: `${user.displayName} has ${posts.items.length} posts and ${friends.length} friends`,
  }))

const result = await userDashboard.run({ userId: 'user-123' })
```

### Pipeline Error Recovery

```typescript
// Pipeline with fallback logic
const resilientUserPipeline = pipeline('resilient-user')
  .input(nativeSchema.object({ userId: nativeSchema.string() }))
  .fallback(
    primaryUserPipeline, // Try primary source first
    fallbackUserPipeline // Fall back to secondary source
  )
  .retry({ times: 3, delay: 1000 })
  .timeout(5000)
  .cache({ ttl: 60000 }) // Cache for 1 minute
```

## Enhanced Testing Integration

Kairo provides comprehensive testing utilities for all three pillars:

```typescript
import {
  pipelineTesting,
  resourceTesting,
  schemaTesting,
  transformTesting,
  integrationTesting,
} from 'kairo/testing'

// Pipeline testing with fluent assertions
describe('User Pipeline', () => {
  it('should process user data correctly', async () => {
    await pipelineTesting
      .expect(processUser, {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      })
      .shouldSucceed()
      .shouldReturnValue(
        expect.objectContaining({
          name: 'John Doe',
          slug: 'john-doe',
        })
      )
      .shouldCompleteWithin(100)
  })

  it('should handle validation errors', async () => {
    await pipelineTesting
      .expect(processUser, { name: '', email: 'invalid' })
      .shouldFail()
      .shouldFailWithError({ code: 'VALIDATION_ERROR' })
  })
})

// Resource testing with mock scenarios
describe('User API', () => {
  it('should handle API responses', async () => {
    const tester = resourceTesting.createTester(UserAPI)

    const scenarios = [
      resourceTesting.mockScenario(
        'successful get',
        { method: 'GET', path: '/users/1' },
        resourceTesting.mockResponses.success(mockUser)
      ),
    ]

    const results = await tester.testOperations({
      get: [
        resourceTesting.testCase('get user', 'get', {
          params: { id: '1' },
          expectedData: mockUser,
        }),
      ],
    })

    expect(results.passedTests).toBe(1)
  })
})

// Schema testing with property-based testing
describe('User Schema', () => {
  it('should validate user data', async () => {
    const tester = schemaTesting.createTester(UserSchema)

    // Property-based testing
    const propertyResults = tester.propertyTest(
      () => ({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: schemaTesting.generators.randomString(10),
        email: `${schemaTesting.generators.randomString(5)}@example.com`,
        age: schemaTesting.generators.randomNumber(18, 65),
      }),
      1000
    )

    expect(propertyResults.passed).toBeGreaterThan(950) // Allow for some edge cases
  })
})

// Integration testing across pillars
describe('Complete User Flow', () => {
  it('should handle end-to-end user creation', async () => {
    const integrationTest = integrationTesting
      .createTest('user-onboarding')
      .withPipeline('processor', processUser)
      .withResource('api', UserAPI)
      .withRepository('userRepo', userRepository)

    integrationTest.scenario('complete flow', async context => {
      const userData = {
        name: 'Integration Test User',
        email: 'test@example.com',
        age: 25,
      }

      const result = await context.runFullFlow(userData)
      context.expect(result).toBeOk()
      context.expect(result.value.name).toBe('Integration Test User')
    })

    const results = await integrationTest.run()
    expect(results.passed).toBe(true)
  })
})
```

## Framework Integration

Kairo is framework-agnostic and works seamlessly across all TypeScript environments:

### React with Hooks

```typescript
import { useEffect, useState } from 'react'
import { Result } from 'kairo'

// Custom hook for Kairo pipelines
function usePipeline<T, U>(pipeline: Pipeline<T, U>, input: T) {
  const [data, setData] = useState<U | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    pipeline.run(input).then(result => {
      setLoading(false)
      result.match({
        Ok: value => {
          setData(value)
          setError(null)
        },
        Err: error => {
          setError(error)
          setData(null)
        },
      })
    })
  }, [pipeline, input])

  return { data, error, loading }
}

// Component using the hook
function UserProfile({ userId }: { userId: string }) {
  const { data: user, error, loading } = usePipeline(
    processUser,
    { userId }
  )

  if (loading) return <div>Loading user...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!user) return null

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      {user.active && <span className="badge">Active</span>}
    </div>
  )
}
```

### Vue.js Composition API

```typescript
import { ref, computed, watchEffect } from 'vue'
import { processUser } from './pipelines'

export function useUser(userId: Ref<string>) {
  const user = ref(null)
  const error = ref(null)
  const loading = ref(false)

  const userProfile = computed(() => {
    if (!user.value) return null
    return {
      ...user.value,
      displayName: `${user.value.name} (${user.value.email})`,
    }
  })

  watchEffect(async () => {
    if (!userId.value) return

    loading.value = true
    const result = await processUser.run({ userId: userId.value })

    result.match({
      Ok: value => {
        user.value = value
        error.value = null
      },
      Err: err => {
        error.value = err
        user.value = null
      },
    })

    loading.value = false
  })

  return { user, userProfile, error, loading }
}
```

### Node.js Express API

```typescript
import express from 'express'
import { processUser, UserAPI } from './kairo-setup'

const app = express()
app.use(express.json())

// Middleware for error handling
app.use((req, res, next) => {
  res.kairoResult = result => {
    result.match({
      Ok: data => res.json({ success: true, data }),
      Err: error => {
        const status = error.status || 500
        res.status(status).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            ...(process.env.NODE_ENV === 'development' && { details: error }),
          },
        })
      },
    })
  }
  next()
})

// API endpoints using Kairo
app.get('/users/:id', async (req, res) => {
  const result = await UserAPI.get.run({ id: req.params.id })
  res.kairoResult(result)
})

app.post('/users', async (req, res) => {
  const result = await processUser.run(req.body)
  res.kairoResult(result)
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
})
```

### Bun Server

```typescript
import { processUser } from './kairo-setup'

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === '/users' && req.method === 'POST') {
      const body = await req.json()
      const result = await processUser.run(body)

      return result.match({
        Ok: user => Response.json({ success: true, user }),
        Err: error =>
          Response.json({ success: false, error: error.message }, { status: error.status || 500 }),
      })
    }

    return new Response('Not Found', { status: 404 })
  },
})

console.log(`Server running at http://localhost:${server.port}`)
```

## Performance and Production Considerations

### Performance Benchmarks

Kairo's native schema system delivers exceptional performance:

```typescript
// Performance comparison (1000 validations)
// Kairo Native Schema: ~30ms (3x faster than Zod)
// Zod: ~90ms
// Raw TypeScript: ~0ms (compile-time only)

const performanceTest = async () => {
  const testData = Array.from({ length: 1000 }, (_, i) => ({
    id: `user-${i}`,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    age: 20 + (i % 50),
  }))

  const start = performance.now()
  for (const data of testData) {
    const result = UserSchema.parse(data)
    if (Result.isErr(result)) {
      console.error('Validation failed:', result.error)
    }
  }
  const duration = performance.now() - start
  console.log(`Validated ${testData.length} items in ${duration.toFixed(2)}ms`)
}
```

### Production Best Practices

```typescript
// 1. Use environment-specific configurations
const userPipeline = pipeline('user-processing')
  .input(UserSchema)
  .timeout(process.env.NODE_ENV === 'production' ? 5000 : 30000)
  .retry({ times: process.env.NODE_ENV === 'production' ? 3 : 1 })
  .cache({ ttl: 60000 }) // Cache for 1 minute

// 2. Implement proper error monitoring
const monitoredPipeline = userPipeline.mapError(error => {
  // Log to monitoring service
  console.error('Pipeline error:', {
    pipeline: 'user-processing',
    error: error.message,
    code: error.code,
    timestamp: new Date().toISOString(),
  })
  return error
})

// 3. Use structured logging with tracing
const tracedPipeline = userPipeline
  .trace('user-processed', { includeInput: false, includeOutput: false })
  .map(user => {
    console.log('User processed successfully:', { userId: user.id, name: user.name })
    return user
  })
```

## Advanced Features (Optional)

Once you're comfortable with the three pillars, explore Kairo's enterprise-grade advanced features:

### Event-Driven Architecture

```typescript
import { createEventBus, createEvent, saga, sagaStep } from 'kairo/events'

// Create event bus
const eventBus = createEventBus()

// Publish events
const userCreatedEvent = createEvent('user.created', {
  userId: '123',
  name: 'John Doe',
  email: 'john@example.com',
})

await eventBus.publish(userCreatedEvent)

// Subscribe to events
eventBus.subscribe({
  eventType: 'user.created',
  handler: async event => {
    await sendWelcomeEmail(event.payload)
    return Result.Ok(undefined)
  },
})

// Complex workflows with sagas
const userOnboardingSaga = saga(
  'user-onboarding',
  [
    sagaStep('create-user', async input => {
      const user = await userService.create(input.userData)
      return Result.Ok(user)
    }),
    sagaStep('send-welcome', async user => {
      await emailService.sendWelcome(user.email)
      return Result.Ok(undefined)
    }),
  ],
  { rollbackOnFailure: true }
)
```

### Transaction Management

```typescript
import { transaction, transactionStep, createTransactionManager } from 'kairo/transactions'

const transactionManager = createTransactionManager()

// ACID transactions with automatic rollback
const transferFunds = transaction(
  'transfer-funds',
  [
    transactionStep('debit-source', async input => {
      return await accountService.debit(input.fromAccount, input.amount)
    }),
    transactionStep('credit-target', async input => {
      return await accountService.credit(input.toAccount, input.amount)
    }),
  ],
  {
    isolation: 'serializable',
    timeout: 30000,
  }
)

const result = await transactionManager.execute(transferFunds, transferData)
```

### Advanced Caching

```typescript
import { CacheManager, MemoryStorage, RedisStorage } from 'kairo/cache'

// Multi-level cache with analytics
const cacheManager = new CacheManager({
  layers: [
    { name: 'memory', storage: new MemoryStorage(), ttl: 300000 },
    { name: 'redis', storage: new RedisStorage(), ttl: 3600000 },
  ],
  analytics: { enabled: true },
})

// Cache with intelligent invalidation
await cacheManager.set('user:123', userData, {
  tags: ['user', 'profile'],
  ttl: 1800000,
})

// Tag-based invalidation
await cacheManager.invalidateByTag('user')

// Real-time analytics
const analytics = cacheManager.getAnalytics()
console.log(`Hit rate: ${analytics.hitRate}%`)
```

### Plugin System

```typescript
import { createPlugin, registerPlugin, loadAndEnablePlugin } from 'kairo/plugins'

// Create extensible plugins
const authPlugin = createPlugin('auth', {
  resourceHooks: {
    beforeRequest: async (request, context) => {
      const token = await getAuthToken()
      request.headers.Authorization = `Bearer ${token}`
      return request
    },
  },
  pipelineSteps: {
    authorize: (permission: string) => async (data, context) => {
      if (!(await authService.hasPermission(context.user, permission))) {
        throw new AuthorizationError(`Missing permission: ${permission}`)
      }
      return data
    },
  },
})

// Register and activate
registerPlugin(authPlugin)
await loadAndEnablePlugin('auth')

// All operations automatically enhanced
const userPipeline = pipeline('process-user')
  .step('authorize', step => step.authorize('user:create'))
  .pipeline(UserAPI.create) // Auth headers added automatically
```

## Next Steps

Now that you understand Kairo's Three-Pillar Architecture, explore more advanced features:

### 📚 Learn More

- [Three-Pillar Architecture Guide](/guide/architecture) - Deep dive into architectural patterns and enterprise features
- [Core Concepts](/guide/concepts) - Understanding Result patterns, composition, and more
- [Enhanced Testing Integration](/testing-guide) - Comprehensive testing across all pillars

### 🔧 Core API Reference

- [Native Schema API](/api/schema) - Complete schema validation reference
- [Pipeline API](/api/pipeline) - Business logic composition patterns
- [Resource API](/api/resource) - Zero-boilerplate API integration
- [Repository API](/api/repository) - Data access with relationships
- [Transform API](/api/transform) - Declarative data transformation

### ⚡ Advanced API Reference

- [Event Bus API](/api/events) - Event-driven architecture and sagas
- [Transaction API](/api/transactions) - ACID transactions and compensation
- [Cache API](/api/cache) - Multi-level caching with analytics
- [Plugin API](/api/plugins) - Extensible plugin architecture

### 💡 Real-World Examples

- [Basic Examples](/examples/) - Simple patterns to get started
- [Event-Driven Architecture](/examples/event-driven-architecture) - Reactive applications with events
- [Enterprise Integration](/examples/enterprise-integration) - Complete e-commerce platform with all features
- [Data Transformations](/examples/data-transformations) - ETL and data processing patterns
- [Repository Patterns](/examples/repository-patterns) - Data access with relationships

### 🚀 Advanced Topics

- [Performance Optimization](/guide/performance) - Scaling and optimization strategies
- [Production Deployment](/guide/deployment) - Best practices for production environments
- [Migration Guide](/guide/migration) - Migrating from other frameworks
- [Custom Storage Adapters](/guide/custom-storage) - Building custom data storage solutions

**Ready to build your declarative application?** Start with the core three-pillar architecture, then add advanced features as your application grows!
