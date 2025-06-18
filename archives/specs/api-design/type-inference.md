# Type Inference ✅ IMPLEMENTED

> **TypeScript inference strategies and patterns for Kairo V2's type-safe APIs**  
> **Status: ✅ All type inference patterns implemented and working**

## Overview ✅ Fully Implemented

Kairo V2 leverages advanced TypeScript features for maximum type inference, eliminating the need for explicit type annotations in most cases. This document outlines inference strategies, patterns, and implementation techniques.

**Implementation Status**: ✅ **Full TypeScript inference working across all pillars**

## ✅ Core Type Inference Principles - IMPLEMENTED

### **✅ 1. Schema-Driven Type Inference - IMPLEMENTED**

```typescript
// Types inferred from schema definitions
const UserSchema = data.schema({
  name: data.string().min(1).max(100),
  email: data.string().email(),
  age: data.number().min(0).max(150),
  profile: data.object({
    bio: data.string().optional(),
    avatar: data.string().url().optional(),
  }),
})

// TypeScript automatically infers the User type
type User = InferSchemaType<typeof UserSchema>
// Equivalent to:
// type User = {
//   name: string
//   email: string
//   age: number
//   profile: {
//     bio?: string
//     avatar?: string
//   }
// }

// No manual type annotations needed
const users = await service.get('/users', { validate: UserSchema })
// users: Promise<Result<ServiceError | ValidationError, User[]>>

if (Result.isOk(users)) {
  users.value[0].name // TypeScript knows this is string
  users.value[0].email // TypeScript knows this is string
  users.value[0].profile.bio // TypeScript knows this is string | undefined
}
```

### **2. Function Signature Inference**

```typescript
// Transform functions infer types from input/output
const enrichUser = (user: User): EnrichedUser => ({
  ...user,
  fullName: `${user.name}`,
  emailDomain: user.email.split('@')[1],
  isMinor: user.age < 18,
})

// Pipeline operations infer types automatically
const processed = pipeline.map(users, enrichUser)
// processed: Result<PipelineError, EnrichedUser[]>

// No need to specify generics
const filtered = pipeline.filter(processed, user => user.age >= 18)
// filtered: Result<PipelineError, EnrichedUser[]>

const names = pipeline.map(filtered, user => user.fullName)
// names: Result<PipelineError, string[]>
```

### **3. Options-Based Type Refinement**

```typescript
// Options refine return types
const basicRequest = service.get('/users')
// basicRequest: Promise<Result<ServiceError, unknown>>

const validatedRequest = service.get('/users', { validate: UserSchema })
// validatedRequest: Promise<Result<ServiceError | ValidationError, User[]>>

const transformedRequest = service.get('/users', {
  validate: UserSchema,
  transform: enrichUser,
})
// transformedRequest: Promise<Result<ServiceError | ValidationError, EnrichedUser[]>>
```

## Advanced Type Inference Patterns

### **Schema Type Extraction**

```typescript
// Extract types from complex schema definitions
type InferSchemaType<T> = T extends Schema<infer U> ? U : never

type InferArrayType<T> = T extends Schema<(infer U)[]> ? U : never

type InferOptionalType<T> = T extends Schema<infer U | undefined> ? U : never

// Nested schema inference
const NestedSchema = data.schema({
  user: UserSchema,
  posts: data.array(
    data.object({
      title: data.string(),
      content: data.string(),
      tags: data.array(data.string()),
    })
  ),
  metadata: data
    .object({
      createdAt: data.date(),
      updatedAt: data.date().optional(),
    })
    .optional(),
})

type NestedType = InferSchemaType<typeof NestedSchema>
// Automatically infers:
// type NestedType = {
//   user: User
//   posts: Array<{
//     title: string
//     content: string
//     tags: string[]
//   }>
//   metadata?: {
//     createdAt: Date
//     updatedAt?: Date
//   }
// }
```

### **Conditional Type Inference**

