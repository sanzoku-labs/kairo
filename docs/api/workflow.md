# Workflow API Reference

Workflows enable complex multi-step process orchestration with declarative configuration, automatic error handling, and comprehensive testing capabilities.

## Core Types

### Workflow Interface

```typescript
interface Workflow<TInput, TOutput> {
  readonly name: string
  readonly steps: Record<string, WorkflowStep>
  readonly flow: FlowDefinition
  readonly options: WorkflowOptions

  execute(input: TInput): Promise<Result<WorkflowError, TOutput>>
  mock(stepMocks: StepMocks): MockedWorkflow<TInput, TOutput>
  visualize(): WorkflowDiagram
}
```

### WorkflowStep

```typescript
interface WorkflowStep {
  name: string
  executor:
    | Pipeline<unknown, unknown>
    | ResourceMethod
    | ((input: unknown, context: WorkflowContext) => Promise<Result<unknown, unknown>>)
}
```

### FlowDefinition

```typescript
type FlowStep =
  | string // Sequential step
  | { parallel: string[] } // Parallel execution
  | { if: Condition; then: string; else?: string } // Conditional step
  | { loop: LoopCondition; do: string[] } // Loop execution

type FlowDefinition = FlowStep[]
```

## Creating Workflows

### Basic Workflow

```typescript
import { workflow, workflowUtils } from 'kairo'

const simpleWorkflow = workflow<Input, Output>('simple-workflow', {
  steps: {
    validate: workflowUtils.step('validate', validationPipeline),
    process: workflowUtils.step('process', processingPipeline),
    notify: workflowUtils.step('notify', notificationPipeline),
  },

  flow: ['validate', 'process', 'notify'],
})
```

### Parallel Execution

```typescript
const parallelWorkflow = workflow<Input, Output>('parallel-workflow', {
  steps: {
    validate: workflowUtils.step('validate', validationPipeline),
    fetchData: workflowUtils.step('fetchData', dataFetchPipeline),
    fetchConfig: workflowUtils.step('fetchConfig', configFetchPipeline),
    process: workflowUtils.step('process', processingPipeline),
  },

  flow: ['validate', { parallel: ['fetchData', 'fetchConfig'] }, 'process'],
})
```

### Conditional Flow

```typescript
const conditionalWorkflow = workflow<Order, OrderResult>('order-workflow', {
  steps: {
    validate: workflowUtils.step('validate', orderValidation),
    processPayment: workflowUtils.step('processPayment', paymentPipeline),
    expediteShipping: workflowUtils.step('expediteShipping', expeditePipeline),
    standardShipping: workflowUtils.step('standardShipping', standardPipeline),
  },

  flow: [
    'validate',
    'processPayment',
    {
      if: workflowUtils.condition((context: WorkflowContext) => {
        const order = context.stepResults.validate as Order
        return order.total > 1000
      }),
      then: 'expediteShipping',
      else: 'standardShipping',
    },
  ],
})
```

### Loop Execution

```typescript
const migrationWorkflow = workflow<MigrationInput, MigrationResult>('data-migration', {
  steps: {
    init: workflowUtils.step('init', initPipeline),
    fetchBatch: workflowUtils.step('fetchBatch', fetchPipeline),
    transformBatch: workflowUtils.step('transformBatch', transformPipeline),
    insertBatch: workflowUtils.step('insertBatch', insertPipeline),
    updateProgress: workflowUtils.step('updateProgress', progressPipeline),
  },

  flow: [
    'init',
    workflowUtils.loopWhile(
      (context: WorkflowContext) => {
        const state = context.stepResults.updateProgress as MigrationState
        return state.processedCount < state.totalRecords
      },
      ['fetchBatch', 'transformBatch', 'insertBatch', 'updateProgress']
    ),
  ],
})
```

## Error Handling

### Error Handlers

```typescript
const robustWorkflow = workflow<Input, Output>('robust-workflow', {
  steps: {
    validate: workflowUtils.step('validate', validationPipeline),
    createUser: workflowUtils.step('createUser', UserAPI.create),
    sendEmail: workflowUtils.step('sendEmail', emailPipeline),
  },

  flow: ['validate', 'createUser', 'sendEmail'],

  options: {
    onError: {
      // Retry with different step
      createUser: 'validateAndRetry',

      // Custom error handler
      sendEmail: workflowUtils.customErrorHandler(async (error, context) => {
        await logError(error, context)
        await notifyAdmins(error)
      }),
    },
  },
})
```

### Rollback Handlers

```typescript
const transactionalWorkflow = workflow<Input, Output>('transactional-workflow', {
  steps: {
    createUser: workflowUtils.step('createUser', UserAPI.create),
    createProfile: workflowUtils.step('createProfile', ProfileAPI.create),
    sendWelcome: workflowUtils.step('sendWelcome', emailPipeline),
  },

  flow: ['createUser', 'createProfile', 'sendWelcome'],

  options: {
    rollback: {
      createUser: workflowUtils.rollback(async context => {
        const user = context.stepResults.createUser as User
        if (user?.id) {
          await UserAPI.delete.run({ id: user.id })
        }
      }),

      createProfile: workflowUtils.rollback(async context => {
        const profile = context.stepResults.createProfile as Profile
        if (profile?.id) {
          await ProfileAPI.delete.run({ id: profile.id })
        }
      }),
    },
  },
})
```

