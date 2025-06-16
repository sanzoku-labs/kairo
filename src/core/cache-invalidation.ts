import { Result } from './result'
import { type KairoError, createError } from './errors'

// Forward declaration to avoid circular imports
interface CacheManager {
  get(key: string, namespace?: string): Promise<unknown>
  set(
    key: string,
    value: unknown,
    config?: unknown,
    namespace?: string
  ): Promise<Result<unknown, void>>
  delete(key: string, namespace?: string): Promise<number>
  invalidateByPattern(pattern: string | RegExp): Promise<number>
  invalidateByTag(tag: string): Promise<number>
}

export interface InvalidationError extends KairoError {
  code: 'INVALIDATION_ERROR'
  strategy: string
}

const createInvalidationError = (
  strategy: string,
  message: string,
  context = {}
): InvalidationError => ({
  ...createError('INVALIDATION_ERROR', message, context),
  code: 'INVALIDATION_ERROR',
  strategy,
})

// Cache invalidation strategies
export type InvalidationStrategy =
  | 'immediate'
  | 'lazy'
  | 'write-through'
  | 'write-behind'
  | 'time-based'
  | 'event-based'
  | 'dependency-based'

// Invalidation trigger configuration
export interface InvalidationTrigger {
  name: string
  condition: (key: string, value: unknown, metadata: Record<string, unknown>) => boolean
  action: InvalidationAction
  priority: number
  debounceMs?: number
}

export type InvalidationAction =
  | { type: 'delete'; keys?: string[] }
  | { type: 'refresh'; loader?: (key: string) => Promise<unknown> }
  | { type: 'cascade'; pattern: string | RegExp }
  | { type: 'tag'; tags: string[] }

// Dependency tracking for cache entries
export interface CacheDependency {
  type: 'resource' | 'pipeline' | 'schema' | 'custom'
  identifier: string
  version?: string
  expires?: number
}

// Cache warming strategy configuration
export interface WarmingStrategy {
  name: string
  enabled: boolean
  schedule?: {
    interval: number // ms
    immediate?: boolean
  }
  loader: (keys: string[]) => Promise<Array<{ key: string; value: unknown }>>
  priority: number
  maxConcurrency?: number
}

// Cache coherence policies for distributed scenarios
export interface CoherencePolicy {
  strategy: 'strong' | 'eventual' | 'session'
  syncInterval?: number
  conflictResolution?: 'timestamp' | 'version' | 'custom'
  customResolver?: (local: unknown, remote: unknown) => unknown
}

// Advanced invalidation manager
export class InvalidationManager {
  private triggers = new Map<string, InvalidationTrigger>()
  private dependencies = new Map<string, CacheDependency[]>()
  private warmingStrategies = new Map<string, WarmingStrategy>()
  private warmingIntervals = new Map<string, ReturnType<typeof globalThis.setInterval>>()
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(private cacheManager: CacheManager) {}

  // Register invalidation trigger
  registerTrigger(trigger: InvalidationTrigger): void {
    this.triggers.set(trigger.name, trigger)
  }

  // Remove invalidation trigger
  removeTrigger(name: string): void {
    this.triggers.delete(name)

    // Clear any pending debounce timer
    const timer = this.debounceTimers.get(name)
    if (timer) {
      globalThis.clearTimeout(timer)
      this.debounceTimers.delete(name)
    }
  }

  // Add dependency tracking for a cache entry
  addDependency(key: string, dependency: CacheDependency): void {
    const existing = this.dependencies.get(key) || []
    existing.push(dependency)
    this.dependencies.set(key, existing)
  }

  // Remove dependency tracking
  removeDependency(key: string, dependencyId: string): void {
    const existing = this.dependencies.get(key) || []
    const filtered = existing.filter(dep => dep.identifier !== dependencyId)

    if (filtered.length === 0) {
      this.dependencies.delete(key)
    } else {
      this.dependencies.set(key, filtered)
    }
  }

  // Invalidate cache based on dependency changes
  async invalidateByDependency(
    dependencyId: string,
    type?: CacheDependency['type']
  ): Promise<Result<InvalidationError, number>> {
    try {
      let invalidatedCount = 0
      const keysToInvalidate: string[] = []

      // Find all cache entries that depend on this identifier
      for (const [key, dependencies] of this.dependencies.entries()) {
        const hasMatchingDependency = dependencies.some(
          dep => dep.identifier === dependencyId && (!type || dep.type === type)
        )

        if (hasMatchingDependency) {
          keysToInvalidate.push(key)
        }
      }

      // Invalidate the dependent entries
      for (const key of keysToInvalidate) {
        const deleted = await this.cacheManager.delete(key)
        invalidatedCount += deleted

        // Remove dependency tracking for deleted entries
        this.dependencies.delete(key)
      }

      return Result.Ok(invalidatedCount)
    } catch (error) {
      return Result.Err(
        createInvalidationError(
          'dependency-based',
          error instanceof Error ? error.message : 'Dependency invalidation failed',
          { dependencyId, type }
        )
      )
    }
  }

