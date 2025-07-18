# Service Utilities

Helper functions and utilities for the SERVICE pillar to enhance HTTP operations and request handling.

## URL Utilities

### `service.buildUrl(base: string, path: string, params?: Record<string, string>): string`

Constructs URLs with proper path joining and query parameter encoding.

```typescript
// Basic URL building
const url = service.buildUrl('https://api.example.com', '/users')
// Result: 'https://api.example.com/users'

// With path parameters
const url = service.buildUrl('https://api.example.com', '/users/123/posts')
// Result: 'https://api.example.com/users/123/posts'

// With query parameters
const url = service.buildUrl('https://api.example.com', '/users', {
  page: '1',
  limit: '20',
  sort: 'name'
})
// Result: 'https://api.example.com/users?page=1&limit=20&sort=name'
```

### `service.parseUrl(url: string): ParsedUrl`

Parses URLs into components for manipulation.

```typescript
const parsed = service.parseUrl('https://api.example.com/users?page=1&limit=20')
// Result: {
//   protocol: 'https:',
//   host: 'api.example.com',
//   pathname: '/users',
//   search: '?page=1&limit=20',
//   params: { page: '1', limit: '20' }
// }
```

## Header Utilities

### `service.mergeHeaders(base: Record<string, string>, additional: Record<string, string>): Record<string, string>`

Merges header objects with proper conflict resolution.

```typescript
const baseHeaders = {
  'Content-Type': 'application/json',
  'User-Agent': 'MyApp/1.0'
}

const authHeaders = {
  'Authorization': 'Bearer token',
  'X-Client-Version': '1.0.0'
}

const merged = service.mergeHeaders(baseHeaders, authHeaders)
// Result: {
//   'Content-Type': 'application/json',
//   'User-Agent': 'MyApp/1.0',
//   'Authorization': 'Bearer token',
//   'X-Client-Version': '1.0.0'
// }
```

### `service.normalizeHeaders(headers: Record<string, string>): Record<string, string>`

Normalizes header names to lowercase for consistency.

```typescript
const headers = {
  'Content-Type': 'application/json',
  'AUTHORIZATION': 'Bearer token',
  'x-client-version': '1.0.0'
}

const normalized = service.normalizeHeaders(headers)
// Result: {
//   'content-type': 'application/json',
//   'authorization': 'Bearer token',
//   'x-client-version': '1.0.0'
// }
```

## Response Utilities

### `service.parseResponse<T>(response: Response, schema?: Schema): Result<ServiceError, T>`

Parses HTTP responses with optional validation.

```typescript
// Parse JSON response
const result = service.parseResponse(response)

// Parse with validation
const result = service.parseResponse(response, UserSchema)

// Handle different content types
const result = service.parseResponse(response, {
  contentType: 'text/plain'
})
```

### `service.extractData(response: any, path?: string): any`

Extracts data from nested response objects.

```typescript
const response = {
  data: {
    users: [{ id: 1, name: 'John' }],
    meta: { total: 1 }
  },
  status: 'success'
}

const users = service.extractData(response, 'data.users')
// Result: [{ id: 1, name: 'John' }]

const total = service.extractData(response, 'data.meta.total')
// Result: 1
```

## Request Utilities

### `service.createRetryPolicy(options: RetryOptions): RetryPolicy`

Creates retry policies for request handling.

```typescript
const retryPolicy = service.createRetryPolicy({
  attempts: 3,
  delay: 1000,
  exponential: true,
  maxDelay: 10000,
  retryOn: [500, 502, 503, 504]
})

// Use with requests
await service.get('/api/users', { retry: retryPolicy })
```

### `service.createCache(options: CacheOptions): Cache`

Creates cache instances for request caching.

```typescript
const cache = service.createCache({
  ttl: 300,
  maxSize: 100
})

// Use with requests
await service.get('/api/users', { cache })
```

## Authentication Utilities

### `service.createAuthHandler(type: AuthType, credentials: any): AuthHandler`

Creates authentication handlers for different auth types.

```typescript
// Bearer token auth
const bearerAuth = service.createAuthHandler('bearer', {
  token: 'your-token-here'
})

// Basic auth
const basicAuth = service.createAuthHandler('basic', {
  username: 'user',
  password: 'pass'
})

// API key auth
const apiKeyAuth = service.createAuthHandler('apikey', {
  key: 'your-api-key',
  header: 'X-API-Key'
})

// Use with requests
await service.get('/api/users', {
  auth: bearerAuth
})
```

### `service.refreshToken(refreshToken: string): Promise<Result<ServiceError, TokenInfo>>`

Handles token refresh for authentication.

```typescript
const result = await service.refreshToken('refresh-token')

if (Result.isOk(result)) {
  const { accessToken, expiresIn } = result.value
  // Update stored token
  updateAuthToken(accessToken)
}
```

## Error Utilities

### `service.createErrorHandler(options: ErrorHandlerOptions): ErrorHandler`

Creates custom error handlers for different error types.

```typescript
const errorHandler = service.createErrorHandler({
  onHttpError: (error) => {
    if (error.status === 401) {
      redirectToLogin()
    }
  },
  onNetworkError: (error) => {
    showOfflineMessage()
  },
  onTimeoutError: (error) => {
    showTimeoutMessage()
  }
})

// Use with requests
await service.get('/api/users', {
  errorHandler
})
```

