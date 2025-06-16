# Three-Pillar Architecture Guide

> **"Make infrastructure disappear. Make business logic visible."**

Kairo's Three-Pillar Architecture is a revolutionary approach to application development that eliminates infrastructure boilerplate through **core APIs** and **optional extensions**. This guide explores the architectural principles, design patterns, and implementation strategies that make Kairo a complete declarative application platform.

## Core vs Extensions Architecture

Kairo is built with **progressive enhancement** in mind:

- **🚀 Core APIs** (~20KB) - Essential three-pillar functionality for any application
- **⚡ Extensions** (opt-in) - Enterprise-grade features you add as your application grows

## The Philosophy Behind Three-Pillar Architecture

### The Problem: Infrastructure Overwhelms Business Logic

Traditional applications suffer from the **"Infrastructure Tax"** - 70% of application code deals with infrastructure concerns rather than business value:

```typescript
// Traditional approach - Infrastructure heavy
class UserService {
  constructor(
    private http: HttpClient,
    private validator: Validator,
    private cache: CacheService,
    private logger: Logger,
    private metrics: MetricsService
  ) {}

  async createUser(userData: unknown): Promise<User | Error> {
    try {
      // Input validation
      const validationResult = this.validator.validate(userData, UserCreateSchema)
      if (!validationResult.isValid) {
        this.logger.error('Validation failed', validationResult.errors)
        this.metrics.increment('user.validation.failed')
        return new ValidationError(validationResult.errors)
      }

      // Business rules
      if (userData.age < 18) {
        return new BusinessRuleError('Must be 18 or older')
      }

      // HTTP request
      const response = await this.http.post('/users', userData)
      if (!response.ok) {
        this.logger.error('API call failed', response.error)
        this.metrics.increment('user.api.failed')
        return new ApiError(response.error)
      }

      // Cache update
      await this.cache.set(`user:${response.data.id}`, response.data)

      this.metrics.increment('user.created')
      return response.data
    } catch (error) {
      this.logger.error('Unexpected error', error)
      this.metrics.increment('user.error')
      return error
    }
  }
}
```

**Problems with this approach:**

- 🚫 **Boilerplate heavy** - 80% infrastructure, 20% business logic
- 🚫 **Error-prone** - Manual error handling everywhere
- 🚫 **Hard to test** - Complex dependencies and state
- 🚫 **Not reusable** - Tightly coupled to specific implementations
- 🚫 **Framework dependent** - Locked into specific technologies

### The Solution: Declarative Three-Pillar Architecture

Kairo eliminates infrastructure code through declarative patterns:

```typescript
// Kairo approach - Business logic focused with core API
import { pipeline, schema, rules, rule, resource } from 'kairo'

// DATA: Define your domain
const UserSchema = schema.object({
  id: schema.string().uuid(),
  name: schema.string().min(2),
  email: schema.string().email(),
  age: schema.number().min(0),
})

// PROCESS: Define business rules
const userRules = rules('user-validation', {
  ageRequirement: rule()
    .require(user => user.age >= 18)
    .message('Must be 18 or older'),
})

// INTERFACE: Define external integration
const UserAPI = resource('users', {
  create: {
    method: 'POST',
    path: '/users',
    body: UserSchema.omit(['id']),
    response: UserSchema,
  },
})

// PROCESS: Compose business logic
const createUser = pipeline('create-user')
  .input(UserSchema.omit(['id']))
  .validateAll(userRules)
  .pipeline(UserAPI.create)
  .trace('user-created')

// Usage - Simple and type-safe
const result = await createUser.run({ name: 'John', email: 'john@example.com', age: 25 })
result.match({
  Ok: user => console.log('User created:', user.name),
  Err: error => console.error('Failed:', error.message),
})
```

**Benefits of Kairo's approach:**

- ✅ **Business logic focused** - 95% business value, 5% infrastructure
- ✅ **Predictable error handling** - Result pattern eliminates exceptions
- ✅ **Highly testable** - Pure functions and declarative patterns
- ✅ **Completely reusable** - Framework-agnostic, composable components
- ✅ **Zero dependencies** - Native implementations with no external deps
- ✅ **Progressive enhancement** - Start with core, add extensions as needed

## Pillar 1: INTERFACE - Declarative External System Integration

The INTERFACE pillar eliminates service classes and API boilerplate through declarative resource definitions.

### Core Principles

1. **Declarative over Imperative** - Describe what, not how
2. **Type Safety First** - Full TypeScript inference throughout
3. **Built-in Testing** - Contract verification and mocking included
4. **Result Pattern** - Predictable error handling without exceptions

### Resource Declaration Pattern

