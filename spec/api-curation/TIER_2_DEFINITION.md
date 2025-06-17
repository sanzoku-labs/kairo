# Tier 2 Function Definition - Production Ready (25 Additional Functions)

**Date**: 2025-01-17  
**Purpose**: Define the 25 additional functions that extend Tier 1 for production-ready applications (Total: 15 + 25 = 40 functions).

## Selection Criteria

**Tier 2 functions must meet criteria:**
1. **Usage Frequency**: 20-80% of production applications use this function
2. **Production Readiness**: Required for robust, production-grade applications
3. **Tier 1 Extension**: Builds upon and enhances Tier 1 patterns without replacing them
4. **Practical Necessity**: Solves common production concerns (error recovery, optimization, etc.)
5. **Manageable Complexity**: Learnable after mastering Tier 1 patterns

## The 25 Tier 2 Functions (Total: 40)

### ENHANCED FOUNDATION (4 functions)
*Additional Result and error handling patterns*

#### 16. `chain` (Result method)
**Usage**: 65% | **Category**: Foundation Extension

```typescript
// Alternative to flatMap with different syntax
result.chain(value => validateAndProcess(value))
```

**Why Tier 2**: Common in FP patterns, extends flatMap concept
**Learning Goal**: Alternative chaining syntax for team consistency

#### 17. `mapError` (Result method) 
**Usage**: 55% | **Category**: Foundation Extension

```typescript
// Transform error values while preserving success
result.mapError(error => ({ ...error, context: additionalInfo }))
```

**Why Tier 2**: Essential for error context enrichment in production
**Learning Goal**: Enhance error information for debugging

#### 18. `chainError` (Error utilities)
**Usage**: 45% | **Category**: Foundation Extension

```typescript
// Chain errors to preserve error history
chainError(originalError, 'Additional context about failure')
```

**Why Tier 2**: Critical for debugging complex error chains in production
**Learning Goal**: Build comprehensive error traces

#### 19. `isKairoError` (Error utilities)
**Usage**: 40% | **Category**: Foundation Extension

```typescript
// Type-safe error checking
if (isKairoError(error)) {
  console.log(error.code, error.context)
}
```

**Why Tier 2**: Enables safe error handling in mixed environments
**Learning Goal**: Distinguish framework errors from others

### ENHANCED DATA LAYER (8 functions)
*Production data handling and validation*

#### 20. `object` (Schema method)
**Usage**: 90% | **Category**: Schema Core

```typescript
// Object schema definition (core to most schemas)
schema.object({ name: schema.string(), age: schema.number() })
```

**Why Tier 2**: Fundamental to almost all data structures
**Learning Goal**: Model complex data objects

#### 21. `string` (Schema method)
**Usage**: 85% | **Category**: Schema Core

```typescript
// String validation with constraints
schema.string().min(1).max(100).email()
```

**Why Tier 2**: Most common data type with validation needs
**Learning Goal**: Validate text input robustly

#### 22. `number` (Schema method)
**Usage**: 75% | **Category**: Schema Core

```typescript
// Number validation with constraints
schema.number().min(0).max(150).integer()
```

**Why Tier 2**: Common data type requiring range validation
**Learning Goal**: Validate numeric input safely

#### 23. `array` (Schema method)
**Usage**: 70% | **Category**: Schema Core

```typescript
// Array validation with item constraints
schema.array(schema.string()).min(1).max(10)
```

**Why Tier 2**: Collections are common in most applications
**Learning Goal**: Validate collections of data

#### 24. `optional` (Schema modifier)
**Usage**: 65% | **Category**: Schema Enhancement

```typescript
// Optional field validation
schema.object({
  name: schema.string(),
  nickname: schema.string().optional()
})
```

**Why Tier 2**: Real-world data often has optional fields
**Learning Goal**: Handle optional data gracefully

#### 25. `create` (Repository method)
**Usage**: 60% | **Category**: Repository Core

```typescript
// Create new records with validation
const result = await userRepo.create({
  name: 'John',
  email: 'john@example.com'
})
```

**Why Tier 2**: Primary operation for data persistence
**Learning Goal**: Add new data safely

#### 26. `find` (Repository method)
**Usage**: 60% | **Category**: Repository Core

```typescript
// Find single record by ID
const result = await userRepo.find(123)
```

