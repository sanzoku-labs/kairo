# Function Signatures - API Design Standards ✅ IMPLEMENTED

> **Consistent function signature patterns across all three pillars**  
> **Status: ✅ All signature patterns implemented and working across all pillars**

## Design Philosophy ✅ Fully Implemented

All Kairo V2 functions follow **consistent signature patterns** that prioritize:
- ✅ **Predictability** - Same patterns everywhere - **IMPLEMENTED**
- ✅ **TypeScript inference** - Minimal type annotations needed - **IMPLEMENTED**
- ✅ **Progressive enhancement** - Simple by default, configurable when needed - **IMPLEMENTED**
- ✅ **Result pattern** - Safe error handling throughout - **IMPLEMENTED**

## Universal Signature Pattern

### **✅ Standard Function Signature - IMPLEMENTED**
```typescript
// IMPLEMENTED PATTERN - Working across all 23 methods
pillar.method<TInput, TOutput>(
  required: RequiredParams,
  optional?: OptionalParams,
  options?: MethodOptions
): Result<PillarError, TOutput> | Promise<Result<PillarError, TOutput>>
```

**Implementation Status**: ✅ **All 23 core methods follow this exact pattern**

### **Signature Components**

#### **1. Generic Type Parameters**
```typescript
// Input and output types for full inference
service.get<User>('/users/123')           // User inferred for response
pipeline.map<User, UserView>(users, transform)  // Both types explicit
data.validate<User>(input, UserSchema)    // User inferred from schema
```

#### **2. Required Parameters**
```typescript
// Always first parameter(s) - never optional
service.get(url)           // URL is required
pipeline.map(data, fn)     // Data and function required  
data.validate(input, schema) // Input and schema required
```

#### **3. Optional Data Parameters**
```typescript
// Data parameters that may be optional for some methods
service.post(url, data)         // Data required for POST
service.get(url)                // No data for GET
pipeline.reduce(data, fn, initial) // Initial value required for reduce
```

#### **4. Options Parameter**
```typescript
// Always last parameter, always optional
service.get(url, options)
pipeline.map(data, fn, options)
data.validate(input, schema, options)
```

## Pillar-Specific Patterns

### **SERVICE Pillar Signatures**

#### **Basic CRUD Operations**
```typescript
// GET - No data parameter
service.get<TResponse>(
  url: string,
  options?: GetOptions
): Promise<Result<ServiceError, TResponse>>

// POST/PUT - Data parameter
service.post<TData, TResponse>(
  url: string,
  data: TData,
  options?: PostOptions
): Promise<Result<ServiceError, TResponse>>

// DELETE - Optional return data
service.delete<TResponse = void>(
  url: string,
  options?: DeleteOptions
): Promise<Result<ServiceError, TResponse>>
```

#### **Advanced Operations**
```typescript
// Batch operations
service.batch<TResponse>(
  requests: BatchRequest[],
  options?: BatchOptions
): Promise<Result<ServiceError, TResponse[]>>

// Streaming
service.stream<TData>(
  url: string,
  options?: StreamOptions
): AsyncIterable<Result<ServiceError, TData>>

// Upload with progress
service.upload<TResponse>(
  url: string,
  files: File | File[] | FormData,
  options?: UploadOptions
): Promise<Result<ServiceError, TResponse>>
```

### **PIPELINE Pillar Signatures**

#### **Collection Operations**
```typescript
// Map transformation
pipeline.map<TInput, TOutput>(
  data: TInput[],
  transform: (item: TInput, index: number) => TOutput,
  options?: MapOptions
): Result<PipelineError, TOutput[]>

// Filter predicate
pipeline.filter<T>(
  data: T[],
  predicate: (item: T, index: number) => boolean,
  options?: FilterOptions
): Result<PipelineError, T[]>

// Reduce aggregation
pipeline.reduce<TInput, TOutput>(
  data: TInput[],
  reducer: (acc: TOutput, item: TInput, index: number) => TOutput,
  initialValue: TOutput,
  options?: ReduceOptions
): Result<PipelineError, TOutput>
```

#### **Composition Operations**
```typescript
// Function composition
pipeline.compose<TInput, TOutput>(
  operations: PipelineOperation[],
  options?: ComposeOptions
): (data: TInput) => Result<PipelineError, TOutput>

// Data pipeline chaining
pipeline.chain<TInput, TOutput>(
  data: TInput,
  operations: ChainOperation<any>[],
  options?: ChainOptions
): Result<PipelineError, TOutput>
```

#### **Control Flow Operations**
```typescript
// Branching logic
pipeline.branch<TInput, TOutput>(
  data: TInput,
  condition: (data: TInput) => boolean | string,
  branches: Record<string | 'true' | 'false', PipelineOperation<TInput, TOutput>>,
  options?: BranchOptions
): Result<PipelineError, TOutput>

// Parallel execution
pipeline.parallel<TInput, TOutput>(
  data: TInput,
  operations: ParallelOperation<TInput, any>[],
  options?: ParallelOptions
): Result<PipelineError, TOutput>
```

### **DATA Pillar Signatures**

#### **Schema Operations**
```typescript
// Schema creation
data.schema<T>(
  definition: SchemaDefinition<T>,
  options?: SchemaOptions
): Schema<T>

// Validation
data.validate<T>(
  input: unknown,
  schema: Schema<T>,
  options?: ValidationOptions
): Result<ValidationError, T>

// Partial validation
data.partial<T>(
  input: Partial<T>,
  schema: Schema<T>,
  options?: PartialValidationOptions
): Result<ValidationError, Partial<T>>
```

