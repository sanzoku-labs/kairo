# SERVICE HTTP Methods

The SERVICE pillar provides 5 HTTP methods for API operations: GET, POST, PUT, PATCH, and DELETE. All methods use configuration objects and return Result types.

## Method Signatures

```typescript
interface ServiceMethods {
  get<T>(url: string, options?: GetOptions): Promise<ServiceResult<T>>
  post<T>(url: string, options?: PostOptions): Promise<ServiceResult<T>>
  put<T>(url: string, options?: PutOptions): Promise<ServiceResult<T>>
  patch<T>(url: string, options?: PatchOptions): Promise<ServiceResult<T>>
  delete<T>(url: string, options?: DeleteOptions): Promise<ServiceResult<T>>
}

type ServiceResult<T> = Result<ServiceError, T>
```

## get

### `service.get<T>(url: string, options?: GetOptions): Promise<ServiceResult<T>>`

Performs HTTP GET requests for fetching data.

#### Basic Usage

```typescript
// Simple GET request
const result = await service.get('/api/users')

if (Result.isOk(result)) {
  console.log('Users:', result.value)
}
```

#### With Configuration

```typescript
const result = await service.get('/api/users', {
  timeout: 10000,
  retry: { attempts: 3, delay: 1000 },
  cache: { enabled: true, ttl: 300 },
  headers: {
    'Authorization': 'Bearer token',
    'Accept': 'application/json'
  },
  params: {
    page: '1',
    limit: '20',
    sort: 'name'
  }
})
```

#### With Validation

```typescript
const UserArraySchema = data.schema({
  users: {
    type: 'array',
    items: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' }
    }
  },
  total: { type: 'number' },
  page: { type: 'number' }
})

const result = await service.get('/api/users', {
  validate: UserArraySchema,
  transform: (response) => response.users
})
```

#### GetOptions Interface

```typescript
interface GetOptions extends BaseOptions {
  params?: Record<string, string>     // Query parameters
  cache?: CacheOptions               // Cache configuration
  validate?: Schema                  // Response validation
  transform?: (data: any) => any     // Response transformation
}
```

## post

### `service.post<T>(url: string, options?: PostOptions): Promise<ServiceResult<T>>`

Performs HTTP POST requests for creating resources.

#### Basic Usage

```typescript
const userData = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
}

const result = await service.post('/api/users', {
  body: userData
})

if (Result.isOk(result)) {
  console.log('Created user:', result.value)
}
```

#### With Validation

```typescript
const result = await service.post('/api/users', {
  body: userData,
  headers: {
    'Content-Type': 'application/json'
  },
  validate: UserSchema,
  timeout: 15000
})
```

#### File Upload

```typescript
const formData = new FormData()
formData.append('file', fileBlob)
formData.append('name', 'avatar.jpg')

const result = await service.post('/api/upload', {
  body: formData,
  headers: {
    'Authorization': 'Bearer token'
    // Don't set Content-Type for FormData
  },
  timeout: 30000
})
```

#### PostOptions Interface

```typescript
interface PostOptions extends BaseOptions {
  body?: any                        // Request body
  json?: boolean                    // Serialize body as JSON
  validate?: Schema                 // Response validation
  transform?: (data: any) => any    // Response transformation
}
```

## put

### `service.put<T>(url: string, options?: PutOptions): Promise<ServiceResult<T>>`

Performs HTTP PUT requests for updating/replacing resources.

#### Basic Usage

```typescript
const updatedUser = {
  id: '123',
  name: 'Jane Doe',
  email: 'jane@example.com',
  age: 28
}

const result = await service.put('/api/users/123', {
  body: updatedUser,
  headers: {
    'Content-Type': 'application/json'
  }
})
```

#### With Conditional Updates

```typescript
const result = await service.put('/api/users/123', {
  body: updatedUser,
  headers: {
    'Content-Type': 'application/json',
    'If-Match': '"etag-value"'  // Conditional update
  },
  validate: UserSchema
})
```

#### With Merge Option

```typescript
const result = await service.put('/api/users/123', {
  body: { name: 'Updated Name' },
  merge: true,  // Merge with existing data
  headers: {
    'Content-Type': 'application/json'
  }
})
```

#### PutOptions Interface

```typescript
interface PutOptions extends BaseOptions {
  body?: any                        // Request body
  json?: boolean                    // Serialize body as JSON
  merge?: boolean                   // Merge with existing data
  validate?: Schema                 // Response validation
  transform?: (data: any) => any    // Response transformation
}
```

