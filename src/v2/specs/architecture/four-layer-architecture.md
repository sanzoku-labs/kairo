# Four-Layer Architecture

> **Complete architectural overview of Kairo V2's four-layer design**

## Architecture Overview

Kairo V2 implements a **four-layer architecture** that balances simplicity with power through progressive enhancement:

```typescript
┌─────────────────────────────────────────────────┐
│  Layer 1: CORE METHODS (23 total)              │
│  ├─ SERVICE: 5 methods                         │  
│  ├─ DATA: 10 methods                           │
│  └─ PIPELINE: 8 methods                        │
├─────────────────────────────────────────────────┤
│  Layer 2: CONFIGURATION OBJECTS                │
│  Rich options for progressive enhancement       │
├─────────────────────────────────────────────────┤
│  Layer 3: PUBLIC UTILITIES (15 total)          │
│  ├─ SERVICE: 4 utils                           │
│  ├─ DATA: 6 utils                              │ 
│  └─ PIPELINE: 5 utils                          │
├─────────────────────────────────────────────────┤
│  Layer 4: INTERNAL UTILITIES                   │
│  Private functions for method implementation    │
└─────────────────────────────────────────────────┘
```

## Layer 1: Core Methods (23 total)

The **essential API surface** covering 80% of use cases through Pareto-optimized method selection.

### SERVICE Pillar (5 methods)
```typescript
// Essential HTTP operations
service.get()     // Fetch data
service.post()    // Create resources
service.put()     // Update resources  
service.patch()   // Partial updates
service.delete()  // Remove resources
```

### DATA Pillar (10 methods)
```typescript
// Schema & Validation (2)
data.schema()     // Create schemas
data.validate()   // Data validation

// Transformation (2)  
data.transform()  // Structure mapping
data.convert()    // Schema migration

// Aggregation (2) ⭐ Major V2 feature
data.aggregate()  // Statistical operations
data.groupBy()    // Data grouping

// Serialization (2)
data.serialize()  // Export data
data.deserialize() // Import data

// Utilities (2)
data.clone()      // Deep copying
data.merge()      // Data merging
```

### PIPELINE Pillar (8 methods)
```typescript
// Core Transformations (3)
pipeline.map()     // Transform collections
pipeline.filter()  // Filter collections
pipeline.reduce()  // Aggregate data

// Composition (2)
pipeline.compose() // Function composition
pipeline.chain()   // Data pipeline chaining

// Control Flow (2)
pipeline.branch()  // Conditional execution
pipeline.parallel() // Parallel processing

// Validation (1)
pipeline.validate() // Data validation
```

### Design Principles
- **Pareto-optimized**: Each pillar covers 80% of use cases with minimal methods
- **Predictable patterns**: Same signature patterns across pillars
- **Zero magic**: No context awareness or method chaining
- **Configuration objects only**: Rich options instead of complex APIs

## Layer 2: Configuration Objects

**Rich configuration** that provides the real power and flexibility through progressive enhancement.

### Philosophy: "Smart Defaults, Rich Configuration"
- **Zero config required** - Intelligent defaults for 80% of use cases
- **Progressive enhancement** - Add options only when needed
- **Consistent patterns** - Same option types across all methods

### SERVICE Configuration Example
```typescript
// Simple (zero config)
const users = await service.get('/users')

// Basic configuration
const users = await service.get('/users', {
  params: { page: 1, limit: 10 },
  cache: true,
  timeout: 5000
})

// Advanced configuration
const users = await service.get('/users', {
  params: { page: 1, limit: 10 },
  cache: {
    ttl: 300000,
    strategy: 'memory',
    staleWhileRevalidate: 60000,
    tags: ['users', 'public-data']
  },
  retry: {
    attempts: 3,
    backoff: 'exponential',
    maxDelay: 5000,
    retryOn: [500, 502, 503, 504]
  },
  transform: {
    response: (data) => data.items || data,
    camelCase: true,
    dateStrings: true
  }
})
```

### DATA Configuration Example
```typescript
// Simple validation
const result = data.validate(userData, UserSchema)

// Rich configuration
const result = data.validate(userData, UserSchema, {
  strict: false,
  coerce: true,
  allowNull: true,
  trimStrings: true,
  customValidators: {
    businessRule: validateBusinessRule
  },
  maxErrors: 10,
  includeValue: false
})
```