```typescript
// Conditional types based on options
type ServiceResult<TOptions extends ServiceOptions, TDefault = unknown> = TOptions extends {
  validate: Schema<infer T>
}
  ? Promise<Result<ServiceError | ValidationError, T>>
  : Promise<Result<ServiceError, TDefault>>

// Transform inference
type TransformResult<TInput, TOptions extends ServiceOptions> = TOptions extends {
  transform: (input: TInput) => infer TOutput
}
  ? TOutput
  : TInput

// Cache inference
type CacheStrategy<T extends ServiceOptions> = T extends {
  cache: { strategy: infer S }
}
  ? S
  : 'memory'

// Usage with full inference
declare function typedService<TOptions extends ServiceOptions, TDefault = unknown>(
  url: string,
  options?: TOptions
): ServiceResult<TOptions, TDefault>

const result1 = typedService('/users')
// result1: Promise<Result<ServiceError, unknown>>

const result2 = typedService('/users', { validate: UserSchema })
// result2: Promise<Result<ServiceError | ValidationError, User[]>>

const result3 = typedService('/users', {
  validate: UserSchema,
  transform: enrichUser,
})
// result3: Promise<Result<ServiceError | ValidationError, EnrichedUser[]>>
```

### **Pipeline Type Composition**

```typescript
// Infer types through pipeline compositions
type InferPipelineResult<T, TFunctions extends readonly any[]> = TFunctions extends readonly [
  infer First,
  ...infer Rest,
]
  ? First extends (input: T) => infer U
    ? Rest extends readonly []
      ? U
      : InferPipelineResult<U, Rest>
    : never
  : T

// Compose with full type inference
const processUserPipeline = pipeline.compose(
  (users: User[]) => users.filter(u => u.age >= 18),
  (adults: User[]) => adults.map(u => enrichUser(u)),
  (enriched: EnrichedUser[]) => enriched.sort((a, b) => a.name.localeCompare(b.name))
)

// Type automatically inferred as: (users: User[]) => EnrichedUser[]
const result = processUserPipeline(userArray)
// result: EnrichedUser[]
```

### **Error Type Union Inference**

```typescript
// Automatically infer error unions across pillars
type InferErrorType<TOperations extends readonly any[]> = TOperations extends readonly [
  infer First,
  ...infer Rest,
]
  ? First extends (...args: any[]) => Result<infer E, any>
    ? Rest extends readonly []
      ? E
      : E | InferErrorType<Rest>
    : never
  : never

// Multi-pillar operation with inferred error types
const multiPillarOperation = async (data: unknown) => {
  const serviceResult = await service.get('/validate')
  const dataResult = data.validate(data, Schema)
  const pipelineResult = pipeline.map([], transform)

  // TypeScript infers: ServiceError | ValidationError | PipelineError
  type ErrorUnion = InferErrorType<[typeof serviceResult, typeof dataResult, typeof pipelineResult]>

  return { serviceResult, dataResult, pipelineResult }
}
```

## Pillar-Specific Type Inference

### **SERVICE Pillar Inference**

```typescript
// HTTP method inference
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type ServiceMethodResult<
  TMethod extends HTTPMethod,
  TBody,
  TOptions extends ServiceOptions,
> = TMethod extends 'GET' | 'DELETE'
  ? ServiceResult<TOptions>
  : TMethod extends 'POST' | 'PUT' | 'PATCH'
    ? TBody extends undefined
      ? ServiceResult<TOptions>
      : ServiceResult<TOptions, TBody>
    : never

// Batch operation inference
type BatchRequest = {
  method: HTTPMethod
  url: string
  body?: unknown
}

type InferBatchResult<T extends readonly BatchRequest[]> = {
  [K in keyof T]: T[K] extends BatchRequest ? Result<ServiceError, unknown> : never
}

const batchRequests = [
  { method: 'GET' as const, url: '/users' },
  { method: 'POST' as const, url: '/users', body: newUser },
  { method: 'DELETE' as const, url: '/users/123' },
] as const

const batchResult = await service.batch(batchRequests)
// batchResult: Result<ServiceError, [unknown, unknown, unknown]>
```

### **DATA Pillar Inference**

