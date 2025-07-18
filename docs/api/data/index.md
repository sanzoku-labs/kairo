# DATA Pillar

The DATA pillar provides comprehensive data validation, transformation, and aggregation capabilities with native performance and TypeScript integration.

## Overview

The DATA pillar includes 10 core methods and 6 utilities for complete data operations:

**Core Methods:**
- `schema()` - Create validation schemas
- `validate()` - Validate data against schemas
- `transform()` - Transform data structure
- `convert()` - Convert data types
- `aggregate()` - Aggregate data operations
- `groupBy()` - Group data by keys
- `serialize()` - Serialize to formats
- `deserialize()` - Deserialize from formats
- `clone()` - Deep clone data
- `merge()` - Merge data objects

**Utilities:**
- `inferType()` - Type inference
- `createValidator()` - Validator factory
- `createTransformer()` - Transformer factory
- `createAggregator()` - Aggregator factory
- `createSerializer()` - Serializer factory
- `createMerger()` - Merger factory

## Quick Start

```typescript
import { data, Result, type InferSchema } from 'kairo'

// Define schema
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 150 },
  active: { type: 'boolean' }
})

// Validate data
const result = data.validate(userData, UserSchema)

// Transform data
const transformed = data.transform(rawData, {
  mapping: {
    user_name: 'name',
    user_email: 'email'
  }
})

// Aggregate data
const analytics = data.aggregate(users, {
  groupBy: ['department'],
  sum: ['salary'],
  avg: ['age']
})
```

## Type Safety

The DATA pillar provides full TypeScript integration:

```typescript
// Automatic type inference
const UserSchema = data.schema({
  name: { type: 'string' },
  age: { type: 'number' }
})

type User = InferSchema<typeof UserSchema>
// Result: { name: string, age: number }

// Use inferred types
const processUser = (user: User) => {
  console.log(user.name) // TypeScript knows this is a string
  console.log(user.age)  // TypeScript knows this is a number
}
```

## Core Concepts

### Schema-First Approach

Define data structure upfront with schemas:

```typescript
const ProductSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 1, max: 200 },
  price: { type: 'number', min: 0 },
  category: { type: 'string', enum: ['electronics', 'books', 'clothing'] },
  tags: { type: 'array', items: { type: 'string' }, optional: true }
})
```

### Validation Pipeline

Validate data at boundaries:

```typescript
const validateUser = (userData: unknown) => {
  const result = data.validate(userData, UserSchema)
  
  if (Result.isOk(result)) {
    return result.value // Properly typed User
  } else {
    console.error('Validation failed:', result.error.message)
    return null
  }
}
```

### Data Transformation

Transform data structures consistently:

```typescript
const normalizeApiResponse = (response: any) => {
  return data.transform(response, {
    mapping: {
      user_id: 'id',
      user_name: 'name',
      user_email: 'email'
    },
    compute: {
      displayName: item => item.name.toUpperCase(),
      isActive: item => item.status === 'active'
    }
  })
}
```

### Data Aggregation

Perform complex aggregations:

```typescript
const getSalesAnalytics = (sales: Sale[]) => {
  return data.aggregate(sales, {
    groupBy: ['region', 'quarter'],
    sum: ['revenue', 'units'],
    avg: ['orderValue', 'satisfaction'],
    min: ['date'],
    max: ['date'],
    count: ['orders']
  })
}
```

## Method Categories

### Schema & Validation
- **[Schema & Validation](/api/data/schema)** - Define and validate data structures
- `data.schema()` - Create validation schemas
- `data.validate()` - Validate data against schemas

### Data Transformation
- **[Transformation](/api/data/transform)** - Transform and convert data
- `data.transform()` - Transform data structure
- `data.convert()` - Convert data types
- `data.clone()` - Deep clone data
- `data.merge()` - Merge data objects

### Data Aggregation
- **[Aggregation](/api/data/aggregate)** - Aggregate and group data
- `data.aggregate()` - Aggregate data operations
- `data.groupBy()` - Group data by keys

### Serialization
- **[Serialization](/api/data/serialize)** - Serialize and deserialize data
- `data.serialize()` - Serialize to formats
- `data.deserialize()` - Deserialize from formats

## Error Handling

All DATA operations return Result types:

```typescript
const result = data.validate(userData, UserSchema)

if (Result.isErr(result)) {
  const error = result.error
  console.log('Field:', error.field)
  console.log('Value:', error.value)
  console.log('Message:', error.message)
}
```

## Performance Features

### Native Implementation

- **Faster than schema libraries** - Native validation without external dependencies
- **Optimized for TypeScript** - Built-in type inference
- **Tree-shakable** - Only bundle what you use

### Caching

```typescript
// Cache compiled schemas
const compiledSchema = data.compile(UserSchema)
const result = compiledSchema.validate(userData)

// Cache transformers
const transformer = data.createTransformer({
  mapping: { user_name: 'name' }
})
const transformed = transformer.transform(data)
```

## Integration Examples

### With SERVICE Pillar

```typescript
// Validate API responses
const users = await service.get('/api/users', {
  validate: data.schema({
    users: { type: 'array', items: UserSchema }
  })
})
```

### With PIPELINE Pillar

```typescript
// Use in pipelines
const processor = pipeline.compose([
  data => pipeline.validate(data, UserSchema),
  data => pipeline.map(data, user => data.transform(user, mapping)),
  data => data.aggregate(data, { groupBy: ['department'] })
])
```

## Best Practices

1. **Define schemas early** - Create schemas before implementing logic
2. **Use type inference** - Let TypeScript generate types from schemas
3. **Validate at boundaries** - Validate data entering your system
4. **Transform consistently** - Use standard transformation patterns
5. **Handle errors gracefully** - Provide meaningful error messages
6. **Cache compiled schemas** - Improve performance for repeated operations
7. **Compose operations** - Chain DATA operations for complex workflows

## Common Patterns

### API Response Validation

```typescript
const validateApiResponse = async (url: string) => {
  const response = await service.get(url)
  
  if (Result.isOk(response)) {
    const validation = data.validate(response.value, ResponseSchema)
    if (Result.isOk(validation)) {
      return validation.value
    }
  }
  
  return null
}
```

### Data Cleaning Pipeline

```typescript
const cleanUserData = (rawData: any[]) => {
  return pipeline.compose([
    // Validate each item
    data => pipeline.map(data, item => data.validate(item, UserSchema)),
    
    // Filter valid items
    data => pipeline.filter(data, Result.isOk),
    
    // Extract values
    data => pipeline.map(data, result => result.value),
    
    // Transform for consistency
    data => pipeline.map(data, user => data.transform(user, {
      mapping: { user_name: 'name' }
    }))
  ])(rawData)
}
```

### Analytics Generation

```typescript
const generateAnalytics = (users: User[]) => {
  const analytics = data.aggregate(users, {
    groupBy: ['department', 'level'],
    sum: ['salary'],
    avg: ['age', 'experience'],
    count: ['total']
  })
  
  if (Result.isOk(analytics)) {
    return analytics.value.map(group => ({
      ...group,
      avgSalary: Math.round(group.sum.salary / group.count.total),
      seniorityLevel: group.avg.experience > 5 ? 'Senior' : 'Junior'
    }))
  }
  
  return []
}
```

## Next Steps

- **[Schema & Validation](/api/data/schema)** - Define and validate data structures
- **[Transformation](/api/data/transform)** - Transform and convert data
- **[Aggregation](/api/data/aggregate)** - Aggregate and group data
- **[Serialization](/api/data/serialize)** - Serialize and deserialize data
- **[Examples](/examples/data-processing)** - Real-world DATA patterns