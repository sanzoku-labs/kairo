# Configuration Patterns ✅ IMPLEMENTED

> **Options object conventions and patterns for Kairo V2's predictable API design**  
> **Status: ✅ All configuration patterns implemented across all pillars**

## Overview ✅ Fully Implemented

Kairo V2 uses configuration objects exclusively, eliminating method chaining and fluent APIs. This document defines the conventions, patterns, and best practices for options object design across all three pillars.

**Implementation Status**: ✅ **All configuration patterns implemented and working**

## ✅ Core Configuration Principles - IMPLEMENTED

### **✅ 1. Smart Defaults with Progressive Enhancement - IMPLEMENTED**
```typescript
// Works with no configuration
const users = await service.get('/users')

// Add configuration as needed
const users = await service.get('/users', {
  cache: true,                    // Smart boolean default
  retry: true,                    // Enable with defaults
  timeout: 10000                  // Override specific values
})

// Full configuration control
const users = await service.get('/users', {
  cache: { 
    ttl: 60000, 
    strategy: 'lru',
    key: (url) => `users:${url}` 
  },
  retry: { 
    attempts: 3, 
    delay: 1000, 
    backoff: 'exponential' 
  },
  timeout: 10000,
  validate: UserSchema,
  transform: normalizeUser
})
```

### **2. Consistent Structure Across Pillars**
```typescript
// Same option patterns work everywhere
interface BaseOptions {
  // Common patterns
  async?: boolean
  parallel?: boolean
  timeout?: number
  
  // Result handling
  fallback?: unknown
  continueOnError?: boolean
  
  // Debugging
  debug?: boolean
  trace?: string
}

// Extended by each pillar
interface ServiceOptions extends BaseOptions {
  cache?: CacheConfig | boolean
  retry?: RetryConfig | boolean
  validate?: Schema<any>
  headers?: Record<string, string>
}

interface PipelineOptions extends BaseOptions {
  chunk?: number
  maxConcurrency?: number
  retryItems?: boolean
}

interface DataOptions extends BaseOptions {
  strict?: boolean
  partial?: boolean
  transform?: boolean
}
```

### **3. Type-Safe Configuration**
```typescript
// Full TypeScript inference and validation
const processUsers = async (endpoint: string) => {
  // TypeScript knows all available options
  const result = await service.get(endpoint, {
    cache: { ttl: 60000 },        // IntelliSense shows cache options
    retry: { attempts: 3 },       // IntelliSense shows retry options
    validate: UserSchema,         // Type-checked schema
    timeout: 5000                 // Number validation
  })
  
  // Type-safe response based on schema
  if (Result.isOk(result)) {
    result.value // Typed as User[] from schema
  }
}
```

## Configuration Object Patterns

### **Pattern 1: Boolean Shortcuts**
Enable features with smart defaults using boolean flags:

```typescript
// Boolean shortcut enables feature with defaults
const withDefaults = {
  cache: true,           // → { ttl: 300000, strategy: 'memory' }
  retry: true,           // → { attempts: 3, delay: 1000, backoff: 'linear' }
  parallel: true,        // → { maxConcurrency: 10 }
  strict: true           // → Enable strict validation mode
}

// Full configuration for control
const withControl = {
  cache: { 
    ttl: 60000, 
    strategy: 'redis',
    key: customKeyFn 
  },
  retry: { 
    attempts: 5, 
    delay: 2000, 
    backoff: 'exponential',
    maxDelay: 30000
  },
  parallel: { 
    maxConcurrency: 20,
    ordered: false 
  }
}

// Implementation handles both patterns
const normalizeCache = (cache: CacheConfig | boolean): CacheConfig => {
  if (cache === true) {
    return { ttl: 300000, strategy: 'memory' }
  }
  if (cache === false) {
    return { ttl: 0, strategy: 'none' }
  }
  return cache
}
```

### **Pattern 2: Nested Configuration**
Group related options for discoverability:

