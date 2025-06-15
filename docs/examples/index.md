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

### [Workflows](/examples/workflows)

Complex multi-step process orchestration with error handling and testing.

## DATA Pillar Examples

### [Data Transformations](/examples/data-transformations)

Declarative data mapping and conversion between different schemas.

### [Repository Patterns](/examples/repository-patterns)

Type-safe data access with relationships and lifecycle hooks.

## Advanced Examples

Kairo's Three-Pillar Architecture enables sophisticated application development with declarative patterns across data, interfaces, and processes.

## Framework Integration

### React Integration

```typescript
import { pipeline, nativeSchema } from 'kairo'
import { useEffect, useState } from 'react'

const UserSchema = nativeSchema.object({
  id: nativeSchema.number(),
  name: nativeSchema.string(),
  email: nativeSchema.string()
})

// Pipeline for fetching user data
const getUserPipeline = pipeline('get-user')
  .input(nativeSchema.object({ id: nativeSchema.number() }))
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
import { pipeline, nativeSchema, repository } from 'kairo'

const app = express()

const CreateUserSchema = nativeSchema.object({
  name: nativeSchema.string(),
  email: nativeSchema.string().email(),
})

const UserSchema = nativeSchema.object({
  id: nativeSchema.string(),
  name: nativeSchema.string(),
  email: nativeSchema.string(),
  createdAt: nativeSchema.string(),
})

const userRepository = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  timestamps: true,
})

const createUserPipeline = pipeline('create-user')
  .input(CreateUserSchema)
  .map(user => ({
    ...user,
    id: Math.random().toString(36),
  }))
  .run(async user => await userRepository.create(user))

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
import { pipeline, nativeSchema, Result } from 'kairo'

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
