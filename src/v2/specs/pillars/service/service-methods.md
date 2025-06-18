# SERVICE Pillar - Methods Specification

> **Pareto-optimized API for HTTP-only service operations (5 core methods)**

## Core Philosophy

The SERVICE pillar provides **essential HTTP operations** following 80/20 Pareto principle:
- ✅ HTTP methods (GET, POST, PUT, DELETE, PATCH)
- ✅ Request/response handling
- ✅ Native HTTP client implementation
- ❌ NOT databases, file systems, or other protocols

## V2.0 Scope: 5 Core Methods

**80% Use Cases Covered by Core Methods:**
- `service.get()` - Fetch data
- `service.post()` - Create resources
- `service.put()` - Update resources
- `service.patch()` - Partial updates
- `service.delete()` - Remove resources

**V2.1+ Features:** Advanced capabilities (`batch()`, `stream()`, `upload()`, `configure()`, `create()`), specialized utilities

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

## Method Categories

### **Core HTTP Methods (5 methods)**
- `get()` - Fetch data
- `post()` - Create resources
- `put()` - Update/replace resources
- `patch()` - Partial updates
- `delete()` - Remove resources

**Total: 5 methods** (Pareto-optimized HTTP operations)

## Implementation Priorities

### **Phase 1 - Core HTTP (5 methods)**
- `get()`, `post()`, `put()`, `patch()`, `delete()`
- Native fetch implementation
- Essential HTTP operations

---

**Next**: [Service Options](./service-options.md) - Configuration options for all methods