## patch

### `service.patch<T>(url: string, options?: PatchOptions): Promise<ServiceResult<T>>`

Performs HTTP PATCH requests for partial updates.

#### Basic Usage

```typescript
const partialUpdate = {
  name: 'Updated Name',
  email: 'updated@example.com'
}

const result = await service.patch('/api/users/123', {
  body: partialUpdate,
  headers: {
    'Content-Type': 'application/json'
  }
})
```

#### JSON Patch

```typescript
const jsonPatch = [
  { op: 'replace', path: '/name', value: 'New Name' },
  { op: 'add', path: '/tags', value: ['important'] },
  { op: 'remove', path: '/temporary' }
]

const result = await service.patch('/api/users/123', {
  body: jsonPatch,
  headers: {
    'Content-Type': 'application/json-patch+json'
  }
})
```

#### PatchOptions Interface

```typescript
interface PatchOptions extends BaseOptions {
  body?: any                        // Request body (partial data)
  json?: boolean                    // Serialize body as JSON
  validate?: Schema                 // Response validation
  transform?: (data: any) => any    // Response transformation
}
```

## delete

### `service.delete<T>(url: string, options?: DeleteOptions): Promise<ServiceResult<T>>`

Performs HTTP DELETE requests for removing resources.

#### Basic Usage

```typescript
const result = await service.delete('/api/users/123')

if (Result.isOk(result)) {
  console.log('User deleted successfully')
}
```

#### With Confirmation

```typescript
const result = await service.delete('/api/users/123', {
  headers: {
    'Authorization': 'Bearer token',
    'X-Confirm-Delete': 'true'
  },
  timeout: 10000
})
```

#### Soft Delete

```typescript
const result = await service.delete('/api/users/123', {
  params: { soft: 'true' },
  validate: data.schema({
    deleted: { type: 'boolean' },
    deletedAt: { type: 'string', format: 'datetime' }
  })
})
```

#### DeleteOptions Interface

```typescript
interface DeleteOptions extends BaseOptions {
  params?: Record<string, string>   // Query parameters
  validate?: Schema                 // Response validation
  transform?: (data: any) => any    // Response transformation
}
```

## Common Configuration

### BaseOptions Interface

All methods extend from BaseOptions:

```typescript
interface BaseOptions {
  timeout?: number                  // Request timeout (ms)
  retry?: RetryOptions             // Retry configuration
  headers?: Record<string, string>  // HTTP headers
  signal?: AbortSignal             // Abort signal
  onProgress?: (progress: ProgressEvent) => void  // Progress callback
}
```

### Retry Configuration

```typescript
interface RetryOptions {
  attempts: number                 // Number of retry attempts
  delay?: number                   // Delay between retries (ms)
  exponential?: boolean            // Use exponential backoff
  maxDelay?: number               // Maximum delay (ms)
  retryOn?: number[]              // HTTP status codes to retry on
  retryCondition?: (error: ServiceError) => boolean  // Custom retry condition
}

// Usage
const result = await service.get('/api/users', {
  retry: {
    attempts: 3,
    delay: 1000,
    exponential: true,
    maxDelay: 10000,
    retryOn: [500, 502, 503, 504],
    retryCondition: (error) => {
      // Custom logic to determine if retry should happen
      return error.code === 'SERVICE_NETWORK_ERROR'
    }
  }
})
```

### Cache Configuration

```typescript
interface CacheOptions {
  enabled: boolean                 // Enable caching
  ttl?: number                    // Time to live (seconds)
  key?: string                    // Custom cache key
  stale?: boolean                 // Allow stale data
  revalidate?: boolean            // Revalidate in background
}

// Usage
const result = await service.get('/api/users', {
  cache: {
    enabled: true,
    ttl: 300,                    // 5 minutes
    key: 'users-list-v1',
    stale: true,
    revalidate: true
  }
})
```

## Advanced Usage Patterns

### Request Interceptors

