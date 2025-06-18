# Naming Conventions

> **Consistent naming patterns and standards for Kairo V2's three-pillar architecture**

## Overview

Kairo V2 uses consistent, predictable naming conventions across all three pillars to create a unified developer experience. This document defines naming standards for methods, options, types, and patterns.

## Core Naming Principles

### **1. Clarity Over Brevity**
```typescript
// ✅ Good: Clear, descriptive names
service.get()           // Clear HTTP method
data.validate()         // Clear action
pipeline.map()          // Clear transformation

// ❌ Bad: Abbreviated or unclear names
service.req()           // Unclear abbreviation
data.val()             // Too brief
pipeline.xform()       // Unclear transformation
```

### **2. Consistent Verbs Across Pillars**
```typescript
// Same verbs used consistently across pillars
service.get()          // Retrieve data
data.get()             // Extract from object
pipeline.get()         // Access pipeline result

service.create()       // Create resource
data.create()          // Create schema/instance
pipeline.create()      // Create pipeline

service.transform()    // Transform request/response
data.transform()       // Transform data structure
pipeline.transform()   // Transform through pipeline
```

### **3. Domain-Specific Clarity**
```typescript
// Pillar-specific operations use domain language
// SERVICE: HTTP-specific terms
service.get()          // HTTP GET
service.post()         // HTTP POST
service.batch()        // HTTP batch requests
service.upload()       // HTTP file upload

// DATA: Data operation terms
data.validate()        // Schema validation
data.aggregate()       // Data aggregation
data.normalize()       // Data normalization
data.serialize()       // Data serialization

// PIPELINE: Flow control terms
pipeline.map()         // Collection mapping
pipeline.filter()      // Collection filtering
pipeline.branch()      // Conditional flow
pipeline.parallel()    // Parallel execution
```

## Method Naming Conventions

### **SERVICE Pillar Methods**
```typescript
interface ServiceMethods {
  // Core HTTP methods (standard HTTP verbs)
  get(url: string, options?: ServiceOptions): Promise<Result<ServiceError, unknown>>
  post(url: string, body: unknown, options?: ServiceOptions): Promise<Result<ServiceError, unknown>>
  put(url: string, body: unknown, options?: ServiceOptions): Promise<Result<ServiceError, unknown>>
  patch(url: string, body: unknown, options?: ServiceOptions): Promise<Result<ServiceError, unknown>>
  delete(url: string, options?: ServiceOptions): Promise<Result<ServiceError, unknown>>
  
  // Advanced HTTP operations (descriptive verbs)
  batch(requests: BatchRequest[]): Promise<Result<ServiceError, BatchResult[]>>
  stream(url: string, options?: StreamOptions): AsyncIterableIterator<Result<ServiceError, unknown>>
  upload(url: string, file: File, options?: UploadOptions): Promise<Result<ServiceError, UploadResult>>
  
  // Configuration methods (action + context)
  configure(options: GlobalServiceOptions): ServiceInstance
  create(baseURL: string, options?: ServiceOptions): ServiceInstance
  
  // Utility methods (is/has + descriptive)
  isError(result: unknown): result is ServiceError
  retryable(error: ServiceError): boolean
  buildURL(base: string, path: string, params?: Record<string, unknown>): string
  parseResponse(response: Response): Promise<Result<ServiceError, unknown>>
}
```

