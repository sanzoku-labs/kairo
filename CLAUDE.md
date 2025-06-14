# Kairo Framework - Focused Implementation Direction

> **Target:** Claude Code  
> **Objective:** Implement Kairo's core vision - eliminate service repetition and compose business logic elegantly

---

## 🎯 Mission Statement

**Kairo solves two specific pain points through declarative patterns:**

1. **Service Layer Repetition** → Resource declarations
2. **Complex Business Logic** → Pipeline composition

**Design Philosophy:**
- ✅ **Simple by default, full control available**
- ✅ **Explicit and transparent** (no hidden magic)
- ✅ **Type inference that always works**
- ✅ **Progressive disclosure** (80/20 rule)

---

## 🏗️ Two-Pillar Architecture

### Pillar 1: Resources (Service Layer Elimination)

**Problem Solved:** Stop writing repetitive service classes

```typescript
// BEFORE: Repetitive service boilerplate
class UserService {
  async getUser(id: string): Promise<User> {
    try {
      const response = await fetch(`/api/users/${id}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      return UserSchema.parse(data)
    } catch (error) {
      console.error('Error fetching user:', error)
      throw error
    }
  }
  // ... repeat for create, update, delete
}

// AFTER: Declarative resource
const UserAPI = resource('users', {
  get: {
    path: '/users/:id',
    params: z.object({ id: z.string() }),
    response: UserSchema
  },
  create: {
    path: '/users',
    method: 'POST',
    body: CreateUserSchema,
    response: UserSchema
  }
})

// Usage: await UserAPI.get.run({ id: '123' })
```

### Pillar 2: Pipelines (Business Logic Composition)

**Problem Solved:** Complex domain logic becomes readable and error-free

```typescript
// BEFORE: Complex business logic mess
const processOrder = async (orderData) => {
  try {
    const validated = OrderSchema.parse(orderData)
    
    if (validated.amount > 1000) {
      const approval = await manualApproval(validated)
      if (!approval) throw new Error('Not approved')
    }
    
    const inventory = await checkInventory(validated.items)
    if (!inventory.available) throw new Error('Out of stock')
    
    const pricing = calculateDiscount(validated, inventory.pricing)
    const payment = await processPayment(pricing)
    
    return transformOrderResult(payment)
  } catch (error) {
    logError(error)
    throw error
  }
}

// AFTER: Declarative pipeline
const processOrder = pipeline('process-order')
  .input(OrderSchema)
  .validate(requiresApproval)
  .fetch('/api/inventory/check')
  .map(calculateDiscount)
  .fetch('/api/payment/process')
  .map(transformOrderResult)
  .trace('order-processing')
```

### Optional Integration (When It Makes Sense)

```typescript
// Resources and Pipelines can compose cleanly
const businessWorkflow = pipeline('onboarding')
  .input(OnboardingSchema)
  .validate(businessRules)
  .pipeline(UserAPI.create)        // Resource in Pipeline
  .map(sendWelcomeEmail)
  .pipeline(UserAPI.update)        // Update welcome status
  .trace('onboarding-flow')
```

---

## 🔧 Resource Implementation Specification

### Progressive Disclosure Configuration

```typescript
// Level 1: Simple & explicit (80% of use cases)
const UserAPI = resource('users', {
  get: {
    path: '/users/:id',
    params: z.object({ id: z.string() }),
    response: UserSchema
  },
  create: {
    path: '/users',
    method: 'POST',
    body: CreateUserSchema,
    response: UserSchema
  }
})

// Level 2: Full control when necessary (20% of use cases)
const PaymentAPI = resource('payments', {
  charge: {
    path: '/payments/charge',
    method: 'POST',
    body: ChargeSchema,
    response: PaymentResultSchema,
    timeout: 30000,
    retry: { times: 5, delay: 2000 },
    cache: false,
    headers: { 'Idempotency-Key': () => generateKey() }
  }
})
```

### Resource Configuration Schema

```typescript
interface ResourceMethodConfig<Input, Output> {
  // Required core
  path: string
  
