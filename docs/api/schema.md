# Schema System

Kairo's native schema system provides fast validation and automatic TypeScript type inference without external dependencies.

## Schema Definition

### Basic Schema

```typescript
import { data, type InferSchema } from '@sanzoku-labs/kairo'

// Define schema
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 150 },
  active: { type: 'boolean' }
})

// Automatic type inference
type User = InferSchema<typeof UserSchema>
// Result: {
//   id: string
//   name: string
//   email: string
//   age: number
//   active: boolean
// }
```

### Schema Types

#### String Type

```typescript
const StringSchema = data.schema({
  type: 'string',
  min?: number,           // Minimum length
  max?: number,           // Maximum length
  pattern?: RegExp,       // Regular expression pattern
  format?: 'email' | 'uuid' | 'url' | 'date' | 'time' | 'datetime',
  enum?: string[],        // Allowed values
  optional?: boolean      // Optional field
})

// Examples
const schemas = {
  email: { type: 'string', format: 'email' },
  name: { type: 'string', min: 2, max: 100 },
  status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
  description: { type: 'string', optional: true }
}
```

#### Number Type

```typescript
const NumberSchema = data.schema({
  type: 'number',
  min?: number,           // Minimum value
  max?: number,           // Maximum value
  integer?: boolean,      // Must be integer
  positive?: boolean,     // Must be positive
  multipleOf?: number,    // Must be multiple of
  optional?: boolean      // Optional field
})

// Examples
const schemas = {
  age: { type: 'number', min: 0, max: 150, integer: true },
  price: { type: 'number', min: 0, positive: true },
  rating: { type: 'number', min: 1, max: 5 },
  weight: { type: 'number', multipleOf: 0.1, optional: true }
}
```

#### Boolean Type

```typescript
const BooleanSchema = data.schema({
  type: 'boolean',
  optional?: boolean      // Optional field
})

// Examples
const schemas = {
  active: { type: 'boolean' },
  verified: { type: 'boolean', optional: true }
}
```

#### Array Type

```typescript
const ArraySchema = data.schema({
  type: 'array',
  items: Schema,          // Schema for array items
  min?: number,           // Minimum length
  max?: number,           // Maximum length
  unique?: boolean,       // Items must be unique
  optional?: boolean      // Optional field
})

// Examples
const schemas = {
  tags: {
    type: 'array',
    items: { type: 'string' },
    min: 1,
    max: 10,
    unique: true
  },
  scores: {
    type: 'array',
    items: { type: 'number', min: 0, max: 100 },
    optional: true
  }
}
```

#### Object Type

```typescript
const ObjectSchema = data.schema({
  type: 'object',
  properties: {
    [key: string]: Schema  // Schema for each property
  },
  required?: string[],     // Required properties
  additionalProperties?: boolean, // Allow additional properties
  optional?: boolean       // Optional field
})

// Examples
const AddressSchema = data.schema({
  type: 'object',
  properties: {
    street: { type: 'string' },
    city: { type: 'string' },
    zipCode: { type: 'string', pattern: /^\d{5}$/ },
    country: { type: 'string', optional: true }
  },
  required: ['street', 'city', 'zipCode']
})
```

## Complex Schemas

### Nested Objects

```typescript
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  profile: {
    type: 'object',
    properties: {
      bio: { type: 'string', optional: true },
      avatar: { type: 'string', format: 'url', optional: true },
      preferences: {
        type: 'object',
        properties: {
          theme: { type: 'string', enum: ['light', 'dark'] },
          notifications: { type: 'boolean' }
        }
      }
    }
  },
  addresses: {
    type: 'array',
    items: AddressSchema,
    optional: true
  }
})
```

### Union Types

```typescript
const UnionSchema = data.schema({
  type: 'union',
  schemas: [
    { type: 'string' },
    { type: 'number' },
    { type: 'boolean' }
  ]
})

// More complex union
const PaymentSchema = data.schema({
  type: 'union',
  schemas: [
    {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['credit_card'] },
        cardNumber: { type: 'string' },
        expiryDate: { type: 'string' }
      }
    },
    {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['paypal'] },
        email: { type: 'string', format: 'email' }
      }
    }
  ]
})
```

### Conditional Schemas

