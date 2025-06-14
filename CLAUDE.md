# Kairo Framework - Development Roadmap & Workflow

> **Target:** Claude Code working on existing Kairo codebase  
> **Objective:** Follow roadmap, maintain code quality, use established patterns

## 📖 Context & Vision

**Read VISION.md first** to understand the overall philosophy, goals, and strategic direction of Kairo.

**Key principles to keep in mind:**

- **Framework-agnostic**: Every feature should work across React, Node, Bun, etc.
- **Functional & immutable**: Inspired by Gleam - no mutations, pure functions
- **Developer joy**: Eliminate glue code, make debugging pleasant
- **Composable abstractions**: No hidden state, everything should compose cleanly
- **Lazy by design**: Only execute when explicitly requested

**Success metrics from vision:**

- Bundle size < 10kb gzipped (core)
- Reduce boilerplate in real codebases
- Improve debugging experience
- Enable better testing practices

Refer back to VISION.md when making architectural decisions or trade-offs.

---

## 🔄 Development Workflow (MANDATORY)

### After Every Implementation/Refactoring:

```bash
# 1. Lint and format
bun run lint
bun run format

# 2. Type checking
bun run typecheck

# 3. Build verification
bun run build

# 4. Run tests
bun run test

# 5. Fix any errors before proceeding
```

**Never proceed to next feature if any of these steps fail.**

### Mandatory Testing Requirements:

**Before implementing any new phase, ALL previous functionality MUST have comprehensive test coverage:**

1. **Core Pipeline Features** ✅

   - Basic operations (map, input, fetch, validate)
   - Error handling and Result patterns
   - HTTP client integration
   - Complex pipeline flows

2. **Advanced Pipeline Methods** ✅

   - `cache(ttl)` - caching with TTL, cache invalidation
   - `retry(times, delay)` - retry logic with network failures
   - `timeout(ms)` - timeout handling for slow operations
   - `parallel(pipelines[])` - concurrent execution and error aggregation
   - `fallback(pipeline)` - primary/fallback flow with error scenarios

3. **Enhanced Tracing System** ✅
   - Trace collection with unique IDs and metadata
   - Filtering and querying capabilities
   - Visualization helpers (summary, table, timeline)
   - Performance metrics and throughput tracking
   - Error breakdown and slow query detection

**Test Coverage Standards:**

- 100% coverage on core functionality
- Error scenarios must be tested, not just happy paths
- Integration tests for complex multi-step flows
- Performance and timeout edge cases
- Mock HTTP clients for predictable testing

**Test Quality Requirements:**

- **Type Safety**: Use proper TypeScript types in tests, avoid `any` except for mocks
- **Mock Types**: Create proper interfaces for mocks instead of disabling type checking
- **ESLint Rules**: Only relax rules to 'warn' for test flexibility, never disable completely
- **Assertion Safety**: Use type guards and proper casting for assertions
- **Error Testing**: Verify exact error types and messages, not just failure states

**Test Organization:**

- `/tests/pipeline.test.ts` - Core pipeline functionality
- `/tests/tracing.test.ts` - Enhanced tracing system
- `/tests/result.test.ts` - Result type functionality
- `/tests/schema.test.ts` - Schema validation
- `/src/utils/fp/*.test.ts` - FP utility functions

**ESLint Configuration for Tests:**

```javascript
// For test files: Allow flexibility but maintain safety
rules: {
  '@typescript-eslint/no-explicit-any': 'warn',        // Allow but warn
  '@typescript-eslint/no-unsafe-assignment': 'warn',   // Allow but warn
  '@typescript-eslint/no-unsafe-member-access': 'warn', // Allow but warn
  '@typescript-eslint/no-unsafe-return': 'error',      // Keep strict
  '@typescript-eslint/ban-ts-comment': 'error',        // Keep strict
}
```

### After Completing Tasks/Features:

**MANDATORY: Update progress tracking in this document**

1. **Mark completed tasks** with `[x]` in the relevant phase sections
2. **Update Current Priority section** to reflect new status
3. **Add completion notes** if significant milestones reached
4. **Update bundle size** if there are significant changes

Example:

```markdown
**Tasks:**

- [x] Implement retry method ✅ 2024-01-15
- [x] Implement timeout method ✅ 2024-01-15
- [ ] Implement cache method

## 🎯 Current Priority

**✅ Phase 1.1 Complete:** Enhanced Error System  
**✅ Phase 1.2 Partial:** retry, timeout (Bundle: 13.57KB)
```

**This ensures roadmap stays accurate and team visibility is maintained.**

