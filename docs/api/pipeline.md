# Pipeline API

The Pipeline is the core of Kairo's **PROCESS Pillar** - providing composable, declarative business logic with built-in error handling, validation, and observability. Pipelines transform complex business workflows into readable, type-safe compositions.

## Overview

- **🔄 Composable** - Chain operations fluently with full type safety
- **🛡️ Predictable** - Result pattern eliminates exceptions
- **⚡ High Performance** - Lazy execution with built-in optimizations
- **🔍 Observable** - Built-in tracing and debugging capabilities
- **🎯 Business Focused** - Express what your application does, not how

## Creating Pipelines

```typescript
import { pipeline, nativeSchema, rules, rule } from 'kairo'

// Simple data processing pipeline
const userProcessingPipeline = pipeline('user-processing')
  .input(
    nativeSchema.object({
      name: nativeSchema.string().min(2),
      email: nativeSchema.string().email(),
      age: nativeSchema.number().min(0),
    })
  )
  .map(user => ({ ...user, slug: slugify(user.name) }))
  .validate(
    nativeSchema.object({
      name: nativeSchema.string(),
      email: nativeSchema.string().email(),
      age: nativeSchema.number(),
      slug: nativeSchema.string(),
    })
  )
  .trace('user-processed')

// Business logic pipeline with validation rules
const orderProcessingPipeline = pipeline('order-processing')
  .input(OrderSchema)
  .validateAll(orderValidationRules)
  .map(enrichOrderData)
  .pipeline(InventoryAPI.reserve)
  .pipeline(PaymentAPI.process)
  .map(addConfirmationData)
  .trace('order-processed')
```

## Core Methods

### `.input(schema)`

Defines and validates the pipeline input with native schemas.

```typescript
import { nativeSchema } from 'kairo'

const userPipeline = pipeline('user-processing').input(
  nativeSchema.object({
    id: nativeSchema.string().uuid(),
    email: nativeSchema.string().email(),
    age: nativeSchema.number().min(0).max(150),
  })
)
```

### `.map(fn)`

Transforms data through pure functions with full type safety.

```typescript
// Simple transformation
.map(user => ({ ...user, displayName: user.name.toUpperCase() }))

// Complex business logic
.map(order => ({
  ...order,
  total: order.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  tax: calculateTax(order),
  shipping: calculateShipping(order),
}))

// Conditional transformation
.map(user => ({
  ...user,
  status: user.lastLogin > thirtyDaysAgo ? 'active' : 'inactive',
}))
```

### `.validate(schema)`

Validates intermediate data with native schemas.

```typescript
.validate(nativeSchema.object({
  id: nativeSchema.string().uuid(),
  total: nativeSchema.number().positive(),
  status: nativeSchema.enum(['pending', 'processing', 'completed'] as const),
}))
```

### `.pipeline(pipeline | resource)`

Composes pipelines together or integrates with resources from the INTERFACE pillar.

```typescript
// Compose with another pipeline
.pipeline(validateUserPipeline)

// Integrate with API resource
.pipeline(UserAPI.create)

// Chain multiple resources
.pipeline(UserAPI.create)
.pipeline(EmailAPI.sendWelcome)
.pipeline(AnalyticsAPI.trackSignup)
```

### `.run(asyncFn)`

Executes async operations within the pipeline flow.

```typescript
.run(async user => {
  // Custom async logic
  const profile = await ProfileService.createProfile(user)
  return { ...user, profileId: profile.id }
})

// Repository integration
.run(async user => await userRepository.create(user))

// Multiple async operations
.run(async order => {
  const [inventory, payment] = await Promise.all([
    InventoryService.reserve(order),
    PaymentService.process(order),
  ])
  return { ...order, inventoryId: inventory.id, paymentId: payment.id }
})
```

## Business Rules Integration

### `.validateRule(rule)`

Validates data against a single business rule.

```typescript
import { rule } from 'kairo'

const ageRule = rule()
  .require(user => user.age >= 18)
  .message('Must be 18 or older')

const userPipeline = pipeline('user-validation')
  .input(UserSchema)
  .validateRule(ageRule)
  .map(user => ({ ...user, validated: true }))
```

### `.validateRules(rules, ruleNames)`

Validates against specific rules from a rule set.

