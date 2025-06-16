import { Result } from '../../core/result'
import { type KairoError, createError } from '../../core/errors'
import { pipe } from '../../utils/fp'
import {
  InvalidationManager,
  type InvalidationTrigger,
  type WarmingStrategy,
} from './cache-invalidation'
import { CacheAnalytics, type AnalyticsConfig, defaultAnalyticsConfig } from './cache-analytics'

export interface CacheError extends KairoError {
  code: 'CACHE_ERROR'
  operation: string
}

const createCacheError = (operation: string, message: string, context = {}): CacheError => ({
  ...createError('CACHE_ERROR', message, context),
  code: 'CACHE_ERROR',
  operation,
})

// Cache entry with enhanced metadata
export interface CacheEntry<T = unknown> {
  value: T
  timestamp: number
  ttl: number
  hits: number
  lastAccessed: number
  tags: string[]
  size: number
  metadata: Record<string, unknown>
}

// Cache statistics for monitoring
export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  size: number
  memoryUsage: number
  averageAccessTime: number
  entries: Array<{
    key: string
    hits: number
    age: number
    size: number
    lastAccessed: number
  }>
}

// Cache configuration options
export interface CacheConfig {
  ttl?: number
  maxSize?: number
  maxMemory?: number
  evictionPolicy?: 'lru' | 'lfu' | 'fifo' | 'ttl'
  tags?: string[]
  keyGenerator?: (input: unknown) => string
  shouldCache?: (value: unknown) => boolean
  onEvict?: (key: string, entry: CacheEntry) => void
  compression?: boolean
  namespace?: string
  analytics?: Partial<AnalyticsConfig>
}

// Multi-level cache layer configuration
export interface CacheLayerConfig extends CacheConfig {
  name: string
  priority: number
  storage: CacheStorage
}

// Abstract cache storage interface
export abstract class CacheStorage {
  abstract get<T>(key: string): Promise<CacheEntry<T> | undefined>
  abstract set<T>(key: string, entry: CacheEntry<T>): Promise<void>
  abstract delete(key: string): Promise<boolean>
  abstract clear(): Promise<void>
  abstract keys(): Promise<string[]>
  abstract size(): Promise<number>
  abstract invalidateByPattern(pattern: string | RegExp): Promise<number>
  abstract invalidateByTag(tag: string): Promise<number>
}

// In-memory cache storage (enhanced version of existing)
export class MemoryStorage extends CacheStorage {
  private cache = new Map<string, CacheEntry>()
  private accessOrder = new Map<string, number>() // For LRU
  private accessCount = new Map<string, number>() // For LFU
  private insertionOrder: string[] = [] // For FIFO
  private currentMemoryUsage = 0

  constructor(private config: CacheConfig = {}) {
    super()
  }

  async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    if (!entry) return undefined

    // Check TTL expiration
    if (this.isExpired(entry)) {
      await this.delete(key)
      return undefined
    }