---

## 🧰 Code Patterns & Conventions

### Use Existing FP Utils (PRIORITY)

The project already has functional programming utilities. **Always use these instead of reinventing:**

```typescript
// Use existing FP utils from src/utils/
import { pipe, compose, identity, curry } from '../utils/fp'
import { isOk, isErr, mapResult, flatMapResult } from '../utils/result'
import { isDefined, isNull, isUndefined } from '../utils/guards'

// ✅ Good - use existing
const processData = pipe(validate(schema), mapResult(transform), flatMapResult(save))

// ❌ Bad - reinventing
const processData = data => {
  const validated = validate(schema)(data)
  if (validated.tag === 'Ok') {
    const transformed = transform(validated.value)
    return save(transformed)
  }
  return validated
}
```

### When to Create New FP Utils

Only create new utilities if:

1. The pattern is used 3+ times across the codebase
2. It doesn't exist in current utils
3. It follows functional programming principles (pure, composable)

**Pattern for new utils:**

```typescript
// src/utils/newUtil.ts
export const newUtilFunction =
  <T, U>(param: T) =>
  (input: U): Result<Error, V> => {
    // Implementation using existing utils when possible
    return pipe(existingUtil1, existingUtil2)(input)
  }
```

---

## 🗺️ Roadmap Features (In Priority Order)

### 🎯 Phase 1: Core Stabilization (Current)

#### 1.1 Enhanced Error System

**Goal:** Rich, traceable error types with context

```typescript
// Implement error composition and chaining
interface KairoError {
  code: string
  message: string
  context: Record<string, unknown>
  cause?: KairoError
  timestamp: number
  trace?: string[]
}

// Error factory with context
const createError = (code: string, message: string, context = {}) =>
  pipe(addTimestamp, addTrace, addContext(context))({ code, message })
```

**Tasks:**

- [x] Enhance ValidationError with field paths
- [x] Add NetworkError with retry context
- [x] Add TimeoutError with duration info
- [x] Implement error chaining with `.cause`
- [x] Add error serialization for logging

#### 1.2 Advanced Pipeline Steps

**Goal:** More pipeline methods for complex flows

```typescript
// New methods to implement
interface Pipeline<Input, Output> {
  // Existing methods...

  retry(times: number, delay?: number): Pipeline<Input, Output>
  timeout(ms: number): Pipeline<Input, Output>
  cache(ttl: number): Pipeline<Input, Output>
  parallel<T>(pipelines: Pipeline<Input, T>[]): Pipeline<Input, T[]>
  fallback<T>(pipeline: Pipeline<Input, T>): Pipeline<Input, Output | T>
}
```

**Implementation approach:**

- Use existing FP utils for composition
- Each method returns new Pipeline instance (immutability)
- Leverage Result pattern for error handling

**Tasks:**

- [x] Implement `retry(times: number, delay?: number)` method ✅ 2024-06-14
- [x] Implement `timeout(ms: number)` method ✅ 2024-06-14
- [x] Implement `cache(ttl: number)` method ✅ 2024-06-14
- [x] Implement `parallel<T>(pipelines: Pipeline<Input, T>[])` method ✅ 2024-06-14
- [x] Implement `fallback<T>(pipeline: Pipeline<Input, T>)` method ✅ 2024-06-14

#### 1.3 Enhanced Tracing System

**Goal:** Structured, queryable trace data

```typescript
interface TraceEntry {
  id: string
  timestamp: number
  pipelineName: string
  stepName: string
  duration: number
  success: boolean
  input?: unknown
  output?: unknown
  error?: KairoError
  metadata: Record<string, unknown>
}

// Global trace collector
interface TraceCollector {
  collect(entry: TraceEntry): void
  query(filter: TraceFilter): TraceEntry[]
  export(): TraceData
}
```

**Tasks:**

- [x] Implement structured trace collection ✅ 2024-06-14
- [x] Add trace filtering and querying ✅ 2024-06-14
- [x] Create trace visualization helpers ✅ 2024-06-14
- [x] Add performance metrics tracking ✅ 2024-06-14

---

### 🎯 Phase 2: Reactive Extensions

#### 2.1 Signal Primitive

**Goal:** Lightweight reactive state with scoping

```typescript
interface Signal<T> {
  get(): T
  set(value: T): void
  update(fn: (prev: T) => T): void
  subscribe(fn: (value: T) => void): () => void
  pipe<U>(fn: (value: T) => U): Signal<U>
}

// Usage with existing patterns
const createSignal = <T>(initial: T): Signal<T> =>
  pipe(validateInitialValue, createSubscriptionManager, createGetterSetter)(initial)
```

