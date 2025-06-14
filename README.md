# Kairo

> Eliminate service repetition and compose business logic elegantly

[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://sovanaryththorng.github.io/kairo/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Kairo solves two specific pain points through declarative patterns:

1. **Service Layer Repetition** → Resource declarations
2. **Complex Business Logic** → Pipeline composition

**Framework-agnostic** by design - works with React, Vue, Node, Bun, and any TypeScript environment without requiring adapters.

## Quick Start

```bash
npm install kairo
```

### 1. Resources - Eliminate Service Boilerplate

```typescript
import { resource, schema } from 'kairo'
import { z } from 'zod'

// BEFORE: Repetitive service classes
class UserService {
  async getUser(id: string): Promise<User> {
    // ... repetitive fetch, validation, error handling
  }
}

// AFTER: Declarative resource
const UserAPI = resource('users', {
  get: {
    path: '/users/:id',
    params: z.object({ id: z.string() }),
    response: UserSchema
  },
  create: {
    path: '/users',
    method: 'POST',
    body: CreateUserSchema,
    response: UserSchema
  }
})

// Usage with full type safety
const result = await UserAPI.get.run({ id: '123' })
```

### 2. Pipelines - Compose Business Logic

```typescript
// BEFORE: Complex imperative logic with error handling
const processOrder = async (orderData) => {
  try {
    const validated = OrderSchema.parse(orderData)
    // ... complex business logic with nested try/catch
  } catch (error) {
    // ... error handling
  }
}

// AFTER: Declarative pipeline
const processOrder = pipeline('process-order')
  .input(OrderSchema)
  .validate(requiresApproval)
  .fetch('/api/inventory/check')
  .map(calculateDiscount)
  .fetch('/api/payment/process')
  .map(transformOrderResult)
  .trace('order-processing')

// Execute with Result pattern
const result = await processOrder.run(orderData)
```

## Key Features

- 🔧 **Framework Agnostic** - Works with React, Vue, Node, Bun, and any TypeScript environment
- 🏗️ **Two-Pillar Architecture** - Resources for APIs, Pipelines for business logic
- ⚡ **Functional & Composable** - Inspired by Gleam with immutable, pure functions
- 🎯 **Developer Joy** - Eliminate boilerplate and improve debugging experience
- 🛡️ **Type Safe** - Full TypeScript support with Result pattern for error handling
- 📦 **Lightweight** - Core bundle < 15kb gzipped

## Core Concepts

### Result Pattern - Error Handling Without Exceptions

```typescript
type Result<E, T> = { tag: 'Ok'; value: T } | { tag: 'Err'; error: E }

// Pattern matching for clean error handling
Result.match(result, {
  Ok: (user) => console.log('Success:', user),
  Err: (error) => console.error('Error:', error)
})
```

### Resources - Declarative API Definitions

```typescript
const api = resource('api', {
  getUser: {
    path: '/users/:id',
    params: UserParamsSchema,
    response: UserSchema
  },
  createUser: {
    path: '/users',
    method: 'POST',
    body: CreateUserSchema,
    response: UserSchema
  }
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