    // Update access metadata
    entry.hits++
    entry.lastAccessed = Date.now()
    this.accessOrder.set(key, Date.now())
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1)

    return entry
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    // Check if we need to evict entries
    await this.enforceConstraints(key, entry)

    // Set the entry
    this.cache.set(key, entry as CacheEntry)
    this.accessOrder.set(key, Date.now())
    this.accessCount.set(key, 1)

    // Track insertion order for FIFO
    if (!this.insertionOrder.includes(key)) {
      this.insertionOrder.push(key)
    }

    this.currentMemoryUsage += entry.size
  }

  async delete(key: string): Promise<boolean> {
    await Promise.resolve()
    const entry = this.cache.get(key)
    if (!entry) return false

    this.cache.delete(key)
    this.accessOrder.delete(key)
    this.accessCount.delete(key)
    this.insertionOrder = this.insertionOrder.filter(k => k !== key)
    this.currentMemoryUsage -= entry.size

    this.config.onEvict?.(key, entry)
    return true
  }

  async clear(): Promise<void> {
    await Promise.resolve()
    this.cache.clear()
    this.accessOrder.clear()
    this.accessCount.clear()
    this.insertionOrder = []
    this.currentMemoryUsage = 0
  }

  async keys(): Promise<string[]> {
    await Promise.resolve()
    return Array.from(this.cache.keys())
  }

  async size(): Promise<number> {
    await Promise.resolve()
    return this.cache.size
  }

  async invalidateByPattern(pattern: string | RegExp): Promise<number> {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    const keysToDelete: string[] = []

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key)
    }

    return keysToDelete.length
  }

  async invalidateByTag(tag: string): Promise<number> {
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key)
    }

    return keysToDelete.length
  }

  getMemoryUsage(): number {
    return this.currentMemoryUsage
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private async enforceConstraints<T>(_newKey: string, newEntry: CacheEntry<T>): Promise<void> {
    // Check max size constraint
    if (this.config.maxSize && this.cache.size >= this.config.maxSize) {
      await this.evictEntries(1)
    }

    // Check max memory constraint
    if (this.config.maxMemory && this.currentMemoryUsage + newEntry.size > this.config.maxMemory) {
      const bytesToEvict = this.currentMemoryUsage + newEntry.size - this.config.maxMemory
      await this.evictByMemory(bytesToEvict)
    }
  }

  private async evictEntries(count: number): Promise<void> {
    const policy = this.config.evictionPolicy || 'lru'
    const keysToEvict = this.getEvictionCandidates(count, policy)

    for (const key of keysToEvict) {
      await this.delete(key)
    }
  }

  private async evictByMemory(bytesToEvict: number): Promise<void> {
    const policy = this.config.evictionPolicy || 'lru'
    let evictedBytes = 0

    while (evictedBytes < bytesToEvict && this.cache.size > 0) {
      const candidates = this.getEvictionCandidates(1, policy)
      if (candidates.length === 0) break

      const key = candidates[0]!
      const entry = this.cache.get(key)
      if (entry) {
        evictedBytes += entry.size
        await this.delete(key)
      }
    }
  }

  private getEvictionCandidates(count: number, policy: string): string[] {
    const entries = Array.from(this.cache.entries())

    const sortAndSlice = (sortFn: (a: [string, CacheEntry], b: [string, CacheEntry]) => number) =>
      pipe(
        (entries: [string, CacheEntry][]) => entries.sort(sortFn),
        sorted => sorted.slice(0, count),
        sliced => sliced.map(([key]) => key)
      )(entries)

    switch (policy) {
      case 'lru':
        return sortAndSlice(([a], [b]) => (this.accessOrder.get(a) || 0) - (this.accessOrder.get(b) || 0))
      case 'lfu':
        return sortAndSlice(([a], [b]) => (this.accessCount.get(a) || 0) - (this.accessCount.get(b) || 0))
      case 'fifo':
        return this.insertionOrder.slice(0, count)
      case 'ttl':
        return sortAndSlice(([, a], [, b]) => a.timestamp - b.timestamp)
      default:
        return entries.slice(0, count).map(([key]) => key)
    }
  }
}

// Redis-compatible distributed cache storage
export class RedisStorage extends CacheStorage {
  private isConnected = false

  constructor(
    private config: {
      host?: string
      port?: number
      password?: string
      db?: number
    } = {}
  ) {
    super()
    void this.config // Prevent unused warning
    // Placeholder for Redis connection
    // In a real implementation, this would connect to Redis
    this.isConnected = false
  }

  async get<T>(_key: string): Promise<CacheEntry<T> | undefined> {
    await Promise.resolve()
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }
    // Placeholder implementation
    // In a real implementation, this would use a Redis client
    return undefined
  }

  async set<T>(_key: string, _entry: CacheEntry<T>): Promise<void> {
    await Promise.resolve()
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }
    // Placeholder implementation
  }

  async delete(_key: string): Promise<boolean> {
    await Promise.resolve()
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }
    return false
  }

  async clear(): Promise<void> {
    await Promise.resolve()
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }
  }

  async keys(): Promise<string[]> {
    await Promise.resolve()
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }
    return []
  }

  async size(): Promise<number> {
    await Promise.resolve()
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }
    return 0
  }

  async invalidateByPattern(_pattern: string | RegExp): Promise<number> {
    await Promise.resolve()
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }
    return 0
  }

  async invalidateByTag(_tag: string): Promise<number> {
    await Promise.resolve()
    if (!this.isConnected) {
      throw new Error('Redis not connected')
    }
    return 0
  }

  async connect(): Promise<void> {
    await Promise.resolve()
    // Placeholder for Redis connection logic
    // this.client = new Redis(this.config)
    this.isConnected = true
  }

  async disconnect(): Promise<void> {
    await Promise.resolve()
    // Placeholder for Redis disconnection logic
    this.isConnected = false
  }
}

