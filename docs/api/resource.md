# Resource

Resources provide declarative API endpoint definitions with automatic pipeline generation. They simplify REST API interactions by generating type-safe pipelines for each HTTP method.

## Creating Resources

```typescript
import { resource, schema } from 'kairo'
import { z } from 'zod'

const UserResource = resource('users', {
  get: {
    method: 'GET',
    path: '/api/users/:id',
    params: schema(z.object({ id: z.string() })),
    response: schema(UserSchema)
  },
  create: {
    method: 'POST',
    path: '/api/users',
    body: schema(CreateUserSchema),
    response: schema(UserSchema)
  },
  update: {
    method: 'PUT',
    path: '/api/users/:id',
    params: schema(z.object({ id: z.string() })),
    body: schema(UpdateUserSchema),
    response: schema(UserSchema)
  },
  delete: {
    method: 'DELETE',
    path: '/api/users/:id',
    params: schema(z.object({ id: z.string() })),
    response: schema(z.object({ success: z.boolean() }))
  }
})
```

## Method Configuration

```typescript
interface ResourceMethod {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  params?: Schema<any>      // URL parameters like :id
  query?: Schema<any>       // Query string parameters
  body?: Schema<any>        // Request body (POST, PUT, PATCH)
  response?: Schema<any>    // Response validation
  cache?: CacheConfig       // Method-level caching
  retry?: RetryConfig       // Method-level retry
  timeout?: number          // Method-level timeout
}
```

## Using Generated Pipelines

Each method becomes a Pipeline that can be executed:

```typescript
// Get user by ID
const userResult = await UserResource.get.run({ id: '123' })

if (userResult.tag === 'Ok') {
  console.log('User:', userResult.value) // Typed as User
} else {
  console.error('Error:', userResult.error)
}

// Create new user
const createResult = await UserResource.create.run({
  name: 'John Doe',
  email: 'john@example.com'
})

// Update user
const updateResult = await UserResource.update.run({
  id: '123',
  name: 'Jane Doe'
})

// Delete user
const deleteResult = await UserResource.delete.run({ id: '123' })
```

## URL Interpolation

Resources automatically handle URL parameter interpolation:

```typescript
const PostResource = resource('posts', {
  getByUser: {
    method: 'GET',
    path: '/api/users/:userId/posts/:postId',
    params: schema(z.object({
      userId: z.string(),
      postId: z.string()
    })),
    query: schema(z.object({
      include: z.array(z.string()).optional(),
      limit: z.number().optional()
    })),
    response: schema(PostSchema)
  }
})

// Usage - parameters are automatically interpolated
const result = await PostResource.getByUser.run({
  userId: '123',
  postId: '456',
  include: ['comments', 'author'],
  limit: 10
})

// Generates request to: /api/users/123/posts/456?include=comments,author&limit=10
```

## Configuration Layers

### Resource-level Configuration

```typescript
const UserResource = resource('users', {
  // Resource-level defaults
  cache: { ttl: 300000 }, // 5 minutes
  retry: { times: 3, delay: 1000 },
  timeout: 10000,
  
  get: {
    method: 'GET',
    path: '/api/users/:id',
    params: schema(z.object({ id: z.string() })),
    // Inherits resource-level cache, retry, timeout
  },
  
  create: {
    method: 'POST',
    path: '/api/users',
    body: schema(CreateUserSchema),
    cache: null, // Override: no caching for create
    retry: { times: 1 } // Override: only retry once
  }
})
```

### Method-level Configuration

```typescript
const ApiResource = resource('api', {
  criticalOperation: {
    method: 'POST',
    path: '/api/critical',
    body: schema(DataSchema),
    timeout: 30000,      // 30 second timeout
    retry: { 
      times: 5, 
      delay: 2000,
      backoff: 'exponential'
    },
    cache: null          // No caching for critical operations
  }
})
```

## Resource Utilities

### `resourceUtils` - Helper Functions

```typescript
import { resourceUtils } from 'kairo'

// Quick REST resource generation
const UserResource = resourceUtils.rest('users', '/api/users', {
  schema: UserSchema,
  createSchema: CreateUserSchema,
  updateSchema: UpdateUserSchema
})

// Generates standard CRUD operations:
// - get: GET /api/users/:id
// - list: GET /api/users
// - create: POST /api/users
// - update: PUT /api/users/:id
// - delete: DELETE /api/users/:id
```

### HTTP Method Helpers

```typescript
// GET request helper
const getUser = resourceUtils.get('/api/users/:id', {
  params: schema(z.object({ id: z.string() })),
  response: schema(UserSchema)
})

// POST request helper
const createUser = resourceUtils.post('/api/users', {
  body: schema(CreateUserSchema),
  response: schema(UserSchema)
})

// PUT request helper
const updateUser = resourceUtils.put('/api/users/:id', {
  params: schema(z.object({ id: z.string() })),
  body: schema(UpdateUserSchema),
  response: schema(UserSchema)
})
```

## Caching

### Resource-level Caching

```typescript
import { resourceCache } from 'kairo'

const CachedResource = resource('cached', {
  cache: { ttl: 600000 }, // 10 minutes default
  
  get: {
    method: 'GET',
    path: '/api/data/:id',
    params: schema(z.object({ id: z.string() }))
  }
})

// Manual cache operations
resourceCache.invalidate('cached', 'get', { id: '123' })
resourceCache.clear('cached') // Clear all cached data for resource
resourceCache.clearAll() // Clear all cached data
```

