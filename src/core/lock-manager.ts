import { Result } from './result'
import type { LockManager } from './transactions'

/**
 * Lock types
 */
export type LockType = 'shared' | 'exclusive'

/**
 * Lock entry
 */
export interface LockEntry {
  readonly resource: string
  readonly type: LockType
  readonly transactionId: string
  readonly acquiredAt: number
  readonly expiresAt?: number
}

/**
 * Lock conflict resolution strategy
 */
export type LockConflictStrategy = 'wait' | 'fail' | 'timeout'

/**
 * Lock manager configuration
 */
export interface LockManagerConfig {
  readonly defaultTimeout: number
  readonly maxWaitTime: number
  readonly conflictStrategy: LockConflictStrategy
  readonly enableDeadlockDetection: boolean
  readonly deadlockCheckInterval: number
}

/**
 * Default lock manager configuration
 */
const DEFAULT_LOCK_CONFIG: LockManagerConfig = {
  defaultTimeout: 30000, // 30 seconds
  maxWaitTime: 60000, // 1 minute
  conflictStrategy: 'wait',
  enableDeadlockDetection: true,
  deadlockCheckInterval: 5000, // 5 seconds
}

/**
 * In-memory lock manager implementation
 */
export class InMemoryLockManager implements LockManager {
  private readonly locks = new Map<string, LockEntry[]>()
  private readonly waitingQueue = new Map<
    string,
    Array<{
      transactionId: string
      lockType: LockType
      resolve: (result: Result<Error, void>) => void
      requestedAt: number
    }>
  >()
  private readonly transactionLocks = new Map<string, Set<string>>()
  private deadlockCheckTimer?: ReturnType<typeof globalThis.setInterval>

  constructor(private readonly config: LockManagerConfig = DEFAULT_LOCK_CONFIG) {
    if (config.enableDeadlockDetection) {
      this.startDeadlockDetection()
    }
  }

  /**
   * Acquire lock for resource
   */
  async acquireLock(
    resource: string,
    lockType: LockType,
    transactionId: string
  ): Promise<Result<Error, void>> {
    return new Promise(resolve => {
      const result = this.tryAcquireLock(resource, lockType, transactionId)

      if (Result.isOk(result)) {
        resolve(result)
        return
      }

      // Lock conflict, handle based on strategy
      if (this.config.conflictStrategy === 'fail') {
        resolve(Result.Err(new Error(`Lock conflict for resource ${resource}`)))
        return
      }

      if (this.config.conflictStrategy === 'timeout') {
        setTimeout(() => {
          resolve(Result.Err(new Error(`Lock timeout for resource ${resource}`)))
        }, this.config.defaultTimeout)
      }

      // Add to waiting queue
      if (!this.waitingQueue.has(resource)) {
        this.waitingQueue.set(resource, [])
      }

      this.waitingQueue.get(resource)!.push({
        transactionId,
        lockType,
        resolve,
        requestedAt: Date.now(),
      })

      // Check for timeout
      setTimeout(() => {
        const queue = this.waitingQueue.get(resource)
        if (queue) {
          const index = queue.findIndex(w => w.transactionId === transactionId)
          if (index !== -1) {
            queue.splice(index, 1)
            resolve(Result.Err(new Error(`Lock acquisition timeout for resource ${resource}`)))
          }
        }
      }, this.config.maxWaitTime)
    })
  }

