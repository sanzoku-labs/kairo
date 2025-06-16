import { type Result, Result as ResultUtils } from './result'

export interface PerformanceSpan {
  name: string
  startTime: number
  endTime?: number | undefined
  duration?: number | undefined
  metadata?: Record<string, unknown> | undefined
  children: PerformanceSpan[]
  parent?: PerformanceSpan | undefined
}

export interface PerformanceMetrics {
  spans: PerformanceSpan[]
  totalDuration: number
  metadata: Record<string, unknown>
}

export interface PerformanceMonitorOptions {
  enabled?: boolean
  autoFlush?: boolean
  flushInterval?: number
  maxSpans?: number
  onFlush?: (metrics: PerformanceMetrics[]) => void | Promise<void>
}

class PerformanceMonitor {
  private options: Required<PerformanceMonitorOptions>
  private currentSpan: PerformanceSpan | null = null
  private rootSpans: PerformanceSpan[] = []
  private metrics: PerformanceMetrics[] = []
  private flushTimer?: ReturnType<typeof globalThis.setInterval> | undefined

  constructor(options: PerformanceMonitorOptions = {}) {
    this.options = {
      enabled: options.enabled ?? true,
      autoFlush: options.autoFlush ?? true,
      flushInterval: options.flushInterval ?? 60000, // 1 minute
      maxSpans: options.maxSpans ?? 1000,
      onFlush: options.onFlush ?? (() => {}),
    }

    if (this.options.autoFlush && this.options.enabled) {
      this.startAutoFlush()
    }
  }

  // Start a new performance span
  startSpan(name: string, metadata?: Record<string, unknown>): PerformanceSpan {
    if (!this.options.enabled) {
      return this.createDummySpan(name)
    }

    const span: PerformanceSpan = {
      name,
      startTime: globalThis.performance.now(),
      metadata: metadata ?? undefined,
      children: [],
      parent: this.currentSpan ?? undefined,
    }

    if (this.currentSpan) {
      this.currentSpan.children.push(span)
    } else {
      this.rootSpans.push(span)
    }

    this.currentSpan = span
    return span
  }

  // End a performance span
  endSpan(span: PerformanceSpan): void {
    if (!this.options.enabled || span.endTime) {
      return
    }

    span.endTime = globalThis.performance.now()
    span.duration = (span.endTime ?? 0) - span.startTime

    // Move back to parent span
    if (this.currentSpan === span) {
      this.currentSpan = span.parent ?? null
    }

    // Check if we should flush
    if (this.rootSpans.length >= this.options.maxSpans) {
      void this.flush()
    }
  }

  // Create a traced function
  trace<T extends (...args: unknown[]) => unknown>(name: string, fn: T): T {
    if (!this.options.enabled) {
      return fn
    }

    return ((...args: unknown[]) => {
      const span = this.startSpan(name, { args: this.serializeArgs(args) })

      try {
        const result = fn(...args)

        if (result instanceof Promise) {
          return result
            .then(value => {
              span.metadata = { ...span.metadata, result: this.serializeResult(value) }
              this.endSpan(span)
              return value as Awaited<ReturnType<T>>
            })
            .catch(error => {
              span.metadata = { ...span.metadata, error: this.serializeError(error) }
              this.endSpan(span)
              throw error
            })
        }

        span.metadata = { ...span.metadata, result: this.serializeResult(result) }
        this.endSpan(span)
        return result
      } catch (error) {
        span.metadata = { ...span.metadata, error: this.serializeError(error) }
        this.endSpan(span)
        throw error as Error
      }
    }) as T
  }

  // Create a traced async function
  traceAsync<T extends (...args: unknown[]) => Promise<unknown>>(name: string, fn: T): T {
    return this.trace(name, fn)
  }

  // Measure a code block
  async measure<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    const span = this.startSpan(name)