```typescript
const apiClient = {
  baseUrl: 'https://api.example.com',
  defaultHeaders: {
    'Content-Type': 'application/json',
    'User-Agent': 'MyApp/1.0'
  },

  async request<T>(method: keyof ServiceMethods, url: string, options: any = {}): Promise<ServiceResult<T>> {
    // Add base URL
    const fullUrl = `${this.baseUrl}${url}`
    
    // Merge headers
    const headers = {
      ...this.defaultHeaders,
      ...options.headers
    }
    
    // Add authentication
    const token = await getAuthToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    
    // Add request ID
    headers['X-Request-ID'] = generateRequestId()
    
    const config = {
      ...options,
      headers,
      timeout: options.timeout || 10000
    }
    
    return service[method](fullUrl, config)
  },

  get<T>(url: string, options?: GetOptions) {
    return this.request<T>('get', url, options)
  },

  post<T>(url: string, options?: PostOptions) {
    return this.request<T>('post', url, options)
  },

  put<T>(url: string, options?: PutOptions) {
    return this.request<T>('put', url, options)
  },

  patch<T>(url: string, options?: PatchOptions) {
    return this.request<T>('patch', url, options)
  },

  delete<T>(url: string, options?: DeleteOptions) {
    return this.request<T>('delete', url, options)
  }
}
```

### Response Transformation

```typescript
// Transform API response format
const transformResponse = (response: any) => {
  // Handle different response formats
  if (response.data && response.status === 'success') {
    return response.data
  }
  
  if (response.result) {
    return response.result
  }
  
  return response
}

// Usage
const result = await service.get('/api/users', {
  transform: transformResponse
})
```

### Error Recovery

```typescript
const resilientGet = async <T>(url: string, options: GetOptions = {}): Promise<ServiceResult<T>> => {
  // Try primary endpoint
  const result = await service.get(url, options)
  
  if (Result.isOk(result)) {
    return result
  }
  
  // Try fallback endpoint
  const fallbackUrl = url.replace('/api/', '/api/v1/')
  const fallbackResult = await service.get(fallbackUrl, options)
  
  if (Result.isOk(fallbackResult)) {
    return fallbackResult
  }
  
  // Return cached data if available
  const cachedData = getFromCache(url)
  if (cachedData) {
    return Result.Ok(cachedData)
  }
  
  // Return original error
  return result
}
```

## Testing HTTP Methods

### Unit Tests

```typescript
describe('Service Methods', () => {
  it('should perform GET request', async () => {
    const result = await service.get('/api/users')
    
    expect(result).toHaveProperty('tag')
    expect(['Ok', 'Err']).toContain(result.tag)
    
    if (Result.isOk(result)) {
      expect(result.value).toBeDefined()
    }
  })
  
  it('should handle POST with body', async () => {
    const userData = { name: 'Test', email: 'test@example.com' }
    const result = await service.post('/api/users', { body: userData })
    
    if (Result.isOk(result)) {
      expect(result.value).toHaveProperty('id')
    }
  })
  
  it('should handle errors gracefully', async () => {
    const result = await service.get('/api/nonexistent')
    
    if (Result.isErr(result)) {
      expect(result.error).toHaveProperty('code')
      expect(result.error.code).toBe('SERVICE_HTTP_ERROR')
    }
  })
})
```

### Integration Tests

```typescript
describe('Service Integration', () => {
  it('should perform CRUD operations', async () => {
    // Create
    const createResult = await service.post('/api/users', {
      body: { name: 'Test User', email: 'test@example.com' }
    })
    
    expect(Result.isOk(createResult)).toBe(true)
    
    if (Result.isOk(createResult)) {
      const userId = createResult.value.id
      
      // Read
      const readResult = await service.get(`/api/users/${userId}`)
      expect(Result.isOk(readResult)).toBe(true)
      
      // Update
      const updateResult = await service.put(`/api/users/${userId}`, {
        body: { name: 'Updated User' }
      })
      expect(Result.isOk(updateResult)).toBe(true)
      
      // Delete
      const deleteResult = await service.delete(`/api/users/${userId}`)
      expect(Result.isOk(deleteResult)).toBe(true)
    }
  })
})
```

## Best Practices

1. **Use appropriate HTTP methods** - GET for reading, POST for creating, PUT/PATCH for updating, DELETE for removing
2. **Configure timeouts** - Set reasonable timeouts for different operations
3. **Handle errors explicitly** - Always check Result types
4. **Use validation** - Validate responses with schemas
5. **Implement retry logic** - For transient failures
6. **Add authentication** - Include proper authentication headers
7. **Use caching wisely** - Cache stable data, avoid caching dynamic data
8. **Transform responses** - Normalize API responses for consistency

## Next Steps

- **[Service Configuration](/api/service/config)** - Advanced configuration options
- **[Service Utilities](/api/service/utils)** - Helper functions and utilities
- **[Result Pattern](/api/result)** - Error handling with Results
- **[Schema System](/api/schema)** - Response validation with schemas