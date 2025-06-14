# Pipeline

The Pipeline is Kairo's core abstraction for composable data processing workflows. It provides a fluent API for chaining operations while maintaining type safety and predictable error handling.

## Creating Pipelines

```typescript
import { pipeline, schema } from 'kairo'
import { z } from 'zod'

const userPipeline = pipeline('get-user')
  .input(schema(z.object({ id: z.number() })))
  .fetch('/api/users/:id')
  .validate(schema(z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email()
  })))
  .map(user => ({ ...user, displayName: user.name.toUpperCase() }))
```

## Core Methods

### `.input(schema)`
Validates and types the pipeline input.

```typescript
const pipeline = pipeline('example')
  .input(schema(z.object({ id: z.number() })))
```

### `.fetch(url, options?)`
Performs HTTP requests with automatic URL interpolation.

```typescript
// URL interpolation with input parameters
.fetch('/api/users/:id')

// With custom options
.fetch('/api/users', { method: 'POST', body: data })
```

### `.validate(schema)`
Validates data against a schema.

```typescript
.validate(schema(UserSchema))
```

### `.map(fn)`
Transforms data through a pure function.

```typescript
.map(user => ({ ...user, fullName: `${user.firstName} ${user.lastName}` }))
```

## Advanced Methods

### `.retry(times, delay?)`
Retries failed operations with exponential backoff.

```typescript
.retry(3, 1000) // Retry 3 times with 1s base delay
```

### `.timeout(ms)`
Sets a timeout for operations.

```typescript
.timeout(5000) // 5 second timeout
```

### `.cache(ttl)`
Caches results for the specified time-to-live.

```typescript
.cache(300000) // Cache for 5 minutes
```

### `.parallel(pipelines)`
Executes multiple pipelines in parallel.

```typescript
.parallel([
  pipeline('user').fetch('/api/user/:id'),
  pipeline('posts').fetch('/api/posts?userId=:id')
])
```

### `.fallback(pipeline)`
Provides a fallback pipeline if the primary fails.

```typescript
.fallback(
  pipeline('fallback').fetch('/api/cache/user/:id')
)
```

## Execution

### `.run(input)`
Executes the pipeline with the given input.

```typescript
const result = await userPipeline.run({ id: 123 })

if (result.tag === 'Ok') {
  console.log('Success:', result.value)
} else {
  console.error('Error:', result.error)
}
```

## Reactive Integration

### `.asSignal()`
Converts a pipeline to a reactive Signal.

```typescript
const userSignal = userPipeline.asSignal()

// Execute and update signal
await userSignal.run({ id: 123 })
console.log(userSignal.get()) // Latest result
```

### `.asTask()`
Converts a pipeline to a Task for async state management.

```typescript
const userTask = userPipeline.asTask()

await userTask.run({ id: 123 })
console.log(userTask.state) // 'idle' | 'pending' | 'success' | 'error'
```

## Tracing and Debugging

### `.trace()`
Enables tracing for debugging and performance monitoring.

```typescript
const tracedPipeline = userPipeline.trace()

await tracedPipeline.run({ id: 123 })

// Access trace data
import { tracing } from 'kairo'
const traces = tracing.query({ pipelineName: 'get-user' })
console.log(tracing.summary(traces))
```

## Error Handling

Pipelines use the Result pattern for predictable error handling:

```typescript
const result = await pipeline.run(input)

// Pattern matching
const output = match(result, {
  Ok: value => `Success: ${value}`,
  Err: error => `Failed: ${error.message}`
})

// Direct checking
if (result.tag === 'Ok') {
  // result.value is typed correctly
} else {
  // result.error contains error details
}
```

## Configuration

### HTTP Client
Configure custom HTTP clients:

```typescript
const customPipeline = pipeline('custom')
  .withClient({
    get: async (url) => { /* custom implementation */ },
    post: async (url, data) => { /* custom implementation */ }
  })
```

### Global Configuration
Set global defaults:

```typescript
// Configure default timeout
pipeline.setDefaults({ timeout: 10000 })
```

## Type Safety

Pipelines maintain full type safety throughout the chain:

```typescript
const typedPipeline = pipeline('typed')
  .input(schema(z.object({ id: z.number() })))    // Input: { id: number }
  .fetch('/api/users/:id')                        // Returns: unknown
  .validate(schema(UserSchema))                   // Returns: User
  .map(user => user.name)                         // Returns: string

// result.value is typed as string
const result = await typedPipeline.run({ id: 123 })
```

## Performance

- **Lazy execution**: Operations only execute when `.run()` is called
- **Caching**: Built-in caching reduces redundant operations
- **Parallel execution**: Process multiple operations concurrently
- **Tracing**: Monitor performance with detailed timing information

## Best Practices

1. **Name your pipelines** for better debugging and tracing
2. **Use schemas** for input validation and type safety
3. **Chain operations** logically from input to output
4. **Handle errors gracefully** with the Result pattern
5. **Cache expensive operations** to improve performance
6. **Use tracing** in development for debugging