  /**
   * Try to acquire lock immediately
   */
  private tryAcquireLock(
    resource: string,
    lockType: LockType,
    transactionId: string
  ): Result<Error, void> {
    const existingLocks = this.locks.get(resource) || []

    // Check if transaction already has a lock on this resource
    const existingLock = existingLocks.find(lock => lock.transactionId === transactionId)
    if (existingLock) {
      // Lock upgrade/downgrade logic
      if (existingLock.type === 'exclusive' || lockType === 'shared') {
        return Result.Ok(undefined) // Already have sufficient lock
      }
      // Need to upgrade shared to exclusive, check if possible
      if (existingLocks.length > 1) {
        return Result.Err(new Error('Cannot upgrade to exclusive lock, other shared locks exist'))
      }
    }

    // Check compatibility with existing locks
    if (this.isLockCompatible(existingLocks, lockType)) {
      const lockEntry: LockEntry = {
        resource,
        type: lockType,
        transactionId,
        acquiredAt: Date.now(),
        ...(this.config.defaultTimeout > 0 && {
          expiresAt: Date.now() + this.config.defaultTimeout,
        }),
      }

      // Add lock
      if (!this.locks.has(resource)) {
        this.locks.set(resource, [])
      }
      this.locks.get(resource)!.push(lockEntry)

      // Track locks by transaction
      if (!this.transactionLocks.has(transactionId)) {
        this.transactionLocks.set(transactionId, new Set())
      }
      this.transactionLocks.get(transactionId)!.add(resource)

      return Result.Ok(undefined)
    }

    return Result.Err(new Error('Lock conflict'))
  }

  /**
   * Check if new lock is compatible with existing locks
   */
  private isLockCompatible(existingLocks: LockEntry[], newLockType: LockType): boolean {
    if (existingLocks.length === 0) {
      return true
    }

    // Exclusive locks are not compatible with any other locks
    if (newLockType === 'exclusive') {
      return false
    }

    // Shared locks are compatible with other shared locks only
    return existingLocks.every(lock => lock.type === 'shared')
  }

  /**
   * Release lock
   */
  releaseLock(resource: string, transactionId: string): Promise<Result<Error, void>> {
    try {
      const locks = this.locks.get(resource)
      if (!locks) {
        return Promise.resolve(Result.Err(new Error(`No locks found for resource ${resource}`)))
      }

      const lockIndex = locks.findIndex(lock => lock.transactionId === transactionId)
      if (lockIndex === -1) {
        return Promise.resolve(
          Result.Err(
            new Error(`No lock found for transaction ${transactionId} on resource ${resource}`)
          )
        )
      }

      // Remove lock
      locks.splice(lockIndex, 1)
      if (locks.length === 0) {
        this.locks.delete(resource)
      }

      // Remove from transaction tracking
      const transactionLockSet = this.transactionLocks.get(transactionId)
      if (transactionLockSet) {
        transactionLockSet.delete(resource)
        if (transactionLockSet.size === 0) {
          this.transactionLocks.delete(transactionId)
        }
      }

      // Process waiting queue
      this.processWaitingQueue(resource)

      return Promise.resolve(Result.Ok(undefined))
    } catch (error) {
      return Promise.resolve(Result.Err(error as Error))
    }
  }

  /**
   * Release all locks for transaction
   */
  async releaseAllLocks(transactionId: string): Promise<Result<Error, void>> {
    try {
      const resources = this.transactionLocks.get(transactionId)
      if (!resources) {
        return Result.Ok(undefined) // No locks to release
      }

      const resourceList = Array.from(resources)
      for (const resource of resourceList) {
        const releaseResult = await this.releaseLock(resource, transactionId)
        if (Result.isErr(releaseResult)) {
          // Log error but continue releasing other locks
          console.error(`Failed to release lock for resource ${resource}:`, releaseResult.error)
        }
      }

      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Check if resource is locked
   */
  isLocked(resource: string): boolean {
    const locks = this.locks.get(resource)
    return locks !== undefined && locks.length > 0
  }

  /**
   * Get lock holder
   */
  getLockHolder(resource: string): string | null {
    const locks = this.locks.get(resource)
    if (!locks || locks.length === 0) {
      return null
    }
    return locks[0]!.transactionId
  }

  /**
   * Process waiting queue for a resource
   */
  private processWaitingQueue(resource: string): void {
    const queue = this.waitingQueue.get(resource)
    if (!queue || queue.length === 0) {
      return
    }

    const waitingRequest = queue[0]!
    const result = this.tryAcquireLock(
      resource,
      waitingRequest.lockType,
      waitingRequest.transactionId
    )

    if (Result.isOk(result)) {
      queue.shift() // Remove from queue
      waitingRequest.resolve(result)

      // Try to process more requests (for shared locks)
      if (waitingRequest.lockType === 'shared') {
        this.processWaitingQueue(resource)
      }
    }
  }

  /**
   * Start deadlock detection
   */
  private startDeadlockDetection(): void {
    this.deadlockCheckTimer = globalThis.setInterval(() => {
      this.detectDeadlocks()
      this._cleanupExpiredLocks()
    }, this.config.deadlockCheckInterval)
  }

  /**
   * Detect deadlocks using cycle detection in wait-for graph
   */
  private detectDeadlocks(): void {
    const waitForGraph = this.buildWaitForGraph()
    const cycles = this.findCycles(waitForGraph)

    for (const cycle of cycles) {
      this.resolveDeadlock(cycle)
    }
  }

  /**
   * Build wait-for graph
   */
  private buildWaitForGraph(): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>()

    // For each waiting transaction, find what it's waiting for
    for (const [resource, queue] of this.waitingQueue) {
      const locksOnResource = this.locks.get(resource) || []

      for (const waiting of queue) {
        if (!graph.has(waiting.transactionId)) {
          graph.set(waiting.transactionId, new Set())
        }

        // Waiting transaction depends on all current lock holders
        for (const lock of locksOnResource) {
          graph.get(waiting.transactionId)!.add(lock.transactionId)
        }
      }
    }

    return graph
  }

  /**
   * Find cycles in wait-for graph using DFS
   */
  private findCycles(graph: Map<string, Set<string>>): string[][] {
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        const cycle = this.dfsForCycle(graph, node, visited, recursionStack, [])
        if (cycle.length > 0) {
          cycles.push(cycle)
        }
      }
    }