    try {
      const result = await fn()
      span.metadata = { result: this.serializeResult(result) }
      this.endSpan(span)
      return result
    } catch (error) {
      span.metadata = { error: this.serializeError(error) }
      this.endSpan(span)
      throw error as Error
    }
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics[] {
    const currentMetrics = this.rootSpans.map(span => this.spanToMetrics(span))
    return [...this.metrics, ...currentMetrics]
  }

  // Flush collected metrics
  async flush(): Promise<void> {
    if (this.rootSpans.length === 0) {
      return
    }

    const metrics = this.rootSpans.map(span => this.spanToMetrics(span))
    this.metrics.push(...metrics)

    // Call the flush handler
    await this.options.onFlush(this.metrics)

    // Clear metrics after flush
    this.metrics = []
    this.rootSpans = []
    this.currentSpan = null
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean): void {
    this.options.enabled = enabled

    if (enabled && this.options.autoFlush) {
      this.startAutoFlush()
    } else {
      this.stopAutoFlush()
    }
  }

  // Reset all metrics
  reset(): void {
    this.rootSpans = []
    this.metrics = []
    this.currentSpan = null
  }

  // Private methods
  private createDummySpan(name: string): PerformanceSpan {
    return {
      name,
      startTime: 0,
      children: [],
    }
  }

  private spanToMetrics(span: PerformanceSpan): PerformanceMetrics {
    const allSpans = this.collectAllSpans(span)
    const totalDuration = span.duration ?? 0

    return {
      spans: allSpans,
      totalDuration,
      metadata: span.metadata ?? {},
    }
  }

  private collectAllSpans(
    span: PerformanceSpan,
    visited = new Set<PerformanceSpan>(),
    depth = 0
  ): PerformanceSpan[] {
    if (visited.has(span) || depth > 100) {
      return []
    }

    visited.add(span)
    const spans: PerformanceSpan[] = [span]

    for (const child of span.children) {
      spans.push(...this.collectAllSpans(child, visited, depth + 1))
    }

    return spans
  }

  private startAutoFlush(): void {
    this.flushTimer = globalThis.setInterval(() => {
      void this.flush()
    }, this.options.flushInterval)
  }

  private stopAutoFlush(): void {
    if (this.flushTimer) {
      globalThis.clearInterval(this.flushTimer)
      this.flushTimer = undefined
    }
  }

  private serializeArgs(args: unknown[]): unknown[] {
    return args.map(arg => this.serializeValue(arg))
  }

  private serializeResult(result: unknown): unknown {
    return this.serializeValue(result)
  }

  private serializeError(error: unknown): unknown {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }
    return this.serializeValue(error)
  }

  private serializeValue(value: unknown): unknown {
    try {
      // Handle circular references and special types
      return JSON.parse(
        JSON.stringify(value, (_key, val) => {
          if (val instanceof Set) return { type: 'Set', values: Array.from(val) }
          if (val instanceof Map) return { type: 'Map', entries: Array.from(val.entries()) }
          if (val instanceof Date) return { type: 'Date', value: val.toISOString() }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          if (typeof val === 'function') return { type: 'Function', name: val.name || 'anonymous' }
          if (typeof val === 'symbol') return { type: 'Symbol', description: val.description }
          if (typeof val === 'bigint') return { type: 'BigInt', value: val.toString() }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return val
        })
      )
    } catch {
      return { type: 'Unserializable', toString: String(value) }
    }
  }
}

// Global performance monitor instance
let globalMonitor: PerformanceMonitor | null = null

// Initialize global monitor
export function initializePerformanceMonitor(options?: PerformanceMonitorOptions): void {
  globalMonitor = new PerformanceMonitor(options)
}

// Get global monitor
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor()
  }
  return globalMonitor
}

// Performance decorators for methods
export function Trace(name?: string) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown
    const targetConstructor = target as { constructor: { name: string } }
    const traceName = name || `${targetConstructor.constructor.name}.${propertyKey}`

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const monitor = getPerformanceMonitor()
      const tracedFn = monitor.trace(traceName, originalMethod)
      return tracedFn.call(this, ...args)
    }

    return descriptor
  }
}

