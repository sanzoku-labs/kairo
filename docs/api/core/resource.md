# Resource API

The Resource API is the cornerstone of Kairo's **INTERFACE Pillar** - enabling zero-boilerplate external system integration with built-in type safety, contract testing, and intelligent mocking.

## Overview

- **🔗 Zero Boilerplate** - Eliminate service classes and HTTP client setup
- **🛡️ Type Safe** - Full TypeScript inference with Result pattern integration
- **📋 Contract Testing** - Built-in API verification and mock generation
- **⚡ High Performance** - Automatic caching, retry, and timeout handling
- **🔄 Result Pattern** - Predictable error handling without exceptions

## Creating Resources

### Basic Resource Definition

```typescript
import { resource, nativeSchema } from 'kairo'

// Define your data schemas with native validation
const UserSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(2).max(100),
  email: nativeSchema.string().email(),
  active: nativeSchema.boolean(),
  createdAt: nativeSchema.string().datetime(),
})

const CreateUserSchema = UserSchema.omit(['id', 'createdAt'])
const UpdateUserSchema = UserSchema.partial().required(['id'])

// Declarative API resource definition
const UserAPI = resource('users', {
  get: {
    method: 'GET',
    path: '/users/:id',
    params: nativeSchema.object({ id: nativeSchema.string().uuid() }),
    response: UserSchema,
  },
  list: {
    method: 'GET',
    path: '/users',
    query: nativeSchema.object({
      page: nativeSchema.number().min(1).default(1),
      limit: nativeSchema.number().min(1).max(100).default(20),
      active: nativeSchema.boolean().optional(),
    }),
    response: nativeSchema.object({
      users: nativeSchema.array(UserSchema),
      total: nativeSchema.number(),
      page: nativeSchema.number(),
      limit: nativeSchema.number(),
    }),
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
  delete: {
    method: 'DELETE',
    path: '/users/:id',
    params: nativeSchema.object({ id: nativeSchema.string().uuid() }),
    response: nativeSchema.object({ success: nativeSchema.boolean() }),
  },
})
```

### Global Resource Configuration

```typescript
const UserAPI = resource('users', userOperations, {
  // Global configuration applied to all operations
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  retry: { times: 3, delay: 1000, backoff: 'exponential' },
  cache: { ttl: 60000 }, // Cache for 1 minute
  headers: {
    'Content-Type': 'application/json',
    'X-API-Version': '2024-01-01',
  },
  beforeRequest: request => ({
    ...request,
    headers: {
      ...request.headers,
      Authorization: `Bearer ${getAuthToken()}`,
    },
  }),
  afterResponse: (response, request) => {
    console.log(`✅ ${request.method} ${request.url} - ${response.status}`)
    return response
  },
  onError: (error, request) => {
    console.error(`❌ ${request.method} ${request.url} - ${error.message}`)
    return error
  },
})
```

## Type-Safe Resource Usage

### Basic Operations with Result Pattern

```typescript
// GET operation with type-safe params and response
const getUserResult = await UserAPI.get.run({ id: 'user-123' })

getUserResult.match({
  Ok: user => {
    // user is fully typed as User
    console.log('Found user:', user.name)
    console.log('Email:', user.email)
    console.log('Active:', user.active)
  },
  Err: error => {
    // Handle structured error information
    switch (error.code) {
      case 'HTTP_ERROR':
        if (error.status === 404) {
          console.log('User not found')
        } else {
          console.log(`HTTP error: ${error.status} ${error.statusText}`)
        }
        break
      case 'VALIDATION_ERROR':
        console.log('Invalid response data:', error.field, error.message)
        break
      case 'NETWORK_ERROR':
        console.log('Network error:', error.message)
        break
      case 'TIMEOUT_ERROR':
        console.log(`Request timed out after ${error.timeout}ms`)
        break
      default:
        console.log('Unexpected error:', error.message)
    }
  },
})

// List operation with query parameters
const listResult = await UserAPI.list.run({
  page: 1,
  limit: 10,
  active: true,
})

listResult.match({
  Ok: response => {
    console.log(`Found ${response.users.length} of ${response.total} users`)
    response.users.forEach(user => console.log(user.name))
  },
  Err: error => console.error('Failed to fetch users:', error.message),
})

// Create operation with request body
const createResult = await UserAPI.create.run({
  name: 'John Doe',
  email: 'john@example.com',
  active: true,
})

createResult.match({
  Ok: newUser => {
    console.log('User created with ID:', newUser.id)
  },
  Err: error => {
    if (error.code === 'VALIDATION_ERROR') {
      console.log('Invalid user data:', error.field)
    }
  },
})
```

