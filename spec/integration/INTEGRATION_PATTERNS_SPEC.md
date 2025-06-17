# Integration Patterns Specification

**Document**: Integration Patterns Documentation  
**Version**: 1.0  
**Phase**: Stream 1 (Documentation & Core Enhancements)  
**Priority**: High

---

## 🎯 Objective

Create comprehensive documentation that bridges the gap between API reference and practical usage, showing exactly how Kairo's three pillars connect in real applications.

### Success Criteria

- **Discovery Time**: < 30 seconds to find relevant integration pattern
- **Implementation Time**: < 5 minutes to implement common patterns
- **Error Reduction**: 80% reduction in integration mistakes
- **Coverage**: 90% of common integration scenarios documented
- **Progression**: Clear path from basic to advanced patterns

---

## 📋 Documentation Structure

### **Core Integration Guide**

`docs/guide/integration-patterns.md`

#### **1. Three-Pillar Connection Patterns**

Complete flows showing DATA → PROCESS → INTERFACE integration

#### **2. Component Integration Matrix**

Which components can connect to which others, with examples

#### **3. Type Flow Documentation**

How TypeScript types flow through component connections

#### **4. Error Handling Patterns**

How Result types propagate across component boundaries

#### **5. Performance Patterns**

Optimal integration strategies for different scenarios

---

## 🔧 Implementation Specifications

### **Integration Patterns Guide Structure**

````markdown
# Integration Patterns Guide

## Quick Navigation