  // Process cache operation through invalidation triggers
  async processOperation(
    operation: 'set' | 'get' | 'delete',
    key: string,
    value?: unknown,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    // Sort triggers by priority (higher first)
    const sortedTriggers = Array.from(this.triggers.values()).sort(
      (a, b) => b.priority - a.priority
    )

    for (const trigger of sortedTriggers) {
      try {
        if (trigger.condition(key, value, { ...metadata, operation })) {
          await this.executeTriggerAction(trigger, key, value)
        }
      } catch (error) {
        console.warn(`Invalidation trigger ${trigger.name} failed:`, error)
      }
    }
  }

  // Register cache warming strategy
  registerWarming(strategy: WarmingStrategy): void {
    this.warmingStrategies.set(strategy.name, strategy)

    if (strategy.enabled && strategy.schedule) {
      this.scheduleWarming(strategy)
    }
  }

  // Remove cache warming strategy
  removeWarming(name: string): void {
    this.warmingStrategies.delete(name)

    const interval = this.warmingIntervals.get(name)
    if (interval) {
      globalThis.clearInterval(interval)
      this.warmingIntervals.delete(name)
    }
  }

  // Manually trigger cache warming
  async warmCache(
    strategyName: string,
    keys?: string[]
  ): Promise<Result<InvalidationError, number>> {
    try {
      const strategy = this.warmingStrategies.get(strategyName)
      if (!strategy) {
        return Result.Err(
          createInvalidationError('warming', `Warming strategy '${strategyName}' not found`, {
            strategyName,
          })
        )
      }

      const keysToWarm = keys || (await this.getKeysForWarming(strategy))
      const entries = await strategy.loader(keysToWarm)

      let warmedCount = 0
      const maxConcurrency = strategy.maxConcurrency || 10

      // Process entries in batches to respect concurrency limits
      for (let i = 0; i < entries.length; i += maxConcurrency) {
        const batch = entries.slice(i, i + maxConcurrency)
        const promises = batch.map(async ({ key, value }) => {
          try {
            await this.cacheManager.set(key, value)
            return 1
          } catch (error) {
            console.warn(`Failed to warm cache for key ${key}:`, error)
            return 0
          }
        })

        const batchResults = await Promise.all(promises)
        warmedCount += batchResults.reduce((sum: number, count) => sum + count, 0)
      }

      return Result.Ok(warmedCount)
    } catch (error) {
      return Result.Err(
        createInvalidationError(
          'warming',
          error instanceof Error ? error.message : 'Cache warming failed',
          { strategyName, keys }
        )
      )
    }
  }

  // Consistency check for distributed caches
  async checkConsistency(
    policy: CoherencePolicy,
    sampleKeys?: string[]
  ): Promise<Result<InvalidationError, { consistent: boolean; conflicts: string[] }>> {
    try {
      // This is a placeholder for distributed cache consistency checking
      // In a real implementation, this would compare cache states across nodes

      const conflicts: string[] = []
      let consistent = true

      if (sampleKeys) {
        // Check specific keys for consistency
        for (const key of sampleKeys) {
          // Placeholder logic - would compare across cache layers/nodes
          const entry = await this.cacheManager.get(key)
          if (!entry) {
            conflicts.push(key)
            consistent = false
          }
        }
      }

      return Result.Ok({ consistent, conflicts })
    } catch (error) {
      return Result.Err(
        createInvalidationError(
          'consistency',
          error instanceof Error ? error.message : 'Consistency check failed',
          { policy, sampleKeys }
        )
      )
    }
  }

  // Get cache invalidation statistics
  getStats(): {
    triggers: Array<{ name: string; priority: number; enabled: boolean }>
    dependencies: number
    warmingStrategies: Array<{ name: string; enabled: boolean; lastRun?: number }>
  } {
    return {
      triggers: Array.from(this.triggers.values()).map(trigger => ({
        name: trigger.name,
        priority: trigger.priority,
        enabled: true,
      })),
      dependencies: this.dependencies.size,
      warmingStrategies: Array.from(this.warmingStrategies.values()).map(strategy => ({
        name: strategy.name,
        enabled: strategy.enabled,
        // lastRun would be tracked in real implementation
      })),
    }
  }

  // Clean up resources
  destroy(): void {
    // Clear all intervals
    for (const interval of this.warmingIntervals.values()) {
      globalThis.clearInterval(interval)
    }
    this.warmingIntervals.clear()

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      globalThis.clearTimeout(timer)
    }
    this.debounceTimers.clear()

