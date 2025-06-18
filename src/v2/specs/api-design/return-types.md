# Return Types

> **Result patterns, promise handling, and type safety for Kairo V2 APIs**

## Overview

Kairo V2 uses consistent return types across all three pillars, emphasizing the Result pattern for explicit error handling and predictable async behavior. This document defines return type strategies, patterns, and implementation details.

## Core Return Type Principles

### **1. Result Pattern Everywhere**
```typescript
// All operations return Result<Error, Value>
const users: Result<ServiceError, User[]> = await service.get('/users')
const valid: Result<ValidationError, User> = data.validate(user, UserSchema)
const mapped: Result<PipelineError, ProcessedUser[]> = pipeline.map(users, transform)

// No exceptions thrown - all errors are values
if (Result.isOk(users)) {
  console.log(users.value)  // Type-safe access
} else {
  console.error(users.error) // Handle error explicitly
}
```

### **2. Async Operations Return Promise<Result>**
```typescript
// Async operations wrap Result in Promise
type ServiceMethod<T> = (
  url: string, 
  options?: ServiceOptions
) => Promise<Result<ServiceError, T>>

type DataMethod<T, U> = (
  input: T,
  options?: DataOptions  
) => Result<ValidationError, U> | Promise<Result<ValidationError, U>>

type PipelineMethod<T, U> = (
  input: T[],
  transform: (item: T) => U,
  options?: PipelineOptions
) => Result<PipelineError, U[]> | Promise<Result<PipelineError, U[]>>
```

### **3. Type Inference from Schemas**
```typescript
// Return types inferred from input schemas
const UserSchema = data.schema({
  name: data.string(),
  email: data.string().email(),
  age: data.number().min(0)
})

// TypeScript infers User type from schema
const users = await service.get('/users', { validate: UserSchema })
// users: Promise<Result<ServiceError | ValidationError, User[]>>

if (Result.isOk(users)) {
  users.value // Typed as User[]
  users.value[0].name // Typed as string
  users.value[0].email // Typed as string  
  users.value[0].age // Typed as number
}
```

## Pillar-Specific Return Types

### **SERVICE Pillar Return Types**

```typescript
// Service method return types
interface ServiceMethods {
  get<T = unknown>(
    url: string, 
    options?: ServiceOptions
  ): Promise<Result<ServiceError, T>>
  
  post<T = unknown, U = unknown>(
    url: string,
    body: T,
    options?: ServiceOptions
  ): Promise<Result<ServiceError, U>>
  
  put<T = unknown, U = unknown>(
    url: string,
    body: T, 
    options?: ServiceOptions
  ): Promise<Result<ServiceError, U>>
  
  patch<T = unknown, U = unknown>(
    url: string,
    body: Partial<T>,
    options?: ServiceOptions  
  ): Promise<Result<ServiceError, U>>
  
  delete<T = unknown>(
    url: string,
    options?: ServiceOptions
  ): Promise<Result<ServiceError, T>>
  
  // Advanced methods
  batch(
    requests: BatchRequest[]
  ): Promise<Result<ServiceError, BatchResult[]>>
  
  stream<T = unknown>(
    url: string,
    options?: StreamOptions
  ): AsyncIterableIterator<Result<ServiceError, T>>
}

// Service error types
type ServiceError = {
  code: 'SERVICE_ERROR'
  operation: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'batch' | 'stream'
  message: string
  httpStatus?: number
  url?: string
  timeout?: boolean
  networkError?: boolean
  context?: Record<string, unknown>
}

// Examples with type inference
const examples = {
  // Basic GET - unknown type
  basicGet: async () => {
    const result = await service.get('/users')
    // result: Result<ServiceError, unknown>
    return result
  },
  
  // GET with validation - inferred type
  validatedGet: async () => {
    const result = await service.get('/users', { validate: UserSchema })
    // result: Result<ServiceError | ValidationError, User[]>
    return result
  },
  
  // POST with typed body and response
  typedPost: async (userData: CreateUserRequest) => {
    const result = await service.post<CreateUserRequest, User>('/users', userData)
    // result: Result<ServiceError, User>
    return result
  }
}
```

### **DATA Pillar Return Types**

