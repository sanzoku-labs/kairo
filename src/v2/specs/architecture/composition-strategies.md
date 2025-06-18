# Composition Strategies

> **Inter-pillar composition patterns for Kairo V2 three-pillar architecture**

## Overview

This document defines how the three pillars (SERVICE, PIPELINE, DATA) compose together to create powerful, predictable workflows. Composition in V2 follows explicit patterns rather than magic context-awareness.

## Core Composition Principles

### **1. Explicit Data Flow**
```typescript
// Clear, predictable data flow between pillars
const users = await service.get('/users')           // SERVICE → data
const validated = data.validate(users, UserSchema)  // DATA → validated data
const processed = pipeline.map(validated, enrichUser) // PIPELINE → processed data
```

### **2. Result Pattern Propagation**
```typescript
// Results flow naturally through pillars
const workflow = await service.get('/users')
  .then(result => Result.isOk(result) 
    ? data.validate(result.value, UserSchema)
    : result
  )
  .then(result => Result.isOk(result)
    ? pipeline.map(result.value, enrichUser)
    : result
  )
```

### **3. Configuration Composition**
```typescript
// Options can reference other pillar configurations
const processUsers = async () => {
  const users = await service.get('/users', {
    cache: true,
    validate: UserSchema  // DATA pillar integration
  })
  
  return pipeline.map(users, enrichUser, {
    parallel: true,
    fallback: []
  })
}
```

## Standard Composition Patterns

### **Pattern 1: Service → Data → Pipeline**
**Use Case**: API data processing workflows

```typescript
// Fetch → Validate → Transform
const processApiData = async (endpoint: string) => {
  // SERVICE: Fetch data
  const apiResult = await service.get(endpoint, {
    cache: { ttl: 60000 },
    retry: { attempts: 3 }
  })
  
  if (Result.isErr(apiResult)) {
    return apiResult
  }
  
  // DATA: Validate and normalize
  const validatedResult = data.validate(apiResult.value, ResponseSchema)
  if (Result.isErr(validatedResult)) {
    return validatedResult
  }
  
  // PIPELINE: Transform for business logic
  return pipeline.map(validatedResult.value, transformForBusinessLogic, {
    async: true,
    parallel: true
  })
}
```

### **Pattern 2: Data → Pipeline → Service**
**Use Case**: Data preparation and submission workflows

```typescript
// Validate → Transform → Submit
const submitProcessedData = async (rawData: unknown) => {
  // DATA: Validate input
  const validatedResult = data.validate(rawData, InputSchema)
  if (Result.isErr(validatedResult)) {
    return validatedResult
  }
  
  // PIPELINE: Process and transform
  const processedResult = pipeline.compose(
    data => data.normalize(data, NormalizationRules),
    data => data.transform(data, SubmissionFormat)
  )(validatedResult.value)
  
  if (Result.isErr(processedResult)) {
    return processedResult
  }
  
  // SERVICE: Submit to API
  return service.post('/submit', processedResult.value, {
    timeout: 30000,
    retry: { attempts: 2 }
  })
}
```

### **Pattern 3: Pipeline → Data → Service**
**Use Case**: Batch processing and aggregation workflows

```typescript
// Process → Aggregate → Submit
const processBatchData = async (items: unknown[]) => {
  // PIPELINE: Process individual items
  const processedResult = pipeline.map(items, processItem, {
    parallel: true,
    chunk: 10
  })
  
  if (Result.isErr(processedResult)) {
    return processedResult
  }
  
  // DATA: Aggregate results
  const aggregatedResult = data.aggregate(processedResult.value, {
    groupBy: ['category'],
    sum: ['amount'],
    avg: ['score']
  })
  
  if (Result.isErr(aggregatedResult)) {
    return aggregatedResult
  }
  
  // SERVICE: Submit aggregated data
  return service.post('/batch-results', aggregatedResult.value)
}
```

## Advanced Composition Patterns

### **Pattern 4: Multi-Source Data Fusion**
```typescript
// Multiple services → Data fusion → Pipeline processing
const fuseDataSources = async () => {
  // SERVICE: Fetch from multiple sources
  const [usersResult, ordersResult, analyticsResult] = await Promise.all([
    service.get('/users'),
    service.get('/orders'),
    service.get('/analytics')
  ])
  
  // Check all results
  if (Result.isErr(usersResult) || Result.isErr(ordersResult) || Result.isErr(analyticsResult)) {
    return Result.Err('Failed to fetch required data sources')
  }
  
  // DATA: Merge and validate combined data
  const fusedData = {
    users: usersResult.value,
    orders: ordersResult.value,
    analytics: analyticsResult.value
  }
  
  const validatedResult = data.validate(fusedData, CombinedSchema)
  if (Result.isErr(validatedResult)) {
    return validatedResult
  }
  
  // PIPELINE: Process fused data
  return pipeline.compose(
    data => enrichWithAnalytics(data),
    data => calculateMetrics(data),
    data => generateReport(data)
  )(validatedResult.value)
}
```

