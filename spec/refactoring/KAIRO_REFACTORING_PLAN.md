# Kairo Refactoring Plan: FP Utils Enhancement & Zod Migration

## 🚨 FIRST PRIORITY REFACTORING 🚨

This refactoring plan addresses two critical improvements to the Kairo codebase and **MUST BE IMPLEMENTED BEFORE ANY FEATURE ENHANCEMENTS**:

1. **Complete Zod Removal**: Migrate all Zod-dependent code to use the native schema system exclusively
2. **Enhanced FP Utils Adoption**: Systematically integrate functional programming utilities across the codebase where they provide improved readability and maintainability

---

## Phase 1: Complete Zod Migration (CRITICAL - FIRST PRIORITY)

### Current Zod Usage Analysis

**Files with Zod Dependencies:**

- `src/core/schema.ts` - Legacy Zod wrapper system (DEPRECATED)
- `src/core/schema.test.ts` - Tests for legacy schema
- `src/core/rules.test.ts` - Test cases using Zod schemas
- `src/extensions/contract.test.ts` - Contract tests with Zod
- `package.json` - Zod as runtime dependency (must be removed)

### Migration Strategy

#### 1.1 Core Schema System Replacement

- [ ] **Replace all `schema.` imports** with `nativeSchema.` throughout codebase
- [ ] **Update API calls** from legacy schema to native schema equivalents
- [ ] **Maintain 100% API compatibility** to prevent breaking changes
- [ ] **Verify type inference** works correctly with native schema

#### 1.2 Test Suite Migration

- [ ] **`src/core/rules.test.ts`**: Convert all Zod schema definitions to native schema
- [ ] **`src/extensions/contract.test.ts`**: Replace Zod usage with native schema patterns
- [ ] **`src/core/schema.test.ts`**: Migrate to native schema tests or remove if redundant
- [ ] **Run full test suite** after each migration step

#### 1.3 Legacy Code Removal

- [ ] **Delete `src/core/schema.ts`** completely
- [ ] **Update `src/index.ts`** exports to only include native schema
- [ ] **Remove Zod from `package.json`** dependencies
- [ ] **Clean up any remaining Zod type imports**

#### 1.4 Validation & Testing

- [ ] **Performance benchmarks**: Verify 2-3x speed improvement
- [ ] **Bundle size verification**: Confirm 50%+ reduction
- [ ] **API compatibility tests**: Ensure no breaking changes
- [ ] **Full regression testing**: 100% test suite passing

---

## Phase 2: Enhanced FP Utils Adoption

### Current FP Utils Analysis

**Existing FP Usage (Limited):**

- `src/core/schema.ts` - Basic usage (isNil, isEmpty, path)
- `src/core/pipeline.ts` - Minimal FP integration
- `src/extensions/events/event-bus.ts` - Limited patterns
- `src/extensions/caching/cache.ts` - Basic FP usage

**Available FP Utils (Comprehensive Library):**

```typescript
// From src/utils/fp/index.ts
- Basics: identity, constant, pipe, compose, noop
- Logic: isNil, isEmpty, not, equals
- Array: map, filter, flatMap, uniq, groupBy
- Object: pick, omit, merge, deepClone, path
- Control: cond, condWith, when, unless, switchCase, guard, branch
- Function: resolve, resolveAll, memoizeResolver, apply, tap, delay, retry
- Maybe: isSome, isNone, maybe, chain, withDefault, unwrap, fromTry
- Effects: effect, conditionalEffect, log, debug, trace, measure
- Result: sequence, traverse, mapResult, chainResult, filterResult
- Async: asyncPipe, asyncMap, asyncFilter, asyncSequence, retryAsync
- Curry: curry2, curry3, curry4, flip, unary, binary
```

### Enhancement Strategy

#### 2.1 Core Module FP Enhancement

**Resource Module (`src/core/resource.ts`):**

- [ ] Replace manual error handling with `Result` combinators (`mapResult`, `chainResult`)
- [ ] Use `pipe` for request/response transformation chains
- [ ] Implement `retry` and `withTimeout` for network operations
- [ ] Use `tryCatch` for exception boundary handling
- [ ] Add `tap` for logging and debugging resource calls

