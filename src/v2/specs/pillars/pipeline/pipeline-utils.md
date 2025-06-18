# PIPELINE Pillar - Function Utils Specification

> **Utility functions for PIPELINE pillar method composition and flow control**

## Overview

PIPELINE function utils provide convenience functions for functional programming, flow control, and data processing that can be used within PIPELINE methods or independently. These utilities follow the four-layer architecture:

1. **Core Methods** (8) - `map()`, `filter()`, `reduce()`, `compose()`, `chain()`, `branch()`, `parallel()`, `validate()`
2. **Configuration Objects** - Rich options for all pipeline operations
3. **Public Utilities** (5) - Exposed helper functions for common pipeline tasks
4. **Internal Utilities** - Private functions used by methods

## Public Utilities

### **Function Composition**

#### **`pipeline.curry()`**
```typescript
pipeline.curry<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn
): CurriedFunction<TArgs, TReturn>
```

**Purpose**: Create curried versions of functions for composition
**Usage**: Within pipeline methods and user code

```typescript
// Used within pipeline.map() for reusable transformers
const multiply = pipeline.curry((factor: number, value: number) => value * factor)
const double = multiply(2)
const result = pipeline.map([1, 2, 3], double)

// User code - create reusable pipeline steps
const validateAndTransform = pipeline.curry((schema: Schema, transform: Function, data: any) => {
  const validated = pipeline.validate(data, schema)
  return Result.isOk(validated) ? transform(validated.value) : validated
})

const processUser = validateAndTransform(UserSchema, normalizeUser)
```

#### **`pipeline.partial()`**
```typescript
pipeline.partial<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  ...partialArgs: Partial<TArgs>
): (...remainingArgs: any[]) => TReturn
```

**Purpose**: Create partially applied functions
**Usage**: Function specialization and reuse

```typescript
// Used within pipeline.filter() for reusable predicates
const hasProperty = (prop: string, obj: any) => obj[prop] !== undefined
const hasEmail = pipeline.partial(hasProperty, 'email')
const usersWithEmail = pipeline.filter(users, hasEmail)

// User code - specialized processors
const apiTransform = pipeline.partial(data.transform, apiMapping)
const processAPIData = (items: any[]) => pipeline.map(items, apiTransform)
```

### **Control Flow**

#### **`pipeline.when()`**
```typescript
pipeline.when<T>(
  condition: (data: T) => boolean,
  thenFn: (data: T) => T,
  elseFn?: (data: T) => T
): (data: T) => T
```

**Purpose**: Conditional execution function
**Usage**: Inline conditional processing

```typescript
// Used within pipeline.chain() for conditional steps
const processConditionally = pipeline.when(
  user => user.role === 'admin',
  user => ({ ...user, permissions: adminPermissions }),
  user => ({ ...user, permissions: userPermissions })
)

// User code - conditional transformations
const applyDiscount = pipeline.when(
  order => order.total > 100,
  order => ({ ...order, discount: 0.1 }),
  order => order
)
```

#### **`pipeline.unless()`**
```typescript
pipeline.unless<T>(
  condition: (data: T) => boolean,
  fn: (data: T) => T
): (data: T) => T
```

**Purpose**: Execute function unless condition is true
**Usage**: Guard conditions and default behaviors

```typescript
// Used within pipeline methods for validation guards
const processUnlessEmpty = pipeline.unless(
  data => Array.isArray(data) && data.length === 0,
  data => pipeline.map(data, processItem)
)

// User code - defensive programming
const updateUnlessLocked = pipeline.unless(
  resource => resource.locked,
  resource => ({ ...resource, ...updates })
)
```

### **Async Operations**

#### **`pipeline.sequence()`**
```typescript
pipeline.sequence<T>(
  operations: Array<(data: T) => Promise<T>>
): (data: T) => Promise<T>
```

**Purpose**: Execute async operations in sequence
**Usage**: Sequential async processing

```typescript
// Used within pipeline.chain() for async operations
const processUserSequence = pipeline.sequence([
  async user => await validateUser(user),
  async user => await enrichWithProfile(user),
  async user => await auditLog(user)
])

// User code - API call sequences
const fetchUserData = pipeline.sequence([
  async userId => await service.get(`/users/${userId}`),
  async user => await service.get(`/users/${user.id}/preferences`),
  async prefs => ({ ...user, preferences: prefs })
])
```

