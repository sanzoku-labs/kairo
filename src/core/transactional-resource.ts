import { Result } from './result'
import type { Resource, ResourceMethod } from './resource'
import { resource } from './resource'
import type {
  TransactionContext,
  TransactionManager,
  TransactionalResource,
  CompensationFunction,
} from './transactions'

/**
 * Transactional resource configuration
 */
export interface TransactionalResourceConfig {
  readonly enableTransactions?: boolean | undefined
  readonly autoRegisterCompensation?: boolean | undefined
  readonly idempotencyKey?: ((operation: string, data: unknown) => string) | undefined
  readonly rollbackStrategies?: Record<string, CompensationFunction> | undefined
  readonly baseUrl?: string | undefined
  readonly timeout?: number | undefined
  readonly retry?: { times: number; delay?: number } | undefined
}

/**
 * HTTP operation that can be compensated
 */
export interface CompensatableOperation {
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  readonly path: string
  readonly compensationMethod?: 'DELETE' | 'PUT' | 'PATCH' | 'POST' | undefined
  readonly compensationPath?: string | undefined
  readonly compensationData?: ((originalData: unknown, response: unknown) => unknown) | undefined
  readonly idempotent?: boolean | undefined
}

/**
 * Resource with internal operations access
 */
interface ResourceWithOperations {
  readonly _operations: Record<string, { method?: string; path?: string }>
}

/**
 * Transaction-aware resource implementation
 */
