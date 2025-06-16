import { type KairoError, createError } from './errors'

export interface AnalyticsError extends KairoError {
  code: 'ANALYTICS_ERROR'
  operation: string
}

// Analytics error creation utility (reserved for future use)
const createAnalyticsError = (
  operation: string,
  message: string,
  context = {}
): AnalyticsError => ({
  ...createError('ANALYTICS_ERROR', message, context),
  code: 'ANALYTICS_ERROR',
  operation,
})

// Prevent unused variable warning
void createAnalyticsError

// Cache metrics collection
export interface CacheMetrics {
  hits: number
  misses: number
  sets: number
  deletes: number
  evictions: number
  errors: number
  totalOperations: number
  hitRate: number
  missRate: number
  errorRate: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  memoryUsage: number
  keyCount: number
  layerStats: Array<{
    name: string
    hits: number
    misses: number
    hitRate: number
    memoryUsage: number
    keyCount: number
  }>
}

// Real-time performance metrics
export interface PerformanceMetrics {
  operationsPerSecond: number
  averageLatency: number
  p50Latency: number
  p95Latency: number
  p99Latency: number
  throughput: number
  concurrentOperations: number
  queuedOperations: number
  errorCount: number
  memoryPressure: number
  gcPressure?: number
}

// Cache health indicators
export interface HealthMetrics {
  overall: 'healthy' | 'warning' | 'critical'
  score: number // 0-100
  indicators: {
    hitRate: { status: 'good' | 'warning' | 'critical'; value: number; threshold: number }
    responseTime: { status: 'good' | 'warning' | 'critical'; value: number; threshold: number }
    errorRate: { status: 'good' | 'warning' | 'critical'; value: number; threshold: number }
    memoryUsage: { status: 'good' | 'warning' | 'critical'; value: number; threshold: number }
    connectivity: { status: 'good' | 'warning' | 'critical'; value: string }
  }
  recommendations: string[]
}

// Time-series data point
export interface MetricDataPoint {
  timestamp: number
  value: number
  metadata?: Record<string, unknown>
}

// Metric aggregation periods
export type AggregationPeriod = '1m' | '5m' | '15m' | '1h' | '1d'

// Analytics configuration
export interface AnalyticsConfig {
  enabled: boolean
  sampleRate: number // 0-1, percentage of operations to track
  retentionPeriod: number // milliseconds
  aggregationPeriods: AggregationPeriod[]
  alertThresholds: {
    hitRate: number
    errorRate: number
    responseTime: number
    memoryUsage: number
  }
  enableDetailed: boolean
  enablePredictive: boolean
  customMetrics?: Array<{
    name: string
    calculator: (metrics: CacheMetrics) => number
  }>
}

// Cache analytics and monitoring system
export class CacheAnalytics {
  private metrics: CacheMetrics
  private performanceHistory: Map<string, MetricDataPoint[]> = new Map()
  private responseTimes: number[] = []
  private operationCounts: Map<string, number> = new Map()
  private startTime = Date.now()
  private lastCleanup = Date.now()
  private concurrentOps = 0
  private alertCallbacks: Array<(type: string, metric: unknown) => void> = []

  constructor(private config: AnalyticsConfig) {
    this.metrics = this.initializeMetrics()

    if (config.enabled) {
      this.startPeriodicCollection()
    }
  }

  // Record cache operation
  recordOperation(
    operation: 'hit' | 'miss' | 'set' | 'delete' | 'eviction' | 'error',
    responseTime: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return
    }

    // Update basic metrics
    switch (operation) {
      case 'hit':
        this.metrics.hits++
        break
      case 'miss':
        this.metrics.misses++
        break
      case 'set':
        this.metrics.sets++
        break
      case 'delete':
        this.metrics.deletes++
        break
      case 'eviction':
        this.metrics.evictions++
        break
      case 'error':
        this.metrics.errors++
        break
    }

    this.metrics.totalOperations++

    // Update response time tracking
    this.responseTimes.push(responseTime)

    // Keep only recent response times for calculation
    if (this.responseTimes.length > 10000) {
      this.responseTimes = this.responseTimes.slice(-5000)
    }

    // Record time-series data
    this.recordTimeSeries(operation, responseTime, metadata)

    // Update derived metrics
    this.updateDerivedMetrics()