### **Pattern 5: Real-Time Data Pipeline**
```typescript
// Streaming service → Data validation → Pipeline processing
const createRealTimePipeline = () => {
  return pipeline.stream({
    source: service.stream('/events'),
    validate: data.schema(EventSchema),
    transform: pipeline.map(enrichEvent),
    aggregate: data.aggregate({ 
      window: 60000, // 1 minute windows
      groupBy: ['eventType'],
      count: ['*']
    }),
    output: service.post('/metrics')
  })
}
```

### **Pattern 6: Error Recovery Composition**
```typescript
// Fault-tolerant composition with fallbacks
const robustDataProcessing = async (input: unknown) => {
  // Try primary data source
  let dataResult = await service.get('/primary-data')
  
  // Fallback to secondary source
  if (Result.isErr(dataResult)) {
    dataResult = await service.get('/secondary-data')
  }
  
  // Fallback to cached data
  if (Result.isErr(dataResult)) {
    dataResult = await service.get('/cached-data', { cache: { stale: true } })
  }
  
  // If all sources fail, use minimal data
  if (Result.isErr(dataResult)) {
    dataResult = Result.Ok({ minimal: true, timestamp: Date.now() })
  }
  
  // Process whatever data we have
  const validatedResult = data.validate(dataResult.value, FlexibleSchema)
  if (Result.isErr(validatedResult)) {
    return Result.Err('Data validation failed across all sources')
  }
  
  return pipeline.map(validatedResult.value, processWithFallbacks, {
    fallback: { minimal: true }
  })
}
```

## Composition Helpers

### **Helper 1: Flow Composition**
```typescript
// Utility for creating reusable flows
const createFlow = <T, U>(steps: CompositionStep<T, U>[]) => {
  return async (input: T): Promise<Result<KairoError, U>> => {
    let current: any = input
    
    for (const step of steps) {
      const result = await step(current)
      if (Result.isErr(result)) {
        return result
      }
      current = result.value
    }
    
    return Result.Ok(current)
  }
}

// Usage
const userProcessingFlow = createFlow([
  (input) => service.get(`/users/${input.id}`),
  (user) => data.validate(user, UserSchema),
  (user) => pipeline.map([user], enrichUser),
  (users) => data.transform(users[0], UserDisplayFormat)
])
```

### **Helper 2: Parallel Composition**
```typescript
// Process multiple items with different pillar combinations
const parallelProcessing = async <T>(
  items: T[],
  processor: (item: T) => Promise<Result<KairoError, any>>
) => {
  const results = await Promise.all(
    items.map(item => processor(item))
  )
  
  // Separate successes and failures
  const successes = results.filter(Result.isOk).map(r => r.value)
  const failures = results.filter(Result.isErr).map(r => r.error)
  
  return { successes, failures }
}
```

### **Helper 3: Conditional Composition**
```typescript
// Branch composition based on data characteristics
const conditionalProcessing = async (data: unknown) => {
  const typeResult = data.analyze(data, { detectType: true })
  if (Result.isErr(typeResult)) {
    return typeResult
  }
  
  const dataType = typeResult.value.type
  
  switch (dataType) {
    case 'user':
      return pipeline.compose(
        (d) => data.validate(d, UserSchema),
        (d) => service.post('/users', d)
      )(data)
      
    case 'order':
      return pipeline.compose(
        (d) => data.validate(d, OrderSchema),
        (d) => data.transform(d, OrderProcessingFormat),
        (d) => service.post('/orders', d)
      )(data)
      
    default:
      return pipeline.compose(
        (d) => data.validate(d, GenericSchema),
        (d) => service.post('/generic', d)
      )(data)
  }
}
```

## Type Safety in Composition

### **Typed Composition Chains**
```typescript
// Type-safe pillar composition
type ServiceResult<T> = Promise<Result<ServiceError, T>>
type DataResult<T> = Result<ValidationError, T>
type PipelineResult<T> = Result<PipelineError, T>

// Compose with full type inference
const typedWorkflow = async (endpoint: string) => {
  const serviceResult: ServiceResult<ApiResponse> = service.get(endpoint)
  
  return serviceResult
    .then((result): DataResult<ValidatedData> => 
      Result.isOk(result) 
        ? data.validate(result.value, ResponseSchema)
        : result
    )
    .then((result): PipelineResult<ProcessedData> =>
      Result.isOk(result)
        ? pipeline.map(result.value, processData)
        : result
    )
}
```

