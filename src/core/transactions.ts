import type { Result } from './result'
import type { DomainEvent, EventBus } from './events'

/**
 * Transaction isolation levels
 */
export type TransactionIsolation =
  | 'read-uncommitted'
  | 'read-committed'
  | 'repeatable-read'
  | 'serializable'

/**
 * Transaction status
 */
export type TransactionStatus = 'pending' | 'active' | 'committed' | 'rolled-back' | 'failed'

/**
 * Transaction operation types
 */
export type TransactionOperationType = 'create' | 'update' | 'delete' | 'custom'

/**
 * Transaction operation metadata
 */
export interface TransactionOperation {
  readonly id: string
  readonly type: TransactionOperationType
  readonly resource: string
  readonly data: unknown
  readonly timestamp: number
  readonly compensationData?: unknown
}

/**
 * Compensation function for rollback operations
 */
export type CompensationFunction = (operation: TransactionOperation) => Promise<Result<Error, void>>

/**
 * Transaction context for operations
 */
export interface TransactionContext {
  readonly transactionId: string
  readonly isolation: TransactionIsolation
  readonly startedAt: number
  readonly operations: TransactionOperation[]
  readonly metadata: Record<string, unknown>
  readonly eventBus?: EventBus | undefined
}

/**
 * Transaction step interface
 */
export interface TransactionStep<TInput = unknown, TOutput = unknown> {
  readonly name: string
  readonly execute: (input: TInput, context: TransactionContext) => Promise<Result<Error, TOutput>>
  readonly compensate?: CompensationFunction | undefined
  readonly timeout?: number | undefined
  readonly retryPolicy?:
    | {
        maxRetries: number
        backoffMs: number
        exponentialBackoff?: boolean | undefined
      }
    | undefined
}

/**
 * Transaction definition
 */
export interface TransactionDefinition<T = unknown> {
  readonly name: string
  readonly steps: TransactionStep<unknown, unknown>[]
  readonly isolation?: TransactionIsolation | undefined
  readonly timeout?: number | undefined
  readonly onCommit?:
    | ((context: TransactionContext, result: T) => Promise<Result<Error, void>>)
    | undefined
  readonly onRollback?:
    | ((context: TransactionContext, error: Error) => Promise<Result<Error, void>>)
    | undefined
  readonly eventBus?: EventBus | undefined
}

/**
 * Transaction result
 */
export interface TransactionResult<T = unknown> {
  readonly transactionId: string
  readonly status: TransactionStatus
  readonly result?: T | undefined
  readonly error?: Error | undefined
  readonly operationsCount: number
  readonly startedAt: number
  readonly completedAt?: number | undefined
  readonly executionTimeMs?: number | undefined
  readonly rolledBackOperations?: TransactionOperation[] | undefined
}

/**
 * Transaction manager interface
 */
export interface TransactionManager {
  /**
   * Begin a new transaction
   */
  begin(options?: {
    isolation?: TransactionIsolation | undefined
    timeout?: number | undefined
    metadata?: Record<string, unknown> | undefined
    eventBus?: EventBus | undefined
  }): Promise<Result<Error, TransactionContext>>

  /**
   * Execute a transaction definition
   */
  execute<T>(
    definition: TransactionDefinition<T>,
    input?: unknown
  ): Promise<Result<Error, TransactionResult<T>>>

  /**
   * Commit a transaction
   */
  commit(transactionId: string): Promise<Result<Error, void>>

  /**
   * Rollback a transaction
   */
  rollback(transactionId: string, reason?: Error): Promise<Result<Error, void>>

  /**
   * Get transaction status
   */
  getStatus(transactionId: string): Result<Error, TransactionStatus>

  /**
   * Get active transactions
   */
  getActiveTransactions(): TransactionContext[]

  /**
   * Add operation to transaction
   */
  addOperation(
    transactionId: string,
    operation: Omit<TransactionOperation, 'id' | 'timestamp'>
  ): Result<Error, void>

  /**
   * Register compensation function for operation type
   */
  registerCompensation(
    operationType: TransactionOperationType,
    resource: string,
    compensationFn: CompensationFunction
  ): void
}

/**
 * Transaction-aware resource interface
 */
export interface TransactionalResource {
  /**
   * Execute operation within transaction context
   */
  executeInTransaction<T>(
    operation: (context: TransactionContext) => Promise<Result<Error, T>>,
    context: TransactionContext
  ): Promise<Result<Error, T>>

  /**
   * Prepare operation for commit (two-phase commit)
   */
  prepare(context: TransactionContext): Promise<Result<Error, void>>

  /**
   * Commit prepared operations
   */
  commitPrepared(context: TransactionContext): Promise<Result<Error, void>>

  /**
   * Rollback operations
   */
  rollbackOperations(context: TransactionContext): Promise<Result<Error, void>>
}

/**
 * Transaction coordinator for distributed transactions
 */
export interface TransactionCoordinator {
  /**
   * Coordinate distributed transaction across multiple resources
   */
  coordinateTransaction<T>(
    definition: TransactionDefinition<T>,
    resources: TransactionalResource[]
  ): Promise<Result<Error, TransactionResult<T>>>

  /**
   * Execute two-phase commit protocol
   */
  twoPhaseCommit(
    transactionId: string,
    resources: TransactionalResource[]
  ): Promise<Result<Error, void>>
}

/**
 * Transaction lock manager
 */
export interface LockManager {
  /**
   * Acquire lock for resource
   */
  acquireLock(
    resource: string,
    lockType: 'shared' | 'exclusive',
    transactionId: string
  ): Promise<Result<Error, void>>

  /**
   * Release lock
   */
  releaseLock(resource: string, transactionId: string): Promise<Result<Error, void>>

  /**
   * Release all locks for transaction
   */
  releaseAllLocks(transactionId: string): Promise<Result<Error, void>>

  /**
   * Check if resource is locked
   */
  isLocked(resource: string): boolean

  /**
   * Get lock holder
   */
  getLockHolder(resource: string): string | null
}

/**
 * Transaction events
 */
export interface TransactionStartedEvent
  extends DomainEvent<{
    transactionId: string
    isolation: TransactionIsolation
    metadata: Record<string, unknown>
  }> {
  type: 'transaction.started'
}

export interface TransactionCommittedEvent
  extends DomainEvent<{
    transactionId: string
    operationsCount: number
    executionTimeMs: number
  }> {
  type: 'transaction.committed'
}

export interface TransactionRolledBackEvent
  extends DomainEvent<{
    transactionId: string
    reason: string
    operationsCount: number
    rolledBackOperations: number
  }> {
  type: 'transaction.rolled-back'
}

export interface TransactionFailedEvent
  extends DomainEvent<{
    transactionId: string
    error: string
    operationsCount: number
  }> {
  type: 'transaction.failed'
}

export type TransactionEvent =
  | TransactionStartedEvent
  | TransactionCommittedEvent
  | TransactionRolledBackEvent
  | TransactionFailedEvent