```typescript
interface ServiceOptions {
  // HTTP configuration
  http?: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    headers?: Record<string, string>
    timeout?: number
    follow?: number        // Max redirects
  }
  
  // Caching configuration  
  cache?: {
    ttl?: number
    strategy?: 'memory' | 'redis' | 'filesystem'
    key?: string | ((request: Request) => string)
    invalidateOn?: string[]
    compress?: boolean
  }
  
  // Retry configuration
  retry?: {
    attempts?: number
    delay?: number
    backoff?: 'linear' | 'exponential'
    maxDelay?: number
    retryOn?: (error: ServiceError) => boolean
  }
  
  // Validation configuration
  validation?: {
    schema?: Schema<any>
    strict?: boolean
    coerce?: boolean
    stripUnknown?: boolean
  }
}

// Usage with grouped options
const result = await service.post('/users', userData, {
  http: {
    timeout: 10000,
    headers: { 'X-API-Version': '2.0' }
  },
  cache: {
    ttl: 300000,
    strategy: 'redis',
    key: 'users:list'
  },
  retry: {
    attempts: 3,
    backoff: 'exponential'
  },
  validation: {
    schema: UserSchema,
    strict: true
  }
})
```

### **Pattern 3: Function Configuration**
Use functions for dynamic configuration:

```typescript
interface DynamicOptions {
  // Dynamic cache key generation
  cache?: {
    ttl: number
    key: (context: RequestContext) => string
  }
  
  // Dynamic retry logic
  retry?: {
    attempts: number
    shouldRetry: (error: ServiceError, attempt: number) => boolean
  }
  
  // Dynamic transformation
  transform?: {
    request: (data: unknown) => unknown
    response: (data: unknown) => unknown
  }
  
  // Dynamic fallback values
  fallback?: (error: KairoError) => unknown
}

// Usage with dynamic configuration
const result = await service.get('/users', {
  cache: {
    ttl: 60000,
    key: ({ url, user }) => `${user.id}:${url}`
  },
  retry: {
    attempts: 3,
    shouldRetry: (error, attempt) => {
      // Don't retry client errors (4xx)
      if (error.httpStatus && error.httpStatus >= 400 && error.httpStatus < 500) {
        return false
      }
      // Retry server errors up to 3 times
      return attempt < 3 && error.httpStatus >= 500
    }
  },
  fallback: (error) => {
    if (isServiceError(error) && error.networkError) {
      return getCachedUsers() // Fallback to cached data
    }
    throw error
  }
})
```

### **Pattern 4: Composition Configuration**
Support composing configurations from multiple sources:

```typescript
// Base configurations
const baseServiceConfig: Partial<ServiceOptions> = {
  timeout: 5000,
  retry: { attempts: 3 },
  cache: { ttl: 300000 }
}

const productionConfig: Partial<ServiceOptions> = {
  timeout: 10000,
  retry: { attempts: 5, backoff: 'exponential' },
  cache: { ttl: 600000, strategy: 'redis' }
}

// Merge configurations with deep merge
const mergeConfigs = <T>(...configs: Partial<T>[]): T => {
  return configs.reduce((merged, config) => {
    return deepMerge(merged, config)
  }, {} as T)
}

// Usage
const result = await service.get('/users', mergeConfigs(
  baseServiceConfig,
  productionConfig,
  { cache: { key: 'users:current' } }  // Override specific values
))
```

## Pillar-Specific Configuration

### **SERVICE Pillar Configuration**