```typescript
import { rules } from 'kairo'

const userRules = rules('user-validation', {
  ageRequirement: rule()
    .require(user => user.age >= 18)
    .message('Must be 18+'),
  emailFormat: rule()
    .require(user => user.email.includes('@'))
    .message('Invalid email'),
  nameLength: rule()
    .require(user => user.name.length >= 2)
    .message('Name too short'),
})

const pipeline = pipeline('validate-user')
  .input(UserSchema)
  .validateRules(userRules, ['ageRequirement', 'emailFormat'])
  .map(processValidUser)
```

### `.validateAll(rules)`

Validates against all rules in a rule set.

```typescript
const comprehensiveValidation = pipeline('comprehensive-validation')
  .input(UserSchema)
  .validateAll(userRules) // Validates all rules
  .map(user => ({ ...user, fullyValidated: true }))
```

## Data Transformation Integration

### `.transform(transform)`

Applies declarative data transformations from the DATA pillar.

```typescript
import { transform } from 'kairo'

const userTransform = transform('normalize-user', ExternalUserSchema)
  .to(UserSchema)
  .map('external_id', 'id')
  .map('full_name', 'name')
  .map('email_address', 'email')
  .compute('slug', source => slugify(source.full_name))

const processExternalUser = pipeline('process-external-user')
  .input(ExternalUserSchema)
  .transform(userTransform)
  .pipeline(UserAPI.create)
  .trace('external-user-processed')
```

## Advanced Control Flow

### `.parallel(pipelines)`

Executes multiple pipelines in parallel and combines results.

```typescript
const userDashboard = pipeline('user-dashboard')
  .input(nativeSchema.object({ userId: nativeSchema.string() }))
  .parallel([
    UserAPI.get, // Get user info
    PostAPI.getUserPosts, // Get user posts
    FriendsAPI.getFriends, // Get user friends
  ])
  .map(([user, posts, friends]) => ({
    user,
    stats: {
      postsCount: posts.length,
      friendsCount: friends.length,
      joinedDate: user.createdAt,
    },
  }))
```

### `.fallback(primaryPipeline, fallbackPipeline)`

Provides fallback logic when primary operations fail.

```typescript
const resilientUserFetch = pipeline('resilient-user-fetch')
  .input(nativeSchema.object({ userId: nativeSchema.string() }))
  .fallback(
    UserAPI.get, // Try primary API first
    CacheAPI.getUserFromCache // Fall back to cache
  )
  .map(user => ({ ...user, source: 'api_or_cache' }))
```

### `.branch(config)`

Conditional pipeline execution based on data or context.

```typescript
const orderProcessing = pipeline('order-processing')
  .input(OrderSchema)
  .branch({
    condition: order => order.total > 1000,
    then: pipeline('high-value-order')
      .pipeline(ManagerApprovalAPI.requestApproval)
      .pipeline(PremiumProcessingAPI.process),
    else: pipeline('standard-order').pipeline(StandardProcessingAPI.process),
  })
  .map(addOrderConfirmation)
```

## Performance and Reliability

### `.retry(options)`

Retries failed operations with configurable strategies.

```typescript
// Simple retry with exponential backoff
.retry({ times: 3, delay: 1000, backoff: 'exponential' })

// Advanced retry configuration
.retry({
  times: 5,
  delay: 500,
  backoff: 'linear',
  retryIf: error => error.code === 'NETWORK_ERROR',
  onRetry: (attempt, error) => console.log(`Retry ${attempt}: ${error.message}`),
})
```

### `.timeout(ms)`

Sets operation timeouts with graceful error handling.

```typescript
.timeout(5000) // 5 second timeout

// With custom timeout error handling
.timeout(10000, {
  onTimeout: (operation, duration) => {
    console.warn(`Operation ${operation} timed out after ${duration}ms`)
  },
})
```

### `.cache(options)`

Intelligent caching with TTL and custom key generation.

```typescript
// Simple TTL caching
.cache({ ttl: 300000 }) // Cache for 5 minutes

// Advanced caching with custom keys
.cache({
  ttl: 600000, // 10 minutes
  key: (input) => `user:${input.userId}:${input.version}`,
  skipIf: (input) => input.skipCache === true,
  onHit: (key) => console.log(`Cache hit: ${key}`),
  onMiss: (key) => console.log(`Cache miss: ${key}`),
})
```

## Observability and Debugging

### `.trace(label?, options?)`

Enables comprehensive tracing for debugging and performance monitoring.