**Pipeline Module (`src/core/pipeline.ts`):**

- [ ] Enhanced `compose` and `pipe` for step composition
- [ ] Use `sequence` and `traverse` for async step execution
- [ ] Implement `cond` and `when` for conditional pipeline logic
- [ ] Add `measure` for performance monitoring
- [ ] Use `asyncSequence` for parallel step processing

**Repository Module (`src/core/repository.ts`):**

- [ ] Use `maybeMap` and `maybeFilter` for optional data handling
- [ ] Implement `partition` for query result separation
- [ ] Use `groupBy` for data organization and aggregation
- [ ] Add `asyncMap` for batch operations
- [ ] Use `memoizeResolver` for query result caching

**Rules Module (`src/core/rules.ts`):**

- [ ] Use `all` and `first` for rule validation sequences
- [ ] Implement `guard` for precondition checks
- [ ] Use `cond` for complex rule branching logic
- [ ] Add `collect` for validation result aggregation
- [ ] Use `partition` to separate passed/failed validations

**Transform Module (`src/core/transform.ts`):**

- [ ] Enhanced `map` and `flatMap` for data transformations
- [ ] Use `filter` and `partition` for data filtering
- [ ] Implement `traverse` for async transformations
- [ ] Add `path` utilities for deep object access
- [ ] Use `merge` and `deepClone` for data manipulation

#### 2.2 Extension Module FP Enhancement

**Caching Extension (`src/extensions/caching/`):**

- [ ] Use `memoizeResolver` for intelligent cache key generation
- [ ] Implement `withTimeout` for cache operation timeouts
- [ ] Use `maybe` patterns for cache hit/miss handling
- [ ] Add `effects` for cache analytics and logging
- [ ] Use `retry` for cache operation resilience

**Events Extension (`src/extensions/events/`):**

- [ ] Use `filter` and `map` for event stream processing
- [ ] Implement `asyncSequence` for event handler execution
- [ ] Use `partition` for event routing and categorization
- [ ] Add `debounceEffect` and `throttleEffect` for event throttling
- [ ] Use `traverse` for event transformation pipelines

**Transactions Extension (`src/extensions/transactions/`):**

- [ ] Use `sequence` for transaction step execution
- [ ] Implement `recover` for rollback operations
- [ ] Use `chainResult` for transaction result chaining
- [ ] Add `withTimeout` for transaction timeouts
- [ ] Use `guard` for transaction precondition validation

**Plugins Extension (`src/extensions/plugins/`):**

- [ ] Use `traverse` for plugin initialization sequences
- [ ] Implement `filter` for plugin activation logic
- [ ] Use `groupBy` for plugin categorization
- [ ] Add `guard` for plugin validation and health checks
- [ ] Use `resolve` patterns for plugin dependency resolution

**Workflows Extension (`src/extensions/workflows/`):**

- [ ] Enhanced `pipe` usage for workflow step composition
- [ ] Use `cond` for workflow branching and decision logic
- [ ] Implement `retry` for failed step recovery
- [ ] Add `measure` for workflow performance analytics
- [ ] Use `asyncSequence` for parallel workflow execution

#### 2.3 Testing Module FP Enhancement

**Testing Utilities (`src/testing/`):**

- [ ] Use `asyncMap` for parallel test execution
- [ ] Implement `partition` for test result categorization
- [ ] Use `collect` for test metrics aggregation
- [ ] Add `measure` for performance testing
- [ ] Use `traverse` for test data transformation

---

## Implementation Guidelines

### Code Quality Standards

1. **Readability First**: Only use FP utils where they genuinely improve code readability
2. **Type Safety**: Maintain full TypeScript inference throughout all transformations
3. **Performance**: Ensure FP utilities don't degrade performance (benchmark critical paths)
4. **Documentation**: Update JSDoc comments for all changed functions
5. **Testing**: Maintain 100% test coverage for all refactored code

### FP Enhancement Patterns

#### Before (Imperative)

