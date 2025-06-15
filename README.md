# Kairo

> **The Three-Pillar Declarative Application Platform**  
> _Make infrastructure disappear. Make business logic visible._

[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://sovanaryththorng.github.io/kairo/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Kairo is a comprehensive declarative platform that eliminates boilerplate through three foundational pillars:

### 🏛️ The Three-Pillar Architecture

1. **INTERFACE Pillar** - Declarative external system integration

   - **Resources**: Type-safe APIs, databases, queues
   - **Contracts**: Live verification and mocking
   - **Zero boilerplate**: No more service classes

2. **PROCESS Pillar** - Declarative business logic composition

   - **Pipelines**: Functional data transformation
   - **Business Rules**: Centralized validation
   - **Workflows**: Complex orchestration

3. **DATA Pillar** - Declarative data modeling, validation, and access
   - **Native Schemas**: Zero-dependency validation (3x faster than Zod)
   - **Transformations**: Declarative data mapping and conversion
   - **Repositories**: Type-safe data access with relationships

**Framework-agnostic** by design - works with React, Vue, Node, Bun, and any TypeScript environment.

## Quick Start

```bash
npm install kairo
```

### 1. INTERFACE Pillar - Zero-Boilerplate APIs

```typescript
import { resource, nativeSchema } from 'kairo'

// Define your data with native schemas (3x faster than Zod!)
const UserSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(2).max(100),
  email: nativeSchema.string().email(),
  age: nativeSchema.number().min(0).max(150),
})

// Declarative API definition
const UserAPI = resource('users', {
  get: {
    path: '/users/:id',
    params: nativeSchema.object({ id: nativeSchema.string().uuid() }),
    response: UserSchema,
  },
  create: {
    path: '/users',
    method: 'POST',
    body: UserSchema.omit(['id']),
    response: UserSchema,
  },
})

// Type-safe usage with Result pattern
const result = await UserAPI.get.run({ id: '123' })
result.match({
  Ok: user => console.log('Found user:', user),
  Err: error => console.error('API error:', error),
})
```

### 2. PROCESS Pillar - Declarative Business Logic

```typescript
import { pipeline, rules, rule } from 'kairo'

// Define business rules declaratively
const orderRules = rules('order-validation', {
  minimumAmount: rule()
    .require(order => order.total >= 10)
    .message('Minimum order is $10'),

  stockAvailable: rule()
    .async(order => InventoryAPI.check.run({ productId: order.productId }))
    .require(result => result.match({ Ok: stock => stock.available > 0, Err: () => false }))
    .message('Product out of stock'),
})

// Compose business logic declaratively
const processOrder = pipeline('process-order')
  .input(OrderSchema)
  .validateAll(orderRules)
  .map(calculateDiscounts)
  .pipeline(InventoryAPI.reserve)
  .pipeline(PaymentAPI.process)
  .map(transformOrderResult)
  .trace('order-processing')

// Execute with automatic error handling
const result = await processOrder.run(orderData)
result.match({
  Ok: processedOrder => handleSuccess(processedOrder),
  Err: error => handleBusinessError(error),
})
```

### 3. DATA Pillar - Complete Data Management

```typescript
import { nativeSchema, transform, repository, hasMany, hasOne } from 'kairo'

// Native schemas with full type safety (3x faster than Zod)
const ProductSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(1).max(200),
  price: nativeSchema.number().positive(),
  category: nativeSchema.enum(['electronics', 'books', 'clothing'] as const),
  tags: nativeSchema.array(nativeSchema.string()).optional(),
  metadata: nativeSchema.record(nativeSchema.string()).optional(),
})

// Declarative data transformations
const productTransform = transform('normalize-product', APIProductSchema)
  .to(ProductSchema)
  .map('product_name', 'name')
  .map('product_price', 'price')
  .compute('slug', source => slugify(source.product_name))
  .filter(product => product.active === true)
  .validate()

// Type-safe repository with relationships
const productRepository = repository('products', {
  schema: ProductSchema,
  storage: 'memory', // or custom StorageAdapter
  timestamps: true,
  relationships: {
    reviews: hasMany('reviews', 'productId', ReviewSchema),
    category: hasOne('category', 'categoryId', CategorySchema),
  },
  hooks: {
    beforeCreate: data => ({ ...data, slug: slugify(data.name) }),
    afterCreate: product => console.log(`Product ${product.name} created`),
  },
})

// Repository usage with type safety
const result = await productRepository.create(productData)
result.match({
  Ok: product => {
    console.log('Product created:', product.name)
  },
  Err: error => {
    console.error('Repository error:', error.message)
  },
})

// Query with relationships
const productWithReviews = await productRepository.with(['reviews', 'category']).find('product-123')

// Transform pipeline integration
const processProduct = pipeline('process-product')
  .input(APIProductSchema)
  .transform(productTransform)
  .run(async product => await productRepository.create(product))
  .trace('product-processing')
```

## Key Features

### 🏛️ Complete Three-Pillar Architecture

- **INTERFACE** - Zero-boilerplate APIs with contract testing and mocking
- **PROCESS** - Functional pipelines with business rules and workflow orchestration
- **DATA** - Complete data layer: schemas, transformations, and repositories

### 🚀 Performance & Developer Experience

- 🔧 **Framework Agnostic** - Works with React, Vue, Node, Bun, and any TypeScript environment
- ⚡ **High Performance** - Native validation, optimized pipelines, efficient resource caching
- 🛡️ **Type Safe** - Full TypeScript inference with Result pattern for error handling
- 🎯 **Developer Joy** - Eliminate boilerplate, improve debugging, declarative patterns
- 📦 **Lightweight** - Core bundle < 20kb gzipped, zero runtime dependencies

### 🎪 Advanced Capabilities

- 🧪 **Contract Testing** - Live API verification and intelligent mock generation
- 🎲 **Business Rules Engine** - Centralized, reusable validation logic with async support
- 🔄 **Workflow Orchestration** - Complex processes with parallel execution and error recovery
- 🗄️ **Repository System** - Type-safe data access with relationships and lifecycle hooks
- 🔍 **Built-in Observability** - Tracing, metrics, and debugging throughout the stack

## Core Concepts

### Result Pattern - Error Handling Without Exceptions

```typescript
type Result<E, T> = { tag: 'Ok'; value: T } | { tag: 'Err'; error: E }

// Pattern matching for clean error handling
Result.match(result, {
  Ok: user => console.log('Success:', user),
  Err: error => console.error('Error:', error),
})
```

### Resources - Declarative API Definitions

```typescript
const api = resource('api', {
  getUser: {
    path: '/users/:id',
    params: UserParamsSchema,
    response: UserSchema,
  },
  createUser: {
    path: '/users',
    method: 'POST',
    body: CreateUserSchema,
    response: UserSchema,
  },
})
```

### Pipelines - Business Logic Composition

```typescript
const businessWorkflow = pipeline('workflow')
  .input(InputSchema)
  .validate(businessRules)
  .fetch('/api/process')
  .map(transformData)
  .trace('completed')
```

### Repositories - Declarative Data Access

```typescript
const userRepo = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  relationships: {
    posts: hasMany('posts', 'userId', PostSchema),
    profile: hasOne('profile', 'userId', ProfileSchema),
  },
  hooks: {
    beforeCreate: data => ({ ...data, createdAt: new Date() }),
  },
})

// Type-safe operations
const user = await userRepo.create(userData)
const userWithPosts = await userRepo.with('posts').find(1)
```

### Workflows - Process Orchestration

```typescript
const complexWorkflow = workflow<Input, Output>('complex-process', {
  steps: {
    validate: workflowUtils.step('validate', validationPipeline),
    process: workflowUtils.step('process', processingPipeline),
    notify: workflowUtils.step('notify', notificationPipeline),
    cleanup: workflowUtils.step('cleanup', cleanupPipeline),
  },

  flow: [
    'validate',
    'process',
    {
      if: workflowUtils.condition(context => shouldNotify(context)),
      then: 'notify',
    },
    'cleanup',
  ],

  options: {
    timeout: 60000,
    onError: {
      process: workflowUtils.customErrorHandler(async (error, context) => {
        await logError(error, context)
        await rollbackChanges(context)
      }),
    },
  },
})
```

### Testing & Mocking

```typescript
// Contract testing for resources
await UserAPI.contract().verify('https://api.staging.com')

// Workflow testing with mocks
const testResult = await workflowTesting
  .expect(userOnboardingWorkflow, testData)
  .withMocks({
    createUser: { success: mockUser },
    sendWelcome: { success: { sent: true } },
  })
  .shouldSucceed()

// Load testing
const loadResults = await workflowTesting.loadTest(workflow, input, {
  concurrency: 10,
  requests: 100,
})
```

## Documentation

Visit our [documentation site](https://sovanaryththorng.github.io/kairo/) for:

- 📖 [Getting Started Guide](https://sovanaryththorng.github.io/kairo/guide/getting-started)
- 🔧 [API Reference](https://sovanaryththorng.github.io/kairo/api/)
- 💡 [Examples](https://sovanaryththorng.github.io/kairo/examples/)

## Development

```bash
# Install dependencies
bun install

# Run tests
bun run test

# Build the library
bun run build

# Run documentation locally
bun run docs:dev
```

## License

MIT © [Sovanaryth THORNG](https://github.com/sovanaryththorng)
