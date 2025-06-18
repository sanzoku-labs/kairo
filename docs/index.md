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
      link: /getting-started/
    - theme: alt
      text: View Examples
      link: /examples/common-patterns
    - theme: alt
      text: View on GitHub
      link: https://github.com/sovanaryththorng/sanzoku-labs/kairo

features:
  - icon: 🔗
    title: INTERFACE Pillar
    details: Zero-boilerplate APIs with contract testing, caching, and intelligent mocking
  - icon: ⚡
    title: PROCESS Pillar
    details: Functional pipelines, business rules, workflows, and event-driven architecture
  - icon: 🛡️
    title: DATA Pillar
    details: Native schemas, transformations, repositories with relationships (3x faster than Zod)
  - icon: 🔄
    title: Event-Driven Architecture
    details: Event bus, sagas, event sourcing, and distributed workflows
  - icon: 💾
    title: Transaction Management
    details: ACID transactions with automatic rollback and compensation patterns
  - icon: ⚡
    title: Advanced Caching
    details: Multi-level cache with analytics, invalidation strategies, and distributed support
  - icon: 🔌
    title: Plugin System
    details: Extensible plugin architecture with three-pillar integration
  - icon: 🚀
    title: Enterprise-Ready
    details: Production-grade performance, testing framework, and zero technical debt
---

## 🚀 Start Learning Kairo

Choose your learning path based on your experience:

### 🌱 New to Kairo?
**[Your First App →](/getting-started/your-first-app)**  
Build a working application in 30 minutes using just 5 essential functions.

### ⚡ Ready to Build?
**[Common Patterns →](/examples/common-patterns)**  
Copy-paste solutions for everyday development challenges.

### 🎯 Need Help Choosing?
**[Decision Tree →](/examples/decision-tree)**  
Find the right Kairo pattern for your specific situation.

### 📚 Structured Learning?
**[Learning Paths →](/learning-paths/)**  
Progressive tiers from Foundation (5 functions) to Expert (285+ functions).

---

## Quick Start

Install Kairo in your project:

```bash
npm install kairo
# or
bun add kairo
```

Start with the simple **core API** for essential functionality:

```typescript
import { schema, pipeline, resource } from 'kairo'
```

Add **extensions** only when you need advanced features:

```typescript
import { createEventBus } from 'kairo/extensions/events'
import { transactionManager } from 'kairo/extensions/transactions'
import { CacheManager } from 'kairo/extensions/caching'
```

## INTERFACE Pillar - Zero-Boilerplate APIs

```typescript
import { resource, schema } from 'kairo'

// Define your data with native schemas (3x faster than Zod!)
const UserSchema = schema.object({
  id: schema.string().uuid(),
  name: schema.string().min(2).max(100),
  email: schema.string().email(),
  age: schema.number().min(0).max(150),
})

// Declarative API definition with caching and retry
const UserAPI = resource(
  'users',
  {
    get: {
      path: '/users/:id',
      params: schema.object({ id: schema.string().uuid() }),
      response: UserSchema,
    },
    create: {
      path: '/users',
      method: 'POST',
      body: UserSchema.omit(['id']),
      response: UserSchema,
    },
  },
  {
    cache: { ttl: 60000 },
    retry: { times: 3, delay: 1000 },
    timeout: 5000,
  }
)

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
import { pipeline, rules, rule, workflow } from 'kairo'

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

// Complex workflow orchestration
const orderWorkflow = workflow('order-workflow', {
  steps: {
    validate: pipeline('validate').validateAll(orderRules),
    process: processOrder,
    notify: pipeline('notify').pipeline(EmailAPI.sendConfirmation),
  },
  flow: ['validate', 'process', 'notify'],
  onError: {
    process: async (error, context) => {
      await InventoryAPI.release.run({ orderId: context.orderId })
    },
  },
})

// Execute with automatic error handling
const result = await orderWorkflow.run(orderData)
result.match({
  Ok: processedOrder => handleSuccess(processedOrder),
  Err: error => handleBusinessError(error),
})
```

## DATA Pillar - Complete Data Management

```typescript
import { schema, transform, repository } from 'kairo'

// Native schemas with full type safety (3x faster than Zod!)
const ProductSchema = schema.object({
  id: schema.string().uuid(),
  name: schema.string().min(1).max(200),
  price: schema.number().positive(),
  category: schema.enum(['electronics', 'books', 'clothing'] as const),
  tags: schema.array(schema.string()).optional(),
  metadata: schema.record(schema.string()).optional(),
})

// Data transformations
const productTransform = transform('normalize-product', ExternalProductSchema)
  .to(ProductSchema)
  .map('external_id', 'id')
  .map('product_name', 'name')
  .map('unit_price', 'price')
  .compute('slug', source => slugify(source.product_name))
  .filter(product => product.price > 0)
  .validate()

// Repository with relationships
const productRepository = repository('products', {
  schema: ProductSchema,
  storage: 'database',
  relationships: {
    category: belongsTo('categories', 'categoryId', CategorySchema),
    reviews: hasMany('reviews', 'productId', ReviewSchema),
  },
  hooks: {
    beforeCreate: data => ({ ...data, slug: slugify(data.name) }),
    afterCreate: product => console.log(`Product ${product.name} created`),
  },
})

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

// Repository operations
const product = await productRepository.create(productData)
const productsWithReviews = await productRepository.with('reviews').findMany()

// Performance: 1000+ validations in <100ms
// Zero dependencies: Pure TypeScript implementation
// Complete data access layer
```

## Advanced Features (Extensions)

Need more power? Kairo extensions provide enterprise-grade features without bloating your bundle.

### Event-Driven Architecture

```typescript
import { createEventBus, createEvent, saga } from 'kairo/extensions/events'

const eventBus = createEventBus()

// Type-safe event publishing
const userCreatedEvent = createEvent('user.created', {
  userId: '123',
  name: 'John Doe',
  email: 'john@example.com',
})

await eventBus.publish(userCreatedEvent)

// Event subscriptions with filtering
eventBus.subscribe({
  eventType: 'user.created',
  handler: async event => {
    await sendWelcomeEmail(event.payload)
    return Result.Ok(undefined)
  },
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
  ],
  { rollbackOnFailure: true }
)
```

### Transaction Management

```typescript
import {
  transaction,
  transactionStep,
  createTransactionManager,
} from 'kairo/extensions/transactions'

const transactionManager = createTransactionManager()

// ACID transactions with automatic rollback
const transferFunds = transaction(
  'transfer-funds',
  [
    transactionStep('validate-accounts', async input => {
      return await validateAccounts(input.fromAccount, input.toAccount)
    }),
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
import { CacheManager } from 'kairo/extensions/caching'

// Multi-level cache with analytics
const cacheManager = new CacheManager({
  layers: [
    { name: 'memory', storage: 'memory', ttl: 300000 },
    { name: 'redis', storage: 'redis', ttl: 3600000 },
  ],
  analytics: { enabled: true },
})

// Cache with invalidation strategies
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
import { createPlugin, registerPlugin, loadAndEnablePlugin } from 'kairo/extensions/plugins'

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
    auditLog: (action: string) => async (data, context) => {
      await auditService.log({ action, data, user: context.user })
      return data
    },
  },
})

// Register and activate
registerPlugin(authPlugin)
await loadAndEnablePlugin('auth')

// All operations automatically enhanced
const userPipeline = pipeline('process-user')
  .step('audit', step => step.auditLog('user-processing'))
  .pipeline(UserAPI.create) // Auth headers added automatically
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
