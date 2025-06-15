# Kairo

> Declarative application development platform - from API contracts to complex business processes

[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://sovanaryththorng.github.io/kairo/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Kairo transforms application development through declarative patterns with a **Three-Pillar Architecture**:

1. **Resources** → Eliminate API service boilerplate with contract testing
2. **Pipelines** → Compose business logic functionally
3. **Workflows** → Orchestrate complex multi-step processes

**Framework-agnostic** by design - works with React, Vue, Node, Bun, and any TypeScript environment without requiring adapters.

## Quick Start

```bash
npm install kairo
```

### 1. Resources - Eliminate Service Boilerplate

```typescript
import { resource, schema } from 'kairo'
import { z } from 'zod'

// BEFORE: Repetitive service classes
class UserService {
  async getUser(id: string): Promise<User> {
    // ... repetitive fetch, validation, error handling
  }
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

// Usage with full type safety
const result = await UserAPI.get.run({ id: '123' })
```

### 2. Pipelines - Compose Business Logic

```typescript
// BEFORE: Complex imperative logic with error handling
const processOrder = async orderData => {
  try {
    const validated = OrderSchema.parse(orderData)
    // ... complex business logic with nested try/catch
  } catch (error) {
    // ... error handling
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

// Execute with Result pattern
const result = await processOrder.run(orderData)
```

### 3. Workflows - Orchestrate Complex Processes

```typescript
// BEFORE: Complex process management with manual error handling
const onboardUser = async userData => {
  try {
    const validated = await validateUser(userData)
    const user = await createUser(validated)

    // Parallel processes with manual coordination
    await Promise.all([sendWelcomeEmail(user), setupProfile(user)])

    return user
  } catch (error) {
    // Manual rollback and cleanup
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
```

## Key Features

- 🔧 **Framework Agnostic** - Works with React, Vue, Node, Bun, and any TypeScript environment
- 🏗️ **Three-Pillar Architecture** - Resources, Pipelines, and Workflows working together
- ⚡ **Functional & Composable** - Inspired by Gleam with immutable, pure functions
- 🎯 **Developer Joy** - Eliminate boilerplate and improve debugging experience
- 🛡️ **Type Safe** - Full TypeScript support with Result pattern for error handling
- 🔄 **Process Orchestration** - Complex workflows with parallel execution, conditionals, and loops
- 🧪 **Contract Testing** - API verification and mock generation for reliable integrations
- 🎲 **Business Rules** - Centralized, declarative validation logic
- 📦 **Lightweight** - Core bundle < 20kb gzipped

## Core Concepts

### Result Pattern - Error Handling Without Exceptions

```typescript
type Result<E, T> = { tag: 'Ok'; value: T } | { tag: 'Err'; error: E }

// Pattern matching for clean error handling
Result.match(result, {
  Ok: user => console.log('Success:', user),
  Err: error => console.error('Error:', error),
})
```

### Resources - Declarative API Definitions

```typescript
const api = resource('api', {
  getUser: {
    path: '/users/:id',
    params: UserParamsSchema,
    response: UserSchema,
  },
  createUser: {
    path: '/users',
    method: 'POST',
    body: CreateUserSchema,
    response: UserSchema,
  },
})
```

### Pipelines - Business Logic Composition

```typescript
const businessWorkflow = pipeline('workflow')
  .input(InputSchema)
  .validate(businessRules)
  .fetch('/api/process')
  .map(transformData)
  .trace('completed')
```

### Workflows - Process Orchestration

```typescript
const complexWorkflow = workflow<Input, Output>('complex-process', {
  steps: {
    validate: workflowUtils.step('validate', validationPipeline),
    process: workflowUtils.step('process', processingPipeline),
    notify: workflowUtils.step('notify', notificationPipeline),
    cleanup: workflowUtils.step('cleanup', cleanupPipeline),
  },

  flow: [
    'validate',
    'process',
    {
      if: workflowUtils.condition(context => shouldNotify(context)),
      then: 'notify',
    },
    'cleanup',
  ],

  options: {
    timeout: 60000,
    onError: {
      process: workflowUtils.customErrorHandler(async (error, context) => {
        await logError(error, context)
        await rollbackChanges(context)
      }),
    },
  },
})
```

### Testing & Mocking

```typescript
// Contract testing for resources
await UserAPI.contract().verify('https://api.staging.com')

// Workflow testing with mocks
const testResult = await workflowTesting
  .expect(userOnboardingWorkflow, testData)
  .withMocks({
    createUser: { success: mockUser },
    sendWelcome: { success: { sent: true } },
  })
  .shouldSucceed()

// Load testing
const loadResults = await workflowTesting.loadTest(workflow, input, {
  concurrency: 10,
  requests: 100,
})
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