## Testing Workflows

### Basic Testing

```typescript
import { workflowTesting } from 'kairo'

// Assertion-based testing
await workflowTesting.expect(userOnboardingWorkflow, testData).shouldSucceed()

await workflowTesting.expect(userOnboardingWorkflow, invalidData).shouldFail()

await workflowTesting.expect(userOnboardingWorkflow, testData).shouldCompleteWithin(5000)
```

### Testing with Mocks

```typescript
await workflowTesting
  .expect(userOnboardingWorkflow, testData)
  .withMocks({
    createUser: {
      success: { id: '123', name: 'Test User', email: 'test@example.com' },
      delay: 100,
    },
    sendWelcome: {
      success: { sent: true },
      probability: 0.9, // 90% success rate
    },
  })
  .shouldSucceed()
```

### Test Suites

```typescript
const testSuite = workflowTesting.createSuite('User Onboarding Tests', userOnboardingWorkflow, [
  workflowTesting.testCase('should onboard valid user', validUserData, {
    expectedOutput: expectedUser,
    stepMocks: {
      createUser: { success: mockUser },
      sendWelcome: { success: { sent: true } },
    },
  }),

  workflowTesting.testCase('should handle creation failure', userData, {
    stepMocks: {
      createUser: { failure: createUserError },
    },
    expectedError: { stepName: 'createUser' },
  }),
])

const results = await testSuite.run()
console.log(`Passed: ${results.passedTests}/${results.totalTests}`)
```

### Load Testing

```typescript
const loadResults = await workflowTesting.loadTest(
  userOnboardingWorkflow.mock({
    createUser: { success: mockUser },
    sendWelcome: { success: { sent: true } },
  }),
  testData,
  {
    concurrency: 10,
    requests: 100,
    rampUpTimeMs: 1000,
  }
)

console.log(`Throughput: ${loadResults.throughput} req/s`)
console.log(`Average latency: ${loadResults.averageLatency}ms`)
console.log(`Success rate: ${(loadResults.successfulRequests / loadResults.totalRequests) * 100}%`)
```

## Utility Functions

### workflowUtils

```typescript
// Create workflow steps
workflowUtils.step(name, executor)

// Create conditions
workflowUtils.condition((context: WorkflowContext) => boolean)

// Create loops
workflowUtils.loopWhile(condition, stepNames, maxIterations?)
workflowUtils.loopTimes(times, stepNames)

// Error handling
workflowUtils.retry(stepName)
workflowUtils.customErrorHandler(handler)
workflowUtils.rollback(handler)
```

## Workflow Context

The `WorkflowContext` provides access to execution state:

```typescript
interface WorkflowContext {
  stepResults: Record<string, unknown>
  currentStep: string
  executionId: string
  startTime: Date
  metadata: Record<string, unknown>
}
```

### Accessing Step Results

```typescript
const conditionalStep = {
  if: workflowUtils.condition((context: WorkflowContext) => {
    const user = context.stepResults.createUser as User
    const profile = context.stepResults.createProfile as Profile
    return user.isPremium && profile.isComplete
  }),
  then: 'sendPremiumWelcome',
  else: 'sendStandardWelcome',
}
```

## Advanced Patterns

### Nested Workflows

```typescript
const subWorkflow = workflow<SubInput, SubOutput>('sub-workflow', {
  steps: {
    /* ... */
  },
  flow: [
    /* ... */
  ],
})

const mainWorkflow = workflow<Input, Output>('main-workflow', {
  steps: {
    prepare: workflowUtils.step('prepare', preparePipeline),
    subprocess: workflowUtils.step('subprocess', async (input, context) => {
      return subWorkflow.execute(input as SubInput)
    }),
    finalize: workflowUtils.step('finalize', finalizePipeline),
  },

  flow: ['prepare', 'subprocess', 'finalize'],
})
```

### Dynamic Flow Decisions

```typescript
const dynamicWorkflow = workflow<Input, Output>('dynamic-workflow', {
  steps: {
    analyze: workflowUtils.step('analyze', analysisPipeline),
    pathA: workflowUtils.step('pathA', pathAPipeline),
    pathB: workflowUtils.step('pathB', pathBPipeline),
    pathC: workflowUtils.step('pathC', pathCPipeline),
  },

  flow: [
    'analyze',
    {
      if: workflowUtils.condition(context => {
        const analysis = context.stepResults.analyze as Analysis
        return analysis.complexity === 'high'
      }),
      then: 'pathA',
      else: {
        if: workflowUtils.condition(context => {
          const analysis = context.stepResults.analyze as Analysis
          return analysis.priority === 'urgent'
        }),
        then: 'pathB',
        else: 'pathC',
      },
    },
  ],
})
```

## Best Practices

1. **Keep Steps Pure**: Each step should be a pure function when possible
2. **Handle Errors Gracefully**: Always define error handlers for critical steps
3. **Use Descriptive Names**: Make workflow and step names self-documenting
4. **Test Thoroughly**: Use mocks to test different scenarios and edge cases
5. **Monitor Performance**: Use load testing to ensure workflows scale
6. **Design for Rollback**: Critical operations should have rollback handlers
7. **Leverage Parallelism**: Run independent steps in parallel for better performance
