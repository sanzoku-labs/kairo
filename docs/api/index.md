# API Reference

Welcome to the Kairo API reference. This section provides detailed documentation for all Kairo APIs.

## Core API

### [Pipeline](/api/pipeline)

The main abstraction for composable data processing workflows.

### [Result](/api/result)

Type-safe error handling without exceptions.

### [Schema](/api/schema)

Zod-based validation with Result integration.

## Reactive API

### [Signal](/api/signal)

Lightweight reactive state primitive.

### [Task](/api/task)

Async state management with lifecycle tracking.

### [Form](/api/form)

Form state management with validation.

## Resource API

### [Resource](/api/resource)

Declarative API endpoint definitions.

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
  Signal,
  Task,
  Form,
  Resource,
  KairoError,
  ValidationError,
  NetworkError,
  TimeoutError,
} from 'kairo'
```
