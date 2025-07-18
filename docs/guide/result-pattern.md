# Result Pattern

The Result pattern is a fundamental concept in Kairo that provides safe, explicit error handling without exceptions. All operations return `Result<Error, Data>` types for predictable error management.

## What is the Result Pattern?

The Result pattern represents the outcome of an operation that can either succeed with a value or fail with an error. Instead of throwing exceptions, operations return a Result that explicitly indicates success or failure.

```typescript
type Result<E, T> = 
  | { tag: 'Ok'; value: T }
  | { tag: 'Err'; error: E }
```

## Why Use Result Pattern?

### Problems with Exceptions

```typescript
// ❌ Exception-based error handling
try {
  const response = await fetch('/api/users')
  const data = await response.json()
  console.log(data)
} catch (error) {
  // What type of error? Network? Parse? HTTP?
  console.error(error)
}
```

**Issues:**
- **Invisible error paths** - No indication that function can fail
- **Unclear error types** - What specific errors can occur?
- **Easy to forget** - Forgetting try/catch causes crashes
- **Performance overhead** - Exception handling is expensive
- **Hard to compose** - Complex error handling in pipelines

### Benefits of Result Pattern

```typescript
// ✅ Result-based error handling
const result = await service.get('/api/users')
if (Result.isOk(result)) {
  console.log(result.value)
} else {
  console.error(result.error.message)
}
```

**Benefits:**
- **Explicit error handling** - Clear indication of possible failure
- **Type safety** - Specific error types in TypeScript
- **Composable** - Easy to chain operations
- **Performance** - No exception overhead
- **Predictable** - All error paths are visible

## Creating Results

### Success Results

```typescript
// Create success result
const success = Result.Ok(42)
const userSuccess = Result.Ok({ id: '1', name: 'John' })

// Type inference works
const stringResult = Result.Ok('Hello') // Result<never, string>
```

### Error Results

```typescript
// Create error result
const error = Result.Err(new Error('Something went wrong'))
const serviceError = Result.Err({
  code: 'SERVICE_ERROR',
  message: 'Request failed',
  timestamp: Date.now()
})

// Type inference works
const errorResult = Result.Err('Failed') // Result<string, never>
```

### From Promises

```typescript
// Convert promise to Result
const resultFromPromise = await Result.fromPromise(
  fetch('/api/users'),
  (error) => ({ code: 'FETCH_ERROR', message: error.message })
)

// Or using try/catch pattern
const resultFromTry = Result.fromTry(
  () => JSON.parse(jsonString),
  (error) => ({ code: 'PARSE_ERROR', message: error.message })
)
```

## Checking Results

### Type Guards

```typescript
const result = await service.get('/api/users')

// Check if successful
if (Result.isOk(result)) {
  // result.value is properly typed
  console.log('Users:', result.value)
}

// Check if error
if (Result.isErr(result)) {
  // result.error is properly typed
  console.error('Error:', result.error.message)
}
```

### Pattern Matching

```typescript
// Comprehensive pattern matching
const handleResult = (result: Result<ServiceError, User[]>) => {
  return Result.match(result, {
    Ok: users => {
      console.log(`Found ${users.length} users`)
      return users
    },
    Err: error => {
      console.error(`Error: ${error.message}`)
      return []
    }
  })
}

// Usage
const result = await service.get('/api/users')
const users = handleResult(result)
```

## Transforming Results

### Mapping Values

```typescript
const userResult = await service.get('/api/users')

// Transform success value
const nameResult = Result.map(userResult, users => 
  users.map(user => user.name)
)

// Chain transformations
const upperNameResult = Result.map(nameResult, names =>
  names.map(name => name.toUpperCase())
)
```

### Mapping Errors

```typescript
const result = await service.get('/api/users')

// Transform error
const enhancedResult = Result.mapError(result, error => ({
  ...error,
  timestamp: Date.now(),
  context: 'user-fetch'
}))
```

### Flat Mapping

```typescript
const userResult = await service.get('/api/users')

// Chain operations that return Results
const processedResult = Result.flatMap(userResult, users => {
  if (users.length === 0) {
    return Result.Err({ code: 'NO_USERS', message: 'No users found' })
  }
  
  return Result.Ok(users.filter(user => user.active))
})
```

## Error Handling Patterns

### Specific Error Handling

```typescript
const handleServiceError = (error: ServiceError) => {
  switch (error.code) {
    case 'SERVICE_HTTP_ERROR':
      console.error(`HTTP ${error.status}: ${error.statusText}`)
      break
    case 'SERVICE_NETWORK_ERROR':
      console.error('Network error:', error.message)
      break
    case 'SERVICE_TIMEOUT_ERROR':
      console.error('Request timeout')
      break
    default:
      console.error('Unknown error:', error.message)
  }
}

const result = await service.get('/api/users')
if (Result.isErr(result)) {
  handleServiceError(result.error)
}
```