```typescript
interface ServiceOptions {
  // Core HTTP options
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  timeout?: number
  
  // Body handling
  json?: boolean
  form?: boolean
  
  // Caching (boolean shortcut or full config)
  cache?: boolean | {
    ttl: number
    strategy?: 'memory' | 'redis' | 'filesystem'
    key?: string | ((request: ServiceRequest) => string)
    invalidateOn?: string[]
    stale?: boolean  // Return stale data on error
  }
  
  // Retry logic (boolean shortcut or full config) 
  retry?: boolean | {
    attempts: number
    delay?: number
    backoff?: 'linear' | 'exponential'
    maxDelay?: number
    retryOn?: (error: ServiceError) => boolean
  }
  
  // Request/Response transformation
  transform?: {
    request?: (data: unknown) => unknown
    response?: (data: unknown) => unknown
  }
  
  // Validation integration
  validate?: Schema<any>
  
  // Advanced options
  batch?: {
    maxSize?: number
    timeout?: number
  }
  
  stream?: {
    highWaterMark?: number
    objectMode?: boolean
  }
}

// Example usage patterns
const examples = {
  // Simple with defaults
  simple: () => service.get('/users'),
  
  // With boolean shortcuts
  withShortcuts: () => service.get('/users', {
    cache: true,
    retry: true
  }),
  
  // Full configuration
  fullConfig: () => service.get('/users', {
    timeout: 10000,
    cache: {
      ttl: 60000,
      strategy: 'redis',
      key: (req) => `users:${req.url}`
    },
    retry: {
      attempts: 3,
      backoff: 'exponential',
      retryOn: (error) => error.httpStatus >= 500
    },
    validate: UserArraySchema,
    transform: {
      response: (data) => data.map(normalizeUser)
    }
  })
}
```

### **DATA Pillar Configuration**

```typescript
interface DataOptions {
  // Validation options
  strict?: boolean          // Strict vs loose validation
  partial?: boolean         // Allow partial objects
  coerce?: boolean         // Type coercion
  stripUnknown?: boolean   // Remove unknown properties
  
  // Transformation options
  transform?: boolean | {
    dateStrings?: boolean   // Parse date strings
    numbers?: boolean       // Parse number strings
    booleans?: boolean      // Parse boolean strings
    custom?: Record<string, (value: unknown) => unknown>
  }
  
  // Aggregation options (for data.aggregate)
  aggregation?: {
    groupBy?: string[]
    sum?: string[]
    avg?: string[]
    min?: string[]
    max?: string[]
    count?: string[]
    distinct?: string[]
    
    // Advanced aggregation
    custom?: Record<string, (group: unknown[]) => unknown>
    sort?: { field: string; direction: 'asc' | 'desc' }[]
    limit?: number
    offset?: number
  }
  
  // Performance options
  performance?: {
    chunk?: number          // Process in chunks
    parallel?: boolean      // Parallel processing
    memory?: 'low' | 'normal' | 'high'
  }
}

// Example usage patterns
const dataExamples = {
  // Basic validation
  validate: () => data.validate(userData, UserSchema),
  
  // Strict validation with coercion
  strictValidation: () => data.validate(userData, UserSchema, {
    strict: true,
    coerce: true,
    stripUnknown: true
  }),
  
  // Complex aggregation
  aggregation: () => data.aggregate(salesData, {
    aggregation: {
      groupBy: ['region', 'quarter'],
      sum: ['revenue', 'profit'],
      avg: ['orderValue'],
      count: ['orders'],
      custom: {
        conversionRate: (group) => group.reduce((sum, item) => 
          sum + (item.conversions / item.visits), 0) / group.length
      }
    },
    performance: {
      chunk: 1000,
      parallel: true
    }
  }),
  
  // Schema transformation
  transform: () => data.transform(rawData, TargetSchema, {
    transform: {
      dateStrings: true,
      numbers: true,
      custom: {
        fullName: (person) => `${person.firstName} ${person.lastName}`
      }
    }
  })
}
```

### **PIPELINE Pillar Configuration**