- [Basic Patterns](#basic-patterns) - Start here
- [Three-Pillar Flows](#three-pillar-flows) - Complete workflows
- [Component Connections](#component-connections) - Specific integrations
- [Error Handling](#error-handling) - Result type patterns
- [Performance](#performance) - Optimization patterns
- [Troubleshooting](#troubleshooting) - Common issues

## Basic Patterns

### Pattern: Resource in Pipeline

**Use Case**: Call an API within a data processing pipeline
**Complexity**: ⭐ Basic

```typescript
const userPipeline = pipeline('user-processing')
  .input(CreateUserSchema)
  .pipeline(UserAPI.create.run) // ← Resource call in pipeline
  .map(user => ({ ...user, processed: true }))

// Type flow: CreateUserSchema → User → ProcessedUser
// Result flow: Result<ValidationError, ProcessedUser>
```
````

**When to use**: You need to call an external API as part of a data processing flow
**Type safety**: Full inference from schema to final result
**Error handling**: HTTP errors become Result.Err automatically

### Pattern: Schema Validation in Pipeline

**Use Case**: Validate data before processing
**Complexity**: ⭐ Basic

```typescript
const validateAndProcess = pipeline('validate-process')
  .input(UserSchema) // ← Schema validation
  .validateAllRules(userRules) // ← Business rules
  .map(user => processUser(user))

// Type flow: unknown → User → ValidatedUser → ProcessedUser
// Error flow: ParseError | RuleError → Result.Err
```

## Three-Pillar Flows

### Complete User Onboarding Flow

**Pillars**: DATA → PROCESS → INTERFACE
**Complexity**: ⭐⭐ Intermediate

```typescript
// DATA: Define schemas and validation
const CreateUserSchema = schema.object({
  name: schema.string().min(2),
  email: schema.string().email(),
})

const userRules = rules('user-validation', {
  emailUnique: rule()
    .async(user => UserAPI.checkEmail.run({ email: user.email }))
    .require(result =>
      result.match({
        Ok: available => available,
        Err: () => false,
      })
    )
    .message('Email already exists'),
})

// PROCESS: Define business logic pipeline
const userOnboarding = pipeline('user-onboarding')
  .input(CreateUserSchema) // DATA pillar
  .validateAllRules(userRules) // PROCESS pillar
  .pipeline(UserAPI.create.run) // INTERFACE pillar
  .pipeline(EmailAPI.sendWelcome.run) // INTERFACE pillar
  .map(user => ({
    // PROCESS pillar
    ...user,
    onboardingComplete: true,
  }))

// Usage with complete error handling
const result = await userOnboarding.run(userData)
result.match({
  Ok: user => console.log('User onboarded:', user),
  Err: error => {
    if (error.code === 'VALIDATION_ERROR') {
      console.log('Validation failed:', error.details)
    } else if (error.code === 'HTTP_ERROR') {
      console.log('API call failed:', error.message)
    }
  },
})
```

**Type Flow Diagram**:

```
userData (unknown)
    ↓ [CreateUserSchema validation]
User { name: string, email: string }
    ↓ [userRules validation]
ValidatedUser
    ↓ [UserAPI.create]
CreatedUser { id: string, ...User }
    ↓ [EmailAPI.sendWelcome]
CreatedUser (unchanged)
    ↓ [map transform]
OnboardedUser { onboardingComplete: true, ...CreatedUser }
```

## Component Connections

### Resource → Pipeline Integration

**Pattern**: Using resource methods within pipelines

```typescript
// ✅ VALID: Resource method in pipeline
pipeline('example')
  .input(UserSchema)
  .pipeline(UserAPI.get.run) // Resource method
  .map(user => user.profile)

// ✅ VALID: Multiple resource calls
pipeline('complex')
  .input(UserIdSchema)
  .pipeline(UserAPI.get.run) // Get user
  .pipeline(ProfileAPI.get.run) // Get profile
  .map(mergeUserProfile)

// ❌ INVALID: Direct resource call (missing .run)
pipeline('wrong').pipeline(UserAPI.get) // Missing .run()

// ❌ INVALID: Sync function in async pipeline
pipeline('wrong').pipeline(UserAPI.get.run).map(synchronousFunction) // Should be .map()
```

### Schema → Validation Flow

**Pattern**: How schemas connect to validation

```typescript
// Schema definition (DATA pillar)
const UserSchema = schema.object({
  name: schema.string(),
  email: schema.string().email(),
})

// ✅ VALID: Schema in pipeline input
pipeline('validate')
  .input(UserSchema) // Auto-validation
  .map(user => user.name) // user is typed as User

// ✅ VALID: Manual schema validation
pipeline('manual')
  .map(data => UserSchema.parse(data)) // Returns Result<ParseError, User>
  .map(result => result.unwrap()) // Extract User or throw

// ✅ VALID: Schema with business rules
pipeline('business').input(UserSchema).validateAllRules(userRules) // Additional business validation
```

### Transform → Repository Integration

**Pattern**: Data transformation before storage

```typescript
const userTransform = transform('user-transform', RawUserSchema)
  .to(UserSchema)
  .map('user_name', 'name')
  .map('user_email', 'email')
  .compute('slug', user => slugify(user.name))
  .validate()

const userRepo = repository('users', {
  schema: UserSchema,
  storage: 'memory',
})

// ✅ VALID: Transform → Repository
pipeline('store-user')
  .input(RawUserSchema)
  .transform(userTransform) // Transform data
  .map(userRepo.create) // Store in repository
```

## Error Handling Patterns

### Result Type Propagation

**How errors flow through component chains**

```typescript
// Each component returns Result<Error, Value>
const processUser = pipeline('process-user')
  .input(UserSchema) // Result<ParseError, User>
  .validateAllRules(userRules) // Result<RuleError, User>
  .pipeline(UserAPI.create.run) // Result<HttpError, CreatedUser>
  .map(user => ({ ...user, processed: true })) // Result<never, ProcessedUser>

// Final result type: Result<ParseError | RuleError | HttpError, ProcessedUser>

// Handling specific error types
const result = await processUser.run(userData)
result.match({
  Ok: user => handleSuccess(user),
  Err: error => {
    // Error has union type of all possible errors
    if (error instanceof ParseError) {
      handleValidationError(error)
    } else if (error instanceof RuleError) {
      handleBusinessRuleError(error)
    } else if (error instanceof HttpError) {
      handleAPIError(error)
    }
  },
})
```

### Error Recovery Patterns

**How to handle and recover from errors**

```typescript
// Pattern: Fallback on error
const withFallback = pipeline('user-with-fallback')
  .pipeline(UserAPI.get.run)
  .recover(error => {
    if (error.status === 404) {
      return DefaultUser // Fallback value
    }
    throw error // Re-throw other errors
  })

// Pattern: Retry on failure
const withRetry = pipeline('user-with-retry')
  .pipeline(UserAPI.get.run)
  .retry({ times: 3, delay: 1000 })

// Pattern: Error transformation
const withBetterErrors = pipeline('user-better-errors')
  .pipeline(UserAPI.get.run)
  .mapError(error => new UserNotFoundError(error.message))
```

## Performance Patterns

### Caching Integration

**When and how to add caching**

```typescript
// Resource-level caching
const UserAPI = resource('users', {
  get: {
    path: '/users/:id',
    cache: { ttl: 300000, tags: ['users'] }, // 5 minutes
  },
})

// Pipeline-level caching
const expensiveProcess = pipeline('expensive')
  .cache({ ttl: 600000, key: input => `process:${input.id}` })
  .map(heavyComputation)
  .pipeline(SlowAPI.call.run)

// Repository-level caching
const userRepo = repository('users', {
  schema: UserSchema,
  cache: { ttl: 300000 },
})
```

### Parallel Processing

**Optimizing with concurrent operations**

```typescript
// Sequential (slow)
const sequential = pipeline('slow')
  .pipeline(UserAPI.get.run)
  .pipeline(ProfileAPI.get.run)
  .pipeline(SettingsAPI.get.run)

// Parallel (fast)
const parallel = pipeline('fast').map(async input => {
  const [user, profile, settings] = await Promise.all([
    UserAPI.get.run(input),
    ProfileAPI.get.run(input),
    SettingsAPI.get.run(input),
  ])
  return { user, profile, settings }
})
```

## Troubleshooting

### Common Integration Issues

#### "Type 'X' is not assignable to type 'Y'"

**Cause**: Schema mismatch between components
**Solution**: Check type flow and add transforms

```typescript
// ❌ Problem: Schema mismatch
pipeline('broken')
  .input(UserSchema) // Outputs User
  .pipeline(TodoAPI.create.run) // Expects CreateTodoInput

// ✅ Solution: Add transform
pipeline('fixed')
  .input(UserSchema)
  .map(user => ({ title: `Welcome ${user.name}`, userId: user.id }))
  .pipeline(TodoAPI.create.run)
```

#### "Cannot read property 'run' of undefined"

**Cause**: Trying to call resource method incorrectly
**Solution**: Use .run() for resource methods

```typescript
// ❌ Problem: Missing .run()
pipeline('broken').pipeline(UserAPI.get)

// ✅ Solution: Add .run()
pipeline('fixed').pipeline(UserAPI.get.run)
```

#### "Result is not a function"

**Cause**: Not handling Result type properly
**Solution**: Use .match() or .unwrap()

```typescript
// ❌ Problem: Treating Result as value
const user = UserAPI.get.run({ id: '123' })
console.log(user.name) // Error: user is Promise<Result<...>>

// ✅ Solution: Handle Result properly
const result = await UserAPI.get.run({ id: '123' })
result.match({
  Ok: user => console.log(user.name),
  Err: error => console.log('Error:', error),
})
```

````

---

## 📚 Recipe Library Structure

### **Recipe Categories**

#### **1. Basic Integration Recipes**
- Resource → Pipeline
- Schema → Validation → Processing
- Transform → Repository
- Error handling basics

#### **2. Common Workflow Recipes**
- User authentication flow
- Data processing pipeline
- API integration patterns
- CRUD operations with validation

#### **3. Advanced Integration Recipes**
- Multi-resource workflows
- Event-driven patterns
- Transaction management
- Complex error recovery

#### **4. Performance Recipes**
- Caching strategies
- Parallel processing
- Batch operations
- Memory optimization

### **Recipe Format**

```markdown
## Recipe: [Name]

**Use Case**: Brief description
**Complexity**: ⭐⭐ (1-3 stars)
**Pillars**: DATA + PROCESS + INTERFACE
**Time**: ~5 minutes

### Problem
What specific integration challenge this solves

### Solution
```typescript
// Complete, runnable code example
const solution = pipeline('example')
  .input(InputSchema)
  .validateAllRules(rules)
  .pipeline(API.method.run)
  .map(transform)
````

### Explanation

- Step-by-step breakdown
- Type flow explanation
- Error handling notes
- Performance considerations

### When to Use

- Specific scenarios where this pattern applies
- Alternatives to consider
- Scale considerations

### Related Patterns

- Links to similar or complementary patterns
- Next steps for more complex scenarios

```

---

## 🧪 Testing Requirements

### **Content Quality Tests**
- All code examples must compile and run
- Type annotations must be accurate
- Error scenarios must be realistic
- Performance claims must be verified

### **User Experience Tests**
- Time to find relevant pattern < 30 seconds
- Time to implement pattern < 5 minutes
- Pattern discovery through search and navigation
- Mobile-friendly documentation format

### **Coverage Tests**
- All major integration scenarios covered
- Common error cases documented
- Performance patterns included
- Troubleshooting section comprehensive

---

## ✅ Acceptance Criteria

### **Content Completeness**
- [ ] All three-pillar integration patterns documented
- [ ] Component connection matrix complete
- [ ] Error handling patterns comprehensive
- [ ] Performance optimization patterns included
- [ ] Troubleshooting guide covers common issues

### **Quality Standards**
- [ ] All code examples compile and run correctly
- [ ] Type annotations are accurate and helpful
- [ ] Examples progress from basic to advanced
- [ ] Mobile-friendly documentation format
- [ ] Search functionality works effectively

### **User Experience**
- [ ] Developers can find relevant patterns quickly
- [ ] Integration mistakes reduced by 80%
- [ ] Clear progression from simple to complex
- [ ] Cross-references between related patterns
- [ ] Feedback mechanism for improvements

---

**Next Document**: [Recipe Library Specification](./RECIPE_LIBRARY_SPEC.md)
```