### Advanced URL and Parameter Handling

```typescript
const BlogAPI = resource('blog', {
  getPost: {
    method: 'GET',
    path: '/users/:userId/posts/:postId',
    params: nativeSchema.object({
      userId: nativeSchema.string().uuid(),
      postId: nativeSchema.string().uuid(),
    }),
    query: nativeSchema.object({
      include: nativeSchema
        .array(nativeSchema.enum(['comments', 'author', 'tags'] as const))
        .optional(),
      fields: nativeSchema.string().optional(),
    }),
    response: PostSchema,
  },
  searchPosts: {
    method: 'GET',
    path: '/posts/search',
    query: nativeSchema.object({
      q: nativeSchema.string().min(1),
      category: nativeSchema.string().optional(),
      tags: nativeSchema.array(nativeSchema.string()).optional(),
      publishedAfter: nativeSchema.string().datetime().optional(),
      sort: nativeSchema.enum(['relevance', 'date', 'popularity'] as const).default('relevance'),
      page: nativeSchema.number().min(1).default(1),
      limit: nativeSchema.number().min(1).max(50).default(10),
    }),
    response: nativeSchema.object({
      posts: nativeSchema.array(PostSchema),
      total: nativeSchema.number(),
      facets: nativeSchema.object({
        categories: nativeSchema.array(nativeSchema.string()),
        tags: nativeSchema.array(nativeSchema.string()),
      }),
    }),
  },
})

// URL parameters are automatically interpolated
const postResult = await BlogAPI.getPost.run({
  userId: 'user-123',
  postId: 'post-456',
  include: ['comments', 'author'],
  fields: 'title,content,publishedAt',
})
// Generates: GET /users/user-123/posts/post-456?include=comments,author&fields=title,content,publishedAt

// Complex query parameters
const searchResult = await BlogAPI.searchPosts.run({
  q: 'typescript programming',
  category: 'technology',
  tags: ['javascript', 'web-development'],
  publishedAfter: '2024-01-01T00:00:00Z',
  sort: 'popularity',
  page: 2,
  limit: 20,
})
```

## Resource Configuration and Middleware

### Method-Level Configuration

```typescript
const PaymentAPI = resource('payments', {
  process: {
    method: 'POST',
    path: '/payments/process',
    body: PaymentRequestSchema,
    response: PaymentResponseSchema,
    // Method-specific configuration
    timeout: 30000, // 30 seconds for payment processing
    retry: { times: 1 }, // Don't retry payment operations
    cache: null, // Never cache payment operations
  },
  getStatus: {
    method: 'GET',
    path: '/payments/:id/status',
    params: nativeSchema.object({ id: nativeSchema.string() }),
    response: PaymentStatusSchema,
    // Fast status checks
    timeout: 2000,
    cache: { ttl: 10000 }, // Cache for 10 seconds
  },
  refund: {
    method: 'POST',
    path: '/payments/:id/refund',
    params: nativeSchema.object({ id: nativeSchema.string() }),
    body: RefundRequestSchema,
    response: RefundResponseSchema,
    timeout: 15000,
    retry: { times: 2, delay: 2000 },
  },
})
```

### Authentication Middleware

