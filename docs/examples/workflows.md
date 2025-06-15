# Workflow Examples

This guide showcases practical workflow implementations for common business scenarios.

## User Onboarding Workflow

A complete user registration and setup process with parallel execution and rollback capabilities.

```typescript
import { workflow, workflowUtils, pipeline } from 'kairo'

const userOnboardingWorkflow = workflow<CreateUserRequest, User>('user-onboarding', {
  steps: {
    validate: workflowUtils.step(
      'validate',
      pipeline('validate-user')
        .map((input: unknown) => {
          const userInput = input as CreateUserRequest
          if (!userInput.name || !userInput.email || !userInput.password) {
            throw new Error('Name, email, and password are required')
          }
          return userInput
        })
        .trace('validating user input')
    ),

    createUser: workflowUtils.step(
      'createUser',
      pipeline('create-user')
        .fetch('/api/users', { method: 'POST' })
        .map((result: unknown) => {
          const user = result as User
          if (!user.id || !user.name || !user.email) {
            throw new Error('Invalid user response from API')
          }
          return user
        })
    ),

    sendWelcome: workflowUtils.step(
      'sendWelcome',
      pipeline('welcome-email')
        .map((user: unknown) => {
          const userObj = user as User
          return {
            email: userObj.email,
            name: userObj.name,
          }
        })
        .fetch('/api/email/welcome', { method: 'POST' })
    ),

    setupProfile: workflowUtils.step(
      'setupProfile',
      pipeline('setup-profile')
        .map((user: unknown) => {
          const userObj = user as User
          return {
            userId: userObj.id,
            preferences: {
              theme: 'light',
              notifications: true,
            },
          }
        })
        .fetch('/api/profiles', { method: 'POST' })
    ),
  },

  flow: [
    'validate',
    'createUser',
    {
      parallel: ['sendWelcome', 'setupProfile'],
    },
  ],

  options: {
    timeout: 30000,
    onError: {
      createUser: workflowUtils.customErrorHandler(async (error, _context) => {
        console.log('User creation failed, cleaning up...', error)
        // Could perform cleanup here
      }),
    },
    rollback: {
      createUser: workflowUtils.rollback(async context => {
        const user = context.stepResults.createUser as User
        if (user?.id) {
          console.log(`Rolling back user creation for ${user.id}`)
          // In a real scenario, you'd make a DELETE request here
        }
      }),
    },
  },
})

// Usage
const result = await userOnboardingWorkflow.execute({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securepass123',
})

if (Result.isOk(result)) {
  console.log('User onboarded successfully:', result.value)
} else {
  console.error('Onboarding failed:', result.error)
}
```

## Order Processing Workflow

An e-commerce order processing workflow with conditional logic for expedited shipping.

```typescript
const orderProcessingWorkflow = workflow<Order, { orderId: string; status: string }>(
  'order-processing',
  {
    steps: {
      validateOrder: workflowUtils.step(
        'validateOrder',
        pipeline('validate-order').map((order: unknown) => {
          const orderObj = order as Order
          if (orderObj.total <= 0) throw new Error('Invalid order total')
          return orderObj
        })
      ),

      checkInventory: workflowUtils.step(
        'checkInventory',
        pipeline('inventory-check')
          .map((order: unknown) => (order as Order).items)
          .fetch('/api/inventory/check')
      ),

      processPayment: workflowUtils.step(
        'processPayment',
        pipeline('payment-processing')
          .map((order: unknown) => {
            const orderObj = order as Order
            return {
              amount: orderObj.total,
              method: orderObj.paymentMethod,
              customerId: orderObj.customerId,
            }
          })
          .fetch('/api/payments/process')
      ),

      expediteShipping: workflowUtils.step(
        'expediteShipping',
        pipeline('expedite-shipping').fetch('/api/shipping/expedite')
      ),

      createShipment: workflowUtils.step(
        'createShipment',
        pipeline('create-shipment')
          .map((order: unknown) => {
            const orderObj = order as Order
            return {
              orderId: orderObj.id,
              address: orderObj.shippingAddress,
              items: orderObj.items,
            }
          })
          .fetch('/api/shipping/create')
      ),

      sendNotification: workflowUtils.step(
        'sendNotification',
        pipeline('notification')
          .map((order: unknown) => {
            const orderObj = order as Order
            return {
              customerId: orderObj.customerId,
              orderId: orderObj.id,
              type: 'order_confirmed',
            }
          })
          .fetch('/api/notifications/send')
      ),
    },

    flow: [
      'validateOrder',
      'checkInventory',
      'processPayment',
      {
        if: workflowUtils.condition((context: WorkflowContext) => {
          const order = context.stepResults.validateOrder as Order
          return order.total > 1000 // Expedite expensive orders
        }),
        then: 'expediteShipping',
      },
      'createShipment',
      'sendNotification',
    ],

    options: {
      timeout: 60000,
      onError: {
        processPayment: workflowUtils.customErrorHandler(async (error, _context) => {
          console.log('Payment failed, notifying customer...', error)
          // Send payment failure notification
        }),
      },
    },
  }
)
```