  // Optional but explicit
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  params?: Schema<Input>      // For URL params (/users/:id)
  query?: Schema<Input>       // For query string (?page=1)
  body?: Schema<Input>        // For request body
  response?: Schema<Output>   // For response validation
  
  // Full control options
  timeout?: number
  retry?: RetryConfig | false
  cache?: CacheConfig | false
  headers?: Record<string, string | (() => string)>
  transform?: (data: any) => any
}

interface ResourceConfig {
  [methodName: string]: ResourceMethodConfig<any, any>
}
```

### Smart Defaults with Override System

```typescript
// API-level configuration
const api = createAPI({
  baseURL: '/api',
  timeout: 5000,
  retry: { times: 3, delay: 1000 },
  headers: { 'Content-Type': 'application/json' }
})

// Resource inherits defaults, can override
const UserAPI = api.resource('users', {
  get: {
    path: '/users/:id',
    params: z.object({ id: z.string() }),
    response: UserSchema
    // Inherits: timeout: 5000, retry: 3, etc.
  },
  
  bulkUpdate: {
    path: '/users/bulk',
    method: 'PATCH',
    body: BulkUpdateSchema,
    timeout: 30000,              // Override for slow operation
    retry: false                 // Override to disable retry
  }
})
```

---

## 🎯 Type Safety Implementation

### Schema-First Type Inference

```typescript
// Schemas define the types
const GetUserParams = z.object({ id: z.string() })
const UserResponse = z.object({ 
  id: z.string(), 
  name: z.string(), 
  email: z.string() 
})

const UserAPI = resource('users', {
  get: {
    path: '/users/:id',
    params: GetUserParams,        // Input type source
    response: UserResponse        // Output type source
  }
})

// TypeScript infers automatically
type GetUserInput = z.infer<typeof GetUserParams>    // { id: string }
type GetUserOutput = z.infer<typeof UserResponse>    // User object

// Usage with perfect types
const result: Result<KairoError, GetUserOutput> = await UserAPI.get.run({ id: '123' })

result.match({
  Ok: (user: GetUserOutput) => {
    // user is fully typed
  },
  Err: (error: KairoError) => {
    // error is properly typed
  }
})
```

### Error Type Composition

```typescript
// Clear error hierarchy
type ResourceError = NetworkError | ValidationError | TimeoutError

// Methods return properly typed Results
const result = await UserAPI.get.run({ id: '123' })
//    Type: Result<ResourceError, User>