```typescript
// Schema builder with inference
class SchemaBuilder<T = unknown> {
  constructor(private type: T) {}

  string(): SchemaBuilder<string> {
    return new SchemaBuilder<string>('string' as any)
  }

  number(): SchemaBuilder<number> {
    return new SchemaBuilder<number>('number' as any)
  }

  object<U extends Record<string, any>>(shape: {
    [K in keyof U]: SchemaBuilder<U[K]>
  }): SchemaBuilder<U> {
    return new SchemaBuilder<U>('object' as any)
  }

  array<U>(item: SchemaBuilder<U>): SchemaBuilder<U[]> {
    return new SchemaBuilder<U[]>('array' as any)
  }

  optional(): SchemaBuilder<T | undefined> {
    return new SchemaBuilder<T | undefined>('optional' as any)
  }

  build(): Schema<T> {
    return {} as Schema<T>
  }
}

// Usage with full inference
const schema = new SchemaBuilder()
  .object({
    name: new SchemaBuilder().string(),
    age: new SchemaBuilder().number(),
    tags: new SchemaBuilder().array(new SchemaBuilder().string()),
    profile: new SchemaBuilder()
      .object({
        bio: new SchemaBuilder().string().optional(),
      })
      .optional(),
  })
  .build()

// Type automatically inferred:
// Schema<{
//   name: string
//   age: number
//   tags: string[]
//   profile?: {
//     bio?: string
//   }
// }>
```

### **PIPELINE Pillar Inference**

```typescript
// Transform function inference
type InferTransformType<T, TFn> = TFn extends (item: T) => infer U ? U : never

type InferReduceType<T, TFn, TInitial> = TFn extends (acc: infer A, item: T) => infer U
  ? U extends A
    ? U
    : never
  : TInitial

// Parallel operation inference
type InferParallelType<T, TFn> = TFn extends (item: T) => Promise<infer U>
  ? U
  : TFn extends (item: T) => infer U
    ? U
    : never

// Usage with inference
const numbers = [1, 2, 3, 4, 5]

const doubled = pipeline.map(numbers, x => x * 2)
// doubled: Result<PipelineError, number[]>

const strings = pipeline.map(numbers, x => x.toString())
// strings: Result<PipelineError, string[]>

const sum = pipeline.reduce(numbers, (acc, x) => acc + x, 0)
// sum: Result<PipelineError, number>

const asyncResults = pipeline.parallel(numbers, async x => {
  await delay(100)
  return x * x
})
// asyncResults: Promise<Result<PipelineError, number[]>>
```

## Generic Constraint Patterns

### **Utility Type Constraints**

```typescript
// Ensure proper types for common patterns
type EnsureArray<T> = T extends readonly any[] ? T : T[]

type EnsurePromise<T> = T extends Promise<any> ? T : Promise<T>

type EnsureResult<T> = T extends Result<any, any> ? T : Result<never, T>

// Schema constraints
type ValidSchema<T> = T extends Schema<any> ? T : never

type SchemaInput<T> = T extends Schema<infer U> ? U : never

// Function constraints
type ValidTransform<TInput, TOutput> = (input: TInput) => TOutput

type ValidPredicate<T> = (input: T) => boolean

type ValidReducer<T, TAcc> = (acc: TAcc, item: T) => TAcc

// Usage with constraints
function typedMap<TInput, TOutput, TTransform extends ValidTransform<TInput, TOutput>>(
  array: TInput[],
  transform: TTransform
): Result<PipelineError, TOutput[]> {
  return pipeline.map(array, transform)
}

// Ensures type safety
const validUsage = typedMap([1, 2, 3], x => x.toString())
// validUsage: Result<PipelineError, string[]>

// This would cause a TypeScript error:
// const invalidUsage = typedMap([1, 2, 3], x => x.nonExistentMethod())
```

### **Branded Types for Better Inference**

