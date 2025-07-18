# Service Configuration

Advanced configuration options for the SERVICE pillar, including retry policies, caching strategies, and request/response handling.

## Configuration Overview

All SERVICE methods accept configuration objects with these common options:

```typescript
interface ServiceConfig {
  timeout?: number
  retry?: RetryOptions
  cache?: CacheOptions
  headers?: Record<string, string>
  params?: Record<string, string>
  validate?: Schema
  transform?: (data: any) => any
  signal?: AbortSignal
  onProgress?: (progress: ProgressEvent) => void
}
```

## Timeout Configuration

```typescript
// Simple timeout
await service.get('/api/users', { timeout: 5000 })

// Different timeouts for different operations
const timeouts = {
  read: 5000,
  write: 15000,
  upload: 60000
}

await service.get('/api/users', { timeout: timeouts.read })
await service.post('/api/users', { timeout: timeouts.write })
await service.post('/api/upload', { timeout: timeouts.upload })
```

## Retry Configuration

```typescript
interface RetryOptions {
  attempts: number
  delay?: number
  exponential?: boolean
  maxDelay?: number
  retryOn?: number[]
  retryCondition?: (error: ServiceError) => boolean
}

// Basic retry
await service.get('/api/users', {
  retry: { attempts: 3, delay: 1000 }
})

// Exponential backoff
await service.get('/api/users', {
  retry: {
    attempts: 5,
    delay: 1000,
    exponential: true,
    maxDelay: 30000
  }
})

// Custom retry conditions
await service.get('/api/users', {
  retry: {
    attempts: 3,
    retryCondition: (error) => {
      // Only retry on network errors and 5xx status codes
      return error.code === 'SERVICE_NETWORK_ERROR' || 
             (error.code === 'SERVICE_HTTP_ERROR' && error.status >= 500)
    }
  }
})
```

## Cache Configuration

```typescript
interface CacheOptions {
  enabled: boolean
  ttl?: number
  key?: string
  stale?: boolean
  revalidate?: boolean
}

// Basic caching
await service.get('/api/users', {
  cache: { enabled: true, ttl: 300 }
})

// Custom cache key
await service.get('/api/users', {
  cache: {
    enabled: true,
    ttl: 300,
    key: 'users-list-v2'
  }
})

// Stale-while-revalidate
await service.get('/api/users', {
  cache: {
    enabled: true,
    ttl: 300,
    stale: true,
    revalidate: true
  }
})
```

## Headers Configuration

```typescript
// Static headers
await service.get('/api/users', {
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json',
    'X-Client-Version': '1.0.0'
  }
})

// Dynamic headers
const getHeaders = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'X-Request-ID': generateRequestId(),
  'X-Timestamp': Date.now().toString()
})

await service.get('/api/users', {
  headers: getHeaders()
})
```

## Validation Configuration

```typescript
// Response validation
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string' },
  email: { type: 'string', format: 'email' }
})

await service.get('/api/users', {
  validate: data.schema({
    users: { type: 'array', items: UserSchema },
    total: { type: 'number' }
  })
})
```

## Transform Configuration

```typescript
// Response transformation
await service.get('/api/users', {
  transform: (response) => {
    // Extract data from wrapper
    if (response.data) {
      return response.data
    }
    return response
  }
})

// Complex transformation
await service.get('/api/users', {
  transform: (response) => {
    return {
      users: response.data.users.map(user => ({
        ...user,
        displayName: user.name.toUpperCase(),
        isActive: user.status === 'active'
      })),
      metadata: {
        total: response.data.total,
        page: response.data.page,
        fetchedAt: Date.now()
      }
    }
  }
})
```

## Advanced Configuration Examples

### Environment-Based Configuration

```typescript
const createConfig = (env: 'dev' | 'staging' | 'prod') => {
  const configs = {
    dev: {
      timeout: 30000,
      retry: { attempts: 1 },
      headers: { 'X-Environment': 'development' }
    },
    staging: {
      timeout: 10000,
      retry: { attempts: 2 },
      headers: { 'X-Environment': 'staging' }
    },
    prod: {
      timeout: 5000,
      retry: { attempts: 3, exponential: true },
      headers: { 'X-Environment': 'production' }
    }
  }
  
  return configs[env]
}

const config = createConfig(process.env.NODE_ENV)
await service.get('/api/users', config)
```

### Configuration Composition

```typescript
const baseConfig = {
  timeout: 10000,
  retry: { attempts: 3 },
  headers: { 'User-Agent': 'MyApp/1.0' }
}

const authConfig = {
  headers: { 'Authorization': `Bearer ${token}` }
}

const cacheConfig = {
  cache: { enabled: true, ttl: 300 }
}

// Merge configurations
const finalConfig = {
  ...baseConfig,
  ...authConfig,
  ...cacheConfig,
  headers: {
    ...baseConfig.headers,
    ...authConfig.headers
  }
}

await service.get('/api/users', finalConfig)
```

### Dynamic Configuration

```typescript
const createDynamicConfig = (operation: string, userId?: string) => {
  const config = {
    timeout: 5000,
    headers: {
      'X-Operation': operation,
      'X-Timestamp': Date.now().toString()
    }
  }
  
  if (userId) {
    config.headers['X-User-ID'] = userId
  }
  
  // Adjust timeout based on operation
  if (operation === 'upload') {
    config.timeout = 60000
  }
  
  return config
}

await service.get('/api/users', createDynamicConfig('list-users'))
await service.post('/api/upload', createDynamicConfig('upload', userId))
```

## Best Practices

1. **Use appropriate timeouts** - Balance responsiveness with reliability
2. **Implement retry logic** - Handle transient failures gracefully
3. **Cache strategically** - Cache stable data, avoid caching dynamic data
4. **Validate responses** - Ensure data integrity with schemas
5. **Transform consistently** - Normalize API responses
6. **Configure by environment** - Different settings for dev/staging/prod
7. **Compose configurations** - Reuse common settings across requests

## Next Steps

- **[Service Utilities](/api/service/utils)** - Helper functions and utilities
- **[Service Methods](/api/service/methods)** - HTTP method documentation
- **[Result Pattern](/api/result)** - Error handling with Results
- **[Schema System](/api/schema)** - Response validation with schemas