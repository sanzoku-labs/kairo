import { Result } from '../core/result'
import { pipeline } from '../core/pipeline'
import { workflow, workflowUtils, type WorkflowContext } from '../core/workflow'
import { workflowTesting } from '../core/workflow-testing'
import type {
  CreateUserRequest,
  User,
  WelcomeEmailRequest,
  CreateProfileRequest,
  Order,
  PaymentRequest,
  ShipmentRequest,
  NotificationRequest,
  MigrationInput,
  MigrationState,
  BatchRequest,
  MigrationItem,
  InsertResult,
  HealthStatus,
  HealthCheckResult,
} from './workflow-types'

// Example 1: Simple User Onboarding Workflow
export const userOnboardingWorkflow = workflow<CreateUserRequest, User>('user-onboarding', {
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
          // Simple validation that result has required fields
          if (!user.id || !user.name || !user.email) {
            throw new Error('Invalid user response from API')
          }
          return user
        })
    ),

    sendWelcome: workflowUtils.step(
      'sendWelcome',
      pipeline('welcome-email')
        .map((user: unknown): WelcomeEmailRequest => {
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
        .map((user: unknown): CreateProfileRequest => {
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
        // Simulate async cleanup work
        await new Promise(resolve => setTimeout(resolve, 1))
        console.log('User creation failed, cleaning up...', error)
        // Could perform cleanup here
      }),
    },
    rollback: {
      createUser: workflowUtils.rollback(async context => {
        // Simulate async rollback work
        await new Promise(resolve => setTimeout(resolve, 1))
        const user = context.stepResults.createUser as User
        if (user?.id) {
          console.log(`Rolling back user creation for ${user.id}`)
          // In a real scenario, you'd make a DELETE request here
        }
      }),
    },
  },
})

// Example 2: Order Processing Workflow with Conditionals
export const orderProcessingWorkflow = workflow<Order, { orderId: string; status: string }>(
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
          .map((order: unknown): PaymentRequest => {
            const orderObj = order as Order
            return {
              amount: orderObj.total,
              method: orderObj.paymentMethod,
              customerId: orderObj.customerId,
            }
          })
          .fetch('/api/payments/process')
      ),

      createShipment: workflowUtils.step(
        'createShipment',
        pipeline('create-shipment')
          .map((order: unknown): ShipmentRequest => {
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
          .map((order: unknown): NotificationRequest => {
            const orderObj = order as Order
            return {
              customerId: orderObj.customerId,
              orderId: orderObj.id,
              type: 'order_confirmed',
            }
          })
          .fetch('/api/notifications/send')
      ),

      expediteShipping: workflowUtils.step(
        'expediteShipping',
        pipeline('expedite-shipping').fetch('/api/shipping/expedite')
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
          // Simulate async notification work
          await new Promise(resolve => setTimeout(resolve, 1))
          console.log('Payment failed, notifying customer...', error)
          // Send payment failure notification
        }),
      },
    },
  }
)

// Example 3: Data Migration Workflow with Loops
export const dataMigrationWorkflow = workflow<MigrationInput, { migratedCount: number }>(
  'data-migration',
  {
    steps: {
      initMigration: workflowUtils.step(
        'initMigration',
        pipeline('init-migration').map((input: unknown): MigrationState => {
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
          .map((state: unknown): BatchRequest => {
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
        pipeline('transform-data').map((data: unknown): MigrationItem[] => {
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
        (result: unknown, context: WorkflowContext): Promise<Result<unknown, MigrationState>> => {
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
        1000
      ), // Max 1000 iterations as safety
    ],

    options: {
      timeout: 300000, // 5 minutes
      retries: 3,
    },
  }
)

// Example 4: API Health Check Workflow
export const healthCheckWorkflow = workflow<void, HealthCheckResult>('health-check', {
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
      (_input: unknown, context: WorkflowContext): Promise<Result<unknown, HealthCheckResult>> => {
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

// Example test suite for user onboarding workflow
export const userOnboardingTests = workflowTesting.createSuite(
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

// Example of using workflow assertions for testing
export const testWorkflowAssertions = async (): Promise<void> => {
  const testData: CreateUserRequest = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'testpass123',
  }

  // Test successful execution
  await workflowTesting
    .expect(userOnboardingWorkflow, testData)
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
        success: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
          createdAt: '2023-01-01',
        },
      },
    })
    .shouldCompleteWithin(10000)

  console.log('All workflow assertions passed!')
}

// Example load test
export const runLoadTest = async (): Promise<void> => {
  const testData: CreateUserRequest = {
    name: 'Load Test User',
    email: 'loadtest@example.com',
    password: 'loadtest123',
  }

  const mockedWorkflow = userOnboardingWorkflow.mock({
    createUser: {
      success: {
        id: '123',
        name: 'Load Test User',
        email: 'loadtest@example.com',
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

  const results = await workflowTesting.loadTest(mockedWorkflow, testData, {
    concurrency: 10,
    requests: 100,
    rampUpTimeMs: 1000,
  })

  console.log('Load Test Results:', results)
}
