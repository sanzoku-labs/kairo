# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kairo is a clean, focused TypeScript library built around three core pillars with a simple configuration object pattern.

### **Current Architecture**

- **SERVICE Pillar** - HTTP-only API operations (5 methods + 4 utilities)
- **DATA Pillar** - Data validation, transformation, aggregation (10 methods + 6 utilities)
- **PIPELINE Pillar** - Logic composition (8 methods + 5 utilities)
- **Total**: 23 core methods with configuration objects

### **Project Structure**

```
src/
├── core/
│   ├── shared/          # Cross-cutting utilities (Result, schema, errors, config)
│   ├── service/         # SERVICE pillar implementation
│   ├── data/            # DATA pillar implementation
│   ├── pipeline/        # PIPELINE pillar implementation
│   └── index.ts         # Core exports
├── fp-utils/            # Functional programming utilities
└── index.ts             # Main library export
```

## Development Commands

### Essential Commands

- **Build**: `bun run build` - Build using tsup
- **Development**: `bun run dev` - Watch mode building
- **Test**: `bun run test` - Run tests with Vitest
- **Test (watch)**: `bun run test:watch` - Watch mode testing
- **Test (coverage)**: `bun run test:coverage` - Generate coverage reports
- **Type checking**: `bun run typecheck` - Validate TypeScript
- **Linting**: `bun run lint` - Run ESLint validation
- **Formatting**: `bun run format` - Format with Prettier

### Documentation Commands

- **Docs (dev)**: `bun run docs:dev` - Local documentation server
- **Docs (build)**: `bun run docs:build` - Build documentation site
- **API docs**: `bun run docs:api` - Generate TypeDoc API documentation

## Immediate Priorities

**CRITICAL ISSUES TO FIX:**

1. **TypeScript Compilation Errors** (100+ current errors)

   - Missing function implementations in data pillar
   - Type configuration mismatches in service layer
   - Interface inheritance conflicts in error types
   - Missing required properties in factory functions

2. **Missing Function Bodies**

   - Data pillar methods are stubs/incomplete
   - Service utilities need proper implementation
   - Pipeline methods need FP-based implementations

3. **Lint Issues Across Codebase**

   - Unused variables and imports
   - Type assertion issues
   - Property access violations

4. **Missing Tests**

   - No test coverage for core functionality
   - Need colocated `.test.ts` files

5. **Incomplete Documentation**
   - Missing JSDoc comments throughout
   - No examples in documentation

## Strict Code Quality Rules

### **ABSOLUTE REQUIREMENTS - NO EXCEPTIONS:**

- ❌ **NO workarounds for TypeScript errors** - Fix the root cause, never ignore
- ❌ **NO eslint-disable statements** - Address the underlying issue properly
- ❌ **NO `any` types** - Proper typing for everything, use unknown if needed
- ❌ **NO ignoring lint rules** - Address all warnings and errors completely
- ❌ **NO shortcuts or quick fixes** - Write proper, maintainable code

### **Quality Standards:**

- ✅ **100% TypeScript compliance** - `bun run typecheck` must pass without errors
- ✅ **100% ESLint compliance** - `bun run lint` must pass without warnings
- ✅ **Result pattern everywhere** - No throwing exceptions, use Result<E,T>
- ✅ **Configuration objects only** - No method chaining patterns
- ✅ **Complete JSDoc coverage** - Every public function documented
- ✅ **Comprehensive tests** - Colocated `.test.ts` files with good coverage

## JSDoc Documentation Standards

### **Required for ALL public functions:**

````typescript
/**
 * Brief description of what the function does.
 *
 * Longer description explaining the purpose, behavior, and any important
 * implementation details or gotchas.
 *
 * @param paramName - Description of parameter purpose and expected values
 * @param options - Configuration object with detailed property descriptions
 * @returns Description of return value and its structure
 *
 * @example
 * ```typescript
 * const result = await service.get('/api/users', {
 *   timeout: 5000,
 *   retry: { attempts: 3 }
 * })
 *
 * Result.match(result, {
 *   Ok: users => console.log('Users:', users),
 *   Err: error => console.error('Error:', error.message)
 * })
 * ```
 */
````

### **Documentation Requirements:**

- **All public functions/methods** must have complete JSDoc
- **Configuration objects** - Document every property with types and examples
- **Error types** - Document when each error code is returned
- **FP utilities** - Explain functional programming concepts and composition patterns
- **Examples** - Real, working code examples for complex functions
- **Cross-references** - Link related functions and concepts

## FP Utilities Integration Guidelines

### **When to Use FP Utilities from `src/fp-utils/`:**

Use functional programming patterns when they provide significant value in:

1. **Flexibility** - Composable, reusable patterns

   ```typescript
   // ✅ Good: Composable data processing
   const processUsers = pipe(
     users => filter(users, user => user.active),
     users => map(users, normalizeUser),
     users => groupBy(users, 'department')
   )
   ```

2. **Scalability** - Performance with large datasets

   ```typescript
   // ✅ Good: Efficient async processing
   const results = await asyncSequence(users.map(user => processUser(user)))
   ```

3. **Readability** - Cleaner, more expressive code
   ```typescript
   // ✅ Good: Clear error handling
   const safeParseJson = tryCatch(
     () => JSON.parse(data),
     error => new DataError('PARSE_ERROR', error.message)
   )
   ```

### **Available FP Utilities:**

