# Getting Started

Get up and running with Kairo in minutes. This guide walks you through installation, basic concepts, and your first Kairo application.

## Installation

Install Kairo via npm, yarn, or bun:

::: code-group

```bash [npm]
npm install kairo
```

```bash [yarn]
yarn add kairo
```

```bash [bun]
bun add kairo
```

:::

## Your First Import

```typescript
import { service, data, pipeline, Result } from 'kairo'
```

That's it! You now have access to all three pillars:
- **`service`** - HTTP operations
- **`data`** - Data validation and transformation
- **`pipeline`** - Logic composition
- **`Result`** - Error handling utilities

## Basic Example

Let's build a simple user management system:

```typescript
import { service, data, pipeline, Result } from 'kairo'

// 1. Define a user schema
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  active: { type: 'boolean' }
})

// 2. Fetch users from API
const fetchUsers = async () => {
  return service.get('/api/users', {
    timeout: 5000,
    retry: { attempts: 3 },
    headers: { 'Authorization': 'Bearer token' }
  })
}

// 3. Process users with pipeline
const processUsers = pipeline.compose([
  // Filter active users
  users => pipeline.filter(users, user => user.active),
  
  // Validate each user
  users => pipeline.map(users, user => data.validate(user, UserSchema)),
  
  // Transform to display format
  users => pipeline.map(users, user => ({
    ...user,
    displayName: user.name.toUpperCase(),
    status: user.active ? 'Active' : 'Inactive'
  }))
])

// 4. Main function
const main = async () => {
  const usersResult = await fetchUsers()
  
  if (Result.isErr(usersResult)) {
    console.error('Failed to fetch users:', usersResult.error.message)
    return
  }
  
  const processedResult = processUsers(usersResult.value)
  
  if (Result.isOk(processedResult)) {
    console.log('Processed users:', processedResult.value)
  } else {
    console.error('Processing failed:', processedResult.error.message)
  }
}

main()
```

## Understanding the Example

### 1. **Schema Definition**
```typescript
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  active: { type: 'boolean' }
})
```
- Creates a validation schema for user objects
- Provides type inference for TypeScript
- Validates data format and constraints

### 2. **HTTP Operations**
```typescript
const result = await service.get('/api/users', {
  timeout: 5000,
  retry: { attempts: 3 },
  headers: { 'Authorization': 'Bearer token' }
})
```
- Configuration object pattern - all options in one place
- Built-in retry and timeout handling
- Returns `Result<Error, Data>` for safe error handling

### 3. **Pipeline Composition**
```typescript
const processUsers = pipeline.compose([
  users => pipeline.filter(users, user => user.active),
  users => pipeline.map(users, user => data.validate(user, UserSchema)),
  users => pipeline.map(users, user => ({ ...user, displayName: user.name.toUpperCase() }))
])
```
- Functional composition of operations
- Each step transforms the data
- Composable and reusable

### 4. **Error Handling**
```typescript
if (Result.isErr(usersResult)) {
  console.error('Failed to fetch users:', usersResult.error.message)
  return
}
```
- No exceptions thrown - explicit error handling
- Type-safe error checking
- Structured error information

## Core Concepts

### Configuration Objects

Every method uses configuration objects:

```typescript
// ✅ Clear and explicit
service.post('/api/users', {
  body: userData,
  timeout: 10000,
  retry: { attempts: 3, delay: 1000 },
  headers: { 'Content-Type': 'application/json' }
})

// ❌ Method chaining (what we avoid)
client.timeout(10000).retry(3).post('/api/users', userData)
```

### Result Pattern

All operations return `Result<Error, Data>`:

```typescript
// Pattern matching approach
Result.match(result, {
  Ok: data => console.log('Success:', data),
  Err: error => console.error('Error:', error.message)
})

// Type guard approach
if (Result.isOk(result)) {
  console.log('Data:', result.value) // Properly typed
}

if (Result.isErr(result)) {
  console.error('Error:', result.error) // Properly typed
}
```

### Three Pillars

1. **SERVICE** - HTTP operations
2. **DATA** - Validation, transformation, aggregation
3. **PIPELINE** - Logic composition

Each pillar is independent but designed to work together.

## Common Patterns

### API Client Pattern

```typescript
const apiClient = {
  getUsers: () => service.get('/api/users', { 
    timeout: 5000,
    retry: { attempts: 3 } 
  }),
  
  createUser: (userData) => service.post('/api/users', {
    body: userData,
    validate: UserSchema
  }),
  
  updateUser: (id, userData) => service.put(`/api/users/${id}`, {
    body: userData,
    merge: true
  })
}
```

### Data Processing Pipeline

```typescript
const dataProcessor = pipeline.compose([
  // Input validation
  data => pipeline.validate(data, InputSchema),
  
  // Transformation
  data => pipeline.map(data, item => transformItem(item)),
  
  // Filtering
  data => pipeline.filter(data, item => item.isValid),
  
  // Aggregation
  data => data.aggregate(data, {
    groupBy: ['category'],
    sum: ['amount'],
    count: ['items']
  })
])
```

### Error Recovery

```typescript
const robustFetch = async (url: string) => {
  const result = await service.get(url, { 
    timeout: 5000,
    retry: { attempts: 3 } 
  })
  
  // Provide fallback data on error
  if (Result.isErr(result)) {
    return Result.Ok({ data: [], message: 'Using cached data' })
  }
  
  return result
}
```

## Next Steps

Now that you understand the basics:

1. **[Installation Guide](/guide/installation)** - Detailed setup instructions
2. **[Quick Start](/guide/quick-start)** - Build your first application
3. **[Architecture](/guide/architecture)** - Deep dive into the three pillars
4. **[Examples](/examples/)** - Real-world usage patterns

## TypeScript Support

Kairo is TypeScript-first with full type inference:

```typescript
// Schema types are automatically inferred
const UserSchema = data.schema({
  name: { type: 'string' },
  age: { type: 'number' }
})

// This is automatically typed as { name: string, age: number }
type User = InferSchema<typeof UserSchema>

// API responses are properly typed
const usersResult = await service.get('/api/users', {
  validate: data.schema({ users: { type: 'array', items: UserSchema } })
})

if (Result.isOk(usersResult)) {
  // usersResult.value is properly typed
  usersResult.value.users.forEach(user => {
    console.log(user.name) // TypeScript knows this is a string
  })
}
```

## Common Questions

### Q: Do I need to use all three pillars?
A: No! Each pillar is independent. Use only what you need.

### Q: Can I use Kairo with existing libraries?
A: Yes! Kairo is designed to complement existing tools, not replace them.

### Q: How does error handling work?
A: All operations return `Result<Error, Data>`. No exceptions are thrown.

### Q: Is Kairo framework-specific?
A: No! Kairo works with any TypeScript project - React, Vue, Node.js, etc.

Ready to dive deeper? Check out the [Quick Start guide](/guide/quick-start) to build your first application!