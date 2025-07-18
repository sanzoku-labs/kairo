# Type Utilities

TypeScript type utilities for enhanced type safety and inference.

## Core Types

### Result&lt;E, T&gt;

The Result type for error handling:

```typescript
type Result<E, T> = 
  | { tag: 'Ok'; value: T }
  | { tag: 'Err'; error: E }
```

### Schema&lt;T&gt;

Schema type for validation:

```typescript
type Schema<T> = {
  type: string
  validate: (value: unknown) => Result<ValidationError, T>
  infer: () => T
}
```

### KairoError

Base error type:

```typescript
interface KairoError {
  code: string
  message: string
  timestamp: number
  context: Record<string, unknown>
}
```

## Utility Types

### Optional&lt;T, K&gt;

Make specific keys optional:

```typescript
type User = {
  id: string
  name: string
  email: string
  age: number
}

type CreateUser = Optional<User, 'id' | 'age'>
// Result: { id?: string; name: string; email: string; age?: number }
```

### Required&lt;T, K&gt;

Make specific keys required:

```typescript
type PartialUser = {
  id?: string
  name?: string
  email?: string
}

type RequiredUser = Required<PartialUser, 'id' | 'name'>
// Result: { id: string; name: string; email?: string }
```

### DeepPartial&lt;T&gt;

Make all properties deeply optional:

```typescript
type User = {
  id: string
  profile: {
    name: string
    settings: {
      theme: string
      notifications: boolean
    }
  }
}

type PartialUser = DeepPartial<User>
// Result: All properties are optional at every level
```

### DeepRequired&lt;T&gt;

Make all properties deeply required:

```typescript
type PartialUser = {
  id?: string
  profile?: {
    name?: string
    settings?: {
      theme?: string
      notifications?: boolean
    }
  }
}

type RequiredUser = DeepRequired<PartialUser>
// Result: All properties are required at every level
```

## Schema Inference

### InferSchema&lt;S&gt;

Infer TypeScript type from schema:

```typescript
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 120 }
})

type User = InferSchema<typeof UserSchema>
// Result: { id: string; name: string; email: string; age: number }
```

### InferSchemaArray&lt;S&gt;

Infer array type from schema:

```typescript
const UsersSchema = data.schema({
  users: { type: 'array', items: UserSchema }
})

type Users = InferSchemaArray<typeof UsersSchema>
// Result: User[]
```

## Service Types

### ServiceConfig

Configuration for service operations:

```typescript
interface ServiceConfig {
  timeout?: number
  retry?: {
    attempts: number
    delay: number
    exponential?: boolean
  }
  cache?: {
    enabled: boolean
    ttl: number
    key?: string
  }
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean>
}
```

### ServiceResponse&lt;T&gt;

Service response type:

```typescript
type ServiceResponse<T> = Result<ServiceError, T>
```

### ServiceError

Service-specific error type:

```typescript
interface ServiceError extends KairoError {
  pillar: 'SERVICE'
  operation: string
  status?: number
  url?: string
}
```

## Data Types

### DataConfig

Configuration for data operations:

```typescript
interface DataConfig {
  strict?: boolean
  coerce?: boolean
  stripUnknown?: boolean
  abortEarly?: boolean
}
```

### ValidationError

Validation error type:

```typescript
interface ValidationError extends KairoError {
  pillar: 'DATA'
  field: string
  value: unknown
  expected: string
  path: string[]
}
```

### TransformConfig

Configuration for data transformation:

```typescript
interface TransformConfig {
  preserveOriginal?: boolean
  skipUndefined?: boolean
  deepMerge?: boolean
}
```

## Pipeline Types

### PipelineConfig

Configuration for pipeline operations:

```typescript
interface PipelineConfig {
  parallel?: boolean
  concurrency?: number
  timeout?: number
  retries?: number
  errorStrategy?: 'fail-fast' | 'collect-errors' | 'ignore-errors'
}
```

### PipelineFunction&lt;T, U&gt;

Pipeline function type:

```typescript
type PipelineFunction<T, U> = (input: T) => Result<PipelineError, U>
```

### PipelineError

Pipeline-specific error type:

```typescript
interface PipelineError extends KairoError {
  pillar: 'PIPELINE'
  step: number
  operation: string
  input: unknown
}
```

## Utility Functions

### isResult&lt;E, T&gt;()

Type guard for Result:

```typescript
function isResult<E, T>(value: unknown): value is Result<E, T> {
  return typeof value === 'object' && 
         value !== null && 
         'tag' in value &&
         (value.tag === 'Ok' || value.tag === 'Err')
}
```

### isOk&lt;E, T&gt;()

Type guard for Ok result:

```typescript
function isOk<E, T>(result: Result<E, T>): result is { tag: 'Ok'; value: T } {
  return result.tag === 'Ok'
}
```

### isErr&lt;E, T&gt;()

Type guard for Err result:

```typescript
function isErr<E, T>(result: Result<E, T>): result is { tag: 'Err'; error: E } {
  return result.tag === 'Err'
}
```

## Advanced Types

### Branded&lt;T, B&gt;

Create branded types:

```typescript
type UserId = Branded<string, 'UserId'>
type EmailAddress = Branded<string, 'EmailAddress'>

const userId: UserId = 'user-123' as UserId
const email: EmailAddress = 'john@example.com' as EmailAddress
```

### Nominal&lt;T, K&gt;

Create nominal types:

```typescript
type Seconds = Nominal<number, 'Seconds'>
type Minutes = Nominal<number, 'Minutes'>

const timeout: Seconds = 30 as Seconds
const interval: Minutes = 5 as Minutes
```

### Opaque&lt;T, K&gt;

Create opaque types:

```typescript
type JWT = Opaque<string, 'JWT'>
type Base64 = Opaque<string, 'Base64'>

const token: JWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...' as JWT
const encoded: Base64 = 'SGVsbG8gV29ybGQ=' as Base64
```

## Usage Examples

### Type-Safe API Client

```typescript
interface ApiEndpoints {
  '/api/users': {
    GET: { response: User[] }
    POST: { body: CreateUser; response: User }
  }
  '/api/users/:id': {
    GET: { params: { id: string }; response: User }
    PUT: { params: { id: string }; body: UpdateUser; response: User }
    DELETE: { params: { id: string }; response: void }
  }
}

type ApiClient = {
  [K in keyof ApiEndpoints]: {
    [M in keyof ApiEndpoints[K]]: (
      config: ApiEndpoints[K][M] extends { params: infer P } ? { params: P } : {}
        & ApiEndpoints[K][M] extends { body: infer B } ? { body: B } : {}
    ) => Promise<ServiceResponse<ApiEndpoints[K][M]['response']>>
  }
}
```

### Schema-Based Validation

```typescript
const createUserSchema = data.schema({
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 120, optional: true }
})

type CreateUserRequest = InferSchema<typeof createUserSchema>
// Result: { name: string; email: string; age?: number }

const validateCreateUser = (input: unknown): Result<ValidationError, CreateUserRequest> => {
  return data.validate(input, createUserSchema)
}
```

### Pipeline Composition

```typescript
type ProcessingPipeline<T, U> = (input: T) => Promise<Result<PipelineError, U>>

const userProcessingPipeline: ProcessingPipeline<unknown, User> = pipeline.compose([
  (input: unknown) => data.validate(input, UserSchema),
  (user: User) => data.transform(user, normalizeUser),
  (user: User) => service.post('/api/users', { body: user }),
  (response: ServiceResponse<User>) => response
])
```

## Next Steps

- [Functional Programming Utilities](/api/fp-utils)
- [Result Pattern](/api/result)
- [Schema System](/api/schema)