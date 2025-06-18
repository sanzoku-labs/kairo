# PIPELINE Pillar - Methods Specification

> **Complete API for logic composition and data processing**

## Core Philosophy

The PIPELINE pillar provides **pure logic composition** for business workflows and data transformation:
- ✅ Functional data transformation
- ✅ Business rule validation
- ✅ Workflow orchestration
- ✅ Pure computation only (no external dependencies)

## Method Signatures

All PIPELINE methods follow this pattern:
```typescript
pipeline.method<TInput, TOutput>(
  data: TInput, 
  operation: (item: TInput) => TOutput,
  options?: PipelineOptions
): Result<PipelineError, TOutput>
```

## Core Transformation Methods

### **`pipeline.map()`**
**Signature**:
```typescript
pipeline.map<TInput, TOutput>(
  data: TInput[],
  transform: (item: TInput, index: number) => TOutput,
  options?: MapOptions
): Result<PipelineError, TOutput[]>
```

**Purpose**: Transform each item in a collection

**Examples**:
```typescript
// Simple transformation
const doubled = pipeline.map([1, 2, 3], x => x * 2)

// With options
const processed = pipeline.map(users, enrichUser, {
  async: true,
  parallel: true,
  batchSize: 10,
  fallback: (error, item) => ({ ...item, processed: false })
})
```

### **`pipeline.filter()`**
**Signature**:
```typescript
pipeline.filter<T>(
  data: T[],
  predicate: (item: T, index: number) => boolean,
  options?: FilterOptions
): Result<PipelineError, T[]>
```

**Purpose**: Filter collection based on predicate

**Examples**:
```typescript
// Simple filter
const adults = pipeline.filter(users, user => user.age >= 18)

// With async predicate
const valid = pipeline.filter(data, validateItem, {
  async: true,
  keepErrors: false,
  onError: (error, item) => console.warn('Validation failed', error)
})
```

### **`pipeline.reduce()`**
**Signature**:
```typescript
pipeline.reduce<TInput, TOutput>(
  data: TInput[],
  reducer: (acc: TOutput, item: TInput, index: number) => TOutput,
  initialValue: TOutput,
  options?: ReduceOptions
): Result<PipelineError, TOutput>
```

**Purpose**: Reduce collection to single value

**Examples**:
```typescript
// Simple reduction
const total = pipeline.reduce(orders, (sum, order) => sum + order.total, 0)

// Complex aggregation
const stats = pipeline.reduce(data, aggregateStats, {}, {
  async: true,
  parallel: false,  // Order matters for reduce
  checkpoints: true // Save intermediate results
})
```

### **`pipeline.flatMap()`**
**Signature**:
```typescript
pipeline.flatMap<TInput, TOutput>(
  data: TInput[],
  transform: (item: TInput) => TOutput | TOutput[],
  options?: FlatMapOptions
): Result<PipelineError, TOutput[]>
```

**Purpose**: Transform and flatten nested results

**Examples**:
```typescript
// Flatten nested arrays
const allTags = pipeline.flatMap(posts, post => post.tags)

// Complex transformation with flattening
const expanded = pipeline.flatMap(categories, expandSubcategories, {
  depth: 2,
  async: true
})
```

## Composition Methods

### **`pipeline.compose()`**
**Signature**:
```typescript
pipeline.compose<TInput, TOutput>(
  operations: PipelineOperation[],
  options?: ComposeOptions
): (data: TInput) => Result<PipelineError, TOutput>
```

**Purpose**: Compose multiple operations into single pipeline

**Examples**:
```typescript
// Function composition
const processUser = pipeline.compose([
  (user) => pipeline.validate(user, UserSchema),
  (user) => pipeline.transform(user, normalizeUser),
  (user) => pipeline.enrich(user, addBusinessData)
])

// With error handling
const safeProcess = pipeline.compose([
  validateInput,
  transformData,
  businessLogic
], {
  stopOnError: true,
  rollback: true,
  debug: true
})
```

### **`pipeline.chain()`**
**Signature**:
```typescript
pipeline.chain<TInput, TOutput>(
  data: TInput,
  operations: ChainOperation<any>[],
  options?: ChainOptions
): Result<PipelineError, TOutput>
```

**Purpose**: Chain operations with data flowing through

**Examples**:
```typescript
// Sequential operations
const result = pipeline.chain(initialData, [
  (data) => service.get('/enrich', { data }),
  (data) => data.validate(EnrichedSchema),
  (data) => pipeline.map(data, applyBusinessRules),
  (data) => data.transform(formatOutput)
])
```

## Control Flow Methods

### **`pipeline.branch()`**
**Signature**:
```typescript
pipeline.branch<TInput, TOutput>(
  data: TInput,
  condition: (data: TInput) => boolean | string,
  branches: Record<string | 'true' | 'false', PipelineOperation<TInput, TOutput>>,
  options?: BranchOptions
): Result<PipelineError, TOutput>
```

**Purpose**: Conditional execution based on data

**Examples**:
```typescript
// Simple branching
const result = pipeline.branch(user, 
  (user) => user.type,
  {
    'admin': processAdmin,
    'user': processUser,
    'guest': processGuest
  }
)

// Complex conditions
const processed = pipeline.branch(order,
  (order) => order.total > 1000 ? 'premium' : 'standard',
  {
    'premium': premiumProcessing,
    'standard': standardProcessing
  },
  {
    fallback: defaultProcessing,
    cache: true
  }
)
```

### **`pipeline.parallel()`**
**Signature**:
```typescript
pipeline.parallel<TInput, TOutput>(
  data: TInput,
  operations: ParallelOperation<TInput, any>[],
  options?: ParallelOptions
): Result<PipelineError, TOutput>
```

**Purpose**: Execute operations in parallel and combine results

