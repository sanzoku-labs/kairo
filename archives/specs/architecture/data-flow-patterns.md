# Data Flow Patterns ✅ IMPLEMENTED

> **How data moves between the three pillars**  
> **Status: ✅ All data flow patterns implemented and working**

## ✅ Core Data Flow - IMPLEMENTED

The natural flow in most applications follows this pattern:

```
✅ External Data → ✅ Validation → ✅ Processing → ✅ Output
     ↓              ↓            ↓          ↓
  SERVICE      →    DATA    →  PIPELINE  →  Result
  (5 methods)    (10 methods)    (8 methods)    (Result pattern)
  ✅ IMPLEMENTED  ✅ IMPLEMENTED  ✅ IMPLEMENTED  ✅ IMPLEMENTED
```

## ✅ Common Flow Patterns - IMPLEMENTED

### **✅ 1. API → Validation → Processing - IMPLEMENTED**

```typescript
// Fetch → Validate → Process
const processOrders = async filters => {
  // SERVICE: Get external data
  const orders = await service.get('/orders', {
    params: filters,
    cache: true,
  })

  // DATA: Validate structure
  const validOrders = data.validate(orders, OrderSchema, {
    soft: true,
    collect: true,
  })

  // PIPELINE: Apply business logic
  const processed = pipeline.map(validOrders, calculateTotals, {
    async: true,
    parallel: true,
  })

  return processed
}
```

### **2. Data → Transform → Store**

```typescript
// Process → Transform → Save
const importUserData = async rawData => {
  // DATA: Transform to standard format
  const normalized = data.transform(rawData, userMapping, {
    strict: false,
    defaults: true,
  })

  // DATA: Validate transformed data
  const validated = data.validate(normalized, UserSchema)

  // SERVICE: Save to API
  const result = await service.post('/users/bulk', validated, {
    batch: true,
    retry: true,
  })

  return result
}
```

### **3. Complex Multi-Stage Processing**

```typescript
const analyzeCustomerBehavior = async customerId => {
  // Stage 1: Gather data from multiple sources
  const [profile, orders, events] = await Promise.all([
    service.get(`/customers/${customerId}`),
    service.get(`/orders`, { params: { customerId } }),
    service.get(`/events`, { params: { customerId } }),
  ])

  // Stage 2: Validate and normalize
  const validProfile = data.validate(profile, CustomerSchema)
  const validOrders = data.validate(orders, OrderListSchema)
  const validEvents = data.validate(events, EventListSchema)

  // Stage 3: Transform and combine
  const enrichedOrders = data.transform(validOrders, enrichOrderData)
  const behaviorEvents = data.transform(validEvents, extractBehavior)

  // Stage 4: Aggregate insights
  const orderStats = data.aggregate(enrichedOrders, {
    sum: ['total', 'items'],
    avg: ['orderValue'],
    count: '*',
    groupBy: ['category'],
  })

  // Stage 5: Generate insights
  const insights = pipeline.compose([
    data => pipeline.map(data, calculateLifetimeValue),
    data => pipeline.filter(data, isHighValue),
    data => pipeline.reduce(data, generateRecommendations, []),
  ])

  return insights({ profile: validProfile, orders: orderStats, events: behaviorEvents })
}
```

## Data Types and Transformations

### **Raw External Data (SERVICE)**

```typescript
// Data from APIs - unvalidated, unknown structure
const rawUserData = await service.get('/api/users/123')
// Type: unknown (could be anything)
```

### **Validated Data (DATA)**

```typescript
// Data after schema validation - known structure
const validUser = data.validate(rawUserData, UserSchema)
// Type: Result<ValidationError, User>
```

### **Transformed Data (DATA)**

```typescript
// Data after transformation - normalized format
const normalizedUser = data.transform(validUser, userNormalizer)
// Type: Result<TransformError, NormalizedUser>
```

### **Processed Data (PIPELINE)**

```typescript
// Data after business logic - enriched with domain knowledge
const enrichedUser = pipeline.map(normalizedUser, addBusinessContext)
// Type: Result<ProcessingError, EnrichedUser>
```

## Error Propagation

### **Result Pattern Throughout**

All pillars use the Result pattern for consistent error handling:

```typescript
const safeProcess = async input => {
  // Each step returns Result<Error, Data>
  const fetchResult = await service.get('/data')
  if (Result.isErr(fetchResult)) return fetchResult

  const validateResult = data.validate(fetchResult.value, schema)
  if (Result.isErr(validateResult)) return validateResult

  const processResult = pipeline.map(validateResult.value, transform)
  if (Result.isErr(processResult)) return processResult

  return processResult
}
```

### **Error Composition**

```typescript
// Automatic error composition with pipeline
const processWithErrorHandling = pipeline.compose([
  input => service.get('/api/data'),
  data => data.validate(data, Schema),
  validated => data.transform(validated, normalizer),
  normalized => pipeline.map(normalized, businessLogic),
])

// Returns: Result<ServiceError | ValidationError | TransformError | ProcessingError, FinalData>
```

## Performance Patterns

### **Lazy Evaluation**

```typescript
// Data operations can be lazy until executed
const dataFlow = data
  .transform(input, mapping)
  .pipe(data.validate(schema))
  .pipe(pipeline.map(processor))
// Nothing executed yet - just defines the flow

const result = await dataFlow.execute()
// Now executes the entire flow
```

### **Streaming/Chunked Processing**

```typescript
// Large datasets processed in chunks
const processLargeDataset = async dataSource => {
  return pipeline.stream(dataSource, {
    chunkSize: 1000,
    parallel: 4,
    process: chunk =>
      data
        .validate(chunk, schema)
        .pipe(data.transform(normalizer))
        .pipe(pipeline.map(businessLogic)),
  })
}
```

### **Caching at Each Stage**

```typescript
// Cache at appropriate stages
const cachedFlow = async input => {
  // Cache API responses
  const apiData = await service.get('/expensive-api', { cache: true })

  // Cache validation results
  const validated = data.validate(apiData, schema, { cache: true })

  // Cache expensive transformations
  const transformed = data.transform(validated, expensiveMapping, { cache: true })

  return transformed
}
```

## Composition Strategies

### **Sequential Composition**

```typescript
// One step after another
const sequential = async input => {
  const step1 = await service.get('/step1', input)
  const step2 = data.validate(step1, Schema)
  const step3 = pipeline.map(step2, transform)
  return step3
}
```

### **Parallel Composition**

```typescript
// Independent operations in parallel
const parallel = async input => {
  const [data1, data2, data3] = await Promise.all([
    service.get('/source1'),
    service.get('/source2'),
    service.get('/source3'),
  ])

  // Combine results
  return data.aggregate([data1, data2, data3], combineStrategy)
}
```

### **Branch and Merge**

```typescript
// Conditional flows that reconverge
const branchAndMerge = async input => {
  const initial = await service.get('/data', input)

  if (data.validate(initial, ConditionSchema)) {
    // Branch A
    const processedA = pipeline.map(initial, processA)
    return data.transform(processedA, formatA)
  } else {
    // Branch B
    const processedB = pipeline.map(initial, processB)
    return data.transform(processedB, formatB)
  }
}
```

---

**Next**: [Composition Strategies](./composition-strategies.md) - Advanced pillar composition patterns