```typescript
// Data method return types
interface DataMethods {
  // Schema creation (sync)
  schema<T>(definition: SchemaDefinition<T>): Schema<T>
  
  // Validation (sync)
  validate<T>(
    input: unknown,
    schema: Schema<T>,
    options?: ValidationOptions
  ): Result<ValidationError, T>
  
  // Partial validation (sync)
  partial<T>(
    input: unknown,
    schema: Schema<T>,
    options?: ValidationOptions
  ): Result<ValidationError, Partial<T>>
  
  // Transformation (sync/async based on options)
  transform<T, U>(
    input: T,
    schema: Schema<U>,
    options?: TransformOptions
  ): Result<ValidationError, U> | Promise<Result<ValidationError, U>>
  
  // Aggregation (sync/async based on data size)
  aggregate<T>(
    input: T[],
    options: AggregationOptions
  ): Result<ValidationError, AggregationResult<T>> | 
     Promise<Result<ValidationError, AggregationResult<T>>>
  
  // Analysis (async for large datasets)
  analyze<T>(
    input: T[],
    options?: AnalysisOptions
  ): Promise<Result<ValidationError, AnalysisResult<T>>>
}

// Data error types
type ValidationError = {
  code: 'VALIDATION_ERROR'
  message: string
  field?: string
  expected?: string
  actual?: unknown
  fieldPath: string[]
  issues: ValidationIssue[]
}

// Examples with return type patterns
const dataExamples = {
  // Sync validation
  syncValidation: (input: unknown) => {
    const result = data.validate(input, UserSchema)
    // result: Result<ValidationError, User>
    
    if (Result.isOk(result)) {
      return result.value // User
    } else {
      return result.error // ValidationError
    }
  },
  
  // Async transformation
  asyncTransform: async (users: User[]) => {
    const result = await data.transform(users, EnrichedUserSchema, {
      async: true,
      enrich: true
    })
    // result: Result<ValidationError, EnrichedUser[]>
    return result
  },
  
  // Conditional async based on data size
  conditionalAsync: (data: SalesRecord[]) => {
    const result = data.aggregate(data, {
      groupBy: ['region'],
      sum: ['revenue']
    })
    
    // Returns sync Result for small datasets
    // Returns Promise<Result> for large datasets
    if (result instanceof Promise) {
      return result.then(r => Result.isOk(r) ? r.value : null)
    } else {
      return Result.isOk(result) ? result.value : null
    }
  }
}
```

### **PIPELINE Pillar Return Types**

```typescript
// Pipeline method return types
interface PipelineMethods {
  // Core transformations
  map<T, U>(
    input: T[],
    transform: (item: T, index: number) => U,
    options?: PipelineOptions
  ): Result<PipelineError, U[]> | Promise<Result<PipelineError, U[]>>
  
  filter<T>(
    input: T[],
    predicate: (item: T, index: number) => boolean,
    options?: PipelineOptions
  ): Result<PipelineError, T[]>
  
  reduce<T, U>(
    input: T[],
    reducer: (acc: U, item: T, index: number) => U,
    initial: U,
    options?: PipelineOptions
  ): Result<PipelineError, U> | Promise<Result<PipelineError, U>>
  
  // Composition
  compose<T>(...functions: Array<(input: T) => T>): (input: T) => Result<PipelineError, T>
  
  // Control flow
  branch<T, U>(
    input: T,
    condition: (input: T) => boolean,
    onTrue: (input: T) => U,
    onFalse: (input: T) => U,
    options?: PipelineOptions
  ): Result<PipelineError, U> | Promise<Result<PipelineError, U>>
  
  parallel<T, U>(
    input: T[],
    transform: (item: T) => Promise<U>,
    options?: ParallelOptions
  ): Promise<Result<PipelineError, U[]>>
}

// Pipeline error types
type PipelineError = {
  code: 'PIPELINE_ERROR'
  operation: 'map' | 'filter' | 'reduce' | 'compose' | 'branch' | 'parallel'
  message: string
  step?: number
  itemIndex?: number
  cause?: unknown
  context?: Record<string, unknown>
}

// Examples with async/sync patterns
const pipelineExamples = {
  // Sync operation
  syncMap: (numbers: number[]) => {
    const result = pipeline.map(numbers, x => x * 2)
    // result: Result<PipelineError, number[]>
    return result
  },
  
  // Async operation (when async: true)
  asyncMap: async (users: User[]) => {
    const result = await pipeline.map(users, enrichUser, { async: true })
    // result: Result<PipelineError, EnrichedUser[]>
    return result
  },
  
  // Parallel processing
  parallelMap: async (ids: string[]) => {
    const result = await pipeline.parallel(ids, fetchUser, {
      maxConcurrency: 10
    })
    // result: Result<PipelineError, User[]>
    return result
  },
  
  // Composition with error propagation
  composedOperation: (input: RawData) => {
    const composed = pipeline.compose(
      (data) => validateRawData(data),
      (data) => transformData(data),
      (data) => enrichData(data)
    )
    
    const result = composed(input)
    // result: Result<PipelineError, EnrichedData>
    return result
  }
}
```