```typescript
interface PipelineOptions {
  // Execution options
  async?: boolean           // Async execution
  parallel?: boolean        // Parallel processing
  maxConcurrency?: number   // Concurrency limit
  ordered?: boolean         // Maintain order in parallel
  
  // Chunking and batching
  chunk?: number            // Process in chunks
  streaming?: boolean       // Stream processing
  
  // Error handling
  continueOnError?: boolean // Continue on individual failures
  retryItems?: boolean      // Retry failed items
  fallback?: unknown        // Fallback value for failures
  
  // Control flow
  branch?: {
    condition: (item: unknown) => boolean
    onTrue: (item: unknown) => unknown
    onFalse: (item: unknown) => unknown
  }
  
  // Performance
  timeout?: number          // Overall timeout
  itemTimeout?: number      // Per-item timeout
  
  // Debugging
  trace?: boolean           // Enable tracing
  debug?: boolean          // Debug mode
}

// Example usage patterns
const pipelineExamples = {
  // Simple map
  simpleMap: () => pipeline.map(users, enrichUser),
  
  // Parallel processing
  parallelMap: () => pipeline.map(users, enrichUser, {
    parallel: true,
    maxConcurrency: 10,
    continueOnError: true
  }),
  
  // Chunked processing
  chunkedMap: () => pipeline.map(largeArray, processItem, {
    chunk: 1000,
    parallel: true,
    ordered: false
  }),
  
  // Complex composition
  complexCompose: () => pipeline.compose(
    (data) => pipeline.filter(data, isValid),
    (data) => pipeline.map(data, transform, { parallel: true }),
    (data) => pipeline.reduce(data, aggregator, { chunk: 500 })
  ),
  
  // Conditional processing
  conditionalMap: () => pipeline.map(items, processItem, {
    branch: {
      condition: (item) => item.type === 'premium',
      onTrue: (item) => processPremiumItem(item),
      onFalse: (item) => processStandardItem(item)
    },
    fallback: { status: 'skipped' }
  })
}
```

## Configuration Validation

### **Runtime Validation**
```typescript
// Validate configuration objects at runtime
const validateServiceOptions = (options: ServiceOptions): Result<ConfigError, ServiceOptions> => {
  const errors: string[] = []
  
  // Validate timeout
  if (options.timeout !== undefined && 
      (typeof options.timeout !== 'number' || options.timeout <= 0)) {
    errors.push('timeout must be a positive number')
  }
  
  // Validate cache configuration
  if (options.cache && typeof options.cache === 'object') {
    if (options.cache.ttl <= 0) {
      errors.push('cache.ttl must be positive')
    }
    if (options.cache.strategy && 
        !['memory', 'redis', 'filesystem'].includes(options.cache.strategy)) {
      errors.push('cache.strategy must be memory, redis, or filesystem')
    }
  }
  
  // Validate retry configuration
  if (options.retry && typeof options.retry === 'object') {
    if (options.retry.attempts <= 0) {
      errors.push('retry.attempts must be positive')
    }
    if (options.retry.delay !== undefined && options.retry.delay < 0) {
      errors.push('retry.delay must be non-negative')
    }
  }
  
  if (errors.length > 0) {
    return Result.Err({
      code: 'CONFIG_ERROR',
      message: 'Invalid configuration',
      details: errors
    })
  }
  
  return Result.Ok(options)
}
```

### **TypeScript Validation**
```typescript
// Use TypeScript for compile-time validation
type ValidatedConfig<T> = T extends { timeout: infer U } 
  ? U extends number 
    ? T 
    : 'timeout must be a number'
  : T

// Conditional types for better error messages
type CacheConfig = {
  ttl: number
  strategy?: 'memory' | 'redis' | 'filesystem'
  key?: string | ((req: any) => string)
}

type ServiceOptions = {
  timeout?: number
  cache?: boolean | CacheConfig
  retry?: boolean | {
    attempts: number
    delay?: number
    backoff?: 'linear' | 'exponential'
  }
}

// Helper to ensure type safety
const createServiceOptions = <T extends ServiceOptions>(options: T): T => {
  return options
}

// Usage with type checking
const validOptions = createServiceOptions({
  timeout: 5000,
  cache: { ttl: 60000, strategy: 'memory' },
  retry: { attempts: 3, backoff: 'exponential' }
})

// This would cause a TypeScript error:
// const invalidOptions = createServiceOptions({
//   timeout: '5000',  // Error: string not assignable to number
//   cache: { ttl: -1 }  // Could add runtime validation for this
// })
```

