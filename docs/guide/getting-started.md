# Getting Started

This guide will help you install Kairo and create your first pipeline.

## Installation

Install Kairo using your preferred package manager:

::: code-group

```bash [npm]
npm install kairo
```

```bash [bun]
bun add kairo
```

```bash [yarn]
yarn add kairo
```

```bash [pnpm]
pnpm add kairo
```

:::

Kairo has a peer dependency on Zod for schema validation:

```bash
npm install zod
```

## Your First Pipeline

Let's create a simple pipeline that fetches and validates user data:

```typescript
import { pipeline, schema } from 'kairo'
import { z } from 'zod'

// Define schemas for validation
const UserIdSchema = schema(
  z.object({
    id: z.number().positive(),
  })
)

const UserSchema = schema(
  z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    avatar: z.string().url().optional(),
  })
)

// Create a pipeline
const getUserPipeline = pipeline('get-user')
  .input(UserIdSchema) // Validate input
  .fetch('/api/users/:id') // Make HTTP request
  .validate(UserSchema) // Validate response
  .map(user => ({
    // Transform data
    displayName: user.name,
    email: user.email,
    hasAvatar: !!user.avatar,
  }))
  .trace('user-processed') // Add debugging trace

// Execute the pipeline
const result = await getUserPipeline.run({ id: 123 })

// Handle the result
if (result.tag === 'Ok') {
  console.log('User data:', result.value)
  // result.value is fully typed!
} else {
  console.error('Failed to get user:', result.error)
  // Errors are structured and predictable
}
```

## Understanding the Result Pattern

Kairo uses the `Result<Error, Value>` pattern for error handling instead of throwing exceptions:

```typescript
import { Result, isOk, isErr } from 'kairo'

// Results have two possible states
type Result<E, T> = { tag: 'Ok'; value: T } | { tag: 'Err'; error: E }

// Pattern matching
if (result.tag === 'Ok') {
  // TypeScript knows this is the success case
  console.log(result.value) // ✅ Type-safe access
} else {
  // TypeScript knows this is the error case
  console.log(result.error) // ✅ Type-safe error handling
}

// Or use helper functions
if (isOk(result)) {
  console.log(result.value) // ✅ Type-safe
}

if (isErr(result)) {
  console.log(result.error) // ✅ Type-safe
}
```

## Basic Error Handling

```typescript
const pipeline = pipeline('example')
  .input(schema(z.string()))
  .mapError(error => {
    // Transform or log errors
    console.error('Pipeline failed:', error)
    return error
  })

const result = await pipeline.run('valid input')

if (isErr(result)) {
  // Handle different error types
  switch (result.error.code) {
    case 'VALIDATION_ERROR':
      console.log('Invalid input provided')
      break
    case 'NETWORK_ERROR':
      console.log('Network request failed')
      break
    default:
      console.log('Unknown error occurred')
  }
}
```

## Pipeline Composition

Pipelines are composable and reusable:

```typescript
// Base pipeline for API calls
const apiPipeline = pipeline('api-base')
  .input(schema(z.object({ endpoint: z.string() })))
  .fetch(input => input.endpoint)

// Specialized user pipeline
const userPipeline = apiPipeline.validate(UserSchema).map(user => user.profile)

// Another specialized pipeline
const postsPipeline = apiPipeline.validate(PostsSchema).map(posts => posts.slice(0, 10)) // Take first 10 posts
```

## Testing Pipelines

Pipelines are easy to test because they're pure functions:

```typescript
import { describe, it, expect } from 'vitest'

describe('getUserPipeline', () => {
  it('should transform user data correctly', async () => {
    // Mock the HTTP client
    const mockClient = {
      get: vi.fn().mockResolvedValue({
        id: 123,
        name: 'John Doe',
        email: 'john@example.com',
      }),
    }

    const pipeline = getUserPipeline.withClient(mockClient)
    const result = await pipeline.run({ id: 123 })

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.displayName).toBe('John Doe')
      expect(result.value.hasAvatar).toBe(false)
    }
  })

  it('should handle validation errors', async () => {
    const result = await getUserPipeline.run({ id: -1 }) // Invalid ID

    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
    }
  })
})
```

## Framework Integration

### React Example

```typescript
import { useEffect, useState } from 'react'

function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserPipeline.run({ id: userId }).then(result => {
      setLoading(false)
      if (isOk(result)) {
        setUser(result.value)
        setError(null)
      } else {
        setError(result.error)
        setUser(null)
      }
    })
  }, [userId])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!user) return null

  return (
    <div>
      <h1>{user.displayName}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

### Node.js Example

```typescript
import express from 'express'

const app = express()

app.get('/users/:id', async (req, res) => {
  const result = await getUserPipeline.run({
    id: parseInt(req.params.id),
  })

  if (isOk(result)) {
    res.json(result.value)
  } else {
    const error = result.error
    res.status(error.status || 500).json({
      error: error.message,
      code: error.code,
    })
  }
})
```

## Next Steps

Now that you've created your first pipeline, explore more advanced features:

- [Core Concepts](/guide/concepts) - Deeper understanding of Kairo's architecture
- [API Reference](/api/) - Complete API documentation
- [Examples](/examples/) - Real-world usage patterns
