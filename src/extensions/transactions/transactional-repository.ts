import { Result } from '../../core/result'
import type { Schema } from '../../core/native-schema'
import type { Repository, RepositoryConfig, StorageAdapter } from '../../core/repository'
import { repository } from '../../core/repository'
import type {
  TransactionContext,
  TransactionManager,
  TransactionalResource,
  TransactionIsolation,
} from './transactions'

/**
 * Transactional repository configuration
 */
export interface TransactionalRepositoryConfig<T> extends RepositoryConfig<T> {
  readonly enableTransactions?: boolean | undefined
  readonly autoRegisterCompensation?: boolean | undefined
  readonly isolationLevel?: TransactionIsolation | undefined
}

/**
 * Transaction-aware storage adapter
 */
export interface TransactionalStorageAdapter<T> extends StorageAdapter<T> {
  /**
   * Begin transaction on storage level
   */
  beginTransaction(transactionId: string): Promise<Result<Error, void>>

  /**
   * Commit transaction on storage level
   */
  commitTransaction(transactionId: string): Promise<Result<Error, void>>

  /**
   * Rollback transaction on storage level
   */
  rollbackTransaction(transactionId: string): Promise<Result<Error, void>>

  /**
   * Execute operation within transaction
   */
  executeInTransaction<T>(
    transactionId: string,
    operation: () => Promise<Result<Error, T>>
  ): Promise<Result<Error, T>>
}

/**
 * Transactional repository implementation
 */
export class TransactionalRepository<T> implements TransactionalResource {
  private readonly baseRepository: Repository<T>
  private readonly transactionManager: TransactionManager
  private readonly config: TransactionalRepositoryConfig<T>
  private readonly pendingOperations = new Map<
    string,
    Array<{
      type: 'create' | 'update' | 'delete'
      entity: T
      id: string
      previousState?: T
    }>
  >()

  /**
   * Convert RepositoryError to Error
   */
  private convertRepositoryError(repositoryError: { message?: string; name?: string }): Error {
    const error = new Error(repositoryError.message ?? 'Repository operation failed')
    error.name = repositoryError.name ?? 'RepositoryError'
    return error
  }

  constructor(
    name: string,
    schema: Schema<T>,
    transactionManager: TransactionManager,
    config: TransactionalRepositoryConfig<T> = { schema, storage: 'memory', name }
  ) {
    this.transactionManager = transactionManager
    this.config = {
      enableTransactions: true,
      autoRegisterCompensation: true,
      isolationLevel: 'read-committed',
      ...config,
    }

    // Create base repository with proper type casting
    const repositoryConfig = {
      schema: schema as unknown as Schema<Record<string, unknown>>,
      storage: (config.storage || 'memory') as 'memory' | 'database' | 'file',
      ...(config.timestamps !== undefined && { timestamps: config.timestamps }),
      ...(config.relationships !== undefined && { relationships: config.relationships }),
      ...(config.hooks !== undefined && { hooks: config.hooks as unknown }),
    }

    this.baseRepository = repository(
      name,
      repositoryConfig as Parameters<typeof repository>[1]
    ) as unknown as Repository<T>

    // Register compensation functions if enabled
    if (this.config.autoRegisterCompensation) {
      this.registerCompensationFunctions(name)
    }
  }

  /**
   * Create entity with transaction support
   */
  async create(data: Omit<T, 'id'>): Promise<Result<Error, T>> {
    const context = this.getCurrentTransactionContext()

    if (context && this.config.enableTransactions) {
      return await this.createInTransaction(data, context)
    } else {
      const result = await this.baseRepository.create(data as T)
      if (Result.isErr(result)) {
        return Result.Err(this.convertRepositoryError(result.error))
      }
      return Result.Ok(result.value)
    }
  }

