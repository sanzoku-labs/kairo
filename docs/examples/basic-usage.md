# Basic Usage Examples

Simple, straightforward examples to get you started with Kairo.

## HTTP Requests

```typescript
import { service, Result } from '@sanzoku-labs/kairo'

// Simple GET request
const result = await service.get('/api/users')

if (Result.isOk(result)) {
  console.log('Users:', result.value)
} else {
  console.error('Error:', result.error.message)
}
```

## Data Validation

```typescript
import { data, Result } from '@sanzoku-labs/kairo'

// Define schema
const UserSchema = data.schema({
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 150 }
})

// Validate data
const result = data.validate(userData, UserSchema)

if (Result.isOk(result)) {
  console.log('Valid user:', result.value)
} else {
  console.error('Validation failed:', result.error)
}
```

## Pipeline Processing

```typescript
import { pipeline, Result } from '@sanzoku-labs/kairo'

// Simple pipeline
const processed = pipeline.map(items, item => item.toUpperCase())

if (Result.isOk(processed)) {
  console.log('Processed items:', processed.value)
}
```

## Next Steps

- [Common Patterns](/examples/common-patterns)
- [API Client Examples](/examples/api-client)
- [Data Processing](/examples/data-processing)