### PIPELINE Configuration Example
```typescript
// Simple transformation
const doubled = pipeline.map([1, 2, 3], x => x * 2)

// Rich configuration
const processed = pipeline.map(users, enrichUser, {
  async: true,
  parallel: true,
  batchSize: 10,
  fallback: (error, item) => ({ ...item, processed: false }),
  onProgress: (completed, total) => updateProgressBar(completed / total)
})
```

### Configuration Benefits
- **No method explosion** - Single method with rich options vs many specialized methods
- **Progressive disclosure** - Start simple, add complexity as needed
- **Type safety** - Full TypeScript inference for all options
- **Consistency** - Same patterns across all pillars

## Layer 3: Public Utilities (15 total)

**Exposed helper functions** for common tasks that enhance method capabilities and enable user composition.

### SERVICE Utilities (4 functions)
```typescript
// URL Construction
service.buildURL(base, path, params)    // Build URLs with query parameters
service.parseURL(url)                   // Parse URLs into components

// Error Handling  
service.isError(error)                  // Type guard for service errors
service.isRetryable(error)              // Determine if error should trigger retry

// Response Processing
service.parseResponse(response, schema) // Parse and validate HTTP responses
service.extractHeaders(response, keys)  // Extract specific headers from response
```

### DATA Utilities (6 functions)
```typescript
// Data Access & Manipulation
data.get(obj, path)                     // Safely access nested properties
data.set(obj, path, value)              // Safely set nested properties  
data.has(obj, path)                     // Check if nested property exists

// Type & Schema Operations
data.inferType(value)                   // Infer data type for schema generation
data.isValid(value, schema)             // Quick validation check

// Collection Operations
data.flatten(array, depth)              // Flatten nested arrays
data.unique(array, keyFn)               // Remove duplicates from arrays
```

### PIPELINE Utilities (5 functions)
```typescript
// Function Composition
pipeline.curry(fn)                      // Create curried functions
pipeline.partial(fn, ...args)           // Create partially applied functions

// Control Flow
pipeline.when(condition, thenFn, elseFn) // Conditional execution function
pipeline.unless(condition, fn)          // Execute unless condition is true

// Async Operations & Error Handling
pipeline.sequence(operations)           // Execute async operations in sequence
pipeline.trap(fn, handler)              // Wrap functions to catch errors
```

### Usage Patterns

#### **Within Methods**
```typescript
// Example: service.get() using utilities
async function get<T>(url: string, options: GetOptions = {}) {
  const fullURL = service.buildURL(baseURL, url, options.params)
  
  try {
    const response = await fetch(fullURL, { ...options })
    return service.parseResponse(response, options.validate)
  } catch (error) {
    if (service.isRetryable(error) && options.retry) {
      // Implement retry logic
    }
    return Result.error(error)
  }
}
```

#### **User Composition**
```typescript
// User leverages utilities for custom logic
const processUserData = (users: User[]) => {
  const activeUsers = users.filter(user => 
    data.has(user, 'profile.isActive') && 
    data.get(user, 'profile.isActive') === true
  )
  
  const uniqueEmails = data.unique(
    activeUsers.map(user => data.get(user, 'contact.email'))
  )
  
  return { activeUsers, uniqueEmails }
}
```

### Benefits
- **Method enhancement** - Utilities used within methods for consistent behavior
- **User composition** - Exposed for custom logic and composition patterns  
- **Framework building** - Building blocks for higher-level abstractions
- **Testing & debugging** - Direct access to internal logic for testing

## Layer 4: Internal Utilities

**Private functions** used by methods for implementation but not exposed to users.

### Purpose & Scope
- **Performance optimization** - Compiled validators, optimized operations
- **Code reuse** - Shared logic between methods
- **Abstraction** - Hide complexity from public API
- **Consistency** - Standardized internal patterns

### Examples by Pillar

#### SERVICE Internal Utilities
```typescript
// Request Processing
normalizeOptions(options)               // Normalize and validate options
buildHeaders(base, additional, type)    // Construct request headers
prepareBody(data, contentType)          // Serialize request body

// Caching
generateCacheKey(url, options)          // Generate consistent cache keys
isCacheable(method, options)            // Determine if request should be cached

// Retry Logic
calculateDelay(attempt, config)         // Calculate retry delay with backoff
shouldRetry(error, attempt, config)     // Determine if request should be retried
```

