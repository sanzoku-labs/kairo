---
layout: home

hero:
  name: "Kairo"
  text: "Functional TypeScript Library"
  tagline: "Eliminate glue code, clarify application logic, and provide a consistent developer experience"
  image:
    src: /logo.svg
    alt: Kairo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/sovanaryththorng/kairo

features:
  - icon: 🔧
    title: Framework Agnostic
    details: Works seamlessly across React, Node, Bun, and any TypeScript environment
  - icon: ⚡
    title: Functional & Composable
    details: Inspired by Gleam - immutable, pure functions that compose elegantly
  - icon: 🎯
    title: Developer Joy
    details: Eliminate boilerplate, improve debugging, and make testing pleasant
  - icon: 🔄
    title: Reactive Primitives
    details: Built-in signals, tasks, and forms for modern reactive applications
  - icon: 🛡️
    title: Type Safe
    details: Full TypeScript support with Result pattern for predictable error handling
  - icon: 📦
    title: Lightweight
    details: Core bundle < 10kb gzipped with zero runtime dependencies (except Zod)
---

## Quick Start

Install Kairo in your project:

```bash
npm install kairo
# or
bun add kairo
```

Create your first pipeline:

```typescript
import { pipeline, schema } from 'kairo'
import { z } from 'zod'

const UserSchema = schema(z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email()
}))

const getUserPipeline = pipeline('get-user')
  .input(schema(z.object({ id: z.number() })))
  .fetch('/api/users/:id')
  .validate(UserSchema)
  .map(user => user.name)

// Execute the pipeline
const result = await getUserPipeline.run({ id: 123 })

if (result.tag === 'Ok') {
  console.log('User name:', result.value) // ✅ Type-safe!
} else {
  console.error('Error:', result.error) // 🛡️ Handled gracefully
}
```

## Why Kairo?

### Problems We Solve

- **Chaotic error flows** in modern applications
- **Excessive glue code** between tools (fetch + validation + state + error handling)
- **Unpredictable behavior** from useEffect and try/catch patterns
- **Poor testability** of business logic mixed with UI concerns

### Solutions We Provide

- **Unified composition** - fetch + validation + transform + error handling unified
- **Predictable error modeling** - `Result<Err, Ok>` pattern avoids runtime throws
- **Lifecycle scoping** - concept of scoped pipelines for cleanup and reactive context
- **Enhanced debuggability** - `.trace()` makes logic observable and introspectable
- **Pure composability** - no hidden state, purely functional composition

## Core Philosophy

- **Framework-agnostic** composition over configuration
- **Immutability and purity** (inspired by Gleam)
- **Developer joy** through clarity and predictability
- **Testable, composable, and reactive** — but minimal