## Cross-Pillar Return Type Composition

### **Chaining Results Across Pillars**
```typescript
// Type-safe composition across pillars
const processUserData = async (endpoint: string): Promise<Result<KairoError, ProcessedUser[]>> => {
  // SERVICE: Fetch data
  const serviceResult = await service.get(endpoint)
  if (Result.isErr(serviceResult)) {
    return serviceResult // ServiceError propagates
  }
  
  // DATA: Validate
  const dataResult = data.validate(serviceResult.value, UserArraySchema)
  if (Result.isErr(dataResult)) {
    return dataResult // ValidationError propagates
  }
  
  // PIPELINE: Transform
  const pipelineResult = pipeline.map(dataResult.value, enrichUser, { async: true })
  if (Result.isErr(pipelineResult)) {
    return pipelineResult // PipelineError propagates
  }
  
  return pipelineResult // Success with ProcessedUser[]
}

// Union error type for cross-pillar operations
type KairoError = ServiceError | ValidationError | PipelineError
```

### **Result Utilities for Composition**
```typescript
// Utility functions for working with Results
export const ResultUtils = {
  // Chain multiple Result-returning operations
  chain: <E, T, U>(
    result: Result<E, T>,
    fn: (value: T) => Result<E, U>
  ): Result<E, U> => {
    return Result.isOk(result) ? fn(result.value) : result
  },
  
  // Map over successful Results
  map: <E, T, U>(
    result: Result<E, T>,
    fn: (value: T) => U
  ): Result<E, U> => {
    return Result.isOk(result) ? Result.Ok(fn(result.value)) : result
  },
  
  // Combine multiple Results
  combine: <E, T>(
    results: Result<E, T>[]
  ): Result<E, T[]> => {
    const values: T[] = []
    
    for (const result of results) {
      if (Result.isErr(result)) {
        return result
      }
      values.push(result.value)
    }
    
    return Result.Ok(values)
  },
  
  // Convert Promise<Result> to Result<Promise>
  sequence: async <E, T>(
    promiseResult: Promise<Result<E, T>>
  ): Promise<Result<E, T>> => {
    return await promiseResult
  },
  
  // Parallel execution of multiple Promise<Result>
  all: async <E, T>(
    promiseResults: Promise<Result<E, T>>[]
  ): Promise<Result<E, T[]>> => {
    const results = await Promise.all(promiseResults)
    return ResultUtils.combine(results)
  }
}

// Usage examples
const compositionExamples = {
  // Chain operations
  chainExample: async () => {
    const result = await service.get('/users')
    
    return ResultUtils.chain(result, (users) =>
      ResultUtils.chain(
        data.validate(users, UserArraySchema),
        (validUsers) => pipeline.map(validUsers, enrichUser)
      )
    )
  },
  
  // Combine multiple operations
  combineExample: async () => {
    const [users, orders, config] = await Promise.all([
      service.get('/users'),
      service.get('/orders'), 
      service.get('/config')
    ])
    
    return ResultUtils.combine([users, orders, config])
  },
  
  // Parallel processing with Results
  parallelExample: async (userIds: string[]) => {
    const userPromises = userIds.map(id => service.get(`/users/${id}`))
    return await ResultUtils.all(userPromises)
  }
}
```

