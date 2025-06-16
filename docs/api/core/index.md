# Core API Reference

The **Core APIs** provide Kairo's foundational three-pillar architecture: **INTERFACE**, **PROCESS**, and **DATA**. These APIs form the essential building blocks of every Kairo application.

> **Philosophy**: _"Make infrastructure disappear. Make business logic visible."_

---

## 🔗 INTERFACE Pillar

_Zero-boilerplate external system integration_

### [Resource API](/api/core/resource)

Declarative API definitions with type safety, contract testing, and intelligent mocking

- HTTP operations (GET, POST, PUT, DELETE)
- Automatic retry, timeout, and error handling
- URL parameter interpolation
- Built-in caching strategies

---

## ⚡ PROCESS Pillar

_Declarative business logic composition_

### [Pipeline API](/api/core/pipeline)

The core abstraction for composable business workflows

- Functional composition with type safety
- Built-in error handling and Result pattern integration
- Parallel execution and branching logic
- Observability and tracing

### [Business Rules API](/api/core/rules)

Declarative validation and business logic

- Conditional rule application
- Async rule validation
- Rule composition and reusability
- Rich error messaging

---

## 🛡️ DATA Pillar

_Native data definition, validation, and access_

### [Native Schema API](/api/core/schema)

High-performance validation (3x faster than Zod, zero dependencies)

- Type-safe schema definition with full inference
- Schema composition (extend, pick, omit, partial)
- Data transformation and refinement
- Rich validation error reporting

### [Transform API](/api/core/transform)

Declarative data mapping and conversion

- Field-to-field mapping
- Computed field generation
- Data filtering and validation
- Transform composition and chaining

### [Repository API](/api/core/repository)

Type-safe data access with relationships

- CRUD operations with Result pattern integration
- Relationship management (hasOne, hasMany, belongsTo)
- Lifecycle hooks and validation
- Pluggable storage adapters

---

## 🚀 Core Foundation

### [Result Pattern](/api/core/result)

Type-safe error handling without exceptions

- `Result<Error, Value>` type for predictable error handling
- Pattern matching with `.match()` method
- Helper functions and composition utilities
- Integration across all Kairo APIs

---

## Quick Start with Core APIs

```typescript
import { schema, pipeline, resource, repository } from 'kairo'

// Define data with native schemas (3x faster than Zod!)
const UserSchema = schema.object({
  id: schema.string().uuid(),
  name: schema.string().min(2).max(100),
  email: schema.string().email(),
})

// Create declarative API resource
const UserAPI = resource('users', {
  get: { path: '/users/:id', response: UserSchema },
  create: { path: '/users', method: 'POST', body: UserSchema.omit(['id']) },
})

// Compose business logic with pipelines
const processUser = pipeline('process-user')
  .input(UserSchema)
  .map(user => ({ ...user, processed: true }))
  .pipeline(UserAPI.create)

// Repository for data access
const userRepo = repository('users', {
  schema: UserSchema,
  storage: 'memory',
})

// Execute with type-safe Result pattern
const result = await processUser.run(userData)
result.match({
  Ok: user => console.log('Success:', user),
  Err: error => console.error('Error:', error),
})
```

---

## Bundle Size & Performance

**Core APIs are optimized for minimal footprint:**

- **Core bundle**: <20KB gzipped
- **Zero dependencies**: Pure TypeScript implementation
- **3x faster validation**: Native schemas outperform Zod
- **Memory efficient**: Minimal heap allocation
- **Tree-shakeable**: Import only what you use

---

## Navigation

**Need more features?** Explore [Extensions](/api/extensions/) for advanced capabilities like events, transactions, caching, and plugins.

**Architecture deep dive:** [Three-Pillar Architecture Guide](/guide/architecture)

**Getting started:** [Installation & Quick Start](/guide/getting-started)
