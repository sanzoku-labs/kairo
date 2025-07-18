# Result Pattern API

The Result pattern is Kairo's core error handling mechanism. All operations return `Result<Error, Data>` types for safe, explicit error handling.

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

## Creation Functions

### `Result.Ok<T>(value: T): OkResult<T>`

Creates a successful result containing a value.

```typescript
const success = Result.Ok(42)
const userResult = Result.Ok({ id: '1', name: 'John' })
const listResult = Result.Ok([1, 2, 3])
```

### `Result.Err<E>(error: E): ErrResult<E>`

Creates an error result containing an error.

```typescript
const error = Result.Err('Something went wrong')
const detailedError = Result.Err({
  code: 'VALIDATION_ERROR',
  message: 'Invalid input',
  field: 'email'
})
```

### `Result.fromPromise<T>(promise: Promise<T>, errorMapper?: (error: unknown) => E): Promise<Result<E, T>>`

Converts a Promise to a Result, catching any thrown exceptions.

```typescript
// Basic usage
const result = await Result.fromPromise(
  fetch('/api/users').then(r => r.json())
)

// With error mapping
const result = await Result.fromPromise(
  fetch('/api/users').then(r => r.json()),
  (error) => ({
    code: 'FETCH_ERROR',
    message: error.message,
    timestamp: Date.now()
  })
)
```

### `Result.fromTry<T>(fn: () => T, errorMapper?: (error: unknown) => E): Result<E, T>`

Executes a function and catches any thrown exceptions, returning a Result.

```typescript
// Basic usage
const result = Result.fromTry(() => JSON.parse(jsonString))

// With error mapping
const result = Result.fromTry(
  () => JSON.parse(jsonString),
  (error) => ({
    code: 'PARSE_ERROR',
    message: 'Invalid JSON',
    cause: error
  })
)
```

## Type Guards

### `Result.isOk<T>(result: Result<any, T>): result is OkResult<T>`

Checks if a Result is successful and narrows the type.

```typescript
const result = await service.get('/api/users')

if (Result.isOk(result)) {
  // result.value is properly typed
  console.log('Users:', result.value)
  result.value.forEach(user => console.log(user.name))
}
```

### `Result.isErr<E>(result: Result<E, any>): result is ErrResult<E>`

Checks if a Result is an error and narrows the type.

```typescript
const result = await service.get('/api/users')

if (Result.isErr(result)) {
  // result.error is properly typed
  console.error('Error:', result.error.message)
  console.error('Code:', result.error.code)
}
```

## Pattern Matching

### `Result.match<E, T, U>(result: Result<E, T>, handlers: MatchHandlers<E, T, U>): U`

Pattern matching for Results with exhaustive case handling.

```typescript
interface MatchHandlers<E, T, U> {
  Ok: (value: T) => U
  Err: (error: E) => U
}

// Basic usage
const message = Result.match(result, {
  Ok: users => `Found ${users.length} users`,
  Err: error => `Error: ${error.message}`
})

// With complex handling
const processedData = Result.match(userResult, {
  Ok: users => {
    const active = users.filter(u => u.active)
    return {
      success: true,
      data: active,
      count: active.length
    }
  },
  Err: error => {
    logger.error('User fetch failed', error)
    return {
      success: false,
      data: [],
      count: 0
    }
  }
})
```

## Transformation Functions

### `Result.map<E, T, U>(result: Result<E, T>, fn: (value: T) => U): Result<E, U>`

Transforms the success value of a Result, leaving errors unchanged.

```typescript
const numberResult = Result.Ok(42)
const stringResult = Result.map(numberResult, n => n.toString())
// Result<never, string>

const userResult = await service.get('/api/users')
const nameResult = Result.map(userResult, users => 
  users.map(user => user.name)
)
// Result<ServiceError, string[]>
```

### `Result.mapError<E, T, F>(result: Result<E, T>, fn: (error: E) => F): Result<F, T>`

Transforms the error of a Result, leaving success values unchanged.

```typescript
const result = await service.get('/api/users')
const enhancedResult = Result.mapError(result, error => ({
  ...error,
  timestamp: Date.now(),
  context: 'user-fetch',
  userMessage: 'Failed to load users'
}))
```

### `Result.flatMap<E, T, U>(result: Result<E, T>, fn: (value: T) => Result<E, U>): Result<E, U>`

Chains operations that return Results, flattening nested Results.

```typescript
const userResult = await service.get('/api/users')
const processedResult = Result.flatMap(userResult, users => {
  if (users.length === 0) {
    return Result.Err({
      code: 'NO_USERS',
      message: 'No users found'
    })
  }
  
  const active = users.filter(u => u.active)
  return Result.Ok(active)
})
```