### `service.mapError(error: ServiceError, mapping: ErrorMapping): ServiceError`

Maps service errors to user-friendly messages.

```typescript
const errorMapping = {
  'SERVICE_HTTP_ERROR': (error) => {
    if (error.status === 404) {
      return 'Resource not found'
    }
    if (error.status >= 500) {
      return 'Server error occurred'
    }
    return 'Request failed'
  },
  'SERVICE_NETWORK_ERROR': () => 'Network connection failed',
  'SERVICE_TIMEOUT_ERROR': () => 'Request timed out'
}

const mappedError = service.mapError(originalError, errorMapping)
```

## Progress Utilities

### `service.createProgressHandler(options: ProgressOptions): ProgressHandler`

Creates progress handlers for upload/download operations.

```typescript
const progressHandler = service.createProgressHandler({
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percentage}%`)
    updateProgressBar(progress.percentage)
  },
  onComplete: () => {
    console.log('Operation completed')
    hideProgressBar()
  }
})

// Use with requests
await service.post('/api/upload', {
  body: formData,
  onProgress: progressHandler
})
```

## Interceptor Utilities

### `service.createRequestInterceptor(fn: RequestInterceptorFn): RequestInterceptor`

Creates request interceptors for modifying requests.

```typescript
const requestInterceptor = service.createRequestInterceptor((config) => {
  // Add timestamp
  config.headers['X-Timestamp'] = Date.now().toString()
  
  // Add request ID
  config.headers['X-Request-ID'] = generateId()
  
  return config
})

// Use with requests
await service.get('/api/users', {
  interceptors: [requestInterceptor]
})
```

### `service.createResponseInterceptor(fn: ResponseInterceptorFn): ResponseInterceptor`

Creates response interceptors for modifying responses.

```typescript
const responseInterceptor = service.createResponseInterceptor((response) => {
  // Log response time
  console.log(`Response time: ${response.headers['X-Response-Time']}`)
  
  // Transform response
  if (response.data && response.data.result) {
    response.data = response.data.result
  }
  
  return response
})

// Use with requests
await service.get('/api/users', {
  interceptors: [responseInterceptor]
})
```

## Validation Utilities

### `service.createValidator(schema: Schema): Validator`

Creates reusable validators for request/response validation.

```typescript
const userValidator = service.createValidator(UserSchema)

// Use with requests
await service.get('/api/users', {
  validate: userValidator
})

// Use manually
const result = userValidator.validate(userData)
```

### `service.validateResponse<T>(response: any, schema: Schema): Result<ValidationError, T>`

Validates responses against schemas.

```typescript
const result = service.validateResponse(responseData, UserSchema)

if (Result.isOk(result)) {
  // Response is valid
  const user = result.value
} else {
  // Validation failed
  console.error('Validation error:', result.error)
}
```

## Advanced Utilities

### Circuit Breaker

```typescript
const circuitBreaker = service.createCircuitBreaker({
  threshold: 5,
  timeout: 60000,
  resetTimeout: 120000
})

await service.get('/api/users', {
  circuitBreaker
})
```

### Rate Limiter

```typescript
const rateLimiter = service.createRateLimiter({
  maxRequests: 100,
  windowMs: 60000
})

await service.get('/api/users', {
  rateLimiter
})
```

### Request Deduplication

```typescript
const deduplicator = service.createDeduplicator({
  keyGenerator: (config) => `${config.method}:${config.url}`,
  windowMs: 5000
})

await service.get('/api/users', {
  deduplicator
})
```

## Testing Utilities

### Mock Service

```typescript
const mockService = service.createMock({
  '/api/users': {
    get: () => Result.Ok([{ id: 1, name: 'John' }]),
    post: (data) => Result.Ok({ ...data, id: 2 })
  }
})

// Use in tests
const result = await mockService.get('/api/users')
```

### Request Recorder

```typescript
const recorder = service.createRecorder()

// Record requests
await service.get('/api/users', { recorder })

// Get recorded requests
const requests = recorder.getRequests()
```

## Performance Utilities

### Request Batching

```typescript
const batcher = service.createBatcher({
  maxBatchSize: 10,
  maxWaitTime: 100
})

// Batch multiple requests
const results = await batcher.batch([
  () => service.get('/api/users/1'),
  () => service.get('/api/users/2'),
  () => service.get('/api/users/3')
])
```

### Connection Pooling

```typescript
const pool = service.createPool({
  maxConnections: 10,
  keepAlive: true
})

await service.get('/api/users', { pool })
```

## Best Practices

1. **Use URL utilities** - For consistent URL construction
2. **Normalize headers** - Ensure consistent header handling
3. **Implement error mapping** - Provide user-friendly error messages
4. **Use interceptors** - For cross-cutting concerns
5. **Validate responses** - Ensure data integrity
6. **Handle progress** - For long-running operations
7. **Cache strategically** - Improve performance with caching
8. **Test thoroughly** - Use testing utilities for comprehensive coverage

## Next Steps

- **[Service Methods](/api/service/methods)** - HTTP method documentation
- **[Service Configuration](/api/service/config)** - Advanced configuration options
- **[Result Pattern](/api/result)** - Error handling with Results
- **[Examples](/examples/api-client)** - Real-world service usage patterns