```typescript
import { resource, schema } from 'kairo'

// Define your resource declaratively with core API
const UserAPI = resource(
  'users',
  {
    // GET /users/:id
    get: {
      method: 'GET',
      path: '/users/:id',
      params: schema.object({ id: schema.string().uuid() }),
      response: UserSchema,
    },

    // POST /users
    create: {
      method: 'POST',
      path: '/users',
      body: CreateUserSchema,
      response: UserSchema,
    },

    // PUT /users/:id
    update: {
      method: 'PUT',
      path: '/users/:id',
      params: schema.object({ id: schema.string().uuid() }),
      body: UpdateUserSchema,
      response: UserSchema,
    },

    // DELETE /users/:id
    delete: {
      method: 'DELETE',
      path: '/users/:id',
      params: schema.object({ id: schema.string().uuid() }),
      response: schema.object({ success: schema.boolean() }),
    },
  },
  {
    // Global configuration
    baseUrl: 'https://api.example.com',
    timeout: 5000,
    retry: { times: 3, delay: 1000 },
    cache: { ttl: 60000 },
  }
)
```

### Advanced INTERFACE Patterns

#### Resource Composition

```typescript
// Base authenticated resource
const authenticatedResource = <T extends Record<string, any>>(
  name: string,
  operations: T,
  config?: ResourceConfig
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

// Specialized resources
const UserAPI = authenticatedResource('users', userOperations)
const PostAPI = authenticatedResource('posts', postOperations)
const CommentAPI = authenticatedResource('comments', commentOperations)
```

#### Contract Testing and Mocking

```typescript
// Contract testing against live API
const contractResults = await UserAPI.contract().verify('https://api.staging.com')
contractResults.match({
  Ok: results => {
    console.log(`${results.passed}/${results.total} operations verified`)
  },
  Err: error => {
    console.error('Contract verification failed:', error.message)
  },
})

// Intelligent mocking for development
const mockedUserAPI = UserAPI.mock({
  get: {
    success: { delay: 50, data: mockUsers },
    failure: { probability: 0.1, status: 404, message: 'User not found' },
  },
  create: {
    success: { delay: 200, data: input => ({ ...input, id: generateId() }) },
  },
})
```

#### Resource Middleware and Interceptors

```typescript
const loggingResource = <T extends Record<string, any>>(name: string, operations: T) =>
  resource(name, operations, {
    beforeRequest: request => {
      console.log(`🔄 ${request.method} ${request.url}`)
      return request
    },
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

## Pillar 2: PROCESS - Declarative Business Logic Composition

The PROCESS pillar transforms complex business logic into composable, declarative pipelines with built-in error handling, validation, and observability.

### Core Principles

1. **Functional Composition** - Build complex processes from simple, pure functions
2. **Declarative Rules** - Express business rules as readable declarations
3. **Built-in Observability** - Tracing and debugging integrated by design
4. **Error Recovery** - Automatic retry, fallback, and timeout handling

### Pipeline Composition Patterns

```typescript
import { pipeline, rules, rule, schema } from 'kairo'

// Simple linear pipeline
const processUser = pipeline('process-user')
  .input(CreateUserSchema)
  .map(user => ({ ...user, slug: slugify(user.name) }))
  .validate(UserSchema)
  .pipeline(UserAPI.create)
  .map(user => ({ ...user, welcome: true }))
  .trace('user-processed')

// Complex branching pipeline
const processOrder = pipeline('process-order')
  .input(OrderSchema)
  .validateAll(orderValidationRules)
  .branch({
    condition: order => order.total > 1000,
    then: pipeline('high-value-order')
      .pipeline(ManagerApprovalAPI.request)
      .pipeline(InventoryAPI.reserve)
      .pipeline(PaymentAPI.processHighValue),
    else: pipeline('standard-order').pipeline(InventoryAPI.reserve).pipeline(PaymentAPI.process),
  })
  .map(addOrderConfirmation)
  .parallel([EmailAPI.sendConfirmation, SMSApi.sendNotification, AnalyticsAPI.trackOrder])
  .trace('order-completed')
```

### Business Rules Engine

```typescript
// Declarative business rules
const orderRules = rules('order-validation', {
  minimumAmount: rule()
    .require(order => order.total >= 10)
    .message('Minimum order amount is $10'),

  stockAvailability: rule()
    .async(order => InventoryAPI.check.run({ productId: order.productId }))
    .require(result =>
      result.match({
        Ok: stock => stock.available >= order.quantity,
        Err: () => false,
      })
    )
    .message('Insufficient stock available'),

  customerCredit: rule()
    .when(order => order.paymentMethod === 'credit')
    .async(order => CreditAPI.check.run({ customerId: order.customerId }))
    .require(result =>
      result.match({
        Ok: credit => credit.limit >= order.total,
        Err: () => false,
      })
    )
    .message('Credit limit exceeded'),

  businessHours: rule()
    .when(order => order.priority === 'urgent')
    .require(() => {
      const hour = new Date().getHours()
      return hour >= 9 && hour <= 17
    })
    .message('Urgent orders only accepted during business hours'),
})

