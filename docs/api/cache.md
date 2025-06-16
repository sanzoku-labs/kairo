# Cache API

The Cache API provides multi-level caching with analytics, invalidation strategies, and distributed support for high-performance applications.

## Core Concepts

Kairo's caching system supports multiple cache layers with different priorities, storage backends, and eviction policies. It includes real-time analytics, intelligent invalidation, and cache warming strategies.

## Creating a Cache Manager

```typescript
import { CacheManager, MemoryStorage, RedisStorage } from 'kairo/cache'

const cacheManager = new CacheManager({
  ttl: 3600000, // 1 hour default
  evictionPolicy: 'lru',
  analytics: {
    enabled: true,
    healthCheckInterval: 60000,
  },
})

// Add multiple cache layers
cacheManager.addLayer({
  name: 'memory-fast',
  priority: 100, // Highest priority
  storage: new MemoryStorage({
    maxSize: 1000,
    evictionPolicy: 'lru',
  }),
  ttl: 300000, // 5 minutes
})

cacheManager.addLayer({
  name: 'redis-distributed',
  priority: 50, // Lower priority
  storage: new RedisStorage({
    host: 'localhost',
    port: 6379,
    cluster: true,
  }),
  ttl: 3600000, // 1 hour
})
```

### Configuration Options

- `ttl`: Default time-to-live in milliseconds
- `evictionPolicy`: Cache eviction strategy ('lru', 'lfu', 'fifo', 'ttl')
- `analytics`: Enable real-time analytics and monitoring
- `compression`: Enable data compression for storage efficiency

## Basic Cache Operations

### Setting Values

```typescript
// Simple set operation
const result = await cacheManager.set('user:123', userData)

// Set with options
const result = await cacheManager.set('user:123', userData, {
  ttl: 1800000, // 30 minutes
  tags: ['user', 'profile'],
  namespace: 'app',
  priority: 'high',
})

// Batch set operations
const results = await cacheManager.setBatch([
  { key: 'user:1', value: user1, ttl: 3600000 },
  { key: 'user:2', value: user2, ttl: 3600000 },
  { key: 'user:3', value: user3, ttl: 3600000 },
])
```

### Getting Values

```typescript
// Simple get operation
const result = await cacheManager.get('user:123')
result.match({
  Ok: userData => console.log('Cache hit:', userData),
  Err: error => console.log('Cache miss or error:', error),
})

// Batch get operations
const results = await cacheManager.getBatch(['user:1', 'user:2', 'user:3'])

// Get with fallback
const result = await cacheManager.getOrSet(
  'user:123',
  async () => {
    // Fallback function called on cache miss
    return await userService.findById('123')
  },
  { ttl: 3600000 }
)
```

### Deleting Values

```typescript
// Delete single key
await cacheManager.delete('user:123')

// Delete multiple keys
await cacheManager.deleteBatch(['user:1', 'user:2', 'user:3'])

// Check if key exists
const exists = await cacheManager.exists('user:123')
```

## Cache Invalidation Strategies

### Tag-Based Invalidation

```typescript
// Set values with tags
await cacheManager.set('user:123', userData, { tags: ['user', 'profile'] })
await cacheManager.set('post:456', postData, { tags: ['post', 'user:123'] })

// Invalidate all entries with 'user' tag
await cacheManager.invalidateByTag('user')

// Invalidate multiple tags
await cacheManager.invalidateByTags(['user', 'profile'])
```

### Pattern-Based Invalidation

```typescript
// Invalidate using regex patterns
await cacheManager.invalidateByPattern(/^user:.*$/)

// Invalidate using glob patterns
await cacheManager.invalidateByPattern('user:*')

// Invalidate with complex patterns
await cacheManager.invalidateByPattern(/^(user|profile):\d+$/)
```

### Dependency-Based Invalidation

```typescript
// Set cache dependencies
await cacheManager.set('user:123:posts', userPosts, {
  dependencies: ['user:123', 'posts:list'],
})

// Invalidate dependent caches
await cacheManager.invalidateByDependency('user:123')

// Set up automatic dependency tracking
cacheManager.addDependencyRule({
  pattern: /^user:(\d+):.+$/,
  dependencies: match => [`user:${match[1]}`],
})
```

### Time-Based Invalidation

```typescript
// Invalidate expired entries
await cacheManager.invalidateExpired()

// Schedule automatic cleanup
cacheManager.scheduleCleanup({
  interval: 300000, // Every 5 minutes
  expiredOnly: true,
})
```

