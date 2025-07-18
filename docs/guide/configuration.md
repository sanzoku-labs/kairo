# Configuration Objects

Kairo uses configuration objects everywhere instead of method chaining. This pattern provides better TypeScript support, clearer code intent, and easier testing.

## Why Configuration Objects?

### Problems with Method Chaining

```typescript
// ❌ Method chaining issues
client
  .timeout(5000)
  .retry(3)
  .cache(true)
  .headers({ 'Auth': 'Bearer token' })
  .get('/api/users')
```

**Issues:**
- Hard to type properly in TypeScript
- Difficult to reuse configurations
- Testing requires complex mocking
- Order matters but isn't clear
- Intermediate objects create memory overhead

### Benefits of Configuration Objects

```typescript
// ✅ Configuration objects solution
const config = {
  timeout: 5000,
  retry: { attempts: 3 },
  cache: { enabled: true },
  headers: { 'Authorization': 'Bearer token' }
}

service.get('/api/users', config)
```

**Benefits:**
- **Excellent TypeScript support** - Full autocompletion and type checking
- **Reusable configurations** - Define once, use everywhere
- **Easy testing** - Simple object mocking
- **Clear intent** - All options visible at call site
- **No intermediate objects** - Single allocation

## Configuration Patterns

### Basic Configuration

```typescript
// Simple configuration
const result = await service.get('/api/users', {
  timeout: 5000,
  headers: { 'Authorization': 'Bearer token' }
})
```

### Nested Configuration

```typescript
// Complex nested options
const result = await service.get('/api/users', {
  timeout: 10000,
  retry: {
    attempts: 3,
    delay: 1000,
    exponential: true,
    retryOn: [500, 502, 503, 504]
  },
  cache: {
    enabled: true,
    ttl: 300,
    key: 'users-list',
    stale: true
  },
  headers: {
    'Authorization': 'Bearer token',
    'X-Client-Version': '1.0.0'
  }
})
```

### Configuration Composition

```typescript
// Base configuration
const baseConfig = {
  timeout: 5000,
  retry: { attempts: 3 },
  headers: { 'Authorization': 'Bearer token' }
}

// Specific configurations
const cacheConfig = {
  ...baseConfig,
  cache: { enabled: true, ttl: 300 }
}

const noCacheConfig = {
  ...baseConfig,
  cache: { enabled: false }
}

// Usage
const users = await service.get('/api/users', cacheConfig)
const profile = await service.get('/api/profile', noCacheConfig)
```

## Configuration by Pillar

### SERVICE Configuration

```typescript
interface ServiceOptions {
  timeout?: number
  retry?: {
    attempts: number
    delay?: number
    exponential?: boolean
    retryOn?: number[]
  }
  cache?: {
    enabled: boolean
    ttl?: number
    key?: string
    stale?: boolean
  }
  headers?: Record<string, string>
  params?: Record<string, string>
  validate?: Schema
  transform?: (data: any) => any
}
```

Example:
```typescript
const apiResult = await service.post('/api/users', {
  body: userData,
  timeout: 10000,
  retry: { attempts: 3, delay: 1000 },
  headers: { 'Content-Type': 'application/json' },
  validate: UserSchema
})
```

### DATA Configuration

```typescript
interface DataValidationOptions {
  strict?: boolean
  allowUnknown?: boolean
  stripUnknown?: boolean
  coerce?: boolean
}

interface DataTransformOptions {
  mapping?: Record<string, string>
  compute?: Record<string, (item: any) => any>
  filter?: (item: any) => boolean
  sort?: (a: any, b: any) => number
}

interface AggregateOptions {
  groupBy?: string | string[]
  sum?: string[]
  avg?: string[]
  min?: string[]
  max?: string[]
  count?: string[]
  custom?: Record<string, (group: any[]) => any>
}
```

Example:
```typescript
// Data validation
const validation = data.validate(userData, UserSchema, {
  strict: true,
  stripUnknown: true
})

// Data transformation
const transformed = data.transform(rawData, {
  mapping: {
    user_name: 'name',
    user_email: 'email'
  },
  compute: {
    fullName: item => `${item.firstName} ${item.lastName}`,
    isAdult: item => item.age >= 18
  },
  filter: item => item.active === true
})

// Data aggregation
const analytics = data.aggregate(salesData, {
  groupBy: ['region', 'quarter'],
  sum: ['revenue', 'units'],
  avg: ['satisfaction', 'deliveryTime'],
  count: ['orders']
})
```

### PIPELINE Configuration

