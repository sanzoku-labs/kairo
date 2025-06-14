# Data Fetching

Common patterns for fetching and processing API data with Kairo pipelines.

## Basic API Fetching

```typescript
import { pipeline, schema } from 'kairo'
import { z } from 'zod'

// Define response schema
const UserSchema = schema(z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().optional()
}))

// Create fetch pipeline
const getUserPipeline = pipeline('get-user')
  .input(schema(z.object({ id: z.number() })))
  .fetch('/api/users/:id')
  .validate(UserSchema)
  .map(user => ({
    ...user,
    displayName: user.name.toUpperCase(),
    initials: user.name.split(' ').map(n => n[0]).join('')
  }))

// Usage
const result = await getUserPipeline.run({ id: 123 })

if (result.tag === 'Ok') {
  console.log('User loaded:', result.value)
} else {
  console.error('Failed to load user:', result.error.message)
}
```

## POST Request with Payload

```typescript
const CreateUserSchema = schema(z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['user', 'admin'])
}))

const createUserPipeline = pipeline('create-user')
  .input(CreateUserSchema)
  .fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: (input) => JSON.stringify(input)
  })
  .validate(UserSchema)
  .map(newUser => ({
    ...newUser,
    welcomeMessage: `Welcome to our platform, ${newUser.name}!`
  }))

// Usage
const createResult = await createUserPipeline.run({
  name: 'Jane Doe',
  email: 'jane@example.com',
  role: 'user'
})
```

## Query Parameters

```typescript
const SearchUsersSchema = schema(z.object({
  query: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0)
}))

const UsersListSchema = schema(z.object({
  users: z.array(UserSchema.zod),
  total: z.number(),
  hasMore: z.boolean()
}))

const searchUsersPipeline = pipeline('search-users')
  .input(SearchUsersSchema)
  .map(params => {
    const queryString = new URLSearchParams()
    
    if (params.query) queryString.set('q', params.query)
    if (params.role) queryString.set('role', params.role)
    queryString.set('limit', params.limit.toString())
    queryString.set('offset', params.offset.toString())
    
    return `/api/users?${queryString.toString()}`
  })
  .fetch((url) => url)
  .validate(UsersListSchema)

// Usage
const searchResult = await searchUsersPipeline.run({
  query: 'john',
  role: 'user',
  limit: 20
})
```

## Error Handling and Retry

```typescript
const robustFetchPipeline = pipeline('robust-fetch')
  .input(schema(z.object({ endpoint: z.string() })))
  .fetch((input) => input.endpoint)
  .retry(3, 1000) // Retry 3 times with 1s delay
  .timeout(5000)  // 5 second timeout
  .validate(schema(z.object({
    data: z.unknown(),
    status: z.string()
  })))
  .map(response => {
    if (response.status !== 'success') {
      throw new Error(`API returned status: ${response.status}`)
    }
    return response.data
  })

// Usage with error handling
const result = await robustFetchPipeline.run({ 
  endpoint: '/api/unreliable-endpoint' 
})

if (result.tag === 'Err') {
  if (result.error.code === 'TIMEOUT_ERROR') {
    console.log('Request timed out')
  } else if (result.error.code === 'NETWORK_ERROR') {
    console.log('Network error occurred')
  } else {
    console.log('Other error:', result.error.message)
  }
}
```

## Parallel Data Fetching

```typescript
const getUserDataPipeline = pipeline('get-user-data')
  .input(schema(z.object({ userId: z.string() })))
  .parallel([
    // Fetch user profile
    pipeline('user-profile')
      .fetch('/api/users/:userId')
      .validate(UserSchema),
    
    // Fetch user posts
    pipeline('user-posts')
      .fetch('/api/users/:userId/posts')
      .validate(schema(z.array(z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        createdAt: z.string()
      })))),
    
    // Fetch user settings
    pipeline('user-settings')
      .fetch('/api/users/:userId/settings')
      .validate(schema(z.object({
        theme: z.string(),
        notifications: z.boolean(),
        privacy: z.string()
      })))
  ])
  .map(([profile, posts, settings]) => ({
    profile,
    posts,
    settings,
    summary: {
      totalPosts: posts.length,
      recentPostsCount: posts.filter(p => 
        new Date(p.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length
    }
  }))

// Usage
const userData = await getUserDataPipeline.run({ userId: 'user-123' })
```