```typescript
// Create authenticated resource factory
const createAuthenticatedResource = <T extends Record<string, any>>(
  name: string,
  operations: T,
  config?: Partial<ResourceConfig>
) =>
  resource(name, operations, {
    ...config,
    beforeRequest: request => ({
      ...request,
      headers: {
        ...request.headers,
        Authorization: `Bearer ${getAuthToken()}`,
      },
    }),
  })

// Use for all authenticated APIs
const UserAPI = createAuthenticatedResource('users', userOperations)
const PostAPI = createAuthenticatedResource('posts', postOperations)
const AdminAPI = createAuthenticatedResource('admin', adminOperations, {
  headers: { 'X-Admin-Key': process.env.ADMIN_KEY },
})
```

### Logging and Monitoring Middleware

```typescript
const monitoredResource = <T extends Record<string, any>>(name: string, operations: T) =>
  resource(name, operations, {
    beforeRequest: request => {
      console.log(`🔄 [${name}] ${request.method} ${request.url}`)
      performance.mark(`${name}-${request.method}-start`)
      return request
    },
    afterResponse: (response, request) => {
      performance.mark(`${name}-${request.method}-end`)
      const duration = performance.measure(
        `${name}-${request.method}`,
        `${name}-${request.method}-start`,
        `${name}-${request.method}-end`
      ).duration
      console.log(
        `✅ [${name}] ${request.method} ${request.url} - ${response.status} (${duration.toFixed(2)}ms)`
      )
      return response
    },
    onError: (error, request) => {
      console.error(`❌ [${name}] ${request.method} ${request.url} - ${error.message}`)
      // Send to monitoring service
      analytics.track('api_error', {
        resource: name,
        method: request.method,
        url: request.url,
        error: error.code,
        message: error.message,
      })
      return error
    },
  })

const UserAPI = monitoredResource('users', userOperations)
```

## Contract Testing and Mocking

### Live Contract Verification

```typescript
// Verify your resource contract against a live API
const contractResult = await UserAPI.contract().verify('https://api.staging.com')

contractResult.match({
  Ok: results => {
    console.log(`Contract verification: ${results.passed}/${results.total} operations passed`)

    results.operations.forEach(op => {
      if (op.status === 'passed') {
        console.log(`✅ ${op.method} ${op.path} - passed`)
      } else {
        console.log(`❌ ${op.method} ${op.path} - failed: ${op.error}`)
      }
    })
  },
  Err: error => {
    console.error('Contract verification failed:', error.message)
  },
})

// Verify specific operations
const getUserContractResult = await UserAPI.get.contract().verify('https://api.staging.com')
```

### Intelligent Mocking

```typescript
import { resourceTesting } from 'kairo/testing'

// Create mock scenarios for development and testing
const mockScenarios = [
  resourceTesting.mockScenario(
    'successful get',
    { method: 'GET', path: '/users/:id' },
    resourceTesting.mockResponses.success(
      {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      { delay: 100 }
    )
  ),
  resourceTesting.mockScenario(
    'user not found',
    { method: 'GET', path: '/users/999' },
    resourceTesting.mockResponses.error(404, 'User not found', { delay: 50 })
  ),
  resourceTesting.mockScenario(
    'network timeout',
    { method: 'GET', path: '/users/timeout' },
    resourceTesting.mockResponses.timeout(5000)
  ),
  resourceTesting.mockScenario(
    'create user success',
    { method: 'POST', path: '/users' },
    resourceTesting.mockResponses.success(
      input => ({
        ...input,
        id: `user-${Date.now()}`,
        createdAt: new Date().toISOString(),
      }),
      { delay: 200 }
    )
  ),
]

// Create mocked version of API for development
const mockedUserAPI = UserAPI.mock(mockScenarios)

// Use exactly like the real API
const result = await mockedUserAPI.get.run({ id: 'user-123' })
result.match({
  Ok: user => console.log('Mocked user:', user.name),
  Err: error => console.error('Mocked error:', error.message),
})
```

### Advanced Mock Behaviors

