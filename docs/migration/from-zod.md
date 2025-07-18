# Migrating from Zod

A comprehensive guide to migrating from Zod to Kairo's schema validation system.

## Why Migrate?

While Zod is excellent for schema validation, Kairo provides:

- **Result pattern integration** - Consistent error handling across all operations
- **Three-pillar architecture** - Validation integrated with HTTP and pipeline operations
- **Configuration objects** - No method chaining, cleaner syntax
- **Native performance** - Optimized validation without external dependencies
- **TypeScript inference** - Better type safety and IDE support

## Quick Migration

### Before (Zod)

```typescript
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(120),
  active: z.boolean().default(true)
})

try {
  const user = UserSchema.parse(userData)
  console.log('Valid user:', user)
} catch (error) {
  console.error('Validation error:', error.message)
}
```

### After (Kairo)

```typescript
import { data, Result } from 'kairo'

const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 120 },
  active: { type: 'boolean', default: true }
})

const result = data.validate(userData, UserSchema)
Result.match(result, {
  Ok: user => console.log('Valid user:', user),
  Err: error => console.error('Validation error:', error.message)
})
```

## Schema Definition Migration

### Basic Types

```typescript
// Zod
const BasicSchema = z.object({
  str: z.string(),
  num: z.number(),
  bool: z.boolean(),
  date: z.date(),
  arr: z.array(z.string()),
  obj: z.object({ nested: z.string() })
})

// Kairo
const BasicSchema = data.schema({
  str: { type: 'string' },
  num: { type: 'number' },
  bool: { type: 'boolean' },
  date: { type: 'date' },
  arr: { type: 'array', items: { type: 'string' } },
  obj: { type: 'object', properties: { nested: { type: 'string' } } }
})
```

### String Validations

```typescript
// Zod
const StringSchema = z.object({
  required: z.string(),
  optional: z.string().optional(),
  withDefault: z.string().default('default'),
  minLength: z.string().min(5),
  maxLength: z.string().max(50),
  length: z.string().length(10),
  email: z.string().email(),
  url: z.string().url(),
  uuid: z.string().uuid(),
  regex: z.string().regex(/^\d+$/),
  enum: z.enum(['a', 'b', 'c'])
})

// Kairo
const StringSchema = data.schema({
  required: { type: 'string' },
  optional: { type: 'string', optional: true },
  withDefault: { type: 'string', default: 'default' },
  minLength: { type: 'string', min: 5 },
  maxLength: { type: 'string', max: 50 },
  length: { type: 'string', length: 10 },
  email: { type: 'string', format: 'email' },
  url: { type: 'string', format: 'url' },
  uuid: { type: 'string', format: 'uuid' },
  regex: { type: 'string', pattern: '^\\d+$' },
  enum: { type: 'string', enum: ['a', 'b', 'c'] }
})
```

### Number Validations

```typescript
// Zod
const NumberSchema = z.object({
  basic: z.number(),
  integer: z.number().int(),
  positive: z.number().positive(),
  negative: z.number().negative(),
  min: z.number().min(0),
  max: z.number().max(100),
  multipleOf: z.number().multipleOf(5)
})

// Kairo
const NumberSchema = data.schema({
  basic: { type: 'number' },
  integer: { type: 'integer' },
  positive: { type: 'number', min: 0, exclusive: true },
  negative: { type: 'number', max: 0, exclusive: true },
  min: { type: 'number', min: 0 },
  max: { type: 'number', max: 100 },
  multipleOf: { type: 'number', multipleOf: 5 }
})
```

### Array Validations

```typescript
// Zod
const ArraySchema = z.object({
  stringArray: z.array(z.string()),
  numberArray: z.array(z.number()),
  minLength: z.array(z.string()).min(1),
  maxLength: z.array(z.string()).max(10),
  nonempty: z.array(z.string()).nonempty(),
  tuple: z.tuple([z.string(), z.number()])
})

// Kairo
const ArraySchema = data.schema({
  stringArray: { type: 'array', items: { type: 'string' } },
  numberArray: { type: 'array', items: { type: 'number' } },
  minLength: { type: 'array', items: { type: 'string' }, minItems: 1 },
  maxLength: { type: 'array', items: { type: 'string' }, maxItems: 10 },
  nonempty: { type: 'array', items: { type: 'string' }, minItems: 1 },
  tuple: { type: 'array', items: [{ type: 'string' }, { type: 'number' }] }
})
```

### Object Validations