## Async Patterns and Behavior

### **Sync vs Async Decision Rules**
```typescript
// Rules for when operations are sync vs async
const asyncPatterns = {
  // Always sync
  alwaysSync: [
    'data.schema()',      // Schema creation
    'data.validate()',    // Basic validation
    'data.partial()',     // Partial validation
    'pipeline.filter()',  // Array filtering
    'pipeline.compose()'  // Function composition
  ],
  
  // Always async
  alwaysAsync: [
    'service.get()',      // HTTP requests
    'service.post()',     // HTTP requests
    'service.batch()',    // Batch operations
    'pipeline.parallel()', // Parallel processing
    'data.analyze()'      // Data analysis
  ],
  
  // Conditional async (based on options or data size)
  conditionalAsync: [
    'pipeline.map()',     // async: true or large arrays
    'pipeline.reduce()',  // async: true or complex reducers
    'data.transform()',   // async: true or complex transforms
    'data.aggregate()'    // Large datasets auto-async
  ]
}

// Implementation pattern for conditional async
const conditionalAsyncExample = <T, U>(
  input: T[],
  transform: (item: T) => U,
  options: PipelineOptions = {}
): Result<PipelineError, U[]> | Promise<Result<PipelineError, U[]>> => {
  
  const shouldBeAsync = 
    options.async === true ||
    options.parallel === true ||
    input.length > 10000
  
  if (shouldBeAsync) {
    return processAsync(input, transform, options)
  } else {
    return processSync(input, transform, options)
  }
}
```

### **Promise Handling Patterns**
```typescript
// Standard patterns for handling Promise<Result>
const promisePatterns = {
  // Basic await pattern
  basicAwait: async () => {
    const result = await service.get('/users')
    if (Result.isOk(result)) {
      return result.value
    } else {
      throw new Error(result.error.message)
    }
  },
  
  // Safe await with fallback
  safeAwait: async () => {
    const result = await service.get('/users')
    return Result.unwrapOr(result, []) // Empty array fallback
  },
  
  // Pattern matching
  patternMatch: async () => {
    const result = await service.get('/users')
    return Result.match(result, {
      Ok: (users) => users.map(u => u.name),
      Err: (error) => [`Error: ${error.message}`]
    })
  },
  
  // Chaining with then
  chainWithThen: () => {
    return service.get('/users')
      .then(result => Result.isOk(result) 
        ? data.validate(result.value, UserArraySchema)
        : result
      )
      .then(result => Result.isOk(result)
        ? pipeline.map(result.value, enrichUser)
        : result
      )
  }
}
```

## Type Safety and Inference

### **Generic Type Constraints**
```typescript
// Constrain types for better inference
interface TypedServiceMethods {
  get<T extends Record<string, unknown>>(
    url: string,
    options?: ServiceOptions & { validate: Schema<T> }
  ): Promise<Result<ServiceError | ValidationError, T>>
  
  get<T = unknown>(
    url: string,
    options?: ServiceOptions
  ): Promise<Result<ServiceError, T>>
}

// Schema-based type inference
type InferSchemaType<S> = S extends Schema<infer T> ? T : never

const createTypedRequest = <S extends Schema<any>>(schema: S) => {
  return async (url: string): Promise<Result<ServiceError | ValidationError, InferSchemaType<S>>> => {
    return await service.get(url, { validate: schema })
  }
}

// Usage with full type inference
const getUsersTyped = createTypedRequest(UserArraySchema)
// getUsersTyped: (url: string) => Promise<Result<ServiceError | ValidationError, User[]>>
```

### **Error Type Discrimination**
```typescript
// Type guards for error handling
const isServiceError = (error: KairoError): error is ServiceError => {
  return error.code === 'SERVICE_ERROR'
}

const isValidationError = (error: KairoError): error is ValidationError => {
  return error.code === 'VALIDATION_ERROR'
}

const isPipelineError = (error: KairoError): error is PipelineError => {
  return error.code === 'PIPELINE_ERROR'
}

// Type-safe error handling
const handleKairoError = (error: KairoError): string => {
  if (isServiceError(error)) {
    if (error.httpStatus === 404) {
      return 'Resource not found'
    }
    if (error.timeout) {
      return 'Request timed out'
    }
    return `Service error: ${error.message}`
  }
  
  if (isValidationError(error)) {
    return `Validation failed: ${error.issues.map(i => i.message).join(', ')}`
  }
  
  if (isPipelineError(error)) {
    return `Processing failed at step ${error.step}: ${error.message}`
  }
  
  return 'Unknown error occurred'
}
```