```typescript
// Probabilistic responses
const unreliableAPI = UserAPI.mock([
  resourceTesting.mockScenario(
    'flaky get',
    { method: 'GET', path: '/users/:id' },
    resourceTesting.mockResponses.probabilistic([
      { weight: 0.7, response: resourceTesting.mockResponses.success(mockUser) },
      { weight: 0.2, response: resourceTesting.mockResponses.error(500, 'Internal Error') },
      { weight: 0.1, response: resourceTesting.mockResponses.timeout(5000) },
    ])
  ),
])

// Sequence-based responses
const sequenceAPI = UserAPI.mock([
  resourceTesting.mockScenario(
    'degrading service',
    { method: 'GET', path: '/users/:id' },
    resourceTesting.mockResponses.sequence([
      resourceTesting.mockResponses.success(mockUser, { delay: 100 }),
      resourceTesting.mockResponses.success(mockUser, { delay: 500 }),
      resourceTesting.mockResponses.error(503, 'Service Unavailable'),
      resourceTesting.mockResponses.error(503, 'Service Unavailable'),
      resourceTesting.mockResponses.success(mockUser, { delay: 100 }), // Recovery
    ])
  ),
])
```

## Performance and Caching

### Intelligent Caching Strategies

```typescript
const CachedAPI = resource('cached', {
  // Fast-changing data - short cache
  realtimeStats: {
    method: 'GET',
    path: '/stats/realtime',
    response: StatsSchema,
    cache: { ttl: 5000 }, // 5 seconds
  },

  // Slow-changing data - long cache
  userProfile: {
    method: 'GET',
    path: '/users/:id/profile',
    params: nativeSchema.object({ id: nativeSchema.string() }),
    response: ProfileSchema,
    cache: { ttl: 300000 }, // 5 minutes
  },

  // Configuration data - very long cache
  appConfig: {
    method: 'GET',
    path: '/config',
    response: ConfigSchema,
    cache: { ttl: 3600000 }, // 1 hour
  },

  // Never cache mutations
  updateProfile: {
    method: 'PUT',
    path: '/users/:id/profile',
    params: nativeSchema.object({ id: nativeSchema.string() }),
    body: UpdateProfileSchema,
    response: ProfileSchema,
    cache: null, // No caching
  },
})
```

### Custom Cache Keys

```typescript
const SmartAPI = resource('smart', {
  getUserData: {
    method: 'GET',
    path: '/users/:id/data',
    params: nativeSchema.object({ id: nativeSchema.string() }),
    query: nativeSchema.object({
      include: nativeSchema.array(nativeSchema.string()).optional(),
      version: nativeSchema.string().optional(),
    }),
    response: UserDataSchema,
    cache: {
      ttl: 300000,
      // Custom cache key generation
      key: (params, query) =>
        `user-data:${params.id}:${query.include?.sort().join(',') || 'basic'}:${query.version || 'latest'}`,
    },
  },
})
```

### Cache Management

```typescript
import { resourceCache } from 'kairo'

// Manual cache operations
resourceCache.invalidate('users', 'get', { id: 'user-123' })
resourceCache.invalidatePattern('users', 'get', key => key.includes('user-123'))
resourceCache.clear('users') // Clear all cache for users resource
resourceCache.clearAll() // Clear all resource caches

// Cache statistics
const stats = resourceCache.getStats('users')
console.log(`Cache hit rate: ${stats.hitRate}%`)
console.log(`Cache size: ${stats.size} entries`)
```

## Error Handling and Resilience

### Comprehensive Error Types

```typescript
const result = await UserAPI.get.run({ id: 'user-123' })

result.match({
  Ok: user => {
    console.log('Success:', user)
  },
  Err: error => {
    // Structured error handling
    switch (error.code) {
      case 'HTTP_ERROR':
        console.log(`HTTP ${error.status}: ${error.statusText}`)
        console.log('URL:', error.url)
        console.log('Response body:', error.body)
        break

      case 'NETWORK_ERROR':
        console.log('Network error:', error.message)
        console.log('Attempt:', error.attempt, 'of', error.maxAttempts)
        break

      case 'TIMEOUT_ERROR':
        console.log(`Timeout after ${error.duration}ms (limit: ${error.timeout}ms)`)
        console.log('Operation:', error.operation)
        break

      case 'VALIDATION_ERROR':
        console.log('Response validation failed:')
        console.log('Field:', error.field)
        console.log('Message:', error.message)
        console.log('Expected:', error.expected)
        console.log('Received:', error.received)
        break

      case 'CACHE_ERROR':
        console.log('Cache operation failed:', error.message)
        break

      default:
        console.log('Unknown error:', error.message)
    }
  },
})
```

