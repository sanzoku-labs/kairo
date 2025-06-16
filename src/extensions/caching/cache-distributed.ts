import { Result } from '../../core/result'
import { type KairoError, createError } from '../../core/errors'

// Re-declare the interfaces to avoid circular imports
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

export interface DistributedCacheError extends KairoError {
  code: 'DISTRIBUTED_CACHE_ERROR'
  node?: string
  operation: string
}

const createDistributedCacheError = (
  operation: string,
  message: string,
  context = {}
): DistributedCacheError => ({
  ...createError('DISTRIBUTED_CACHE_ERROR', message, context),
  code: 'DISTRIBUTED_CACHE_ERROR',
  operation,
})

// Redis-like configuration interface
export interface RedisConfig {
  host: string
  port: number
  password?: string
  username?: string
  db?: number
  family?: 4 | 6
  connectTimeout?: number
  lazyConnect?: boolean
  keepAlive?: number
  maxRetriesPerRequest?: number
  retryDelayOnFailover?: number
  retryDelayOnClusterDown?: number
  maxRetriesPerCluster?: number
  enableOfflineQueue?: boolean
  compression?: 'gzip' | 'deflate' | 'br'
  serialization?: 'json' | 'msgpack' | 'custom'
  keyPrefix?: string
}

// Cluster configuration for multiple Redis nodes
export interface RedisClusterConfig extends Omit<RedisConfig, 'host' | 'port'> {
  nodes: Array<{ host: string; port: number }>
  scaleReads?: 'master' | 'slave' | 'all'
  enableAutoPipelining?: boolean
  maxRedirections?: number
  retryDelayOnFailover?: number
}

// Event emitter interface for cache events
export interface CacheEventEmitter {
  on(
    event: 'connect' | 'disconnect' | 'error' | 'ready',
    listener: (...args: unknown[]) => void
  ): void
  emit(event: string, ...args: unknown[]): boolean
  removeAllListeners(event?: string): void
}

// Mock Redis client interface (in real implementation, would use ioredis or similar)
interface RedisClient extends CacheEventEmitter {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null>
  setex(key: string, seconds: number, value: string): Promise<'OK'>
  del(...keys: string[]): Promise<number>
  exists(...keys: string[]): Promise<number>
  keys(pattern: string): Promise<string[]>
  flushdb(): Promise<'OK'>
  dbsize(): Promise<number>
  ttl(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<0 | 1>
  hget(key: string, field: string): Promise<string | null>
  hset(key: string, field: string, value: string): Promise<0 | 1>
  hdel(key: string, ...fields: string[]): Promise<number>
  hgetall(key: string): Promise<Record<string, string>>
  sadd(key: string, ...members: string[]): Promise<number>
  smembers(key: string): Promise<string[]>
  srem(key: string, ...members: string[]): Promise<number>
  pipeline(): RedisClient
  exec(): Promise<Array<[Error | null, unknown]>>
  multi(): RedisClient
  ping(): Promise<'PONG'>
  quit(): Promise<'OK'>
  disconnect(): void
  status: 'connecting' | 'connect' | 'ready' | 'close' | 'reconnecting' | 'end'
}

// Enhanced Redis storage with enterprise features
export class EnhancedRedisStorage extends CacheStorage {
  private client: RedisClient | null = null
  private clusterClients: RedisClient[] = []
  private isCluster: boolean = false
  private connectionRetries = 0
  private maxRetries = 3
  private serializer: CacheSerializer
  private eventEmitter: CacheEventEmitter | null = null

  constructor(
    private config: RedisConfig | RedisClusterConfig,
    private options: {
      serializer?: CacheSerializer
      enableCompression?: boolean
      enableMetrics?: boolean
    } = {}
  ) {
    super()
    void this.options // Prevent unused warning
    this.isCluster = 'nodes' in config
    this.serializer = options.serializer || new JSONSerializer()
  }

  async connect(): Promise<Result<DistributedCacheError, void>> {
    try {
      if (this.isCluster) {
        return await this.connectCluster()
      } else {
        return await this.connectSingle()
      }
    } catch (error) {
      return Result.Err(
        createDistributedCacheError(
          'connect',
          error instanceof Error ? error.message : 'Connection failed',
          { config: this.config }
        )
      )
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit()
        this.client = null
      }

      for (const client of this.clusterClients) {
        await client.quit()
      }
      this.clusterClients = []

      this.eventEmitter?.removeAllListeners()
    } catch (error) {
      console.warn('Error during Redis disconnect:', error)
    }
  }

