# SERVICE Pillar - Methods Specification

> **Complete API for HTTP-only service operations**

## Core Philosophy

The SERVICE pillar provides **HTTP-only** integration with external APIs. It's specifically scoped to handle:
- ✅ HTTP methods (GET, POST, PUT, DELETE, PATCH)
- ✅ Request/response handling
- ✅ Native HTTP client implementation
- ❌ NOT databases, file systems, or other protocols

## Method Signatures

All SERVICE methods follow this pattern:
```typescript
service.method(url: string, data?: unknown, options?: ServiceOptions): Promise<Result<ServiceError, T>>
```

## Core HTTP Methods

### **`service.get()`**
**Signature**:
```typescript
service.get<T = unknown>(
  url: string, 
  options?: GetOptions
): Promise<Result<ServiceError, T>>
```

**Purpose**: Fetch data from HTTP GET endpoints

**Examples**:
```typescript
// Simple usage
const users = await service.get('/users')

// With options
const users = await service.get('/users', {
  params: { page: 1, limit: 10 },
  cache: true,
  timeout: 5000,
  validate: UserListSchema
})
```

### **`service.post()`**
**Signature**:
```typescript
service.post<TData = unknown, TResponse = unknown>(
  url: string,
  data: TData,
  options?: PostOptions
): Promise<Result<ServiceError, TResponse>>
```

**Purpose**: Send data to HTTP POST endpoints

**Examples**:
```typescript
// Simple usage
const newUser = await service.post('/users', userData)

// With options
const newUser = await service.post('/users', userData, {
  headers: { 'Content-Type': 'application/json' },
  validate: UserSchema,
  retry: { attempts: 3 },
  transform: true
})
```

### **`service.put()`**
**Signature**:
```typescript
service.put<TData = unknown, TResponse = unknown>(
  url: string,
  data: TData,
  options?: PutOptions
): Promise<Result<ServiceError, TResponse>>
```

**Purpose**: Update resources with HTTP PUT

**Examples**:
```typescript
// Simple update
const updated = await service.put('/users/123', updatedUserData)

// With validation
const updated = await service.put('/users/123', updatedUserData, {
  validate: UserSchema,
  optimistic: true,
  timeout: 10000
})
```

### **`service.patch()`**
**Signature**:
```typescript
service.patch<TData = unknown, TResponse = unknown>(
  url: string,
  data: Partial<TData>,
  options?: PatchOptions
): Promise<Result<ServiceError, TResponse>>
```

**Purpose**: Partial updates with HTTP PATCH

**Examples**:
```typescript
// Partial update
const updated = await service.patch('/users/123', { email: 'new@email.com' })

// With options
const updated = await service.patch('/users/123', partialData, {
  merge: true,
  validate: PartialUserSchema,
  retry: true
})
```

### **`service.delete()`**
**Signature**:
```typescript
service.delete<T = void>(
  url: string,
  options?: DeleteOptions
): Promise<Result<ServiceError, T>>
```

**Purpose**: Delete resources with HTTP DELETE

**Examples**:
```typescript
// Simple deletion
const result = await service.delete('/users/123')

// With confirmation
const result = await service.delete('/users/123', {
  confirm: true,
  soft: true,
  returnDeleted: true
})
```

## Batch Operations

### **`service.batch()`**
**Signature**:
```typescript
service.batch<T = unknown>(
  requests: BatchRequest[],
  options?: BatchOptions
): Promise<Result<ServiceError, T[]>>
```

**Purpose**: Execute multiple HTTP requests efficiently

**Examples**:
```typescript
// Multiple requests
const results = await service.batch([
  { method: 'GET', url: '/users/1' },
  { method: 'GET', url: '/users/2' },
  { method: 'POST', url: '/users', data: newUser }
], {
  parallel: true,
  maxConcurrency: 5,
  failFast: false
})
```

## Streaming Operations

### **`service.stream()`**
**Signature**:
```typescript
service.stream<T = unknown>(
  url: string,
  options?: StreamOptions
): AsyncIterable<Result<ServiceError, T>>
```

**Purpose**: Handle streaming responses (SSE, chunked responses)

**Examples**:
```typescript
// Server-sent events
for await (const event of service.stream('/events', { 
  type: 'sse',
  reconnect: true 
})) {
  if (Result.isOk(event)) {
    console.log('New event:', event.value)
  }
}
```

## Upload Operations

### **`service.upload()`**
**Signature**:
```typescript
service.upload<T = unknown>(
  url: string,
  files: File | File[] | FormData,
  options?: UploadOptions
): Promise<Result<ServiceError, T>>
```

**Purpose**: File upload with progress tracking

**Examples**:
```typescript
// File upload
const result = await service.upload('/files', fileInput, {
  progress: (percent) => console.log(`${percent}% uploaded`),
  chunk: true,
  validate: UploadResponseSchema
})
```

## Configuration Methods

### **`service.configure()`**
**Signature**:
```typescript
service.configure(config: GlobalServiceConfig): void
```

**Purpose**: Set global configuration for all service calls

**Examples**:
```typescript
// Global configuration
service.configure({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  headers: { 'Authorization': 'Bearer token' },
  retries: { attempts: 3, delay: 1000 }
})
```

### **`service.create()`**
**Signature**:
```typescript
service.create(config: ServiceConfig): ServiceInstance
```

**Purpose**: Create configured service instance

**Examples**:
```typescript
// Custom service instance
const apiV2 = service.create({
  baseURL: 'https://api.example.com/v2',
  timeout: 60000,
  validate: true
})

const users = await apiV2.get('/users')
```

## Error Handling Methods

### **`service.isError()`**
**Signature**:
```typescript
service.isError(result: unknown): result is ServiceError
```

**Purpose**: Type guard for service errors

### **`service.retryable()`**
**Signature**:
```typescript
service.retryable(error: ServiceError): boolean
```

**Purpose**: Determine if an error is retryable

## Utility Methods

### **`service.buildURL()`**
**Signature**:
```typescript
service.buildURL(base: string, params?: Record<string, unknown>): string
```

**Purpose**: URL construction with parameters

### **`service.parseResponse()`**
**Signature**:
```typescript
service.parseResponse<T>(response: Response, schema?: Schema<T>): Result<ServiceError, T>
```

**Purpose**: Parse and validate HTTP responses

## Method Categories

### **Core CRUD (5 methods)**
- `get()` - Fetch data
- `post()` - Create data  
- `put()` - Update data (full)
- `patch()` - Update data (partial)
- `delete()` - Remove data

### **Advanced Operations (3 methods)**
- `batch()` - Multiple requests
- `stream()` - Streaming data
- `upload()` - File uploads

### **Configuration (2 methods)**
- `configure()` - Global config
- `create()` - Instance creation

### **Utilities (4 methods)**
- `isError()` - Error type checking
- `retryable()` - Retry logic
- `buildURL()` - URL construction
- `parseResponse()` - Response parsing

**Total: 14 methods** (focused, comprehensive HTTP API)

## Implementation Priorities

### **Phase 1 - Core CRUD**
- `get()`, `post()`, `put()`, `patch()`, `delete()`
- Basic options support
- Native fetch implementation

### **Phase 2 - Configuration**
- `configure()`, `create()`
- Global and instance-level config
- Advanced options

### **Phase 3 - Advanced**
- `batch()`, `stream()`, `upload()`
- Performance optimizations
- Complex scenarios

### **Phase 4 - Utilities**
- Helper methods
- Developer experience improvements
- Debug tooling

---

**Next**: [Service Options](./service-options.md) - Configuration options for all methods