#### DATA Internal Utilities
```typescript
// Schema Processing
normalizeSchema(definition)             // Convert user schemas to internal format
compileValidator(schema)                // Compile schema into optimized validator
createTypeGuard(schema)                 // Generate TypeScript type guards

// Transformation Engine
mapObject(obj, mapping, context)        // Apply transformation mapping
resolveTransform(transform, context)    // Resolve transform definitions

// Aggregation Engine
createAggregator(operation)             // Create aggregation functions
groupByKey(items, keyFn, options)       // Group data by computed keys
```

#### PIPELINE Internal Utilities
```typescript
// Execution Control
executeWithOptions(fn, data, options)   // Execute with pipeline options
handleAsync(fn, data, options)          // Handle async/sync execution
batchProcess(items, fn, options)        // Process arrays in batches

// Composition Engine  
createComposition(operations, options)  // Create optimized compositions
optimizeOperations(operations)          // Optimize operation chains

// Flow Control
createBranch(condition, branches, opts) // Create optimized branching logic
parallelExecutor(operations, options)   // Execute operations in parallel
```

### Design Principles
- **Not exposed** - Internal implementation details
- **Optimized** - Performance-focused implementations
- **Reusable** - Shared across multiple methods
- **Testable** - Unit tested independently

## Architecture Benefits

### **1. Progressive Complexity**
```typescript
// Level 1: Simple usage
const users = await service.get('/users')

// Level 2: Basic configuration  
const users = await service.get('/users', { cache: true })

// Level 3: Utility composition
const url = service.buildURL(baseURL, '/users', { page: 1 })
const users = await service.get(url)

// Level 4: Advanced configuration
const users = await service.get('/users', {
  cache: { ttl: 300000, strategy: 'memory' },
  retry: { attempts: 3, backoff: 'exponential' }
})
```

### **2. Consistent Patterns**
- **Same signature patterns** across all pillars
- **Consistent option structures** for all methods
- **Uniform error handling** with Result pattern
- **Predictable behavior** without surprises

### **3. Composition & Reuse**
```typescript
// Cross-pillar composition
const processData = pipeline.compose([
  (data) => data.validate(data, schema),
  (data) => data.transform(data, mapping),
  (data) => service.post('/api/processed', data)
])

// Utility-based composition
const safeGet = pipeline.trap(data.get)
const hasValidEmail = (user) => {
  const email = safeGet(user, 'contact.email')
  return Result.isOk(email) && data.isValid(email.value, EmailSchema)
}
```

### **4. Performance & Optimization**
- **Layer 1**: Optimized core methods with minimal overhead
- **Layer 2**: Rich configuration without method explosion
- **Layer 3**: Reusable utilities reduce code duplication  
- **Layer 4**: Internal optimizations (compiled validators, batching, caching)

### **5. Developer Experience**
- **Learning curve**: Start with Layer 1, progress as needed
- **Type safety**: Full TypeScript inference across all layers
- **Debugging**: Access to utilities for testing and inspection
- **Composition**: Building blocks for custom abstractions

## Implementation Strategy

### **Phase 1: Foundation**
1. **Layer 1**: Implement core methods with basic functionality
2. **Layer 4**: Essential internal utilities for method implementation
3. **Result pattern**: Error handling across all layers

### **Phase 2: Enhancement**  
1. **Layer 2**: Rich configuration objects for all methods
2. **Layer 3**: Public utilities for common operations
3. **Cross-pillar** integration and composition

### **Phase 3: Optimization**
1. **Performance**: Optimized internal utilities
2. **TypeScript**: Advanced type inference and safety
3. **Documentation**: Complete API documentation

### **Phase 4: Advanced Features**
1. **V2.1+ methods**: Additional methods beyond core 23
2. **Advanced utilities**: Specialized helper functions
3. **Ecosystem**: Framework integrations and extensions

## Comparison: V1 vs V2 Architecture

### **V1 Architecture Issues**
- **340+ methods** - Overwhelming API surface
- **Method chaining** - Complex, context-dependent behavior
- **Inconsistent patterns** - Different signatures across components
- **Hidden complexity** - Magic behavior difficult to understand

### **V2 Architecture Solutions**
- **23 core methods** - 87% reduction in API surface
- **Configuration objects** - Predictable, explicit behavior
- **Four-layer design** - Clear separation of concerns
- **Progressive enhancement** - Simple to start, powerful when needed

---

**Next**: [Implementation Strategy](../implementation/implementation-strategy.md) - Development roadmap and priorities