# API Reference

Welcome to the Kairo API reference. This section provides detailed documentation for Kairo's complete Three-Pillar Architecture.

## Core Foundation

### [Result](/api/result)

Type-safe error handling without exceptions.

### [Schema](/api/schema)

Native schema validation system (3x faster than Zod, zero dependencies).

## INTERFACE Pillar

### [Resource](/api/resource)

Declarative API endpoint definitions that eliminate service layer repetition.

### [Contract Testing](/api/contract)

Verify API contracts, generate mocks, and ensure API reliability.

## PROCESS Pillar

### [Pipeline](/api/pipeline)

The main abstraction for composable business logic workflows.

### [Business Rules](/api/rules)

Declarative validation rules for centralizing business logic.

### [Workflow](/api/workflow)

Complex multi-step process orchestration with parallel execution, conditionals, loops, and rollback capabilities.

## DATA Pillar

### [Transform](/api/transform)

Declarative data mapping and conversion between schemas.

### [Repository](/api/repository)

Type-safe data access layer with relationships and lifecycle hooks.

## Functional Programming Utilities

- `pipe()` - Function composition
- `compose()` - Right-to-left composition
- `curry()` - Function currying
- `identity()` - Identity function
- Array utilities: `map()`, `filter()`, `reduce()`
- Object utilities: `pick()`, `omit()`, `merge()`
- Type guards: `isDefined()`, `isNull()`, `isUndefined()`

## Type Exports

```typescript
import type {
  Result,
  Pipeline,
  Resource,
  Workflow,
  WorkflowContext,
  WorkflowError,
  Rule,
  Rules,
  BusinessRuleError,
  Transform,
  Repository,
  RepositoryError,
  StorageAdapter,
  HasOneRelation,
  HasManyRelation,
  BelongsToRelation,
  KairoError,
  ValidationError,
  NetworkError,
  TimeoutError,
} from 'kairo'
```