### Retry and Fallback Strategies

```typescript
const ResilientAPI = resource('resilient', {
  criticalData: {
    method: 'GET',
    path: '/critical-data',
    response: DataSchema,
    retry: {
      times: 5,
      delay: 1000,
      backoff: 'exponential',
      maxDelay: 10000,
      retryIf: error => {
        // Only retry on network errors and 5xx responses
        return (
          error.code === 'NETWORK_ERROR' || (error.code === 'HTTP_ERROR' && error.status >= 500)
        )
      },
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt}: ${error.message}`)
      },
    },
    timeout: 10000,
  },
})
```

## Pipeline Integration

### Using Resources in Pipelines

```typescript
import { pipeline } from 'kairo'

// Compose resources with business logic
const processUserRegistration = pipeline('user-registration')
  .input(
    nativeSchema.object({
      email: nativeSchema.string().email(),
      password: nativeSchema.string().min(8),
      name: nativeSchema.string().min(2),
    })
  )
  .map(data => ({
    ...data,
    email: data.email.toLowerCase(),
    slug: slugify(data.name),
  }))
  .pipeline(UserAPI.create)
  .map(user => ({ ...user, welcomeEmailSent: false }))
  .run(async user => {
    // Send welcome email
    const emailResult = await EmailAPI.sendWelcome.run({
      userId: user.id,
      email: user.email,
      name: user.name,
    })

    return emailResult.match({
      Ok: () => ({ ...user, welcomeEmailSent: true }),
      Err: () => user, // Continue even if email fails
    })
  })
  .trace('user-registration-complete')

// Execute the complete workflow
const result = await processUserRegistration.run({
  email: 'JOHN@EXAMPLE.COM',
  password: 'secretpassword123',
  name: 'John Doe',
})
```

### Parallel Resource Calls

```typescript
const loadUserDashboard = pipeline('user-dashboard')
  .input(nativeSchema.object({ userId: nativeSchema.string() }))
  .parallel([UserAPI.get, PostAPI.getByUser, FriendsAPI.getByUser, NotificationsAPI.getByUser])
  .map(([user, posts, friends, notifications]) => ({
    user,
    stats: {
      postsCount: posts.length,
      friendsCount: friends.length,
      unreadNotifications: notifications.filter(n => !n.read).length,
    },
    summary: {
      displayName: user.name,
      lastActive: user.lastActiveAt,
      memberSince: user.createdAt,
    },
  }))
  .trace('dashboard-loaded')
```

## Testing Resources

### Unit Testing with Mocks

```typescript
import { describe, it, expect } from 'vitest'
import { resourceTesting } from 'kairo/testing'