## Utility Functions

### `Result.unwrap<T>(result: Result<any, T>): T`

Extracts the value from a successful Result. **Throws if the Result is an error.**

```typescript
const result = Result.Ok(42)
const value = Result.unwrap(result) // 42

// ⚠️ Dangerous - will throw if error
const errorResult = Result.Err('Failed')
const value = Result.unwrap(errorResult) // Throws!
```

### `Result.unwrapOr<T>(result: Result<any, T>, defaultValue: T): T`

Extracts the value from a Result, returning a default if it's an error.

```typescript
const successResult = Result.Ok(42)
const value1 = Result.unwrapOr(successResult, 0) // 42

const errorResult = Result.Err('Failed')
const value2 = Result.unwrapOr(errorResult, 0) // 0
```

### `Result.unwrapOrElse<T>(result: Result<any, T>, fn: (error: any) => T): T`

Extracts the value from a Result, computing a default if it's an error.

```typescript
const result = Result.Err({ code: 'NOT_FOUND' })
const value = Result.unwrapOrElse(result, error => {
  console.log('Error occurred:', error.code)
  return getDefaultValue()
})
```

## Combining Results

### Multiple Results

```typescript
// Combine multiple Results
const combineResults = <T>(results: Result<any, T>[]): Result<any, T[]> => {
  const values: T[] = []
  
  for (const result of results) {
    if (Result.isErr(result)) {
      return result
    }
    values.push(result.value)
  }
  
  return Result.Ok(values)
}

// Usage
const results = await Promise.all([
  service.get('/api/users'),
  service.get('/api/posts'),
  service.get('/api/comments')
])

const combined = combineResults(results)
if (Result.isOk(combined)) {
  const [users, posts, comments] = combined.value
}
```

### Sequential Operations

```typescript
const processUserData = async (userId: string) => {
  // Fetch user
  const userResult = await service.get(`/api/users/${userId}`)
  if (Result.isErr(userResult)) {
    return userResult
  }
  
  // Validate user
  const validationResult = data.validate(userResult.value, UserSchema)
  if (Result.isErr(validationResult)) {
    return validationResult
  }
  
  // Process user
  const processedResult = pipeline.map([validationResult.value], processUser)
  if (Result.isErr(processedResult)) {
    return processedResult
  }
  
  return Result.Ok(processedResult.value[0])
}
```

## Advanced Patterns

### Result Monad

```typescript
class ResultMonad<E, T> {
  constructor(private result: Result<E, T>) {}
  
  static of<T>(value: T): ResultMonad<never, T> {
    return new ResultMonad(Result.Ok(value))
  }
  
  static error<E>(error: E): ResultMonad<E, never> {
    return new ResultMonad(Result.Err(error))
  }
  
  map<U>(fn: (value: T) => U): ResultMonad<E, U> {
    return new ResultMonad(Result.map(this.result, fn))
  }
  
  flatMap<U>(fn: (value: T) => ResultMonad<E, U>): ResultMonad<E, U> {
    if (Result.isErr(this.result)) {
      return new ResultMonad(this.result)
    }
    
    return fn(this.result.value)
  }
  
  mapError<F>(fn: (error: E) => F): ResultMonad<F, T> {
    return new ResultMonad(Result.mapError(this.result, fn))
  }
  
  unwrap(): Result<E, T> {
    return this.result
  }
}

// Usage
const result = ResultMonad.of(42)
  .map(x => x * 2)
  .flatMap(x => x > 50 ? 
    ResultMonad.of(x) : 
    ResultMonad.error('Too small')
  )
  .unwrap()
```

### Async Result Operations

```typescript
const asyncMap = async <E, T, U>(
  result: Result<E, T>,
  fn: (value: T) => Promise<U>
): Promise<Result<E, U>> => {
  if (Result.isErr(result)) {
    return result
  }
  
  try {
    const value = await fn(result.value)
    return Result.Ok(value)
  } catch (error) {
    return Result.Err(error as E)
  }
}

// Usage
const userResult = await service.get('/api/users')
const processedResult = await asyncMap(userResult, async users => {
  const processed = await Promise.all(
    users.map(user => processUserAsync(user))
  )
  return processed
})
```

### Result Collection

