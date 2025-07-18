# API Reference

Complete reference for all Kairo methods, types, and utilities across the three pillars.

## Overview

Kairo provides **23 core methods** across three pillars:

- **[SERVICE Pillar](#service-pillar)** - HTTP-only API operations (5 methods + 4 utilities)
- **[DATA Pillar](#data-pillar)** - Data validation, transformation, aggregation (10 methods + 6 utilities)
- **[PIPELINE Pillar](#pipeline-pillar)** - Logic composition (8 methods + 5 utilities)

## Quick Reference

### Core Imports

```typescript
import { service, data, pipeline, Result } from 'kairo'
import type { 
  ServiceResult, 
  DataResult, 
  PipelineResult,
  Schema,
  InferSchema
} from 'kairo'
```

### Error Handling

All operations return `Result<Error, Data>`:

```typescript
// Pattern matching
Result.match(result, {
  Ok: data => console.log('Success:', data),
  Err: error => console.error('Error:', error.message)
})

// Type guards
if (Result.isOk(result)) {
  console.log(result.value) // Properly typed success value
}

if (Result.isErr(result)) {
  console.error(result.error) // Properly typed error
}
```

## SERVICE Pillar

HTTP-only API operations with rich configuration support.

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| [`service.get()`](/api/service/methods#get) | HTTP GET requests | `ServiceResult<T>` |
| [`service.post()`](/api/service/methods#post) | HTTP POST requests | `ServiceResult<T>` |
| [`service.put()`](/api/service/methods#put) | HTTP PUT requests | `ServiceResult<T>` |
| [`service.patch()`](/api/service/methods#patch) | HTTP PATCH requests | `ServiceResult<T>` |
| [`service.delete()`](/api/service/methods#delete) | HTTP DELETE requests | `ServiceResult<T>` |

### Configuration Options

```typescript
interface ServiceOptions {
  timeout?: number
  retry?: RetryOptions
  cache?: CacheOptions
  headers?: Record<string, string>
  validate?: Schema
  transform?: (data: any) => any
}
```

### Example

```typescript
const users = await service.get('/api/users', {
  timeout: 5000,
  retry: { attempts: 3, delay: 1000 },
  cache: { enabled: true, ttl: 300 },
  validate: UserArraySchema,
  headers: { 'Authorization': 'Bearer token' }
})
```

## DATA Pillar

Data validation, transformation, and aggregation with native performance.

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| [`data.schema()`](/api/data/schema#schema) | Create validation schema | `Schema` |
| [`data.validate()`](/api/data/schema#validate) | Validate data against schema | `DataResult<T>` |
| [`data.transform()`](/api/data/transform#transform) | Transform data structure | `DataResult<T>` |
| [`data.convert()`](/api/data/transform#convert) | Convert data types | `DataResult<T>` |
| [`data.aggregate()`](/api/data/aggregate#aggregate) | Aggregate data operations | `DataResult<T>` |
| [`data.groupBy()`](/api/data/aggregate#groupby) | Group data by key | `DataResult<T>` |
| [`data.serialize()`](/api/data/serialize#serialize) | Serialize to format | `DataResult<string>` |
| [`data.deserialize()`](/api/data/serialize#deserialize) | Deserialize from format | `DataResult<T>` |
| [`data.clone()`](/api/data/transform#clone) | Deep clone data | `DataResult<T>` |
| [`data.merge()`](/api/data/transform#merge) | Merge data objects | `DataResult<T>` |

### Schema Definition

```typescript
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 150 },
  active: { type: 'boolean' },
  tags: { type: 'array', items: { type: 'string' }, optional: true }
})

// Type inference
type User = InferSchema<typeof UserSchema>
```

### Example

```typescript
// Data validation
const validation = data.validate(userData, UserSchema)

// Data transformation
const transformed = data.transform(rawData, {
  mapping: {
    user_name: 'name',
    user_email: 'email'
  },
  compute: {
    fullName: item => `${item.firstName} ${item.lastName}`,
    isAdult: item => item.age >= 18
  }
})

// Data aggregation
const analytics = data.aggregate(salesData, {
  groupBy: ['region', 'quarter'],
  sum: ['revenue', 'units'],
  avg: ['satisfaction'],
  count: ['orders']
})
```

## PIPELINE Pillar

Logic composition and workflow orchestration.

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| [`pipeline.map()`](/api/pipeline/flow#map) | Transform each item | `PipelineResult<T[]>` |
| [`pipeline.filter()`](/api/pipeline/flow#filter) | Filter items by predicate | `PipelineResult<T[]>` |
| [`pipeline.reduce()`](/api/pipeline/flow#reduce) | Reduce to single value | `PipelineResult<T>` |
| [`pipeline.compose()`](/api/pipeline/compose#compose) | Compose operations | `ComposedPipeline<T>` |
| [`pipeline.chain()`](/api/pipeline/compose#chain) | Chain operations | `PipelineResult<T>` |
| [`pipeline.branch()`](/api/pipeline/branch#branch) | Conditional branching | `PipelineResult<T>` |
| [`pipeline.parallel()`](/api/pipeline/parallel#parallel) | Parallel execution | `PipelineResult<T[]>` |
| [`pipeline.validate()`](/api/pipeline/flow#validate) | Validate pipeline data | `PipelineResult<T>` |

### Pipeline Composition

```typescript
const dataProcessor = pipeline.compose([
  // Step 1: Validate input
  data => pipeline.validate(data, InputSchema),
  
  // Step 2: Transform data
  data => pipeline.map(data, item => transformItem(item)),
  
  // Step 3: Filter valid items
  data => pipeline.filter(data, item => item.isValid),
  
  // Step 4: Aggregate results
  data => data.aggregate(data, {
    groupBy: ['category'],
    sum: ['amount']
  })
])
```

### Example

```typescript
// Map with parallel processing
const processed = pipeline.map(
  items,
  async item => await processItem(item),
  {
    parallel: true,
    concurrency: 5,
    batchSize: 100
  }
)

// Conditional branching
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
  { fallback: defaultProcessor }
)
```

## Shared Utilities

### Result Pattern

```typescript
// Creation
const success = Result.Ok(data)
const error = Result.Err(new Error('Failed'))

// Type guards
Result.isOk(result)  // boolean
Result.isErr(result) // boolean

// Pattern matching
Result.match(result, {
  Ok: data => handleSuccess(data),
  Err: error => handleError(error)
})

// Transformation
Result.map(result, data => transform(data))
Result.mapError(result, error => enhanceError(error))
```

### Schema System

```typescript
// Basic types
const StringSchema = data.schema({ type: 'string' })
const NumberSchema = data.schema({ type: 'number', min: 0 })
const BooleanSchema = data.schema({ type: 'boolean' })

// Complex types
const ObjectSchema = data.schema({
  name: { type: 'string' },
  age: { type: 'number' },
  active: { type: 'boolean' }
})

const ArraySchema = data.schema({
  type: 'array',
  items: ObjectSchema
})

// Validation
const result = data.validate(userData, ObjectSchema)
```

## Error Types

All errors extend the base `KairoError` interface:

```typescript
interface KairoError {
  code: string
  message: string
  timestamp: number
  context: Record<string, unknown>
}

// Service errors
interface ServiceError extends KairoError {
  pillar: 'SERVICE'
  operation: string
}

// Data errors
interface DataError extends KairoError {
  pillar: 'DATA'
  operation: string
  field?: string
  value?: unknown
}

// Pipeline errors
interface PipelineError extends KairoError {
  pillar: 'PIPELINE'
  operation: string
  step?: number
}
```

## Type Utilities

```typescript
// Schema type inference
type User = InferSchema<typeof UserSchema>

// Result type helpers
type UserResult = ServiceResult<User>
type UsersResult = ServiceResult<User[]>

// Configuration types
type GetConfig = GetOptions
type PostConfig = PostOptions
type ValidationConfig = DataValidationOptions
```

## Best Practices

### 1. **Always Handle Errors**
```typescript
const result = await service.get('/api/users')
if (Result.isErr(result)) {
  // Handle error appropriately
  console.error('Failed to fetch users:', result.error.message)
  return
}
// Use result.value safely
```

### 2. **Use Type Inference**
```typescript
const UserSchema = data.schema({
  name: { type: 'string' },
  age: { type: 'number' }
})

type User = InferSchema<typeof UserSchema> // Inferred automatically
```

### 3. **Compose Operations**
```typescript
const processor = pipeline.compose([
  validateStep,
  transformStep,
  aggregateStep
])
```

### 4. **Configure Appropriately**
```typescript
const apiCall = service.get('/api/data', {
  timeout: 5000,        // Reasonable timeout
  retry: { attempts: 3 }, // Retry on failure
  cache: { enabled: true, ttl: 300 } // Cache for 5 minutes
})
```

## Performance Considerations

- **Tree Shaking**: Import only what you need
- **Native Validation**: Faster than schema libraries
- **Parallel Processing**: Use `parallel: true` for independent operations
- **Caching**: Enable caching for frequently accessed data
- **Batch Operations**: Use `batchSize` for large datasets

## Next Steps

Explore specific pillar documentation:

- **[SERVICE Pillar](/api/service/)** - HTTP operations and configuration
- **[DATA Pillar](/api/data/)** - Data validation and transformation
- **[PIPELINE Pillar](/api/pipeline/)** - Logic composition and workflows

Or check out practical examples:

- **[Examples](/examples/)** - Real-world usage patterns
- **[Migration Guide](/migration/)** - Moving from other libraries