## Cache Warming Strategies

### Manual Cache Warming

```typescript
// Warm specific cache entries
const warmed = await cacheManager.warm([
  { key: 'user:1', loader: () => userService.findById('1') },
  { key: 'user:2', loader: () => userService.findById('2') },
])

warmed.match({
  Ok: count => console.log(`Warmed ${count} cache entries`),
  Err: error => console.error('Cache warming failed:', error),
})
```

### Predictive Cache Warming

```typescript
// Register warming strategies
cacheManager.registerWarmingStrategy({
  name: 'popular-users',
  enabled: true,
  schedule: {
    interval: 600000, // Every 10 minutes
    immediate: true,
  },
  loader: async keys => {
    const users = await Promise.all(keys.map(key => userService.findById(key.split(':')[1])))
    return users.map((user, i) => ({
      key: keys[i],
      value: user,
      ttl: 3600000,
    }))
  },
  keyGenerator: async () => {
    const popularUserIds = await analyticsService.getPopularUsers()
    return popularUserIds.map(id => `user:${id}`)
  },
})

// Execute warming strategy
const result = await cacheManager.warmCacheStrategy('popular-users')
```

### Background Cache Refresh

```typescript
// Enable background refresh for frequently accessed items
cacheManager.enableBackgroundRefresh({
  refreshThreshold: 0.8, // Refresh when 80% of TTL has passed
  refreshProbability: 0.1, // 10% chance to refresh on access
  concurrentRefreshLimit: 5,
})

// Set items with background refresh
await cacheManager.set('user:123', userData, {
  ttl: 3600000,
  backgroundRefresh: true,
  refreshLoader: async () => await userService.findById('123'),
})
```

## Storage Adapters

### Memory Storage

```typescript
import { MemoryStorage } from 'kairo/cache'

const memoryStorage = new MemoryStorage({
  maxSize: 1000, // Maximum number of entries
  maxMemory: 100 * 1024 * 1024, // 100MB limit
  evictionPolicy: 'lru',
  compressionEnabled: false,
})
```

### Redis Storage

```typescript
import { RedisStorage } from 'kairo/cache'

const redisStorage = new RedisStorage({
  host: 'localhost',
  port: 6379,
  password: 'secret',
  db: 0,
  cluster: {
    enabled: true,
    nodes: [
      { host: 'redis-1', port: 6379 },
      { host: 'redis-2', port: 6379 },
      { host: 'redis-3', port: 6379 },
    ],
  },
  compression: {
    enabled: true,
    algorithm: 'gzip',
  },
  serialization: {
    format: 'msgpack', // or 'json'
  },
})
```

### Custom Storage Adapter

```typescript
import { StorageAdapter } from 'kairo/cache'

class DatabaseStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<Result<CacheError, any>> {
    try {
      const result = await database.query('SELECT value, expires_at FROM cache WHERE key = ?', [
        key,
      ])

      if (result.rows.length === 0) {
        return Result.Err(new CacheError('Key not found'))
      }

      const row = result.rows[0]
      if (new Date(row.expires_at) < new Date()) {
        await this.delete(key)
        return Result.Err(new CacheError('Key expired'))
      }

      return Result.Ok(JSON.parse(row.value))
    } catch (error) {
      return Result.Err(new CacheError('Database error', { cause: error }))
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<Result<CacheError, void>> {
    try {
      const expiresAt = ttl ? new Date(Date.now() + ttl) : null
      await database.query(
        'INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)',
        [key, JSON.stringify(value), expiresAt]
      )
      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(new CacheError('Database error', { cause: error }))
    }
  }

  async delete(key: string): Promise<Result<CacheError, void>> {
    try {
      await database.query('DELETE FROM cache WHERE key = ?', [key])
      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(new CacheError('Database error', { cause: error }))
    }
  }
}
```

## Real-Time Analytics

### Performance Metrics

```typescript
// Get current cache statistics
const stats = cacheManager.getAnalytics()
console.log(`Hit rate: ${stats.hitRate}%`)
console.log(`Miss rate: ${stats.missRate}%`)
console.log(`Memory usage: ${stats.memoryUsage} bytes`)
console.log(`Entry count: ${stats.entryCount}`)

// Get detailed layer statistics
const layerStats = cacheManager.getLayerAnalytics('memory-fast')
console.log(`Layer hit rate: ${layerStats.hitRate}%`)
console.log(`Layer memory usage: ${layerStats.memoryUsage} bytes`)
```

### Performance Monitoring

