---
layout: home

hero:
  name: 'Kairo'
  text: 'Declarative Application Platform'
  tagline: 'From API contracts to complex business processes'
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
    title: Three-Pillar Architecture
    details: Resources for APIs, Pipelines for logic, Workflows for process orchestration
  - icon: 🔄
    title: Process Orchestration
    details: Complex workflows with parallel execution, conditionals, loops, and rollback
  - icon: 🔧
    title: Framework Agnostic
    details: Works seamlessly across React, Vue, Node, Bun, and any TypeScript environment
  - icon: ⚡
    title: Functional & Composable
    details: Inspired by Gleam - immutable, pure functions that compose elegantly
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

## Pillar 3: Workflows - Orchestrate Complex Processes

```typescript
// BEFORE: Complex process management with manual coordination
const onboardUser = async userData => {
  try {
    const validated = await validateUser(userData)
    const user = await createUser(validated)

    // Manual parallel coordination
    const [emailResult, profileResult] = await Promise.allSettled([
      sendWelcomeEmail(user),
      setupProfile(user),
    ])

    // Manual error handling and rollback
    if (emailResult.status === 'rejected') {
      // What do we do? How do we clean up?
    }

    return user
  } catch (error) {
    // Manual cleanup
    if (user?.id) await deleteUser(user.id)
    throw error
  }
}

// AFTER: Declarative workflow orchestration
const userOnboardingWorkflow = workflow<CreateUserRequest, User>('user-onboarding', {
  steps: {
    validate: workflowUtils.step('validate', validateUserPipeline),
    createUser: workflowUtils.step('createUser', UserAPI.create),
    sendWelcome: workflowUtils.step('sendWelcome', welcomeEmailPipeline),
    setupProfile: workflowUtils.step('setupProfile', profileCreationPipeline),
  },

  flow: ['validate', 'createUser', { parallel: ['sendWelcome', 'setupProfile'] }],

  options: {
    timeout: 30000,
    onError: {
      createUser: workflowUtils.rollback(async context => {
        const user = context.stepResults.createUser as User
        if (user?.id) await UserAPI.delete.run({ id: user.id })
      }),
    },
  },
})

// Execute with automatic error handling and rollback
const result = await userOnboardingWorkflow.execute(userData)

// Testing with mocks
await workflowTesting
  .expect(userOnboardingWorkflow, testData)
  .withMocks({
    createUser: { success: mockUser },
    sendWelcome: { success: { sent: true } },
  })
  .shouldSucceed()
```

## Why Kairo?

### Problems We Solve

1. **Service Layer Repetition** - Stop writing the same fetch + validation + error handling code
2. **Complex Business Logic** - Eliminate nested try/catch and make workflows readable
3. **Process Orchestration** - Manual coordination of multi-step processes with error handling
4. **Framework Lock-in** - Build business logic that works across any framework
5. **Poor Error Handling** - Replace runtime exceptions with predictable Result types

### Solutions We Provide

- **Declarative Resources** - API definitions with contract testing and mock generation
- **Composable Pipelines** - Business logic workflows that are readable and testable
- **Workflow Orchestration** - Complex processes with parallel execution, conditionals, and rollback
- **Result Pattern** - Predictable error modeling without runtime throws
- **Framework Agnostic** - No framework adapters needed, pure TypeScript
- **Enhanced Testing** - Built-in testing utilities, mocking, and load testing

## Core Philosophy

- **Simple by default, full control available**
- **Explicit and transparent** (no hidden magic)
- **Type inference that always works**
- **Progressive disclosure** (80/20 rule)
- **Framework-agnostic** composition over configuration
