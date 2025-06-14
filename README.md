# Kairo

> A functional, composable TypeScript library that eliminates glue code

[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://sovanaryththorng.github.io/kairo/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Kairo is a **framework-agnostic**, functional and composable TypeScript library designed to eliminate glue code, clarify application logic, and provide a consistent developer experience across frontend and backend environments.

## Quick Start

```bash
npm install kairo
```

```typescript
import { pipeline, schema } from 'kairo'
import { z } from 'zod'

const getUserPipeline = pipeline('get-user')
  .input(schema(z.object({ id: z.number() })))
  .fetch('/api/users/:id')
  .validate(schema(z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email()
  })))
  .map(user => user.name)

// Execute the pipeline
const result = await getUserPipeline.run({ id: 123 })

if (result.tag === 'Ok') {
  console.log('User name:', result.value) // ✅ Type-safe!
} else {
  console.error('Error:', result.error) // 🛡️ Handled gracefully
}
```

## Key Features

- 🔧 **Framework Agnostic** - Works with React, Node, Bun, and any TypeScript environment
- ⚡ **Functional & Composable** - Inspired by Gleam with immutable, pure functions
- 🎯 **Developer Joy** - Eliminate boilerplate and improve debugging experience
- 🔄 **Reactive Primitives** - Built-in signals, tasks, and forms
- 🛡️ **Type Safe** - Full TypeScript support with Result pattern for error handling
- 📦 **Lightweight** - Core bundle < 10kb gzipped

## Core Concepts

### Result Pattern
```typescript
type Result<E, T> = 
  | { tag: 'Ok', value: T }
  | { tag: 'Err', error: E }
```

### Pipelines
```typescript
const pipeline = pipeline('example')
  .input(schema)      // Validate input
  .fetch('/api/data') // HTTP request
  .validate(schema)   // Validate response
  .map(transform)     // Transform data
  .trace('completed') // Debug tracing
```

### Reactive State
```typescript
const userSignal = signal(null)
const userTask = task(getUserPipeline)
const userForm = form(UserSchema, { onSubmit: createUserPipeline })
```

## Documentation

Visit our [documentation site](https://sovanaryththorng.github.io/kairo/) for:

- 📖 [Getting Started Guide](https://sovanaryththorng.github.io/kairo/guide/getting-started)
- 🔧 [API Reference](https://sovanaryththorng.github.io/kairo/api/)
- 💡 [Examples](https://sovanaryththorng.github.io/kairo/examples/)

## Development

```bash
# Install dependencies
bun install

# Run tests
bun run test

# Build the library
bun run build

# Run documentation locally
bun run docs:dev
```

## License

MIT © [Sovanaryth THORNG](https://github.com/sovanaryththorng)