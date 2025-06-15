# Examples

Explore real-world examples of using Kairo in different scenarios.

## Basic Examples

### [Simple Pipeline](/examples/basic-pipeline)

Learn the fundamentals with a simple data processing pipeline.

### [Data Fetching](/examples/data-fetching)

Common patterns for fetching and processing API data.

### [Contract Testing](/examples/contract-testing)

Verify API contracts and use mocks for development and testing.

### [Business Rules](/examples/business-rules)

Centralize validation logic with declarative business rules.

## Advanced Examples

_More advanced examples coming soon as we expand Kairo's capabilities._

## Framework Integration

### React Integration

```typescript
import { pipeline, schema } from 'kairo'
import { useEffect, useState } from 'react'
import { z } from 'zod'

const UserSchema = schema.from(z.object({
  id: z.number(),
  name: z.string(),
  email: z.string()
}))

// Pipeline for fetching user data
const getUserPipeline = pipeline('get-user')
  .input(schema.from(z.object({ id: z.number() })))
  .fetch('/api/users/:id')
  .validate(UserSchema)

function UserProfile({ userId }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getUserPipeline.run({ id: userId }).then(result => {
      if (result.tag === 'Ok') {
        setUser(result.value)
      }
      setLoading(false)
    })
  }, [userId])

  if (loading) return <div>Loading...</div>

  return user ? (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  ) : (
    <div>User not found</div>
  )
}
```

### Node.js Integration

```typescript
import express from 'express'
import { pipeline, schema } from 'kairo'
import { z } from 'zod'

const app = express()

const CreateUserSchema = schema.from(
  z.object({
    name: z.string(),
    email: z.string().email(),
  })
)

const UserSchema = schema.from(
  z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    createdAt: z.date(),
  })
)

const createUserPipeline = pipeline('create-user')
  .input(CreateUserSchema)
  .map(user => ({
    ...user,
    id: Math.random().toString(36),
    createdAt: new Date(),
  }))
  .validate(UserSchema)

app.post('/users', async (req, res) => {
  const result = await createUserPipeline.run(req.body)

  if (result.tag === 'Ok') {
    res.status(201).json(result.value)
  } else {
    res.status(400).json({
      error: result.error.message,
      code: result.error.code,
    })
  }
})
```

## Testing Examples

```typescript
import { describe, it, expect, vi } from 'vitest'
import { pipeline, schema, Result } from 'kairo'

describe('User Pipeline', () => {
  it('should process user data correctly', async () => {
    const mockClient = {
      get: vi.fn().mockResolvedValue({
        id: 123,
        name: 'John Doe',
        email: 'john@example.com',
      }),
    }

    const pipeline = getUserPipeline.withHttpClient(mockClient)
    const result = await pipeline.run({ id: 123 })

    expect(result.tag).toBe('Ok')
    if (result.tag === 'Ok') {
      expect(result.value.name).toBe('John Doe')
    }
  })

  it('should handle network errors gracefully', async () => {
    const mockClient = {
      get: vi.fn().mockRejectedValue(new Error('Network error')),
    }

    const pipeline = getUserPipeline.withHttpClient(mockClient)
    const result = await pipeline.run({ id: 123 })

    expect(result.tag).toBe('Err')
    if (result.tag === 'Err') {
      expect(result.error.code).toBe('NETWORK_ERROR')
    }
  })
})
```