**Implementation strategy:**

- Use existing FP utils for transformations
- Integrate with pipeline `.asSignal()` method
- Scope-aware cleanup mechanism

#### 2.2 Task Primitive

**Goal:** Async state management (pending/success/error)

```typescript
interface Task<T> {
  readonly state: 'idle' | 'pending' | 'success' | 'error'
  readonly data?: T
  readonly error?: KairoError
  run(input?: unknown): Promise<void>
  reset(): void
  signal(): Signal<TaskState<T>>
}

// Create from pipeline
const createTask = <I, O>(pipeline: Pipeline<I, O>): Task<O> =>
  pipe(createTaskState, attachPipeline, createSignal)(pipeline)
```

#### 2.3 Form Abstraction

**Goal:** Form state + validation + submission pipeline

```typescript
interface Form<T> {
  fields: Signal<Partial<T>>
  errors: Signal<Record<keyof T, string[]>>
  isValid: Signal<boolean>
  isSubmitting: Signal<boolean>
  submit: Task<T>
  reset(): void
  setField<K extends keyof T>(key: K, value: T[K]): void
}

// Usage
const loginForm = createForm({
  schema: LoginSchema,
  onSubmit: loginPipeline,
  validation: 'onBlur',
})
```

---

### 🎯 Phase 3: Resource Management

#### 3.1 Resource Declaration

**Goal:** Declarative API endpoint definitions

```typescript
interface Resource<Methods> {
  [K in keyof Methods]: Pipeline<Methods[K]['input'], Methods[K]['output']>
}

// Usage
const UserResource = resource('user', {
  get: {
    method: 'GET',
    path: '/api/user/:id',
    params: z.object({ id: z.string() }),
    response: UserSchema
  },
  update: {
    method: 'PUT',
    path: '/api/user/:id',
    params: z.object({ id: z.string() }),
    body: UpdateUserSchema,
    response: UserSchema
  }
})

// Auto-generated pipelines
await UserResource.get.run({ id: '123' })
await UserResource.update.run({ id: '123', name: 'New Name' })
```

**Implementation approach:**

- Generate pipelines using existing pipeline primitives
- Use FP utils for URL interpolation and HTTP methods
- Integrate with cache and retry mechanisms

#### 3.2 Cache System

**Goal:** Declarative caching with TTL and invalidation

```typescript
interface CacheConfig {
  ttl: number
  key: (input: unknown) => string
  invalidateOn?: string[]
}

// Pipeline integration
const cachedUserPipeline = pipeline('get-user')
  .input(IdSchema)
  .cache({ ttl: 300000, key: input => `user:${input.id}` })
  .fetch('/api/user/:id')
  .validate(UserSchema)
```

---

## 🔧 Implementation Guidelines

### File Organization

```
src/
├── core/           # Core primitives (stable)
├── extensions/     # New features (signals, tasks, forms)
├── utils/          # FP utilities (USE THESE!)
├── types/          # Type definitions
└── examples/       # Usage examples
```

### Testing Strategy

```typescript
// Test pattern for new features
describe('NewFeature', () => {
  // Unit tests for pure functions
  describe('pure functions', () => {
    it('should work with existing FP utils', () => {
      const result = pipe(newFeature, existingUtil)(input)

      expect(isOk(result)).toBe(true)
    })
  })

  // Integration tests with pipelines
  describe('pipeline integration', () => {
    it('should compose with existing pipeline methods', async () => {
      const result = await pipeline('test').input(schema).newMethod().run(input)

      expect(isOk(result)).toBe(true)
    })
  })
})
```

### Type Safety Patterns

```typescript
// Use existing type guards
const processValue = <T>(value: unknown): Result<Error, T> =>
  pipe(guardType<T>, validate, transform)(value)

// Leverage existing Result helpers
const chainOperations = pipe(mapResult(step1), flatMapResult(step2), mapResult(step3))
```

---

## 📚 Reference: Existing Utils to Use

### FP Core

- `pipe()` - Function composition
- `compose()` - Right-to-left composition
- `curry()` - Function currying
- `identity()` - Identity function

### Result Helpers

- `isOk()` - Type guard for Ok results
- `isErr()` - Type guard for Err results
- `mapResult()` - Transform Ok values
- `flatMapResult()` - Chain Result operations

### Type Guards

- `isDefined()` - Check for non-null/undefined
- `isNull()` - Null check
- `isUndefined()` - Undefined check