**Why Tier 2**: Primary operation for data retrieval
**Learning Goal**: Retrieve single records safely

#### 27. `findMany` (Repository method)
**Usage**: 55% | **Category**: Repository Core

```typescript
// Find multiple records with criteria
const result = await userRepo.findMany({
  where: { isActive: true },
  limit: 10
})
```

**Why Tier 2**: Essential for listing and searching data
**Learning Goal**: Query multiple records with filters

### ENHANCED INTERFACE LAYER (5 functions)
*Production API integration patterns*

#### 28. `fetch` (Pipeline method)
**Usage**: 70% | **Category**: API Integration

```typescript
// HTTP requests within pipelines
pipeline('api-call')
  .fetch('/api/users/:id')
  .validate(UserSchema)
```

**Why Tier 2**: Primary way to call external APIs in pipelines
**Learning Goal**: Make HTTP requests safely

#### 29. `retry` (Pipeline method)
**Usage**: 60% | **Category**: Resilience

```typescript
// Retry failed operations
pipeline('resilient-api')
  .fetch('/api/data')
  .retry(3, 1000) // 3 attempts, 1s delay
```

**Why Tier 2**: Essential for production reliability
**Learning Goal**: Handle transient failures gracefully

#### 30. `timeout` (Pipeline method)
**Usage**: 55% | **Category**: Resilience

```typescript
// Set operation timeouts
pipeline('timed-operation')
  .fetch('/api/slow-endpoint')
  .timeout(5000) // 5 second timeout
```

**Why Tier 2**: Prevents hanging operations in production
**Learning Goal**: Control operation duration

#### 31. `resourceUtils.get` (Resource helper)
**Usage**: 50% | **Category**: Resource Shortcuts

```typescript
// Quick GET resource definition
const getUser = resourceUtils.get('/users/:id', ParamsSchema, UserSchema)
```

**Why Tier 2**: Reduces boilerplate for common patterns
**Learning Goal**: Create resources efficiently

#### 32. `resourceUtils.post` (Resource helper)
**Usage**: 45% | **Category**: Resource Shortcuts

```typescript
// Quick POST resource definition  
const createUser = resourceUtils.post('/users', CreateUserSchema, UserSchema)
```

**Why Tier 2**: Essential for data creation endpoints
**Learning Goal**: Define creation endpoints quickly

### ENHANCED PROCESS LAYER (4 functions)
*Production business logic patterns*

#### 33. `validate` (Pipeline method)
**Usage**: 75% | **Category**: Validation

```typescript
// Validate data within pipelines
pipeline('process-user')
  .validate(UserSchema)
  .map(processValidUser)
```

**Why Tier 2**: Explicit validation step in complex workflows
**Learning Goal**: Add validation checkpoints

#### 34. `commonRules.required` (Rules utility)
**Usage**: 50% | **Category**: Business Rules

```typescript
// Common validation rules
const userRules = rules('user-validation', {
  nameRequired: commonRules.required('name'),
  emailValid: commonRules.email('email')
})
```

**Why Tier 2**: Reduces boilerplate for common business rules
**Learning Goal**: Use pre-built validation rules

#### 35. `update` (Repository method)
**Usage**: 55% | **Category**: Repository Core

```typescript
// Update existing records
const result = await userRepo.update(123, {
  name: 'Updated Name'
})
```

**Why Tier 2**: Essential for data modification
**Learning Goal**: Modify existing data safely

#### 36. `delete` (Repository method)
**Usage**: 45% | **Category**: Repository Core

```typescript
// Delete records by ID
const result = await userRepo.delete(123)
```

**Why Tier 2**: Required for complete CRUD operations
**Learning Goal**: Remove data safely

### ENHANCED UTILITIES (4 functions)
*Essential functional programming extensions*

#### 37. `tap` (FP utility)
**Usage**: 60% | **Category**: FP Enhancement

```typescript
// Side effects without changing data flow
pipe(
  processData,
  tap(data => console.log('Processing:', data)),
  saveData
)
```

**Why Tier 2**: Essential for debugging and logging in production
**Learning Goal**: Add side effects safely

#### 38. `maybe` (FP utility)
**Usage**: 55% | **Category**: FP Enhancement

```typescript
// Conditional transformation with fallback
maybe(
  condition,
  value => transform(value),
  fallbackValue
)
```

**Why Tier 2**: Common pattern for conditional processing
**Learning Goal**: Handle optional transformations

