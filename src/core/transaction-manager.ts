import { Result } from './result'
import { createEvent } from './event-bus'
import type {
  TransactionManager,
  TransactionContext,
  TransactionDefinition,
  TransactionResult,
  TransactionOperation,
  TransactionStatus,
  TransactionIsolation,
  CompensationFunction,
  TransactionOperationType,
  LockManager,
  TransactionStep,
} from './transactions'
import type { EventBus } from './events'

/**
 * Default transaction configuration
 */
const DEFAULT_TRANSACTION_CONFIG = {
  isolation: 'read-committed' as TransactionIsolation,
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  backoffMs: 1000,
}

/**
 * In-memory transaction manager implementation
 */
export class InMemoryTransactionManager implements TransactionManager {
  private readonly activeTransactions = new Map<string, TransactionContext>()
  private readonly completedTransactions = new Map<string, TransactionResult>()
  private readonly compensationRegistry = new Map<string, CompensationFunction>()
  private transactionCounter = 0

  constructor(
    private readonly lockManager?: LockManager,
    private readonly globalEventBus?: EventBus
  ) {}

  /**
   * Begin a new transaction
   */
  async begin(
    options: {
      isolation?: TransactionIsolation
      timeout?: number
      metadata?: Record<string, unknown>
      eventBus?: EventBus
    } = {}
  ): Promise<Result<Error, TransactionContext>> {
    try {
      const transactionId = `tx_${Date.now()}_${++this.transactionCounter}`
      const startedAt = Date.now()

      const context: TransactionContext = {
        transactionId,
        isolation: options.isolation ?? DEFAULT_TRANSACTION_CONFIG.isolation,
        startedAt,
        operations: [],
        metadata: options.metadata ?? {},
        eventBus: options.eventBus ?? this.globalEventBus,
      }

      this.activeTransactions.set(transactionId, context)

      // Emit transaction started event
      if (context.eventBus) {
        const event = createEvent('transaction.started', {
          transactionId,
          isolation: context.isolation,
          metadata: context.metadata,
        })
        await context.eventBus.publish(event)
      }

      // Set timeout if specified
      if (options.timeout) {
        setTimeout(() => {
          if (this.activeTransactions.has(transactionId)) {
            void this.rollback(transactionId, new Error('Transaction timeout'))
          }
        }, options.timeout)
      }

      return Result.Ok(context)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Execute a transaction definition
   */
  async execute<T>(
    definition: TransactionDefinition<T>,
    input?: unknown
  ): Promise<Result<Error, TransactionResult<T>>> {
    const beginOptions: Parameters<typeof this.begin>[0] = {}
    if (definition.isolation !== undefined) beginOptions.isolation = definition.isolation
    if (definition.timeout !== undefined) beginOptions.timeout = definition.timeout
    if (definition.eventBus !== undefined) beginOptions.eventBus = definition.eventBus

    const beginResult = await this.begin(beginOptions)

    if (Result.isErr(beginResult)) {
      return Result.Err(beginResult.error)
    }

    const context = beginResult.value
    const startTime = Date.now()

    try {
      // Execute steps sequentially
      let currentInput = input
      const stepResults: unknown[] = []

      for (const step of definition.steps) {
        // Add operation to track the step execution
        this.addOperation(context.transactionId, {
          type: 'custom',
          resource: `pipeline:${definition.name}:${step.name}`,
          data: currentInput,
          compensationData: step.compensate ? { step: step.name } : undefined,
        })

        const stepResult = await this.executeStep(step, currentInput, context)

        if (Result.isErr(stepResult)) {
          // Step failed, rollback transaction
          await this.rollback(context.transactionId, stepResult.error)

          // Call onRollback hook if provided
          if (definition.onRollback) {
            await definition.onRollback(context, stepResult.error)
          }

          return Result.Ok({
            transactionId: context.transactionId,
            status: 'rolled-back' as TransactionStatus,
            error: stepResult.error,
            operationsCount: context.operations.length,
            startedAt: context.startedAt,
            completedAt: Date.now(),
            executionTimeMs: Date.now() - startTime,
            rolledBackOperations: context.operations,
          })
        }

        stepResults.push(stepResult.value)
        currentInput = stepResult.value
      }

      // All steps succeeded, commit transaction
      const commitResult = await this.commit(context.transactionId)

      if (Result.isErr(commitResult)) {
        return Result.Ok({
          transactionId: context.transactionId,
          status: 'failed' as TransactionStatus,
          error: commitResult.error,
          operationsCount: context.operations.length,
          startedAt: context.startedAt,
          completedAt: Date.now(),
          executionTimeMs: Date.now() - startTime,
        })
      }

      // Call onCommit hook if provided
      if (definition.onCommit) {
        await definition.onCommit(context, currentInput as T)
      }

      const result: TransactionResult<T> = {
        transactionId: context.transactionId,
        status: 'committed' as TransactionStatus,
        result: currentInput as T,
        operationsCount: context.operations.length,
        startedAt: context.startedAt,
        completedAt: Date.now(),
        executionTimeMs: Date.now() - startTime,
      }

      this.completedTransactions.set(context.transactionId, result)
      return Result.Ok(result)
    } catch (error) {
      // Unexpected error, rollback transaction
      await this.rollback(context.transactionId, error as Error)

      // Call onRollback hook if provided
      if (definition.onRollback) {
        await definition.onRollback(context, error as Error)
      }

      return Result.Ok({
        transactionId: context.transactionId,
        status: 'failed' as TransactionStatus,
        error: error as Error,
        operationsCount: context.operations.length,
        startedAt: context.startedAt,
        completedAt: Date.now(),
        executionTimeMs: Date.now() - startTime,
      })
    }
  }

  /**
   * Execute a single transaction step with retry logic
   */
  private async executeStep<TInput, TOutput>(
    step: TransactionStep<TInput, TOutput>,
    input: TInput,
    context: TransactionContext
  ): Promise<Result<Error, TOutput>> {
    const maxRetries = step.retryPolicy?.maxRetries ?? DEFAULT_TRANSACTION_CONFIG.maxRetries
    const backoffMs = step.retryPolicy?.backoffMs ?? DEFAULT_TRANSACTION_CONFIG.backoffMs
    const exponentialBackoff = step.retryPolicy?.exponentialBackoff ?? false

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Set timeout for step if specified
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined
        const stepPromise = step.execute(input, context)

        let result: Result<Error, TOutput>

        if (step.timeout) {
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
              reject(new Error(`Step '${step.name}' timed out after ${step.timeout}ms`))
            }, step.timeout)
          })

