# Schema

Schemas provide type-safe validation using Zod with Result-based error handling. They integrate seamlessly with Pipelines, Forms, and other Kairo primitives for consistent data validation.

## Creating Schemas

```typescript
import { schema } from 'kairo'
import { z } from 'zod'

// Basic schema creation
const UserSchema = schema(
  z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().min(0).max(120),
  })
)

// String schema
const EmailSchema = schema(z.string().email())

// Array schema
const TagsSchema = schema(z.array(z.string()))
```

## Schema Validation

### Basic Validation

```typescript
const UserSchema = schema(
  z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })
)

// Valid data
const validResult = UserSchema.parse({
  name: 'John Doe',
  email: 'john@example.com',
})

if (validResult.tag === 'Ok') {
  console.log('Valid user:', validResult.value)
  // validResult.value is typed as { name: string, email: string }
}

// Invalid data
const invalidResult = UserSchema.parse({
  name: '',
  email: 'not-an-email',
})

if (invalidResult.tag === 'Err') {
  console.log('Validation errors:', invalidResult.error.issues)
}
```

### Safe Parsing

Schemas always return Results, never throw exceptions:

```typescript
// This never throws, always returns Result<ValidationError, T>
const result = UserSchema.parse(unknownData)

// Handle both success and error cases
const message = match(result, {
  Ok: user => `Hello, ${user.name}!`,
  Err: error => `Validation failed: ${error.message}`,
})
```

## Integration with Pipelines

### Input Validation

```typescript
const getUserPipeline = pipeline('get-user')
  .input(schema(z.object({ id: z.number() })))
  .fetch('/api/users/:id')
  .validate(UserSchema) // Response validation
  .map(user => user.name)

// Type-safe execution
const result = await getUserPipeline.run({ id: 123 })
// Input is validated as { id: number }
// Response is validated as User type
```

### Response Validation

```typescript
const apiPipeline = pipeline('api-call')
  .fetch('/api/data')
  .validate(
    schema(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            value: z.number(),
          })
        ),
        total: z.number(),
        hasMore: z.boolean(),
      })
    )
  )

// API response is validated and typed
const result = await apiPipeline.run()
if (result.tag === 'Ok') {
  console.log('Items:', result.value.items) // Fully typed
}
```

## Complex Schema Patterns

### Nested Objects

```typescript
const AddressSchema = schema(
  z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string(),
    country: z.string(),
  })
)

const UserSchema = schema(
  z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    address: AddressSchema.zod, // Use .zod to get underlying Zod schema
    preferences: z.object({
      theme: z.enum(['light', 'dark']),
      notifications: z.boolean(),
    }),
  })
)
```

### Arrays and Collections

```typescript
const ProductSchema = schema(
  z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().positive(),
    tags: z.array(z.string()),
    variants: z.array(
      z.object({
        size: z.string(),
        color: z.string(),
        stock: z.number().min(0),
      })
    ),
  })
)

const CartSchema = schema(
  z.object({
    items: z.array(
      z.object({
        productId: z.string(),
        quantity: z.number().positive(),
        selectedVariant: z.object({
          size: z.string(),
          color: z.string(),
        }),
      })
    ),
    total: z.number().positive(),
  })
)
```

### Union Types

```typescript
const EventSchema = schema(
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('user_created'),
      userId: z.string(),
      userData: UserSchema.zod,
    }),
    z.object({
      type: z.literal('user_updated'),
      userId: z.string(),
      changes: z.record(z.unknown()),
    }),
    z.object({
      type: z.literal('user_deleted'),
      userId: z.string(),
    }),
  ])
)

// Usage with type narrowing
const result = EventSchema.parse(eventData)
if (result.tag === 'Ok') {
  const event = result.value

  switch (event.type) {
    case 'user_created':
      console.log('New user:', event.userData.name)
      break
    case 'user_updated':
      console.log('User updated:', event.changes)
      break
    case 'user_deleted':
      console.log('User deleted:', event.userId)
      break
  }
}
```

## Custom Validation

### Custom Refinements

```typescript
const PasswordSchema = schema(
  z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine(
      password => /[A-Z]/.test(password),
      'Password must contain at least one uppercase letter'
    )
    .refine(password => /[0-9]/.test(password), 'Password must contain at least one number')
    .refine(
      password => /[^A-Za-z0-9]/.test(password),
      'Password must contain at least one special character'
    )
)
```

### Cross-field Validation

```typescript
const RegistrationSchema = schema(
  z
    .object({
      password: z.string().min(8),
      confirmPassword: z.string(),
      email: z.string().email(),
      agreeToTerms: z.boolean(),
    })
    .refine(data => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
    .refine(data => data.agreeToTerms, {
      message: 'You must agree to the terms',
      path: ['agreeToTerms'],
    })
)
```

## Conditional Schemas

