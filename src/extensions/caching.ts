// Advanced Caching Extension
//
// Tree-shakable named exports for multi-level caching

// Core Cache Manager
export {
  CacheManager,
  MemoryStorage,
  RedisStorage,
  cacheManager,
  cache as advancedCache,
} from './caching/cache'

// Cache Analytics
export { CacheAnalytics, defaultAnalyticsConfig } from './caching/cache-analytics'

// Cache Invalidation
export {
  InvalidationManager,
  invalidationStrategies,
  warmingStrategies,
} from './caching/cache-invalidation'

// Distributed Cache Support
export {
  EnhancedRedisStorage,
  JSONSerializer,
  MessagePackSerializer,
  CompressedJSONSerializer,
} from './caching/cache-distributed'

// Export all types separately to avoid conflicts
export type { CacheError, CacheStats, CacheConfig, CacheLayerConfig } from './caching/cache'

export type {
  AnalyticsError,
  CacheMetrics,
  PerformanceMetrics,
  HealthMetrics,
  MetricDataPoint,
  AggregationPeriod,
  AnalyticsConfig,
} from './caching/cache-analytics'

export type {
  InvalidationError,
  InvalidationStrategy,
  InvalidationTrigger,
  InvalidationAction,
  CacheDependency,
  WarmingStrategy,
  CoherencePolicy,
} from './caching/cache-invalidation'

export type {
  DistributedCacheError as DistCacheError,
  RedisConfig,
  RedisClusterConfig,
  CacheEventEmitter,
  CacheSerializer,
} from './caching/cache-distributed'