### **DATA Pillar Methods**
```typescript
interface DataMethods {
  // Schema operations (action + data type)
  schema<T>(definition: SchemaDefinition<T>): Schema<T>
  validate<T>(input: unknown, schema: Schema<T>, options?: ValidationOptions): Result<ValidationError, T>
  partial<T>(input: unknown, schema: Schema<T>, options?: ValidationOptions): Result<ValidationError, Partial<T>>
  
  // Transformation operations (action + transformation type)
  transform<T, U>(input: T, schema: Schema<U>, options?: TransformOptions): Result<ValidationError, U>
  normalize<T>(input: T, rules: NormalizationRules, options?: NormalizeOptions): Result<ValidationError, T>
  convert<T, U>(input: T, fromSchema: Schema<T>, toSchema: Schema<U>): Result<ValidationError, U>
  
  // Aggregation operations (action + aggregation type) 
  aggregate<T>(input: T[], options: AggregationOptions): Result<ValidationError, AggregationResult<T>>
  groupBy<T>(input: T[], key: keyof T | ((item: T) => string)): Result<ValidationError, Record<string, T[]>>
  pivot<T>(input: T[], rowKey: keyof T, colKey: keyof T, valueKey: keyof T): Result<ValidationError, PivotTable<T>>
  
  // Serialization operations (action + format)
  serialize<T>(input: T, format: 'json' | 'xml' | 'csv'): Result<ValidationError, string>
  deserialize<T>(input: string, format: 'json' | 'xml' | 'csv', schema: Schema<T>): Result<ValidationError, T>
  
  // Analysis operations (action + analysis type)
  analyze<T>(input: T[], options?: AnalysisOptions): Promise<Result<ValidationError, AnalysisResult<T>>>
  sample<T>(input: T[], count: number, method?: 'random' | 'systematic'): Result<ValidationError, T[]>
  
  // Utility operations (action + utility type)
  clone<T>(input: T, options?: CloneOptions): Result<ValidationError, T>
  diff<T>(left: T, right: T, options?: DiffOptions): Result<ValidationError, DiffResult<T>>
  merge<T>(target: T, ...sources: Partial<T>[]): Result<ValidationError, T>
}
```

### **PIPELINE Pillar Methods**
```typescript
interface PipelineMethods {
  // Core transformations (standard FP terms)
  map<T, U>(input: T[], transform: (item: T, index: number) => U, options?: PipelineOptions): Result<PipelineError, U[]>
  filter<T>(input: T[], predicate: (item: T, index: number) => boolean, options?: PipelineOptions): Result<PipelineError, T[]>
  reduce<T, U>(input: T[], reducer: (acc: U, item: T, index: number) => U, initial: U, options?: PipelineOptions): Result<PipelineError, U>
  flatMap<T, U>(input: T[], transform: (item: T, index: number) => U[], options?: PipelineOptions): Result<PipelineError, U[]>
  
  // Composition operations (action + composition type)
  compose<T>(...functions: Array<(input: T) => T>): (input: T) => Result<PipelineError, T>
  chain<T>(input: T, ...operations: Array<(input: T) => Result<PipelineError, T>>): Result<PipelineError, T>
  
  // Control flow operations (action + flow type)
  branch<T, U>(input: T, condition: (input: T) => boolean, onTrue: (input: T) => U, onFalse: (input: T) => U): Result<PipelineError, U>
  parallel<T, U>(input: T[], transform: (item: T) => Promise<U>, options?: ParallelOptions): Promise<Result<PipelineError, U[]>>
  retry<T>(operation: () => Result<PipelineError, T>, options: RetryOptions): Promise<Result<PipelineError, T>>
  
  // Validation operations (action + validation type)
  validate<T>(input: T[], schema: Schema<T>, options?: ValidationOptions): Result<PipelineError, T[]>
  guard<T>(input: T[], condition: (item: T) => boolean, options?: GuardOptions): Result<PipelineError, T[]>
  
  // Utility operations (action + utility type)
  tap<T>(input: T[], sideEffect: (item: T, index: number) => void, options?: TapOptions): Result<PipelineError, T[]>
  delay<T>(input: T[], ms: number, options?: DelayOptions): Promise<Result<PipelineError, T[]>>
  chunk<T>(input: T[], size: number, options?: ChunkOptions): Result<PipelineError, T[][]>
  stream<T, U>(input: AsyncIterable<T>, transform: (item: T) => U, options?: StreamOptions): AsyncIterableIterator<Result<PipelineError, U>>
}
```

## Option Property Naming

### **Common Option Patterns**
```typescript
// Consistent option names across pillars
interface BaseOptions {
  // Execution control
  async?: boolean          // Enable async execution
  parallel?: boolean       // Enable parallel processing
  timeout?: number         // Operation timeout in milliseconds
  
  // Error handling
  fallback?: unknown       // Fallback value on error
  continueOnError?: boolean // Continue processing on individual errors
  
  // Performance
  chunk?: number           // Process in chunks of this size
  maxConcurrency?: number  // Maximum concurrent operations
  
  // Debugging
  debug?: boolean          // Enable debug mode
  trace?: string          // Tracing identifier
  
  // Caching (when applicable)
  cache?: boolean | CacheConfig  // Enable caching or cache configuration
}
```