    // Clear data structures
    this.triggers.clear()
    this.dependencies.clear()
    this.warmingStrategies.clear()
  }

  // Private helper methods
  private async executeTriggerAction(
    trigger: InvalidationTrigger,
    key: string,
    _value?: unknown
  ): Promise<void> {
    const executeAction = async (): Promise<void> => {
      switch (trigger.action.type) {
        case 'delete':
          if (trigger.action.keys) {
            for (const keyToDelete of trigger.action.keys) {
              await this.cacheManager.delete(keyToDelete)
            }
          } else {
            await this.cacheManager.delete(key)
          }
          break

        case 'refresh':
          if (trigger.action.loader) {
            try {
              const newValue = await trigger.action.loader(key)
              await this.cacheManager.set(key, newValue)
            } catch (error) {
              console.warn(`Failed to refresh cache for key ${key}:`, error)
            }
          }
          break

        case 'cascade':
          await this.cacheManager.invalidateByPattern(trigger.action.pattern)
          break

        case 'tag':
          for (const tag of trigger.action.tags) {
            await this.cacheManager.invalidateByTag(tag)
          }
          break
      }
    }

    if (trigger.debounceMs && trigger.debounceMs > 0) {
      // Debounce the action
      const existingTimer = this.debounceTimers.get(trigger.name)
      if (existingTimer) {
        globalThis.clearTimeout(existingTimer)
      }

      const timer = globalThis.setTimeout(() => {
        void executeAction()
      }, trigger.debounceMs)
      this.debounceTimers.set(trigger.name, timer)
    } else {
      // Execute immediately
      await executeAction()
    }
  }

  private scheduleWarming(strategy: WarmingStrategy): void {
    if (!strategy.schedule) return

    const executeWarming = async () => {
      if (!strategy.enabled) return

      try {
        await this.warmCache(strategy.name)
      } catch (error) {
        console.warn(`Scheduled warming for ${strategy.name} failed:`, error)
      }
    }

    // Execute immediately if requested
    if (strategy.schedule.immediate) {
      void executeWarming()
    }

    // Schedule recurring execution
    const interval = globalThis.setInterval(() => {
      void executeWarming()
    }, strategy.schedule.interval)
    this.warmingIntervals.set(strategy.name, interval)
  }

  private getKeysForWarming(_strategy: WarmingStrategy): Promise<string[]> {
    // This would typically come from application-specific logic
    // For now, return empty array - applications would override this
    return Promise.resolve([])
  }
}

// Predefined invalidation strategies
export const invalidationStrategies = {
  // Immediate invalidation on write
  writeThrough: (): InvalidationTrigger => ({
    name: 'write-through',
    condition: (_key, _value, metadata) =>
      (metadata as { operation?: string })?.operation === 'set',
    action: {
      type: 'cascade',
      pattern: /^.*/, // Match all related keys
    },
    priority: 100,
  }),

  // Time-based invalidation
  timeBasedCleanup: (intervalMs: number = 3600000): InvalidationTrigger => ({
    name: 'time-based-cleanup',
    condition: () => Math.random() < 0.01, // 1% chance to trigger cleanup
    action: { type: 'delete' },
    priority: 10,
    debounceMs: intervalMs,
  }),

  // Tag-based invalidation for related entries
  tagInvalidation: (tags: string[]): InvalidationTrigger => ({
    name: 'tag-invalidation',
    condition: (_key, _value, metadata) => {
      const meta = metadata as { operation?: string; tags?: string[] }
      return Boolean(
        meta.operation === 'set' &&
          meta.tags &&
          Array.isArray(meta.tags) &&
          tags.some(tag => meta.tags!.includes(tag))
      )
    },
    action: { type: 'tag', tags },
    priority: 50,
  }),

  // Resource-based invalidation
  resourceInvalidation: (resourcePattern: string): InvalidationTrigger => ({
    name: 'resource-invalidation',
    condition: key => key.includes(resourcePattern),
    action: { type: 'cascade', pattern: new RegExp(`^pipeline:.*${resourcePattern}`) },
    priority: 75,
  }),
}

// Predefined warming strategies
export const warmingStrategies = {
  // Popular keys warming
  popularKeys: (
    keyLoader: () => Promise<string[]>,
    valueLoader: (keys: string[]) => Promise<Array<{ key: string; value: unknown }>>
  ): WarmingStrategy => ({
    name: 'popular-keys',
    enabled: true,
    schedule: {
      interval: 1800000, // 30 minutes
      immediate: false,
    },
    loader: async keys => {
      const popularKeys = keys.length > 0 ? keys : await keyLoader()
      return valueLoader(popularKeys.slice(0, 100)) // Limit to top 100
    },
    priority: 1,
    maxConcurrency: 5,
  }),

  // Predictive warming based on patterns
  predictiveWarming: (
    predictor: (currentTime: Date) => Promise<string[]>,
    loader: (keys: string[]) => Promise<Array<{ key: string; value: unknown }>>
  ): WarmingStrategy => ({
    name: 'predictive-warming',
    enabled: true,
    schedule: {
      interval: 900000, // 15 minutes
      immediate: true,
    },
    loader: async () => {
      const predictedKeys = await predictor(new Date())
      return loader(predictedKeys)
    },
    priority: 2,
    maxConcurrency: 10,
  }),
}
