# PIPELINE Pillar - Methods Specification ✅ IMPLEMENTED

> **Pareto-optimized API for logic composition and data processing (8 core methods)**  
> **Status: ✅ All 8 methods implemented and functional + bonus features**

## Core Philosophy ✅ Fully Implemented

The PIPELINE pillar provides **essential logic composition** following 80/20 Pareto principle:

- ✅ Functional data transformation - **IMPLEMENTED** with async/parallel support
- ✅ Business rule validation - **IMPLEMENTED** with schema/rule validation
- ✅ Workflow orchestration - **IMPLEMENTED** with composition and chaining
- ✅ Pure computation only (no external dependencies) - **Design maintained**

## V2.0 Scope: 8 Core Methods ✅ Complete

**80% Use Cases Covered by Core Methods (ALL IMPLEMENTED):**

- ✅ `pipeline.map()` - Transform collections - **IMPLEMENTED** with async/parallel support
- ✅ `pipeline.filter()` - Filter collections - **IMPLEMENTED** with async predicates
- ✅ `pipeline.reduce()` - Aggregate data - **IMPLEMENTED** with checkpointing
- ✅ `pipeline.compose()` - Function composition - **IMPLEMENTED** with error handling
- ✅ `pipeline.chain()` - Data pipeline chaining - **IMPLEMENTED** with data flow
- ✅ `pipeline.branch()` - Conditional execution - **IMPLEMENTED** with flexible branching
- ✅ `pipeline.parallel()` - Parallel processing - **IMPLEMENTED** with concurrency control
- ✅ `pipeline.validate()` - Data validation - **IMPLEMENTED** with schema/rule validation

**V2.1+ Features:** Advanced utilities (`flatMap()`, `chunk()`, `stream()`) - **Deferred to future**  
**Early Implementations:** ✅ Many V2.1+ features implemented ahead of schedule! (`retry()`, `guard()`, `tap()`, `delay()`, and more)

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

### **✅ `pipeline.map()` - IMPLEMENTED**

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
  fallback: (error, item) => ({ ...item, processed: false }),
})
```

### **✅ `pipeline.filter()` - IMPLEMENTED**

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
  onError: (error, item) => console.warn('Validation failed', error),
})
```

### **✅ `pipeline.reduce()` - IMPLEMENTED**

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
const stats = pipeline.reduce(
  data,
  aggregateStats,
  {},
  {
    async: true,
    parallel: false, // Order matters for reduce
    checkpoints: true, // Save intermediate results
  }
)
```

## Composition Methods

### **✅ `pipeline.compose()` - IMPLEMENTED**

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
  user => pipeline.validate(user, UserSchema),
  user => pipeline.transform(user, normalizeUser),
  user => pipeline.enrich(user, addBusinessData),
])

// With error handling
const safeProcess = pipeline.compose([validateInput, transformData, businessLogic], {
  stopOnError: true,
  rollback: true,
  debug: true,
})
```

### **✅ `pipeline.chain()` - IMPLEMENTED**

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
  data => service.get('/enrich', { data }),
  data => data.validate(EnrichedSchema),
  data => pipeline.map(data, applyBusinessRules),
  data => data.transform(formatOutput),
])
```

## Control Flow Methods

### **✅ `pipeline.branch()` - IMPLEMENTED**

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
const result = pipeline.branch(user, user => user.type, {
  admin: processAdmin,
  user: processUser,
  guest: processGuest,
})

// Complex conditions
const processed = pipeline.branch(
  order,
  order => (order.total > 1000 ? 'premium' : 'standard'),
  {
    premium: premiumProcessing,
    standard: standardProcessing,
  },
  {
    fallback: defaultProcessing,
    cache: true,
  }
)
```

### **✅ `pipeline.parallel()` - IMPLEMENTED**

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
const enriched = pipeline.parallel(
  user,
  [
    user => service.get(`/profile/${user.id}`),
    user => service.get(`/preferences/${user.id}`),
    user => service.get(`/activity/${user.id}`),
  ],
  {
    combiner: (user, [profile, prefs, activity]) => ({
      ...user,
      profile,
      preferences: prefs,
      recentActivity: activity,
    }),
    maxConcurrency: 3,
    failFast: false,
  }
)
```

## Validation Methods

### **✅ `pipeline.validate()` - IMPLEMENTED**

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
const checked = pipeline.validate(
  order,
  [rules.minimumAmount(10), rules.validPayment(), rules.inStock()],
  {
    stopOnFirst: false,
    collectErrors: true,
  }
)
```

## Utility Methods

## Stream Processing Methods

## Method Categories

### **✅ Core Transformations (3 methods) - IMPLEMENTED**

- ✅ `map()` - Transform items - **Complete with async/parallel support**
- ✅ `filter()` - Filter items - **Complete with async predicates**
- ✅ `reduce()` - Aggregate data - **Complete with checkpointing**

### **✅ Composition (2 methods) - IMPLEMENTED**

- ✅ `compose()` - Function composition - **Complete with error handling**
- ✅ `chain()` - Data pipeline chaining - **Complete with data flow**

### **✅ Control Flow (2 methods) - IMPLEMENTED**

- ✅ `branch()` - Conditional execution - **Complete with flexible branching**
- ✅ `parallel()` - Parallel processing - **Complete with concurrency control**

### **✅ Validation (1 method) - IMPLEMENTED**

- ✅ `validate()` - Schema/rule validation - **Complete with business rules**

**Total: ✅ 8/8 methods + 5/5 utilities + 10 bonus utilities** (Pareto-optimized logic composition)

**Implementation Location**: `src/v2/core/pipeline/`  
**Bonus Features**: retry, delay, timeout, tap, memoize, debounce, throttle, guard, sequence, combineResults

## Implementation Status ✅ COMPLETE

### **✅ Phase 1 - Core (3 methods) - COMPLETED**

- ✅ `map()`, `filter()`, `reduce()` - **All implemented**
- ✅ Basic synchronous operations - **Plus async/parallel support**
- ✅ Simple options support - **Rich configuration options**

### **✅ Phase 2 - Composition (2 methods) - COMPLETED**

- ✅ `compose()`, `chain()` - **All implemented**
- ✅ Pipeline building - **Complete with function composition**
- ✅ Error propagation - **Comprehensive error handling**

### **✅ Phase 3 - Control Flow (2 methods) - COMPLETED**

- ✅ `branch()`, `parallel()` - **All implemented**
- ✅ Advanced flow control - **Flexible conditional execution**
- ✅ Async operations - **Full async/parallel support**

### **✅ Phase 4 - Validation (1 method) - COMPLETED**

- ✅ `validate()` - **Implemented**
- ✅ Business rule validation - **Schema and rule validation**

### **✅ Bonus Phase - V2.1+ Features Early Implementation**

- ✅ 5 public utilities - **curry, partial, when, unless, trap**
- ✅ 10 bonus utilities - **retry, delay, timeout, tap, memoize, debounce, throttle, guard, sequence, combineResults**

**Final Result**: ✅ **8/8 methods + 15/5 utilities implemented (300% of planned utilities)**

---

**Next**: [Pipeline Options](./pipeline-options.md) - Configuration options for all methods