```typescript
// Manual error handling and data processing
async function processUserData(userData: unknown) {
  try {
    if (!userData || typeof userData !== 'object') {
      throw new Error('Invalid user data')
    }

    const user = userData as any
    const results = []

    for (const item of user.items || []) {
      if (item.active) {
        const processed = await processItem(item)
        if (processed) {
          results.push(processed)
        }
      }
    }

    return { success: true, data: results }
  } catch (error) {
    console.error('Processing failed:', error)
    return { success: false, error: error.message }
  }
}
```

#### After (Functional with FP Utils)

```typescript
// FP-enhanced processing with better readability
const processUserData = pipe(
  guard(isObject, 'Invalid user data'),
  path(['items']),
  withDefault([]),
  filter(item => item.active),
  asyncMap(processItem),
  filter(isNotNil),
  tap(results => measure('processing-time', results.length)),
  toResult,
  recover(error => ({ success: false, error: error.message }))
)
```

### Migration Safety Checklist

#### For Each Module:

- [ ] **Backup current implementation** before refactoring
- [ ] **Write comprehensive tests** for existing behavior
- [ ] **Implement FP version** alongside existing code
- [ ] **Run performance benchmarks** to ensure no regressions
- [ ] **Update documentation** with new patterns
- [ ] **Remove old implementation** only after full validation

---

## Success Metrics

### Phase 1: Zod Migration

- [ ] **Zero Zod imports** anywhere in the codebase
- [ ] **100% test suite passing** with native schema
- [ ] **Bundle size reduction** of 50%+ confirmed
- [ ] **Performance improvement** of 2-3x validated
- [ ] **API compatibility** maintained (no breaking changes)

### Phase 2: FP Enhancement

- [ ] **50%+ reduction** in imperative code patterns
- [ ] **Improved readability scores** (team review)
- [ ] **Maintained performance** (no regressions)
- [ ] **Enhanced type safety** with better inference
- [ ] **Comprehensive test coverage** maintained

---

## Implementation Timeline

### Phase 1: Zod Migration (CRITICAL - FIRST PRIORITY)

- **Week 1**: Core schema migration (`schema.ts` → `native-schema.ts`)
- **Week 2**: Test suite migration and validation
- **Week 3**: Dependency removal and cleanup
- **Week 4**: Performance validation and documentation

### Phase 2: FP Enhancement (Post-Migration)

- **Week 5-6**: Core modules FP enhancement
- **Week 7-8**: Extension modules FP enhancement
- **Week 9**: Testing utilities and performance validation
- **Week 10**: Documentation and team training

---

## Risk Mitigation

### Zod Migration Risks

- **API Breaking Changes**: Maintain strict API compatibility through comprehensive testing
- **Performance Regressions**: Comprehensive benchmarking at each step
- **Missing Features**: Ensure native schema has complete feature parity
- **Type Safety Loss**: Validate TypeScript inference works correctly

### FP Enhancement Risks

- **Over-abstraction**: Only use FP where it genuinely improves clarity
- **Learning Curve**: Provide clear examples and comprehensive documentation
- **Performance Impact**: Profile all FP utility usage in critical paths
- **Debugging Complexity**: Ensure FP compositions are still debuggable

---

## Testing Strategy

### Automated Testing

- [ ] **Unit tests** for each refactored module
- [ ] **Integration tests** for FP compositions
- [ ] **Performance benchmarks** for critical paths
- [ ] **Bundle size monitoring** for dependency changes
- [ ] **API compatibility tests** for breaking change detection

### Manual Validation

- [ ] **Code review** for readability improvements
- [ ] **Team training** on new FP patterns
- [ ] **Documentation review** for accuracy and completeness

---

## Conclusion

This refactoring plan prioritizes the **critical Zod migration as absolute first priority**, followed by systematic FP utilities enhancement. The approach ensures:

- **🚀 Superior Performance**: Native schema system delivers 2-3x faster validation
- **📦 Smaller Bundle Size**: 50%+ reduction by removing Zod dependency
- **🔧 Better Maintainability**: Consistent FP patterns throughout codebase
- **✨ Enhanced Developer Experience**: Improved type safety and code readability
- **🛡️ Production Safety**: Comprehensive testing and gradual migration strategy

**CRITICAL: This refactoring MUST be completed before any new feature development to ensure a solid foundation for future enhancements.**