    // Check for alerts
    this.checkAlerts()
  }

  // Record layer-specific metrics
  recordLayerMetrics(
    layerName: string,
    operation: 'hit' | 'miss',
    _metadata?: Record<string, unknown>
  ): void {
    if (!this.config.enabled) return

    let layerStats = this.metrics.layerStats.find(layer => layer.name === layerName)
    if (!layerStats) {
      layerStats = {
        name: layerName,
        hits: 0,
        misses: 0,
        hitRate: 0,
        memoryUsage: 0,
        keyCount: 0,
      }
      this.metrics.layerStats.push(layerStats)
    }

    if (operation === 'hit') {
      layerStats.hits++
    } else {
      layerStats.misses++
    }

    layerStats.hitRate = layerStats.hits / (layerStats.hits + layerStats.misses)
  }

  // Start concurrent operation tracking
  startOperation(): void {
    this.concurrentOps++
  }

  // End concurrent operation tracking
  endOperation(): void {
    this.concurrentOps = Math.max(0, this.concurrentOps - 1)
  }

  // Get current metrics snapshot
  getMetrics(): CacheMetrics {
    this.updateDerivedMetrics()
    return { ...this.metrics }
  }

  // Get performance metrics
  getPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now()
    const duration = (now - this.startTime) / 1000
    const recentOps = this.getRecentOperations(60000) // Last minute

    return {
      operationsPerSecond: this.metrics.totalOperations / duration,
      averageLatency: this.metrics.averageResponseTime,
      p50Latency: this.calculatePercentile(50),
      p95Latency: this.calculatePercentile(95),
      p99Latency: this.calculatePercentile(99),
      throughput: recentOps.length / 60, // Ops per second in last minute
      concurrentOperations: this.concurrentOps,
      queuedOperations: 0, // Would track queued operations in real implementation
      errorCount: this.metrics.errors,
      memoryPressure: this.calculateMemoryPressure(),
      gcPressure: this.calculateGCPressure() ?? 0,
    }
  }

  // Get health assessment
  getHealthMetrics(): HealthMetrics {
    const metrics = this.getMetrics()
    const thresholds = this.config.alertThresholds

    const indicators = {
      hitRate: {
        status: this.getStatus(metrics.hitRate, thresholds.hitRate, 'greater'),
        value: metrics.hitRate,
        threshold: thresholds.hitRate,
      },
      responseTime: {
        status: this.getStatus(metrics.averageResponseTime, thresholds.responseTime, 'less'),
        value: metrics.averageResponseTime,
        threshold: thresholds.responseTime,
      },
      errorRate: {
        status: this.getStatus(metrics.errorRate, thresholds.errorRate, 'less'),
        value: metrics.errorRate,
        threshold: thresholds.errorRate,
      },
      memoryUsage: {
        status: this.getStatus(metrics.memoryUsage, thresholds.memoryUsage, 'less'),
        value: metrics.memoryUsage,
        threshold: thresholds.memoryUsage,
      },
      connectivity: {
        status: 'good' as const,
        value: 'connected',
      },
    }

    const score = this.calculateHealthScore(indicators)
    const overall = score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical'
    const recommendations = this.generateRecommendations(indicators, metrics)

    return {
      overall,
      score,
      indicators,
      recommendations,
    }
  }

  // Get historical data for a metric
  getHistoricalData(
    metric: string,
    period: AggregationPeriod,
    limit: number = 100
  ): MetricDataPoint[] {
    const key = `${metric}:${period}`
    const data = this.performanceHistory.get(key) || []
    return data.slice(-limit)
  }

  // Get cache efficiency analysis
  getEfficiencyAnalysis(): {
    efficiency: number
    bottlenecks: string[]
    optimizations: string[]
    costAnalysis: {
      hitCost: number
      missCost: number
      storageEfficiency: number
    }
  } {
    const metrics = this.getMetrics()

    const efficiency = this.calculateCacheEfficiency(metrics)
    const bottlenecks = this.identifyBottlenecks(metrics)
    const optimizations = this.suggestOptimizations(metrics)

    return {
      efficiency,
      bottlenecks,
      optimizations,
      costAnalysis: {
        hitCost: 1, // Relative cost of cache hit
        missCost: 10, // Relative cost of cache miss
        storageEfficiency: metrics.keyCount / Math.max(metrics.memoryUsage, 1),
      },
    }
  }

  // Register alert callback
  onAlert(callback: (type: string, metric: unknown) => void): void {
    this.alertCallbacks.push(callback)
  }

  // Clear historical data
  clearHistory(): void {
    this.performanceHistory.clear()
    this.responseTimes = []
    this.operationCounts.clear()
    this.startTime = Date.now()
  }

  // Export analytics data
  exportData(): {
    metrics: CacheMetrics
    performance: PerformanceMetrics
    health: HealthMetrics
    efficiency: ReturnType<CacheAnalytics['getEfficiencyAnalysis']>
    history: Record<string, MetricDataPoint[]>
  } {
    const historyObj: Record<string, MetricDataPoint[]> = {}
    for (const [key, value] of this.performanceHistory.entries()) {
      historyObj[key] = value
    }

    return {
      metrics: this.getMetrics(),
      performance: this.getPerformanceMetrics(),
      health: this.getHealthMetrics(),
      efficiency: this.getEfficiencyAnalysis(),
      history: historyObj,
    }
  }

  // Update memory usage metrics
  updateMemoryUsage(usage: number, keyCount: number): void {
    this.metrics.memoryUsage = usage
    this.metrics.keyCount = keyCount
  }

  // Update layer memory usage
  updateLayerMemoryUsage(layerName: string, usage: number, keyCount: number): void {
    const layerStats = this.metrics.layerStats.find(layer => layer.name === layerName)
    if (layerStats) {
      layerStats.memoryUsage = usage
      layerStats.keyCount = keyCount
    }
  }

  // Private helper methods
  private initializeMetrics(): CacheMetrics {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      errors: 0,
      totalOperations: 0,
      hitRate: 0,
      missRate: 0,
      errorRate: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      memoryUsage: 0,
      keyCount: 0,
      layerStats: [],
    }
  }

  private updateDerivedMetrics(): void {
    const total = this.metrics.hits + this.metrics.misses
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0
    this.metrics.missRate = total > 0 ? this.metrics.misses / total : 0
    this.metrics.errorRate =
      this.metrics.totalOperations > 0 ? this.metrics.errors / this.metrics.totalOperations : 0

    if (this.responseTimes.length > 0) {
      this.metrics.averageResponseTime =
        this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      this.metrics.p95ResponseTime = this.calculatePercentile(95)
      this.metrics.p99ResponseTime = this.calculatePercentile(99)
    }
  }

  private recordTimeSeries(
    operation: string,
    value: number,
    metadata?: Record<string, unknown>
  ): void {
    const now = Date.now()
    const dataPoint: MetricDataPoint = { timestamp: now, value, metadata: metadata ?? {} }

    for (const period of this.config.aggregationPeriods) {
      const key = `${operation}:${period}`

      if (!this.performanceHistory.has(key)) {
        this.performanceHistory.set(key, [])
      }

      const history = this.performanceHistory.get(key)!
      history.push(dataPoint)

      // Keep only data within retention period
      const retentionCutoff = now - this.config.retentionPeriod
      const filtered = history.filter(point => point.timestamp >= retentionCutoff)
      this.performanceHistory.set(key, filtered)
    }
  }

  private calculatePercentile(percentile: number): number {
    if (this.responseTimes.length === 0) return 0

    const sorted = [...this.responseTimes].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)] ?? 0
  }

  private getRecentOperations(timeWindow: number): MetricDataPoint[] {
    const cutoff = Date.now() - timeWindow
    const recent: MetricDataPoint[] = []

    for (const history of this.performanceHistory.values()) {
      recent.push(...history.filter(point => point.timestamp >= cutoff))
    }

    return recent.sort((a, b) => a.timestamp - b.timestamp)
  }

  private calculateMemoryPressure(): number {
    // Simulate memory pressure calculation
    return Math.min(this.metrics.memoryUsage / (100 * 1024 * 1024), 1) // Normalize to 100MB
  }

  private calculateGCPressure(): number | undefined {
    // Would integrate with V8 GC metrics in Node.js
    return undefined
  }

  private getStatus(
    value: number,
    threshold: number,
    comparison: 'greater' | 'less'
  ): 'good' | 'warning' | 'critical' {
    const isGood = comparison === 'greater' ? value >= threshold : value <= threshold
    const isWarning = comparison === 'greater' ? value >= threshold * 0.8 : value <= threshold * 1.2

    if (isGood) return 'good'
    if (isWarning) return 'warning'
    return 'critical'
  }

  private calculateHealthScore(indicators: HealthMetrics['indicators']): number {
    const scores = Object.values(indicators).map(indicator => {
      switch (indicator.status) {
        case 'good':
          return 100
        case 'warning':
          return 70
        case 'critical':
          return 30
        default:
          return 50
      }
    })

    return scores.reduce((a, b) => a + b, 0) / scores.length
  }

  private generateRecommendations(
    indicators: HealthMetrics['indicators'],
    metrics: CacheMetrics
  ): string[] {
    const recommendations: string[] = []

    if (indicators.hitRate.status !== 'good') {
      recommendations.push('Consider increasing cache size or adjusting TTL values')
    }

    if (indicators.responseTime.status !== 'good') {
      recommendations.push('Optimize cache storage backend or reduce data size')
    }

    if (indicators.errorRate.status !== 'good') {
      recommendations.push('Check connectivity and error handling in cache operations')
    }

    if (indicators.memoryUsage.status !== 'good') {
      recommendations.push('Reduce cache size or implement more aggressive eviction policies')
    }

    if (metrics.evictions > metrics.sets * 0.1) {
      recommendations.push('Cache eviction rate is high - consider increasing cache size')
    }

    return recommendations
  }

  private calculateCacheEfficiency(metrics: CacheMetrics): number {
    // Efficiency = (hits * hit_value - misses * miss_cost - storage_cost) / total_operations
    const hitValue = 10
    const missCost = 100
    const storageCost = metrics.memoryUsage * 0.001

    const benefit = metrics.hits * hitValue - metrics.misses * missCost - storageCost
    return metrics.totalOperations > 0 ? benefit / metrics.totalOperations : 0
  }

  private identifyBottlenecks(metrics: CacheMetrics): string[] {
    const bottlenecks: string[] = []

    if (metrics.hitRate < 0.7) {
      bottlenecks.push('Low hit rate indicates poor cache efficiency')
    }

    if (metrics.averageResponseTime > 100) {
      bottlenecks.push('High response times may indicate storage backend issues')
    }

    if (metrics.evictions > metrics.sets * 0.2) {
      bottlenecks.push('High eviction rate suggests inadequate cache size')
    }

    if (metrics.errorRate > 0.01) {
      bottlenecks.push('High error rate indicates reliability issues')
    }

    return bottlenecks
  }

  private suggestOptimizations(metrics: CacheMetrics): string[] {
    const optimizations: string[] = []

    if (metrics.hitRate < 0.8) {
      optimizations.push('Implement cache warming for frequently accessed data')
      optimizations.push('Review and optimize cache key design')
    }

    if (metrics.memoryUsage > 50 * 1024 * 1024) {
      // 50MB
      optimizations.push('Consider implementing data compression')
      optimizations.push('Review cache TTL values for optimal memory usage')
    }

    if (metrics.averageResponseTime > 50) {
      optimizations.push('Consider using faster storage backend')
      optimizations.push('Implement connection pooling for better performance')
    }

    return optimizations
  }

  private checkAlerts(): void {
    const metrics = this.getMetrics()
    const thresholds = this.config.alertThresholds

    if (metrics.hitRate < thresholds.hitRate) {
      this.triggerAlert('low_hit_rate', { hitRate: metrics.hitRate, threshold: thresholds.hitRate })
    }

    if (metrics.errorRate > thresholds.errorRate) {
      this.triggerAlert('high_error_rate', {
        errorRate: metrics.errorRate,
        threshold: thresholds.errorRate,
      })
    }

    if (metrics.averageResponseTime > thresholds.responseTime) {
      this.triggerAlert('high_response_time', {
        responseTime: metrics.averageResponseTime,
        threshold: thresholds.responseTime,
      })
    }

    if (metrics.memoryUsage > thresholds.memoryUsage) {
      this.triggerAlert('high_memory_usage', {
        memoryUsage: metrics.memoryUsage,
        threshold: thresholds.memoryUsage,
      })
    }
  }

  private triggerAlert(type: string, metric: unknown): void {
    for (const callback of this.alertCallbacks) {
      try {
        callback(type, metric)
      } catch (error) {
        console.warn('Alert callback failed:', error)
      }
    }
  }

  private startPeriodicCollection(): void {
    globalThis.setInterval(() => {
      this.cleanup()
    }, 300000) // Cleanup every 5 minutes
  }

  private cleanup(): void {
    const now = Date.now()

    // Only cleanup if enough time has passed
    if (now - this.lastCleanup < 300000) return

    this.lastCleanup = now
    const retentionCutoff = now - this.config.retentionPeriod

    // Clean up old time-series data
    for (const [key, history] of this.performanceHistory.entries()) {
      const filtered = history.filter(point => point.timestamp >= retentionCutoff)
      this.performanceHistory.set(key, filtered)
    }

    // Clean up old response times
    if (this.responseTimes.length > 10000) {
      this.responseTimes = this.responseTimes.slice(-5000)
    }
  }
}

// Default analytics configuration
export const defaultAnalyticsConfig: AnalyticsConfig = {
  enabled: true,
  sampleRate: 1.0,
  retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  aggregationPeriods: ['1m', '5m', '15m', '1h'],
  alertThresholds: {
    hitRate: 0.8,
    errorRate: 0.01,
    responseTime: 100,
    memoryUsage: 100 * 1024 * 1024, // 100MB
  },
  enableDetailed: true,
  enablePredictive: false,
}