```typescript
interface PipelineOptions {
  parallel?: boolean
  concurrency?: number
  batchSize?: number
  timeout?: number
  errorHandling?: 'stop' | 'continue' | 'collect'
}

interface MapOptions extends PipelineOptions {
  async?: boolean
  preserveOrder?: boolean
}

interface FilterOptions extends PipelineOptions {
  invert?: boolean
}

interface BranchOptions {
  fallback?: PipelineOperation
  parallel?: boolean
  timeout?: number
}
```

Example:
```typescript
// Map with parallel processing
const processed = pipeline.map(
  items,
  async item => await processItem(item),
  {
    parallel: true,
    concurrency: 5,
    batchSize: 100,
    async: true
  }
)

// Filter with error handling
const filtered = pipeline.filter(
  items,
  item => validateItem(item),
  {
    errorHandling: 'continue',
    parallel: true
  }
)

// Branch with fallback
const result = pipeline.branch(
  inputData,
  [
    {
      condition: data => data.type === 'premium',
      pipeline: premiumProcessor
    },
    {
      condition: data => data.type === 'standard',
      pipeline: standardProcessor
    }
  ],
  {
    fallback: defaultProcessor,
    parallel: false
  }
)
```

## Advanced Configuration Patterns

### Configuration Factory

```typescript
class ConfigurationFactory {
  static createApiConfig(environment: 'dev' | 'staging' | 'prod') {
    const baseConfig = {
      timeout: 5000,
      retry: { attempts: 3 }
    }

    const envConfigs = {
      dev: {
        ...baseConfig,
        timeout: 10000,
        headers: { 'X-Environment': 'development' }
      },
      staging: {
        ...baseConfig,
        timeout: 8000,
        headers: { 'X-Environment': 'staging' }
      },
      prod: {
        ...baseConfig,
        timeout: 5000,
        headers: { 'X-Environment': 'production' }
      }
    }

    return envConfigs[environment]
  }

  static createCacheConfig(duration: 'short' | 'medium' | 'long') {
    const durations = {
      short: 60,    // 1 minute
      medium: 300,  // 5 minutes
      long: 3600    // 1 hour
    }

    return {
      enabled: true,
      ttl: durations[duration],
      stale: true
    }
  }
}

// Usage
const config = {
  ...ConfigurationFactory.createApiConfig('prod'),
  cache: ConfigurationFactory.createCacheConfig('medium')
}
```

### Configuration Validation

```typescript
const validateConfig = (config: any): ServiceOptions => {
  const validatedConfig: ServiceOptions = {}

  // Validate timeout
  if (config.timeout) {
    if (typeof config.timeout !== 'number' || config.timeout <= 0) {
      throw new Error('Timeout must be a positive number')
    }
    validatedConfig.timeout = config.timeout
  }

  // Validate retry configuration
  if (config.retry) {
    if (typeof config.retry.attempts !== 'number' || config.retry.attempts < 1) {
      throw new Error('Retry attempts must be a positive number')
    }
    validatedConfig.retry = config.retry
  }

  // Validate headers
  if (config.headers) {
    if (typeof config.headers !== 'object') {
      throw new Error('Headers must be an object')
    }
    validatedConfig.headers = config.headers
  }

  return validatedConfig
}

// Usage
const safeConfig = validateConfig(userProvidedConfig)
const result = await service.get('/api/users', safeConfig)
```

### Configuration Merging

```typescript
const mergeConfigs = (base: any, override: any): any => {
  const merged = { ...base }

  for (const key in override) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      merged[key] = mergeConfigs(merged[key] || {}, override[key])
    } else {
      merged[key] = override[key]
    }
  }

  return merged
}

// Usage
const baseConfig = {
  timeout: 5000,
  retry: { attempts: 3, delay: 1000 },
  headers: { 'User-Agent': 'Kairo Client' }
}

const userConfig = {
  timeout: 10000,
  retry: { attempts: 5 },
  headers: { 'Authorization': 'Bearer token' }
}

const finalConfig = mergeConfigs(baseConfig, userConfig)
// Result: {
//   timeout: 10000,
//   retry: { attempts: 5, delay: 1000 },
//   headers: { 'User-Agent': 'Kairo Client', 'Authorization': 'Bearer token' }
// }
```

## Configuration Best Practices

### 1. **Use TypeScript Interfaces**

```typescript
interface ApiClientConfig {
  baseUrl: string
  timeout: number
  retry: RetryConfig
  auth: AuthConfig
}

interface RetryConfig {
  attempts: number
  delay: number
  exponential: boolean
}

interface AuthConfig {
  type: 'bearer' | 'basic' | 'api-key'
  token: string
}

// Usage with full type safety
const config: ApiClientConfig = {
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  retry: {
    attempts: 3,
    delay: 1000,
    exponential: true
  },
  auth: {
    type: 'bearer',
    token: 'abc123'
  }
}
```