// Performance utilities
export const performance = {
  // Start a new span
  startSpan: (name: string, metadata?: Record<string, unknown>) =>
    getPerformanceMonitor().startSpan(name, metadata),

  // End a span
  endSpan: (span: PerformanceSpan) => getPerformanceMonitor().endSpan(span),

  // Trace a function
  trace: <T extends (...args: unknown[]) => unknown>(name: string, fn: T) =>
    getPerformanceMonitor().trace(name, fn),

  // Trace an async function
  traceAsync: <T extends (...args: unknown[]) => Promise<unknown>>(name: string, fn: T) =>
    getPerformanceMonitor().traceAsync(name, fn),

  // Measure a code block
  measure: <T>(name: string, fn: () => T | Promise<T>) => getPerformanceMonitor().measure(name, fn),

  // Get current metrics
  getMetrics: () => getPerformanceMonitor().getMetrics(),

  // Flush metrics
  flush: () => getPerformanceMonitor().flush(),

  // Enable/disable monitoring
  setEnabled: (enabled: boolean) => getPerformanceMonitor().setEnabled(enabled),

  // Reset metrics
  reset: () => getPerformanceMonitor().reset(),

  // Initialize with options
  initialize: (options?: PerformanceMonitorOptions) => initializePerformanceMonitor(options),
}

// Resource pool for connection pooling
export interface PoolOptions<T> {
  min?: number
  max?: number
  idleTimeout?: number
  acquireTimeout?: number
  createResource: () => Promise<T>
  destroyResource?: (resource: T) => Promise<void>
  validateResource?: (resource: T) => Promise<boolean>
}

export interface PooledResource<T> {
  resource: T
  lastUsed: number
  inUse: boolean
}

export class ResourcePool<T> {
  private options: Required<PoolOptions<T>>
  private resources: PooledResource<T>[] = []
  private waitingQueue: Array<{
    resolve: (resource: T) => void
    reject: (error: Error) => void
    timeout: ReturnType<typeof setTimeout>
  }> = []
  private idleCheckInterval?: ReturnType<typeof globalThis.setInterval> | undefined

  constructor(options: PoolOptions<T>) {
    this.options = {
      min: options.min ?? 0,
      max: options.max ?? 10,
      idleTimeout: options.idleTimeout ?? 30000, // 30 seconds
      acquireTimeout: options.acquireTimeout ?? 5000, // 5 seconds
      createResource: options.createResource,
      destroyResource:
        options.destroyResource ??
        (async () => {
          await Promise.resolve()
        }),
      validateResource:
        options.validateResource ??
        (async () => {
          await Promise.resolve()
          return true
        }),
    }

    // Initialize minimum resources
    void this.initializePool()

    // Start idle resource cleanup
    this.startIdleCheck()
  }

  // Acquire a resource from the pool
  async acquire(): Promise<T> {
    // Try to find an available resource
    const available = this.resources.find(r => !r.inUse)

    if (available) {
      // Validate the resource
      const isValid = await this.options.validateResource(available.resource)

      if (isValid) {
        available.inUse = true
        available.lastUsed = Date.now()
        return available.resource
      } else {
        // Remove invalid resource
        this.resources = this.resources.filter(r => r !== available)
        await this.options.destroyResource(available.resource)
      }
    }

    // Create new resource if under max limit
    if (this.resources.length < this.options.max) {
      const resource = await this.options.createResource()
      const pooledResource: PooledResource<T> = {
        resource,
        lastUsed: Date.now(),
        inUse: true,
      }
      this.resources.push(pooledResource)
      return resource
    }

    // Wait for a resource to become available
    return new Promise((resolve, reject) => {
      const timeout = globalThis.setTimeout(() => {
        const index = this.waitingQueue.findIndex(w => w.resolve === resolve)
        if (index !== -1) {
          this.waitingQueue.splice(index, 1)
        }
        reject(new Error('Resource acquisition timeout'))
      }, this.options.acquireTimeout)

      this.waitingQueue.push({ resolve, reject, timeout })
    })
  }