export class TransactionalResourceImpl<T extends Record<string, ResourceMethod>>
  implements TransactionalResource
{
  private readonly baseResource: Resource<T>
  private readonly transactionManager: TransactionManager
  private readonly config: TransactionalResourceConfig
  private readonly pendingOperations = new Map<
    string,
    Array<{
      operation: string
      request: unknown
      response: unknown
      compensationData?: unknown
    }>
  >()

  constructor(
    private readonly resourceName: string,
    operations: T,
    transactionManager: TransactionManager,
    config: TransactionalResourceConfig = {}
  ) {
    this.transactionManager = transactionManager
    this.config = {
      enableTransactions: true,
      autoRegisterCompensation: true,
      ...config,
    }

    // Create base resource
    const resourceConfig = {
      ...(config.baseUrl && { baseUrl: config.baseUrl }),
      ...(config.timeout && { timeout: config.timeout }),
      ...(config.retry && { retry: config.retry }),
    }
    this.baseResource = resource(this.resourceName, operations, resourceConfig)

    // Register compensation functions if enabled
    if (this.config.autoRegisterCompensation) {
      this.registerCompensationFunctions(this.resourceName, operations)
    }

    // Create transactional operation proxies
    this.createTransactionalOperations(operations)
  }

  /**
   * Create transactional versions of operations
   */
  private createTransactionalOperations(operations: T): void {
    for (const [operationName] of Object.entries(operations)) {
      ;(this as Record<string, unknown>)[operationName] = {
        run: async (input: unknown) => {
          const context = this.getCurrentTransactionContext()

          if (context && this.config.enableTransactions) {
            return await this.executeResourceInTransaction(operationName, input, context)
          } else {
            const resourceOperation = this.baseResource[operationName as keyof T] as {
              run: (input: unknown) => Promise<unknown>
            }
            return await resourceOperation.run(input)
          }
        },

        // Delegate other methods to base resource
        mock: (this.baseResource[operationName as keyof T] as { mock?: unknown }).mock,
        contract: (this.baseResource[operationName as keyof T] as { contract?: unknown }).contract,
      }
    }
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
   * Execute resource operation within transaction
   */
  private async executeResourceInTransaction(
    operationName: string,
    input: unknown,
    context: TransactionContext
  ): Promise<Result<Error, unknown>> {
    try {
      // Check if operation is idempotent
      const idempotencyKey = this.config.idempotencyKey?.(operationName, input)

      if (idempotencyKey) {
        // Check if we've already executed this operation in this transaction
        const operations = this.pendingOperations.get(context.transactionId) || []
        const existingOp = operations.find(
          op =>
            op.operation === operationName &&
            this.config.idempotencyKey?.(op.operation, op.request) === idempotencyKey
        )

        if (existingOp) {
          return Result.Ok(existingOp.response)
        }
      }

      // Execute the operation
      const operation = this.baseResource[operationName as keyof T] as {
        run: (input: unknown) => Promise<Result<Error, unknown>>
      }
      const result = await operation.run(input)

      if (Result.isErr(result)) {
        return Result.Err(
          result.error instanceof Error ? result.error : new Error(String(result.error))
        )
      }

      const response = result.value

      // Record operation for potential rollback
      if (!this.pendingOperations.has(context.transactionId)) {
        this.pendingOperations.set(context.transactionId, [])
      }

      const compensationData = this.generateCompensationData(operationName, input, response)

      this.pendingOperations.get(context.transactionId)!.push({
        operation: operationName,
        request: input,
        response,
        compensationData,
      })

      // Add operation to transaction
      this.transactionManager.addOperation(context.transactionId, {
        type: 'custom',
        resource: this.getResourceName(),
        data: { operation: operationName, input, response },
        compensationData,
      })

      return Result.Ok(response)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Generate compensation data for operation
   */
  private generateCompensationData(
    operationName: string,
    input: unknown,
    response: unknown
  ): unknown {
    const rollbackStrategy = this.config.rollbackStrategies?.[operationName]

    if (rollbackStrategy) {
      return { strategy: 'custom', operationName, input, response }
    }

    // Default compensation strategies based on HTTP methods
    const operation = (this.baseResource as unknown as ResourceWithOperations)._operations[
      operationName
    ]
    if (!operation) return null

    const method = operation.method?.toUpperCase()

    switch (method) {
      case 'POST':
        // For POST (create), compensation is DELETE
        return {
          strategy: 'http',
          method: 'DELETE',
          path: operation.path || '',
          data: this.extractIdFromResponse(response),
        }

      case 'PUT':
      case 'PATCH':
        // For PUT/PATCH (update), compensation is PUT with original data
        return {
          strategy: 'http',
          method: 'PUT',
          path: operation.path || '',
          data: input, // Original data to restore
        }

      case 'DELETE':
        // For DELETE, compensation is POST/PUT to recreate
        return {
          strategy: 'http',
          method: 'POST',
          path: (operation.path || '').replace(/:id$/, ''), // Remove ID parameter
          data: response, // The deleted entity data
        }

      default:
        // GET operations typically don't need compensation
        return null
    }
  }

  /**
   * Extract ID from response for compensation
   */
  private extractIdFromResponse(response: unknown): unknown {
    if (typeof response === 'object' && response !== null) {
      const responseObj = response as Record<string, unknown>
      return responseObj.id || responseObj._id || responseObj.uuid || response
    }
    return response
  }

  /**
   * Prepare operation for commit (two-phase commit)
   */
  prepare(_context: TransactionContext): Promise<Result<Error, void>> {
    try {
      // For HTTP resources, we can't really "prepare" operations
      // since HTTP is stateless. We just validate that operations
      // can potentially be rolled back if needed
      const operations = this.pendingOperations.get(_context.transactionId)
      if (!operations) {
        return Promise.resolve(Result.Ok(undefined))
      }

      // Validate compensation strategies exist for non-idempotent operations
      for (const operation of operations) {
        if (!operation.compensationData && !this.isIdempotentOperation(operation.operation)) {
          console.warn(`No compensation strategy for operation ${operation.operation}`)
        }
      }

      return Promise.resolve(Result.Ok(undefined))
    } catch (error) {
      return Promise.resolve(Result.Err(error as Error))
    }
  }

  /**
   * Commit prepared operations
   */
  commitPrepared(context: TransactionContext): Promise<Result<Error, void>> {
    try {
      // For HTTP resources, operations are already committed when executed
      // Just clean up tracking data
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

      // Execute compensation operations in reverse order
      for (let i = operations.length - 1; i >= 0; i--) {
        const operation = operations[i]!

        try {
          await this.compensateOperation(operation)
        } catch (error) {
          console.error(`Failed to compensate operation ${operation.operation}:`, error)
          // Continue with other compensations
        }
      }

      // Clean up tracking data
      this.pendingOperations.delete(context.transactionId)
      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Compensate a single operation
   */
  private async compensateOperation(operation: {
    operation: string
    request: unknown
    response: unknown
    compensationData?: unknown
  }): Promise<void> {
    if (!operation.compensationData) {
      return // No compensation needed/possible
    }

    const { strategy } = operation.compensationData as { strategy: string }

    if (strategy === 'custom') {
      // Use custom rollback strategy
      const rollbackFn = this.config.rollbackStrategies?.[operation.operation]
      if (rollbackFn) {
        await rollbackFn({
          id: 'compensation',
          type: 'custom',
          resource: this.getResourceName(),
          data: operation.compensationData,
          timestamp: Date.now(),
        })
      }
    } else if (strategy === 'http') {
      // Execute HTTP compensation request
      const { method, path, data } = operation.compensationData as {
        method: string
        path: string
        data: unknown
      }

      // This would make an actual HTTP request to compensate
      // For now, we'll just log the compensation action
      console.log(`Compensating ${operation.operation} with ${method} ${path}`, data)

      // In a real implementation, you would make the HTTP request here
      // await this.makeCompensationRequest(method, path, data)
    }
  }

  /**
   * Check if operation is idempotent
   */
  private isIdempotentOperation(operationName: string): boolean {
    const operation = (this.baseResource as unknown as ResourceWithOperations)._operations[
      operationName
    ]
    if (!operation) return false

    const method = operation.method?.toUpperCase()
    // GET, PUT, DELETE are typically idempotent
    return ['GET', 'PUT', 'DELETE'].includes(method || '')
  }

  /**
   * Get current transaction context
   */
  private getCurrentTransactionContext(): TransactionContext | null {
    // In a real implementation, this would get the current transaction context
    // from async local storage or similar mechanism
    return null
  }

  /**
   * Get resource name for transaction operations
   */
  private getResourceName(): string {
    return `resource:${this.resourceName}`
  }

  /**
   * Register compensation functions for resource operations
   */
  private registerCompensationFunctions(resourceName: string, operations: T): void {
    for (const [operationName] of Object.entries(operations)) {
      this.transactionManager.registerCompensation(
        'custom',
        `resource:${resourceName}:${operationName}`,
        async transactionOperation => {
          try {
            const {
              operation: opName,
              request,
              response,
            } = transactionOperation.data as {
              operation: string
              request: unknown
              response: unknown
            }
            const compensationData = this.generateCompensationData(opName, request, response)

            if (compensationData) {
              await this.compensateOperation({
                operation: opName,
                request,
                response,
                compensationData,
              })
            }

            return Result.Ok(undefined)
          } catch (error) {
            return Result.Err(error as Error)
          }
        }
      )
    }
  }
}

/**
 * Convert regular resource to transactional resource
 */
export function makeResourceTransactional<T extends Record<string, ResourceMethod>>(
  baseResource: Resource<T>,
  transactionManager: TransactionManager,
  config?: Partial<TransactionalResourceConfig>
): Resource<T> {
  return new Proxy(baseResource, {
    get(target, prop, receiver) {
      const originalProperty = Reflect.get(target, prop, receiver)

      if (
        typeof originalProperty === 'object' &&
        originalProperty !== null &&
        'run' in originalProperty
      ) {
        // This is a resource operation
        return {
          ...(originalProperty as object),
          run: async function (input: unknown) {
            const context = getCurrentTransactionContext()

            if (context && config?.enableTransactions !== false) {
              // Execute in transaction context
              return await executeResourceInTransaction(
                (input: unknown) =>
                  (
                    originalProperty as { run: (input: unknown) => Promise<Result<Error, unknown>> }
                  ).run(input),
                input,
                context,
                transactionManager,
                prop as string
              )
            } else {
              // Execute normally
              return await (originalProperty as { run: (input: unknown) => Promise<unknown> }).run(
                input
              )
            }
          },
        }
      }

      return originalProperty
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
 * Execute resource operation in transaction context
 */
async function executeResourceInTransaction(
  operation: (input: unknown) => Promise<Result<Error, unknown>>,
  input: unknown,
  context: TransactionContext,
  transactionManager: TransactionManager,
  operationName: string
): Promise<unknown> {
  // Add operation tracking
  const result = await operation(input)

  if (Result.isOk(result)) {
    transactionManager.addOperation(context.transactionId, {
      type: 'custom',
      resource: `resource:${operationName}`,
      data: { input, response: result.value },
    })
  }

  return result
}

/**
 * Create a transactional resource
 */
export function transactionalResource<T extends Record<string, ResourceMethod>>(
  name: string,
  operations: T,
  transactionManager: TransactionManager,
  config?: TransactionalResourceConfig
): TransactionalResourceImpl<T> & Resource<T> {
  const impl = new TransactionalResourceImpl(name, operations, transactionManager, config)
  return impl as TransactionalResourceImpl<T> & Resource<T>
}