### **SERVICE-Specific Options**
```typescript
interface ServiceOptions extends BaseOptions {
  // HTTP configuration
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  
  // Request/Response handling
  json?: boolean           // Send/expect JSON
  form?: boolean          // Send as form data
  
  // Retry configuration
  retry?: boolean | RetryConfig
  
  // Validation integration
  validate?: Schema<any>   // Response validation schema
  
  // Transformation
  transform?: {
    request?: (data: unknown) => unknown
    response?: (data: unknown) => unknown
  }
  
  // Advanced features
  batch?: BatchConfig
  stream?: StreamConfig
  upload?: UploadConfig
}
```

### **DATA-Specific Options**
```typescript
interface DataOptions extends BaseOptions {
  // Validation behavior
  strict?: boolean         // Strict validation mode
  partial?: boolean        // Allow partial validation
  coerce?: boolean        // Enable type coercion
  stripUnknown?: boolean  // Remove unknown properties
  
  // Transformation behavior
  transform?: boolean | TransformConfig
  normalize?: boolean | NormalizeConfig
  
  // Aggregation configuration
  aggregation?: AggregationConfig
  
  // Output format
  format?: 'object' | 'array' | 'map'
  
  // Performance optimization
  memory?: 'low' | 'normal' | 'high'
}
```

### **PIPELINE-Specific Options**
```typescript
interface PipelineOptions extends BaseOptions {
  // Execution control
  ordered?: boolean        // Maintain order in parallel operations
  streaming?: boolean      // Enable streaming processing
  
  // Error handling
  retryItems?: boolean     // Retry failed individual items
  skipErrors?: boolean     // Skip items that cause errors
  
  // Control flow
  branch?: BranchConfig    // Conditional processing configuration
  
  // Performance
  itemTimeout?: number     // Timeout per item
  batchSize?: number      // Items per batch
}
```

## Type Naming Conventions

### **Error Type Naming**
```typescript
// Pillar-specific error types (Pillar + Error)
type ServiceError = {
  code: 'SERVICE_ERROR'
  operation: ServiceOperation
  // ... other properties
}

type ValidationError = {  // DATA pillar uses domain-specific name
  code: 'VALIDATION_ERROR'
  field?: string
  // ... other properties
}

type PipelineError = {
  code: 'PIPELINE_ERROR'
  operation: PipelineOperation
  // ... other properties
}

// Union type for cross-pillar operations
type KairoError = ServiceError | ValidationError | PipelineError
```

### **Configuration Type Naming**
```typescript
// Configuration types (Feature + Config)
type CacheConfig = {
  ttl: number
  strategy: 'memory' | 'redis' | 'filesystem'
  key?: string | ((context: any) => string)
}

type RetryConfig = {
  attempts: number
  delay?: number
  backoff?: 'linear' | 'exponential'
  maxDelay?: number
}

type AggregationConfig = {
  groupBy?: string[]
  sum?: string[]
  avg?: string[]
  count?: string[]
}

type BatchConfig = {
  maxSize: number
  timeout: number
  parallel?: boolean
}
```

### **Schema Type Naming**
```typescript
// Schema types (Domain + Schema)
const UserSchema = data.schema({
  name: data.string(),
  email: data.string().email()
})

const ProductSchema = data.schema({
  id: data.string(),
  name: data.string(),
  price: data.number().positive()
})

const OrderSchema = data.schema({
  id: data.string(),
  user: UserSchema,
  products: data.array(ProductSchema),
  total: data.number()
})

// Inferred types (Domain without Schema suffix)
type User = InferSchemaType<typeof UserSchema>
type Product = InferSchemaType<typeof ProductSchema>
type Order = InferSchemaType<typeof OrderSchema>
```

### **Result Type Naming**
```typescript
// Result types for specific operations
type ServiceResult<T> = Promise<Result<ServiceError, T>>
type ValidationResult<T> = Result<ValidationError, T>
type PipelineResult<T> = Result<PipelineError, T> | Promise<Result<PipelineError, T>>

// Specific operation results
type BatchResult = {
  success: boolean
  results: Result<ServiceError, unknown>[]
  errors: ServiceError[]
}

type AggregationResult<T> = {
  groups: Record<string, T[]>
  totals: Record<string, number>
  metadata: {
    totalItems: number
    processingTime: number
  }
}

type AnalysisResult<T> = {
  schema: Schema<T>
  statistics: Record<string, number>
  samples: T[]
  issues: string[]
}
```

## Variable and Parameter Naming