```typescript
// Simple tracing
const tracedPipeline = userPipeline.trace('user-processing-complete')

// Advanced tracing with options
const detailedTracedPipeline = orderPipeline.trace('order-flow', {
  includeInput: true,
  includeOutput: true,
  includeTimings: true,
  includeErrors: true,
})

// Conditional tracing (only in development)
const conditionalTracing = userPipeline.trace('dev-only', {
  enabled: process.env.NODE_ENV === 'development',
})
```

### `.log(label?, options?)`

Adds logging to pipeline execution for development and monitoring.

```typescript
// Simple logging
.log('user-processed')

// Advanced logging with custom format
.log('order-step', {
  format: (data, context) => `Order ${data.id} processed in ${context.duration}ms`,
  level: 'info',
  includeContext: true,
})
```

## Execution

### `.run(input)`

Executes the pipeline with full error handling and type safety.

```typescript
const result = await userPipeline.run({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
})

// Pattern matching for clean error handling
result.match({
  Ok: user => {
    console.log('User processed successfully:', user.name)
    console.log('Generated slug:', user.slug)
    // user is fully typed based on pipeline transformations
  },
  Err: error => {
    console.error('Pipeline failed:', error.message)

    // Handle specific error types
    switch (error.code) {
      case 'VALIDATION_ERROR':
        console.log('Input validation failed:', error.field)
        break
      case 'BUSINESS_RULE_ERROR':
        console.log('Business rule violation:', error.ruleName)
        break
      case 'HTTP_ERROR':
        console.log('API call failed:', error.status, error.url)
        break
      default:
        console.log('Unexpected error occurred')
    }
  },
})

// Traditional error checking
if (result.tag === 'Ok') {
  const user = result.value // Fully typed
  processSuccessfulUser(user)
} else {
  const error = result.error // Structured error information
  handleUserProcessingError(error)
}
```

### Async Iteration

```typescript
// Process multiple items through the same pipeline
const userInputs = [
  { name: 'John', email: 'john@example.com', age: 30 },
  { name: 'Jane', email: 'jane@example.com', age: 25 },
  { name: 'Bob', email: 'bob@example.com', age: 35 },
]

const results = await Promise.all(userInputs.map(input => userPipeline.run(input)))

// Process results with type safety
results.forEach((result, index) => {
  result.match({
    Ok: user => console.log(`User ${index + 1} processed: ${user.name}`),
    Err: error => console.error(`User ${index + 1} failed: ${error.message}`),
  })
})
```

## Pipeline Composition Patterns

### Reusable Pipeline Components

```typescript
// Create reusable pipeline components
const validateUserInput = pipeline('validate-user-input')
  .input(CreateUserSchema)
  .validateAll(userValidationRules)

const enrichUserData = pipeline('enrich-user-data')
  .map(user => ({ ...user, slug: slugify(user.name) }))
  .map(user => ({ ...user, createdAt: new Date().toISOString() }))

const persistUser = pipeline('persist-user')
  .pipeline(UserAPI.create)
  .run(async user => await userRepository.create(user))

// Compose into complete workflow
const completeUserRegistration = pipeline('user-registration')
  .input(CreateUserSchema)
  .pipeline(validateUserInput)
  .pipeline(enrichUserData)
  .pipeline(persistUser)
  .parallel([EmailAPI.sendWelcome, AnalyticsAPI.trackSignup, NotificationAPI.sendToAdmins])
  .trace('user-registration-complete')
```

### Pipeline Factories

```typescript
// Create configurable pipeline factories
const createProcessingPipeline = <T>(
  name: string,
  inputSchema: Schema<T>,
  processor: (data: T) => Promise<ProcessedData>
) =>
  pipeline(name)
    .input(inputSchema)
    .run(processor)
    .validate(ProcessedDataSchema)
    .trace(`${name}-completed`)

// Use the factory for different data types
const userProcessor = createProcessingPipeline('user-processor', UserSchema, processUserData)

const orderProcessor = createProcessingPipeline('order-processor', OrderSchema, processOrderData)
```

## Real-World Examples

### E-commerce Order Processing