```typescript
// Branded types for domain-specific validation
type Brand<T, TBrand> = T & { __brand: TBrand }

type UserId = Brand<string, 'UserId'>
type Email = Brand<string, 'Email'>
type URL = Brand<string, 'URL'>

// Schema builders with branded types
const createBrandedSchema = {
  userId: (): Schema<UserId> => data.string() as Schema<UserId>,
  email: (): Schema<Email> => data.string().email() as Schema<Email>,
  url: (): Schema<URL> => data.string().url() as Schema<URL>,
}

// Usage with branded inference
const UserWithBrandedTypes = data.schema({
  id: createBrandedSchema.userId(),
  email: createBrandedSchema.email(),
  website: createBrandedSchema.url().optional(),
})

type BrandedUser = InferSchemaType<typeof UserWithBrandedTypes>
// BrandedUser = {
//   id: UserId
//   email: Email
//   website?: URL
// }

// Type-safe operations
const processUser = (user: BrandedUser) => {
  const userId: UserId = user.id // ✅ Type-safe
  const email: Email = user.email // ✅ Type-safe

  // const invalidId: UserId = 'plain-string' // ❌ TypeScript error
}
```

## Template Literal Type Inference

### **URL Pattern Inference**

```typescript
// Infer URL parameters from template strings
type ExtractParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? { [K in Param]: string } & ExtractParams<Rest>
  : T extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : {}

// Type-safe URL builder
function typedGet<T extends string>(
  url: T,
  params: ExtractParams<T>,
  options?: ServiceOptions
): Promise<Result<ServiceError, unknown>> {
  const finalUrl = Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`:${key}`, value),
    url
  )
  return service.get(finalUrl, options)
}

// Usage with inferred parameter types
const userResult = typedGet('/users/:id/posts/:postId', {
  id: 'user123', // ✅ Required parameter
  postId: 'post456', // ✅ Required parameter
})

// This would cause a TypeScript error:
// const invalidResult = typedGet('/users/:id/posts/:postId', {
//   id: 'user123'  // ❌ Missing postId parameter
// })
```

### **Query String Inference**

```typescript
// Infer query parameters from options
type QueryParams<T> = T extends { query: infer Q }
  ? Q extends Record<string, any>
    ? Q
    : never
  : never

type WithQuery<T extends ServiceOptions> = T & {
  query: Record<string, string | number | boolean>
}

function getWithQuery<T extends WithQuery<ServiceOptions>>(
  url: string,
  options: T
): Promise<Result<ServiceError, unknown>> {
  const queryString = new URLSearchParams(
    Object.entries(options.query).map(([k, v]) => [k, String(v)])
  ).toString()

  return service.get(`${url}?${queryString}`, options)
}

// Usage with inferred query types
const searchResult = getWithQuery('/users', {
  query: {
    name: 'john',
    age: 25,
    active: true,
  },
  cache: true,
})
```

## Development-Time Type Checking

### **Compile-Time Validation**

```typescript
// Compile-time tests for type inference
type TypeTest<T, U> = T extends U ? (U extends T ? true : false) : false

// Test schema inference
type UserSchemaTest = TypeTest<
  InferSchemaType<typeof UserSchema>,
  {
    name: string
    email: string
    age: number
    profile: {
      bio?: string
      avatar?: string
    }
  }
>

const userSchemaTest: UserSchemaTest = true // ✅ Passes if types match

// Test service inference
type ServiceTest = TypeTest<Awaited<ReturnType<typeof service.get>>, Result<ServiceError, unknown>>

const serviceTest: ServiceTest = true // ✅ Passes if types match

// Test pipeline inference
type PipelineTest = TypeTest<
  ReturnType<typeof pipeline.map<number, string>>,
  Result<PipelineError, string[]> | Promise<Result<PipelineError, string[]>>
>

const pipelineTest: PipelineTest = true // ✅ Passes if types match
```

### **Runtime Type Validation**