### **Function Parameters**
```typescript
// Clear, descriptive parameter names
service.get(
  url: string,              // Clear what this parameter represents
  options?: ServiceOptions  // Standard options pattern
)

data.validate(
  input: unknown,           // What we're validating
  schema: Schema<T>,        // Validation rules
  options?: ValidationOptions // Additional configuration
)

pipeline.map(
  input: T[],               // Input array
  transform: (item: T, index: number) => U,  // Transformation function
  options?: PipelineOptions // Processing options
)

// Consistent naming for similar concepts
pipeline.filter(
  input: T[],               // Same name for array input
  predicate: (item: T, index: number) => boolean,  // Domain-specific function name
  options?: PipelineOptions // Same options pattern
)
```

### **Callback Function Parameters**
```typescript
// Standard callback parameter names
interface CallbackPatterns {
  // Transform functions
  transform: (item: T, index: number) => U
  mapper: (item: T, index: number) => U
  
  // Predicate functions
  predicate: (item: T, index: number) => boolean
  condition: (item: T) => boolean
  filter: (item: T, index: number) => boolean
  
  // Reducer functions
  reducer: (accumulator: U, item: T, index: number) => U
  aggregator: (accumulator: U, item: T) => U
  
  // Side effect functions
  sideEffect: (item: T, index: number) => void
  callback: (item: T) => void
  
  // Error handlers
  onError: (error: KairoError, context?: any) => void
  errorHandler: (error: KairoError) => void
  
  // Key extractors
  keySelector: (item: T) => string
  groupBy: (item: T) => string
}
```

### **Local Variable Naming**
```typescript
// Consistent patterns for common variables
const processUserData = async () => {
  // Results from operations (operation + Result suffix)
  const serviceResult = await service.get('/users')
  const validationResult = data.validate(serviceResult, UserSchema)
  const pipelineResult = pipeline.map(validationResult, enrichUser)
  
  // Extracted values (descriptive domain names)
  const users = Result.unwrapOr(serviceResult, [])
  const validUsers = Result.unwrapOr(validationResult, [])
  const enrichedUsers = Result.unwrapOr(pipelineResult, [])
  
  // Configuration objects (feature + Config suffix)
  const cacheConfig = { ttl: 60000, strategy: 'memory' }
  const retryConfig = { attempts: 3, delay: 1000 }
  
  // Temporary/iteration variables (standard short names)
  for (const user of users) {         // Standard iteration variable
    const enriched = enrichUser(user) // Descriptive transformation result
  }
  
  return enrichedUsers
}
```

## File and Directory Naming

### **Source File Organization**
```
src/v2/
├── core/                    # Core infrastructure
│   ├── result.ts           # Result type implementation
│   ├── errors.ts           # Error type definitions
│   └── types.ts            # Common type definitions
├── service/                 # SERVICE pillar implementation
│   ├── index.ts            # Main exports
│   ├── client.ts           # HTTP client implementation
│   ├── cache.ts            # Caching functionality
│   ├── retry.ts            # Retry logic
│   └── types.ts            # Service-specific types
├── data/                    # DATA pillar implementation
│   ├── index.ts            # Main exports
│   ├── schema.ts           # Schema creation and validation
│   ├── transform.ts        # Data transformation
│   ├── aggregate.ts        # Aggregation operations
│   └── types.ts            # Data-specific types
└── pipeline/                # PIPELINE pillar implementation
    ├── index.ts            # Main exports
    ├── transform.ts        # Core transformations (map, filter, reduce)
    ├── compose.ts          # Composition operations
    ├── control.ts          # Control flow (branch, parallel, retry)
    └── types.ts            # Pipeline-specific types
```

### **Test File Naming**
```
src/v2/
├── service/
│   ├── __tests__/
│   │   ├── client.test.ts       # Unit tests for client.ts
│   │   ├── cache.test.ts        # Unit tests for cache.ts
│   │   └── integration.test.ts  # Integration tests
│   └── __fixtures__/
│       ├── responses.ts         # Test response data
│       └── schemas.ts           # Test schemas
├── data/
│   ├── __tests__/
│   │   ├── schema.test.ts       # Unit tests for schema.ts
│   │   ├── aggregate.test.ts    # Unit tests for aggregate.ts
│   │   └── integration.test.ts  # Integration tests
│   └── __fixtures__/
│       └── data.ts              # Test data sets
└── pipeline/
    ├── __tests__/
    │   ├── transform.test.ts    # Unit tests for transform.ts
    │   ├── compose.test.ts      # Unit tests for compose.ts
    │   └── integration.test.ts  # Integration tests
    └── __fixtures__/
        └── transforms.ts        # Test transformation functions
```