## Caching Strategies

```typescript
// Cache user data for 5 minutes
const cachedUserPipeline = pipeline('cached-user')
  .input(schema(z.object({ id: z.number() })))
  .cache(300000) // 5 minutes in milliseconds
  .fetch('/api/users/:id')
  .validate(UserSchema)

// Cache static data for 1 hour
const cachedConfigPipeline = pipeline('cached-config')
  .cache(3600000) // 1 hour
  .fetch('/api/config')
  .validate(schema(z.object({
    features: z.array(z.string()),
    limits: z.object({
      maxUsers: z.number(),
      maxFiles: z.number()
    })
  })))

// No caching for user-specific dynamic data
const realTimeDataPipeline = pipeline('real-time-data')
  .input(schema(z.object({ userId: z.string() })))
  .fetch('/api/users/:userId/notifications')
  .validate(schema(z.array(z.object({
    id: z.string(),
    message: z.string(),
    timestamp: z.string(),
    read: z.boolean()
  }))))
```

## Authentication Headers

```typescript
const authenticatedPipeline = pipeline('authenticated-request')
  .input(schema(z.object({ 
    endpoint: z.string(),
    token: z.string()
  })))
  .fetch((input) => input.endpoint, (input) => ({
    headers: {
      'Authorization': `Bearer ${input.token}`,
      'Content-Type': 'application/json'
    }
  }))
  .validate(schema(z.unknown()))

// Usage
const result = await authenticatedPipeline.run({
  endpoint: '/api/protected-data',
  token: 'your-jwt-token'
})
```

## Conditional Requests

```typescript
const conditionalFetchPipeline = pipeline('conditional-fetch')
  .input(schema(z.object({
    userId: z.string(),
    includeDetails: z.boolean().default(false)
  })))
  .map(input => {
    const baseUrl = `/api/users/${input.userId}`
    return input.includeDetails 
      ? `${baseUrl}?include=posts,settings,activity`
      : baseUrl
  })
  .fetch((url) => url)
  .validate(schema(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    // Optional detailed fields
    posts: z.array(z.unknown()).optional(),
    settings: z.unknown().optional(),
    activity: z.array(z.unknown()).optional()
  })))

// Fetch basic user info
const basicUser = await conditionalFetchPipeline.run({ 
  userId: '123', 
  includeDetails: false 
})

// Fetch detailed user info
const detailedUser = await conditionalFetchPipeline.run({ 
  userId: '123', 
  includeDetails: true 
})
```

## Pagination

```typescript
const PaginationSchema = schema(z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
}))

const paginatedFetchPipeline = pipeline('paginated-fetch')
  .input(PaginationSchema)
  .map(params => `/api/items?page=${params.page}&limit=${params.limit}`)
  .fetch((url) => url)
  .validate(schema(z.object({
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string()
    })),
    pagination: z.object({
      currentPage: z.number(),
      totalPages: z.number(),
      totalItems: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    })
  })))

// Fetch all pages
async function fetchAllPages() {
  const allItems = []
  let currentPage = 1
  let hasMore = true
  
  while (hasMore) {
    const result = await paginatedFetchPipeline.run({ 
      page: currentPage, 
      limit: 50 
    })
    
    if (result.tag === 'Ok') {
      allItems.push(...result.value.items)
      hasMore = result.value.pagination.hasNext
      currentPage++
    } else {
      throw result.error
    }
  }
  
  return allItems
}
```

## Upload Files

