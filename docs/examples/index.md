# Examples

Explore real-world examples of using Kairo's **core API** and **optional extensions**. Start with core examples, then explore advanced features.

## 🚀 Core API Examples

Start with these essential patterns using Kairo's core three-pillar architecture:

### [Simple Pipeline](/examples/basic-pipeline)

Learn the fundamentals with a simple data processing pipeline.

### [Data Fetching](/examples/data-fetching)

Common patterns for fetching and processing API data.

### [Contract Testing](/examples/contract-testing)

Verify API contracts and use mocks for development and testing.

### [Business Rules](/examples/business-rules)

Centralize validation logic with declarative business rules.

## 🛡️ Core DATA Pillar Examples

### [Data Transformations](/examples/data-transformations)

Declarative data mapping and conversion between different schemas.

### [Repository Patterns](/examples/repository-patterns)

Type-safe data access with relationships and lifecycle hooks.

---

## ⚡ Advanced Extension Examples

Explore enterprise-grade features with optional extensions:

### [Event-Driven Architecture](/examples/event-driven-architecture)

Building reactive applications with events, sagas, and event sourcing.

### [Workflows](/examples/workflows) 🆕

Complex multi-step process orchestration with error handling and testing.

### [Advanced Caching](/examples/advanced-caching) 🆕

Multi-level caching with analytics and intelligent invalidation strategies.

### [Plugin Development](/examples/plugin-development) 🆕

Creating extensible plugins that integrate with all three pillars.

### [Enterprise Integration](/examples/enterprise-integration)

Complete enterprise architecture with all advanced features combined.

> **New to Kairo?** Start with [Core API examples](#🚀-core-api-examples) first, then explore [Extension examples](#⚡-advanced-extension-examples) as your application grows.

---

## 🔧 Framework Integration

Kairo works seamlessly with any TypeScript framework. Here are core API integration patterns:

### React Integration

```typescript
import { pipeline, schema } from 'kairo'
import { useEffect, useState } from 'react'

const UserSchema = schema.object({
  id: schema.number(),
  name: schema.string(),
  email: schema.string()
})

// Pipeline for fetching user data
const getUserPipeline = pipeline('get-user')
  .input(schema.object({ id: schema.number() }))
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
import { pipeline, schema, repository } from 'kairo'

const app = express()

const CreateUserSchema = schema.object({
  name: schema.string(),
  email: schema.string().email(),
})

const UserSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  email: schema.string(),
  createdAt: schema.string(),
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
