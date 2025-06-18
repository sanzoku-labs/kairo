# SERVICE Pillar - Options Specification ✅ IMPLEMENTED

> **Complete configuration options for all service methods**  
> **Status: ✅ All configuration options implemented and working**

## ✅ Configuration Philosophy - IMPLEMENTED

SERVICE options follow the **"smart defaults, rich configuration"** principle:

- ✅ **Zero config required** - intelligent defaults for 80% of use cases - **IMPLEMENTED**
- ✅ **Progressive enhancement** - add options only when needed - **IMPLEMENTED**
- ✅ **Consistent patterns** - same option types across all methods - **IMPLEMENTED**

## ✅ Base Options Interface - IMPLEMENTED

All SERVICE methods accept a base set of options:

```typescript
interface BaseServiceOptions {
  // Request Configuration
  headers?: Record<string, string>
  params?: Record<string, unknown>
  timeout?: number
  signal?: AbortSignal

  // Response Handling
  validate?: Schema<unknown>
  transform?: boolean | TransformConfig

  // Caching
  cache?: boolean | CacheConfig

  // Retry Logic
  retry?: boolean | RetryConfig

  // Debugging
  debug?: boolean | DebugConfig
}
```

## Method-Specific Options

### **GET Options**

```typescript
interface GetOptions extends BaseServiceOptions {
  // Query Parameters
  params?: Record<string, unknown>

  // Caching (GET-specific behaviors)
  cache?: boolean | GetCacheConfig

  // Conditional Requests
  ifModifiedSince?: Date
  ifNoneMatch?: string

  // Response Format
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer'
}

interface GetCacheConfig extends BaseCacheConfig {
  ttl?: number // Time to live (default: 300000ms = 5min)
  staleWhileRevalidate?: number // Serve stale for X ms while fetching
  tags?: string[] // Cache invalidation tags
}
```

### **POST Options**

```typescript
interface PostOptions extends BaseServiceOptions {
  // Content Handling
  contentType?: 'json' | 'form' | 'multipart' | 'text'

  // Validation
  validateRequest?: Schema<unknown> // Validate outgoing data
  validateResponse?: Schema<unknown> // Validate incoming response

  // Idempotency
  idempotencyKey?: string

  // Optimistic Updates
  optimistic?: boolean | OptimisticConfig
}

interface OptimisticConfig {
  enabled: boolean
  rollback?: (error: ServiceError) => void
  timeout?: number
}
```

### **PUT Options**

```typescript
interface PutOptions extends BaseServiceOptions {
  // Update Strategy
  merge?: boolean // Merge with existing vs replace
  upsert?: boolean // Create if doesn't exist

  // Concurrency Control
  ifMatch?: string // ETag for optimistic locking
  ifUnmodifiedSince?: Date

  // Validation
  validateRequest?: Schema<unknown>
  validateResponse?: Schema<unknown>
}
```

### **PATCH Options**

```typescript
interface PatchOptions extends BaseServiceOptions {
  // Merge Strategy
  strategy?: 'merge' | 'replace' | 'remove'
  deep?: boolean // Deep merge for nested objects

  // Patch Format
  format?: 'merge-patch' | 'json-patch' | 'strategic-merge'

  // Validation
  validatePartial?: Schema<unknown>
  validateFull?: Schema<unknown>
}
```

### **DELETE Options**

```typescript
interface DeleteOptions extends BaseServiceOptions {
  // Deletion Strategy
  soft?: boolean // Soft delete vs hard delete
  force?: boolean // Force delete (bypass confirmations)

  // Return Data
  returnDeleted?: boolean // Return deleted resource

  // Confirmation
  confirm?: boolean | string // Require confirmation
}
```

## Advanced Options

### **Caching Configuration**

```typescript
interface CacheConfig {
  enabled: boolean
  ttl?: number // Time to live in milliseconds
  strategy?: 'memory' | 'localStorage' | 'sessionStorage'
  key?: string | ((url: string, options: unknown) => string)
  invalidate?: string[] // Tags to invalidate
  staleWhileRevalidate?: number
  maxAge?: number

  // Cache conditions
  when?: (response: Response) => boolean
  unless?: (response: Response) => boolean
}
```

### **Retry Configuration**

```typescript
interface RetryConfig {
  attempts: number // Max retry attempts (default: 3)
  delay?: number | ((attempt: number) => number)
  backoff?: 'linear' | 'exponential' | 'fixed'
  maxDelay?: number // Cap on delay between retries

  // Retry conditions
  retryOn?: number[] | ((error: ServiceError) => boolean)
  retryIf?: (error: ServiceError, attempt: number) => boolean

  // Jitter for distributed systems
  jitter?: boolean | number
}
```