// Multi-level cache manager
export class CacheManager {
  private layers: Map<string, { storage: CacheStorage; config: CacheLayerConfig }> = new Map()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    memoryUsage: 0,
    averageAccessTime: 0,
    entries: [],
  }
  private invalidationManager: InvalidationManager
  private analytics: CacheAnalytics

  constructor(private defaultConfig: CacheConfig = {}) {
    this.invalidationManager = new InvalidationManager(this)

    const analyticsConfig = {
      ...defaultAnalyticsConfig,
      ...defaultConfig.analytics,
    }
    this.analytics = new CacheAnalytics(analyticsConfig)
  }

  // Add a cache layer
  addLayer(config: CacheLayerConfig): void {
    this.layers.set(config.name, { storage: config.storage, config })
  }

  // Remove a cache layer
  removeLayer(name: string): void {
    this.layers.delete(name)
  }

  // Get value from cache (checks all layers by priority)
  async get<T>(key: string, namespace?: string): Promise<CacheEntry<T> | undefined> {
    const fullKey = this.buildKey(key, namespace)
    const startTime = Date.now()

    // Sort layers by priority (highest first)
    const sortedLayers = Array.from(this.layers.entries()).sort(
      ([, a], [, b]) => b.config.priority - a.config.priority
    )

    for (const [layerName, { storage }] of sortedLayers) {
      try {
        const entry = await storage.get<T>(fullKey)
        if (entry) {
          const responseTime = Date.now() - startTime
          this.stats.hits++
          this.updateAverageAccessTime(responseTime)

          // Record analytics
          this.analytics.recordOperation('hit', responseTime, { layerName, namespace })
          this.analytics.recordLayerMetrics(layerName, 'hit', { key: fullKey })

          // Promote to higher priority layers (cache warming)
          await this.promoteToHigherLayers(fullKey, entry, layerName)

          // Process invalidation triggers for get operations
          await this.invalidationManager.processOperation('get', fullKey, entry.value, {
            hits: entry.hits,
            age: Date.now() - entry.timestamp,
          })

          return entry
        }
      } catch (error) {
        console.warn(`Cache layer ${layerName} failed:`, error)
      }
    }

    this.stats.misses++

    // Record cache miss
    const responseTime = Date.now() - startTime
    this.analytics.recordOperation('miss', responseTime, { namespace })

    return undefined
  }

  // Set value in cache (writes to all layers)
  async set<T>(
    key: string,
    value: T,
    config: Partial<CacheConfig> = {},
    namespace?: string
  ): Promise<Result<CacheError, void>> {
    try {
      const fullKey = this.buildKey(key, namespace)
      const mergedConfig = { ...this.defaultConfig, ...config }

      // Calculate entry size (approximate)
      const size = this.calculateSize(value)

      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl: mergedConfig.ttl || 3600000, // 1 hour default
        hits: 0,
        lastAccessed: Date.now(),
        tags: mergedConfig.tags || [],
        size,
        metadata: {},
      }

      // Check if we should cache this value
      if (mergedConfig.shouldCache && !mergedConfig.shouldCache(value)) {
        return Result.Ok(undefined)
      }

      // Write to all layers
      const writePromises = Array.from(this.layers.values()).map(async ({ storage }) => {
        try {
          await storage.set(fullKey, entry)
        } catch (error) {
          console.warn('Cache write failed:', error)
        }
      })

      await Promise.all(writePromises)
      await this.updateStats()

      // Record analytics for set operation
      this.analytics.recordOperation('set', 0, {
        // Set operations are typically synchronous
        tags: mergedConfig.tags,
        namespace,
        ttl: entry.ttl,
        size: entry.size,
      })

      // Process invalidation triggers
      await this.invalidationManager.processOperation('set', fullKey, value, {
        tags: mergedConfig.tags,
        namespace,
        ttl: entry.ttl,
      })

      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(
        createCacheError(
          'set',
          error instanceof Error ? error.message : 'Failed to set cache entry',
          { key, namespace }
        )
      )
    }
  }

  // Delete value from cache (removes from all layers)
  async delete(key: string, namespace?: string): Promise<number> {
    const fullKey = this.buildKey(key, namespace)
    let deletedCount = 0

    const deletePromises = Array.from(this.layers.values()).map(async ({ storage }) => {
      try {
        const deleted = await storage.delete(fullKey)
        if (deleted) deletedCount++
      } catch (error) {
        console.warn('Cache delete failed:', error)
      }
    })

    await Promise.all(deletePromises)
    await this.updateStats()
    return deletedCount
  }

  // Clear all caches
  async clear(): Promise<void> {
    const clearPromises = Array.from(this.layers.values()).map(async ({ storage }) => {
      try {
        await storage.clear()
      } catch (error) {
        console.warn('Cache clear failed:', error)
      }
    })

    await Promise.all(clearPromises)
    this.resetStats()
  }

  // Invalidate by pattern
  async invalidateByPattern(pattern: string | RegExp): Promise<number> {
    let totalInvalidated = 0

    const invalidatePromises = Array.from(this.layers.values()).map(async ({ storage }) => {
      try {
        const count = await storage.invalidateByPattern(pattern)
        totalInvalidated += count
      } catch (error) {
        console.warn('Cache invalidation failed:', error)
      }
    })

    await Promise.all(invalidatePromises)
    await this.updateStats()
    return totalInvalidated
  }

  // Invalidate by tag
  async invalidateByTag(tag: string): Promise<number> {
    let totalInvalidated = 0

    const invalidatePromises = Array.from(this.layers.values()).map(async ({ storage }) => {
      try {
        const count = await storage.invalidateByTag(tag)
        totalInvalidated += count
      } catch (error) {
        console.warn('Cache invalidation failed:', error)
      }
    })

    await Promise.all(invalidatePromises)
    await this.updateStats()
    return totalInvalidated
  }

  // Get cache statistics
  getStats(): CacheStats {
    this.stats.hitRate =
      this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0
    return { ...this.stats }
  }

  // Warm cache with predefined data
  async warmCache<T>(
    entries: Array<{ key: string; value: T; config?: Partial<CacheConfig> }>
  ): Promise<void> {
    const warmPromises = entries.map(({ key, value, config }) => this.set(key, value, config))
    await Promise.all(warmPromises)
  }

  // Cleanup expired entries across all layers
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.layers.values()).map(async ({ storage }) => {
      try {
        if (storage instanceof MemoryStorage) {
          // Memory storage handles cleanup internally
          const keys = await storage.keys()
          for (const key of keys) {
            const entry = await storage.get(key)
            if (entry && Date.now() - entry.timestamp > entry.ttl) {
              await storage.delete(key)
            }
          }
        }
      } catch (error) {
        console.warn('Cache cleanup failed:', error)
      }
    })

    await Promise.all(cleanupPromises)
    await this.updateStats()
  }

  // Advanced invalidation management
  registerInvalidationTrigger(trigger: InvalidationTrigger): void {
    this.invalidationManager.registerTrigger(trigger)
  }

  removeInvalidationTrigger(name: string): void {
    this.invalidationManager.removeTrigger(name)
  }

  registerWarmingStrategy(strategy: WarmingStrategy): void {
    this.invalidationManager.registerWarming(strategy)
  }

  removeWarmingStrategy(name: string): void {
    this.invalidationManager.removeWarming(name)
  }

  async warmCacheStrategy(
    strategyName: string,
    keys?: string[]
  ): Promise<Result<CacheError, number>> {
    const result = await this.invalidationManager.warmCache(strategyName, keys)
    if (Result.isOk(result)) {
      return Result.Ok(result.value)
    } else {
      return Result.Err(createCacheError('warmCache', result.error.message, { strategyName, keys }))
    }
  }

  async invalidateByDependency(
    dependencyId: string,
    type?: 'resource' | 'pipeline' | 'schema' | 'custom'
  ): Promise<Result<CacheError, number>> {
    const result = await this.invalidationManager.invalidateByDependency(dependencyId, type)
    if (Result.isOk(result)) {
      return Result.Ok(result.value)
    } else {
      return Result.Err(
        createCacheError('invalidateByDependency', result.error.message, { dependencyId, type })
      )
    }
  }

  getInvalidationStats(): ReturnType<InvalidationManager['getStats']> {
    return this.invalidationManager.getStats()
  }

  // Analytics and monitoring methods
  getAnalytics(): ReturnType<CacheAnalytics['getMetrics']> {
    // Update memory usage before returning analytics
    void this.updateAnalyticsMemoryUsage()
    return this.analytics.getMetrics()
  }

  getPerformanceMetrics(): ReturnType<CacheAnalytics['getPerformanceMetrics']> {
    return this.analytics.getPerformanceMetrics()
  }

  getHealthMetrics(): ReturnType<CacheAnalytics['getHealthMetrics']> {
    return this.analytics.getHealthMetrics()
  }

  getEfficiencyAnalysis(): ReturnType<CacheAnalytics['getEfficiencyAnalysis']> {
    return this.analytics.getEfficiencyAnalysis()
  }

  getHistoricalData(
    metric: string,
    period: Parameters<CacheAnalytics['getHistoricalData']>[1],
    limit?: number
  ): ReturnType<CacheAnalytics['getHistoricalData']> {
    return this.analytics.getHistoricalData(metric, period, limit)
  }

  exportAnalytics(): ReturnType<CacheAnalytics['exportData']> {
    void this.updateAnalyticsMemoryUsage()
    return this.analytics.exportData()
  }

  clearAnalytics(): void {
    this.analytics.clearHistory()
  }

  onCacheAlert(callback: (type: string, metric: unknown) => void): void {
    this.analytics.onAlert(callback)
  }

  // Private helper methods
  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key
  }

  private calculateSize(value: unknown): number {
    // Approximate size calculation
    try {
      return JSON.stringify(value).length * 2 // Rough estimate for UTF-16
    } catch {
      return 1000 // Default size if serialization fails
    }
  }

  private async promoteToHigherLayers<T>(
    key: string,
    entry: CacheEntry<T>,
    sourceLayerName: string
  ): Promise<void> {
    const sourceLayer = this.layers.get(sourceLayerName)
    if (!sourceLayer) return

    const higherPriorityLayers = Array.from(this.layers.entries()).filter(
      ([, { config }]) => config.priority > sourceLayer.config.priority
    )

    for (const [, { storage }] of higherPriorityLayers) {
      try {
        await storage.set(key, entry)
      } catch (error) {
        console.warn('Cache promotion failed:', error)
      }
    }
  }

  private async updateStats(): Promise<void> {
    let totalSize = 0
    let totalMemory = 0
    const allEntries: CacheStats['entries'] = []

    for (const [layerName, { storage }] of this.layers.entries()) {
      try {
        const size = await storage.size()
        totalSize += size

        if (storage instanceof MemoryStorage) {
          totalMemory += storage.getMemoryUsage()
        }

        const keys = await storage.keys()
        for (const key of keys.slice(0, 100)) {
          // Limit to first 100 for performance
          const entry = await storage.get(key)
          if (entry) {
            allEntries.push({
              key: `${layerName}:${key}`,
              hits: entry.hits,
              age: Date.now() - entry.timestamp,
              size: entry.size,
              lastAccessed: entry.lastAccessed,
            })
          }
        }
      } catch (error) {
        console.warn(`Failed to update stats for layer ${layerName}:`, error)
      }
    }

    this.stats.size = totalSize
    this.stats.memoryUsage = totalMemory
    this.stats.entries = allEntries.sort((a, b) => b.hits - a.hits)
  }

  private updateAverageAccessTime(accessTime: number): void {
    const totalAccesses = this.stats.hits + this.stats.misses
    this.stats.averageAccessTime =
      (this.stats.averageAccessTime * (totalAccesses - 1) + accessTime) / totalAccesses
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      memoryUsage: 0,
      averageAccessTime: 0,
      entries: [],
    }
  }

  private async updateAnalyticsMemoryUsage(): Promise<void> {
    let totalMemoryUsage = 0
    let totalKeyCount = 0

    for (const [layerName, { storage }] of this.layers.entries()) {
      try {
        const keyCount = await storage.size()
        let memoryUsage = 0

        if (storage instanceof MemoryStorage) {
          memoryUsage = storage.getMemoryUsage()
        }

        totalMemoryUsage += memoryUsage
        totalKeyCount += keyCount

        // Update layer-specific analytics
        this.analytics.updateLayerMemoryUsage(layerName, memoryUsage, keyCount)
      } catch (error) {
        console.warn(`Failed to update analytics for layer ${layerName}:`, error)
      }
    }

    // Update overall analytics
    this.analytics.updateMemoryUsage(totalMemoryUsage, totalKeyCount)
  }
}