```typescript
// Zod
const ObjectSchema = z.object({
  required: z.string(),
  optional: z.string().optional(),
  nested: z.object({
    inner: z.string()
  }),
  record: z.record(z.string()),
  partial: z.object({
    a: z.string(),
    b: z.number()
  }).partial()
})

// Kairo
const ObjectSchema = data.schema({
  required: { type: 'string' },
  optional: { type: 'string', optional: true },
  nested: {
    type: 'object',
    properties: {
      inner: { type: 'string' }
    }
  },
  record: { type: 'object', additionalProperties: { type: 'string' } },
  partial: {
    type: 'object',
    properties: {
      a: { type: 'string', optional: true },
      b: { type: 'number', optional: true }
    }
  }
})
```

## Validation Migration

### Parse vs Validate

```typescript
// Zod
try {
  const user = UserSchema.parse(userData)
  // Success
} catch (error) {
  // Handle error
}

// Zod safe parse
const result = UserSchema.safeParse(userData)
if (result.success) {
  // Use result.data
} else {
  // Handle result.error
}

// Kairo
const result = data.validate(userData, UserSchema)
Result.match(result, {
  Ok: user => {
    // Success - use user
  },
  Err: error => {
    // Handle error
  }
})
```

### Transform vs Coerce

```typescript
// Zod
const CoerceSchema = z.object({
  stringToNumber: z.coerce.number(),
  stringToDate: z.coerce.date(),
  stringToBoolean: z.coerce.boolean()
})

// Kairo
const CoerceSchema = data.schema({
  stringToNumber: { type: 'number', coerce: true },
  stringToDate: { type: 'date', coerce: true },
  stringToBoolean: { type: 'boolean', coerce: true }
})
```

### Refinements vs Custom Validation

```typescript
// Zod
const RefinedSchema = z.object({
  password: z.string().refine(
    val => val.length >= 8 && /[A-Z]/.test(val),
    { message: 'Password must be at least 8 characters with uppercase' }
  ),
  email: z.string().email().refine(
    val => !val.includes('temp'),
    { message: 'Temporary emails not allowed' }
  )
})

// Kairo
const RefinedSchema = data.schema({
  password: {
    type: 'string',
    min: 8,
    pattern: '.*[A-Z].*',
    message: 'Password must be at least 8 characters with uppercase'
  },
  email: {
    type: 'string',
    format: 'email',
    validate: (value: string) => {
      if (value.includes('temp')) {
        return Result.Err('Temporary emails not allowed')
      }
      return Result.Ok(value)
    }
  }
})
```

## Union Types and Discriminated Unions

### Union Types

```typescript
// Zod
const UnionSchema = z.union([
  z.string(),
  z.number(),
  z.boolean()
])

// Kairo
const UnionSchema = data.schema({
  type: 'union',
  oneOf: [
    { type: 'string' },
    { type: 'number' },
    { type: 'boolean' }
  ]
})
```

### Discriminated Unions

```typescript
// Zod
const DiscriminatedSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('user'), name: z.string() }),
  z.object({ type: z.literal('admin'), permissions: z.array(z.string()) })
])

// Kairo
const DiscriminatedSchema = data.schema({
  type: 'object',
  discriminator: 'type',
  oneOf: [
    {
      type: 'object',
      properties: {
        type: { type: 'string', const: 'user' },
        name: { type: 'string' }
      }
    },
    {
      type: 'object',
      properties: {
        type: { type: 'string', const: 'admin' },
        permissions: { type: 'array', items: { type: 'string' } }
      }
    }
  ]
})
```

## Error Handling Migration

### Zod Error Handling

```typescript
// Zod
try {
  const user = UserSchema.parse(userData)
} catch (error) {
  if (error instanceof z.ZodError) {
    error.issues.forEach(issue => {
      console.log(`${issue.path.join('.')}: ${issue.message}`)
    })
  }
}

// Safe parse
const result = UserSchema.safeParse(userData)
if (!result.success) {
  result.error.issues.forEach(issue => {
    console.log(`${issue.path.join('.')}: ${issue.message}`)
  })
}
```

### Kairo Error Handling

```typescript
// Kairo
const result = data.validate(userData, UserSchema)
Result.match(result, {
  Ok: user => {
    // Success
  },
  Err: error => {
    console.log(`${error.path.join('.')}: ${error.message}`)
    
    // Access additional error info
    console.log('Field:', error.field)
    console.log('Expected:', error.expected)
    console.log('Received:', error.value)
  }
})
```

## Integration with Service Layer

### Zod with Manual Integration

```typescript
// Zod
const fetchUser = async (id: string): Promise<User> => {
  const response = await fetch(`/api/users/${id}`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  
  try {
    return UserSchema.parse(data)
  } catch (error) {
    throw new Error(`Validation failed: ${error.message}`)
  }
}
```