### **Transform Configuration**

```typescript
interface TransformConfig {
  request?: (data: unknown) => unknown
  response?: (data: unknown) => unknown
  error?: (error: ServiceError) => ServiceError

  // Auto-transforms
  camelCase?: boolean // Convert keys to camelCase
  dateStrings?: boolean // Parse ISO date strings to Date objects
  numbers?: boolean // Parse numeric strings to numbers
}
```

### **Debug Configuration**

```typescript
interface DebugConfig {
  enabled: boolean
  level?: 'minimal' | 'detailed' | 'verbose'
  logRequest?: boolean
  logResponse?: boolean
  logErrors?: boolean
  logTiming?: boolean

  // Custom logging
  logger?: (message: string, data?: unknown) => void
}
```

## Batch Options

```typescript
interface BatchOptions extends BaseServiceOptions {
  // Execution Strategy
  parallel?: boolean // Execute in parallel vs sequential
  maxConcurrency?: number // Limit concurrent requests

  // Error Handling
  failFast?: boolean // Stop on first error
  continueOnError?: boolean // Continue despite errors

  // Progress Tracking
  onProgress?: (completed: number, total: number) => void

  // Individual Request Options
  defaultOptions?: BaseServiceOptions
}

interface BatchRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  data?: unknown
  options?: BaseServiceOptions
}
```

## Stream Options

```typescript
interface StreamOptions extends BaseServiceOptions {
  // Stream Type
  type?: 'sse' | 'chunked' | 'websocket'

  // Reconnection
  reconnect?: boolean
  maxReconnects?: number
  reconnectDelay?: number

  // Buffering
  buffer?: boolean
  bufferSize?: number

  // Event Handling
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: ServiceError) => void
  onReconnect?: (attempt: number) => void
}
```

## Upload Options

```typescript
interface UploadOptions extends BaseServiceOptions {
  // Upload Strategy
  chunk?: boolean // Chunked upload
  chunkSize?: number // Size per chunk

  // Progress Tracking
  progress?: (percent: number, loaded: number, total: number) => void

  // File Handling
  multiple?: boolean // Multiple file upload
  accept?: string[] // Accepted file types
  maxSize?: number // Max file size

  // Resume Support
  resumable?: boolean
  resumeFrom?: number
}
```

## Global Configuration

```typescript
interface GlobalServiceConfig {
  // Base Configuration
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>

  // Default Behaviors
  cache?: CacheConfig
  retry?: RetryConfig
  transform?: TransformConfig
  debug?: DebugConfig

  // Request/Response Interceptors
  interceptors?: {
    request?: (config: RequestConfig) => RequestConfig
    response?: (response: Response) => Response
    error?: (error: ServiceError) => ServiceError
  }

  // Environment
  environment?: 'development' | 'test' | 'production'
}
```

## Option Examples

### **Simple Usage (Smart Defaults)**

```typescript
// Zero configuration - uses intelligent defaults
const users = await service.get('/users')
const newUser = await service.post('/users', userData)
```

### **Basic Configuration**

```typescript
// Simple options for common cases
const users = await service.get('/users', {
  params: { page: 1, limit: 10 },
  cache: true,
  timeout: 5000,
})
```

### **Advanced Configuration**

```typescript
// Rich configuration for complex scenarios
const users = await service.get('/users', {
  params: { page: 1, limit: 10 },
  cache: {
    ttl: 300000,
    strategy: 'memory',
    staleWhileRevalidate: 60000,
    tags: ['users', 'public-data'],
  },
  retry: {
    attempts: 3,
    backoff: 'exponential',
    maxDelay: 5000,
    retryOn: [500, 502, 503, 504],
  },
  transform: {
    response: data => data.items || data,
    camelCase: true,
    dateStrings: true,
  },
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    level: 'detailed',
    logTiming: true,
  },
})
```

## Option Validation

### **TypeScript Inference**

All options are fully typed with TypeScript for compile-time validation:

```typescript
// TypeScript catches invalid options
const users = await service.get('/users', {
  cache: true, // ✅ Valid
  retries: 3, // ❌ Error: should be 'retry'
  invalidOption: 'test', // ❌ Error: not in interface
})
```

### **Runtime Validation**

Options are validated at runtime with helpful error messages:

```typescript
// Runtime validation with clear errors
const users = await service.get('/users', {
  timeout: -1000, // ❌ RuntimeError: timeout must be positive
})
```

---

**Next**: [Service Utilities](./service-utilities.md) - Helper functions and common patterns
