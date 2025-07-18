# Error Handling

Kairo provides comprehensive error handling through the Result pattern and structured error types. This guide covers best practices for handling errors across all three pillars.

## Error Philosophy

Kairo's error handling is built on these principles:

1. **Explicit over Implicit** - All errors are visible in function signatures
2. **Structured over Strings** - Errors contain rich, structured information
3. **Composable over Brittle** - Errors can be transformed and combined
4. **Recoverable over Fatal** - Provide mechanisms for error recovery

## Error Types

### Base Error Interface

All Kairo errors implement the base `KairoError` interface:

```typescript
interface KairoError {
  code: string
  message: string
  timestamp: number
  context: Record<string, unknown>
  pillar: 'SERVICE' | 'DATA' | 'PIPELINE'
}
```

### SERVICE Errors

```typescript
interface ServiceError extends KairoError {
  pillar: 'SERVICE'
  operation: string
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

### DATA Errors

```typescript
interface DataError extends KairoError {
  pillar: 'DATA'
  operation: string
}

interface DataValidationError extends DataError {
  code: 'DATA_VALIDATION_ERROR'
  field: string
  value: unknown
  constraint: string
}

interface DataTransformError extends DataError {
  code: 'DATA_TRANSFORM_ERROR'
  step: string
  input: unknown
}

interface DataSchemaError extends DataError {
  code: 'DATA_SCHEMA_ERROR'
  schemaPath: string
  invalidValue: unknown
}
```

### PIPELINE Errors

```typescript
interface PipelineError extends KairoError {
  pillar: 'PIPELINE'
  operation: string
}

interface PipelineValidationError extends PipelineError {
  code: 'PIPELINE_VALIDATION_ERROR'
  step: number
  input: unknown
}

interface PipelineCompositionError extends PipelineError {
  code: 'PIPELINE_COMPOSITION_ERROR'
  step: number
  cause: Error
}
```

## Error Handling Patterns

### Basic Error Handling

```typescript
const handleBasicError = async () => {
  const result = await service.get('/api/users')
  
  if (Result.isOk(result)) {
    console.log('Success:', result.value)
  } else {
    console.error('Error:', result.error.message)
  }
}
```

### Specific Error Type Handling

```typescript
const handleSpecificErrors = async () => {
  const result = await service.get('/api/users')
  
  if (Result.isErr(result)) {
    switch (result.error.code) {
      case 'SERVICE_HTTP_ERROR':
        const httpError = result.error as ServiceHttpError
        console.error(`HTTP ${httpError.status}: ${httpError.statusText}`)
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
}
```

### Pattern Matching

```typescript
const handleWithPatternMatching = async () => {
  const result = await service.get('/api/users')
  
  return Result.match(result, {
    Ok: users => {
      console.log(`Found ${users.length} users`)
      return users
    },
    Err: error => {
      console.error(`Failed to fetch users: ${error.message}`)
      return []
    }
  })
}
```

## Error Recovery Strategies

### Retry with Exponential Backoff

```typescript
const retryWithBackoff = async (
  operation: () => Promise<Result<any, any>>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<Result<any, any>> => {
  let attempt = 0
  
  while (attempt < maxAttempts) {
    const result = await operation()
    
    if (Result.isOk(result)) {
      return result
    }
    
    attempt++
    
    if (attempt < maxAttempts) {
      const delay = baseDelay * Math.pow(2, attempt - 1)
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return Result.Err({
    code: 'MAX_RETRIES_EXCEEDED',
    message: `Failed after ${maxAttempts} attempts`,
    timestamp: Date.now(),
    context: { maxAttempts },
    pillar: 'SERVICE'
  })
}

// Usage
const result = await retryWithBackoff(() => service.get('/api/users'))
```

### Fallback Chain

```typescript
const fetchWithFallbacks = async (primaryUrl: string, fallbackUrls: string[]) => {
  // Try primary URL
  const primaryResult = await service.get(primaryUrl)
  if (Result.isOk(primaryResult)) {
    return primaryResult
  }
  
  console.log('Primary URL failed, trying fallbacks...')
  
  // Try fallback URLs
  for (const url of fallbackUrls) {
    const fallbackResult = await service.get(url)
    if (Result.isOk(fallbackResult)) {
      return fallbackResult
    }
  }
  
  // All failed, return cached data if available
  const cachedData = getCachedData()
  if (cachedData) {
    return Result.Ok(cachedData)
  }
  
  // No fallbacks available
  return Result.Err({
    code: 'ALL_SOURCES_FAILED',
    message: 'Primary and all fallback sources failed',
    timestamp: Date.now(),
    context: { primaryUrl, fallbackUrls },
    pillar: 'SERVICE'
  })
}
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}
  
  async execute<T>(operation: () => Promise<Result<any, T>>): Promise<Result<any, T>> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN'
      } else {
        return Result.Err({
          code: 'CIRCUIT_BREAKER_OPEN',
          message: 'Circuit breaker is open',
          timestamp: Date.now(),
          context: { state: this.state },
          pillar: 'SERVICE'
        })
      }
    }
    
    const result = await operation()
    
    if (Result.isOk(result)) {
      this.onSuccess()
    } else {
      this.onFailure()
    }
    
    return result
  }
  
  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }
  
  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN'
    }
  }
}