## Testing Return Types

### **Type Testing**
```typescript
// Compile-time type tests
type TypeTests = {
  // Service return types
  serviceGet: Expect<
    ReturnType<typeof service.get>,
    Promise<Result<ServiceError, unknown>>
  >
  
  serviceGetWithValidation: Expect<
    ReturnType<typeof service.get<User>>,
    Promise<Result<ServiceError, User>>
  >
  
  // Data return types
  dataValidate: Expect<
    ReturnType<typeof data.validate<User>>,
    Result<ValidationError, User>
  >
  
  // Pipeline return types
  pipelineMap: Expect<
    ReturnType<typeof pipeline.map<string, number>>,
    Result<PipelineError, number[]> | Promise<Result<PipelineError, number[]>>
  >
}

// Runtime type tests
describe('Return types', () => {
  it('should return correct Result type from service.get', async () => {
    const result = await service.get('/users')
    
    expect(result).toHaveProperty('tag')
    expect(['Ok', 'Err']).toContain(result.tag)
    
    if (result.tag === 'Ok') {
      expect(result).toHaveProperty('value')
    } else {
      expect(result).toHaveProperty('error')
      expect(result.error).toHaveProperty('code', 'SERVICE_ERROR')
    }
  })
  
  it('should infer types from schema validation', async () => {
    const result = await service.get('/users', { validate: UserArraySchema })
    
    if (Result.isOk(result)) {
      // TypeScript should know this is User[]
      expect(Array.isArray(result.value)).toBe(true)
      if (result.value.length > 0) {
        expect(result.value[0]).toHaveProperty('name')
        expect(result.value[0]).toHaveProperty('email')
      }
    }
  })
})
```

## Best Practices

### **1. Consistent Result Handling**
```typescript
// ✅ Good: Consistent Result patterns
const processData = async (input: unknown) => {
  const validationResult = data.validate(input, Schema)
  if (Result.isErr(validationResult)) {
    return validationResult
  }
  
  const processingResult = pipeline.map(validationResult.value, transform)
  if (Result.isErr(processingResult)) {
    return processingResult
  }
  
  return processingResult
}

// ❌ Bad: Mixed error handling
const processDataBad = async (input: unknown) => {
  try {
    const validationResult = data.validate(input, Schema)
    if (Result.isErr(validationResult)) {
      throw new Error(validationResult.error.message)
    }
    
    return pipeline.map(validationResult.value, transform)
  } catch (error) {
    return null
  }
}
```

### **2. Type-Safe Error Handling**
```typescript
// ✅ Good: Type-safe error discrimination
const handleResult = (result: Result<KairoError, User>) => {
  if (Result.isErr(result)) {
    if (isServiceError(result.error)) {
      // Handle service errors
    } else if (isValidationError(result.error)) {
      // Handle validation errors
    }
  }
}

// ❌ Bad: Unsafe error casting
const handleResultBad = (result: Result<KairoError, User>) => {
  if (Result.isErr(result)) {
    const serviceError = result.error as ServiceError
    // Might crash if it's not a ServiceError
  }
}
```

### **3. Proper Async/Sync Usage**
```typescript
// ✅ Good: Respect sync/async patterns
const processUsers = async (users: User[]) => {
  // Sync validation
  const validationResult = data.validate(users, UserArraySchema)
  
  // Async processing when needed
  const processingResult = await pipeline.map(users, enrichUser, { async: true })
  
  return processingResult
}

// ❌ Bad: Unnecessary async
const processUsersBad = async (users: User[]) => {
  // Don't await sync operations
  const validationResult = await data.validate(users, UserArraySchema)
  
  return validationResult
}
```

---

**Next**: See [Type Inference](./type-inference.md) for advanced TypeScript patterns and inference strategies.