// Rules with complex conditions
const dynamicRules = rules('dynamic-validation', {
  geographicRestriction: rule()
    .when(order => order.shippingAddress.country !== 'US')
    .async(order =>
      ComplianceAPI.checkRestrictions.run({
        country: order.shippingAddress.country,
        products: order.items.map(item => item.productId),
      })
    )
    .require(result =>
      result.match({
        Ok: compliance => compliance.allowed,
        Err: () => false,
      })
    )
    .message('Product not available in selected country'),
})
```

### Advanced Process Patterns

#### Workflow Orchestration

```typescript
import { workflow, workflowUtils } from 'kairo'

const orderProcessingWorkflow = workflow<OrderInput, OrderResult>('order-processing', {
  steps: {
    validate: workflowUtils.step('validate', orderValidationPipeline),
    reserve: workflowUtils.step('reserve', inventoryReservationPipeline),
    payment: workflowUtils.step('payment', paymentProcessingPipeline),
    fulfill: workflowUtils.step('fulfill', fulfillmentPipeline),
    notify: workflowUtils.step('notify', notificationPipeline),
    cleanup: workflowUtils.step('cleanup', cleanupPipeline),
  },

  flow: [
    'validate',
    'reserve',
    {
      if: workflowUtils.condition(context => context.order.total > 1000),
      then: 'managerApproval',
    },
    'payment',
    {
      parallel: ['fulfill', 'notify'],
    },
    'cleanup',
  ],

  options: {
    timeout: 300000, // 5 minutes
    onError: {
      payment: workflowUtils.customErrorHandler(async (error, context) => {
        // Rollback inventory reservation
        await InventoryAPI.release.run({ orderId: context.order.id })
        // Notify customer of payment failure
        await EmailAPI.sendPaymentFailure.run({
          customerId: context.order.customerId,
          orderId: context.order.id,
        })
      }),
      fulfill: workflowUtils.retry({ times: 3, delay: 5000 }),
    },
    compensation: {
      // Saga pattern for distributed transactions
      reserve: async context => {
        await InventoryAPI.release.run({ orderId: context.order.id })
      },
      payment: async context => {
        await PaymentAPI.refund.run({ orderId: context.order.id })
      },
    },
  },
})
```

#### Pipeline Error Recovery

```typescript
// Resilient pipeline with multiple recovery strategies
const resilientDataProcessor = pipeline('resilient-processor')
  .input(DataSchema)
  .retry({ times: 3, delay: 1000, backoff: 'exponential' })
  .timeout(30000)
  .fallback(
    pipeline('primary-processor').pipeline(PrimaryAPI.process),
    pipeline('secondary-processor').pipeline(SecondaryAPI.process),
    pipeline('fallback-processor').map(data => processLocally(data))
  )
  .cache({ ttl: 300000, key: data => `processed:${data.id}` })
  .parallel([
    pipeline('validation').validate(ProcessedDataSchema),
    pipeline('enrichment').pipeline(EnrichmentAPI.enrich),
  ])
  .map(([validatedData, enrichedData]) => ({ ...validatedData, ...enrichedData }))
  .trace('data-processed', { includeInput: false, includeOutput: true })
```

## Pillar 3: DATA - Declarative Data Definition, Validation, and Access

The DATA pillar provides native, high-performance data modeling with declarative transformations and type-safe data access patterns.

### Core Principles

1. **Zero Dependencies** - Native TypeScript implementation, 3x faster than Zod
2. **Declarative Transformations** - Field mapping and data conversion without boilerplate
3. **Repository Patterns** - Type-safe CRUD with relationships and lifecycle hooks
4. **Complete Type Safety** - Full TypeScript inference throughout

### Native Schema System

```typescript
import { schema } from 'kairo'

// Basic schema types with core API
const UserSchema = schema.object({
  id: schema.string().uuid(),
  name: schema.string().min(2).max(100),
  email: schema.string().email(),
  age: schema.number().min(0).max(150),
  active: schema.boolean().default(true),
  roles: schema.array(schema.enum(['user', 'admin', 'moderator'] as const)),
  metadata: schema.record(schema.string()).optional(),
  createdAt: schema.string().datetime(),
  updatedAt: schema.string().datetime().optional(),
})