// Usage
const breaker = new CircuitBreaker(5, 60000)
const result = await breaker.execute(() => service.get('/api/users'))
```

## Error Transformation

### Error Enhancement

```typescript
const enhanceError = (error: KairoError, context: Record<string, unknown>) => {
  return {
    ...error,
    context: { ...error.context, ...context },
    timestamp: Date.now(),
    enhanced: true
  }
}

// Usage
const fetchUserWithContext = async (userId: string) => {
  const result = await service.get(`/api/users/${userId}`)
  
  if (Result.isErr(result)) {
    const enhanced = enhanceError(result.error, {
      userId,
      operation: 'fetchUser',
      userAgent: navigator.userAgent
    })
    
    return Result.Err(enhanced)
  }
  
  return result
}
```

### Error Mapping

```typescript
const mapServiceErrorToUserError = (error: ServiceError): UserFriendlyError => {
  switch (error.code) {
    case 'SERVICE_HTTP_ERROR':
      const httpError = error as ServiceHttpError
      if (httpError.status === 404) {
        return {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
          userMessage: 'Sorry, we couldn\'t find what you\'re looking for.'
        }
      }
      if (httpError.status >= 500) {
        return {
          code: 'SERVER_ERROR',
          message: 'Internal server error',
          userMessage: 'Something went wrong on our end. Please try again later.'
        }
      }
      break
      
    case 'SERVICE_NETWORK_ERROR':
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        userMessage: 'Please check your internet connection and try again.'
      }
      
    case 'SERVICE_TIMEOUT_ERROR':
      return {
        code: 'TIMEOUT',
        message: 'Request timeout',
        userMessage: 'This is taking longer than expected. Please try again.'
      }
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message,
    userMessage: 'An unexpected error occurred. Please try again.'
  }
}
```

## Error Logging and Monitoring

### Structured Logging

```typescript
interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  error?: KairoError
  context?: Record<string, unknown>
  timestamp: number
}

const logger = {
  error: (message: string, error?: KairoError, context?: Record<string, unknown>) => {
    const entry: LogEntry = {
      level: 'error',
      message,
      error,
      context,
      timestamp: Date.now()
    }
    
    // Send to logging service
    console.error(JSON.stringify(entry))
    
    // Send to monitoring service
    if (error) {
      sendToMonitoring(error)
    }
  }
}

// Usage
const result = await service.get('/api/users')
if (Result.isErr(result)) {
  logger.error('Failed to fetch users', result.error, {
    operation: 'fetchUsers',
    userId: currentUserId
  })
}
```

### Error Metrics

```typescript
class ErrorMetrics {
  private counters = new Map<string, number>()
  
  increment(errorCode: string, labels: Record<string, string> = {}) {
    const key = `${errorCode}:${JSON.stringify(labels)}`
    const current = this.counters.get(key) || 0
    this.counters.set(key, current + 1)
  }
  
