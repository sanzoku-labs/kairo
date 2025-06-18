# PIPELINE Pillar - Methods Specification

> **Pareto-optimized API for logic composition and data processing (8 core methods)**

## Core Philosophy

The PIPELINE pillar provides **essential logic composition** following 80/20 Pareto principle:
- ✅ Functional data transformation
- ✅ Business rule validation
- ✅ Workflow orchestration
- ✅ Pure computation only (no external dependencies)

## V2.0 Scope: 8 Core Methods

**80% Use Cases Covered by Core Methods:**
- `pipeline.map()` - Transform collections
- `pipeline.filter()` - Filter collections
- `pipeline.reduce()` - Aggregate data
- `pipeline.compose()` - Function composition
- `pipeline.chain()` - Data pipeline chaining
- `pipeline.branch()` - Conditional execution
- `pipeline.parallel()` - Parallel processing
- `pipeline.validate()` - Data validation

**V2.1+ Features:** Advanced utilities (`flatMap()`, `retry()`, `guard()`, `tap()`, `delay()`, `chunk()`, `stream()`)

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


## Utility Methods




## Stream Processing Methods


## Method Categories

### **Core Transformations (3 methods)**
- `map()` - Transform items
- `filter()` - Filter items  
- `reduce()` - Aggregate data

### **Composition (2 methods)**
- `compose()` - Function composition
- `chain()` - Data pipeline chaining

### **Control Flow (2 methods)**
- `branch()` - Conditional execution
- `parallel()` - Parallel processing

### **Validation (1 method)**
- `validate()` - Schema/rule validation

**Total: 8 methods** (Pareto-optimized logic composition)

## Implementation Priorities

### **Phase 1 - Core (3 methods)**
- `map()`, `filter()`, `reduce()`
- Basic synchronous operations
- Simple options support

### **Phase 2 - Composition (2 methods)**
- `compose()`, `chain()`
- Pipeline building
- Error propagation

### **Phase 3 - Control Flow (2 methods)**
- `branch()`, `parallel()`
- Advanced flow control
- Async operations

### **Phase 4 - Validation (1 method)**
- `validate()`
- Business rule validation

---

**Next**: [Pipeline Options](./pipeline-options.md) - Configuration options for all methods