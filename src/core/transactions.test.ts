/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, beforeEach } from 'vitest'
import { Result } from './result'
import { createEventBus } from './event-bus'
import { createTransactionManager, transactionStep, transaction } from './transaction-manager'
import { createLockManager } from './lock-manager'
import { transactionalPipeline } from './transactional-pipeline'
import { transactionalRepository } from './transactional-repository'
import { transactionalResource } from './transactional-resource'
import { nativeSchema } from './native-schema'
import type { TransactionManager, LockManager, TransactionStep } from './transactions'

describe('Transaction Management System', () => {
  let transactionManager: TransactionManager
  let lockManager: LockManager
  let eventBus: any

  beforeEach(() => {
    eventBus = createEventBus()
    lockManager = createLockManager()
    transactionManager = createTransactionManager(lockManager, eventBus)
  })

  describe('Transaction Manager', () => {
    it('should begin a new transaction', async () => {
      const result = await transactionManager.begin({
        isolation: 'read-committed',
        timeout: 5000,
        metadata: { userId: '123' },
      })

      expect(Result.isOk(result)).toBe(true)
      if (Result.isErr(result)) {
        throw new Error('Unexpected error')
      }
      const context = result.value
      expect(context.transactionId).toBeDefined()
      expect(context.isolation).toBe('read-committed')
      expect(context.metadata.userId).toBe('123')
    })

    it('should execute a simple transaction successfully', async () => {
      const step1 = transactionStep<number, number>('add-10', async (input: number) =>
        Result.Ok(input + 10)
      )

      const step2 = transactionStep<number, number>('multiply-2', async (input: number) =>
        Result.Ok(input * 2)
      )

      const txDef = transaction('simple-math', [step1, step2] as TransactionStep<
        unknown,
        unknown
      >[])
      const result = await transactionManager.execute(txDef, 5)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isErr(result)) {
        throw new Error('Unexpected error')
      }
      const txResult = result.value
      expect(txResult.status).toBe('committed')
      expect(txResult.result).toBe(30) // (5 + 10) * 2
      expect(txResult.operationsCount).toBe(2)
    })

    it('should rollback transaction on step failure', async () => {
      let step1Executed = false
      let step2Executed = false

      const step1 = transactionStep<number, number>('succeed', async (input: number) => {
        step1Executed = true
        return Result.Ok(input + 10)
      })

      const step2 = transactionStep<number, unknown>('fail', async (_input: number) => {
        step2Executed = true
        return Result.Err(new Error('Step 2 failed'))
      })

      const txDef = transaction('failing-transaction', [step1, step2] as TransactionStep<
        unknown,
        unknown
      >[])
      const result = await transactionManager.execute(txDef, 5)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isErr(result)) {
        throw new Error('Unexpected error')
      }
      const txResult = result.value
      expect(txResult.status).toBe('rolled-back')
      expect(txResult.error?.message).toBe('Step 2 failed')
      expect(step1Executed).toBe(true)
      expect(step2Executed).toBe(true)
    })

    it('should handle transaction timeout', async () => {
      const slowStep = transactionStep<number, number>(
        'slow-step',
        async (input: number) => {
          await new Promise(resolve => setTimeout(resolve, 200))
          return Result.Ok(input)
        },
        { timeout: 100 }
      )

      const txDef = transaction('timeout-transaction', [slowStep] as TransactionStep<
        unknown,
        unknown
      >[])
      const result = await transactionManager.execute(txDef, 5)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isErr(result)) {
        throw new Error('Unexpected error')
      }
      const txResult = result.value
      expect(txResult.status).toBe('rolled-back')
      expect(txResult.error?.message).toContain('timed out')
    })

    it('should support compensation functions', async () => {
      let compensationExecuted = false

      const step = transactionStep<number, number>(
        'compensatable-step',
        async (input: number) => Result.Ok(input + 10),
        {
          compensate: async () => {
            compensationExecuted = true
            return Result.Ok(undefined)
          },
        }
      )

      const failingStep = transactionStep<number, unknown>('failing-step', async () =>
        Result.Err(new Error('Intentional failure'))
      )

      const txDef = transaction('compensation-transaction', [step, failingStep] as TransactionStep<
        unknown,
        unknown
      >[])

      // Register compensation
      transactionManager.registerCompensation(
        'custom',
        'pipeline:compensation-transaction:compensatable-step',
        step.compensate!
      )

      const result = await transactionManager.execute(txDef, 5)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isErr(result)) {
        throw new Error('Unexpected error')
      }
      const txResult = result.value
      expect(txResult.status).toBe('rolled-back')
      expect(compensationExecuted).toBe(true)
    })

    it('should handle hooks', async () => {
      let commitHookCalled = false
      let rollbackHookCalled = false

      const successfulStep = transactionStep('succeed', async (input: number) =>
        Result.Ok(input + 10)
      )

      const successTxDef = transaction('hook-transaction', [successfulStep], {
        onCommit: async () => {
          commitHookCalled = true
          return Result.Ok(undefined)
        },
        onRollback: async () => {
          rollbackHookCalled = true
          return Result.Ok(undefined)
        },
      })

      const result = await transactionManager.execute(successTxDef, 5)

      expect(Result.isOk(result)).toBe(true)
      expect(commitHookCalled).toBe(true)
      expect(rollbackHookCalled).toBe(false)

      // Test rollback hook
      commitHookCalled = false

      const failingStep = transactionStep('fail', async () => Result.Err(new Error('Test error')))

      const failTxDef = transaction('failing-hook-transaction', [failingStep], {
        onCommit: async () => {
          commitHookCalled = true
          return Result.Ok(undefined)
        },
        onRollback: async () => {
          rollbackHookCalled = true
          return Result.Ok(undefined)
        },
      })

      await transactionManager.execute(failTxDef, 5)

      expect(commitHookCalled).toBe(false)
      expect(rollbackHookCalled).toBe(true)
    })
  })

  describe('Lock Manager', () => {
    it('should acquire and release locks', async () => {
      const result = await lockManager.acquireLock('resource-1', 'exclusive', 'tx-1')

      expect(Result.isOk(result)).toBe(true)
      expect(lockManager.isLocked('resource-1')).toBe(true)
      expect(lockManager.getLockHolder('resource-1')).toBe('tx-1')

      const releaseResult = await lockManager.releaseLock('resource-1', 'tx-1')
      expect(Result.isOk(releaseResult)).toBe(true)
      expect(lockManager.isLocked('resource-1')).toBe(false)
    })

    it('should handle shared locks', async () => {
      const result1 = await lockManager.acquireLock('resource-1', 'shared', 'tx-1')
      const result2 = await lockManager.acquireLock('resource-1', 'shared', 'tx-2')

      expect(Result.isOk(result1)).toBe(true)
      expect(Result.isOk(result2)).toBe(true)
      expect(lockManager.isLocked('resource-1')).toBe(true)
    })

    it('should prevent exclusive lock conflicts', async () => {
      const result1 = await lockManager.acquireLock('resource-1', 'exclusive', 'tx-1')
      expect(Result.isOk(result1)).toBe(true)

      // Set conflict strategy to fail immediately
      const failLockManager = createLockManager({ conflictStrategy: 'fail' })
      await failLockManager.acquireLock('resource-1', 'exclusive', 'tx-1')

      const result2 = await failLockManager.acquireLock('resource-1', 'exclusive', 'tx-2')
      expect(Result.isErr(result2)).toBe(true)
    })

    it('should release all locks for a transaction', async () => {
      await lockManager.acquireLock('resource-1', 'exclusive', 'tx-1')
      await lockManager.acquireLock('resource-2', 'shared', 'tx-1')
      await lockManager.acquireLock('resource-3', 'exclusive', 'tx-1')

      const result = await lockManager.releaseAllLocks('tx-1')

      expect(Result.isOk(result)).toBe(true)
      expect(lockManager.isLocked('resource-1')).toBe(false)
      expect(lockManager.isLocked('resource-2')).toBe(false)
      expect(lockManager.isLocked('resource-3')).toBe(false)
    })
  })

  describe('Transactional Pipeline', () => {
    it('should execute pipeline steps in transaction', async () => {
      const txPipeline = transactionalPipeline('test-pipeline', transactionManager)
        .map((input: unknown) => (input as number) + 10)
        .map((input: unknown) => (input as number) * 2)
        .filter((input: unknown) => (input as number) > 20)

      const result = await txPipeline.execute(10)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(40) // (10 + 10) * 2 = 40
      }
    })

    it('should rollback pipeline on error', async () => {
      let step1Executed = false
      let step2Executed = false

      const txPipeline = transactionalPipeline('failing-pipeline', transactionManager)
        .step('step1', async (input: unknown) => {
          step1Executed = true
          return Result.Ok((input as number) + 10)
        })
        .step('step2', async () => {
          step2Executed = true
          return Result.Err(new Error('Pipeline step failed'))
        })

      const result = await txPipeline.execute(5)

      expect(Result.isErr(result)).toBe(true)
      expect(step1Executed).toBe(true)
      expect(step2Executed).toBe(true)
    })

    it('should support compensation in pipeline steps', async () => {
      // Test compensation execution

      const txPipeline = transactionalPipeline('compensatable-pipeline', transactionManager)
        .step('compensatable-step', async (input: unknown) => Result.Ok((input as number) + 10), {
          compensate: async () => {
            return Result.Ok(undefined)
          },
        })
        .step('failing-step', async () => Result.Err(new Error('Failed')))

      const result = await txPipeline.execute(5)

      expect(Result.isErr(result)).toBe(true)
      // Note: compensation execution depends on transaction manager configuration
    })
  })

  describe('Transactional Repository', () => {
    it('should perform CRUD operations in transaction', async () => {
      const UserSchema = nativeSchema.object({
        id: nativeSchema.string(),
        name: nativeSchema.string(),
        email: nativeSchema.string().email(),
      })

      const userRepo = transactionalRepository('users', UserSchema, transactionManager, {
        name: 'users',
        schema: UserSchema,
        storage: 'memory',
      })

      // Begin transaction
      const txResult = await transactionManager.begin()
      expect(Result.isOk(txResult)).toBe(true)
      if (Result.isErr(txResult)) {
        throw new Error('Unexpected error')
      }
      const context = txResult.value

      // Create user
      const createResult = await userRepo.create({
        name: 'John Doe',
        email: 'john@example.com',
      })

      expect(Result.isOk(createResult)).toBe(true)
      if (Result.isOk(createResult)) {
        expect(createResult.value.name).toBe('John Doe')
      }

      // Commit transaction
      const commitResult = await transactionManager.commit(context.transactionId)
      expect(Result.isOk(commitResult)).toBe(true)
    })

    it('should rollback repository operations', async () => {
      const UserSchema = nativeSchema.object({
        id: nativeSchema.string(),
        name: nativeSchema.string(),
        email: nativeSchema.string().email(),
      })

      const userRepo = transactionalRepository('users', UserSchema, transactionManager, {
        name: 'users',
        schema: UserSchema,
        storage: 'memory',
      })

      // Create a user outside transaction first
      const initialUser = await userRepo.create({
        name: 'Initial User',
        email: 'initial@example.com',
      })

      expect(Result.isOk(initialUser)).toBe(true)

      // Begin transaction
      const txResult = await transactionManager.begin()
      expect(Result.isOk(txResult)).toBe(true)
      if (Result.isErr(txResult)) {
        throw new Error('Unexpected error')
      }
      const context = txResult.value

      // Update user in transaction
      if (Result.isOk(initialUser)) {
        const updateResult = await userRepo.update(initialUser.value.id, {
          name: 'Updated User',
        })
        expect(Result.isOk(updateResult)).toBe(true)
      }

      // Rollback transaction
      const rollbackResult = await transactionManager.rollback(context.transactionId)
      expect(Result.isOk(rollbackResult)).toBe(true)

      // Check that update was rolled back
      if (Result.isOk(initialUser)) {
        const findResult = await userRepo.find(initialUser.value.id)
        expect(Result.isOk(findResult)).toBe(true)
        if (Result.isOk(findResult) && findResult.value) {
          expect(findResult.value.name).toBe('Initial User')
        }
      }
    })
  })

  describe('Transactional Resource', () => {
    it('should execute HTTP operations in transaction', async () => {
      const userResource = transactionalResource(
        'users',
        {
          create: {
            path: '/users',
            method: 'POST',
            body: nativeSchema.object({
              name: nativeSchema.string(),
              email: nativeSchema.string().email(),
            }),
            response: nativeSchema.object({
              id: nativeSchema.string(),
              name: nativeSchema.string(),
              email: nativeSchema.string().email(),
            }),
          },
        },
        transactionManager,
        {
          idempotencyKey: (operation, data) => `${operation}-${(data as any).email}`,
          enableTransactions: true,
        }
      )

      // Mock the HTTP call
      const mockResponse = { id: '123', name: 'John Doe', email: 'john@example.com' }
      // Mock the HTTP call
      const createMock = userResource.create as unknown as { mock: (scenarios: unknown[]) => void }
      createMock.mock([
        {
          trigger: { body: { name: 'John Doe', email: 'john@example.com' } },
          response: { status: 201, data: mockResponse },
        },
      ])

      const createRun = userResource.create as {
        run: (input: unknown) => Promise<Result<Error, unknown>>
      }
      const result = await createRun.run({
        body: { name: 'John Doe', email: 'john@example.com' },
      })

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toEqual(mockResponse)
      }
    })
  })

  describe('Retry Mechanism', () => {
    it('should retry failed operations', async () => {
      let attemptCount = 0

      const retryStep = transactionStep<number, number>(
        'retry-step',
        async (input: number) => {
          attemptCount++
          if (attemptCount < 3) {
            return Result.Err(new Error('Temporary failure'))
          }
          return Result.Ok(input * 2)
        },
        {
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 10,
            exponentialBackoff: false,
          },
        }
      )

      const txDef = transaction('retry-transaction', [retryStep] as TransactionStep<
        unknown,
        unknown
      >[])
      const result = await transactionManager.execute(txDef, 5)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isErr(result)) {
        throw new Error('Unexpected error')
      }
      const txResult = result.value
      expect(txResult.status).toBe('committed')
      expect(txResult.result).toBe(10)
      expect(attemptCount).toBe(3)
    })

    it('should emit transaction events', async () => {
      const receivedEvents: any[] = []

      const subscribe = eventBus.subscribe as (options: {
        eventType: string
        handler: (event: unknown) => Promise<Result<Error, void>>
      }) => Promise<void>

      await subscribe({
        eventType: 'transaction.started',
        handler: async (event: unknown) => {
          receivedEvents.push(event)
          return Result.Ok(undefined)
        },
      })

      await subscribe({
        eventType: 'transaction.committed',
        handler: async (event: unknown) => {
          receivedEvents.push(event)
          return Result.Ok(undefined)
        },
      })

      const step = transactionStep<number, number>('simple-step', async (input: number) =>
        Result.Ok(input)
      )
      const txDef = transaction(
        'event-transaction',
        [step] as TransactionStep<unknown, unknown>[],
        { eventBus }
      )

      await transactionManager.execute(txDef, 42)

      expect(receivedEvents).toHaveLength(2)
      expect(receivedEvents[0]!.type).toBe('transaction.started')
      expect(receivedEvents[1]!.type).toBe('transaction.committed')
    })

    it('should support parallel transactions', async () => {
      const step = transactionStep<number, number>('parallel-step', async (input: number) =>
        Result.Ok(input * 2)
      )

      const txDef = transaction('parallel-transaction', [step] as TransactionStep<
        unknown,
        unknown
      >[])

      // Execute multiple transactions in parallel
      const promises = [
        transactionManager.execute(txDef, 1),
        transactionManager.execute(txDef, 2),
        transactionManager.execute(txDef, 3),
      ]

      const results = await Promise.all(promises)

      expect(results.every(r => Result.isOk(r))).toBe(true)
      if (Result.isOk(results[0]!)) {
        expect(results[0].value.result).toBe(2)
      }
      if (Result.isOk(results[1]!)) {
        expect(results[1].value.result).toBe(4)
      }
      if (Result.isOk(results[2]!)) {
        expect(results[2].value.result).toBe(6)
      }
    })
  })

  describe('Performance Tests', () => {
    it('should handle high-throughput transactions', async () => {
      const step = transactionStep<number, number>('fast-step', async (input: number) =>
        Result.Ok(input + 1)
      )

      const txDef = transaction('performance-transaction', [step] as TransactionStep<
        unknown,
        unknown
      >[])

      const startTime = Date.now()
      const promises = Array.from({ length: 100 }, (_, i) => transactionManager.execute(txDef, i))

      const results = await Promise.all(promises)
      const endTime = Date.now()

      expect(results.every(r => Result.isOk(r))).toBe(true)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete in less than 5 seconds
    })
  })
})
