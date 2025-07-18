# Three-Pillar Architecture

Kairo is built around a clean three-pillar architecture that separates concerns while enabling powerful composition. This design ensures predictable patterns, maintainable code, and excellent TypeScript support.

## Overview

The three pillars are:

1. **[SERVICE](#service-pillar)** - HTTP-only API operations
2. **[DATA](#data-pillar)** - Data validation, transformation, and aggregation
3. **[PIPELINE](#pipeline-pillar)** - Logic composition and workflows

Each pillar is:
- **Independent** - can be used separately
- **Composable** - designed to work together seamlessly
- **Consistent** - follows the same patterns and conventions

## Architectural Layers

Kairo follows a four-layer architecture within each pillar:

```
┌─────────────────────────────────────────┐
│           Core Methods (23)             │ ← Public API
├─────────────────────────────────────────┤
│      Configuration Objects              │ ← Type-safe configs
├─────────────────────────────────────────┤  
│         Public Utilities               │ ← Helper functions
├─────────────────────────────────────────┤
│        Internal Utilities              │ ← Implementation details
└─────────────────────────────────────────┘
```

### Layer 1: Core Methods (23 total)
The public API surface with exactly 23 methods across all pillars.

### Layer 2: Configuration Objects
Rich, type-safe configuration options for each method.

### Layer 3: Public Utilities
Helper functions and utilities exposed to users.

### Layer 4: Internal Utilities
Implementation details not exposed to users.

## SERVICE Pillar

**Purpose**: HTTP-only API operations with rich configuration support.

### Methods (5 + 4 utilities)

```typescript
// Core HTTP methods
service.get(url, options)     // HTTP GET
service.post(url, options)    // HTTP POST
service.put(url, options)     // HTTP PUT
service.patch(url, options)   // HTTP PATCH
service.delete(url, options)  // HTTP DELETE

// Utilities (4)
service.buildUrl(base, path, params)
service.mergeHeaders(base, additional)
service.parseResponse(response, schema)
service.createRetryPolicy(options)
```

### Design Principles

1. **Configuration Objects** - All options passed as objects
2. **Request/Response Lifecycle** - Complete control over HTTP flow
3. **Error Handling** - Structured error types for different failure modes
4. **Performance** - Built-in caching, retry, and timeout support

### Example Usage

```typescript
const result = await service.get('/api/users', {
  timeout: 5000,
  retry: { attempts: 3, delay: 1000 },
  cache: { enabled: true, ttl: 300 },
  headers: { 'Authorization': 'Bearer token' },
  validate: UserArraySchema
})
```

## DATA Pillar

**Purpose**: Data validation, transformation, and aggregation with native performance.

### Methods (10 + 6 utilities)

```typescript
// Core data operations
data.schema(definition)          // Create validation schema
data.validate(value, schema)     // Validate against schema
data.transform(data, mapping)    // Transform data structure
data.convert(data, options)      // Convert data types
data.aggregate(data, operations) // Aggregate data
data.groupBy(data, keys)        // Group by keys
data.serialize(data, format)    // Serialize to format
data.deserialize(data, format)  // Deserialize from format
data.clone(data, options)       // Deep clone data
data.merge(target, source)      // Merge objects

// Utilities (6)
data.inferType(value)
data.createValidator(schema)
data.createTransformer(mapping)
data.createAggregator(operations)
data.createSerializer(format)
data.createMerger(strategy)
```

### Design Principles

1. **Schema-First** - Define data structure upfront
2. **Type Inference** - Automatic TypeScript type generation
3. **Native Performance** - Faster than external schema libraries
4. **Functional Operations** - Immutable transformations

### Example Usage

```typescript
// Schema definition
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 150 }
})

// Data validation
const validation = data.validate(userData, UserSchema)

// Data transformation
const transformed = data.transform(rawData, {
  mapping: { user_name: 'name', user_email: 'email' },
  compute: { fullName: item => `${item.firstName} ${item.lastName}` }
})

// Data aggregation
const analytics = data.aggregate(salesData, {
  groupBy: ['region', 'quarter'],
  sum: ['revenue', 'units'],
  avg: ['satisfaction']
})
```

## PIPELINE Pillar

**Purpose**: Logic composition and workflow orchestration with functional programming patterns.

### Methods (8 + 5 utilities)

```typescript
// Core pipeline operations
pipeline.map(data, fn, options)        // Transform each item
pipeline.filter(data, predicate)       // Filter items
pipeline.reduce(data, reducer, initial) // Reduce to single value
pipeline.compose(operations)           // Compose operations
pipeline.chain(data, operation)        // Chain operations
pipeline.branch(data, conditions)      // Conditional branching
pipeline.parallel(operations)          // Parallel execution
pipeline.validate(data, schema)        // Validate pipeline data

// Utilities (5)
pipeline.createMapper(fn)
pipeline.createFilter(predicate)
pipeline.createReducer(fn)
pipeline.createComposer(operations)
pipeline.createValidator(schema)
```

### Design Principles

1. **Functional Composition** - Compose complex operations from simple ones
2. **Immutable Operations** - All operations return new data
3. **Error Propagation** - Errors flow through the pipeline
4. **Parallel Processing** - Built-in support for concurrent operations

### Example Usage

```typescript
// Pipeline composition
const dataProcessor = pipeline.compose([
  // Step 1: Validate input
  data => pipeline.validate(data, InputSchema),
  
  // Step 2: Transform data
  data => pipeline.map(data, item => transformItem(item)),
  
  // Step 3: Filter valid items
  data => pipeline.filter(data, item => item.isValid),
  
  // Step 4: Aggregate results
  data => data.aggregate(data, {
    groupBy: ['category'],
    sum: ['amount']
  })
])

// Parallel processing
const processed = pipeline.map(
  items,
  async item => await processItem(item),
  { parallel: true, concurrency: 5 }
)

// Conditional branching
const result = pipeline.branch(
  inputData,
  [
    { condition: data => data.type === 'premium', pipeline: premiumProcessor },
    { condition: data => data.type === 'standard', pipeline: standardProcessor }
  ],
  { fallback: defaultProcessor }
)
```

## Cross-Pillar Integration

The three pillars are designed to work together seamlessly:

### Complete Workflow Example

```typescript
import { service, data, pipeline, Result } from '@sanzoku-labs/kairo'

// 1. Define schemas (DATA pillar)
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  active: { type: 'boolean' }
})

// 2. Fetch data (SERVICE pillar)
const fetchUsers = async () => {
  return service.get('/api/users', {
    timeout: 5000,
    retry: { attempts: 3 },
    validate: data.schema({
      users: { type: 'array', items: UserSchema }
    })
  })
}

// 3. Process data (PIPELINE pillar)
const processUsers = pipeline.compose([
  // Filter active users
  users => pipeline.filter(users, user => user.active),
  
  // Validate each user (DATA pillar)
  users => pipeline.map(users, user => data.validate(user, UserSchema)),
  
  // Transform for display
  users => pipeline.map(users, user => ({
    ...user,
    displayName: user.name.toUpperCase()
  })),
  
  // Aggregate analytics (DATA pillar)
  users => data.aggregate(users, {
    groupBy: ['department'],
    count: ['id'],
    avg: ['age']
  })
])

// 4. Complete workflow
const analyzeUsers = async () => {
  const usersResult = await fetchUsers()
  
  if (Result.isErr(usersResult)) {
    return usersResult
  }
  
  return processUsers(usersResult.value.users)
}
```

## Design Benefits

### 1. **Predictable Patterns**
- Same configuration object pattern across all methods
- Consistent error handling with Result pattern
- Similar naming conventions and method signatures

### 2. **Type Safety**
- Full TypeScript inference across all operations
- Schema-based type generation
- Compile-time error detection

### 3. **Composability**
- Each pillar can be used independently
- Seamless integration between pillars
- Functional composition patterns

### 4. **Performance**
- Native implementations without external dependencies
- Built-in optimizations (caching, parallel processing)
- Tree-shakable design

### 5. **Maintainability**
- Clear separation of concerns
- Consistent error handling
- Comprehensive documentation

## Comparison with Other Architectures

### Traditional MVC

```typescript
// Traditional MVC - coupled components
class UserController {
  constructor(private userService: UserService) {}
  
  async getUsers() {
    try {
      const users = await this.userService.fetchUsers()
      return this.transformUsers(users)
    } catch (error) {
      throw new Error('Failed to get users')
    }
  }
}

// Kairo - independent, composable pillars
const getUsers = async () => {
  const result = await service.get('/api/users')
  if (Result.isErr(result)) return result
  
  return pipeline.map(result.value, user => transformUser(user))
}
```

### Monolithic Libraries

```typescript
// Monolithic approach - everything in one place
const axios = require('axios')
const joi = require('joi')
const lodash = require('lodash')

// Multiple dependencies, different patterns
const response = await axios.get('/api/users')
const validated = joi.validate(response.data, schema)
const processed = lodash.map(validated.value, transform)

// Kairo - unified patterns, zero dependencies
const result = await service.get('/api/users', { validate: UserSchema })
if (Result.isOk(result)) {
  const processed = pipeline.map(result.value, transform)
}
```

## Best Practices

### 1. **Use Appropriate Pillars**
- SERVICE for HTTP operations
- DATA for validation and transformation
- PIPELINE for complex logic composition

### 2. **Leverage Cross-Pillar Integration**
- Validate API responses with DATA schemas
- Process data with PIPELINE operations
- Compose complete workflows

### 3. **Follow Configuration Patterns**
- Use configuration objects consistently
- Reuse configuration across similar operations
- Type configuration objects properly

### 4. **Handle Errors Appropriately**
- Always check Result types
- Use pattern matching for complex error handling
- Provide meaningful error context

## Migration Strategy

When adopting Kairo's architecture:

### Phase 1: Single Pillar Introduction
Start with one pillar that matches your immediate needs:

```typescript
// Replace existing HTTP client with SERVICE
const users = await service.get('/api/users', {
  timeout: 5000,
  retry: { attempts: 3 }
})
```

### Phase 2: Cross-Pillar Integration
Gradually integrate multiple pillars:

```typescript
// Add DATA validation to SERVICE calls
const users = await service.get('/api/users', {
  validate: UserArraySchema
})
```

### Phase 3: Full Workflow Composition
Compose complete workflows using all pillars:

```typescript
const userAnalytics = pipeline.compose([
  () => service.get('/api/users', { validate: UserSchema }),
  users => pipeline.filter(users, user => user.active),
  users => data.aggregate(users, { groupBy: ['department'] })
])
```

## Next Steps

- **[Configuration Objects](/guide/configuration)** - Learn advanced configuration patterns
- **[Result Pattern](/guide/result-pattern)** - Master error handling
- **[API Reference](/api/)** - Explore all 23 methods
- **[Examples](/examples/)** - See real-world usage patterns