## Data Migration Workflow

A batch data migration workflow with loop execution and progress tracking.

```typescript
const dataMigrationWorkflow = workflow<MigrationInput, { migratedCount: number }>(
  'data-migration',
  {
    steps: {
      initMigration: workflowUtils.step(
        'initMigration',
        pipeline('init-migration').map((input: unknown) => {
          const migrationInput = input as MigrationInput
          return {
            ...migrationInput,
            processedCount: 0,
            currentBatch: 0,
          }
        })
      ),

      fetchBatch: workflowUtils.step(
        'fetchBatch',
        pipeline('fetch-batch')
          .map((state: unknown) => {
            const migrationState = state as MigrationState
            return {
              offset: migrationState.currentBatch * migrationState.batchSize,
              limit: migrationState.batchSize,
            }
          })
          .fetch('/api/data/fetch')
      ),

      transformData: workflowUtils.step(
        'transformData',
        pipeline('transform-data').map((data: unknown) => {
          const dataArray = data as unknown[]
          return Array.isArray(dataArray)
            ? dataArray.map((item, index) => ({
                id: `item-${index}`,
                data: item,
                migrated: true,
                migratedAt: new Date().toISOString(),
              }))
            : []
        })
      ),

      insertBatch: workflowUtils.step(
        'insertBatch',
        pipeline('insert-batch').fetch('/api/data/insert', {
          method: 'POST',
        })
      ),

      updateProgress: workflowUtils.step(
        'updateProgress',
        (result: unknown, context: WorkflowContext) => {
          const insertResult = result as InsertResult
          const prevState = (context.stepResults.initMigration ||
            context.stepResults.updateProgress ||
            {}) as MigrationState
          const newState: MigrationState = {
            ...prevState,
            processedCount: (prevState.processedCount || 0) + (insertResult.insertedCount || 0),
            currentBatch: (prevState.currentBatch || 0) + 1,
          }
          return Promise.resolve(Result.Ok(newState))
        }
      ),
    },

    flow: [
      'initMigration',
      workflowUtils.loopWhile(
        (context: WorkflowContext) => {
          const state = (context.stepResults.updateProgress ||
            context.stepResults.initMigration ||
            {}) as MigrationState
          return (state.processedCount || 0) < (state.totalRecords || 0)
        },
        ['fetchBatch', 'transformData', 'insertBatch', 'updateProgress'],
        1000 // Max 1000 iterations as safety
      ),
    ],

    options: {
      timeout: 300000, // 5 minutes
      retries: 3,
    },
  }
)
```

## Health Check Workflow

A parallel health checking system for monitoring multiple services.

```typescript
const healthCheckWorkflow = workflow<void, HealthCheckResult>('health-check', {
  steps: {
    checkDatabase: workflowUtils.step(
      'checkDatabase',
      pipeline('db-health')
        .fetch('/health/database')
        .map((result: unknown) => (result as HealthStatus).status === 'healthy')
    ),

    checkRedis: workflowUtils.step(
      'checkRedis',
      pipeline('redis-health')
        .fetch('/health/redis')
        .map((result: unknown) => (result as HealthStatus).status === 'healthy')
    ),

    checkExternalAPI: workflowUtils.step(
      'checkExternalAPI',
      pipeline('external-api-health')
        .fetch('/health/external-api')
        .map((result: unknown) => (result as HealthStatus).status === 'healthy')
    ),

    checkFileSystem: workflowUtils.step(
      'checkFileSystem',
      pipeline('fs-health')
        .fetch('/health/filesystem')
        .map((result: unknown) => (result as HealthStatus).status === 'healthy')
    ),

    aggregateResults: workflowUtils.step(
      'aggregateResults',
      (_input: unknown, context: WorkflowContext) => {
        const services = {
          database: context.stepResults.checkDatabase as boolean,
          redis: context.stepResults.checkRedis as boolean,
          externalAPI: context.stepResults.checkExternalAPI as boolean,
          fileSystem: context.stepResults.checkFileSystem as boolean,
        }

        const allHealthy = Object.values(services).every(Boolean)
        const status = allHealthy ? 'healthy' : 'unhealthy'

        return Promise.resolve(Result.Ok({ status, services }))
      }
    ),
  },

  flow: [
    {
      parallel: ['checkDatabase', 'checkRedis', 'checkExternalAPI', 'checkFileSystem'],
    },
    'aggregateResults',
  ],

  options: {
    timeout: 10000,
  },
})
```

## Testing Examples

### Complete Test Suite