```typescript
// Validate inferred types at runtime in development
const validateInferredType = <T>(schema: Schema<T>, inferredValue: T): boolean => {
  const validationResult = data.validate(inferredValue, schema)
  return Result.isOk(validationResult)
}

// Development-mode type checking
if (process.env.NODE_ENV === 'development') {
  const users = await service.get('/users', { validate: UserSchema })

  if (Result.isOk(users)) {
    const isValidInference = validateInferredType(UserSchema, users.value)
    if (!isValidInference) {
      console.warn('Type inference mismatch detected')
    }
  }
}
```

## IDE Integration and Developer Experience

### **IntelliSense Enhancement**

````typescript
// JSDoc comments for better IDE support
/**
 * Get data from a service endpoint with automatic type inference
 *
 * @template T - The expected response type (inferred from validation schema)
 * @param url - The endpoint URL
 * @param options - Request options including validation schema
 * @returns Promise resolving to Result with inferred type
 *
 * @example
 * ```typescript
 * // Type automatically inferred as User[]
 * const users = await service.get('/users', { validate: UserSchema })
 * ```
 */
declare function enhancedGet<T>(
  url: string,
  options?: ServiceOptions & { validate?: Schema<T> }
): Promise<Result<ServiceError | ValidationError, T>>

// Hover tooltips show inferred types
const result = enhancedGet('/users', { validate: UserSchema })
//    ^ Hover shows: Promise<Result<ServiceError | ValidationError, User[]>>
````

### **Type Error Improvements**

```typescript
// Custom error messages for better developer experience
type RequiresValidation<T> = T extends { validate: Schema<any> }
  ? T
  : {
      error: 'This operation requires a validation schema. Add { validate: YourSchema } to options.'
      suggestion: "Example: service.get('/users', { validate: UserSchema })"
    }

function strictGet<T extends ServiceOptions>(
  url: string,
  options: RequiresValidation<T>
): Promise<Result<ServiceError, unknown>> {
  return service.get(url, options as any)
}

// Clear error message for missing validation
// const badResult = strictGet('/users', { cache: true })
// Error: This operation requires a validation schema...
```

## Performance Considerations

### **Type Compilation Performance**

```typescript
// Optimize complex type operations
type OptimizedInference<T> =
  T extends Schema<infer U>
    ? U
    : T extends Promise<infer U>
      ? U
      : T extends Result<any, infer U>
        ? U
        : T

// Avoid deeply nested conditional types
type SimpleTransform<T, U> = (input: T) => U
type ComplexTransform<T, U> = T extends string
  ? U extends number
    ? (input: T) => U
    : never
  : T extends number
    ? U extends string
      ? (input: T) => U
      : never
    : never // This gets complex quickly

// Prefer simple, composed types
type BasicTypes = string | number | boolean
type ComplexTypes = Record<string, BasicTypes> | BasicTypes[]
```

## Best Practices

### **1. Favor Type Inference Over Explicit Types**

```typescript
// ✅ Good: Let TypeScript infer
const users = await service.get('/users', { validate: UserSchema })
const processed = pipeline.map(users, enrichUser)

// ❌ Bad: Explicit types when inference works
const users: Promise<Result<ServiceError | ValidationError, User[]>> = await service.get('/users', {
  validate: UserSchema,
})
```

### **2. Use Schemas for Type Definition**

```typescript
// ✅ Good: Schema-driven types
const UserSchema = data.schema({
  name: data.string(),
  email: data.string().email(),
})
type User = InferSchemaType<typeof UserSchema>

// ❌ Bad: Duplicate type definitions
type User = {
  name: string
  email: string
}
const UserSchema = data.schema({
  name: data.string(),
  email: data.string().email(),
})
```

### **3. Leverage Generic Constraints**

```typescript
// ✅ Good: Constrained generics
function processArray<T extends Record<string, unknown>>(
  items: T[],
  transform: (item: T) => T
): Result<PipelineError, T[]> {
  return pipeline.map(items, transform)
}

// ❌ Bad: Unconstrained generics
function processArray<T>(items: T[], transform: (item: T) => T): Result<PipelineError, T[]> {
  return pipeline.map(items, transform)
}
```

---

**Next**: See [Naming Conventions](./naming-conventions.md) for consistent naming patterns across the three pillars.