```typescript
const collect = <E, T>(results: Result<E, T>[]): Result<E[], T[]> => {
  const values: T[] = []
  const errors: E[] = []
  
  for (const result of results) {
    if (Result.isOk(result)) {
      values.push(result.value)
    } else {
      errors.push(result.error)
    }
  }
  
  if (errors.length > 0) {
    return Result.Err(errors)
  }
  
  return Result.Ok(values)
}

// Usage with partial failures
const results = await Promise.all([
  service.get('/api/users'),
  service.get('/api/posts'),
  service.get('/api/comments')
])

const collected = collect(results)
Result.match(collected, {
  Ok: ([users, posts, comments]) => {
    // All successful
  },
  Err: errors => {
    // Some failed
    console.log(`${errors.length} requests failed`)
  }
})
```

## Testing with Results

### Unit Tests

```typescript
describe('Result API', () => {
  it('should create Ok result', () => {
    const result = Result.Ok(42)
    
    expect(Result.isOk(result)).toBe(true)
    expect(Result.isErr(result)).toBe(false)
    
    if (Result.isOk(result)) {
      expect(result.value).toBe(42)
    }
  })
  
  it('should create Err result', () => {
    const error = { code: 'TEST_ERROR', message: 'Test failed' }
    const result = Result.Err(error)
    
    expect(Result.isErr(result)).toBe(true)
    expect(Result.isOk(result)).toBe(false)
    
    if (Result.isErr(result)) {
      expect(result.error).toEqual(error)
    }
  })
  
  it('should map Ok values', () => {
    const result = Result.Ok(10)
    const mapped = Result.map(result, x => x * 2)
    
    expect(Result.isOk(mapped)).toBe(true)
    if (Result.isOk(mapped)) {
      expect(mapped.value).toBe(20)
    }
  })
  
  it('should not map Err values', () => {
    const result = Result.Err('error')
    const mapped = Result.map(result, x => x * 2)
    
    expect(Result.isErr(mapped)).toBe(true)
    if (Result.isErr(mapped)) {
      expect(mapped.error).toBe('error')
    }
  })
})
```

### Integration Tests

```typescript
describe('Result Pattern Integration', () => {
  it('should handle service operations', async () => {
    const result = await service.get('/api/users')
    
    expect(result).toHaveProperty('tag')
    expect(['Ok', 'Err']).toContain(result.tag)
    
    if (Result.isOk(result)) {
      expect(Array.isArray(result.value)).toBe(true)
    }
  })
  
  it('should chain operations correctly', async () => {
    const result = await service.get('/api/users')
    
    const processed = Result.flatMap(result, users => {
      if (users.length === 0) {
        return Result.Err({ code: 'NO_USERS' })
      }
      return Result.Ok(users.filter(u => u.active))
    })
    
    // Test both success and error paths
    if (Result.isOk(processed)) {
      expect(Array.isArray(processed.value)).toBe(true)
    } else {
      expect(processed.error).toHaveProperty('code')
    }
  })
})
```

## Performance Considerations

### Memory Usage

```typescript
// ✅ Efficient - reuse Results
const cachedResult = Result.Ok(expensiveComputation())
const result1 = Result.map(cachedResult, transform1)
const result2 = Result.map(cachedResult, transform2)

// ❌ Inefficient - repeated computation
const result1 = Result.map(Result.Ok(expensiveComputation()), transform1)
const result2 = Result.map(Result.Ok(expensiveComputation()), transform2)
```

### Error Handling Performance

```typescript
// ✅ Efficient - early returns
const processData = (data: any[]) => {
  if (data.length === 0) {
    return Result.Err({ code: 'EMPTY_DATA' })
  }
  
  // Process data...
  return Result.Ok(processed)
}

// ❌ Less efficient - unnecessary processing
const processData = (data: any[]) => {
  const processed = expensiveOperation(data)
  
  if (data.length === 0) {
    return Result.Err({ code: 'EMPTY_DATA' })
  }
  
  return Result.Ok(processed)
}
```

## Best Practices

1. **Always use type guards** - Check Result type before accessing values
2. **Use pattern matching** - For complex Result handling
3. **Avoid unwrap()** - Use unwrapOr() or unwrapOrElse() for safety
4. **Chain operations** - Use flatMap for sequential operations
5. **Handle errors explicitly** - Don't ignore error cases
6. **Provide context** - Include relevant information in errors
7. **Use early returns** - Simplify control flow with early error returns

## Next Steps

- **[Error Handling Guide](/guide/error-handling)** - Comprehensive error management
- **[Service API](/api/service/)** - SERVICE pillar documentation
- **[Data API](/api/data/)** - DATA pillar documentation
- **[Pipeline API](/api/pipeline/)** - PIPELINE pillar documentation