## Configuration Helpers

### **Configuration Builder**
```typescript
// Fluent configuration builder (internal use only)
class ServiceConfigBuilder {
  private config: ServiceOptions = {}
  
  timeout(ms: number) {
    this.config.timeout = ms
    return this
  }
  
  cache(config: CacheConfig | boolean) {
    this.config.cache = config
    return this
  }
  
  retry(config: RetryConfig | boolean) {
    this.config.retry = config
    return this
  }
  
  build(): ServiceOptions {
    return { ...this.config }
  }
}

// Factory function for external use
export const serviceConfig = () => new ServiceConfigBuilder()

// Usage (optional for complex configurations)
const complexConfig = serviceConfig()
  .timeout(10000)
  .cache({ ttl: 60000, strategy: 'redis' })
  .retry({ attempts: 3, backoff: 'exponential' })
  .build()

const result = await service.get('/users', complexConfig)
```

### **Configuration Presets**
```typescript
// Common configuration presets
export const presets = {
  // Fast operations with minimal caching
  fast: {
    timeout: 2000,
    cache: { ttl: 30000 },
    retry: { attempts: 1 }
  },
  
  // Reliable operations with retries
  reliable: {
    timeout: 10000,
    cache: { ttl: 300000 },
    retry: { attempts: 5, backoff: 'exponential' }
  },
  
  // Heavy operations with aggressive caching
  heavy: {
    timeout: 30000,
    cache: { ttl: 3600000 },
    retry: { attempts: 3, delay: 5000 }
  },
  
  // Real-time operations
  realtime: {
    timeout: 1000,
    cache: false,
    retry: false
  }
}

// Usage with presets
const users = await service.get('/users', presets.reliable)
const config = await service.get('/config', presets.heavy)
const notifications = await service.get('/notifications', presets.realtime)
```

## Best Practices

### **1. Consistent Option Names**
Use the same option names across pillars:
- `timeout` (not `timeoutMs`, `maxTime`)
- `parallel` (not `concurrent`, `async`)
- `fallback` (not `default`, `onError`)
- `debug` (not `verbose`, `logging`)

### **2. Boolean Shortcuts**
Always support boolean shortcuts for common configurations:
```typescript
// ✅ Good: Support both boolean and object
cache?: boolean | CacheConfig

// ❌ Bad: Only object configuration
cache?: CacheConfig
```

### **3. Smart Defaults**
Provide sensible defaults that work for 80% of use cases:
```typescript
// ✅ Good: Works without configuration
const users = await service.get('/users')

// ❌ Bad: Requires configuration for basic usage
const users = await service.get('/users', { 
  timeout: 5000,
  retry: { attempts: 3 }
})
```

### **4. Progressive Enhancement**
Support adding more configuration without breaking changes:
```typescript
// Version 1: Basic options
interface ServiceOptions {
  timeout?: number
  cache?: boolean
}

// Version 2: Enhanced options (backward compatible)
interface ServiceOptions {
  timeout?: number
  cache?: boolean | {
    ttl?: number
    strategy?: 'memory' | 'redis'
  }
  retry?: boolean
}
```

### **5. Type Safety**
Leverage TypeScript for configuration validation:
```typescript
// ✅ Good: Type-safe configuration
interface StrictOptions {
  timeout: number  // Required
  cache?: CacheConfig  // Optional but type-safe
}

// ❌ Bad: Loose typing
interface LooseOptions {
  [key: string]: any
}
```

---

**Next**: See [Return Types](./return-types.md) for Result pattern and promise handling strategies.