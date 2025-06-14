# What is Kairo?

Kairo is a **framework-agnostic**, functional and composable TypeScript library designed to eliminate glue code, clarify application logic, and provide a consistent developer experience across frontend and backend environments.

## Core Philosophy

- **Framework-agnostic** composition over configuration
- **Immutability and purity** (inspired by Gleam)
- **Developer joy** through clarity and predictability
- **Testable, composable, and reactive** — but minimal

## Problems We Solve

Modern applications often suffer from:

1. **Chaotic error flows** - Inconsistent error handling across different parts of your application
2. **Excessive glue code** - Repetitive boilerplate for fetch + validation + state + error handling
3. **Unpredictable behavior** - Complex useEffect dependencies and try/catch patterns
4. **Poor testability** - Business logic mixed with UI concerns makes testing difficult

## Solutions We Provide

Kairo addresses these problems through:

1. **Glue Code Elimination** — fetch + validation + transform + error handling unified
2. **Predictable Error Modeling** — `Result<Err, Ok>` pattern avoids runtime throws
3. **Lifecycle Scoping** — concept of scoped pipelines for cleanup and reactive context
4. **Debuggability** — `.trace()` makes logic observable and introspectable
5. **Composable Abstractions** — no hidden state, purely functional composition
6. **Testability** — `.run(input)` returns consistent `Result`, mockable in all contexts
7. **Framework Independence** — works in Node, React, Bun, Vite, etc.

## Core Primitives

### `Result<Err, Ok>`

Type-safe error handling that replaces try/catch chaos:

```typescript
import { Result } from 'kairo'

// Instead of try/catch
function parseUser(data: unknown): Result<Error, User> {
  // Returns either Ok(user) or Err(error)
  // Never throws exceptions
}
```

### `pipeline(name)`

Composable logic flows with fluent methods:

```typescript
import { pipeline, schema } from 'kairo'

const userPipeline = pipeline('get-user')
  .input(UserIdSchema) // validate inputs
  .fetch('/api/users/:id') // HTTP calls with error handling
  .validate(UserSchema) // validate outputs
  .map(user => user.profile) // transformations
  .trace('user-fetched') // debugging and observability
  .run({ id: 123 }) // execution with Result return
```

### `schema` wrapper

Simplified Zod integration for validation:

```typescript
import { schema } from 'kairo'
import { z } from 'zod'

const UserSchema = schema(
  z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
  })
)
```

## Two Ways to Use Pipelines

### 1. Chained Declarative (Recommended)

```typescript
pipeline('login')
  .input(LoginSchema)
  .fetch('/api/login')
  .validate(UserSchema)
  .map(user => user.name)
```

**Pros:** Readable, fluent  
**Cons:** Can hide complexity, harder to compose

### 2. Imperative Functional (Advanced)

```typescript
import { pipe } from 'kairo/fp'

pipe(
  input(LoginSchema),
  fetch('/api/login'),
  validate(UserSchema),
  map(user => user.name)
)
```

**Pros:** Explicit composition, pure functions  
**Cons:** More verbose, steeper learning curve

## Key Features

### Lazy Evaluation

Pipelines are **lazy** - they build a computation graph but execute nothing until `.run()` is called. This enables:

- Performance optimization
- Easy testing and mocking
- Clear separation of definition vs execution

### Immutability Pattern

Every operation returns a new pipeline instance. No mutations, no side effects during pipeline construction.

### Error Composition

All errors are wrapped in `Result.Err()` with contextual metadata. No exceptions thrown from public APIs.

## Success Metrics

### Technical

- Bundle size < 10kb gzipped (core)
- 100% test coverage on primitives
- Zero runtime dependencies (except Zod)
- TypeScript inference without `any`

### Developer Experience

- Reduces boilerplate in real codebases
- Improves debugging experience
- Enables better testing practices
- Provides clear migration path from existing tools

## Next Steps

- [Getting Started](/guide/getting-started) - Install and create your first pipeline
- [Core Concepts](/guide/concepts) - Understand the fundamental ideas
- [Examples](/examples/) - See Kairo in action