- **Composition**: `pipe()`, `compose()`, `identity()`, `constant()`
- **Array operations**: `map()`, `filter()`, `reduce()`, `flatMap()`, `uniq()`
- **Async operations**: `asyncPipe()`, `asyncMap()`, `asyncSequence()`
- **Error handling**: `tryCatch()`, `recover()`, `chainResult()`
- **Logic utilities**: `when()`, `unless()`, `cond()`, `guard()`
- **Object utilities**: `pick()`, `omit()`, `merge()`, `deepClone()`

### **FP Implementation Guidelines:**

- Use FP patterns for complex data transformations
- Leverage FP for error handling chains
- Apply FP for async operation orchestration
- Document FP usage with clear examples in JSDoc
- Prefer FP over imperative loops where it improves readability

## Implementation Standards

### **Result Pattern Usage:**

```typescript
// ✅ Correct: All operations return Result
export const validateUser = (data: unknown, schema: Schema): Result<DataValidationError, User> => {
  // Implementation using Result pattern
}

// ❌ Wrong: Never throw exceptions
export const validateUser = (data: unknown, schema: Schema): User => {
  if (!isValid(data)) {
    throw new Error('Invalid data') // ❌ Never do this
  }
}
```

### **Configuration Object Pattern:**

```typescript
// ✅ Correct: Configuration objects
export const service = {
  get: (url: string, options: GetOptions = {}) => {
    const config = { timeout: 5000, ...options }
    // Implementation
  },
}

// ❌ Wrong: Method chaining
export const service = {
  timeout: (ms: number) => service,
  retry: (attempts: number) => service,
  get: (url: string) => {
    /* */
  },
}
```

### **Type Safety Requirements:**

```typescript
// ✅ Correct: Proper typing
export interface GetOptions {
  timeout?: number
  retry?: RetryOptions
  headers?: Record<string, string>
}

// ❌ Wrong: Using any
export interface GetOptions {
  [key: string]: any // ❌ Never use any
}
```

## Development Workflow

### **Step-by-Step Process:**

1. **Fix TypeScript Errors First**

   - Run `bun run typecheck`
   - Address each error properly (no workarounds)
   - Implement missing function bodies
   - Fix type conflicts and inheritance issues

2. **Implement Missing Methods**

   - Use FP utilities when they provide value
   - Follow configuration object pattern
   - Return Result types for all operations
   - Add comprehensive JSDoc documentation

3. **Add Comprehensive Tests**

   - Create colocated `.test.ts` files
   - Test happy paths and error cases
   - Test configuration options
   - Aim for high coverage

4. **Address Lint Issues**

   - Run `bun run lint`
   - Fix all warnings and errors
   - Remove unused imports/variables
   - Never use eslint-disable

5. **Verify Quality**
   - `bun run typecheck` must pass 100%
   - `bun run lint` must pass 100%
   - `bun run test` must pass 100%
   - All public APIs must have JSDoc

### **Quality Gates:**

- **Before committing**: All commands must pass without errors
- **Before reviewing**: Complete JSDoc coverage
- **Before merging**: 100% test coverage for new code

## Error Handling Strategy

### **Error Type Hierarchy:**

```typescript
// Base error types in src/core/shared/errors.ts
interface KairoError {
  code: string
  message: string
  timestamp: number
  context: Record<string, unknown>
}

// Pillar-specific errors
interface ServiceError extends KairoError {
  pillar: 'SERVICE'
  operation: string
}

interface DataError extends KairoError {
  pillar: 'DATA'
  operation: string
}
```

### **Error Creation Patterns:**

```typescript
// ✅ Use factory functions
const error = createServiceError('GET', 'Request timeout', { url, timeout: 5000 })

// ✅ Use Result pattern
return Result.Err(error)
```

## Testing Strategy

### **Test Organization:**

- **Colocated tests**: `feature.ts` + `feature.test.ts`
- **Test by pillar**: Service tests, Data tests, Pipeline tests
- **Integration tests**: Cross-pillar functionality
- **FP utility tests**: Functional composition patterns

### **Test Requirements:**

```typescript
// ✅ Test structure example
describe('service.get', () => {
  it('should return Result.Ok with valid response', async () => {
    const result = await service.get('/api/users')
    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      expect(result.value).toBeDefined()
    }
  })

  it('should return Result.Err on network failure', async () => {
    // Test error cases
  })

  it('should respect timeout configuration', async () => {
    // Test configuration options
  })
})
```

## Working with This Codebase

### **Before Starting Work:**

1. Run `bun run typecheck` to see current errors
2. Run `bun run lint` to see current warnings
3. Review the pillar you're working on in `src/core/`
4. Check available FP utilities in `src/fp-utils/`

### **While Developing:**

- Write JSDoc first, then implementation
- Use FP utilities when they improve code quality
- Test each function as you implement it
- Fix lint/type errors immediately (no accumulation)

### **Quality Checklist:**

- [ ] Function has complete JSDoc documentation
- [ ] Implementation uses appropriate FP utilities
- [ ] Returns Result type for error handling
- [ ] Uses configuration object pattern
- [ ] Has colocated test file with good coverage
- [ ] Passes TypeScript compilation
- [ ] Passes ESLint without warnings
- [ ] No `any` types or workarounds

---

**Remember**: Quality is non-negotiable. Fix issues properly, leverage FP utilities effectively, and document everything comprehensively. The goal is a clean, maintainable, well-documented codebase that exemplifies TypeScript and functional programming best practices.