// Default cache manager instance
export const cacheManager = new CacheManager()

// Add default memory layer
cacheManager.addLayer({
  name: 'memory',
  priority: 1,
  storage: new MemoryStorage({
    maxSize: 10000,
    maxMemory: 100 * 1024 * 1024, // 100MB
    evictionPolicy: 'lru',
    ttl: 3600000, // 1 hour
  }),
  ttl: 3600000,
})

// Enhanced cache utilities for backward compatibility
export const cache = {
  // Enhanced existing methods
  get: <T>(key: string, namespace?: string) => cacheManager.get<T>(key, namespace),
  set: <T>(key: string, value: T, config?: Partial<CacheConfig>, namespace?: string) =>
    cacheManager.set(key, value, config, namespace),
  delete: (key: string, namespace?: string) => cacheManager.delete(key, namespace),
  clear: () => cacheManager.clear(),
  invalidate: (pattern: string | RegExp) => cacheManager.invalidateByPattern(pattern),
  invalidateByPattern: (pattern: string | RegExp) => cacheManager.invalidateByPattern(pattern),
  invalidateByTag: (tag: string) => cacheManager.invalidateByTag(tag),

  // New advanced methods
  stats: () => cacheManager.getStats(),
  warmCache: <T>(entries: Array<{ key: string; value: T; config?: Partial<CacheConfig> }>) =>
    cacheManager.warmCache(entries),
  cleanup: () => cacheManager.cleanup(),
  addLayer: (config: CacheLayerConfig) => cacheManager.addLayer(config),
  removeLayer: (name: string) => cacheManager.removeLayer(name),

  // Invalidation management
  registerInvalidationTrigger: (trigger: InvalidationTrigger) =>
    cacheManager.registerInvalidationTrigger(trigger),
  removeInvalidationTrigger: (name: string) => cacheManager.removeInvalidationTrigger(name),
  registerWarmingStrategy: (strategy: WarmingStrategy) =>
    cacheManager.registerWarmingStrategy(strategy),
  removeWarmingStrategy: (name: string) => cacheManager.removeWarmingStrategy(name),
  warmCacheStrategy: (strategyName: string, keys?: string[]) =>
    cacheManager.warmCacheStrategy(strategyName, keys),
  invalidateByDependency: (
    dependencyId: string,
    type?: 'resource' | 'pipeline' | 'schema' | 'custom'
  ) => cacheManager.invalidateByDependency(dependencyId, type),
  getInvalidationStats: () => cacheManager.getInvalidationStats(),

  // Analytics and monitoring
  getAnalytics: () => cacheManager.getAnalytics(),
  getPerformanceMetrics: () => cacheManager.getPerformanceMetrics(),
  getHealthMetrics: () => cacheManager.getHealthMetrics(),
  getEfficiencyAnalysis: () => cacheManager.getEfficiencyAnalysis(),
  getHistoricalData: (
    metric: string,
    period: Parameters<typeof cacheManager.getHistoricalData>[1],
    limit?: number
  ) => cacheManager.getHistoricalData(metric, period, limit),
  exportAnalytics: () => cacheManager.exportAnalytics(),
  clearAnalytics: () => cacheManager.clearAnalytics(),
  onCacheAlert: (callback: (type: string, metric: unknown) => void) =>
    cacheManager.onCacheAlert(callback),

  // Storage classes for custom implementations
  MemoryStorage,
  RedisStorage,
  CacheManager,
  CacheAnalytics,

  // Utility functions for creating distributed layers - will be added after fixing imports
}