#### **Transformation Operations**
```typescript
// Data transformation
data.transform<TInput, TOutput>(
  input: TInput,
  mapping: TransformMapping<TInput, TOutput>,
  options?: TransformOptions
): Result<TransformError, TOutput>

// Normalization
data.normalize<T>(
  input: T,
  strategy: NormalizationStrategy,
  options?: NormalizeOptions
): Result<DataError, T>
```

#### **Aggregation Operations**
```typescript
// Statistical aggregation
data.aggregate<T, R = AggregateResult>(
  input: T[],
  operations: AggregateOperations,
  options?: AggregateOptions
): Result<DataError, R>

// Data grouping
data.groupBy<T, K extends keyof T>(
  input: T[],
  keys: K | K[] | ((item: T) => string),
  options?: GroupByOptions
): Result<DataError, Record<string, T[]>>
```

## Async vs Sync Patterns

### **Synchronous Operations**
```typescript
// Pure data operations (DATA and PIPELINE)
const result = data.validate(input, schema)         // Sync
const transformed = pipeline.map(data, transform)   // Sync
const filtered = pipeline.filter(data, predicate)   // Sync
```

### **Asynchronous Operations**
```typescript
// External operations (SERVICE)
const response = await service.get('/api/data')     // Always async
const created = await service.post('/api/users', userData) // Always async

// Pipeline operations with async functions
const processed = await pipeline.map(data, asyncTransform, { async: true })
const validated = await pipeline.validate(data, asyncValidator)
```

### **Mixed Async Support**
```typescript
// Operations that can be both sync/async based on usage
pipeline.map(data, syncTransform)      // Sync when transform is sync
pipeline.map(data, asyncTransform, { async: true }) // Async when needed

data.transform(input, syncMapping)     // Sync transformation
data.transform(input, asyncMapping, { async: true }) // Async transformation
```

## Error Handling Patterns

### **Result Type Returns**
```typescript
// All functions return Result<Error, Data>
type Result<E, T> = 
  | { success: true, value: T }
  | { success: false, error: E }

// Usage pattern
const result = data.validate(input, schema)
if (result.success) {
  console.log('Valid data:', result.value) // T
} else {
  console.error('Validation failed:', result.error) // ValidationError
}
```

### **Error Type Hierarchy**
```typescript
// Base error for each pillar
interface ServiceError extends KairoError {
  code: 'SERVICE_ERROR'
  operation: string
  url?: string
  status?: number
}

interface PipelineError extends KairoError {
  code: 'PIPELINE_ERROR'
  operation: string
  stage?: string
  index?: number
}

interface DataError extends KairoError {
  code: 'DATA_ERROR'
  operation: string
  field?: string
  value?: unknown
}
```

## Type Inference Guidelines

### **Automatic Inference**
```typescript
// TypeScript should infer types without explicit annotations
const users = await service.get('/users') // Type inferred from response
const adult = pipeline.filter(users, u => u.age >= 18) // Type maintained
const valid = data.validate(userData, UserSchema) // Type from schema
```

### **Explicit Type Annotations**
```typescript
// When inference needs help or for clarity
const response = await service.get<User[]>('/users')
const mapped = pipeline.map<User, UserView>(users, toUserView)
const validated = data.validate<CreateUserRequest>(input, CreateUserSchema)
```

### **Generic Constraints**
```typescript
// Constrain generics for type safety
interface TransformMapping<TInput, TOutput> {
  [K in keyof TOutput]: 
    | keyof TInput 
    | ((input: TInput) => TOutput[K])
}

// Ensures mapping keys match output type
const mapping: TransformMapping<ApiUser, DomainUser> = {
  id: 'user_id',          // Maps to ApiUser.user_id
  name: 'full_name',      // Maps to ApiUser.full_name
  createdAt: (api) => new Date(api.created_timestamp) // Computed
}
```

## Options Parameter Patterns

### **Consistent Options Structure**
```typescript
// Base options for all methods
interface BaseOptions {
  debug?: boolean | DebugConfig
  cache?: boolean | CacheConfig
  timeout?: number
}

// Pillar-specific extensions
interface ServiceOptions extends BaseOptions {
  headers?: Record<string, string>
  params?: Record<string, unknown>
  retry?: boolean | RetryConfig
}

interface PipelineOptions extends BaseOptions {
  async?: boolean
  parallel?: boolean | ParallelConfig
  fallback?: unknown | FallbackFunction
}

interface DataOptions extends BaseOptions {
  strict?: boolean
  coerce?: boolean
  context?: Record<string, unknown>
}
```

### **Option Type Patterns**
```typescript
// Boolean flags with object alternatives
cache?: boolean | CacheConfig           // true = default config
retry?: boolean | RetryConfig           // true = default retry
async?: boolean | AsyncConfig           // true = default async

// Union types for strategies
strategy?: 'merge' | 'replace' | 'deep' | CustomStrategy
format?: 'json' | 'csv' | 'xml' | CustomFormat
method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
```

## Validation and Runtime Checks

### **Parameter Validation**
```typescript
// Runtime validation for development
function validateParameters(url: string, options?: ServiceOptions) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL parameter is required and must be a string')
  }
  
  if (options?.timeout && options.timeout < 0) {
    throw new Error('Timeout must be positive')
  }
  
  // Additional validations...
}
```

### **TypeScript Compile-Time Checks**
```typescript
// Ensure proper typing at compile time
type ValidateMapping<TInput, TOutput> = {
  [K in keyof TOutput]: 
    K extends keyof TInput 
      ? TInput[K] extends TOutput[K] 
        ? K 
        : never
      : never
} extends Record<keyof TOutput, never> 
  ? never 
  : TransformMapping<TInput, TOutput>
```

---

**Next**: [Configuration Patterns](./configuration-patterns.md) - Options object design standards