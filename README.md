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

3. **DATA Pillar** - Declarative data modeling and validation
   - **Native Schemas**: Zero-dependency validation (3x faster than Zod)
   - **Type Safety**: Full TypeScript inference
   - **Transformations**: Declarative data mapping

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

### 3. DATA Pillar - Native Schema Validation

```typescript
import { nativeSchema } from 'kairo'

// Native schemas with full type safety (3x faster than Zod)
const ProductSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(1).max(200),
  price: nativeSchema.number().positive(),
  category: nativeSchema.enum(['electronics', 'books', 'clothing'] as const),
  tags: nativeSchema.array(nativeSchema.string()).optional(),
  metadata: nativeSchema.record(nativeSchema.string()).optional(),
})

// Schema composition and transformation
const CreateProductSchema = ProductSchema.omit(['id']).extend({
  createRequest: nativeSchema.boolean().default(true),
})

const UpdateProductSchema = ProductSchema.partial().required(['id'])

// Validation with Result pattern
const result = ProductSchema.parse(productData)
result.match({
  Ok: product => {
    // product is fully typed as Product
    console.log('Valid product:', product.name)
  },
  Err: error => {
    // Rich validation error with field paths
    console.error('Validation failed:', error.field, error.message)
  },
})

// Transform data declaratively
const processedProduct = ProductSchema.transform(product => ({
  ...product,
  slug: slugify(product.name),
})).parse(rawData)
```

## Key Features

### 🏛️ Complete Three-Pillar Architecture

- **INTERFACE** - Zero-boilerplate APIs with contract testing and mocking
- **PROCESS** - Functional pipelines with business rules and workflow orchestration
- **DATA** - Native schema validation (3x faster than Zod, zero dependencies)

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