  // Release a resource back to the pool
  release(resource: T): void {
    const pooledResource = this.resources.find(r => r.resource === resource)

    if (!pooledResource) {
      return
    }

    pooledResource.inUse = false
    pooledResource.lastUsed = Date.now()

    // Check if anyone is waiting for a resource
    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift()
      if (waiter) {
        globalThis.clearTimeout(waiter.timeout)
        pooledResource.inUse = true
        waiter.resolve(resource)
      }
    }
  }

  // Destroy a resource
  async destroy(resource: T): Promise<void> {
    const index = this.resources.findIndex(r => r.resource === resource)

    if (index !== -1) {
      this.resources.splice(index, 1)
      await this.options.destroyResource(resource)
    }
  }

  // Drain the pool
  async drain(): Promise<void> {
    // Reject all waiting requests
    for (const waiter of this.waitingQueue) {
      globalThis.clearTimeout(waiter.timeout)
      waiter.reject(new Error('Pool is draining'))
    }
    this.waitingQueue = []

    // Destroy all resources
    const destroyPromises = this.resources.map(r => this.options.destroyResource(r.resource))
    await Promise.all(destroyPromises)
    this.resources = []

    // Stop idle check
    if (this.idleCheckInterval) {
      globalThis.clearInterval(this.idleCheckInterval)
      this.idleCheckInterval = undefined
    }
  }

  // Get pool statistics
  getStats(): {
    total: number
    available: number
    inUse: number
    waiting: number
  } {
    const available = this.resources.filter(r => !r.inUse).length
    const inUse = this.resources.filter(r => r.inUse).length

    return {
      total: this.resources.length,
      available,
      inUse,
      waiting: this.waitingQueue.length,
    }
  }

  private async initializePool(): Promise<void> {
    const createPromises = Array.from({ length: this.options.min }, async () => {
      try {
        const resource = await this.options.createResource()
        this.resources.push({
          resource,
          lastUsed: Date.now(),
          inUse: false,
        })
      } catch (error) {
        console.error('Failed to create initial resource:', error)
      }
    })

    await Promise.all(createPromises)
  }

  private startIdleCheck(): void {
    this.idleCheckInterval = globalThis.setInterval(() => {
      void this.removeIdleResources()
    }, this.options.idleTimeout / 2)
  }

  private async removeIdleResources(): Promise<void> {
    const now = Date.now()
    const toRemove: PooledResource<T>[] = []

    // Find idle resources
    for (const resource of this.resources) {
      if (
        !resource.inUse &&
        now - resource.lastUsed > this.options.idleTimeout &&
        this.resources.length > this.options.min
      ) {
        toRemove.push(resource)
      }
    }

    // Remove idle resources
    for (const resource of toRemove) {
      this.resources = this.resources.filter(r => r !== resource)
      await this.options.destroyResource(resource.resource)
    }
  }
}

// Lazy loading wrapper
export interface LazyOptions<T> {
  loader: () => Promise<T>
  cache?: boolean
  ttl?: number
  onLoad?: (value: T) => void
  onError?: (error: Error) => void
}

export class Lazy<T> {
  private value?: T | undefined
  private loading = false
  private loadPromise?: Promise<T> | undefined
  private loadTime?: number | undefined
  private error?: Error | undefined

  constructor(private options: LazyOptions<T>) {}

  // Get the value, loading if necessary
  async get(): Promise<Result<Error, T>> {
    // Check if already loaded and still valid
    if (this.value !== undefined && this.isValid()) {
      return ResultUtils.Ok(this.value)
    }

    // Check if there's an error from previous load
    if (this.error && !this.shouldRetry()) {
      return ResultUtils.Err(this.error)
    }

    // If already loading, wait for the result
    if (this.loading && this.loadPromise) {
      try {
        const value = await this.loadPromise
        return ResultUtils.Ok(value)
      } catch (error) {
        return ResultUtils.Err(error as Error)
      }
    }

    // Start loading
    this.loading = true
    this.error = undefined

    this.loadPromise = this.options
      .loader()
      .then(value => {
        this.value = value
        this.loadTime = Date.now()
        this.loading = false
        if (this.options.onLoad) {
          this.options.onLoad(value)
        }
        return value
      })
      .catch(error => {
        this.error = error instanceof Error ? error : new Error(String(error))
        this.loading = false
        if (this.options.onError) {
          this.options.onError(this.error)
        }
        throw this.error
      })

    try {
      const value = await this.loadPromise
      return ResultUtils.Ok(value)
    } catch (error) {
      return ResultUtils.Err(error as Error)
    }
  }