```typescript
// Real-time performance metrics
const performance = cacheManager.getPerformanceMetrics()
console.log(`Operations per second: ${performance.operationsPerSecond}`)
console.log(`Average latency: ${performance.averageLatency}ms`)
console.log(`P95 latency: ${performance.p95Latency}ms`)
console.log(`P99 latency: ${performance.p99Latency}ms`)

// Historical performance data
const history = cacheManager.getPerformanceHistory('1h') // Last hour
console.log(`Hourly trends:`, history.trends)
```

### Health Monitoring and Alerts

```typescript
// Health check
const health = await cacheManager.healthCheck()
if (!health.healthy) {
  console.error('Cache health issues:', health.issues)
}

// Set up alerting
cacheManager.onCacheAlert((type, metric) => {
  switch (type) {
    case 'high-memory-usage':
      console.warn(`Memory usage high: ${metric.value}%`)
      break
    case 'low-hit-rate':
      console.warn(`Hit rate low: ${metric.value}%`)
      break
    case 'high-latency':
      console.warn(`Latency high: ${metric.value}ms`)
      break
  }
})

// Configure alert thresholds
cacheManager.configureAlerts({
  memoryUsageThreshold: 80, // Alert when memory usage > 80%
  hitRateThreshold: 70, // Alert when hit rate < 70%
  latencyThreshold: 100, // Alert when latency > 100ms
})
```

## Integration with Other Pillars

### Pipeline Caching

```typescript
import { pipeline } from 'kairo'

const cachedPipeline = pipeline('user-processing')
  .input(UserSchema)
  .cache({
    key: user => `processed:user:${user.id}`,
    ttl: 3600000,
    tags: ['user', 'processing'],
  })
  .map(processUserData)
  .cache({
    key: user => `enriched:user:${user.id}`,
    ttl: 1800000,
  })
  .map(enrichUserData)

// Automatic cache integration
const result = await cachedPipeline.run(userData)
```

### Resource Caching

```typescript
import { resource } from 'kairo'

const UserAPI = resource('users', {
  get: {
    path: '/users/:id',
    response: UserSchema,
    cache: {
      ttl: 3600000,
      key: params => `user:${params.id}`,
      tags: ['user'],
      invalidateOn: ['user.updated', 'user.deleted'],
    },
  },
})

// Automatic cache invalidation on events
eventBus.subscribe({
  eventType: 'user.updated',
  handler: async event => {
    await cacheManager.invalidateByTag(`user:${event.payload.userId}`)
    return Result.Ok(undefined)
  },
})
```

## Best Practices

### Cache Key Design

Use hierarchical, predictable cache keys:

```typescript
// Good - Hierarchical and descriptive
'user:123:profile'
'user:123:posts:recent'
'organization:456:users:active'

// Avoid - Unclear or unpredictable
'user123'
'temp_data_xyz'
'cache_key_001'
```

### TTL Strategy

Set appropriate TTL values based on data characteristics:

```typescript
// User profile - changes infrequently
await cacheManager.set('user:123:profile', profile, { ttl: 3600000 }) // 1 hour

// User posts - changes frequently
await cacheManager.set('user:123:posts', posts, { ttl: 300000 }) // 5 minutes

// Configuration data - rarely changes
await cacheManager.set('app:config', config, { ttl: 86400000 }) // 24 hours
```

### Cache Partitioning

Use tags and namespaces for logical separation:

```typescript
// Partition by feature
await cacheManager.set('user:123', userData, {
  namespace: 'users',
  tags: ['profile'],
})

await cacheManager.set('order:456', orderData, {
  namespace: 'orders',
  tags: ['pending'],
})

// Clear feature-specific caches
await cacheManager.invalidateNamespace('users')
```

## Type Safety

Cache operations are fully typed for maximum safety:

```typescript
interface User {
  id: string
  name: string
  email: string
}

interface UserCache {
  get(key: string): Promise<Result<CacheError, User>>
  set(key: string, value: User, options?: CacheOptions): Promise<Result<CacheError, void>>
}

// Type-safe cache wrapper
const userCache: UserCache = {
  async get(key: string) {
    return cacheManager.get<User>(key)
  },

  async set(key: string, value: User, options?: CacheOptions) {
    return cacheManager.set(key, value, options)
  },
}

// Usage with type safety
const result = await userCache.get('user:123')
result.match({
  Ok: (user: User) => {
    // user is typed as User
    console.log(`Welcome ${user.name}!`)
  },
  Err: error => {
    console.error('Cache error:', error.message)
  },
})
```