### Validation

- `validateSchema()` - Schema validation with Result
- `parseJson()` - Safe JSON parsing

**Before implementing new utilities, check if existing ones can be composed to achieve the goal.**

---

## ⚠️ Critical Rules

1. **Always use existing FP utils** before creating new ones
2. **Run full workflow** after every change
3. **No mutations** - all operations return new instances
4. **Result pattern** - never throw exceptions in public APIs
5. **Type safety** - leverage existing type guards and helpers
6. **Test coverage** - maintain 100% on core features
7. **Documentation** - update examples when adding features

---

#### 2.1 Signal Primitive

**Goal:** Lightweight reactive state with scoping

```typescript
interface Signal<T> {
  get(): T
  set(value: T): Result<SignalError, void>
  update(fn: (prev: T) => T): Result<SignalError, void>
  subscribe(fn: (value: T) => void): SignalSubscription
  pipe<U>(fn: (value: T) => U): Signal<U>
  map<U>(fn: (value: T) => U): Signal<U>
  filter(predicate: (value: T) => boolean): Signal<T>
  readonly value: T
}

// Usage with existing patterns
const userSignal = createSignal<User>({ id: 1, name: 'John' })
const nameSignal = userSignal.map(user => user.name)
```

**Implementation strategy:**

- Use existing FP utils for transformations
- Integrate with pipeline `.asSignal()` method
- Scope-aware cleanup mechanism

**Tasks:**

- [x] Implement Signal interface and core functionality ✅ 2024-06-14
- [x] Add subscription management with error handling ✅ 2024-06-14
- [x] Implement Signal transformations (map, filter, pipe) ✅ 2024-06-14
- [x] Add utility functions (combine, conditional, validated) ✅ 2024-06-14
- [x] Create signalEffect helpers for common patterns ✅ 2024-06-14
- [x] Integrate with Pipeline via .asSignal() method ✅ 2024-06-14
- [x] Comprehensive test coverage (28 tests) ✅ 2024-06-14

---

## 🎯 Current Priority

**✅ Phase 1.1 Complete:** Enhanced Error System  
**✅ Phase 1.2 Complete:** Advanced Pipeline Steps  
**✅ Phase 1.3 Complete:** Enhanced Tracing System
**✅ Phase 2.1 Complete:** Signal Primitive
**✅ Phase 2.2 Complete:** Task Primitive
**✅ Phase 2.3 Complete:** Form Abstraction (Bundle: ~31KB)

**Next focus: Phase 3.1** - Resource Declaration for declarative API endpoint definitions.

Key Phase 2.1 achievements:

- Lightweight reactive Signal primitive with immutable updates
- Rich transformation API (map, filter, pipe, combine, conditional)
- Comprehensive subscription management with error handling
- Pipeline integration via `.asSignal()` method
- Functional composition using existing FP utilities
- 28 comprehensive tests covering all functionality
- Framework-agnostic design works across React, Node, Bun

Signal features implemented:

- **Core Operations**: get, set, update with Result-based error handling
- **Subscriptions**: Multi-subscriber support with automatic cleanup
- **Transformations**: map, filter, pipe for reactive derivations
- **Utilities**: combine multiple signals, conditional updates, validation
- **Effects**: onChange, onChangeOnly, onTrue, batch operations
- **Pipeline Integration**: Convert any pipeline to reactive signal

Key Phase 2.2 achievements:

- Async state management Task primitive with idle/pending/success/error states
- Immutable state transitions with Signal integration for reactive updates
- Pipeline integration via `.asTask()` method for seamless async workflows
- Concurrent execution prevention and safe state management
- Comprehensive utility functions (parallel, sequence, groupByState, resetAll)
- Rich effect system (onStateChange, onSuccess, onError, onComplete, onStart)
- Full timing and performance tracking (startTime, endTime, duration)
- 28 comprehensive tests covering all async state scenarios
- Result-based error handling integrated with existing KairoError system

Task features implemented:

- **State Management**: Automatic state transitions (idle → pending → success/error)
- **Signal Integration**: Reactive state updates via task.signal() method
- **Pipeline Integration**: Convert any pipeline to stateful task via .asTask()
- **Utilities**: Parallel/sequence execution, state grouping, bulk operations
- **Effects**: Comprehensive lifecycle hooks for all state transitions
- **Error Handling**: Concurrent execution prevention, Result-based APIs
- **Performance**: Built-in timing metrics and execution tracking

Remember: **Quality over speed. Follow the workflow. Use existing patterns.**