describe('UserAPI', () => {
  it('should handle successful user fetch', async () => {
    const tester = resourceTesting.createTester(UserAPI)

    const scenarios = [
      resourceTesting.mockScenario(
        'get user success',
        { method: 'GET', path: '/users/123' },
        resourceTesting.mockResponses.success({
          id: '123',
          name: 'John Doe',
          email: 'john@example.com',
          active: true,
          createdAt: '2024-01-01T00:00:00Z',
        })
      ),
    ]

    const mockAPI = UserAPI.mock(scenarios)
    const result = await mockAPI.get.run({ id: '123' })

    expect(result.tag).toBe('Ok')
    if (result.tag === 'Ok') {
      expect(result.value.name).toBe('John Doe')
      expect(result.value.email).toBe('john@example.com')
    }
  })

  it('should handle API errors gracefully', async () => {
    const scenarios = [
      resourceTesting.mockScenario(
        'user not found',
        { method: 'GET', path: '/users/999' },
        resourceTesting.mockResponses.error(404, 'User not found')
      ),
    ]

    const mockAPI = UserAPI.mock(scenarios)
    const result = await mockAPI.get.run({ id: '999' })

    expect(result.tag).toBe('Err')
    if (result.tag === 'Err') {
      expect(result.error.code).toBe('HTTP_ERROR')
      expect(result.error.status).toBe(404)
    }
  })
})
```

### Contract Testing

```typescript
describe('UserAPI Contract', () => {
  it('should pass contract verification', async () => {
    const result = await UserAPI.contract().verify(process.env.API_BASE_URL!)

    expect(result.tag).toBe('Ok')
    if (result.tag === 'Ok') {
      expect(result.value.passed).toBe(result.value.total)

      result.value.operations.forEach(op => {
        expect(op.status).toBe('passed')
      })
    }
  })
})
```

## Real-World Examples

### E-commerce API

```typescript
const EcommerceAPI = resource('ecommerce', {
  // Product operations
  getProduct: {
    method: 'GET',
    path: '/products/:id',
    params: nativeSchema.object({ id: nativeSchema.string() }),
    response: ProductSchema,
    cache: { ttl: 300000 }, // Cache products for 5 minutes
  },

  searchProducts: {
    method: 'GET',
    path: '/products/search',
    query: nativeSchema.object({
      q: nativeSchema.string(),
      category: nativeSchema.string().optional(),
      minPrice: nativeSchema.number().optional(),
      maxPrice: nativeSchema.number().optional(),
      inStock: nativeSchema.boolean().optional(),
      sort: nativeSchema.enum(['price', 'rating', 'newest'] as const).default('rating'),
    }),
    response: nativeSchema.object({
      products: nativeSchema.array(ProductSchema),
      total: nativeSchema.number(),
      facets: nativeSchema.object({
        categories: nativeSchema.array(nativeSchema.string()),
        priceRanges: nativeSchema.array(
          nativeSchema.object({
            min: nativeSchema.number(),
            max: nativeSchema.number(),
            count: nativeSchema.number(),
          })
        ),
      }),
    }),
  },

  // Cart operations
  getCart: {
    method: 'GET',
    path: '/cart/:userId',
    params: nativeSchema.object({ userId: nativeSchema.string() }),
    response: CartSchema,
    cache: { ttl: 30000 }, // Short cache for cart
  },

  addToCart: {
    method: 'POST',
    path: '/cart/:userId/items',
    params: nativeSchema.object({ userId: nativeSchema.string() }),
    body: nativeSchema.object({
      productId: nativeSchema.string(),
      quantity: nativeSchema.number().positive(),
    }),
    response: CartSchema,
    cache: null, // No caching for mutations
  },

  // Order operations
  createOrder: {
    method: 'POST',
    path: '/orders',
    body: CreateOrderSchema,
    response: OrderSchema,
    timeout: 30000, // Longer timeout for order creation
    retry: { times: 1 }, // Don't retry order creation
  },

  getOrderStatus: {
    method: 'GET',
    path: '/orders/:id/status',
    params: nativeSchema.object({ id: nativeSchema.string() }),
    response: nativeSchema.object({
      status: nativeSchema.enum(['pending', 'processing', 'shipped', 'delivered'] as const),
      tracking: nativeSchema.string().optional(),
      estimatedDelivery: nativeSchema.string().datetime().optional(),
    }),
    cache: { ttl: 60000 }, // Cache status for 1 minute
  },
})
```

### Microservices Integration

```typescript
// User service
const UserService = createAuthenticatedResource(
  'user-service',
  {
    getProfile: {
      method: 'GET',
      path: '/profile/:id',
      params: nativeSchema.object({ id: nativeSchema.string() }),
      response: UserProfileSchema,
    },
    updateProfile: {
      method: 'PUT',
      path: '/profile/:id',
      params: nativeSchema.object({ id: nativeSchema.string() }),
      body: UpdateProfileSchema,
      response: UserProfileSchema,
    },
  },
  { baseUrl: 'https://user-service.internal' }
)