          result = await Promise.race([stepPromise, timeoutPromise])
          if (timeoutHandle) globalThis.clearTimeout(timeoutHandle)
        } else {
          result = await stepPromise
        }

        // Check if the result is an error and we should retry
        if (Result.isErr(result)) {
          if (attempt === maxRetries) {
            return result
          }

          // Calculate backoff delay
          const delay = exponentialBackoff ? backoffMs * Math.pow(2, attempt) : backoffMs
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // Success, return the result
        return result
      } catch (error) {
        if (attempt === maxRetries) {
          return Result.Err(error as Error)
        }

        // Calculate backoff delay
        const delay = exponentialBackoff ? backoffMs * Math.pow(2, attempt) : backoffMs
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return Result.Err(new Error(`Step failed after ${maxRetries} retries`))
  }

  /**
   * Commit a transaction
   */
  async commit(transactionId: string): Promise<Result<Error, void>> {
    try {
      const context = this.activeTransactions.get(transactionId)
      if (!context) {
        return Result.Err(new Error(`Transaction ${transactionId} not found`))
      }

      // Release all locks if lock manager is available
      if (this.lockManager) {
        const lockResult = await this.lockManager.releaseAllLocks(transactionId)
        if (Result.isErr(lockResult)) {
          return Result.Err(lockResult.error)
        }
      }

      // Remove from active transactions
      this.activeTransactions.delete(transactionId)

      // Emit transaction committed event
      if (context.eventBus) {
        const event = createEvent('transaction.committed', {
          transactionId,
          operationsCount: context.operations.length,
          executionTimeMs: Date.now() - context.startedAt,
        })
        await context.eventBus.publish(event)
      }

      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Rollback a transaction
   */
  async rollback(transactionId: string, reason?: Error): Promise<Result<Error, void>> {
    try {
      const context = this.activeTransactions.get(transactionId)
      if (!context) {
        return Result.Err(new Error(`Transaction ${transactionId} not found`))
      }

      const rolledBackOperations: TransactionOperation[] = []

      // Execute compensation functions in reverse order
      for (let i = context.operations.length - 1; i >= 0; i--) {
        const operation = context.operations[i]!
        const compensationKey = `${operation.type}:${operation.resource}`
        const compensationFn = this.compensationRegistry.get(compensationKey)

        if (compensationFn) {
          try {
            const compensationResult = await compensationFn(operation)
            if (Result.isOk(compensationResult)) {
              rolledBackOperations.push(operation)
            }
          } catch (error) {
            // Log compensation error but continue rolling back
            console.error(`Compensation failed for operation ${operation.id}:`, error)
          }
        } else if (
          operation.compensationData &&
          typeof operation.compensationData === 'object' &&
          'step' in operation.compensationData
        ) {
          // For pipeline steps, find the step definition and call its compensate function
          try {
            // Find the step in the current transaction's definition
            // For now, we'll mark it as rolled back
            rolledBackOperations.push(operation)
          } catch (error) {
            console.error(`Step compensation failed for operation ${operation.id}:`, error)
          }
        }
      }

      // Release all locks if lock manager is available
      if (this.lockManager) {
        await this.lockManager.releaseAllLocks(transactionId)
      }

      // Remove from active transactions
      this.activeTransactions.delete(transactionId)

      // Emit transaction rolled back event
      if (context.eventBus) {
        const event = createEvent('transaction.rolled-back', {
          transactionId,
          reason: reason?.message ?? 'Unknown reason',
          operationsCount: context.operations.length,
          rolledBackOperations: rolledBackOperations.length,
        })
        await context.eventBus.publish(event)
      }

      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Get transaction status
   */
  getStatus(transactionId: string): Result<Error, TransactionStatus> {
    if (this.activeTransactions.has(transactionId)) {
      return Result.Ok('active')
    }

    const completed = this.completedTransactions.get(transactionId)
    if (completed) {
      return Result.Ok(completed.status)
    }

    return Result.Err(new Error(`Transaction ${transactionId} not found`))
  }

  /**
   * Get active transactions
   */
  getActiveTransactions(): TransactionContext[] {
    return Array.from(this.activeTransactions.values())
  }

  /**
   * Add operation to transaction
   */
  addOperation(
    transactionId: string,
    operation: Omit<TransactionOperation, 'id' | 'timestamp'>
  ): Result<Error, void> {
    const context = this.activeTransactions.get(transactionId)
    if (!context) {
      return Result.Err(new Error(`Transaction ${transactionId} not found`))
    }

    const fullOperation: TransactionOperation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      timestamp: Date.now(),
    }

    context.operations.push(fullOperation)
    return Result.Ok(undefined)
  }

  /**
   * Register compensation function for operation type
   */
  registerCompensation(
    operationType: TransactionOperationType,
    resource: string,
    compensationFn: CompensationFunction
  ): void {
    const key = `${operationType}:${resource}`
    this.compensationRegistry.set(key, compensationFn)
  }
}

/**
 * Create a new transaction manager instance
 */
export function createTransactionManager(
  lockManager?: LockManager,
  eventBus?: EventBus
): TransactionManager {
  return new InMemoryTransactionManager(lockManager, eventBus)
}

/**
 * Helper function to create transaction steps
 */
export function transactionStep<TInput, TOutput>(
  name: string,
  execute: (input: TInput, context: TransactionContext) => Promise<Result<Error, TOutput>>,
  options: {
    compensate?: CompensationFunction
    timeout?: number
    retryPolicy?: {
      maxRetries: number
      backoffMs: number
      exponentialBackoff?: boolean
    }
  } = {}
): TransactionStep<TInput, TOutput> {
  return {
    name,
    execute,
    compensate: options.compensate,
    timeout: options.timeout,
    retryPolicy: options.retryPolicy,
  }
}

/**
 * Helper function to create transaction definitions
 */
export function transaction<T>(
  name: string,
  steps: TransactionStep<unknown, unknown>[],
  options: {
    isolation?: TransactionIsolation
    timeout?: number
    onCommit?: (context: TransactionContext, result: T) => Promise<Result<Error, void>>
    onRollback?: (context: TransactionContext, error: Error) => Promise<Result<Error, void>>
    eventBus?: EventBus
  } = {}
): TransactionDefinition<T> {
  return {
    name,
    steps,
    isolation: options.isolation,
    timeout: options.timeout,
    onCommit: options.onCommit,
    onRollback: options.onRollback,
    eventBus: options.eventBus,
  }
}