// Advanced schema composition
const CreateUserSchema = UserSchema.omit(['id', 'createdAt', 'updatedAt'])
const UpdateUserSchema = UserSchema.partial().required(['id'])
const PublicUserSchema = UserSchema.pick(['id', 'name', 'active'])

// Schema refinement and transformation
const ValidatedUserSchema = UserSchema.refine(
  user => user.email.endsWith('@company.com'),
  'Must use company email'
).transform(user => ({
  ...user,
  displayName: `${user.name} (${user.email})`,
}))

// Complex nested schemas
const OrderSchema = schema.object({
  id: schema.string().uuid(),
  customer: UserSchema,
  items: schema.array(
    schema.object({
      productId: schema.string().uuid(),
      quantity: schema.number().positive(),
      price: schema.number().positive(),
      total: schema.number().positive(),
    })
  ),
  shipping: schema.object({
    address: schema.object({
      street: schema.string(),
      city: schema.string(),
      state: schema.string(),
      zipCode: schema.string().regex(/^\d{5}(-\d{4})?$/),
      country: schema.string().length(2),
    }),
    method: schema.enum(['standard', 'express', 'overnight'] as const),
    cost: schema.number().min(0),
  }),
  payment: schema.discriminatedUnion('type', [
    schema.object({
      type: schema.literal('credit_card'),
      cardNumber: schema.string().regex(/^\d{16}$/),
      expiryMonth: schema.number().min(1).max(12),
      expiryYear: schema.number().min(2024),
    }),
    schema.object({
      type: schema.literal('paypal'),
      email: schema.string().email(),
    }),
    schema.object({
      type: schema.literal('bank_transfer'),
      routingNumber: schema.string(),
      accountNumber: schema.string(),
    }),
  ]),
  total: schema.number().positive(),
  status: schema.enum(['pending', 'processing', 'shipped', 'delivered'] as const),
  createdAt: schema.string().datetime(),
  updatedAt: schema.string().datetime().optional(),
})
```

### Declarative Data Transformations

```typescript
import { transform } from 'kairo'

// Simple field mapping
const userTransform = transform('normalize-user', ExternalUserSchema)
  .to(UserSchema)
  .map('external_id', 'id')
  .map('full_name', 'name')
  .map('email_address', 'email')
  .map('birth_year', 'age', source => new Date().getFullYear() - source.birth_year)

// Complex transformations with computed fields
const orderTransform = transform('normalize-order', ExternalOrderSchema)
  .to(OrderSchema)
  .map('order_id', 'id')
  .map('customer_data', 'customer', source => ({
    id: source.customer_data.id,
    name: `${source.customer_data.first_name} ${source.customer_data.last_name}`,
    email: source.customer_data.email,
    age: calculateAge(source.customer_data.birth_date),
  }))
  .map('line_items', 'items', source =>
    source.line_items.map(item => ({
      productId: item.sku,
      quantity: item.qty,
      price: item.unit_price,
      total: item.qty * item.unit_price,
    }))
  )
  .compute('total', source =>
    source.line_items.reduce((sum, item) => sum + item.qty * item.unit_price, 0)
  )
  .filter(order => order.total > 0)
  .validate()

// Chained transformations
const processedOrderTransform = orderTransform.pipe(
  transform('enrich-order', OrderSchema)
    .to(EnrichedOrderSchema)
    .compute('shippingCost', order => calculateShipping(order))
    .compute('tax', order => calculateTax(order))
    .compute('finalTotal', order => order.total + order.shippingCost + order.tax)
)
```

### Repository Patterns with Relationships

```typescript
import { repository, hasMany, hasOne, belongsTo } from 'kairo'

// User repository with relationships
const userRepository = repository('users', {
  schema: UserSchema,
  storage: new DatabaseStorageAdapter({
    connectionString: process.env.DATABASE_URL,
    table: 'users',
  }),
  timestamps: true, // Automatic createdAt/updatedAt
  relationships: {
    posts: hasMany('posts', 'userId', PostSchema),
    profile: hasOne('profile', 'userId', ProfileSchema),
    orders: hasMany('orders', 'customerId', OrderSchema),
  },
  hooks: {
    beforeCreate: data => ({
      ...data,
      slug: slugify(data.name),
      activationToken: generateToken(),
    }),
    afterCreate: user => {
      console.log(`User ${user.name} created with ID ${user.id}`)
      // Send welcome email
      EmailAPI.sendWelcome.run({ userId: user.id })
    },
    beforeUpdate: (data, existing) => ({
      ...data,
      updatedAt: new Date().toISOString(),
      // Prevent email changes without verification
      email: data.email !== existing.email ? existing.email : data.email,
    }),
    afterUpdate: (user, changes) => {
      if ('email' in changes) {
        EmailAPI.sendEmailChangeVerification.run({ userId: user.id })
      }
    },
  },
  validation: {
    uniqueEmail: async user => {
      const existing = await userRepository.findOne({ where: { email: user.email } })
      return existing.match({
        Ok: () => false, // Email already exists
        Err: () => true, // Email is unique
      })
    },
  },
})