### Error Recovery

```typescript
const fetchWithFallback = async (url: string) => {
  const result = await service.get(url)
  
  if (Result.isOk(result)) {
    return result
  }
  
  // Try fallback
  console.log('Primary failed, trying fallback...')
  const fallbackResult = await service.get('/api/fallback')
  
  if (Result.isOk(fallbackResult)) {
    return fallbackResult
  }
  
  // Return cached data as last resort
  return Result.Ok(getCachedData())
}
```

### Error Aggregation

```typescript
const validateUser = (user: any): Result<ValidationError[], ValidUser> => {
  const errors: ValidationError[] = []
  
  if (!user.name || user.name.length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' })
  }
  
  if (!user.email || !user.email.includes('@')) {
    errors.push({ field: 'email', message: 'Valid email required' })
  }
  
  if (!user.age || user.age < 0) {
    errors.push({ field: 'age', message: 'Age must be positive' })
  }
  
  if (errors.length > 0) {
    return Result.Err(errors)
  }
  
  return Result.Ok(user as ValidUser)
}
```

## Combining Results

### Sequential Operations

```typescript
const processUser = async (userId: string) => {
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
  const processedResult = pipeline.map([validationResult.value], processUserData)
  if (Result.isErr(processedResult)) {
    return processedResult
  }
  
  return Result.Ok(processedResult.value[0])
}
```

### Parallel Operations

```typescript
const fetchUserData = async (userId: string) => {
  const [profileResult, postsResult, followersResult] = await Promise.all([
    service.get(`/api/users/${userId}`),
    service.get(`/api/users/${userId}/posts`),
    service.get(`/api/users/${userId}/followers`)
  ])
  
  // Check all results
  if (Result.isErr(profileResult)) {
    return profileResult
  }
  if (Result.isErr(postsResult)) {
    return postsResult
  }
  if (Result.isErr(followersResult)) {
    return followersResult
  }
  
  // Combine successful results
  return Result.Ok({
    profile: profileResult.value,
    posts: postsResult.value,
    followers: followersResult.value
  })
}
```

### Result Utilities

```typescript
// Utility to combine multiple Results
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

## Result in Pipelines

### Pipeline Composition

```typescript
const userProcessor = pipeline.compose([
  // Each step returns a Result
  (data) => pipeline.validate(data, UserSchema),
  (result) => {
    if (Result.isErr(result)) return result
    return pipeline.filter(result.value, user => user.active)
  },
  (result) => {
    if (Result.isErr(result)) return result
    return pipeline.map(result.value, user => ({
      ...user,
      displayName: user.name.toUpperCase()
    }))
  }
])

// Usage
const result = userProcessor(rawUserData)
if (Result.isOk(result)) {
  console.log('Processed users:', result.value)
}
```

### Error Handling in Pipelines

```typescript
const robustProcessor = pipeline.compose([
  (data) => {
    const result = pipeline.validate(data, UserSchema)
    if (Result.isErr(result)) {
      console.log('Validation failed, using defaults')
      return Result.Ok([getDefaultUser()])
    }
    return result
  },
  (result) => {
    if (Result.isErr(result)) return result
    
    const filtered = pipeline.filter(result.value, user => user.active)
    if (Result.isErr(filtered)) {
      console.log('Filtering failed, returning all users')
      return result
    }
    
    return filtered
  }
])
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
  
  unwrap(): Result<E, T> {
    return this.result
  }
}

// Usage
const result = ResultMonad.of(42)
  .map(x => x * 2)
  .flatMap(x => x > 50 ? ResultMonad.of(x) : ResultMonad.error('Too small'))
  .unwrap()
```

### Result Validation

```typescript
interface ValidationContext {
  field: string
  value: any
  schema: Schema
}

const validateField = (context: ValidationContext): Result<ValidationError, any> => {
  const { field, value, schema } = context
  
  if (schema.required && (value === undefined || value === null)) {
    return Result.Err({
      field,
      message: `${field} is required`,
      code: 'REQUIRED'
    })
  }
  
  if (schema.type && typeof value !== schema.type) {
    return Result.Err({
      field,
      message: `${field} must be ${schema.type}`,
      code: 'TYPE_ERROR'
    })
  }
  
  return Result.Ok(value)
}