```typescript
const uploadFilePipeline = pipeline('upload-file')
  .input(schema(z.object({
    file: z.instanceof(File),
    category: z.string().optional()
  })))
  .map(input => {
    const formData = new FormData()
    formData.append('file', input.file)
    if (input.category) {
      formData.append('category', input.category)
    }
    return formData
  })
  .fetch('/api/upload', (formData) => ({
    method: 'POST',
    body: formData
    // Don't set Content-Type header - browser will set it with boundary
  }))
  .validate(schema(z.object({
    fileId: z.string(),
    filename: z.string(),
    size: z.number(),
    url: z.string().url()
  })))
  .map(uploadResult => ({
    ...uploadResult,
    sizeInMB: (uploadResult.size / 1024 / 1024).toFixed(2)
  }))

// Usage with file input
const handleFileUpload = async (file: File) => {
  const result = await uploadFilePipeline.run({ 
    file, 
    category: 'documents' 
  })
  
  if (result.tag === 'Ok') {
    console.log(`File uploaded: ${result.value.filename} (${result.value.sizeInMB}MB)`)
    console.log(`Available at: ${result.value.url}`)
  }
}
```

## GraphQL Queries

```typescript
const graphqlPipeline = pipeline('graphql-query')
  .input(schema(z.object({
    query: z.string(),
    variables: z.record(z.unknown()).optional()
  })))
  .fetch('/graphql', (input) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: input.query,
      variables: input.variables || {}
    })
  }))
  .validate(schema(z.object({
    data: z.unknown().optional(),
    errors: z.array(z.object({
      message: z.string(),
      path: z.array(z.string()).optional()
    })).optional()
  })))
  .map(response => {
    if (response.errors) {
      throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`)
    }
    return response.data
  })

// Usage
const getUserQuery = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
      posts {
        id
        title
      }
    }
  }
`

const result = await graphqlPipeline.run({
  query: getUserQuery,
  variables: { id: '123' }
})
```

## Fallback Strategies

```typescript
const fallbackPipeline = pipeline('primary-fetch')
  .input(schema(z.object({ id: z.string() })))
  .fetch('/api/v2/users/:id')
  .validate(UserSchema)
  .fallback(
    // Fallback to v1 API if v2 fails
    pipeline('fallback-fetch')
      .fetch('/api/v1/users/:id')
      .validate(schema(z.object({
        id: z.string(),
        username: z.string(),
        email_address: z.string()
      })))
      .map(oldFormat => ({
        id: parseInt(oldFormat.id),
        name: oldFormat.username,
        email: oldFormat.email_address
      }))
  )

// Will try v2 API first, then v1 API if that fails
const result = await fallbackPipeline.run({ id: '123' })
```

## Best Practices

### 1. Always Validate API Responses

```typescript
// ✅ Good - validate the response
.validate(UserSchema)

// ❌ Bad - trust the API response
.map(response => response as User)
```

### 2. Use Appropriate Timeouts

```typescript
// ✅ Good - reasonable timeouts
const fastPipeline = pipeline('fast').timeout(2000)      // 2s for quick operations
const slowPipeline = pipeline('slow').timeout(30000)     // 30s for heavy operations

// ❌ Bad - no timeout (could hang forever)
const riskyPipeline = pipeline('risky').fetch('/api/data')
```

### 3. Implement Retry Logic for Transient Failures

```typescript
// ✅ Good - retry with backoff
.retry(3, 1000)

// ❌ Bad - fail immediately on any error
.fetch('/api/unreliable-endpoint')
```

### 4. Cache Appropriately

```typescript
// ✅ Good - cache based on data volatility
const staticData = pipeline('static').cache(3600000)     // 1 hour
const userProfile = pipeline('profile').cache(300000)    // 5 minutes
const notifications = pipeline('notifications')          // No cache

// ❌ Bad - cache everything the same way
const overCached = pipeline('bad').cache(3600000)        // Notifications cached 1 hour!
```

Data fetching pipelines provide robust, type-safe ways to interact with APIs while handling errors, retries, and caching automatically.