    return cycles
  }

  /**
   * DFS to find cycles
   */
  private dfsForCycle(
    graph: Map<string, Set<string>>,
    node: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): string[] {
    visited.add(node)
    recursionStack.add(node)
    path.push(node)

    const neighbors = graph.get(node) || new Set()
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = this.dfsForCycle(graph, neighbor, visited, recursionStack, [...path])
        if (cycle.length > 0) {
          return cycle
        }
      } else if (recursionStack.has(neighbor)) {
        // Found cycle
        const cycleStart = path.indexOf(neighbor)
        return path.slice(cycleStart)
      }
    }

    recursionStack.delete(node)
    return []
  }

  /**
   * Resolve deadlock by aborting youngest transaction
   */
  private resolveDeadlock(cycle: string[]): void {
    // Find youngest transaction in cycle (latest start time)
    let youngestTransaction = cycle[0]!
    let latestStartTime = 0

    for (const transactionId of cycle) {
      // Get transaction start time from active transactions
      // This would need to be coordinated with the transaction manager
      const startTime = this.getTransactionStartTime(transactionId)
      if (startTime > latestStartTime) {
        latestStartTime = startTime
        youngestTransaction = transactionId
      }
    }

    // Release all locks for youngest transaction to break deadlock
    void this.releaseAllLocks(youngestTransaction)

    console.warn(`Deadlock detected and resolved by aborting transaction ${youngestTransaction}`)
  }

  /**
   * Get transaction start time (placeholder - would be implemented with transaction manager integration)
   */
  private getTransactionStartTime(_transactionId: string): number {
    // In a real implementation, this would query the transaction manager
    return Date.now()
  }

  /**
   * Clean up expired locks
   */
  private _cleanupExpiredLocks(): void {
    const now = Date.now()

    for (const [resource, locks] of this.locks) {
      const validLocks = locks.filter(lock => !lock.expiresAt || lock.expiresAt > now)

      if (validLocks.length !== locks.length) {
        if (validLocks.length === 0) {
          this.locks.delete(resource)
        } else {
          this.locks.set(resource, validLocks)
        }

        // Process waiting queue for this resource
        this.processWaitingQueue(resource)
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.deadlockCheckTimer) {
      globalThis.clearInterval(this.deadlockCheckTimer)
    }
  }
}

/**
 * Create a new lock manager instance
 */
export function createLockManager(config?: Partial<LockManagerConfig>): LockManager {
  return new InMemoryLockManager({ ...DEFAULT_LOCK_CONFIG, ...config })
}