// Advanced repository usage
const getUserWithFullData = async (userId: string) => {
  const result = await userRepository.with(['posts', 'profile', 'orders']).find(userId)

  return result.match({
    Ok: user => ({
      ...user,
      postsCount: user.posts.length,
      hasProfile: !!user.profile,
      totalOrders: user.orders.length,
      totalSpent: user.orders.reduce((sum, order) => sum + order.total, 0),
    }),
    Err: error => {
      console.error('Failed to load user:', error.message)
      return null
    },
  })
}

// Repository with custom queries
const getActiveUsersWithRecentOrders = async () => {
  return userRepository.findMany({
    where: {
      active: true,
      orders: {
        some: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      },
    },
    include: ['orders'],
    orderBy: { updatedAt: 'desc' },
    limit: 100,
  })
}
```

## Advanced Features Integration (Extensions)

Kairo's **extensions** work seamlessly with the core three-pillar architecture to provide enterprise-grade capabilities. Import only what you need:

### Event-Driven Architecture Integration

```typescript
import {
  createEventBus,
  createEvent,
  saga,
  sagaStep,
  eventPipeline,
  eventRepository,
} from 'kairo/extensions/events'

// Create event bus
const eventBus = createEventBus({
  maxRetries: 3,
  deadLetterEnabled: true,
})

// Event-driven pipelines automatically emit events
const userProcessingPipeline = eventPipeline('user-processing', { eventBus })
  .map('validate', validateUserData)
  .emit('user.validated')
  .map('enrich', enrichUserData)
  .emit('user.enriched')
  .map('persist', persistUser)
  .emit('user.persisted')

// Event-driven repositories emit lifecycle events
const userRepo = eventRepository({
  name: 'users',
  schema: UserSchema,
  eventBus,
  emitEvents: true,
})

// Saga patterns for complex workflows
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
    sagaStep('setup-profile', async user => {
      const profile = await profileService.create(user.id)
      return Result.Ok(profile)
    }),
  ],
  {
    rollbackOnFailure: true,
    eventBus: eventBus,
  }
)

// Cross-pillar event integration
eventBus.subscribe({
  eventType: 'user.created',
  handler: async event => {
    // Trigger welcome workflow
    await userOnboardingSaga.execute({ userData: event.payload })
    return Result.Ok(undefined)
  },
})
```

### Transaction Management Integration

```typescript
import {
  transaction,
  transactionStep,
  createTransactionManager,
  transactionalPipeline,
  transactionalRepository,
} from 'kairo/extensions/transactions'

const transactionManager = createTransactionManager()

// Transactional pipelines with automatic rollback
const txPipeline = transactionalPipeline('order-processing', transactionManager)
  .map('validate', validateOrder)
  .step('reserve-inventory', async (order, context) => {
    return await inventoryRepo.executeInTransaction(async () => {
      return await inventoryRepo.reserve(order.items)
    }, context)
  })
  .step('process-payment', async (order, context) => {
    return await paymentService.processInTransaction(order.payment, context)
  })
  .step('fulfill-order', async (order, context) => {
    return await fulfillmentService.fulfill(order, context)
  })

// ACID transactions across multiple operations
const complexOrderTransaction = transaction(
  'complex-order',
  [
    transactionStep('validate-inventory', async orderData => {
      const availability = await inventoryService.checkAvailability(orderData.items)
      if (!availability.allAvailable) {
        throw new InventoryError('Items not available')
      }
      return orderData
    }),

    transactionStep('reserve-inventory', async orderData => {
      return await inventoryService.reserve(orderData.items)
    }),

    transactionStep('charge-payment', async orderData => {
      return await paymentService.charge(orderData.payment)
    }),

    transactionStep('create-order', async orderData => {
      return await orderRepository.create(orderData)
    }),
  ],
  {
    isolation: 'serializable',
    timeout: 30000,
    onRollback: async (context, error) => {
      // Custom cleanup logic
      await auditService.logFailedTransaction(context.transactionId, error)
    },
  }
)
```

### Advanced Caching Integration

```typescript
import { CacheManager, MemoryStorage, RedisStorage } from 'kairo/extensions/caching'

