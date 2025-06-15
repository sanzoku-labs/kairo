---
layout: home

hero:
  name: 'Kairo'
  text: 'Framework-Agnostic TypeScript Library'
  tagline: 'Eliminate service repetition and compose business logic elegantly'
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
  - icon: 🏗️
    title: Two-Pillar Architecture
    details: Resources eliminate service layer repetition, Pipelines compose business logic
  - icon: 🔧
    title: Framework Agnostic
    details: Works seamlessly across React, Vue, Node, Bun, and any TypeScript environment
  - icon: ⚡
    title: Functional & Composable
    details: Inspired by Gleam - immutable, pure functions that compose elegantly
  - icon: 🎯
    title: Developer Joy
    details: Eliminate boilerplate, improve debugging, and make testing pleasant
  - icon: 🛡️
    title: Type Safe
    details: Full TypeScript support with Result pattern for predictable error handling
  - icon: 🧪
    title: Contract Testing
    details: Verify API contracts, generate mocks, and ensure reliability across environments
---

## Quick Start

Install Kairo in your project:

```bash
npm install kairo
# or
bun add kairo
```

## Pillar 1: Resources - Eliminate Service Repetition

```typescript
import { resource, schema } from 'kairo'
import { z } from 'zod'

// BEFORE: Repetitive service boilerplate
class UserService {
  async getUser(id: string): Promise<User> {
    try {
      const response = await fetch(`/api/users/${id}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      return UserSchema.parse(data)
    } catch (error) {
      console.error('Error fetching user:', error)
      throw error
    }
  }
  // ... repeat for create, update, delete
}

// AFTER: Declarative resource
const UserAPI = resource('users', {
  get: {
    path: '/users/:id',
    params: z.object({ id: z.string() }),
    response: UserSchema,
  },
  create: {
    path: '/users',
    method: 'POST',
    body: CreateUserSchema,
    response: UserSchema,
  },
})

// Usage: await UserAPI.get.run({ id: '123' })

// Contract Testing & Mocking
const result = await UserAPI.contract().verify('https://api.staging.com')
const mocked = UserAPI.mock({
  get: { success: mockUser, delay: 50 },
})
```

## Pillar 2: Pipelines - Compose Business Logic

```typescript
// BEFORE: Complex business logic mess
const processOrder = async orderData => {
  try {
    const validated = OrderSchema.parse(orderData)

    if (validated.amount > 1000) {
      const approval = await manualApproval(validated)
      if (!approval) throw new Error('Not approved')
    }

    const inventory = await checkInventory(validated.items)
    if (!inventory.available) throw new Error('Out of stock')

    const pricing = calculateDiscount(validated, inventory.pricing)
    const payment = await processPayment(pricing)

    return transformOrderResult(payment)
  } catch (error) {
    logError(error)
    throw error
  }
}

// AFTER: Declarative pipeline
const processOrder = pipeline('process-order')
  .input(OrderSchema)
  .validate(requiresApproval)
  .fetch('/api/inventory/check')
  .map(calculateDiscount)
  .fetch('/api/payment/process')
  .map(transformOrderResult)
  .trace('order-processing')
```

## Why Kairo?

### Problems We Solve

1. **Service Layer Repetition** - Stop writing the same fetch + validation + error handling code
2. **Complex Business Logic** - Eliminate nested try/catch and make workflows readable
3. **Framework Lock-in** - Build business logic that works across any framework
4. **Poor Error Handling** - Replace runtime exceptions with predictable Result types

### Solutions We Provide

- **Declarative Resources** - API definitions that generate type-safe methods
- **Composable Pipelines** - Business logic workflows that are readable and testable
- **Result Pattern** - Predictable error modeling without runtime throws
- **Framework Agnostic** - No framework adapters needed, pure TypeScript
- **Enhanced Debugging** - Built-in tracing and introspection

## Core Philosophy

- **Simple by default, full control available**
- **Explicit and transparent** (no hidden magic)
- **Type inference that always works**
- **Progressive disclosure** (80/20 rule)
- **Framework-agnostic** composition over configuration