  getMetrics() {
    const metrics = []
    for (const [key, count] of this.counters) {
      const [errorCode, labelsStr] = key.split(':')
      const labels = JSON.parse(labelsStr)
      metrics.push({ errorCode, count, labels })
    }
    return metrics
  }
}

const metrics = new ErrorMetrics()

// Usage
const result = await service.get('/api/users')
if (Result.isErr(result)) {
  metrics.increment(result.error.code, {
    pillar: result.error.pillar,
    operation: result.error.operation
  })
}
```

## Error Handling in Pipelines

### Pipeline Error Propagation

```typescript
const robustPipeline = pipeline.compose([
  // Step 1: Validate input
  (data) => {
    const result = pipeline.validate(data, InputSchema)
    if (Result.isErr(result)) {
      logger.error('Input validation failed', result.error)
      return result
    }
    return result
  },
  
  // Step 2: Transform data
  (result) => {
    if (Result.isErr(result)) return result
    
    const transformed = pipeline.map(result.value, transformItem)
    if (Result.isErr(transformed)) {
      logger.error('Data transformation failed', transformed.error)
      return transformed
    }
    return transformed
  },
  
  // Step 3: Filter data
  (result) => {
    if (Result.isErr(result)) return result
    
    const filtered = pipeline.filter(result.value, filterItem)
    if (Result.isErr(filtered)) {
      logger.error('Data filtering failed', filtered.error)
      return filtered
    }
    return filtered
  }
])
```

### Pipeline Error Recovery

```typescript
const resilientPipeline = pipeline.compose([
  // Step 1: Validate with fallback
  (data) => {
    const result = pipeline.validate(data, InputSchema)
    if (Result.isErr(result)) {
      logger.warn('Input validation failed, using defaults', result.error)
      return Result.Ok(getDefaultData())
    }
    return result
  },
  
  // Step 2: Transform with error handling
  (result) => {
    if (Result.isErr(result)) return result
    
    const transformed = pipeline.map(result.value, item => {
      try {
        return transformItem(item)
      } catch (error) {
        logger.warn('Item transformation failed, skipping', error)
        return null
      }
    })
    
    if (Result.isOk(transformed)) {
      // Filter out null values
      const filtered = transformed.value.filter(item => item !== null)
      return Result.Ok(filtered)
    }
    
    return transformed
  }
])
```

## Testing Error Handling

### Unit Tests

```typescript
describe('Error Handling', () => {
  it('should handle SERVICE_HTTP_ERROR correctly', async () => {
    // Mock a 404 response
    const mockError: ServiceHttpError = {
      code: 'SERVICE_HTTP_ERROR',
      message: 'Not Found',
      status: 404,
      statusText: 'Not Found',
      headers: {},
      timestamp: Date.now(),
      context: {},
      pillar: 'SERVICE',
      operation: 'get'
    }
    
    const result = Result.Err(mockError)
    
    const userError = mapServiceErrorToUserError(result.error)
    expect(userError.code).toBe('NOT_FOUND')
    expect(userError.userMessage).toContain('couldn\'t find')
  })
  
  it('should retry on failure', async () => {
    let attemptCount = 0
    const mockOperation = () => {
      attemptCount++
      if (attemptCount < 3) {
        return Promise.resolve(Result.Err({
          code: 'SERVICE_NETWORK_ERROR',
          message: 'Network failed'
        }))
      }
      return Promise.resolve(Result.Ok('success'))
    }
    
    const result = await retryWithBackoff(mockOperation, 3, 100)
    
    expect(Result.isOk(result)).toBe(true)
    expect(attemptCount).toBe(3)
  })
})
```

### Integration Tests

```typescript
describe('Error Handling Integration', () => {
  it('should handle end-to-end error flow', async () => {
    // Mock failing service
    const failingService = {
      get: () => Promise.resolve(Result.Err({
        code: 'SERVICE_TIMEOUT_ERROR',
        message: 'Request timeout',
        timeout: 5000
      }))
    }
    
    // Test error handling
    const result = await fetchWithFallbacks('/api/users', ['/api/backup'])
    
    expect(Result.isErr(result)).toBe(true)
    if (Result.isErr(result)) {
      expect(result.error.code).toBe('ALL_SOURCES_FAILED')
    }
  })
})
```

## Best Practices

### 1. **Always Handle Errors Explicitly**

```typescript
// ✅ Good
const result = await service.get('/api/users')
if (Result.isErr(result)) {
  handleError(result.error)
  return
}
processUsers(result.value)