  async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    if (!this.isConnected()) {
      throw new Error('Redis not connected')
    }

    try {
      const client = this.getClient(key)
      const serializedEntry = await client.get(this.buildKey(key))

      if (!serializedEntry) {
        return undefined
      }

      const entry = this.serializer.deserialize<CacheEntry<T>>(serializedEntry)

      // Check TTL
      if (this.isExpired(entry)) {
        await this.delete(key)
        return undefined
      }

      // Update access metadata
      entry.hits++
      entry.lastAccessed = Date.now()

      // Update in Redis (fire and forget for performance)
      this.updateEntryMetadata(key, entry).catch(() => {
        // Ignore metadata update failures
      })

      return entry
    } catch (error) {
      console.warn('Redis get failed:', error)
      return undefined
    }
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Redis not connected')
    }

    try {
      const client = this.getClient(key)
      const serializedEntry = this.serializer.serialize(entry)
      const ttlSeconds = Math.ceil(entry.ttl / 1000)

      await client.setex(this.buildKey(key), ttlSeconds, serializedEntry)

      // Store tags for tag-based invalidation
      if (entry.tags.length > 0) {
        await this.indexTags(key, entry.tags)
      }
    } catch (error) {
      throw new Error(
        `Redis set failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false
    }

    try {
      const client = this.getClient(key)
      const deletedCount = await client.del(this.buildKey(key))

      // Clean up tag indices
      await this.cleanupTagIndices(key)

      return deletedCount > 0
    } catch (error) {
      console.warn('Redis delete failed:', error)
      return false
    }
  }

  async clear(): Promise<void> {
    if (!this.isConnected()) {
      return
    }

    try {
      if (this.isCluster) {
        // Clear all cluster nodes
        const clearPromises = this.clusterClients.map(client => client.flushdb())
        await Promise.all(clearPromises)
      } else {
        await this.client!.flushdb()
      }
    } catch (error) {
      console.warn('Redis clear failed:', error)
    }
  }

  async keys(): Promise<string[]> {
    if (!this.isConnected()) {
      return []
    }

    try {
      const pattern = this.buildKey('*')
      const keyPrefix = this.buildKey('')

      if (this.isCluster) {
        // Collect keys from all cluster nodes
        const keyPromises = this.clusterClients.map(client => client.keys(pattern))
        const keyArrays = await Promise.all(keyPromises)
        const allKeys = keyArrays.flat()

        // Remove duplicates and strip prefix
        const uniqueKeys = Array.from(new Set(allKeys))
        return uniqueKeys.map(key => key.replace(keyPrefix, ''))
      } else {
        const keys = await this.client!.keys(pattern)
        return keys.map(key => key.replace(keyPrefix, ''))
      }
    } catch (error) {
      console.warn('Redis keys failed:', error)
      return []
    }
  }

  async size(): Promise<number> {
    if (!this.isConnected()) {
      return 0
    }

    try {
      if (this.isCluster) {
        const sizePromises = this.clusterClients.map(client => client.dbsize())
        const sizes = await Promise.all(sizePromises)
        return sizes.reduce((total, size) => total + size, 0)
      } else {
        return await this.client!.dbsize()
      }
    } catch (error) {
      console.warn('Redis size failed:', error)
      return 0
    }
  }

  async invalidateByPattern(pattern: string | RegExp): Promise<number> {
    if (!this.isConnected()) {
      return 0
    }

    try {
      const keyPattern = this.buildKey('*')
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
      let deletedCount = 0

      if (this.isCluster) {
        for (const client of this.clusterClients) {
          const keys = await client.keys(keyPattern)
          const keysToDelete = keys.filter(key => regex.test(key))

          if (keysToDelete.length > 0) {
            const deleted = await client.del(...keysToDelete)
            deletedCount += deleted
          }
        }
      } else {
        const keys = await this.client!.keys(keyPattern)
        const keysToDelete = keys.filter(key => regex.test(key))

        if (keysToDelete.length > 0) {
          deletedCount = await this.client!.del(...keysToDelete)
        }
      }

      return deletedCount
    } catch (error) {
      console.warn('Redis pattern invalidation failed:', error)
      return 0
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    if (!this.isConnected()) {
      return 0
    }

    try {
      const tagKey = this.buildTagKey(tag)
      let deletedCount = 0

      if (this.isCluster) {
        for (const client of this.clusterClients) {
          const keys = await client.smembers(tagKey)

          if (keys.length > 0) {
            const fullKeys = keys.map(key => this.buildKey(key))
            const deleted = await client.del(...fullKeys)
            deletedCount += deleted

            // Remove the tag index
            await client.del(tagKey)
          }
        }
      } else {
        const keys = await this.client!.smembers(tagKey)

        if (keys.length > 0) {
          const fullKeys = keys.map(key => this.buildKey(key))
          deletedCount = await this.client!.del(...fullKeys)

          // Remove the tag index
          await this.client!.del(tagKey)
        }
      }

      return deletedCount
    } catch (error) {
      console.warn('Redis tag invalidation failed:', error)
      return 0
    }
  }

  // Redis-specific methods
  async ping(): Promise<boolean> {
    if (!this.isConnected()) {
      return false
    }

    try {
      if (this.isCluster) {
        const pingPromises = this.clusterClients.map(client => client.ping())
        const results = await Promise.all(pingPromises)
        return results.every(result => result === 'PONG')
      } else {
        const result = await this.client!.ping()
        return result === 'PONG'
      }
    } catch {
      return false
    }
  }

  getConnectionInfo(): {
    connected: boolean
    cluster: boolean
    nodes: number
    status: string
  } {
    return {
      connected: this.isConnected(),
      cluster: this.isCluster,
      nodes: this.isCluster ? this.clusterClients.length : 1,
      status: this.client?.status || 'disconnected',
    }
  }

  // Private helper methods
  private async connectSingle(): Promise<Result<DistributedCacheError, void>> {
    const config = this.config as RedisConfig

    // In a real implementation, would use:
    // this.client = new Redis(config)

    // Mock client for demonstration
    this.client = this.createMockClient(config)

    return new Promise(resolve => {
      this.client!.on('ready', () => {
        this.connectionRetries = 0
        resolve(Result.Ok(undefined))
      })

      this.client!.on('error', error => {
        if (this.connectionRetries < this.maxRetries) {
          this.connectionRetries++
          // Retry connection
        } else {
          resolve(
            Result.Err(
              createDistributedCacheError('connect', `Connection failed: ${String(error)}`, {
                config,
              })
            )
          )
        }
      })

      // Simulate connection
      setTimeout(() => {
        this.client!.emit('ready')
      }, 100)
    })
  }

  private connectCluster(): Promise<Result<DistributedCacheError, void>> {
    const config = this.config as RedisClusterConfig

    try {
      // In a real implementation, would use:
      // this.clusterClients = config.nodes.map(node => new Redis.Cluster([node], config))

      // Mock cluster clients for demonstration
      this.clusterClients = config.nodes.map(node =>
        this.createMockClient({ ...config, host: node.host, port: node.port })
      )

      return Promise.resolve(Result.Ok(undefined))
    } catch (error) {
      return Promise.resolve(
        Result.Err(
          createDistributedCacheError(
            'connectCluster',
            `Cluster connection failed: ${String(error)}`,
            {
              config,
            }
          )
        )
      )
    }
  }

  private createMockClient(_config: RedisConfig): RedisClient {
    // Mock Redis client for demonstration
    // In real implementation, would return actual Redis client
    const mockStorage = new Map<string, string>()

    const emitter = {
      listeners: new Map<string, Array<(...args: unknown[]) => void>>(),
      on(event: string, listener: (...args: unknown[]) => void) {
        if (!this.listeners.has(event)) {
          this.listeners.set(event, [])
        }
        this.listeners.get(event)!.push(listener)
      },
      emit(event: string, ...args: unknown[]): boolean {
        const listeners = this.listeners.get(event) || []
        listeners.forEach(listener => listener(...args))
        return listeners.length > 0
      },
      removeAllListeners(event?: string) {
        if (event) {
          this.listeners.delete(event)
        } else {
          this.listeners.clear()
        }
      },
    }

    return {
      ...emitter,
      status: 'ready' as const,
      async get(key: string) {
        await Promise.resolve()
        return mockStorage.get(key) || null
      },
      async set(key: string, value: string) {
        await Promise.resolve()
        mockStorage.set(key, value)
        return 'OK' as const
      },
      async setex(key: string, seconds: number, value: string) {
        await Promise.resolve()
        mockStorage.set(key, value)
        setTimeout(() => mockStorage.delete(key), seconds * 1000)
        return 'OK' as const
      },
      async del(...keys: string[]) {
        await Promise.resolve()
        let count = 0
        keys.forEach(key => {
          if (mockStorage.delete(key)) count++
        })
        return count
      },
      async exists(...keys: string[]) {
        await Promise.resolve()
        return keys.reduce((count, key) => (mockStorage.has(key) ? count + 1 : count), 0)
      },
      async keys(pattern: string) {
        await Promise.resolve()
        const regex = new RegExp(pattern.replace(/\*/g, '.*'))
        return Array.from(mockStorage.keys()).filter(key => regex.test(key))
      },
      async flushdb() {
        await Promise.resolve()
        mockStorage.clear()
        return 'OK' as const
      },
      async dbsize() {
        await Promise.resolve()
        return mockStorage.size
      },
      async ttl() {
        await Promise.resolve()
        return -1
      }, // Mock: no expiration tracking
      async expire() {
        await Promise.resolve()
        return 1 as const
      },
      async hget() {
        await Promise.resolve()
        return null
      },
      async hset() {
        await Promise.resolve()
        return 1 as const
      },
      async hdel() {
        await Promise.resolve()
        return 0
      },
      async hgetall() {
        await Promise.resolve()
        return {}
      },
      async sadd() {
        await Promise.resolve()
        return 1
      },
      async smembers() {
        await Promise.resolve()
        return []
      },
      async srem() {
        await Promise.resolve()
        return 0
      },
      pipeline() {
        return this
      },
      async exec() {
        await Promise.resolve()
        return []
      },
      multi() {
        return this
      },
      async ping() {
        await Promise.resolve()
        return 'PONG' as const
      },
      async quit() {
        await Promise.resolve()
        return 'OK' as const
      },
      disconnect() {
        /* no-op */
      },
    }
  }

  private isConnected(): boolean {
    if (this.isCluster) {
      return (
        this.clusterClients.length > 0 &&
        this.clusterClients.every(client => client.status === 'ready')
      )
    } else {
      return this.client !== null && this.client.status === 'ready'
    }
  }

  private getClient(key: string): RedisClient {
    if (this.isCluster) {
      // Simple hash-based client selection
      const hash = this.hashKey(key)
      const clientIndex = hash % this.clusterClients.length
      return this.clusterClients[clientIndex]!
    } else {
      return this.client!
    }
  }

  private buildKey(key: string): string {
    const config = this.config as RedisConfig
    const prefix = config.keyPrefix || 'kairo:cache:'
    return `${prefix}${key}`
  }

  private buildTagKey(tag: string): string {
    return this.buildKey(`tags:${tag}`)
  }

  private hashKey(key: string): number {
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private async indexTags(key: string, tags: string[]): Promise<void> {
    try {
      const client = this.getClient(key)

      for (const tag of tags) {
        const tagKey = this.buildTagKey(tag)
        await client.sadd(tagKey, key)
      }
    } catch {
      console.warn('Failed to index tags')
    }
  }

  private cleanupTagIndices(_key: string): Promise<void> {
    return Promise.resolve()
    // This would require tracking which tags a key had
    // For simplicity, we'll skip this in the mock implementation
  }

  private async updateEntryMetadata<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const client = this.getClient(key)
      const serializedEntry = this.serializer.serialize(entry)
      await client.set(this.buildKey(key), serializedEntry)
    } catch {
      // Ignore metadata update failures
    }
  }
}

// Serialization interface for different data formats
export interface CacheSerializer {
  serialize<T>(data: T): string
  deserialize<T>(data: string): T
}

export class JSONSerializer implements CacheSerializer {
  serialize<T>(data: T): string {
    return JSON.stringify(data)
  }

  deserialize<T>(data: string): T {
    return JSON.parse(data) as T
  }
}

// MessagePack serializer (placeholder - would use actual msgpack library)
export class MessagePackSerializer implements CacheSerializer {
  serialize<T>(data: T): string {
    // In real implementation: return msgpack.encode(data).toString('base64')
    return JSON.stringify(data) // Fallback to JSON
  }

  deserialize<T>(data: string): T {
    // In real implementation: return msgpack.decode(Buffer.from(data, 'base64'))
    return JSON.parse(data) as T // Fallback to JSON
  }
}

// Compressed JSON serializer
export class CompressedJSONSerializer implements CacheSerializer {
  serialize<T>(data: T): string {
    const json = JSON.stringify(data)
    // In real implementation: return zlib.gzipSync(json).toString('base64')
    return json // Fallback to uncompressed
  }

  deserialize<T>(data: string): T {
    // In real implementation: return JSON.parse(zlib.gunzipSync(Buffer.from(data, 'base64')).toString())
    return JSON.parse(data) as T // Fallback to uncompressed
  }
}