### Kairo with Integrated Validation

```typescript
// Kairo
const fetchUser = async (id: string): Promise<Result<ServiceError, User>> => {
  return service.get(`/api/users/${id}`, {
    validate: UserSchema,
    timeout: 5000
  })
}

// Usage
const result = await fetchUser('123')
Result.match(result, {
  Ok: user => console.log('User:', user),
  Err: error => {
    switch (error.code) {
      case 'SERVICE_HTTP_ERROR':
        console.error('HTTP error:', error.status)
        break
      case 'DATA_VALIDATION_ERROR':
        console.error('Validation error:', error.message)
        break
      default:
        console.error('Unknown error:', error.message)
    }
  }
})
```

## Advanced Migration Patterns

### Recursive Schemas

```typescript
// Zod
type Node = {
  id: string
  children: Node[]
}

const NodeSchema: z.ZodSchema<Node> = z.object({
  id: z.string(),
  children: z.lazy(() => z.array(NodeSchema))
})

// Kairo
const NodeSchema = data.schema({
  id: { type: 'string' },
  children: { type: 'array', items: { $ref: '#' } }
})
```

### Schema Composition

```typescript
// Zod
const BaseSchema = z.object({
  id: z.string(),
  createdAt: z.date()
})

const UserSchema = BaseSchema.extend({
  name: z.string(),
  email: z.string().email()
})

// Kairo
const BaseSchema = data.schema({
  id: { type: 'string' },
  createdAt: { type: 'date' }
})

const UserSchema = data.schema({
  ...BaseSchema.properties,
  name: { type: 'string' },
  email: { type: 'string', format: 'email' }
})
```

## Performance Considerations

### Zod Performance

```typescript
// Zod - compiled for better performance
const CompiledSchema = z.object({
  name: z.string(),
  email: z.string().email()
}).strict()

// Still requires try/catch for each validation
const validate = (data: unknown) => {
  try {
    return CompiledSchema.parse(data)
  } catch (error) {
    throw error
  }
}
```

### Kairo Performance

```typescript
// Kairo - native validation with Result pattern
const Schema = data.schema({
  name: { type: 'string' },
  email: { type: 'string', format: 'email' }
})

// No try/catch needed, consistent Result pattern
const validate = (data: unknown) => {
  return data.validate(data, Schema)
}
```

## Complete Migration Example

### Before: Zod-based API

```typescript
import { z } from 'zod'

const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(120).optional()
})

const UserResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
  createdAt: z.date()
})

class UserService {
  async createUser(userData: unknown): Promise<User> {
    // Validate input
    const validatedData = CreateUserSchema.parse(userData)
    
    // Make API call
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validatedData)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const responseData = await response.json()
    
    // Validate response
    return UserResponseSchema.parse(responseData)
  }
}
```

### After: Kairo-based API

```typescript
import { service, data, Result } from 'kairo'

const CreateUserSchema = data.schema({
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 120, optional: true }
})

const UserResponseSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string' },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', optional: true },
  createdAt: { type: 'date' }
})

class UserService {
  async createUser(userData: unknown): Promise<Result<ServiceError | DataError, User>> {
    // Validate input
    const validationResult = data.validate(userData, CreateUserSchema)
    if (Result.isErr(validationResult)) {
      return validationResult
    }
    
    // Make API call with automatic response validation
    return service.post('/api/users', {
      body: validationResult.value,
      validate: UserResponseSchema,
      timeout: 5000
    })
  }
}

// Usage
const userService = new UserService()
const result = await userService.createUser(userData)

Result.match(result, {
  Ok: user => console.log('User created:', user),
  Err: error => {
    switch (error.code) {
      case 'DATA_VALIDATION_ERROR':
        console.error('Validation error:', error.message)
        break
      case 'SERVICE_HTTP_ERROR':
        console.error('HTTP error:', error.status)
        break
      default:
        console.error('Unknown error:', error.message)
    }
  }
})
```

## Migration Checklist

- [ ] Replace Zod imports with Kairo data imports
- [ ] Convert schema definitions to Kairo format
- [ ] Replace parse/safeParse with validate and Result pattern
- [ ] Update error handling to use structured errors
- [ ] Integrate schemas with service layer validation
- [ ] Update TypeScript types for Result pattern
- [ ] Remove try/catch blocks in favor of Result matching
- [ ] Test validation performance improvements

## Next Steps

- [Schema Validation Guide](/api/data/schema)
- [Service Integration](/api/service/)
- [Error Handling](/guide/error-handling)