```typescript
const ConditionalSchema = data.schema({
  type: 'object',
  properties: {
    userType: { type: 'string', enum: ['admin', 'user'] },
    permissions: {
      type: 'array',
      items: { type: 'string' },
      // Only required if userType is 'admin'
      condition: (data) => data.userType === 'admin'
    }
  }
})
```

## Schema Validation

### Basic Validation

```typescript
const result = data.validate(userData, UserSchema)

if (Result.isOk(result)) {
  console.log('Valid user:', result.value)
} else {
  console.error('Validation failed:', result.error)
}
```

### Validation Options

```typescript
interface ValidationOptions {
  strict?: boolean          // Fail on unknown properties
  coerce?: boolean         // Coerce types (string "123" -> number 123)
  stripUnknown?: boolean   // Remove unknown properties
  allowUnknown?: boolean   // Allow unknown properties
  abortEarly?: boolean     // Stop on first error
}

const result = data.validate(userData, UserSchema, {
  strict: true,
  stripUnknown: true,
  coerce: false
})
```

### Partial Validation

```typescript
// Validate only specific fields
const partialResult = data.validate(
  { name: 'John', email: 'john@example.com' },
  UserSchema,
  { partial: ['name', 'email'] }
)

// Validate for updates (all fields optional)
const updateResult = data.validate(
  updateData,
  UserSchema,
  { partial: true }
)
```

## Type Inference

### Automatic Type Generation

```typescript
const ProductSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 1, max: 200 },
  price: { type: 'number', min: 0 },
  category: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' }
    }
  },
  tags: {
    type: 'array',
    items: { type: 'string' },
    optional: true
  }
})

// Automatically inferred type
type Product = InferSchema<typeof ProductSchema>
/*
{
  id: string
  name: string
  price: number
  category: {
    id: string
    name: string
  }
  tags?: string[]
}
*/
```

### Working with Inferred Types

```typescript
// Use inferred types in functions
const processProduct = (product: Product) => {
  // TypeScript knows all properties
  console.log(product.id)
  console.log(product.name)
  console.log(product.price)
  
  // Optional properties are handled correctly
  if (product.tags) {
    product.tags.forEach(tag => console.log(tag))
  }
}

// Use with API responses
const fetchProducts = async (): Promise<Result<ServiceError, Product[]>> => {
  return service.get('/api/products', {
    validate: data.schema({
      products: {
        type: 'array',
        items: ProductSchema
      }
    })
  })
}
```

## Schema Composition

### Extending Schemas

```typescript
const BaseEntitySchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  createdAt: { type: 'string', format: 'datetime' },
  updatedAt: { type: 'string', format: 'datetime' }
})

const UserSchema = data.schema({
  ...BaseEntitySchema,
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' }
})

const ProductSchema = data.schema({
  ...BaseEntitySchema,
  name: { type: 'string', min: 1, max: 200 },
  price: { type: 'number', min: 0 }
})
```

### Schema References

```typescript
const CategorySchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string' },
  parent: {
    type: 'object',
    ref: 'Category',  // Reference to self
    optional: true
  }
})

const ProductSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string' },
  category: {
    type: 'object',
    ref: CategorySchema  // Reference to another schema
  }
})
```

## Advanced Features

### Custom Validators

```typescript
const UserSchema = data.schema({
  email: {
    type: 'string',
    format: 'email',
    custom: (value: string) => {
      // Custom validation logic
      if (value.endsWith('@tempmail.com')) {
        return {
          valid: false,
          message: 'Temporary email addresses not allowed'
        }
      }
      return { valid: true }
    }
  },
  age: {
    type: 'number',
    custom: (value: number) => {
      if (value < 13) {
        return {
          valid: false,
          message: 'Must be at least 13 years old'
        }
      }
      return { valid: true }
    }
  }
})
```

### Schema Transformations

```typescript
const UserSchema = data.schema({
  name: {
    type: 'string',
    transform: (value: string) => value.trim().toLowerCase()
  },
  email: {
    type: 'string',
    format: 'email',
    transform: (value: string) => value.toLowerCase()
  },
  age: {
    type: 'number',
    transform: (value: string | number) => {
      // Coerce string to number
      return typeof value === 'string' ? parseInt(value, 10) : value
    }
  }
})
```

### Conditional Validation

