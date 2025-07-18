# SERVICE Pillar

The SERVICE pillar provides HTTP-only API operations with rich configuration support. It includes 5 core methods and 4 utilities for comprehensive API integration.

## Overview

The SERVICE pillar is designed for:
- **HTTP API integration** with modern configuration patterns
- **Request/response handling** with validation and transformation
- **Error handling** with structured error types
- **Performance optimization** with caching and retry mechanisms

## Core Methods

| Method | Description | Purpose |
|--------|-------------|---------|
| [`get()`](/api/service/methods#get) | HTTP GET requests | Fetch data from APIs |
| [`post()`](/api/service/methods#post) | HTTP POST requests | Create new resources |
| [`put()`](/api/service/methods#put) | HTTP PUT requests | Update/replace resources |
| [`patch()`](/api/service/methods#patch) | HTTP PATCH requests | Partial updates |
| [`delete()`](/api/service/methods#delete) | HTTP DELETE requests | Remove resources |

## Configuration Pattern

All SERVICE methods use configuration objects:

```typescript
const result = await service.get('/api/users', {
  timeout: 5000,
  retry: { attempts: 3, delay: 1000 },
  cache: { enabled: true, ttl: 300 },
  headers: { 'Authorization': 'Bearer token' },
  validate: UserArraySchema,
  transform: response => response.data
})
```

## Common Configuration Options

### Base Options

```typescript
interface BaseOptions {
  timeout?: number           // Request timeout in milliseconds
  headers?: Record<string, string>  // HTTP headers
  params?: Record<string, string>   // URL parameters
  validate?: Schema          // Response validation schema
  transform?: (data: any) => any    // Response transformation
}
```

### Retry Configuration

```typescript
interface RetryOptions {
  attempts: number          // Number of retry attempts
  delay?: number           // Delay between retries (ms)
  exponential?: boolean    // Use exponential backoff
  retryOn?: number[]       // HTTP status codes to retry on
}

// Usage
const result = await service.get('/api/data', {
  retry: {
    attempts: 3,
    delay: 1000,
    exponential: true,
    retryOn: [500, 502, 503, 504]
  }
})
```

### Cache Configuration

```typescript
interface CacheOptions {
  enabled: boolean         // Enable caching
  ttl?: number            // Time to live in seconds
  key?: string            // Custom cache key
  stale?: boolean         // Allow stale data
}

// Usage
const result = await service.get('/api/users', {
  cache: {
    enabled: true,
    ttl: 300,              // 5 minutes
    key: 'users-list',
    stale: true
  }
})
```

## Quick Examples

### Basic GET Request

```typescript
import { service, Result } from '@sanzoku-labs/kairo'

const users = await service.get('/api/users')

if (Result.isOk(users)) {
  console.log('Users:', users.value)
} else {
  console.error('Error:', users.error.message)
}
```

### POST with Validation

```typescript
import { service, data, Result } from '@sanzoku-labs/kairo'

const UserSchema = data.schema({
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 150 }
})

const result = await service.post('/api/users', {
  body: {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
  },
  validate: UserSchema,
  headers: {
    'Content-Type': 'application/json'
  }
})

Result.match(result, {
  Ok: user => console.log('User created:', user),
  Err: error => console.error('Creation failed:', error.message)
})
```

### PUT with Retry and Caching

```typescript
const result = await service.put('/api/users/123', {
  body: { name: 'Jane Doe', age: 25 },
  timeout: 10000,
  retry: { 
    attempts: 3, 
    delay: 1000, 
    exponential: true 
  },
  cache: { 
    enabled: true, 
    ttl: 300,
    key: 'user-123'
  },
  headers: {
    'Content-Type': 'application/json',
    'If-Match': '"etag-value"'
  }
})
```

### DELETE with Error Handling

```typescript
const result = await service.delete('/api/users/123', {
  timeout: 5000,
  retry: { attempts: 2 }
})

if (Result.isErr(result)) {
  // Handle specific error types
  switch (result.error.code) {
    case 'SERVICE_HTTP_ERROR':
      if (result.error.status === 404) {
        console.log('User not found')
      } else {
        console.error('HTTP error:', result.error.status)
      }
      break
    
    case 'SERVICE_NETWORK_ERROR':
      console.error('Network error:', result.error.message)
      break
    
    case 'SERVICE_TIMEOUT_ERROR':
      console.error('Request timeout')
      break
    
    default:
      console.error('Unknown error:', result.error.message)
  }
}
```

## Error Handling

The SERVICE pillar provides structured error handling with specific error types:

### ServiceError Types

```typescript
interface ServiceError {
  pillar: 'SERVICE'
  operation: string
  code: string
  message: string
  timestamp: number
  context: Record<string, unknown>
}

interface ServiceHttpError extends ServiceError {
  code: 'SERVICE_HTTP_ERROR'
  status: number
  statusText: string
  headers: Record<string, string>
  body?: unknown
}

interface ServiceNetworkError extends ServiceError {
  code: 'SERVICE_NETWORK_ERROR'
  cause: Error
}

interface ServiceTimeoutError extends ServiceError {
  code: 'SERVICE_TIMEOUT_ERROR'
  timeout: number
}
```

### Error Handling Patterns

```typescript
const handleServiceError = (error: ServiceError) => {
  switch (error.code) {
    case 'SERVICE_HTTP_ERROR':
      const httpError = error as ServiceHttpError
      console.error(`HTTP ${httpError.status}: ${httpError.statusText}`)
      break
      
    case 'SERVICE_NETWORK_ERROR':
      console.error('Network error:', error.message)
      break
      
    case 'SERVICE_TIMEOUT_ERROR':
      console.error('Request timeout after', error.timeout, 'ms')
      break
      
    default:
      console.error('Service error:', error.message)
  }
}

// Usage
const result = await service.get('/api/data')
if (Result.isErr(result)) {
  handleServiceError(result.error)
}
```

## Advanced Patterns

### Request Interceptors

```typescript
const apiClient = {
  baseUrl: 'https://api.example.com',
  
  request: async (method: string, url: string, options: any = {}) => {
    // Add authentication
    const headers = {
      'Authorization': `Bearer ${getAuthToken()}`,
      'X-Client-Version': '1.0.0',
      ...options.headers
    }
    
    // Add base URL
    const fullUrl = `${this.baseUrl}${url}`
    
    // Common configuration
    const config = {
      timeout: 10000,
      retry: { attempts: 3 },
      headers,
      ...options
    }
    
    return service[method](fullUrl, config)
  },
  
  get: (url: string, options?: any) => 
    this.request('get', url, options),
  
  post: (url: string, options?: any) => 
    this.request('post', url, options),
  
  put: (url: string, options?: any) => 
    this.request('put', url, options),
  
  patch: (url: string, options?: any) => 
    this.request('patch', url, options),
  
  delete: (url: string, options?: any) => 
    this.request('delete', url, options)
}
```

### Response Transformation

```typescript
const transformResponse = (response: any) => {
  // Extract data from wrapper
  if (response.data && response.status === 'success') {
    return response.data
  }
  
  // Handle different response formats
  if (response.result) {
    return response.result
  }
  
  return response
}

const result = await service.get('/api/users', {
  transform: transformResponse
})
```

### Conditional Requests

```typescript
const conditionalGet = async (url: string, etag?: string) => {
  const headers: Record<string, string> = {}
  
  if (etag) {
    headers['If-None-Match'] = etag
  }
  
  const result = await service.get(url, { headers })
  
  if (Result.isErr(result) && result.error.code === 'SERVICE_HTTP_ERROR') {
    const httpError = result.error as ServiceHttpError
    if (httpError.status === 304) {
      return Result.Ok({ cached: true })
    }
  }
  
  return result
}
```

## Performance Optimization

### Caching Strategy

```typescript
const cacheConfig = {
  // Short-term cache for frequently accessed data
  shortTerm: { enabled: true, ttl: 60 },
  
  // Medium-term cache for stable data
  mediumTerm: { enabled: true, ttl: 300 },
  
  // Long-term cache for static data
  longTerm: { enabled: true, ttl: 3600 }
}

// Usage
const users = await service.get('/api/users', {
  cache: cacheConfig.mediumTerm
})
```

### Parallel Requests

```typescript
const fetchUserData = async (userId: string) => {
  const [profile, posts, followers] = await Promise.all([
    service.get(`/api/users/${userId}`),
    service.get(`/api/users/${userId}/posts`),
    service.get(`/api/users/${userId}/followers`)
  ])
  
  // Handle results
  if (Result.isOk(profile) && Result.isOk(posts) && Result.isOk(followers)) {
    return {
      profile: profile.value,
      posts: posts.value,
      followers: followers.value
    }
  }
  
  // Handle errors appropriately
  // ...
}
```

## Best Practices

### 1. **Use Appropriate Timeouts**
```typescript
// Short timeout for health checks
const health = await service.get('/health', { timeout: 1000 })

// Longer timeout for heavy operations
const report = await service.get('/reports/heavy', { timeout: 30000 })
```

### 2. **Implement Retry Logic**
```typescript
const robustRequest = await service.get('/api/data', {
  retry: {
    attempts: 3,
    delay: 1000,
    exponential: true,
    retryOn: [500, 502, 503, 504] // Only retry on server errors
  }
})
```

### 3. **Validate Responses**
```typescript
const validatedResponse = await service.get('/api/users', {
  validate: data.schema({
    users: { type: 'array', items: UserSchema },
    total: { type: 'number' }
  })
})
```

### 4. **Use Configuration Objects**
```typescript
const config = {
  timeout: 10000,
  retry: { attempts: 3 },
  cache: { enabled: true, ttl: 300 },
  headers: { 'Authorization': 'Bearer token' }
}

// Reuse configuration
const users = await service.get('/api/users', config)
const posts = await service.get('/api/posts', config)
```

## Next Steps

- **[HTTP Methods](/api/service/methods)** - Detailed method documentation
- **[Configuration](/api/service/config)** - Advanced configuration options
- **[Utilities](/api/service/utils)** - Helper functions and utilities
- **[Examples](/examples/api-client)** - Real-world SERVICE patterns