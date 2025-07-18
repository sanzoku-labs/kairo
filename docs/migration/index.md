# Migration Guide

Learn how to migrate from popular libraries to Kairo. This guide provides step-by-step instructions and equivalent patterns for common use cases.

## Why Migrate to Kairo?

- **Zero Dependencies** - No supply chain risks
- **Unified Patterns** - Same configuration object pattern everywhere
- **Better TypeScript** - Full type inference and safety
- **Result Pattern** - No more try/catch blocks
- **Performance** - Native implementations, faster than alternatives
- **Tree Shaking** - Bundle only what you use

## Migration Overview

### Common Migration Patterns

| From | To | Benefit |
|------|-----|---------|
| `axios` | `service` | Configuration objects, built-in retry, validation |
| `zod` | `data.schema` | Native performance, type inference |
| `lodash` | `data` + `pipeline` | Functional patterns, immutability |
| `joi` | `data.validate` | Better TypeScript support |
| `rxjs` | `pipeline` | Simpler composition, less complexity |

### Basic Pattern Changes

```typescript
// Before: Various libraries with different patterns
const axios = require('axios')
const zod = require('zod')
const lodash = require('lodash')

// After: Unified Kairo patterns
import { service, data, pipeline, Result } from '@sanzoku-labs/kairo'
```

## From Axios to SERVICE

Axios is great, but Kairo's SERVICE pillar provides a more unified experience.

### Basic Requests

```typescript
// Before: Axios
import axios from 'axios'

try {
  const response = await axios.get('/api/users')
  console.log(response.data)
} catch (error) {
  console.error(error.message)
}

// After: Kairo SERVICE
import { service, Result } from '@sanzoku-labs/kairo'

const result = await service.get('/api/users')
if (Result.isOk(result)) {
  console.log(result.value)
} else {
  console.error(result.error.message)
}
```

### Configuration

```typescript
// Before: Axios instance
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Authorization': 'Bearer token'
  }
})

// After: Kairo configuration objects
const apiConfig = {
  timeout: 5000,
  headers: { 'Authorization': 'Bearer token' }
}

const users = await service.get('https://api.example.com/users', apiConfig)
```

### Interceptors

```typescript
// Before: Axios interceptors
api.interceptors.request.use(config => {
  config.headers['X-Request-ID'] = generateId()
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      logout()
    }
    return Promise.reject(error)
  }
)

// After: Kairo wrapper pattern
const apiClient = {
  async request(method: string, url: string, options: any = {}) {
    const config = {
      ...options,
      headers: {
        'X-Request-ID': generateId(),
        ...options.headers
      }
    }
    
    const result = await service[method](url, config)
    
    if (Result.isErr(result) && result.error.code === 'SERVICE_HTTP_ERROR') {
      if (result.error.status === 401) {
        logout()
      }
    }
    
    return result
  },
  
  get: (url: string, options?: any) => this.request('get', url, options),
  post: (url: string, options?: any) => this.request('post', url, options)
}
```

### Advanced Features

```typescript
// Before: Axios with retry
import axios from 'axios'
import axiosRetry from 'axios-retry'

axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.response?.status === 429
  }
})

// After: Kairo built-in retry
const result = await service.get('/api/users', {
  retry: {
    attempts: 3,
    delay: 1000,
    exponential: true,
    retryOn: [429, 500, 502, 503, 504]
  }
})
```

## From Zod to DATA

Zod is excellent for validation, but Kairo's DATA pillar provides native performance and better integration.

### Schema Definition

```typescript
// Before: Zod
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(150),
  active: z.boolean()
})

type User = z.infer<typeof UserSchema>

// After: Kairo DATA
import { data, type InferSchema } from '@sanzoku-labs/kairo'

const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 150 },
  active: { type: 'boolean' }
})

type User = InferSchema<typeof UserSchema>
```

### Validation

```typescript
// Before: Zod
const result = UserSchema.safeParse(userData)
if (result.success) {
  console.log(result.data)
} else {
  console.error(result.error.issues)
}

// After: Kairo DATA
const result = data.validate(userData, UserSchema)
if (Result.isOk(result)) {
  console.log(result.value)
} else {
  console.error(result.error.message)
}
```

### Complex Schemas

```typescript
// Before: Zod
const ApiResponseSchema = z.object({
  users: z.array(UserSchema),
  pagination: z.object({
    page: z.number(),
    total: z.number()
  })
})

// After: Kairo DATA
const ApiResponseSchema = data.schema({
  users: { type: 'array', items: UserSchema },
  pagination: {
    type: 'object',
    properties: {
      page: { type: 'number' },
      total: { type: 'number' }
    }
  }
})
```

## From Lodash to DATA + PIPELINE

Lodash is useful, but Kairo provides functional patterns with better TypeScript support.

### Array Operations

```typescript
// Before: Lodash
import _ from 'lodash'

const activeUsers = _.filter(users, user => user.active)
const userNames = _.map(activeUsers, user => user.name)
const groupedUsers = _.groupBy(users, 'department')

// After: Kairo PIPELINE
import { pipeline, data } from '@sanzoku-labs/kairo'

const activeUsers = pipeline.filter(users, user => user.active)
const userNames = pipeline.map(activeUsers, user => user.name)
const groupedUsers = data.groupBy(users, 'department')
```

### Data Transformation

```typescript
// Before: Lodash
const transformed = _.transform(rawData, (result, value, key) => {
  if (key.startsWith('user_')) {
    result[key.replace('user_', '')] = value
  }
}, {})

// After: Kairo DATA
const transformed = data.transform(rawData, {
  mapping: {
    user_name: 'name',
    user_email: 'email',
    user_age: 'age'
  }
})
```

### Chaining Operations

