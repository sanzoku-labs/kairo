# API Reference

Welcome to the Kairo API reference. This section provides detailed documentation for Kairo's focused Two-Pillar Architecture.

## Core Foundation

### [Result](/api/result)

Type-safe error handling without exceptions.

### [Schema](/api/schema)

Zod-based validation with Result integration.

## Pillar 1: Resources

### [Resource](/api/resource)

Declarative API endpoint definitions that eliminate service layer repetition.

## Pillar 2: Pipelines

### [Pipeline](/api/pipeline)

The main abstraction for composable business logic workflows.

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
  KairoError,
  ValidationError,
  NetworkError,
  TimeoutError,
} from 'kairo'
```