### **Error Handling**

#### **`pipeline.trap()`**
```typescript
pipeline.trap<T, E = Error>(
  fn: (data: T) => T,
  handler?: (error: E, data: T) => T
): (data: T) => Result<E, T>
```

**Purpose**: Wrap functions to catch errors and return Results
**Usage**: Safe function execution

```typescript
// Used within pipeline methods for error safety
const safeTransform = pipeline.trap(
  data => JSON.parse(data),
  (error, data) => ({ error: error.message, original: data })
)

// User code - safe processing
const safeParse = pipeline.trap(JSON.parse)
const processJSON = (jsonString: string) => {
  const result = safeParse(jsonString)
  return Result.isOk(result) ? result.value : null
}
```

## Internal Utilities

These functions are used internally by PIPELINE methods but not exposed to users:

### **Execution Control**

#### **`executeWithOptions()`**
```typescript
executeWithOptions<T, R>(
  fn: (data: T) => R,
  data: T,
  options: PipelineOptions
): Result<PipelineError, R>
```

**Purpose**: Execute functions with pipeline options (async, parallel, etc.)
**Usage**: Core execution engine

#### **`handleAsync()`**
```typescript
handleAsync<T, R>(
  fn: (data: T) => R | Promise<R>,
  data: T,
  options: AsyncOptions
): Promise<Result<PipelineError, R>>
```

**Purpose**: Handle async/sync function execution
**Usage**: Unified async handling

#### **`batchProcess()`**
```typescript
batchProcess<T, R>(
  items: T[],
  fn: (item: T) => R,
  options: BatchOptions
): Promise<Result<PipelineError, R[]>>
```

**Purpose**: Process arrays in batches for performance
**Usage**: Large dataset processing

### **Composition Engine**

#### **`createComposition()`**
```typescript
createComposition<T>(
  operations: PipelineOperation<T>[],
  options: ComposeOptions
): (data: T) => Result<PipelineError, T>
```

**Purpose**: Create optimized function compositions
**Usage**: Performance optimization

#### **`optimizeOperations()`**
```typescript
optimizeOperations<T>(
  operations: PipelineOperation<T>[]
): OptimizedOperation<T>[]
```

**Purpose**: Optimize operation chains for better performance
**Usage**: Compilation optimization

### **Flow Control**

#### **`createBranch()`**
```typescript
createBranch<T>(
  condition: BranchCondition<T>,
  branches: BranchMap<T>,
  options: BranchOptions
): (data: T) => Result<PipelineError, T>
```

**Purpose**: Create optimized branching logic
**Usage**: Conditional execution

#### **`parallelExecutor()`**
```typescript
parallelExecutor<T>(
  operations: ParallelOperation<T>[],
  options: ParallelOptions
): (data: T) => Promise<Result<PipelineError, T>>
```

**Purpose**: Execute operations in parallel with proper coordination
**Usage**: Parallel processing

### **Validation Support**

#### **`createValidator()`**
```typescript
createValidator<T>(
  rules: ValidationRule<T>[],
  options: ValidationOptions
): ValidatorFunction<T>
```

**Purpose**: Create optimized validation functions
**Usage**: Validation processing

#### **`combineValidators()`**
```typescript
combineValidators<T>(
  validators: ValidatorFunction<T>[]
): ValidatorFunction<T>
```

**Purpose**: Combine multiple validators efficiently
**Usage**: Complex validation logic

## Function Utils Usage Patterns

### **Within Pipeline Methods**

```typescript
// Example: pipeline.map() implementation using utils
function map<TInput, TOutput>(
  data: TInput[],
  transform: (item: TInput, index: number) => TOutput,
  options: MapOptions = {}
): Result<PipelineError, TOutput[]> {
  
  // Use internal utils for execution control
  if (options.async || options.parallel) {
    return handleAsync(
      (items) => batchProcess(items, transform, {
        parallel: options.parallel,
        batchSize: options.batchSize || 10
      }),
      data,
      options
    )
  }
  
  // Use trap() for error safety
  const safeTransform = pipeline.trap(transform)
  
  try {
    const results = data.map((item, index) => {
      const result = safeTransform(item)
      if (Result.isError(result)) {
        if (options.fallback) {
          return options.fallback(result.error, item)
        }
        throw result.error
      }
      return result.value
    })
    
    return Result.ok(results)
  } catch (error) {
    return Result.error(new PipelineError(error.message))
  }
}
```

