# Kairo - Vision & Reference Document

## 🎯 Vision

Kairo is a **framework-agnostic**, functional and composable TypeScript library designed to eliminate glue code, clarify application logic, and provide a consistent developer experience across frontend and backend environments.

**Core Philosophy:**

- Framework-agnostic composition over configuration
- Immutability and purity (inspired by Gleam)
- Developer joy through clarity and predictability
- Testable, composable, and reactive — but minimal

**Problems We Solve:**

- Chaotic error flows in modern applications
- Excessive glue code between tools (fetch + validation + state + error handling)
- Unpredictable behavior from useEffect and try/catch patterns
- Poor testability of business logic mixed with UI concerns

---

## ✅ Initial Problems Solved

1. **Glue Code Elimination** — fetch + validation + transform + error handling unified
2. **Predictable Error Modeling** — `Result<Err, Ok>` pattern avoids runtime throw
3. **Lifecycle Scoping** — concept of scoped pipelines for cleanup and reactive context
4. **Debuggability** — `.trace()` makes logic observable and introspectable
5. **Composable Abstractions** — no hidden state, purely functional composition
6. **Testability** — `.run(input)` returns consistent `Result`, mockable in all contexts
7. **Framework Independence** — works in Node, React, Bun, Vite, etc.

---

## 🔧 Core Primitives (MVP)

### `Result<Err, Ok>`

Type-safe error handling that replaces try/catch chaos.

### `pipeline(name)`

Composable logic flows with methods:

- `.input(schema)` - validate inputs
- `.fetch(url)` - HTTP calls with error handling
- `.validate(schema)` - validate outputs
- `.map(fn)` / `.mapError(fn)` - transformations
- `.trace(label)` - debugging and observability
- `.run(input)` - execution with Result return

### `schema` wrapper

Simplified Zod integration for validation.

---

## 🧠 Two Ways to Use Pipelines

### 1. Chained Declarative (MVP)

```typescript
pipeline('login')
  .input(LoginSchema)
  .fetch('/api/login')
  .validate(UserSchema)
  .map(user => user.name)
```

**Pros:** Readable, fluent
**Cons:** Can hide complexity, harder to compose

### 2. Imperative Functional (Post-MVP)

```typescript
pipe(
  input(LoginSchema),
  fetch('/api/login'),
  validate(UserSchema),
  map(user => user.name)
)
```

**Pros:** Explicit composition, pure functions
**Cons:** More verbose, steeper learning curve

**Key Insight:** Chaining can mask complexity - we should document tradeoffs and guide developers toward the appropriate approach based on context.

---

## 📚 Axes of Reflection

| Area              | MVP Status          | Post-MVP Priority                   |
| ----------------- | ------------------- | ----------------------------------- |
| 🎯 Target         | ✅ Defined          | Real-world usage examples           |
| 🔁 Lifecycle      | ✅ Scoping          | `task()`, `form()`, `signal()`      |
| 🔍 Debuggability  | ✅ `.trace()`       | Structured logs, introspection      |
| 🧱 Error Modeling | ✅ Result pattern   | Custom error types, serialization   |
| 🔌 Interop        | 🚧 Basic            | React/Vue/Node adapters             |
| 🧠 Mental Model   | ✅ Pipeline concept | "How to think in Kairo" docs        |
| ⚙️ Runtime Perf   | 🚧 Lazy eval        | Benchmarks, reactive cost profiling |

---

## 🔮 Post-MVP Features (Roadmap)

### Phase 2 - Lifecycle & State

| Feature    | Description                             | Alignment                |
| ---------- | --------------------------------------- | ------------------------ |
| `task()`   | Async result with pending/success/error | Lifecycle, Debuggability |
| `form()`   | State + validation + update pipeline    | Lifecycle, Mental Model  |
| `signal()` | Reactive state primitive                | Lifecycle, Runtime Perf  |

### Phase 3 - Advanced Composition

| Feature       | Description                           | Alignment                   |
| ------------- | ------------------------------------- | --------------------------- |
| `resource()`  | Define reusable API logic blocks      | Interop, Composability      |
| `withCache()` | Declarative caching logic in pipeline | Runtime Perf                |
| `fp-utils`    | pipe, compose, curry, etc.            | Mental Model, Composability |

---

## 🧩 Key Implementation Insights

### Lazy Evaluation

Pipelines are **lazy** - they build a computation graph but execute nothing until `.run()` is called. This enables:

- Performance optimization
- Easy testing and mocking
- Clear separation of definition vs execution

### Immutability Pattern

Every operation returns a new pipeline instance. No mutations, no side effects during pipeline construction.

### Error Composition

All errors are wrapped in `Result.Err()` with contextual metadata. No exceptions thrown from public APIs.

---

## 💬 Developer Experience Philosophy

### Built with AI Assistance

- Developed iteratively with Claude Code
- Rapid MVP delivery with real-world refinement
- Overcome "shame in AI code" by understanding and refining

### Meta-Usage Encouraged

Using Kairo to define Kairo itself validates the abstractions and surfaces pain points early.

### Framework Agnostic by Design

Not bound to React - plan adapters but don't hardcode framework assumptions.

---

## 🛣️ Strategic Roadmap

### Short Term (MVP)

1. Core primitives: Result, Pipeline, Schema
2. Real-world examples and documentation
3. Test framework and benchmarks

### Medium Term (v2)

1. Lifecycle primitives: task, form, signal
2. Framework adapters: React, Vue, Node
3. Advanced composition utilities

### Long Term (v3+)

1. Developer tooling and debugging
2. Performance optimization
3. Ecosystem integration

---

## 🧠 Insights Worth Preserving

- **Chaining tradeoffs**: Readable but can hide complexity - use judiciously
- **Gleam inspiration**: Purity, no mutation, elegance over cleverness
- **Interop strategy**: Framework-agnostic core with targeted adapters
- **Real-world validation**: Theory is nice, but usage reveals truth
- **Developer joy**: If it's not fun to use, adoption will suffer

---

## 🎭 Success Metrics

### Technical

- Bundle size < 10kb gzipped (core)
- 100% test coverage on primitives
- Zero runtime dependencies (except Zod)
- TypeScript inference without `any`

### Adoption

- Reduces boilerplate in real codebases
- Improves debugging experience
- Enables better testing practices
- Provides clear migration path from existing tools

### Community

- Clear documentation and examples
- Positive developer feedback
- Growing ecosystem of adapters
- Contributions from early adopters

---

_This document serves as the persistent reference for Kairo's vision, philosophy, and strategic direction. Update as insights emerge from real-world usage._