### **Generic Composition Utilities**
```typescript
// Generic composition with type safety
type CompositionStep<T, U> = (input: T) => Promise<Result<KairoError, U>> | Result<KairoError, U>

const compose = <A, B, C>(
  step1: CompositionStep<A, B>,
  step2: CompositionStep<B, C>
) => {
  return async (input: A): Promise<Result<KairoError, C>> => {
    const result1 = await step1(input)
    if (Result.isErr(result1)) {
      return result1
    }
    
    return await step2(result1.value)
  }
}
```

## Performance Considerations

### **Lazy Evaluation**
```typescript
// Defer expensive operations until needed
const lazyProcessing = (input: unknown) => {
  return {
    validate: () => data.validate(input, Schema),
    process: () => pipeline.map(input, expensiveOperation),
    submit: () => service.post('/endpoint', input)
  }
}

// Execute only what's needed
const processor = lazyProcessing(userData)
const validationResult = processor.validate()
if (Result.isOk(validationResult)) {
  const processResult = processor.process()
  // Only submit if processing succeeds
  if (Result.isOk(processResult)) {
    await processor.submit()
  }
}
```

### **Caching Across Pillars**
```typescript
// Cache results at pillar boundaries
const cachedComposition = async (input: unknown) => {
  // Cache service results
  const serviceResult = await service.get('/data', {
    cache: { ttl: 300000, key: `data-${hash(input)}` }
  })
  
  if (Result.isErr(serviceResult)) {
    return serviceResult
  }
  
  // Cache validation results (expensive schema validation)
  const cacheKey = `validation-${hash(serviceResult.value)}`
  const cachedValidation = cache.get(cacheKey)
  
  const validationResult = cachedValidation || 
    data.validate(serviceResult.value, ComplexSchema)
  
  if (!cachedValidation && Result.isOk(validationResult)) {
    cache.set(cacheKey, validationResult, { ttl: 60000 })
  }
  
  if (Result.isErr(validationResult)) {
    return validationResult
  }
  
  // Process without caching (business logic changes frequently)
  return pipeline.map(validationResult.value, businessLogic)
}
```

## Error Handling in Compositions

### **Error Propagation**
```typescript
// Errors automatically propagate through compositions
const errorAwareComposition = async (input: unknown) => {
  const result = await pipeline.compose(
    // Each step can fail independently
    (data) => service.get('/validate', { body: data }),
    (response) => data.validate(response, Schema),
    (validated) => pipeline.map(validated, transform),
    (transformed) => service.post('/submit', transformed)
  )(input)
  
  // Handle any error from any step
  return Result.match(result, {
    Ok: (value) => ({ success: true, data: value }),
    Err: (error) => ({ 
      success: false, 
      error: error.message,
      step: error.operation // Know which step failed
    })
  })
}
```

### **Error Recovery in Composition**
```typescript
// Recover from errors at specific composition points
const resilientComposition = async (input: unknown) => {
  return pipeline.compose(
    // Step 1: Try service call with fallback
    (data) => service.get('/primary')
      .then(result => Result.isOk(result) 
        ? result 
        : service.get('/fallback')
      ),
    
    // Step 2: Validate with error recovery
    (response) => {
      const validation = data.validate(response, StrictSchema)
      return Result.isOk(validation)
        ? validation
        : data.validate(response, LooseSchema) // Fallback schema
    },
    
    // Step 3: Process with error handling
    (validated) => pipeline.map(validated, processWithFallback, {
      fallback: defaultValue,
      continueOnError: true
    })
  )(input)
}
```

## Best Practices

### **1. Keep Compositions Simple**
- Maximum 3-4 steps per composition
- Use helper functions for complex logic
- Break large workflows into smaller, testable pieces

### **2. Handle Errors Explicitly**
- Check Result types at each step
- Provide meaningful error messages
- Use error recovery strategies when appropriate

### **3. Leverage Type Safety**
- Use TypeScript inference for composition chains
- Define clear input/output types for each step
- Validate types at pillar boundaries

### **4. Optimize Performance**
- Cache expensive operations
- Use lazy evaluation for conditional logic
- Consider parallel processing for independent operations

### **5. Make Compositions Testable**
- Each step should be pure and testable in isolation
- Use dependency injection for external services
- Mock pillar operations for unit tests

---

**Next**: See [Error Handling Strategy](./error-handling-strategy.md) for detailed error patterns in compositions.