### 2. **Provide Sensible Defaults**

```typescript
const DEFAULT_CONFIG = {
  timeout: 5000,
  retry: { attempts: 3, delay: 1000 },
  cache: { enabled: false },
  headers: { 'Content-Type': 'application/json' }
}

const createRequest = (url: string, userConfig: Partial<ServiceOptions> = {}) => {
  const config = { ...DEFAULT_CONFIG, ...userConfig }
  return service.get(url, config)
}
```

### 3. **Configuration Builders**

```typescript
class ConfigBuilder {
  private config: ServiceOptions = {}

  timeout(ms: number): ConfigBuilder {
    this.config.timeout = ms
    return this
  }

  retry(attempts: number, delay?: number): ConfigBuilder {
    this.config.retry = { attempts, delay }
    return this
  }

  cache(enabled: boolean, ttl?: number): ConfigBuilder {
    this.config.cache = { enabled, ttl }
    return this
  }

  headers(headers: Record<string, string>): ConfigBuilder {
    this.config.headers = { ...this.config.headers, ...headers }
    return this
  }

  build(): ServiceOptions {
    return { ...this.config }
  }
}

// Usage
const config = new ConfigBuilder()
  .timeout(10000)
  .retry(3, 1000)
  .cache(true, 300)
  .headers({ 'Authorization': 'Bearer token' })
  .build()
```

### 4. **Environment-Specific Configuration**

```typescript
const createEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development'
  
  const configs = {
    development: {
      timeout: 30000,
      retry: { attempts: 1 },
      cache: { enabled: false },
      headers: { 'X-Debug': 'true' }
    },
    staging: {
      timeout: 10000,
      retry: { attempts: 2 },
      cache: { enabled: true, ttl: 60 },
      headers: { 'X-Environment': 'staging' }
    },
    production: {
      timeout: 5000,
      retry: { attempts: 3 },
      cache: { enabled: true, ttl: 300 },
      headers: { 'X-Environment': 'production' }
    }
  }

  return configs[env] || configs.development
}
```

### 5. **Configuration Documentation**

```typescript
/**
 * Service configuration options
 * 
 * @interface ServiceOptions
 * @property {number} [timeout=5000] - Request timeout in milliseconds
 * @property {RetryOptions} [retry] - Retry configuration
 * @property {CacheOptions} [cache] - Cache configuration
 * @property {Record<string, string>} [headers] - HTTP headers
 * @property {Schema} [validate] - Response validation schema
 * @property {Function} [transform] - Response transformation function
 * 
 * @example
 * ```typescript
 * const config: ServiceOptions = {
 *   timeout: 10000,
 *   retry: { attempts: 3, delay: 1000 },
 *   cache: { enabled: true, ttl: 300 },
 *   headers: { 'Authorization': 'Bearer token' }
 * }
 * ```
 */
interface ServiceOptions {
  timeout?: number
  retry?: RetryOptions
  cache?: CacheOptions
  headers?: Record<string, string>
  validate?: Schema
  transform?: (data: any) => any
}
```

## Testing Configuration Objects

### Unit Testing

```typescript
describe('Configuration Objects', () => {
  it('should merge configurations correctly', () => {
    const base = { timeout: 5000, retry: { attempts: 3 } }
    const override = { timeout: 10000, cache: { enabled: true } }
    
    const merged = mergeConfigs(base, override)
    
    expect(merged).toEqual({
      timeout: 10000,
      retry: { attempts: 3 },
      cache: { enabled: true }
    })
  })

  it('should validate configuration correctly', () => {
    const config = { timeout: -1000 }
    
    expect(() => validateConfig(config)).toThrow('Timeout must be a positive number')
  })

  it('should create environment-specific config', () => {
    process.env.NODE_ENV = 'production'
    
    const config = createEnvironmentConfig()
    
    expect(config.timeout).toBe(5000)
    expect(config.retry.attempts).toBe(3)
  })
})
```

### Integration Testing

```typescript
describe('Service with Configuration', () => {
  it('should use configuration correctly', async () => {
    const config = {
      timeout: 1000,
      retry: { attempts: 2 },
      headers: { 'X-Test': 'true' }
    }

    const result = await service.get('/api/test', config)
    
    expect(Result.isOk(result)).toBe(true)
    // Verify configuration was applied
  })
})
```

## Next Steps

- **[Result Pattern](/guide/result-pattern)** - Learn about error handling
- **[Error Handling](/guide/error-handling)** - Comprehensive error management
- **[API Reference](/api/)** - Complete configuration documentation
- **[Examples](/examples/)** - Real-world configuration patterns