```typescript
const processOrder = pipeline('e-commerce-order')
  .input(
    nativeSchema.object({
      customerId: nativeSchema.string().uuid(),
      items: nativeSchema.array(
        nativeSchema.object({
          productId: nativeSchema.string().uuid(),
          quantity: nativeSchema.number().positive(),
        })
      ),
      shippingAddress: AddressSchema,
      paymentMethod: PaymentMethodSchema,
    })
  )
  .validateAll(orderValidationRules)
  .map(enrichOrderWithPricing)
  .parallel([
    InventoryAPI.reserveItems,
    PaymentAPI.validatePaymentMethod,
    ShippingAPI.calculateCost,
  ])
  .map(([order, inventory, payment, shipping]) => ({
    ...order,
    inventoryReservation: inventory,
    paymentValidation: payment,
    shippingCost: shipping.cost,
    total: order.subtotal + shipping.cost + order.tax,
  }))
  .branch({
    condition: order => order.total > 1000,
    then: pipeline('high-value-order')
      .pipeline(FraudDetectionAPI.analyze)
      .pipeline(ManagerApprovalAPI.request),
    else: pipeline('standard-order').map(order => ({ ...order, approved: true })),
  })
  .pipeline(PaymentAPI.processPayment)
  .pipeline(FulfillmentAPI.createShipment)
  .parallel([
    EmailAPI.sendOrderConfirmation,
    SMSApi.sendShippingNotification,
    AnalyticsAPI.trackOrderCompletion,
  ])
  .trace('order-processing-complete')
```

### User Authentication Pipeline

```typescript
const authenticateUser = pipeline('user-authentication')
  .input(
    nativeSchema.object({
      email: nativeSchema.string().email(),
      password: nativeSchema.string().min(8),
    })
  )
  .validateRule(
    rule()
      .async(credentials => UserAPI.checkCredentials.run(credentials))
      .require(result => result.match({ Ok: valid => valid, Err: () => false }))
      .message('Invalid credentials')
  )
  .pipeline(UserAPI.getByEmail)
  .validateRule(
    rule()
      .require(user => user.active)
      .message('Account is disabled')
  )
  .map(user => ({
    ...user,
    lastLogin: new Date().toISOString(),
    loginCount: user.loginCount + 1,
  }))
  .run(async user => {
    const token = await TokenService.generateToken(user)
    await userRepository.update(user.id, {
      lastLogin: user.lastLogin,
      loginCount: user.loginCount,
    })
    return { ...user, token }
  })
  .parallel([AnalyticsAPI.trackLogin, SecurityAPI.logAuthEvent])
  .trace('user-authenticated')
```

## Type Safety and Inference

Pipelines maintain complete type safety throughout the chain with automatic TypeScript inference:

```typescript
const typedPipeline = pipeline('fully-typed')
  .input(
    nativeSchema.object({
      userId: nativeSchema.string().uuid(),
      preferences: nativeSchema.object({
        theme: nativeSchema.enum(['light', 'dark'] as const),
        language: nativeSchema.string(),
      }),
    })
  ) // Input: { userId: string, preferences: { theme: 'light' | 'dark', language: string } }
  .pipeline(UserAPI.get) // Returns: User
  .map(user => ({
    ...user,
    displayName: `${user.firstName} ${user.lastName}`,
    isActive: user.lastLogin > thirtyDaysAgo,
  })) // Returns: User & { displayName: string, isActive: boolean }
  .validate(
    nativeSchema.object({
      id: nativeSchema.string().uuid(),
      displayName: nativeSchema.string(),
      isActive: nativeSchema.boolean(),
    })
  ) // Validates and maintains type
  .map(user => user.displayName) // Returns: string

// result.value is automatically typed as string
const result = await typedPipeline.run({
  userId: 'user-123',
  preferences: { theme: 'dark', language: 'en' },
})

result.match({
  Ok: displayName => {
    // displayName is typed as string
    console.log(`Welcome, ${displayName.toUpperCase()}`)
  },
  Err: error => {
    console.error('Pipeline failed:', error.message)
  },
})
```

### Type Inference with Business Rules

```typescript
const validatedPipeline = pipeline('validated-user')
  .input(UserRegistrationSchema)
  .validateAll(userValidationRules) // Maintains input type
  .map(user => ({ ...user, validated: true })) // Adds validated: boolean
  .pipeline(UserAPI.create) // API response type is inferred
// TypeScript knows the exact shape at each step
```

## Performance Characteristics

### Execution Performance