```typescript
const CreateUserSchema = schema(
  z
    .object({
      name: z.string(),
      email: z.string().email(),
      userType: z.enum(['individual', 'business']),
      // Conditional fields based on userType
      businessName: z.string().optional(),
      taxId: z.string().optional(),
    })
    .refine(
      data => {
        if (data.userType === 'business') {
          return data.businessName && data.taxId
        }
        return true
      },
      {
        message: 'Business name and tax ID are required for business accounts',
        path: ['businessName'],
      }
    )
)
```

## Schema Utilities

### Transform and Preprocess

```typescript
// Transform data during validation
const DateSchema = schema(
  z
    .string()
    .transform(str => new Date(str))
    .refine(date => !isNaN(date.getTime()), 'Invalid date')
)

// Preprocess input
const NumberSchema = schema(
  z.preprocess(val => (typeof val === 'string' ? parseFloat(val) : val), z.number())
)
```

### Optional and Default Values

```typescript
const UserPreferencesSchema = schema(
  z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    language: z.string().default('en'),
    notifications: z.boolean().default(true),
    customSettings: z.record(z.unknown()).optional(),
  })
)

const result = UserPreferencesSchema.parse({})
if (result.tag === 'Ok') {
  console.log(result.value)
  // { theme: 'light', language: 'en', notifications: true }
}
```

## Error Handling

### Validation Errors

```typescript
const result = UserSchema.parse(invalidData)

if (result.tag === 'Err') {
  const error = result.error

  console.log('Validation failed:', error.message)
  console.log('Field errors:', error.issues)

  // Access specific field errors
  error.issues.forEach(issue => {
    console.log(`Field ${issue.path.join('.')}: ${issue.message}`)
  })
}
```

### Custom Error Messages

```typescript
const UserSchema = schema(
  z.object({
    name: z
      .string({
        required_error: 'Name is required',
        invalid_type_error: 'Name must be a string',
      })
      .min(1, 'Name cannot be empty'),

    age: z
      .number({
        required_error: 'Age is required',
        invalid_type_error: 'Age must be a number',
      })
      .min(0, 'Age cannot be negative')
      .max(120, 'Age seems unrealistic'),

    email: z.string().email('Please enter a valid email address'),
  })
)
```

## Integration with Forms

```typescript
import { form } from 'kairo'

const userForm = form({
  schema: UserSchema,
  validation: 'onBlur',
})

// Schema validation is automatically integrated
userForm.setField('email', 'invalid-email')
const validation = userForm.validateField('email')

if (validation.tag === 'Err') {
  console.log('Email validation failed:', validation.error.issues)
}
```

## Type Inference

Schemas provide full type inference:

```typescript
const UserSchema = schema(
  z.object({
    id: z.number(),
    name: z.string(),
    tags: z.array(z.string()),
  })
)

// TypeScript infers the type
type User = z.infer<typeof UserSchema.zod>
// User = { id: number, name: string, tags: string[] }

// Use in function signatures
function processUser(user: User) {
  // user is fully typed
  console.log(user.name.toUpperCase())
  console.log(user.tags.join(', '))
}
```

## Runtime Type Guards

```typescript
const isUser = (value: unknown): value is User => {
  const result = UserSchema.parse(value)
  return result.tag === 'Ok'
}

// Use as type guard
if (isUser(unknownData)) {
  // unknownData is now typed as User
  console.log(unknownData.name)
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest'

describe('UserSchema', () => {
  it('should validate correct user data', () => {
    const validUser = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    }

    const result = UserSchema.parse(validUser)

    expect(result.tag).toBe('Ok')
    if (result.tag === 'Ok') {
      expect(result.value.name).toBe('John Doe')
    }
  })

  it('should reject invalid email', () => {
    const invalidUser = {
      id: 1,
      name: 'John Doe',
      email: 'not-an-email',
    }

    const result = UserSchema.parse(invalidUser)

    expect(result.tag).toBe('Err')
    if (result.tag === 'Err') {
      expect(result.error.issues[0].path).toEqual(['email'])
    }
  })
})
```

## Best Practices

1. **Use descriptive error messages** for better user experience
2. **Leverage type inference** to avoid duplicating type definitions
3. **Keep schemas focused** on single data structures
4. **Use refinements** for complex validation logic
5. **Test validation logic** thoroughly including edge cases
6. **Consider performance** with very large or complex schemas
7. **Use custom transformations** to normalize data
8. **Integrate with forms** for consistent validation

## Performance Considerations

- **Schema compilation**: Schemas are compiled once and reused
- **Validation caching**: Consider caching validation results for expensive schemas
- **Lazy validation**: Only validate when necessary in pipelines
- **Transform optimization**: Use efficient transforms for better performance

Schemas provide the foundation for type-safe data validation throughout Kairo applications while maintaining consistency with the Result pattern and functional programming principles.