## Documentation Naming

### **JSDoc Patterns**
```typescript
/**
 * Retrieve data from a service endpoint with optional validation and caching.
 * 
 * This method performs an HTTP GET request and optionally validates the response
 * against a provided schema. Supports caching, retry logic, and request transformation.
 * 
 * @template T - The expected response type (inferred from validation schema)
 * @param url - The endpoint URL to request
 * @param options - Request configuration options
 * @param options.validate - Schema to validate the response against
 * @param options.cache - Caching configuration (boolean or detailed config)
 * @param options.retry - Retry configuration (boolean or detailed config)
 * @param options.timeout - Request timeout in milliseconds
 * @returns Promise resolving to Result containing the response data or error
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const users = await service.get('/users')
 * 
 * // With validation and caching
 * const users = await service.get('/users', {
 *   validate: UserArraySchema,
 *   cache: { ttl: 60000 },
 *   retry: { attempts: 3 }
 * })
 * ```
 * 
 * @see {@link ServiceOptions} for all available options
 * @see {@link UserArraySchema} for example validation schema
 */
async get<T>(
  url: string,
  options?: ServiceOptions & { validate?: Schema<T> }
): Promise<Result<ServiceError | ValidationError, T>>
```

### **README and Guide Naming**
```
docs/
├── getting-started.md       # Entry point documentation
├── api-reference/
│   ├── service-api.md       # SERVICE pillar API reference
│   ├── data-api.md          # DATA pillar API reference
│   └── pipeline-api.md      # PIPELINE pillar API reference
├── guides/
│   ├── error-handling.md    # Error handling patterns
│   ├── type-safety.md       # TypeScript usage
│   ├── performance.md       # Performance optimization
│   └── migration-guide.md   # V1 to V2 migration
└── examples/
    ├── basic-usage.md       # Simple examples
    ├── advanced-patterns.md # Complex usage patterns
    └── real-world-apps.md   # Full application examples
```

## Best Practices

### **1. Consistent Verb Usage**
```typescript
// ✅ Good: Consistent verbs across pillars
service.get()    // Retrieve
data.get()       // Extract/Access
pipeline.get()   // Access result

service.create() // Make new
data.create()    // Make new
pipeline.create() // Make new

// ❌ Bad: Different verbs for same concept
service.fetch()  // Retrieve
data.extract()   // Retrieve (different verb)
pipeline.obtain() // Retrieve (different verb)
```

### **2. Domain-Appropriate Language**
```typescript
// ✅ Good: Use domain language
service.upload()    // HTTP domain
data.aggregate()    // Data domain
pipeline.parallel() // Flow control domain

// ❌ Bad: Generic names that don't convey domain
service.send()      // Too generic
data.process()      // Too generic
pipeline.execute()  // Too generic
```

### **3. Avoid Abbreviations**
```typescript
// ✅ Good: Full words
service.configure()
data.validate()
pipeline.transform()

// ❌ Bad: Abbreviations
service.config()
data.val()
pipeline.xform()
```

### **4. Consistent Option Naming**
```typescript
// ✅ Good: Same option names across pillars
interface CommonOptions {
  timeout?: number      // Same everywhere
  fallback?: unknown   // Same everywhere
  debug?: boolean      // Same everywhere
}

// ❌ Bad: Different names for same concept
interface InconsistentOptions {
  timeout?: number     // SERVICE uses timeout
  maxTime?: number     // DATA uses maxTime (inconsistent)
  timeLimit?: number   // PIPELINE uses timeLimit (inconsistent)
}
```

### **5. Predictable Type Naming**
```typescript
// ✅ Good: Predictable patterns
type ServiceError    // Pillar + Error
type ValidationError // Domain + Error
type PipelineError   // Pillar + Error

type CacheConfig     // Feature + Config
type RetryConfig     // Feature + Config
type BatchConfig     // Feature + Config

// ❌ Bad: Unpredictable patterns
type HTTPError       // Inconsistent with ServiceError
type DataError       // Too generic
type ProcessingFail  // Doesn't follow pattern
```

---

**This completes the core API design specifications. Next I'll create the pillar-specific files and implementation documentation.**