- **⚡ Lazy Evaluation** - Operations only execute when `.run()` is called
- **🔄 Parallel Processing** - Concurrent execution of independent operations
- **💾 Intelligent Caching** - Reduces redundant API calls and computations
- **🎯 Optimized Composition** - Minimal overhead for chaining operations

### Memory Efficiency

```typescript
// Pipelines use minimal memory - no intermediate storage
const efficientPipeline = pipeline('memory-efficient')
  .input(LargeDataSchema)
  .map(data => processInChunks(data)) // Streaming processing
  .cache({ ttl: 60000 }) // Only cache final result
  .trace('processing-complete', { includeInput: false }) // Exclude large inputs from traces
```

### Performance Monitoring

```typescript
import { tracing } from 'kairo'

// Enable detailed performance monitoring
const monitoredPipeline = orderPipeline.trace('order-performance', {
  includeTimings: true,
  includeMemoryUsage: true,
})

await monitoredPipeline.run(orderData)

// Analyze performance data
const traces = tracing.query({ pipelineName: 'order-performance' })
const summary = tracing.summary(traces)

console.log(`Average execution time: ${summary.averageDuration}ms`)
console.log(`P95 execution time: ${summary.p95Duration}ms`)
console.log(`Success rate: ${summary.successRate}%`)
```

## Testing Pipeline Components

```typescript
import { pipelineTesting } from 'kairo/testing'

describe('User Processing Pipeline', () => {
  it('should process valid user data', async () => {
    await pipelineTesting
      .expect(userProcessingPipeline, validUserData)
      .shouldSucceed()
      .shouldReturnValue(
        expect.objectContaining({
          name: 'John Doe',
          slug: 'john-doe',
          validated: true,
        })
      )
      .shouldCompleteWithin(1000)
  })

  it('should handle validation errors', async () => {
    await pipelineTesting
      .expect(userProcessingPipeline, invalidUserData)
      .shouldFail()
      .shouldFailWithError({ code: 'VALIDATION_ERROR' })
  })

  it('should handle business rule violations', async () => {
    await pipelineTesting
      .expect(userProcessingPipeline, underageUser)
      .shouldFail()
      .shouldFailWithError({ code: 'BUSINESS_RULE_ERROR' })
  })
})
```

## Best Practices

### Pipeline Design

1. **🏷️ Name pipelines descriptively** - Use business-meaningful names like `processOrder` or `authenticateUser`
2. **📝 Document pipeline purpose** - Add comments explaining the business workflow
3. **⚡ Keep pipelines focused** - One pipeline should handle one business process
4. **🔄 Compose larger workflows** - Combine focused pipelines for complex processes

### Error Handling

```typescript
// ✅ Good: Comprehensive error handling
const robustPipeline = pipeline('robust-processing')
  .input(InputSchema)
  .retry({ times: 3, delay: 1000 })
  .timeout(30000)
  .fallback(primaryPipeline, fallbackPipeline)
  .trace('robust-processing')

// ❌ Avoid: No error handling
const fragileePipeline = pipeline('fragile').input(InputSchema).pipeline(UnreliableAPI.process) // Could fail without recovery
```

### Performance Optimization

```typescript
// ✅ Good: Optimized for performance
const optimizedPipeline = pipeline('optimized')
  .input(InputSchema)
  .cache({ ttl: 300000 }) // Cache expensive operations
  .parallel([fastOperation, slowOperation.timeout(5000)])
  .trace('optimized', { includeInput: false }) // Reduce trace size

// ❌ Avoid: Sequential when parallel is possible
const slowPipeline = pipeline('slow')
  .pipeline(operation1)
  .pipeline(operation2) // Could run in parallel with operation1
  .pipeline(operation3)
```

### Type Safety

```typescript
// ✅ Good: Full type safety with schemas
const typeSafePipeline = pipeline('type-safe')
  .input(StrictInputSchema)
  .validate(intermediateSchema)
  .map(typedTransformation)
  .validate(OutputSchema)

// ❌ Avoid: Loose typing with any
const unsafePipeline = pipeline('unsafe')
  .input(anySchema)
  .map((data: any) => data.anything) // No type safety
```

Pipelines are the heart of Kairo's declarative business logic approach, enabling you to express complex workflows as readable, composable, and fully type-safe operations. By leveraging the full power of the PROCESS pillar, you can build maintainable business logic that clearly expresses intent while handling all the infrastructure concerns automatically.