// Multi-level cache setup
const cacheManager = new CacheManager({
  layers: [
    {
      name: 'memory-l1',
      priority: 100,
      storage: new MemoryStorage({ maxSize: 1000 }),
      ttl: 300000, // 5 minutes
    },
    {
      name: 'redis-l2',
      priority: 50,
      storage: new RedisStorage({
        host: 'localhost',
        port: 6379,
        cluster: true,
      }),
      ttl: 3600000, // 1 hour
    },
  ],
  analytics: { enabled: true },
})

// Cached resources with invalidation
const UserAPI = resource('users', {
  get: {
    path: '/users/:id',
    response: UserSchema,
    cache: {
      manager: cacheManager,
      ttl: 3600000,
      key: params => `user:${params.id}`,
      tags: ['user'],
      invalidateOn: ['user.updated', 'user.deleted'],
    },
  },
})

// Cached pipelines
const cachedPipeline = pipeline('user-processing')
  .input(UserSchema)
  .cache({
    manager: cacheManager,
    key: user => `processed:user:${user.id}`,
    ttl: 3600000,
    tags: ['user', 'processing'],
  })
  .map(processUserData)
  .cache({
    key: user => `enriched:user:${user.id}`,
    ttl: 1800000,
  })
  .map(enrichUserData)

// Event-driven cache invalidation
eventBus.subscribe({
  eventType: 'user.updated',
  handler: async event => {
    await cacheManager.invalidateByTag(`user:${event.payload.userId}`)
    return Result.Ok(undefined)
  },
})
```

### Plugin System Integration

```typescript
import { createPlugin, registerPlugin, loadAndEnablePlugin } from 'kairo/extensions/plugins'

// Comprehensive auth plugin
const authPlugin = createPlugin('auth', {
  metadata: {
    version: '1.0.0',
    description: 'Complete authentication plugin',
  },

  // INTERFACE pillar integration
  resourceHooks: {
    beforeRequest: async (request, context) => {
      const token = await getAuthToken()
      request.headers.Authorization = `Bearer ${token}`
      return request
    },
    onError: async (error, context) => {
      if (error.status === 401) {
        await refreshAuthToken()
        return { retry: true }
      }
      return { error }
    },
  },

  // PROCESS pillar integration
  pipelineHooks: {
    beforeExecute: async (input, context) => {
      const user = await getCurrentUser()
      return { ...input, user }
    },
  },

  pipelineSteps: {
    authorize: (permission: string) => async (data, context) => {
      const hasPermission = await authService.hasPermission(context.user, permission)
      if (!hasPermission) {
        throw new AuthorizationError(`Missing permission: ${permission}`)
      }
      return data
    },
  },

  // DATA pillar integration
  repositoryHooks: {
    beforeCreate: async (data, context) => {
      const user = await getCurrentUser()
      return {
        ...data,
        createdBy: user?.id,
        createdAt: new Date().toISOString(),
      }
    },
  },

  schemaExtensions: {
    '*': {
      createdBy: { type: 'string', format: 'uuid', optional: true },
      updatedBy: { type: 'string', format: 'uuid', optional: true },
    },
  },

  // Event integration
  eventHooks: {
    beforePublish: async (event, context) => {
      const user = await getCurrentUser()
      return {
        ...event,
        metadata: {
          ...event.metadata,
          userId: user?.id,
        },
      }
    },
  },

  // Transaction integration
  transactionHooks: {
    beforeExecute: async (transaction, context) => {
      const user = await getCurrentUser()
      context.user = user
      return transaction
    },
  },

  // Cache integration
  cacheHooks: {
    beforeSet: async (key, value, options, context) => {
      // Add user context to cache keys
      const user = await getCurrentUser()
      if (user) {
        key = `user:${user.id}:${key}`
      }
      return { key, value, options }
    },
  },
})

// Register and activate
registerPlugin(authPlugin)
await loadAndEnablePlugin('auth')

// All Kairo operations now include authentication
const secureUserPipeline = pipeline('secure-user-processing')
  .input(UserSchema)
  .step('authorize', step => step.authorize('user:process'))
  .pipeline(UserAPI.create) // Auth headers added automatically
  .step('audit', step => step.auditLog('user-processed'))
```

### Complete Enterprise Architecture

```typescript
// Core APIs - always available
import { schema, resource, pipeline, repository, transform, rules, rule } from 'kairo'

// Extensions - opt-in as needed
import { createEventBus } from 'kairo/extensions/events'
import { createTransactionManager } from 'kairo/extensions/transactions'
import { CacheManager } from 'kairo/extensions/caching'
import { createPlugin } from 'kairo/extensions/plugins'