// Usage
const nameResult = validateField({
  field: 'name',
  value: userData.name,
  schema: { type: 'string', required: true }
})
```

## Testing with Results

### Unit Testing

```typescript
describe('Result Pattern', () => {
  it('should handle success case', () => {
    const result = Result.Ok(42)
    
    expect(Result.isOk(result)).toBe(true)
    expect(Result.isErr(result)).toBe(false)
    
    if (Result.isOk(result)) {
      expect(result.value).toBe(42)
    }
  })
  
  it('should handle error case', () => {
    const error = { code: 'TEST_ERROR', message: 'Test failed' }
    const result = Result.Err(error)
    
    expect(Result.isErr(result)).toBe(true)
    expect(Result.isOk(result)).toBe(false)
    
    if (Result.isErr(result)) {
      expect(result.error).toEqual(error)
    }
  })
  
  it('should transform values correctly', () => {
    const result = Result.Ok(10)
    const doubled = Result.map(result, x => x * 2)
    
    expect(Result.isOk(doubled)).toBe(true)
    if (Result.isOk(doubled)) {
      expect(doubled.value).toBe(20)
    }
  })
})
```

### Integration Testing

```typescript
describe('Service with Result Pattern', () => {
  it('should return Ok result on success', async () => {
    // Mock successful response
    const result = await service.get('/api/users')
    
    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      expect(Array.isArray(result.value)).toBe(true)
    }
  })
  
  it('should return Err result on failure', async () => {
    // Mock failed response
    const result = await service.get('/api/invalid')
    
    expect(Result.isErr(result)).toBe(true)
    if (Result.isErr(result)) {
      expect(result.error.code).toBe('SERVICE_HTTP_ERROR')
    }
  })
})
```

## Best Practices

### 1. **Always Check Results**

```typescript
// ✅ Good
const result = await service.get('/api/users')
if (Result.isOk(result)) {
  console.log(result.value)
} else {
  console.error(result.error)
}

// ❌ Bad
const result = await service.get('/api/users')
console.log(result.value) // Might be undefined!
```

### 2. **Use Pattern Matching**

```typescript
// ✅ Good
const message = Result.match(result, {
  Ok: data => `Success: ${data.length} items`,
  Err: error => `Error: ${error.message}`
})

// ❌ Less clear
let message
if (Result.isOk(result)) {
  message = `Success: ${result.value.length} items`
} else {
  message = `Error: ${result.error.message}`
}
```

### 3. **Provide Context in Errors**

```typescript
// ✅ Good
const result = await service.get('/api/users')
if (Result.isErr(result)) {
  console.error('Failed to fetch users:', result.error)
}

// ❌ Missing context
const result = await service.get('/api/users')
if (Result.isErr(result)) {
  console.error(result.error)
}
```

### 4. **Use Early Returns**

```typescript
// ✅ Good
const processUser = async (userId: string) => {
  const userResult = await service.get(`/api/users/${userId}`)
  if (Result.isErr(userResult)) {
    return userResult
  }
  
  const user = userResult.value
  // Continue processing...
}

// ❌ Nested conditions
const processUser = async (userId: string) => {
  const userResult = await service.get(`/api/users/${userId}`)
  if (Result.isOk(userResult)) {
    const user = userResult.value
    // Continue processing...
  } else {
    return userResult
  }
}
```

## Common Pitfalls

### 1. **Forgetting to Check Results**

```typescript
// ❌ Don't do this
const result = await service.get('/api/users')
result.value.forEach(user => console.log(user)) // Might crash!

// ✅ Always check first
const result = await service.get('/api/users')
if (Result.isOk(result)) {
  result.value.forEach(user => console.log(user))
}
```

### 2. **Nested Result Checking**

```typescript
// ❌ Avoid deep nesting
const result1 = await service.get('/api/users')
if (Result.isOk(result1)) {
  const result2 = await service.get('/api/posts')
  if (Result.isOk(result2)) {
    const result3 = await service.get('/api/comments')
    if (Result.isOk(result3)) {
      // Process all results
    }
  }
}

// ✅ Use early returns
const processAll = async () => {
  const usersResult = await service.get('/api/users')
  if (Result.isErr(usersResult)) return usersResult
  
  const postsResult = await service.get('/api/posts')
  if (Result.isErr(postsResult)) return postsResult
  
  const commentsResult = await service.get('/api/comments')
  if (Result.isErr(commentsResult)) return commentsResult
  
  // Process all results
  return Result.Ok({
    users: usersResult.value,
    posts: postsResult.value,
    comments: commentsResult.value
  })
}
```

## Next Steps

- **[Error Handling](/guide/error-handling)** - Comprehensive error management
- **[Configuration Objects](/guide/configuration)** - Advanced configuration patterns
- **[API Reference](/api/)** - Complete Result API documentation
- **[Examples](/examples/)** - Real-world Result pattern usage