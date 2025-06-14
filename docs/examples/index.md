# Examples

Explore real-world examples of using Kairo in different scenarios.

## Basic Examples

### [Simple Pipeline](/examples/basic-pipeline)
Learn the fundamentals with a simple data processing pipeline.

### [Data Fetching](/examples/data-fetching)
Common patterns for fetching and processing API data.

## Advanced Examples

### [Reactive State](/examples/reactive-state)
Using Signals and Tasks for reactive applications.

## Framework Integration

### React Integration

```typescript
import { pipeline, schema, signal } from 'kairo'
import { useEffect, useState } from 'react'

// Create a signal for reactive state
const userSignal = signal(null)

// Pipeline for fetching user data
const getUserPipeline = pipeline('get-user')
  .input(schema(z.object({ id: z.number() })))
  .fetch('/api/users/:id')
  .validate(UserSchema)

function UserProfile({ userId }) {
  useEffect(() => {
    getUserPipeline.run({ id: userId }).then(result => {
      if (result.tag === 'Ok') {
        userSignal.set(result.value)
      }
    })
  }, [userId])

  const user = userSignal.get()
  
  return user ? (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  ) : (
    <div>Loading...</div>
  )
}
```

### Node.js Integration

```typescript
import express from 'express'
import { pipeline, schema } from 'kairo'

const app = express()

const createUserPipeline = pipeline('create-user')
  .input(CreateUserSchema)
  .validate(UserSchema)
  .map(user => ({ ...user, createdAt: new Date() }))

app.post('/users', async (req, res) => {
  const result = await createUserPipeline.run(req.body)
  
  if (result.tag === 'Ok') {
    res.status(201).json(result.value)
  } else {
    res.status(400).json({ 
      error: result.error.message,
      code: result.error.code 
    })
  }
})
```

## Testing Examples

```typescript
import { describe, it, expect, vi } from 'vitest'
import { pipeline, schema, isOk, isErr } from 'kairo'

describe('User Pipeline', () => {
  it('should process user data correctly', async () => {
    const mockClient = {
      get: vi.fn().mockResolvedValue({
        id: 123,
        name: 'John Doe',
        email: 'john@example.com'
      })
    }

    const pipeline = getUserPipeline.withClient(mockClient)
    const result = await pipeline.run({ id: 123 })

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.name).toBe('John Doe')
    }
  })

  it('should handle network errors gracefully', async () => {
    const mockClient = {
      get: vi.fn().mockRejectedValue(new Error('Network error'))
    }

    const pipeline = getUserPipeline.withClient(mockClient)
    const result = await pipeline.run({ id: 123 })

    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe('NETWORK_ERROR')
    }
  })
})
```