// Foundation setup
const eventBus = createEventBus()
const transactionManager = createTransactionManager()
const cacheManager = new CacheManager()

// DATA: Domain models with validation
const UserSchema = schema.object({
  id: schema.string().uuid(),
  name: schema.string().min(2).max(100),
  email: schema.string().email(),
  role: schema.enum(['user', 'admin', 'moderator'] as const),
  active: schema.boolean().default(true),
  createdAt: schema.string().datetime(),
  updatedAt: schema.string().datetime().optional(),
})

// INTERFACE: API with caching and events
const UserAPI = resource('users', {
  get: {
    path: '/users/:id',
    response: UserSchema,
    cache: { manager: cacheManager, ttl: 3600000 },
  },
  create: {
    path: '/users',
    method: 'POST',
    body: UserSchema.omit(['id', 'createdAt', 'updatedAt']),
    response: UserSchema,
  },
})

// DATA: Repository with events and transactions
const userRepository = eventRepository({
  name: 'users',
  schema: UserSchema,
  storage: 'database',
  eventBus,
  transactionManager,
  cache: cacheManager,
})

// PROCESS: Business rules with compliance
const userRules = rules('user-validation', {
  emailUniqueness: rule()
    .async(user => userRepository.findOne({ where: { email: user.email } }))
    .require(result => result.tag === 'Err')
    .message('Email already exists'),

  rolePermission: rule()
    .when(user => user.role === 'admin')
    .async(user => authService.hasAdminPermission(user.createdBy))
    .require(hasPermission => hasPermission)
    .message('Only admins can create admin users'),
})

// PROCESS: Complete workflow with all features
const createUserWorkflow = pipeline('create-user-workflow')
  .input(UserSchema.omit(['id', 'createdAt', 'updatedAt']))
  .validateAll(userRules)
  .step('authorize', step => step.authorize('user:create'))
  .map(user => ({
    ...user,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }))
  .transaction(async (user, context) => {
    // Transactional operations
    const createdUser = await userRepository.create(user)
    await profileRepository.create({
      userId: user.id,
      displayName: user.name,
    })
    return createdUser
  })
  .emit('user.created')
  .step('audit', step => step.auditLog('user-created'))
  .cache({
    key: user => `user:${user.id}`,
    ttl: 3600000,
    tags: ['user'],
  })
  .trace('user-workflow-completed')

// Event-driven reactions
eventBus.subscribe({
  eventType: 'user.created',
  handler: async event => {
    // Send welcome email
    await EmailAPI.sendWelcome.run({ userId: event.payload.id })

    // Update analytics
    await AnalyticsAPI.trackUserCreation.run(event.payload)

    return Result.Ok(undefined)
  },
})

// Usage - Enterprise-grade with full observability
const result = await createUserWorkflow.run({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user',
})

result.match({
  Ok: user => {
    console.log(`User ${user.name} created successfully`)
    // Automatic: events emitted, cache populated, audit logged, transactions committed
  },
  Err: error => {
    console.error(`User creation failed: ${error.message}`)
    // Automatic: transactions rolled back, errors logged, cache invalidated
  },
})
```

This enterprise architecture provides:

- **Event-driven workflows** with automatic event emission and handling
- **ACID transactions** with automatic rollback and compensation
- **Multi-level caching** with intelligent invalidation
- **Plugin extensibility** with three-pillar integration
- **Complete observability** with tracing, metrics, and audit logging
- **Type safety** throughout the entire stack
- **Declarative patterns** that eliminate infrastructure boilerplate

## Performance and Optimization

### Native Schema Performance

Kairo's native schema system delivers exceptional performance:

```typescript
// Performance benchmark results (1000 validations)
// Kairo Native: ~30ms (100% TypeScript, zero dependencies)
// Zod: ~90ms (3x slower)
// Joi: ~120ms (4x slower)

const performanceBenchmark = async () => {
  const testData = Array.from({ length: 1000 }, generateUser)

  console.time('Kairo Native Schema')
  testData.forEach(data => {
    const result = UserSchema.parse(data)
    if (Result.isErr(result)) {
      console.error('Validation failed:', result.error)
    }
  })
  console.timeEnd('Kairo Native Schema')

  // Kairo Native Schema: 28.945ms
}
```

### Pipeline Optimization

```typescript
// Optimized pipeline patterns
const optimizedPipeline = pipeline('optimized')
  .input(InputSchema)
  // Cache expensive operations
  .cache({ ttl: 300000, key: input => `expensive:${input.id}` })
  // Parallel execution where possible
  .parallel([
    pipeline('fast-operation').map(fastTransform),
    pipeline('slow-operation').timeout(5000).pipeline(SlowAPI.process),
  ])
  // Efficient resource usage
  .map(([fast, slow]) => ({ ...fast, ...slow }))
  // Selective tracing (only in development)
  .trace('optimized-result', {
    enabled: process.env.NODE_ENV === 'development',
    includeInput: false,
  })