```typescript
import { workflowTesting } from 'kairo'

const userOnboardingTests = workflowTesting.createSuite(
  'User Onboarding Tests',
  userOnboardingWorkflow,
  [
    workflowTesting.testCase(
      'should successfully onboard valid user',
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securepass123',
        country: 'CA',
        age: 25,
      },
      {
        stepMocks: {
          ...workflowTesting.mockStep('createUser', {
            success: {
              id: '123',
              name: 'John Doe',
              email: 'john@example.com',
              createdAt: '2023-01-01',
            },
          }),
          ...workflowTesting.mockStep('sendWelcome', {
            success: { success: true },
          }),
          ...workflowTesting.mockStep('setupProfile', {
            success: {
              id: 'profile-123',
              userId: '123',
              preferences: { theme: 'light', notifications: true },
            },
          }),
        },
      }
    ),

    workflowTesting.testCase(
      'should handle user creation failure',
      {
        name: 'Bob Smith',
        email: 'bob@example.com',
        password: 'password123',
      },
      {
        stepMocks: {
          ...workflowTesting.mockStep('createUser', {
            failure: {
              code: 'RESOURCE_ERROR',
              message: 'Email already exists',
              timestamp: Date.now(),
              context: {},
            },
            probability: 0, // Always fail
          }),
        },
        expectedError: {
          stepName: 'createUser',
          code: 'WORKFLOW_ERROR',
        },
      }
    ),
  ]
)

// Run the test suite
const results = await userOnboardingTests.run()
console.log(`Passed: ${results.passedTests}/${results.totalTests}`)
console.log(`Success rate: ${results.summary.successRate}%`)
```

### Assertion-Based Testing

```typescript
// Test successful execution
await workflowTesting
  .expect(userOnboardingWorkflow, {
    name: 'Test User',
    email: 'test@example.com',
    password: 'testpass123',
  })
  .withMocks({
    createUser: {
      success: {
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: '2023-01-01',
      },
    },
    sendWelcome: { success: { success: true } },
    setupProfile: {
      success: {
        id: 'profile-123',
        userId: '123',
        preferences: { theme: 'light', notifications: true },
      },
    },
  })
  .shouldSucceed()

// Test timeout behavior
await workflowTesting
  .expect(userOnboardingWorkflow, testData)
  .withMocks({
    createUser: {
      delay: 5000,
      success: mockUser,
    },
  })
  .shouldCompleteWithin(10000)
```

### Load Testing

```typescript
const loadTestResults = await workflowTesting.loadTest(
  userOnboardingWorkflow.mock({
    createUser: { success: mockUser },
    sendWelcome: { success: { success: true } },
    setupProfile: { success: mockProfile },
  }),
  {
    name: 'Load Test User',
    email: 'loadtest@example.com',
    password: 'loadtest123',
  },
  {
    concurrency: 10,
    requests: 100,
    rampUpTimeMs: 1000,
  }
)

console.log('Load Test Results:', {
  throughput: `${loadTestResults.throughput.toFixed(2)} req/s`,
  averageLatency: `${loadTestResults.averageLatency.toFixed(2)}ms`,
  successRate: `${((loadTestResults.successfulRequests / loadTestResults.totalRequests) * 100).toFixed(2)}%`,
  totalRequests: loadTestResults.totalRequests,
  errors: loadTestResults.errors.length,
})
```

## Best Practices

### 1. Step Design

```typescript
// ✅ Good: Pure, testable step
const validateStep = workflowUtils.step(
  'validate',
  pipeline('validate').map((input: unknown) => {
    const data = input as UserData
    if (!data.email) throw new Error('Email required')
    return data
  })
)

// ❌ Avoid: Side effects in step definition
const badStep = workflowUtils.step('bad', async input => {
  console.log('Processing...') // Side effect
  await someGlobalAction() // Side effect
  return Result.Ok(input)
})
```

### 2. Error Handling

```typescript
// ✅ Comprehensive error handling
const robustWorkflow = workflow('robust', {
  steps: {
    /* ... */
  },
  flow: [
    /* ... */
  ],
  options: {
    timeout: 30000,
    onError: {
      criticalStep: workflowUtils.customErrorHandler(async (error, context) => {
        await logError(error, context)
        await notifyTeam(error)
        await cleanupResources(context)
      }),
    },
    rollback: {
      createResource: workflowUtils.rollback(async context => {
        const resource = context.stepResults.createResource
        if (resource?.id) {
          await deleteResource(resource.id)
        }
      }),
    },
  },
})
```

### 3. Testing Strategy

```typescript
// Test different scenarios
const testCases = [
  // Happy path
  workflowTesting.testCase('success case', validInput, {
    stepMocks: { step1: { success: expectedOutput } },
  }),

  // Error cases
  workflowTesting.testCase('network failure', validInput, {
    stepMocks: { step1: { failure: networkError } },
    expectedError: { stepName: 'step1' },
  }),

  // Edge cases
  workflowTesting.testCase('timeout scenario', validInput, {
    stepMocks: { step1: { delay: 10000, success: output } },
    timeout: 5000,
    expectedError: { message: 'timeout' },
  }),
]
```

These examples demonstrate the power and flexibility of Kairo's workflow system for orchestrating complex business processes with proper error handling, testing, and observability.