  // Check if value exists without loading
  has(): boolean {
    return this.value !== undefined && this.isValid()
  }

  // Clear the cached value
  clear(): void {
    this.value = undefined
    this.loadTime = undefined
    this.error = undefined
    this.loading = false
    this.loadPromise = undefined
  }

  // Force reload
  async reload(): Promise<Result<Error, T>> {
    this.clear()
    return this.get()
  }

  private isValid(): boolean {
    if (!this.options.cache) {
      return false
    }

    if (!this.options.ttl || !this.loadTime) {
      return true
    }

    return Date.now() - this.loadTime < this.options.ttl
  }

  private shouldRetry(): boolean {
    // Simple retry logic - retry after 5 seconds
    return this.loadTime ? Date.now() - this.loadTime > 5000 : true
  }
}

// Batch processor for optimizing multiple operations
export interface BatchProcessorOptions<T, R> {
  batchSize?: number
  batchDelay?: number
  maxWaitTime?: number
  processor: (items: T[]) => Promise<R[]>
}

export class BatchProcessor<T, R> {
  private options: Required<BatchProcessorOptions<T, R>>
  private queue: Array<{
    item: T
    resolve: (result: R) => void
    reject: (error: Error) => void
    timestamp: number
  }> = []
  private batchTimer?: ReturnType<typeof setTimeout> | undefined
  private processing = false

  constructor(options: BatchProcessorOptions<T, R>) {
    this.options = {
      batchSize: options.batchSize ?? 100,
      batchDelay: options.batchDelay ?? 10,
      maxWaitTime: options.maxWaitTime ?? 100,
      processor: options.processor,
    }
  }

  // Add item to batch
  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        item,
        resolve,
        reject,
        timestamp: Date.now(),
      })

      this.scheduleBatch()
    })
  }

  // Process all pending items immediately
  async flush(): Promise<void> {
    if (this.batchTimer) {
      globalThis.clearTimeout(this.batchTimer)
      this.batchTimer = undefined
    }

    await this.processBatch()
  }

  private scheduleBatch(): void {
    // If already processing, wait
    if (this.processing) {
      return
    }

    // Check if we should process immediately
    const now = Date.now()
    const oldestItem = this.queue[0]
    const shouldProcessNow =
      this.queue.length >= this.options.batchSize ||
      (oldestItem && now - oldestItem.timestamp >= this.options.maxWaitTime)

    if (shouldProcessNow) {
      void this.processBatch()
      return
    }

    // Schedule batch processing
    if (!this.batchTimer) {
      this.batchTimer = globalThis.setTimeout(() => {
        void this.processBatch()
      }, this.options.batchDelay)
    }
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true
    this.batchTimer = undefined

    // Get items to process
    const batch = this.queue.splice(0, this.options.batchSize)
    const items = batch.map(b => b.item)

    try {
      const results = await this.options.processor(items)

      // Resolve individual promises
      for (let i = 0; i < batch.length; i++) {
        const result = results[i]
        if (result !== undefined) {
          batch[i]?.resolve(result)
        } else {
          batch[i]?.reject(new Error('No result returned for batch item'))
        }
      }
    } catch (error) {
      // Reject all promises in the batch
      const errorObj = error instanceof Error ? error : new Error(String(error))
      for (const item of batch) {
        item.reject(errorObj)
      }
    } finally {
      this.processing = false

      // Check if there are more items to process
      if (this.queue.length > 0) {
        this.scheduleBatch()
      }
    }
  }
}