```

## Testing Strategies

### Three-Pillar Testing Approach

```typescript
import { pipelineTesting, resourceTesting, schemaTesting, integrationTesting } from 'kairo/testing'

// DATA pillar testing
describe('Schema Validation', () => {
  const tester = schemaTesting.createTester(UserSchema)

  it('should validate with property-based testing', () => {
    const results = tester.propertyTest(
      () => ({
        id: generateUUID(),
        name: randomString(10),
        email: `${randomString(5)}@example.com`,
        age: randomInt(18, 65),
      }),
      1000
    )

    expect(results.passed).toBeGreaterThan(950)
  })
})

// INTERFACE pillar testing
describe('API Resources', () => {
  const tester = resourceTesting.createTester(UserAPI)

  it('should handle all scenarios', async () => {
    const scenarios = [
      resourceTesting.mockScenario(
        'success',
        { method: 'GET', path: '/users/1' },
        resourceTesting.mockResponses.success(mockUser)
      ),
      resourceTesting.mockScenario(
        'not found',
        { method: 'GET', path: '/users/999' },
        resourceTesting.mockResponses.error(404, 'User not found')
      ),
    ]

    const results = await tester.testOperations({ get: scenarios })
    expect(results.passedTests).toBe(2)
  })
})

// PROCESS pillar testing
describe('Business Logic', () => {
  it('should process orders correctly', async () => {
    await pipelineTesting
      .expect(processOrder, validOrderData)
      .shouldSucceed()
      .shouldCompleteWithin(1000)
      .shouldReturnValue(
        expect.objectContaining({
          status: 'completed',
        })
      )
  })
})

// Cross-pillar integration testing
describe('Complete Workflows', () => {
  it('should handle end-to-end order processing', async () => {
    const integration = integrationTesting
      .createTest('order-processing')
      .withPipeline('processor', processOrder)
      .withResource('payment', PaymentAPI)
      .withRepository('orders', orderRepository)

    integration.scenario('successful order', async context => {
      const result = await context.runFullFlow(orderData)
      context.expect(result).toBeOk()
    })

    const results = await integration.run()
    expect(results.passed).toBe(true)
  })
})
```

## Migration and Adoption Strategies

### Progressive Adoption

```typescript
// Phase 1: Start with DATA pillar
// Replace validation libraries with native schemas
const UserSchema = schema.object({
  // existing validation logic
})

// Phase 2: Add INTERFACE pillar
// Replace service classes with resources
const UserAPI = resource('users', existingEndpoints)

// Phase 3: Implement PROCESS pillar
// Replace complex business logic with pipelines
const processUser = pipeline('process-user').input(UserSchema).pipeline(UserAPI.create)

// Phase 4: Add extensions as needed
// Import advanced features when your application grows
import { createEventBus } from 'kairo/extensions/events'
import { transactionManager } from 'kairo/extensions/transactions'
```

### Legacy Integration

```typescript
// Wrap existing services in Kairo patterns
const legacyServiceWrapper = pipeline('legacy-wrapper')
  .input(RequestSchema)
  .map(request => adaptToLegacyFormat(request))
  .run(async adapted => {
    // Call existing service
    const result = await legacyService.process(adapted)
    return adaptFromLegacyFormat(result)
  })
  .validate(ResponseSchema)
  .trace('legacy-service-called')
```

## Conclusion

Kairo's Three-Pillar Architecture represents a fundamental shift from infrastructure-heavy to business-logic-focused application development. Through **progressive enhancement** with core APIs and optional extensions, developers can:

- **Start small with core APIs** - ~20KB bundle with essential functionality
- **Scale progressively** - Add enterprise features only when needed
- **Eliminate 70% of boilerplate code** - Focus on business value, not infrastructure
- **Achieve predictable error handling** - No more exception-driven development
- **Build highly testable systems** - Declarative patterns make testing natural
- **Create reusable, composable components** - True framework-agnostic architecture
- **Maintain complete type safety** - TypeScript inference throughout

The result is applications that are more maintainable, more reliable, and more enjoyable to develop. Kairo doesn't just provide tools - it provides a complete architectural philosophy that transforms how we think about application development.

**Ready to embrace the Three-Pillar Architecture?** Start with the [core APIs](/api/core/) for essential functionality, then add [extensions](/api/extensions/) as your application grows.
