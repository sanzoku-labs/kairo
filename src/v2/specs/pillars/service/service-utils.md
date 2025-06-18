# SERVICE Pillar - Function Utils Specification

> **Utility functions for SERVICE pillar method composition and convenience**

## Overview

SERVICE function utils provide convenience functions that can be used within SERVICE methods or independently for HTTP-related operations. These utilities follow the four-layer architecture:

1. **Core Methods** (5) - `get()`, `post()`, `put()`, `patch()`, `delete()`
2. **Configuration Objects** - Rich options for all methods
3. **Public Utilities** (4) - Exposed helper functions for common tasks
4. **Internal Utilities** - Private functions used by methods

## Public Utilities

### **URL Construction**

#### **`service.buildURL()`**
```typescript
service.buildURL(
  base: string,
  path?: string,
  params?: Record<string, unknown>
): string
```

**Purpose**: Build URLs with query parameters
**Usage**: Within service methods and user code

```typescript
// Used within service.get()
const url = service.buildURL(baseURL, '/users', { page: 1, limit: 10 })

// User code
const apiUrl = service.buildURL('https://api.example.com', '/users', {
  filter: 'active',
  sort: 'name'
})
```

#### **`service.parseURL()`**
```typescript
service.parseURL(url: string): {
  base: string
  path: string
  params: Record<string, string>
  hash?: string
}
```

**Purpose**: Parse URLs into components
**Usage**: Request processing and debugging

### **Error Handling**

#### **`service.isError()`**
```typescript
service.isError(error: unknown): error is ServiceError
```

**Purpose**: Type guard for service errors
**Usage**: Error handling in user code

```typescript
try {
  const result = await service.get('/users')
} catch (error) {
  if (service.isError(error)) {
    console.log('Service error:', error.code, error.message)
  }
}
```

#### **`service.isRetryable()`**
```typescript
service.isRetryable(error: ServiceError): boolean
```

**Purpose**: Determine if error should trigger retry
**Usage**: Custom retry logic

```typescript
if (service.isRetryable(error)) {
  // Implement custom retry
  await service.get(url, { retry: { attempts: 3 } })
}
```

### **Response Processing**

#### **`service.parseResponse()`**
```typescript
service.parseResponse<T>(
  response: Response,
  schema?: Schema<T>
): Result<ServiceError, T>
```

**Purpose**: Parse and validate HTTP responses
**Usage**: Custom response handling

```typescript
// Used within service methods
const parsed = service.parseResponse(response, UserSchema)

// Custom fetch with service parsing
const response = await fetch('/api/data')
const result = service.parseResponse(response, DataSchema)
```

#### **`service.extractHeaders()`**
```typescript
service.extractHeaders(
  response: Response,
  keys?: string[]
): Record<string, string>
```

**Purpose**: Extract specific headers from response
**Usage**: Response metadata processing

## Internal Utilities

These functions are used internally by SERVICE methods but not exposed to users:

### **Request Processing**

#### **`normalizeOptions()`**
```typescript
normalizeOptions(options: ServiceOptions): NormalizedOptions
```

**Purpose**: Normalize and validate service options
**Usage**: Internal option processing

#### **`buildHeaders()`**
```typescript
buildHeaders(
  base: HeadersInit,
  additional?: HeadersInit,
  contentType?: string
): Headers
```

**Purpose**: Construct request headers
**Usage**: Request preparation

#### **`prepareBody()`**
```typescript
prepareBody(
  data: unknown,
  contentType: string
): string | FormData | ArrayBuffer
```

**Purpose**: Serialize request body based on content type
**Usage**: Request body preparation

### **Caching**

#### **`generateCacheKey()`**
```typescript
generateCacheKey(
  url: string,
  options: ServiceOptions
): string
```

**Purpose**: Generate consistent cache keys
**Usage**: Cache implementation

#### **`isCacheable()`**
```typescript
isCacheable(
  method: string,
  options: ServiceOptions
): boolean
```

**Purpose**: Determine if request should be cached
**Usage**: Cache logic

### **Retry Logic**

#### **`calculateDelay()`**
```typescript
calculateDelay(
  attempt: number,
  config: RetryConfig
): number
```

**Purpose**: Calculate retry delay with backoff
**Usage**: Retry implementation

#### **`shouldRetry()`**
```typescript
shouldRetry(
  error: ServiceError,
  attempt: number,
  config: RetryConfig
): boolean
```

**Purpose**: Determine if request should be retried
**Usage**: Retry decision logic

## Function Utils Usage Patterns

### **Within Service Methods**

```typescript
// Example: service.get() implementation using utils
async function get<T>(url: string, options: GetOptions = {}): Promise<Result<ServiceError, T>> {
  // Use internal utils
  const normalizedOptions = normalizeOptions(options)
  const fullURL = service.buildURL(baseURL, url, options.params)
  const headers = buildHeaders(defaultHeaders, options.headers)
  
  try {
    const response = await fetch(fullURL, { headers, ...normalizedOptions })
    
    // Use public utils
    const result = service.parseResponse(response, options.validate)
    return result
  } catch (error) {
    if (service.isRetryable(error) && options.retry) {
      // Implement retry logic
      return retry(() => get(url, options), options.retry)
    }
    return Result.error(error)
  }
}
```

### **User Code Composition**

```typescript
// User leverages public utils for custom logic
const buildAPIRequest = (endpoint: string, params: Record<string, unknown>) => {
  const url = service.buildURL('https://api.example.com', endpoint, params)
  
  return {
    url,
    headers: { 'Content-Type': 'application/json' },
    validate: (response: Response) => service.parseResponse(response, ApiSchema)
  }
}

// Use with service methods
const { url, headers, validate } = buildAPIRequest('/users', { page: 1 })
const users = await service.get(url, { headers, validate })
```

### **Error Handling Patterns**

```typescript
// Centralized error handling using utils
const handleServiceError = (error: unknown) => {
  if (service.isError(error)) {
    switch (error.code) {
      case 'NETWORK_ERROR':
        if (service.isRetryable(error)) {
          // Show retry option
          return { action: 'retry', message: 'Network issue, retry?' }
        }
        break
      case 'VALIDATION_ERROR':
        return { action: 'fix', message: 'Please check your data' }
      default:
        return { action: 'report', message: 'Unexpected error occurred' }
    }
  }
  return { action: 'unknown', message: 'Unknown error' }
}
```

## Benefits

### **For METHOD Implementation**
- Consistent URL handling across all methods
- Reusable error handling logic
- Standardized response processing
- Shared caching and retry utilities

### **For USER Code**
- Access to tested utility functions
- Consistent error handling patterns
- URL construction helpers
- Response validation utilities

### **For FRAMEWORK Design**
- Clear separation of concerns
- Testable utility functions
- Composable architecture
- Consistent patterns across pillars

## Implementation Priority

### **Phase 1: Core Utils**
- `buildURL()`, `parseResponse()`, `isError()`
- Essential for basic service functionality

### **Phase 2: Processing Utils**
- `parseURL()`, `extractHeaders()`, `isRetryable()`
- Enhanced functionality and debugging

### **Phase 3: Internal Utils**
- All internal utilities for method implementation
- Performance and reliability features

---

**Next**: [Data Utils](../data/data-utils.md) - DATA pillar function utilities