### **User Code Composition**

```typescript
// User leverages public utils for custom pipeline building
const createUserProcessor = () => {
  // Use curry for reusable transformations
  const validateUser = pipeline.curry((schema: Schema, user: any) => 
    pipeline.validate(user, schema)
  )
  
  const transformUser = pipeline.curry((mapping: any, user: any) =>
    data.transform(user, mapping)
  )
  
  // Use when/unless for conditional processing
  const addDefaultPreferences = pipeline.when(
    user => !user.preferences,
    user => ({ ...user, preferences: defaultPreferences })
  )
  
  const skipInactiveUsers = pipeline.unless(
    user => user.status === 'inactive',
    user => user
  )
  
  // Compose the pipeline
  return pipeline.compose([
    validateUser(UserSchema),
    skipInactiveUsers,
    transformUser(userMapping),
    addDefaultPreferences
  ])
}

// Use the composed processor
const processUser = createUserProcessor()
const result = processUser(rawUserData)
```

### **Async Pipeline Patterns**

```typescript
// Building async processing pipelines
const createAsyncProcessor = (endpoint: string) => {
  // Use sequence for ordered async operations
  const fetchAndEnrich = pipeline.sequence([
    async (id: string) => await service.get(`${endpoint}/${id}`),
    async (item: any) => await service.get(`${endpoint}/${item.id}/details`),
    async (details: any) => ({ ...item, details })
  ])
  
  // Use trap for error handling
  const safeFetch = pipeline.trap(fetchAndEnrich)
  
  // Use partial for specialized processors
  const processWithRetry = pipeline.partial(
    async (retryCount: number, processor: Function, data: any) => {
      for (let i = 0; i < retryCount; i++) {
        const result = await safeFetch(data)
        if (Result.isOk(result)) return result
        
        if (i < retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        }
      }
      return Result.error(new Error('Max retries exceeded'))
    },
    3 // 3 retries
  )
  
  return processWithRetry
}
```

### **Complex Flow Control**

```typescript
// Advanced flow control using utils
const createComplexProcessor = () => {
  // Multi-branch processing
  const routeByType = pipeline.branch(
    item => item.type,
    {
      'user': pipeline.compose([
        validateUser,
        enrichUserData,
        auditUserAccess
      ]),
      'order': pipeline.compose([
        validateOrder,
        calculateTotals,
        updateInventory
      ]),
      'product': pipeline.compose([
        validateProduct,
        updateCatalog,
        syncSearchIndex
      ])
    }
  )
  
  // Parallel processing with coordination
  const processInParallel = pipeline.parallel([
    item => auditLog(item),
    item => updateCache(item),
    item => notifyWebhooks(item)
  ], {
    failFast: false,
    maxConcurrency: 3
  })
  
  // Final composition
  return pipeline.chain([
    routeByType,
    processInParallel,
    finalizeProcessing
  ])
}
```

## Benefits

### **For METHOD Implementation**
- Consistent async handling patterns
- Reusable composition utilities
- Safe error handling wrappers
- Performance optimization helpers

### **For USER Code**
- Functional programming utilities
- Composable pipeline building
- Error-safe operation wrappers
- Async coordination helpers

### **For FRAMEWORK Design**
- Modular pipeline construction
- Testable utility functions
- Performance optimizations
- Consistent patterns across operations

## Implementation Priority

### **Phase 1: Core Utils**
- `curry()`, `partial()`, `when()`, `trap()`
- Essential for functional composition

### **Phase 2: Async Utils**
- `sequence()`, `unless()`, async handling
- Enhanced async processing

### **Phase 3: Internal Utils**
- All internal utilities for method implementation
- Performance and optimization features

---

**Next**: [Four Layer Architecture](../../architecture/four-layer-architecture.md) - Complete architectural overview