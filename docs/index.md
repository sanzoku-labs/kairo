---
layout: home

hero:
  name: 'Kairo'
  text: 'The Three-Pillar Declarative Platform'
  tagline: 'Make infrastructure disappear. Make business logic visible.'
  image:
    src: /logo.svg
    alt: Kairo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/sovanaryththorng/kairo

features:
  - icon: 🔗
    title: INTERFACE Pillar
    details: Zero-boilerplate APIs with contract testing and intelligent mocking
  - icon: ⚡
    title: PROCESS Pillar
    details: Functional pipelines, business rules, and workflow orchestration
  - icon: 🛡️
    title: DATA Pillar
    details: Native schema validation (3x faster than Zod) with zero dependencies
  - icon: 🚀
    title: High Performance
    details: Native implementations optimized for speed with minimal bundle size
  - icon: 🔧
    title: Framework Agnostic
    details: Works seamlessly across React, Vue, Node, Bun, and any TypeScript environment
  - icon: 🎯
    title: Developer Experience
    details: Full TypeScript inference with Result pattern for predictable error handling
---

## Quick Start

Install Kairo in your project:

```bash
npm install kairo
# or
bun add kairo
```

## INTERFACE Pillar - Zero-Boilerplate APIs

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

// Contract Testing & Mocking
const contractResult = await UserAPI.contract().verify('https://api.staging.com')
const mocked = UserAPI.mock({
  get: { success: mockUser, delay: 50 },
})
```

## PROCESS Pillar - Declarative Business Logic

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

## DATA Pillar - Native Schema Validation

```typescript
import { nativeSchema } from 'kairo'

// Native schemas with full type safety (3x faster than Zod!)
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
const processedProduct = ProductSchema
  .transform(product => ({ ...product, slug: slugify(product.name) }))
  .parse(rawData)

// Performance: 1000+ validations in <100ms
// Zero dependencies: Pure TypeScript implementation
// Full compatibility: Drop-in Zod replacement
```

## Why Kairo?

**"Make infrastructure disappear. Make business logic visible."**

### The Problem: Infrastructure Overwhelms Business Logic

Most applications spend 70% of their code on infrastructure concerns:
- Repetitive API service classes
- Manual error handling and validation
- Complex process coordination
- Framework-specific boilerplate

### The Solution: Declarative Three-Pillar Architecture

Kairo eliminates infrastructure code through three foundational pillars:

1. **INTERFACE Pillar** - Zero-boilerplate APIs with built-in testing
2. **PROCESS Pillar** - Composable business logic with declarative rules
3. **DATA Pillar** - High-performance native validation with zero dependencies

### Key Benefits

- **🚀 3x Performance** - Native implementations optimized for speed
- **📦 Minimal Bundle** - Zero dependencies, <20KB core bundle
- **🔧 Framework Agnostic** - Works everywhere TypeScript works
- **🛡️ Type Safe** - Full inference with predictable Result pattern
- **🧪 Built-in Testing** - Contract verification, mocking, and debugging
- **🎯 Developer Joy** - Focus on business logic, not infrastructure

## Core Philosophy

- **Declarative over imperative** - Describe what, not how
- **Composition over configuration** - Build complex systems from simple parts
- **Type inference that always works** - Zero type annotations needed
- **Progressive disclosure** - Simple by default, full control available
- **Framework-agnostic** - Pure TypeScript, no adapters required
