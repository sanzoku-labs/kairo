# Kairo

> **Clean Three-Pillar TypeScript Library**  
> _23 methods. Configuration objects. Zero dependencies._

[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://sanzoku-labs.github.io/kairo/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Kairo is a clean, focused TypeScript library built around three core pillars with a simple configuration object pattern.

### 🏛️ Three-Pillar Architecture

**23 core methods across 3 pillars:**

1. **SERVICE Pillar** - HTTP-only API operations

   - 5 methods: `get()`, `post()`, `put()`, `patch()`, `delete()`
   - 4 utilities for request handling and response processing

2. **DATA Pillar** - Data validation, transformation, and aggregation

   - 10 methods: `schema()`, `validate()`, `transform()`, `convert()`, `aggregate()`, `groupBy()`, `serialize()`, `deserialize()`, `clone()`, `merge()`
   - 6 utilities for data manipulation and type inference

3. **PIPELINE Pillar** - Logic composition and workflows
   - 8 methods: `map()`, `filter()`, `reduce()`, `compose()`, `chain()`, `branch()`, `parallel()`, `validate()`
   - 5 utilities for pipeline orchestration

**Configuration objects everywhere** - No method chaining, predictable APIs, TypeScript-first design.

## Quick Start

```bash
npm install kairo
```

### Basic Usage

```typescript
import { service, data, pipeline, Result } from 'kairo'

// SERVICE: HTTP operations with configuration
const users = await service.get('/api/users', {
  timeout: 5000,
  retry: { attempts: 3 },
  cache: { enabled: true, ttl: 300 },
  validate: UserSchema,
})

// DATA: Schema creation and validation
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 150 },
})

const validation = data.validate(userData, UserSchema)

// PIPELINE: Logic composition with configuration
const processUsers = pipeline.compose([
  users => pipeline.filter(users, user => user.active, { parallel: true }),
  users => pipeline.map(users, normalizeUser, { async: true }),
  users =>
    data.aggregate(users, {
      groupBy: ['department'],
      sum: ['salary'],
      avg: ['experience'],
    }),
])

// Result pattern for error handling
const result = await processUsers(userData)
Result.match(result, {
  Ok: processed => console.log('Success:', processed),
  Err: error => console.error('Error:', error.message),
})
```

## Core Concepts

### Configuration Object Pattern

Every method uses configuration objects instead of method chaining:

```typescript
// ✅ Configuration objects
service.get('/api/data', {
  timeout: 5000,
  retry: true,
  cache: { enabled: true },
})

pipeline.map(items, transform, {
  parallel: true,
  async: true,
  batchSize: 100,
})

data.aggregate(sales, {
  groupBy: ['region', 'quarter'],
  sum: ['revenue', 'profit'],
  avg: ['satisfaction'],
})
```

### Result Pattern

All operations return `Result<Error, Data>` for safe error handling:

```typescript
type Result<E, T> = { tag: 'Ok'; value: T } | { tag: 'Err'; error: E }

// Pattern matching
const result = await service.get('/api/users')
Result.match(result, {
  Ok: users => handleSuccess(users),
  Err: error => handleError(error),
})

// Utility methods
if (Result.isOk(result)) {
  console.log('Data:', result.value)
}

if (Result.isErr(result)) {
  console.error('Error:', result.error)
}
```

## SERVICE Pillar

HTTP-only operations with rich configuration:

```typescript
// GET with validation and caching
const users = await service.get('/api/users', {
  headers: { Authorization: 'Bearer token' },
  timeout: 5000,
  retry: { attempts: 3, delay: 1000 },
  cache: { enabled: true, ttl: 300 },
  validate: UserArraySchema,
})

// POST with request transformation
const newUser = await service.post('/api/users', {
  body: userData,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
  transform: response => normalizeUser(response),
  validate: UserSchema,
})

// PUT with conditional headers
const updated = await service.put('/api/users/:id', {
  params: { id: userId },
  body: updateData,
  headers: { 'If-Match': etag },
  merge: true, // Merge with existing data
})
```

## DATA Pillar

Data operations with schema validation and aggregation:

```typescript
// Schema creation
const ProductSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 1, max: 200 },
  price: { type: 'number', min: 0 },
  category: { type: 'string', enum: ['electronics', 'books', 'clothing'] },
  tags: { type: 'array', items: { type: 'string' }, optional: true },
})

// Data validation
const validation = data.validate(productData, ProductSchema)

// Data transformation
const transformed = data.transform(rawData, {
  mapping: {
    product_name: 'name',
    product_price: 'price',
    product_category: 'category',
  },
  compute: {
    slug: item => slugify(item.name),
    priceRange: item => getPriceRange(item.price),
  },
})

// Data aggregation
const analytics = data.aggregate(salesData, {
  groupBy: ['region', 'quarter'],
  sum: ['revenue', 'units'],
  avg: ['satisfaction', 'deliveryTime'],
  count: ['orders'],
  custom: {
    growthRate: group => calculateGrowth(group),
  },
})

// Serialization
const csv = data.serialize(products, { format: 'csv', headers: true })
const json = data.serialize(products, { format: 'json', pretty: true })
```

## PIPELINE Pillar

Logic composition with configuration objects:

```typescript
// Map with parallel processing
const processed = pipeline.map(
  items,
  async item => {
    return await processItem(item)
  },
  {
    parallel: true,
    concurrency: 5,
    batchSize: 100,
  }
)

// Filter with validation
const valid = pipeline.filter(
  users,
  user => {
    return user.active && user.verified
  },
  {
    parallel: true,
    errorHandling: 'continue',
  }
)

// Complex composition
const dataProcessor = pipeline.compose([
  // Step 1: Validate input
  data => pipeline.validate(data, InputSchema),

  // Step 2: Transform data
  data =>
    pipeline.map(
      data,
      item => ({
        ...item,
        processed: true,
        timestamp: Date.now(),
      }),
      { parallel: true }
    ),

  // Step 3: Filter valid items
  data => pipeline.filter(data, item => item.isValid),

  // Step 4: Aggregate results
  data =>
    data.aggregate(data, {
      groupBy: ['type'],
      sum: ['amount'],
      count: ['items'],
    }),
])

// Branch execution based on conditions
const result = pipeline.branch(
  inputData,
  [
    {
      condition: data => data.type === 'premium',
      pipeline: premiumProcessor,
    },
    {
      condition: data => data.type === 'standard',
      pipeline: standardProcessor,
    },
  ],
  {
    fallback: defaultProcessor,
    parallel: false,
  }
)
```

## Cross-Pillar Integration

Combine all three pillars for complete workflows:

```typescript
// Fetch, validate, process, and aggregate
const analyzeUserData = async () => {
  // SERVICE: Fetch user data
  const usersResult = await service.get('/api/users', {
    timeout: 5000,
    validate: data.schema({
      users: { type: 'array', items: UserSchema },
    }),
  })

  if (Result.isErr(usersResult)) {
    return usersResult
  }

  // PIPELINE: Process users
  const processed = pipeline.compose([
    // Filter active users
    users => pipeline.filter(users, user => user.active),

    // Enhance with additional data
    users =>
      pipeline.map(
        users,
        async user => {
          const profileResult = await service.get(`/api/profiles/${user.id}`)
          return Result.isOk(profileResult) ? { ...user, profile: profileResult.value } : user
        },
        { parallel: true, async: true }
      ),

    // DATA: Aggregate analytics
    users =>
      data.aggregate(users, {
        groupBy: ['department', 'level'],
        sum: ['salary'],
        avg: ['experience', 'satisfaction'],
        count: ['total'],
      }),
  ])

  return processed(usersResult.value.users)
}
```

## Key Features

### 🎯 **Simple & Predictable**

- 23 core methods across 3 pillars
- Configuration objects everywhere
- No method chaining, no magic
- TypeScript-first with full type inference

### ⚡ **High Performance**

- Zero external dependencies
- Native validation (faster than schema libraries)
- Optimized for modern JavaScript engines
- Tree-shakable design

### 🛡️ **Type Safe**

- Full TypeScript inference
- Result pattern for error handling
- Schema validation with type generation
- Compile-time safety

### 🏗️ **Well Architected**

- Four-layer design: Core Methods → Configuration → Utilities → Internal
- Clean separation of concerns
- Composable by design
- Framework agnostic

## Error Handling

Comprehensive error handling with the Result pattern:

```typescript
// Service errors
const result = await service.get('/api/data')
if (Result.isErr(result)) {
  switch (result.error.code) {
    case 'SERVICE_HTTP_ERROR':
      console.log('HTTP Error:', result.error.status)
      break
    case 'SERVICE_NETWORK_ERROR':
      console.log('Network Error:', result.error.message)
      break
    case 'SERVICE_ERROR':
      console.log('Service Error:', result.error.message)
      break
  }
}

// Data validation errors
const validation = data.validate(input, schema)
if (Result.isErr(validation)) {
  if (validation.error.code === 'DATA_VALIDATION_ERROR') {
    console.log('Field:', validation.error.field)
    console.log('Value:', validation.error.value)
    console.log('Constraint:', validation.error.constraint)
  }
}

// Pipeline errors
const processed = pipeline.map(items, transform)
if (Result.isErr(processed)) {
  if (processed.error.code === 'PIPELINE_ERROR') {
    console.log('Pipeline failed:', processed.error.message)
  }
}
```

## Documentation

Visit our [documentation site](https://sanzoku-labs.github.io/kairo/) for:

- 📖 [Getting Started Guide](https://sanzoku-labs.github.io/kairo/guide/getting-started)
- 🔧 [API Reference](https://sanzoku-labs.github.io/kairo/api/)
- 💡 [Examples](https://sanzoku-labs.github.io/kairo/examples/)

## Development

```bash
# Install dependencies
bun install

# Run tests
bun run test

# Type checking
bun run typecheck

# Build the library
bun run build

# Run documentation locally
bun run docs:dev
```

## Architecture

Kairo follows a clean four-layer architecture:

1. **Core Methods** - 23 essential methods across 3 pillars
2. **Configuration Objects** - Rich, typed configuration for every method
3. **Public Utilities** - Helper functions for common operations
4. **Internal Utilities** - Private implementation details

This design ensures predictability, type safety, and maintainability while keeping the API surface minimal and focused.

## License

MIT © [Sovanaryth THORNG](https://github.com/sanzoku-labs)