```typescript
const OrderSchema = data.schema({
  type: { type: 'string', enum: ['pickup', 'delivery'] },
  address: {
    type: 'object',
    properties: {
      street: { type: 'string' },
      city: { type: 'string' },
      zipCode: { type: 'string' }
    },
    // Only required for delivery orders
    required: (data) => data.type === 'delivery'
  },
  pickupTime: {
    type: 'string',
    format: 'datetime',
    // Only required for pickup orders
    required: (data) => data.type === 'pickup'
  }
})
```

## Performance Optimization

### Schema Compilation

```typescript
// Compile schema for faster validation
const compiledSchema = data.compile(UserSchema)

// Use compiled schema for validation
const result = compiledSchema.validate(userData)
```

### Schema Caching

```typescript
const schemaCache = new Map<string, CompiledSchema>()

const getCompiledSchema = (key: string, schema: Schema) => {
  if (!schemaCache.has(key)) {
    schemaCache.set(key, data.compile(schema))
  }
  return schemaCache.get(key)!
}

// Usage
const userSchema = getCompiledSchema('user', UserSchema)
const result = userSchema.validate(userData)
```

## Error Handling

### Validation Errors

```typescript
const result = data.validate(userData, UserSchema)

if (Result.isErr(result)) {
  const error = result.error
  console.log('Field:', error.field)
  console.log('Value:', error.value)
  console.log('Message:', error.message)
  console.log('Constraint:', error.constraint)
}
```

### Multiple Errors

```typescript
const result = data.validate(userData, UserSchema, {
  abortEarly: false  // Collect all errors
})

if (Result.isErr(result)) {
  const errors = result.error as ValidationError[]
  errors.forEach(error => {
    console.log(`${error.field}: ${error.message}`)
  })
}
```

### Custom Error Messages

```typescript
const UserSchema = data.schema({
  name: {
    type: 'string',
    min: 2,
    max: 100,
    messages: {
      required: 'Name is required',
      min: 'Name must be at least 2 characters',
      max: 'Name cannot exceed 100 characters'
    }
  },
  email: {
    type: 'string',
    format: 'email',
    messages: {
      format: 'Please enter a valid email address'
    }
  }
})
```

## Testing Schemas

### Unit Tests

```typescript
describe('Schema Validation', () => {
  it('should validate valid user data', () => {
    const validUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      active: true
    }
    
    const result = data.validate(validUser, UserSchema)
    expect(Result.isOk(result)).toBe(true)
  })
  
  it('should reject invalid user data', () => {
    const invalidUser = {
      id: 'invalid-uuid',
      name: 'J',  // Too short
      email: 'invalid-email',
      age: -1,    // Negative age
      active: 'yes'  // Wrong type
    }
    
    const result = data.validate(invalidUser, UserSchema)
    expect(Result.isErr(result)).toBe(true)
  })
  
  it('should handle optional fields', () => {
    const userWithoutOptional = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      active: true
    }
    
    const result = data.validate(userWithoutOptional, UserSchema)
    expect(Result.isOk(result)).toBe(true)
  })
})
```

### Property-Based Testing

```typescript
import { fc } from 'fast-check'

describe('Schema Property Tests', () => {
  it('should handle all valid user combinations', () => {
    const validUserArbitrary = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 2, maxLength: 100 }),
      email: fc.emailAddress(),
      age: fc.integer({ min: 0, max: 150 }),
      active: fc.boolean()
    })
    
    fc.assert(fc.property(validUserArbitrary, (user) => {
      const result = data.validate(user, UserSchema)
      expect(Result.isOk(result)).toBe(true)
    }))
  })
})
```

## Best Practices

1. **Use descriptive schema names** - Clear naming for maintainability
2. **Validate at boundaries** - Validate data entering your system
3. **Use type inference** - Let TypeScript generate types from schemas
4. **Compose schemas** - Build complex schemas from simpler ones
5. **Handle errors gracefully** - Provide meaningful error messages
6. **Cache compiled schemas** - Improve performance for repeated validation
7. **Test edge cases** - Validate boundary conditions and error paths

## Next Steps

- **[Data Validation](/api/data/schema)** - Detailed validation documentation
- **[Service Validation](/api/service/)** - Using schemas with HTTP requests
- **[Pipeline Validation](/api/pipeline/)** - Validation in data pipelines
- **[Result Pattern](/api/result)** - Error handling with Results