**Examples**:
```typescript
// Parallel processing
const enriched = pipeline.parallel(user, [
  (user) => service.get(`/profile/${user.id}`),
  (user) => service.get(`/preferences/${user.id}`),
  (user) => service.get(`/activity/${user.id}`)
], {
  combiner: (user, [profile, prefs, activity]) => ({
    ...user,
    profile,
    preferences: prefs,
    recentActivity: activity
  }),
  maxConcurrency: 3,
  failFast: false
})
```

### **`pipeline.retry()`**
**Signature**:
```typescript
pipeline.retry<TInput, TOutput>(
  data: TInput,
  operation: (data: TInput) => Result<PipelineError, TOutput>,
  options?: RetryOptions
): Result<PipelineError, TOutput>
```

**Purpose**: Retry operations with configurable strategy

**Examples**:
```typescript
// Retry unreliable operations
const result = pipeline.retry(data, unreliableOperation, {
  attempts: 3,
  delay: 1000,
  backoff: 'exponential',
  condition: (error) => error.retryable
})
```

## Validation Methods

### **`pipeline.validate()`**
**Signature**:
```typescript
pipeline.validate<T>(
  data: T,
  schema: Schema<T> | ValidationRule<T>[],
  options?: ValidateOptions
): Result<ValidationError, T>
```

**Purpose**: Validate data against schema or rules

**Examples**:
```typescript
// Schema validation
const valid = pipeline.validate(userData, UserSchema)

// Business rule validation
const checked = pipeline.validate(order, [
  rules.minimumAmount(10),
  rules.validPayment(),
  rules.inStock()
], {
  stopOnFirst: false,
  collectErrors: true
})
```

### **`pipeline.guard()`**
**Signature**:
```typescript
pipeline.guard<T>(
  data: T,
  guards: GuardCondition<T>[],
  options?: GuardOptions
): Result<PipelineError, T>
```

**Purpose**: Apply guard conditions before processing

**Examples**:
```typescript
// Pre-condition guards
const result = pipeline.guard(input, [
  (data) => data !== null,
  (data) => data.id !== undefined,
  (data) => data.status === 'active'
], {
  errorMessage: 'Data failed guard conditions',
  shortCircuit: true
})
```

## Utility Methods

### **`pipeline.tap()`**
**Signature**:
```typescript
pipeline.tap<T>(
  data: T,
  sideEffect: (data: T) => void,
  options?: TapOptions
): Result<PipelineError, T>
```

**Purpose**: Execute side effects without changing data

**Examples**:
```typescript
// Logging and debugging
const result = pipeline.tap(processedData, (data) => {
  console.log('Processing completed:', data.length, 'items')
  analytics.track('processing_complete', { count: data.length })
})
```

### **`pipeline.delay()`**
**Signature**:
```typescript
pipeline.delay<T>(
  data: T,
  ms: number,
  options?: DelayOptions
): Promise<Result<PipelineError, T>>
```

**Purpose**: Add delays for rate limiting or testing

**Examples**:
```typescript
// Rate limiting
const delayed = await pipeline.delay(data, 1000, {
  jitter: true,
  reason: 'rate-limiting'
})
```

### **`pipeline.chunk()`**
**Signature**:
```typescript
pipeline.chunk<T>(
  data: T[],
  size: number,
  options?: ChunkOptions
): Result<PipelineError, T[][]>
```

**Purpose**: Split data into chunks for batch processing

**Examples**:
```typescript
// Batch processing
const chunks = pipeline.chunk(largeDataset, 100)
const results = pipeline.map(chunks, processChunk, { async: true })
```

## Stream Processing Methods

### **`pipeline.stream()`**
**Signature**:
```typescript
pipeline.stream<TInput, TOutput>(
  source: AsyncIterable<TInput>,
  operations: StreamOperation<TInput, TOutput>[],
  options?: StreamOptions
): AsyncIterable<Result<PipelineError, TOutput>>
```

**Purpose**: Process streaming data

**Examples**:
```typescript
// Stream processing
for await (const result of pipeline.stream(dataStream, [
  (item) => pipeline.validate(item, schema),
  (item) => pipeline.transform(item, processor),
  (item) => pipeline.enrich(item, addMetadata)
], {
  buffer: 1000,
  parallel: 4
})) {
  // Handle streaming results
}
```

## Method Categories

### **Core Transformations (4 methods)**
- `map()` - Transform items
- `filter()` - Filter items  
- `reduce()` - Aggregate data
- `flatMap()` - Transform and flatten

### **Composition (2 methods)**
- `compose()` - Function composition
- `chain()` - Data pipeline chaining

### **Control Flow (3 methods)**
- `branch()` - Conditional execution
- `parallel()` - Parallel processing
- `retry()` - Retry logic

### **Validation (2 methods)**
- `validate()` - Schema/rule validation
- `guard()` - Pre-condition checking

### **Utilities (4 methods)**
- `tap()` - Side effects
- `delay()` - Rate limiting
- `chunk()` - Batch processing
- `stream()` - Stream processing

**Total: 15 methods** (comprehensive logic composition)

## Implementation Priorities

### **Phase 1 - Core (4 methods)**
- `map()`, `filter()`, `reduce()`, `flatMap()`
- Basic synchronous operations
- Simple options support

### **Phase 2 - Composition (2 methods)**
- `compose()`, `chain()`
- Pipeline building
- Error propagation

### **Phase 3 - Control Flow (3 methods)**
- `branch()`, `parallel()`, `retry()`
- Advanced flow control
- Async operations

### **Phase 4 - Validation & Utilities (6 methods)**
- All remaining methods
- Advanced features
- Performance optimizations

---

**Next**: [Pipeline Options](./pipeline-options.md) - Configuration options for all methods