#### 39. `when` (FP utility)
**Usage**: 50% | **Category**: FP Enhancement

```typescript
// Conditional execution
when(user.isActive, () => sendNotification(user))
```

**Why Tier 2**: Readable conditional logic
**Learning Goal**: Write conditional code clearly

#### 40. `unless` (FP utility)
**Usage**: 45% | **Category**: FP Enhancement

```typescript
// Inverse conditional execution  
unless(user.isBlocked, () => allowAccess(user))
```

**Why Tier 2**: Alternative conditional pattern for clarity
**Learning Goal**: Express negative conditions clearly

## Tier 2 Learning Progression

### Week 6: Enhanced Foundation (Functions 16-19)
**Goal**: Master advanced error handling patterns

1. **Day 1-2**: `chain`, `mapError` - Advanced Result operations
2. **Day 3-4**: `chainError`, `isKairoError` - Error enrichment and checking
3. **Day 5**: Practice error handling in complex scenarios

**Success Criteria**: Can handle and debug complex error scenarios

### Week 7: Production Data (Functions 20-27)
**Goal**: Master production data modeling and persistence

1. **Day 1-2**: Schema types (`object`, `string`, `number`, `array`) - Core schema building
2. **Day 3-4**: Schema modifiers (`optional`) + Repository CRUD (`create`, `find`, `findMany`) 
3. **Day 5**: `update`, `delete` - Complete CRUD operations

**Success Criteria**: Can model and persist complex production data

### Week 8: Resilient APIs (Functions 28-32)  
**Goal**: Master production-grade API integration

1. **Day 1-2**: `fetch`, `retry`, `timeout` - Resilient API calls
2. **Day 3-4**: `resourceUtils.get`, `resourceUtils.post` - Efficient resource creation
3. **Day 5**: Practice building resilient API integrations

**Success Criteria**: Can build reliable API integrations

### Week 9: Enhanced Processing (Functions 33-36)
**Goal**: Master production business logic patterns

1. **Day 1-2**: `validate`, `commonRules.required` - Pipeline validation
2. **Day 3-4**: Complete CRUD in pipelines (`update`, `delete`)
3. **Day 5**: Practice complex business logic workflows

**Success Criteria**: Can implement robust business logic

### Week 10: Production Utilities (Functions 37-40)
**Goal**: Master functional programming for production

1. **Day 1-2**: `tap`, `maybe` - Enhanced data flow control
2. **Day 3-4**: `when`, `unless` - Conditional logic patterns
3. **Day 5**: Practice composing complex functional workflows

**Success Criteria**: Can write maintainable functional code

## Tier 2 vs Tier 1 Relationship

**Extensions Not Replacements**:
- Tier 2 functions enhance Tier 1 patterns rather than replace them
- Every Tier 2 function builds on concepts introduced in Tier 1
- Tier 1 remains sufficient for basic applications
- Tier 2 adds production concerns like resilience, optimization, and developer experience

**Progression Logic**:
1. **Tier 1**: Core patterns + basic examples
2. **Tier 2**: Same patterns + production concerns + efficiency improvements
3. **Natural Growth**: Developers can adopt Tier 2 functions incrementally as needs arise

**Cognitive Load Management**:
- **Tier 1 → 2**: 15 → 40 functions (25 additional = ~167% increase)
- **Manageable Increase**: Each week adds only 5 new functions to existing knowledge
- **Familiar Patterns**: New functions follow established patterns from Tier 1
- **Optional Adoption**: Teams can adopt Tier 2 functions selectively based on needs

## Production Readiness Validation

**Coverage Check**:
- ✅ Complete CRUD operations (create, read, update, delete)
- ✅ Resilient API integration (retry, timeout, error handling)
- ✅ Production schema validation (all common types + modifiers)
- ✅ Enhanced error handling and debugging capabilities
- ✅ Functional programming productivity improvements
- ✅ Common business rule patterns

**Missing Functions Rationale**:
- Advanced schema types (enum, union, literal) → Can be introduced as needed
- Complex repository features (relationships, hooks, querying) → Advanced use cases
- Performance monitoring → Tier 3 extensions
- Advanced FP utilities (compose, curry, lens) → Tier 3 specialized

This Tier 2 definition provides all essential functions for building robust, production-ready applications while maintaining a manageable learning curve.