### Method-specific Caching

```typescript
const SmartResource = resource('smart', {
  // Fast-changing data - short cache
  stats: {
    method: 'GET',
    path: '/api/stats',
    cache: { ttl: 30000 } // 30 seconds
  },
  
  // Slow-changing data - long cache
  config: {
    method: 'GET',
    path: '/api/config',
    cache: { ttl: 3600000 } // 1 hour
  },
  
  // No caching for mutations
  update: {
    method: 'POST',
    path: '/api/update',
    cache: null
  }
})
```

## Error Handling

Resources inherit Pipeline error handling:

```typescript
const result = await UserResource.get.run({ id: '123' })

// Handle specific error types
if (result.tag === 'Err') {
  if (result.error.code === 'NETWORK_ERROR') {
    console.log('Network issue')
  } else if (result.error.code === 'VALIDATION_ERROR') {
    console.log('Invalid response data')
  } else if (result.error.code === 'HTTP_ERROR') {
    console.log('HTTP error:', result.error.status)
  }
}
```

## Integration with Other Primitives

### Convert to Signal

```typescript
const userSignal = UserResource.get.asSignal()

// Execute and update signal
await userSignal.run({ id: '123' })
console.log(userSignal.get()) // User data or null
```

### Convert to Task

```typescript
const userTask = UserResource.get.asTask()

await userTask.run({ id: '123' })
console.log(userTask.state) // 'success' | 'error' | etc.
```

## Advanced Patterns

### Dependent Resources

```typescript
const UserResource = resource('users', {
  get: { /* ... */ }
})

const PostsResource = resource('posts', {
  getByUser: {
    method: 'GET',
    path: '/api/users/:userId/posts',
    params: schema(z.object({ userId: z.string() }))
  }
})

// Chain resource calls
const getUserWithPosts = async (userId: string) => {
  const userResult = await UserResource.get.run({ id: userId })
  
  if (userResult.tag === 'Ok') {
    const postsResult = await PostsResource.getByUser.run({ userId })
    
    if (postsResult.tag === 'Ok') {
      return {
        user: userResult.value,
        posts: postsResult.value
      }
    }
  }
  
  // Handle errors...
}
```

### Resource Composition

```typescript
// Combine multiple resources
const AppResource = {
  users: UserResource,
  posts: PostsResource,
  comments: CommentsResource
}

// Parallel data fetching
const loadDashboard = async (userId: string) => {
  const [userResult, postsResult, commentsResult] = await Promise.all([
    AppResource.users.get.run({ id: userId }),
    AppResource.posts.getByUser.run({ userId }),
    AppResource.comments.getByUser.run({ userId })
  ])
  
  // Process results...
}
```

## Type Safety

Resources maintain full type safety:

```typescript
const UserResource = resource('users', {
  get: {
    method: 'GET',
    path: '/api/users/:id',
    params: schema(z.object({ id: z.string() })),
    response: schema(UserSchema)
  }
})

// TypeScript infers correct types
const result = await UserResource.get.run({ id: '123' })

if (result.tag === 'Ok') {
  // result.value is typed as User
  console.log(result.value.name) // ✅ Type-safe access
}
```

## Framework Integration

### React Integration

```typescript
function UserProfile({ userId }: { userId: string }) {
  const userTask = UserResource.get.asTask()
  const { state, data, error } = useTask(userTask)
  
  useEffect(() => {
    userTask.run({ id: userId })
  }, [userId])
  
  if (state === 'pending') return <div>Loading...</div>
  if (state === 'error') return <div>Error: {error?.message}</div>
  if (state === 'success') return <div>Hello, {data.name}</div>
  
  return null
}
```

### Custom Hooks

```typescript
function useResource<T>(resource: Pipeline<any, T>, input: any) {
  const task = resource.asTask()
  const { state, data, error } = useTask(task)
  
  useEffect(() => {
    task.run(input)
  }, [JSON.stringify(input)])
  
  return { 
    loading: state === 'pending',
    data,
    error,
    refetch: () => task.run(input)
  }
}

// Usage
function UserComponent({ userId }: { userId: string }) {
  const { loading, data, error, refetch } = useResource(
    UserResource.get,
    { id: userId }
  )
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error loading user</div>
  
  return (
    <div>
      <h1>{data.name}</h1>
      <button onClick={refetch}>Refresh</button>
    </div>
  )
}
```

## Testing

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('UserResource', () => {
  it('should fetch user correctly', async () => {
    const mockClient = {
      get: vi.fn().mockResolvedValue({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com'
      })
    }
    
    const resource = UserResource.get.withClient(mockClient)
    const result = await resource.run({ id: '123' })
    
    expect(result.tag).toBe('Ok')
    if (result.tag === 'Ok') {
      expect(result.value.name).toBe('John Doe')
    }
    
    expect(mockClient.get).toHaveBeenCalledWith('/api/users/123')
  })
})
```

## Best Practices

1. **Use descriptive resource names** for better debugging
2. **Define proper schemas** for type safety and validation
3. **Configure appropriate caching** based on data volatility
4. **Handle errors gracefully** with the Result pattern
5. **Use resource utilities** for common REST patterns
6. **Leverage type inference** for better development experience
7. **Test resource behavior** including error scenarios
8. **Consider performance** when configuring cache and retry settings

Resources provide a powerful, declarative way to define and interact with APIs while maintaining type safety and leveraging Kairo's reactive primitives.