// ❌ Bad
const result = await service.get('/api/users')
processUsers(result.value) // Might crash if error!
```

### 2. **Provide Contextual Error Information**

```typescript
// ✅ Good
const fetchUserProfile = async (userId: string) => {
  const result = await service.get(`/api/users/${userId}`)
  if (Result.isErr(result)) {
    return Result.Err({
      ...result.error,
      context: {
        ...result.error.context,
        userId,
        operation: 'fetchUserProfile'
      }
    })
  }
  return result
}

// ❌ Missing context
const fetchUserProfile = async (userId: string) => {
  return service.get(`/api/users/${userId}`)
}
```

### 3. **Use Appropriate Error Recovery**

```typescript
// ✅ Good - graceful degradation
const fetchUserData = async (userId: string) => {
  const result = await service.get(`/api/users/${userId}`)
  if (Result.isErr(result)) {
    logger.warn('Failed to fetch user data, using cached', result.error)
    return getCachedUserData(userId)
  }
  return result.value
}

// ❌ Bad - failing fast without recovery
const fetchUserData = async (userId: string) => {
  const result = await service.get(`/api/users/${userId}`)
  if (Result.isErr(result)) {
    throw new Error('Failed to fetch user')
  }
  return result.value
}
```

### 4. **Log Errors Appropriately**

```typescript
// ✅ Good - structured logging
const result = await service.get('/api/users')
if (Result.isErr(result)) {
  logger.error('API request failed', {
    error: result.error,
    url: '/api/users',
    timestamp: Date.now(),
    userId: currentUser.id
  })
}

// ❌ Bad - minimal logging
const result = await service.get('/api/users')
if (Result.isErr(result)) {
  console.error('Error:', result.error.message)
}
```

## Common Error Scenarios

### Network Failures

```typescript
const handleNetworkFailure = async (url: string) => {
  const result = await service.get(url, {
    timeout: 5000,
    retry: { attempts: 3, delay: 1000 }
  })
  
  if (Result.isErr(result)) {
    if (result.error.code === 'SERVICE_NETWORK_ERROR') {
      // Show offline message
      showOfflineMessage()
      // Try to use cached data
      return getCachedData(url)
    }
  }
  
  return result
}
```

### Validation Errors

```typescript
const handleValidationError = (error: DataValidationError) => {
  // Show field-specific error messages
  const fieldErrors = new Map<string, string>()
  
  fieldErrors.set(error.field, error.message)
  
  // Update UI to show errors
  updateFieldErrors(fieldErrors)
  
  // Log for debugging
  logger.warn('Validation failed', {
    field: error.field,
    value: error.value,
    constraint: error.constraint
  })
}
```

### Rate Limiting

```typescript
const handleRateLimit = async (operation: () => Promise<Result<any, any>>) => {
  const result = await operation()
  
  if (Result.isErr(result)) {
    const error = result.error as ServiceHttpError
    if (error.status === 429) {
      const retryAfter = error.headers['retry-after']
      if (retryAfter) {
        const delay = parseInt(retryAfter) * 1000
        console.log(`Rate limited, retrying after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return operation()
      }
    }
  }
  
  return result
}
```

## Next Steps

- **[Configuration Objects](/guide/configuration)** - Advanced configuration patterns
- **[Result Pattern](/guide/result-pattern)** - Deep dive into Result usage
- **[API Reference](/api/)** - Complete error type documentation
- **[Examples](/examples/)** - Real-world error handling patterns