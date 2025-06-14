# Result

The Result type provides type-safe error handling without exceptions. It represents either a successful value (`Ok`) or an error (`Err`), making error handling explicit and predictable.

## Type Definition

```typescript
type Result<E, T> = OkResult<T> | ErrResult<E>

interface OkResult<T> {
  tag: 'Ok'
  value: T
}

interface ErrResult<E> {
  tag: 'Err'
  error: E
}
```

## Creating Results

### Success Results

```typescript
import { Result } from 'kairo'

// Create a successful result
const success: Result<Error, string> = { tag: 'Ok', value: 'Hello World' }

// Helper function for success
const ok = <T>(value: T): Result<never, T> => ({ tag: 'Ok', value })
```

### Error Results

```typescript
// Create an error result
const failure: Result<Error, string> = {
  tag: 'Err',
  error: new Error('Something went wrong'),
}

// Helper function for errors
const err = <E>(error: E): Result<E, never> => ({ tag: 'Err', error })
```

## Working with Results

### Pattern Matching

Use the `match` function for exhaustive pattern matching:

```typescript
import { match } from 'kairo'

const result: Result<Error, number> = { tag: 'Ok', value: 42 }

const output = match(result, {
  Ok: value => `Success: ${value}`,
  Err: error => `Error: ${error.message}`,
})

console.log(output) // "Success: 42"
```

### Branch Checking

Check result type with discriminated unions:

```typescript
if (result.tag === 'Ok') {
  console.log('Value:', result.value) // TypeScript knows this is the value
} else {
  console.log('Error:', result.error) // TypeScript knows this is the error
}
```

## Transformation Functions

### `map` - Transform Success Values

Transform the value inside an `Ok` result:

```typescript
import { map } from 'kairo'

const result: Result<Error, number> = { tag: 'Ok', value: 5 }
const doubled = map(result, x => x * 2)
// { tag: 'Ok', value: 10 }

const errorResult: Result<Error, number> = { tag: 'Err', error: new Error('fail') }
const stillError = map(errorResult, x => x * 2)
// { tag: 'Err', error: Error('fail') } - unchanged
```

### `flatMap` - Chain Result-Returning Operations

Chain operations that return Results:

```typescript
import { flatMap } from 'kairo'

const divide = (x: number, y: number): Result<Error, number> =>
  y === 0 ? { tag: 'Err', error: new Error('Division by zero') } : { tag: 'Ok', value: x / y }

const result: Result<Error, number> = { tag: 'Ok', value: 10 }
const divided = flatMap(result, x => divide(x, 2))
// { tag: 'Ok', value: 5 }

const divideByZero = flatMap(result, x => divide(x, 0))
// { tag: 'Err', error: Error('Division by zero') }
```

### `mapError` - Transform Error Values

Transform the error inside an `Err` result:

```typescript
import { mapError } from 'kairo'

const result: Result<string, number> = { tag: 'Err', error: 'network timeout' }
const mappedError = mapError(result, err => new Error(`Network: ${err}`))
// { tag: 'Err', error: Error('Network: network timeout') }
```

### `chain` - Alternative to flatMap

`chain` is an alias for `flatMap`:

```typescript
import { chain } from 'kairo'

const result = chain({ tag: 'Ok', value: 5 }, x => ({ tag: 'Ok', value: x * 2 }))
// { tag: 'Ok', value: 10 }
```

## Functional Composition

Results work seamlessly with functional programming utilities:

```typescript
import { pipe, map, flatMap } from 'kairo'

const processNumber = pipe(
  (x: number) => ({ tag: 'Ok', value: x }) as Result<Error, number>,
  map(x => x * 2),
  flatMap(x => (x > 10 ? { tag: 'Ok', value: x } : { tag: 'Err', error: new Error('Too small') }))
)

const result = processNumber(6) // { tag: 'Ok', value: 12 }
```

## Async Results

Results work well with async operations:

```typescript
async function fetchUser(id: number): Promise<Result<Error, User>> {
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) {
      return { tag: 'Err', error: new Error(`HTTP ${response.status}`) }
    }
    const user = await response.json()
    return { tag: 'Ok', value: user }
  } catch (error) {
    return { tag: 'Err', error: error instanceof Error ? error : new Error('Unknown error') }
  }
}

// Usage with async/await
const userResult = await fetchUser(123)
if (userResult.tag === 'Ok') {
  console.log('User:', userResult.value)
} else {
  console.error('Failed to fetch user:', userResult.error.message)
}
```

## Integration with Pipelines

Results are the foundation of Pipeline error handling:

```typescript
import { pipeline, schema } from 'kairo'

const userPipeline = pipeline('get-user')
  .input(schema(z.object({ id: z.number() })))
  .fetch('/api/users/:id') // Returns Result<NetworkError, unknown>
  .validate(UserSchema) // Returns Result<ValidationError, User>
  .map(user => user.name) // Returns Result<ValidationError, string>

const result = await userPipeline.run({ id: 123 })
// result is Result<NetworkError | ValidationError, string>
```

## Error Types

Kairo provides specific error types that work with Results:

```typescript
import type { NetworkError, ValidationError, TimeoutError } from 'kairo'

// Pipeline operations return typed errors
const result: Result<NetworkError | ValidationError, User> = await userPipeline.run(input)
```

## Utility Functions

### Type Guards

```typescript
// Check if result is Ok
function isOk<E, T>(result: Result<E, T>): result is OkResult<T> {
  return result.tag === 'Ok'
}

// Check if result is Err
function isErr<E, T>(result: Result<E, T>): result is ErrResult<E> {
  return result.tag === 'Err'
}
```

### Extracting Values

```typescript
// Get value or throw (use sparingly)
function unwrap<E, T>(result: Result<E, T>): T {
  if (result.tag === 'Ok') {
    return result.value
  }
  throw new Error('Attempted to unwrap an Err result')
}

// Get value or default
function unwrapOr<E, T>(result: Result<E, T>, defaultValue: T): T {
  return result.tag === 'Ok' ? result.value : defaultValue
}
```

## Best Practices

1. **Use pattern matching** with `match()` for exhaustive handling
2. **Chain operations** with `flatMap()` to avoid nested error checking
3. **Transform errors** with `mapError()` to provide better context
4. **Avoid unwrapping** unless absolutely necessary
5. **Compose functions** that return Results for clean error propagation
6. **Use type guards** (`isOk`, `isErr`) for conditional logic

## Common Patterns

### Multiple Operations

```typescript
const processData = async (input: UserInput): Promise<Result<Error, ProcessedUser>> => {
  const validationResult = validateInput(input)
  if (validationResult.tag === 'Err') return validationResult

  const fetchResult = await fetchUserData(validationResult.value.id)
  if (fetchResult.tag === 'Err') return fetchResult

  const processResult = processUser(fetchResult.value)
  return processResult
}
```

### With Functional Composition

```typescript
const processData = (input: UserInput) =>
  pipe(
    validateInput,
    flatMap(data => fetchUserData(data.id)),
    flatMap(processUser)
  )(input)
```

The Result type eliminates the need for try-catch blocks and makes error handling explicit, leading to more robust and maintainable code.
