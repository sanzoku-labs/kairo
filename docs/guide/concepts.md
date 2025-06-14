# Core Concepts

Understanding these fundamental concepts will help you use Kairo effectively.

## The Result Pattern

Kairo uses the Result pattern for error handling instead of throwing exceptions. This makes error flows explicit and predictable.

```typescript
type Result<E, T> = 
  | { tag: 'Ok', value: T }    // Success case
  | { tag: 'Err', error: E }   // Error case
```

### Benefits

- **Explicit error handling** - You must handle both success and error cases
- **No hidden exceptions** - All errors are visible in the type system
- **Composable** - Results can be chained and transformed safely
- **Predictable** - No surprise runtime crashes from uncaught exceptions

### Working with Results

```typescript
import { Result, Ok, Err, isOk, isErr, mapResult } from 'kairo'

// Creating results
const success: Result<Error, string> = Ok('Hello, world!')
const failure: Result<Error, string> = Err(new Error('Something went wrong'))

// Pattern matching
if (result.tag === 'Ok') {
  console.log(result.value) // TypeScript knows this is safe
} else {
  console.log(result.error.message)
}

// Using helpers
if (isOk(result)) {
  console.log(result.value)
}

// Transforming results
const transformed = mapResult(result, value => value.toUpperCase())
```

## Pipelines

Pipelines are the core abstraction in Kairo. They represent a sequence of operations that transform input data through various steps.

### Pipeline Philosophy

- **Lazy evaluation** - Pipelines define what to do, not when to do it
- **Immutable** - Each pipeline operation returns a new pipeline
- **Composable** - Pipelines can be combined and reused
- **Predictable** - Always return a Result, never throw

### Pipeline Lifecycle

```typescript
// 1. Definition (lazy)
const pipeline = pipeline('example')
  .input(schema)
  .fetch('/api/data')
  .validate(responseSchema)
  .map(transform)
  .trace('completed')

// 2. Execution (eager)
const result = await pipeline.run(inputData)

// 3. Result handling
if (isOk(result)) {
  // Use result.value
} else {
  // Handle result.error
}
```

### Pipeline Operations

#### Input Validation
```typescript
const pipeline = pipeline('validate-user')
  .input(UserInputSchema) // Validates input before processing
```

#### HTTP Requests
```typescript
const pipeline = pipeline('fetch-data')
  .fetch('/api/users/:id') // Makes HTTP request with URL interpolation
  .fetch((input) => `/api/users/${input.id}`) // Dynamic URLs
```

#### Data Transformation
```typescript
const pipeline = pipeline('transform')
  .map(user => ({ ...user, fullName: `${user.first} ${user.last}` }))
  .map(user => user.profile) // Chain transformations
```

#### Output Validation
```typescript
const pipeline = pipeline('validate-output')
  .validate(OutputSchema) // Validates response data
```

#### Error Handling
```typescript
const pipeline = pipeline('handle-errors')
  .mapError(error => {
    console.error('Pipeline failed:', error)
    return new CustomError('Operation failed', { cause: error })
  })
```

#### Debugging
```typescript
const pipeline = pipeline('debug')
  .trace('started')        // Add trace points
  .map(data => data.users)
  .trace('users-extracted') // Multiple traces allowed
```

## Schemas

Schemas provide type-safe validation using Zod under the hood.

```typescript
import { schema } from 'kairo'
import { z } from 'zod'

const UserSchema = schema(z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(150)
}))

// Use in pipelines
const pipeline = pipeline('user-pipeline')
  .input(UserSchema)     // Validate input
  .validate(UserSchema)  // Validate response
```

## Error Types

Kairo provides structured error types for different failure scenarios:

### ValidationError
```typescript
{
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  context: {
    field: 'email',
    value: 'invalid-email',
    rule: 'email format'
  }
}
```

### NetworkError
```typescript
{
  code: 'NETWORK_ERROR',
  message: 'Request failed',
  context: {
    url: '/api/users/123',
    method: 'GET',
    status: 404,
    statusText: 'Not Found'
  }
}
```

### TimeoutError
```typescript
{
  code: 'TIMEOUT_ERROR',
  message: 'Operation timed out',
  context: {
    duration: 5000,
    operation: 'fetch'
  }
}
```

## Functional Programming Utilities

Kairo includes functional programming utilities for common operations:

```typescript
import { pipe, compose, curry } from 'kairo/fp'

// Function composition
const processUser = pipe(
  validateEmail,
  normalizeUser,
  saveToDatabase
)

// Currying
const multiply = curry((a: number, b: number) => a * b)
const double = multiply(2) // Partially applied function

// Array operations
import { map, filter, reduce } from 'kairo/fp'

const users = [/* ... */]
const activeAdults = pipe(
  filter((user: User) => user.active),
  filter((user: User) => user.age >= 18),
  map((user: User) => user.profile)
)(users)
```

## Immutability

All operations in Kairo return new instances rather than mutating existing ones:

```typescript
const originalPipeline = pipeline('base')
  .input(schema)

const extendedPipeline = originalPipeline
  .fetch('/api/data')
  .validate(responseSchema)

// originalPipeline is unchanged
// extendedPipeline is a new instance with additional operations
```

This ensures:
- **Predictable behavior** - No unexpected mutations
- **Easy testing** - Pure functions are easier to test
- **Reusability** - Base pipelines can be safely extended
- **Debugging** - No hidden state changes

## Lazy Evaluation

Pipelines don't execute until `.run()` is called:

```typescript
// This defines the pipeline but doesn't execute anything
const pipeline = pipeline('lazy')
  .input(schema)
  .fetch('/api/data') // No HTTP request made yet
  .map(transform)     // No transformation performed yet

// Only now does execution happen
const result = await pipeline.run(input)
```

Benefits:
- **Performance** - Only execute when needed
- **Flexibility** - Pipelines can be stored, passed around, and configured
- **Testing** - Easy to mock and test individual steps
- **Optimization** - Potential for automatic optimizations

## Type Safety

Kairo leverages TypeScript's type system for maximum safety:

```typescript
const UserSchema = schema(z.object({
  id: z.number(),
  name: z.string()
}))

const pipeline = pipeline('typed')
  .input(UserSchema)
  .map(user => {
    // user is typed as { id: number, name: string }
    return user.name.toUpperCase() // ✅ TypeScript knows name is string
  })

const result = await pipeline.run({ id: 1, name: 'John' })

if (isOk(result)) {
  // result.value is typed as string
  console.log(result.value.length) // ✅ TypeScript knows this is safe
}
```

## Next Steps

- [API Reference](/api/) - Complete API documentation
- [Examples](/examples/) - Real-world usage patterns
- [GitHub Repository](https://github.com/sovanaryththorng/kairo) - Source code and issues