  /**
   * Create entity within transaction
   */
  private async createInTransaction(
    data: Omit<T, 'id'>,
    context: TransactionContext
  ): Promise<Result<Error, T>> {
    try {
      // Execute create operation
      const result = await this.baseRepository.create(data as T)

      if (Result.isErr(result)) {
        return Result.Err(this.convertRepositoryError(result.error))
      }

      const entity = result.value

      // Add to pending operations for this transaction
      if (!this.pendingOperations.has(context.transactionId)) {
        this.pendingOperations.set(context.transactionId, [])
      }

      this.pendingOperations.get(context.transactionId)!.push({
        type: 'create',
        entity,
        id: (entity as Record<string, unknown>).id as string,
      })

      // Add operation to transaction
      this.transactionManager.addOperation(context.transactionId, {
        type: 'create',
        resource: this.getResourceName(),
        data: entity,
        compensationData: { entityId: (entity as Record<string, unknown>).id },
      })

      return Result.Ok(entity)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Update entity with transaction support
   */
  async update(id: string, data: Partial<T>): Promise<Result<Error, T>> {
    const context = this.getCurrentTransactionContext()

    if (context && this.config.enableTransactions) {
      return await this.updateInTransaction(id, data, context)
    } else {
      const result = await this.baseRepository.update(id, data)
      if (Result.isErr(result)) {
        return Result.Err(this.convertRepositoryError(result.error))
      }
      return Result.Ok(result.value)
    }
  }

  /**
   * Update entity within transaction
   */
  private async updateInTransaction(
    id: string,
    data: Partial<T>,
    context: TransactionContext
  ): Promise<Result<Error, T>> {
    try {
      // Get previous state for rollback
      const previousResult = await this.baseRepository.find(id)
      if (Result.isErr(previousResult)) {
        return Result.Err(this.convertRepositoryError(previousResult.error))
      }

      const previousState = previousResult.value
      if (!previousState) {
        return Result.Err(new Error(`Entity with id ${id} not found`))
      }

      // Execute update operation
      const result = await this.baseRepository.update(id, data)

      if (Result.isErr(result)) {
        return Result.Err(this.convertRepositoryError(result.error))
      }

      const updatedEntity = result.value

      // Add to pending operations for this transaction
      if (!this.pendingOperations.has(context.transactionId)) {
        this.pendingOperations.set(context.transactionId, [])
      }

      this.pendingOperations.get(context.transactionId)!.push({
        type: 'update',
        entity: updatedEntity,
        id,
        previousState,
      })

      // Add operation to transaction
      this.transactionManager.addOperation(context.transactionId, {
        type: 'update',
        resource: this.getResourceName(),
        data: updatedEntity,
        compensationData: { entityId: id, previousState },
      })

      return Result.Ok(updatedEntity)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Delete entity with transaction support
   */
  async delete(id: string): Promise<Result<Error, boolean>> {
    const context = this.getCurrentTransactionContext()

    if (context && this.config.enableTransactions) {
      return await this.deleteInTransaction(id, context)
    } else {
      const result = await this.baseRepository.delete(id)
      if (Result.isErr(result)) {
        return Result.Err(this.convertRepositoryError(result.error))
      }
      // Repository delete returns void, but we want boolean
      return Result.Ok(true)
    }
  }

  /**
   * Delete entity within transaction
   */
  private async deleteInTransaction(
    id: string,
    context: TransactionContext
  ): Promise<Result<Error, boolean>> {
    try {
      // Get entity state before deletion for rollback
      const entityResult = await this.baseRepository.find(id)
      if (Result.isErr(entityResult)) {
        return Result.Err(this.convertRepositoryError(entityResult.error))
      }

      const entity = entityResult.value
      if (!entity) {
        return Result.Err(new Error(`Entity with id ${id} not found`))
      }

      // Execute delete operation
      const result = await this.baseRepository.delete(id)

      if (Result.isErr(result)) {
        return Result.Err(this.convertRepositoryError(result.error))
      }

      // Add to pending operations for this transaction
      if (!this.pendingOperations.has(context.transactionId)) {
        this.pendingOperations.set(context.transactionId, [])
      }

      this.pendingOperations.get(context.transactionId)!.push({
        type: 'delete',
        entity,
        id,
      })

      // Add operation to transaction
      this.transactionManager.addOperation(context.transactionId, {
        type: 'delete',
        resource: this.getResourceName(),
        data: { id },
        compensationData: { entity },
      })

      return Result.Ok(true)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Find operations delegate to base repository (read-only)
   */
  async find(id: string): Promise<Result<Error, T | null>> {
    const result = await this.baseRepository.find(id)
    if (Result.isErr(result)) {
      return Result.Err(new Error(result.error.message))
    }
    return Result.Ok(result.value)
  }

  async findOne(filter: Partial<T>): Promise<Result<Error, T | null>> {
    const result = await this.baseRepository.findOne({ where: filter })
    if (Result.isErr(result)) {
      return Result.Err(new Error(result.error.message))
    }
    return Result.Ok(result.value)
  }

  async findMany(filter?: Partial<T>): Promise<Result<Error, T[]>> {
    const result = await this.baseRepository.findMany(filter ? { where: filter } : undefined)
    if (Result.isErr(result)) {
      return Result.Err(new Error(result.error.message))
    }
    return Result.Ok(result.value)
  }

  async exists(id: string): Promise<Result<Error, boolean>> {
    const result = await this.baseRepository.exists(id)
    if (Result.isErr(result)) {
      return Result.Err(new Error(result.error.message))
    }
    return Result.Ok(result.value)
  }

  async count(filter?: Partial<T>): Promise<Result<Error, number>> {
    const result = await this.baseRepository.count(filter ? { where: filter } : undefined)
    if (Result.isErr(result)) {
      return Result.Err(new Error(result.error.message))
    }
    return Result.Ok(result.value)
  }

  // Additional Repository interface compatibility
  get name(): string {
    return this.baseRepository.name
  }

  get schema(): Schema<T> {
    return this.baseRepository.schema
  }

  get relationships(): unknown {
    return this.baseRepository.relationships
  }

  async updateMany(
    data: Partial<T>,
    options?: { where?: Record<string, unknown> }
  ): Promise<Result<Error, T[]>> {
    // For simplicity, convert to individual updates in transaction context
    const findResult = await this.baseRepository.findMany(options)
    if (Result.isErr(findResult)) {
      return Result.Err(new Error(findResult.error.message))
    }

    const results: T[] = []
    for (const item of findResult.value) {
      const id = (item as unknown as { id: string }).id
      const updateResult = await this.update(id, data)
      if (Result.isErr(updateResult)) {
        return Result.Err(updateResult.error)
      }
      results.push(updateResult.value)
    }

    return Result.Ok(results)
  }

  async deleteMany(options?: { where?: Record<string, unknown> }): Promise<Result<Error, void>> {
    // For simplicity, convert to individual deletes in transaction context
    const findResult = await this.baseRepository.findMany(options)
    if (Result.isErr(findResult)) {
      return Result.Err(new Error(findResult.error.message))
    }

    for (const item of findResult.value) {
      const id = (item as unknown as { id: string }).id
      const deleteResult = await this.delete(id)
      if (Result.isErr(deleteResult)) {
        return Result.Err(deleteResult.error)
      }
    }

    return Result.Ok(undefined)
  }

  /**
   * Execute operation within transaction context
   */
  async executeInTransaction<TResult>(
    operation: (context: TransactionContext) => Promise<Result<Error, TResult>>,
    context: TransactionContext
  ): Promise<Result<Error, TResult>> {
    try {
      return await operation(context)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Prepare operation for commit (two-phase commit)
   */
  async prepare(context: TransactionContext): Promise<Result<Error, void>> {
    try {
      // In a real implementation, this would prepare the transaction
      // For in-memory storage, we can just validate the operations
      const operations = this.pendingOperations.get(context.transactionId)
      if (!operations) {
        return Result.Ok(undefined)
      }

      // Validate all operations can be committed
      for (const operation of operations) {
        if (operation.type === 'update' || operation.type === 'delete') {
          const existsResult = await this.baseRepository.exists(operation.id)
          if (Result.isErr(existsResult)) {
            return Result.Err(this.convertRepositoryError(existsResult.error))
          }
          if (!existsResult.value) {
            return Result.Err(new Error(`Entity ${operation.id} no longer exists`))
          }
        }
      }

      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Commit prepared operations
   */
  commitPrepared(context: TransactionContext): Promise<Result<Error, void>> {
    try {
      // For in-memory storage, operations are already applied
      // Clean up pending operations
      this.pendingOperations.delete(context.transactionId)
      return Promise.resolve(Result.Ok(undefined))
    } catch (error) {
      return Promise.resolve(Result.Err(error as Error))
    }
  }

  /**
   * Rollback operations
   */
  async rollbackOperations(context: TransactionContext): Promise<Result<Error, void>> {
    try {
      const operations = this.pendingOperations.get(context.transactionId)
      if (!operations) {
        return Result.Ok(undefined)
      }

      // Rollback operations in reverse order
      for (let i = operations.length - 1; i >= 0; i--) {
        const operation = operations[i]!

        try {
          switch (operation.type) {
            case 'create':
              // Undo create by deleting the entity
              await this.baseRepository.delete(operation.id)
              break

            case 'update':
              // Undo update by restoring previous state
              if (operation.previousState) {
                await this.baseRepository.update(
                  operation.id,
                  operation.previousState as Partial<T>
                )
              }
              break

            case 'delete':
              // Undo delete by recreating the entity
              await this.baseRepository.create(operation.entity)
              break
          }
        } catch (error) {
          console.error(
            `Failed to rollback operation ${operation.type} for entity ${operation.id}:`,
            error
          )
        }
      }

      // Clean up pending operations
      this.pendingOperations.delete(context.transactionId)
      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Get current transaction context
   */
  private getCurrentTransactionContext(): TransactionContext | null {
    // For testing purposes, we'll check if there are any active transactions
    const activeTransactions = this.transactionManager.getActiveTransactions()
    return activeTransactions.length > 0 ? activeTransactions[0]! : null
  }

  /**
   * Get resource name for transaction operations
   */
  private getResourceName(): string {
    return `repository:${this.config.name}`
  }

  /**
   * Register compensation functions for repository operations
   */
  private registerCompensationFunctions(repositoryName: string): void {
    // Register create compensation (delete the created entity)
    this.transactionManager.registerCompensation(
      'create',
      `repository:${repositoryName}`,
      async operation => {
        try {
          const entityId = (operation.compensationData as { entityId?: string })?.entityId
          if (entityId) {
            await this.baseRepository.delete(entityId)
          }
          return Result.Ok(undefined)
        } catch (error) {
          return Result.Err(error as Error)
        }
      }
    )

    // Register update compensation (restore previous state)
    this.transactionManager.registerCompensation(
      'update',
      `repository:${repositoryName}`,
      async operation => {
        try {
          const { entityId, previousState } = operation.compensationData as {
            entityId?: string
            previousState?: T
          }
          if (entityId && previousState) {
            await this.baseRepository.update(entityId, previousState as Partial<T>)
          }
          return Result.Ok(undefined)
        } catch (error) {
          return Result.Err(error as Error)
        }
      }
    )

    // Register delete compensation (recreate the deleted entity)
    this.transactionManager.registerCompensation(
      'delete',
      `repository:${repositoryName}`,
      async operation => {
        try {
          const { entity } = operation.compensationData as { entity?: T }
          if (entity) {
            await this.baseRepository.create(entity as T)
          }
          return Result.Ok(undefined)
        } catch (error) {
          return Result.Err(error as Error)
        }
      }
    )
  }
}

/**
 * Create a new transactional repository
 */
export function transactionalRepository<T>(
  name: string,
  schema: Schema<T>,
  transactionManager: TransactionManager,
  config?: TransactionalRepositoryConfig<T>
): TransactionalRepository<T> {
  return new TransactionalRepository(name, schema, transactionManager, config)
}

/**
 * Convert regular repository to transactional repository
 */
export function makeRepositoryTransactional<T>(
  baseRepository: Repository<T>,
  transactionManager: TransactionManager,
  config?: Partial<TransactionalRepositoryConfig<T>>
): Repository<T> {
  // Create a proxy that intercepts repository calls and adds transaction support
  return new Proxy(baseRepository, {
    get(target, prop, receiver) {
      const originalMethod = Reflect.get(target, prop, receiver) as unknown

      if (typeof originalMethod === 'function') {
        if (['create', 'update', 'delete'].includes(prop as string)) {
          return async function (...args: unknown[]) {
            // Check if we're in a transaction context
            const context = getCurrentTransactionContext()

            if (context && config?.enableTransactions !== false) {
              // Execute in transaction context
              return await executeInTransactionContext(
                originalMethod as (...args: unknown[]) => Promise<unknown>,
                args,
                target,
                context,
                transactionManager
              )
            } else {
              // Execute normally
              return await (originalMethod as (...args: unknown[]) => Promise<unknown>).apply(
                target,
                args
              )
            }
          }
        }
      }

      return originalMethod
    },
  })
}

/**
 * Get current transaction context (placeholder implementation)
 */
function getCurrentTransactionContext(): TransactionContext | null {
  // In a real implementation, this would use async local storage or similar
  return null
}

/**
 * Execute method in transaction context
 */
async function executeInTransactionContext(
  method: (...args: unknown[]) => Promise<unknown>,
  args: unknown[],
  target: unknown,
  _context: TransactionContext,
  _transactionManager: TransactionManager
): Promise<unknown> {
  // This would contain the actual transaction logic
  return await method.apply(target, args)
}