// Notification service
const NotificationService = createAuthenticatedResource(
  'notification-service',
  {
    send: {
      method: 'POST',
      path: '/notifications',
      body: nativeSchema.object({
        userId: nativeSchema.string(),
        type: nativeSchema.enum(['email', 'sms', 'push'] as const),
        template: nativeSchema.string(),
        data: nativeSchema.record(nativeSchema.unknown()),
      }),
      response: nativeSchema.object({
        id: nativeSchema.string(),
        status: nativeSchema.enum(['sent', 'queued', 'failed'] as const),
      }),
    },
  },
  { baseUrl: 'https://notification-service.internal' }
)

// Analytics service
const AnalyticsService = createAuthenticatedResource(
  'analytics-service',
  {
    track: {
      method: 'POST',
      path: '/events',
      body: nativeSchema.object({
        userId: nativeSchema.string().optional(),
        event: nativeSchema.string(),
        properties: nativeSchema.record(nativeSchema.unknown()),
        timestamp: nativeSchema.string().datetime().optional(),
      }),
      response: nativeSchema.object({ tracked: nativeSchema.boolean() }),
    },
  },
  {
    baseUrl: 'https://analytics-service.internal',
    retry: { times: 2 }, // Analytics can be retried
  }
)
```

## Best Practices

### Resource Design

```typescript
// ✅ Good: Descriptive resource names
const UserAPI = resource('users', operations)
const PaymentAPI = resource('payments', operations)

// ❌ Avoid: Generic names
const API = resource('api', operations)
const Service = resource('service', operations)

// ✅ Good: Consistent operation naming
const UserAPI = resource('users', {
  get: { method: 'GET', path: '/users/:id' },
  list: { method: 'GET', path: '/users' },
  create: { method: 'POST', path: '/users' },
  update: { method: 'PUT', path: '/users/:id' },
  delete: { method: 'DELETE', path: '/users/:id' },
})

// ❌ Avoid: Inconsistent naming
const UserAPI = resource('users', {
  fetchUser: { method: 'GET', path: '/users/:id' },
  getAllUsers: { method: 'GET', path: '/users' },
  addUser: { method: 'POST', path: '/users' },
  modifyUser: { method: 'PUT', path: '/users/:id' },
  removeUser: { method: 'DELETE', path: '/users/:id' },
})
```

### Error Handling

```typescript
// ✅ Good: Comprehensive error handling
const result = await UserAPI.get.run({ id })

result.match({
  Ok: user => {
    // Handle success case
    updateUI(user)
  },
  Err: error => {
    // Handle specific error types
    switch (error.code) {
      case 'HTTP_ERROR':
        if (error.status === 404) {
          showNotFoundMessage()
        } else {
          showGenericError()
        }
        break
      case 'NETWORK_ERROR':
        showNetworkError()
        break
      default:
        showGenericError()
    }
  },
})

// ❌ Avoid: Ignoring errors
const result = await UserAPI.get.run({ id })
if (result.tag === 'Ok') {
  updateUI(result.value) // What if it fails?
}
```

### Performance Optimization

```typescript
// ✅ Good: Appropriate caching strategies
const OptimizedAPI = resource('optimized', {
  // Cache static/slow-changing data
  config: {
    method: 'GET',
    path: '/config',
    cache: { ttl: 3600000 }, // 1 hour
  },

  // Short cache for dynamic data
  stats: {
    method: 'GET',
    path: '/stats',
    cache: { ttl: 30000 }, // 30 seconds
  },

  // No cache for mutations
  update: {
    method: 'POST',
    path: '/update',
    cache: null,
  },
})

// ✅ Good: Appropriate timeouts
const TimeoutAPI = resource('timeout', {
  quickCheck: {
    method: 'GET',
    path: '/health',
    timeout: 1000, // Fast health check
  },

  dataProcessing: {
    method: 'POST',
    path: '/process',
    timeout: 30000, // Longer for processing
  },
})
```

The Resource API provides the foundation for Kairo's INTERFACE pillar, enabling you to build type-safe, performant, and maintainable integrations with external systems while eliminating the boilerplate typically associated with API clients.