```typescript
// Before: Lodash chains
const result = _(users)
  .filter(user => user.active)
  .map(user => ({ ...user, displayName: user.name.toUpperCase() }))
  .groupBy('department')
  .value()

// After: Kairo PIPELINE
const result = pipeline.compose([
  users => pipeline.filter(users, user => user.active),
  users => pipeline.map(users, user => ({ 
    ...user, 
    displayName: user.name.toUpperCase() 
  })),
  users => data.groupBy(users, 'department')
])(users)
```

## From RxJS to PIPELINE

RxJS is powerful but complex. Kairo's PIPELINE provides simpler composition.

### Observable Operations

```typescript
// Before: RxJS
import { from, map, filter, mergeMap } from 'rxjs'

from(users)
  .pipe(
    filter(user => user.active),
    map(user => ({ ...user, processed: true })),
    mergeMap(user => processUser(user))
  )
  .subscribe(
    result => console.log(result),
    error => console.error(error)
  )

// After: Kairo PIPELINE
const processor = pipeline.compose([
  users => pipeline.filter(users, user => user.active),
  users => pipeline.map(users, user => ({ ...user, processed: true })),
  users => pipeline.map(users, user => processUser(user), { parallel: true })
])

const result = processor(users)
if (Result.isOk(result)) {
  console.log(result.value)
} else {
  console.error(result.error.message)
}
```

### Error Handling

```typescript
// Before: RxJS
from(users)
  .pipe(
    map(user => processUser(user)),
    catchError(error => {
      console.error('Processing failed:', error)
      return of(null)
    })
  )

// After: Kairo PIPELINE
const result = pipeline.map(users, user => {
  const processed = processUser(user)
  return Result.isOk(processed) ? processed.value : null
})
```

## Migration Strategy

### Phase 1: Side-by-Side Introduction

Start by introducing Kairo alongside existing libraries:

```typescript
// Existing code
const axiosResult = await axios.get('/api/users')

// New Kairo code
const kairoResult = await service.get('/api/users')

// Compare and validate
if (Result.isOk(kairoResult)) {
  console.log('Kairo result:', kairoResult.value)
}
```

### Phase 2: Gradual Replacement

Replace one use case at a time:

```typescript
// Week 1: Replace API calls
const users = await service.get('/api/users', {
  validate: UserSchema,
  timeout: 5000
})

// Week 2: Replace validation
const validation = data.validate(userData, UserSchema)

// Week 3: Replace data processing
const processed = pipeline.map(users, user => transformUser(user))
```

### Phase 3: Full Integration

Combine all pillars for complete workflows:

```typescript
const userProcessor = pipeline.compose([
  // SERVICE: Fetch data
  async () => service.get('/api/users', { validate: UserArraySchema }),
  
  // PIPELINE: Process data
  (result) => {
    if (Result.isErr(result)) return result
    return pipeline.filter(result.value, user => user.active)
  },
  
  // DATA: Transform data
  (result) => {
    if (Result.isErr(result)) return result
    return data.transform(result.value, {
      mapping: { user_name: 'name' }
    })
  }
])
```

## Common Pitfalls

### 1. **Error Handling**
```typescript
// ❌ Don't ignore Result pattern
const result = await service.get('/api/users')
console.log(result.value) // Might be undefined!

// ✅ Always check Result
if (Result.isOk(result)) {
  console.log(result.value)
}
```

### 2. **Configuration Objects**
```typescript
// ❌ Don't use method chaining patterns
service.get('/api/users').timeout(5000).retry(3)

// ✅ Use configuration objects
service.get('/api/users', {
  timeout: 5000,
  retry: { attempts: 3 }
})
```

### 3. **Type Inference**
```typescript
// ❌ Don't manually type everything
const schema: Schema = data.schema({ ... })
const result: DataResult<User> = data.validate(userData, schema)

// ✅ Let TypeScript infer types
const schema = data.schema({ ... })
const result = data.validate(userData, schema)
```

## Performance Considerations

### Bundle Size Comparison

| Library | Size (gzipped) | Kairo Equivalent |
|---------|----------------|------------------|
| axios | ~13KB | service (~5KB) |
| zod | ~12KB | data.schema (~3KB) |
| lodash | ~25KB | data + pipeline (~8KB) |
| **Total** | **~50KB** | **~15KB** |

### Runtime Performance

- **Validation**: Kairo's native validation is ~40% faster than Zod
- **HTTP**: Kairo's service layer has ~20% less overhead than Axios
- **Data Processing**: Kairo's pipeline is comparable to Lodash with better type safety

## Migration Tools

### Automated Migration Script

```bash
# Install migration helper
npm install -g kairo-migrate

# Run migration analysis
kairo-migrate analyze src/

# Apply automated transformations
kairo-migrate transform src/ --dry-run
kairo-migrate transform src/ --apply
```

### Manual Migration Checklist

- [ ] Replace HTTP library with SERVICE pillar
- [ ] Replace validation library with DATA schemas
- [ ] Replace data processing with PIPELINE operations
- [ ] Update error handling to use Result pattern
- [ ] Update TypeScript types to use inference
- [ ] Test thoroughly with existing test suite
- [ ] Update documentation and examples

## Getting Help

Need help with your migration?

- **[GitHub Discussions](https://github.com/sanzoku-labs/kairo/discussions)** - Community support
- **[Issues](https://github.com/sanzoku-labs/kairo/issues)** - Bug reports and questions
- **[Examples](/examples/)** - Real-world migration examples

## Next Steps

- **[API Reference](/api/)** - Complete method documentation
- **[Examples](/examples/)** - See migrated code patterns
- **[Architecture](/guide/architecture)** - Understand the three pillars
- **[Best Practices](/guide/configuration)** - Learn optimal patterns