// Error handling with type safety
result.match({
  Ok: (user: User) => console.log(user.name),
  Err: (error: ResourceError) => {
    if (error instanceof NetworkError) {
      // Handle network issues
    }
    if (error instanceof ValidationError) {
      // Handle validation issues
    }
  }
})
```

---

## 🧹 Cleanup and Refactoring Tasks

### REMOVE: ChatGPT Brainstorm Features
These features diluted the core vision and created framework integration problems:

- ❌ **Signal primitive** (reactive state management)
- ❌ **Task primitive** (async state management)  
- ❌ **Form abstraction** (UI state management)
- ❌ **Universal Reactive Framework Integration** (too complex)

**Reason:** These created the framework adapter problem we wanted to avoid.

### KEEP: Core Value Features
These solve real problems and maintain framework-agnostic design:

- ✅ **Pipeline composer** (business logic composition)
- ✅ **Result pattern** (error handling)
- ✅ **Schema integration** (validation)
- ✅ **Pipeline extensions** (retry, timeout, cache, parallel, trace)

### REFACTOR: Current Resource Implementation
Align current Resource system with new design principles:

- 🔄 **Progressive disclosure configuration**
- 🔄 **Explicit rather than magic behavior**
- 🔄 **Schema-first type inference**
- 🔄 **Clean Pipeline integration**

---

## 📋 Implementation Roadmap

### Phase 1: Resource System Redesign
**Goal:** Perfect service layer elimination experience

**Tasks:**
- [ ] Implement ResourceMethodConfig interface
- [ ] Create progressive disclosure API
- [ ] Add smart defaults with override system
- [ ] Schema-first type inference
- [ ] URL parameter interpolation (/users/:id)
- [ ] Method auto-detection (GET for read, POST for create, etc.)
- [ ] Error type composition and handling

**Success Criteria:**
- Resource declaration eliminates 90% of service boilerplate
- Full TypeScript inference from schemas
- Clear error handling with typed Results
- Flexible configuration without complexity

### Phase 2: Pipeline Business Logic Polish
**Goal:** Perfect business logic composition experience

**Tasks:**
- [ ] Enhance existing pipeline methods
- [ ] Improve validation composition patterns
- [ ] Business logic transformation utilities
- [ ] Pipeline debugging and introspection
- [ ] Performance optimization for complex flows

**Success Criteria:**
- Complex business logic becomes readable
- Error-free execution through Result pattern
- Easy testing and debugging
- Composable business rules

### Phase 3: Integration Excellence
**Goal:** Seamless Resource ↔ Pipeline composition

**Tasks:**
- [ ] Resource-in-Pipeline integration
- [ ] Pipeline-in-Resource scenarios
- [ ] Complex workflow composition patterns
- [ ] End-to-end type safety
- [ ] Integration testing patterns

**Success Criteria:**
- Natural composition between Resources and Pipelines
- No type safety loss in complex compositions
- Clear mental model for when to use what
- Excellent debugging experience

---

## ✅ Success Metrics

### Developer Experience
- [ ] **Service elimination:** 500 lines → 50 lines resource declarations
- [ ] **Business logic clarity:** Imperative → declarative patterns
- [ ] **Type safety:** 100% inference from schemas
- [ ] **Error handling:** try/catch → Result pattern everywhere

### Technical Quality
- [ ] **Bundle size:** Keep core < 15KB gzipped
- [ ] **Performance:** No regression vs manual implementations
- [ ] **Framework agnostic:** Works in React, Vue, Node without adapters
- [ ] **Developer tooling:** Excellent TypeScript integration

### Usage Patterns
- [ ] **Resource patterns:** Standard CRUD, complex APIs, bulk operations
- [ ] **Pipeline patterns:** Data transformation, business workflows, validation chains
- [ ] **Integration patterns:** Resources in Pipelines, complex compositions
- [ ] **Error patterns:** Network failures, validation errors, business rule violations

---

## 🔧 Implementation Guidelines

### Code Quality Standards
- **Explicit over magic:** Behavior should be predictable and transparent
- **Type safety first:** Full TypeScript inference, no `any` types
- **Progressive disclosure:** Simple by default, complexity available when needed
- **Framework agnostic:** No framework-specific dependencies

### Testing Requirements
- **Unit tests:** All Resource and Pipeline functionality
- **Integration tests:** Resource ↔ Pipeline composition
- **Type tests:** Verify TypeScript inference works correctly
- **Error tests:** All error scenarios and Result handling

### Documentation Standards
- **Clear examples:** Real-world usage patterns
- **Migration guides:** From existing service layers
- **Best practices:** When to use Resources vs Pipelines
- **Type guides:** How schemas drive type inference

---

## 🎯 Final Vision

**Kairo eliminates the two biggest pain points in TypeScript application development:**

1. **Repetitive service layers** become **declarative resource definitions**
2. **Complex business logic** becomes **composable pipeline workflows**

**The result:** Developers write less code, make fewer errors, and create more maintainable applications.

**Framework integration:** Keep Kairo framework-agnostic. Let developers use their preferred state management and UI frameworks while Kairo handles the business logic and API layers.

---

**This is the focused direction. Implement these two pillars excellently, and Kairo will solve real developer problems without creating new ones.**