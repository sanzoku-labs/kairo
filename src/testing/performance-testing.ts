interface GlobalWithGC {
  gc?: () => void
}

interface ProcessWithMemory {
  memoryUsage?: () => {
    heapUsed?: number
    heapTotal?: number
    external?: number
    rss?: number
  }
}

declare const global: GlobalWithGC
declare const process: ProcessWithMemory
declare const setInterval: (callback: () => void, ms: number) => number
declare const clearInterval: (id: number) => void

export interface PerformanceTestOptions {
  iterations?: number
  concurrency?: number
  warmupIterations?: number
  timeout?: number
  rampUpTime?: number
  collectGC?: boolean
}

export interface PerformanceMetrics {
  totalDuration: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  medianDuration: number
  p95Duration: number
  p99Duration: number
  throughput: number // operations per second
  successRate: number
  errorRate: number
  memoryUsage?: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
}

export interface PerformanceTestResult {
  testName: string
  metrics: PerformanceMetrics
  iterations: number
  concurrency: number
  errors: unknown[]
  rawDurations: number[]
}

export interface LoadTestOptions extends PerformanceTestOptions {
  targetThroughput?: number // operations per second
  duration?: number // test duration in seconds
  pattern?: 'constant' | 'ramp-up' | 'spike' | 'step'
}

export interface LoadTestResult extends PerformanceTestResult {
  targetThroughput?: number
  actualThroughput: number
  sustainedLoad: boolean
  breakdown: {
    successful: number
    failed: number
    timeouts: number
  }
}

export class PerformanceTester {
  // Run performance test on any async function
  async test<T>(
    testName: string,
    testFunction: () => Promise<T>,
    options: PerformanceTestOptions = {}
  ): Promise<PerformanceTestResult> {
    const {
      iterations = 100,
      concurrency = 1,
      warmupIterations = 10,
      timeout = 30000,
      collectGC = false,
    } = options

    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      try {
        await testFunction()
      } catch {
        // Ignore warmup errors
      }
    }

    // Force garbage collection if requested and available
    if (collectGC && global?.gc && typeof global.gc === 'function') {
      global.gc()
    }

    const durations: number[] = []
    const errors: unknown[] = []
    let successful = 0

    const startTime = performance.now()
    let initialMemory: ReturnType<NonNullable<ProcessWithMemory['memoryUsage']>> | undefined

    if (process?.memoryUsage && typeof process.memoryUsage === 'function') {
      initialMemory = process.memoryUsage()
    }

    // Run tests
    if (concurrency === 1) {
      // Sequential execution
      for (let i = 0; i < iterations; i++) {
        const { duration, success, error } = await this.runSingleIteration(testFunction, timeout)
        durations.push(duration)

        if (success) {
          successful++
        } else {
          if (error) errors.push(error)
        }
      }
    } else {
      // Concurrent execution
      const iterationsPerWorker = Math.ceil(iterations / concurrency)
      const workers = Array.from({ length: concurrency }, async () => {
        const workerDurations: number[] = []
        const workerErrors: unknown[] = []
        let workerSuccessful = 0

        for (let i = 0; i < iterationsPerWorker && durations.length < iterations; i++) {
          const { duration, success, error } = await this.runSingleIteration(testFunction, timeout)
          workerDurations.push(duration)

          if (success) {
            workerSuccessful++
          } else {
            if (error) workerErrors.push(error)
          }
        }

        return { durations: workerDurations, errors: workerErrors, successful: workerSuccessful }
      })

      const results = await Promise.all(workers)

      // Combine results
      for (const result of results) {
        durations.push(...result.durations)
        errors.push(...result.errors)
        successful += result.successful
      }
    }

    const totalDuration = performance.now() - startTime
    let finalMemory: ReturnType<NonNullable<ProcessWithMemory['memoryUsage']>> | undefined

    if (process?.memoryUsage && typeof process.memoryUsage === 'function') {
      finalMemory = process.memoryUsage()
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(durations, successful, errors.length, totalDuration)

    if (initialMemory && finalMemory) {
      metrics.memoryUsage = {
        heapUsed: (finalMemory.heapUsed ?? 0) - (initialMemory.heapUsed ?? 0),
        heapTotal: (finalMemory.heapTotal ?? 0) - (initialMemory.heapTotal ?? 0),
        external: (finalMemory.external ?? 0) - (initialMemory.external ?? 0),
        rss: (finalMemory.rss ?? 0) - (initialMemory.rss ?? 0),
      }
    }

    return {
      testName,
      metrics,
      iterations: durations.length,
      concurrency,
      errors,
      rawDurations: durations,
    }
  }

  // Run load test
  async loadTest<T>(
    testName: string,
    testFunction: () => Promise<T>,
    options: LoadTestOptions = {}
  ): Promise<LoadTestResult> {
    const {
      duration = 60, // 60 seconds default
      targetThroughput = 100, // 100 ops/sec default
      pattern = 'constant',
      concurrency = 10,
      timeout = 30000,
    } = options

    const startTime = performance.now()
    const endTime = startTime + duration * 1000

    const durations: number[] = []
    const errors: unknown[] = []
    let successful = 0
    let failed = 0
    let timeouts = 0

    const workers = Array.from({ length: concurrency }, async () => {
      const workerDurations: number[] = []
      const workerErrors: unknown[] = []
      let workerSuccessful = 0
      let workerFailed = 0
      let workerTimeouts = 0

      while (performance.now() < endTime) {
        const currentTime = performance.now()
        const elapsedTime = (currentTime - startTime) / 1000

        // Calculate current target rate based on pattern
        const currentRate = this.calculateCurrentRate(
          pattern,
          elapsedTime,
          duration,
          targetThroughput
        )

        // Calculate delay to maintain target rate
        const expectedOperations = Math.floor((elapsedTime * currentRate) / concurrency)
        const actualOperations = workerDurations.length

        if (actualOperations >= expectedOperations) {
          // We're ahead of schedule, wait a bit
          await new Promise(resolve => setTimeout(resolve, 10))
          continue
        }

        const {
          duration: operationDuration,
          success,
          error,
          timedOut,
        } = await this.runSingleIteration(testFunction, timeout)
        workerDurations.push(operationDuration)

        if (success) {
          workerSuccessful++
        } else {
          if (timedOut) {
            workerTimeouts++
          } else {
            workerFailed++
          }
          if (error) workerErrors.push(error)
        }
      }

      return {
        durations: workerDurations,
        errors: workerErrors,
        successful: workerSuccessful,
        failed: workerFailed,
        timeouts: workerTimeouts,
      }
    })

    const results = await Promise.all(workers)

    // Combine results
    for (const result of results) {
      durations.push(...result.durations)
      errors.push(...result.errors)
      successful += result.successful
      failed += result.failed
      timeouts += result.timeouts
    }

    const totalDuration = performance.now() - startTime
    const actualThroughput = durations.length / (totalDuration / 1000)
    const sustainedLoad = actualThroughput >= targetThroughput * 0.95 // Within 5% of target

    // Calculate metrics
    const metrics = this.calculateMetrics(durations, successful, errors.length, totalDuration)

    return {
      testName,
      metrics,
      iterations: durations.length,
      concurrency,
      errors,
      rawDurations: durations,
      targetThroughput,
      actualThroughput,
      sustainedLoad,
      breakdown: {
        successful,
        failed,
        timeouts,
      },
    }
  }

  // Benchmark comparison
  async benchmark<T>(
    benchmarks: Array<{
      name: string
      testFunction: () => Promise<T>
    }>,
    options: PerformanceTestOptions = {}
  ): Promise<Array<PerformanceTestResult & { relativeToBest: number }>> {
    const results: PerformanceTestResult[] = []

    for (const benchmark of benchmarks) {
      const result = await this.test(benchmark.name, benchmark.testFunction, options)
      results.push(result)
    }

    // Find the best (fastest) result
    const bestThroughput = Math.max(...results.map(r => r.metrics.throughput))

    // Add relative performance
    return results.map(result => ({
      ...result,
      relativeToBest: result.metrics.throughput / bestThroughput,
    }))
  }

  // Memory usage monitoring
  async monitorMemory<T>(
    testFunction: () => Promise<T>,
    intervalMs = 100,
    durationMs = 10000
  ): Promise<{
    samples: Array<{
      timestamp: number
      memory: Record<string, number>
    }>
    peak: Record<string, number>
    leaked: boolean
    trend: 'increasing' | 'decreasing' | 'stable'
  }> {
    if (!process?.memoryUsage || typeof process.memoryUsage !== 'function') {
      throw new Error('Memory monitoring not available in this environment')
    }

    const samples: Array<{
      timestamp: number
      memory: Record<string, number>
    }> = []

    const startTime = performance.now()
    const endTime = startTime + durationMs

    // Start monitoring
    const monitoringInterval = setInterval(() => {
      if (process.memoryUsage) {
        samples.push({
          timestamp: performance.now() - startTime,
          memory: process.memoryUsage(),
        })
      }
    }, intervalMs)

    // Run the test function continuously
    const testPromise = (async () => {
      while (performance.now() < endTime) {
        try {
          await testFunction()
        } catch {
          // Continue monitoring even if test fails
        }
      }
    })()

    await testPromise
    clearInterval(monitoringInterval)

    // Analyze results
    const heapSizes = samples.map(s => s.memory.heapUsed ?? 0)
    const peak =
      samples.length > 0
        ? samples.reduce((max, sample) =>
            (sample.memory.heapUsed ?? 0) > (max.memory.heapUsed ?? 0) ? sample : max
          ).memory
        : { heapUsed: 0, heapTotal: 0, external: 0, arrayBuffers: 0, rss: 0 }

    // Check for memory leaks (simple heuristic)
    const firstQuarter = heapSizes.slice(0, Math.floor(heapSizes.length / 4))
    const lastQuarter = heapSizes.slice(-Math.floor(heapSizes.length / 4))
    const firstAvg =
      firstQuarter.length > 0
        ? firstQuarter.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / firstQuarter.length
        : 0
    const lastAvg =
      lastQuarter.length > 0
        ? lastQuarter.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / lastQuarter.length
        : 0
    const leaked = lastAvg > firstAvg * 1.5 // 50% increase suggests leak

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (lastAvg > firstAvg * 1.1) {
      trend = 'increasing'
    } else if (lastAvg < firstAvg * 0.9) {
      trend = 'decreasing'
    }

    return {
      samples,
      peak,
      leaked,
      trend,
    }
  }

  private async runSingleIteration<T>(
    testFunction: () => Promise<T>,
    timeout: number
  ): Promise<{ duration: number; success: boolean; error?: unknown; timedOut?: boolean }> {
    const start = performance.now()

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Test iteration timed out')), timeout)
      })

      await Promise.race([testFunction(), timeoutPromise])

      return {
        duration: performance.now() - start,
        success: true,
      }
    } catch (error) {
      const duration = performance.now() - start
      const timedOut = error instanceof Error && error.message.includes('timed out')

      return {
        duration,
        success: false,
        error,
        timedOut,
      }
    }
  }

  private calculateMetrics(
    durations: number[],
    successful: number,
    errorCount: number,
    totalDuration: number
  ): PerformanceMetrics {
    const sortedDurations = [...durations].sort((a, b) => a - b)
    const total = durations.length

    return {
      totalDuration,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      medianDuration: this.percentile(sortedDurations, 50),
      p95Duration: this.percentile(sortedDurations, 95),
      p99Duration: this.percentile(sortedDurations, 99),
      throughput: (total / totalDuration) * 1000, // ops/sec
      successRate: (successful / total) * 100,
      errorRate: (errorCount / total) * 100,
    }
  }

  private percentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1
    return sortedArray[Math.max(0, index)] || 0
  }

  private calculateCurrentRate(
    pattern: LoadTestOptions['pattern'],
    elapsedTime: number,
    duration: number,
    targetThroughput: number
  ): number {
    switch (pattern) {
      case 'constant':
        return targetThroughput

      case 'ramp-up':
        return targetThroughput * (elapsedTime / duration)

      case 'spike': {
        const spikeStart = duration * 0.3
        const spikeEnd = duration * 0.7
        if (elapsedTime >= spikeStart && elapsedTime <= spikeEnd) {
          return targetThroughput * 3 // 3x spike
        }
        return targetThroughput
      }

      case 'step': {
        const stepSize = duration / 4
        const step = Math.floor(elapsedTime / stepSize)
        return (targetThroughput * (step + 1)) / 4
      }

      default:
        return targetThroughput
    }
  }
}

// Factory functions for performance testing
export const performanceTesting = {
  // Create a performance tester
  createTester: (): PerformanceTester => {
    return new PerformanceTester()
  },

  // Quick performance test
  quickTest: async <T>(
    name: string,
    testFunction: () => Promise<T>,
    iterations = 100
  ): Promise<PerformanceTestResult> => {
    const tester = new PerformanceTester()
    return tester.test(name, testFunction, { iterations })
  },

  // Quick load test
  quickLoadTest: async <T>(
    name: string,
    testFunction: () => Promise<T>,
    targetThroughput = 100,
    duration = 30
  ): Promise<LoadTestResult> => {
    const tester = new PerformanceTester()
    return tester.loadTest(name, testFunction, { targetThroughput, duration })
  },

  // Utility functions
  utils: {
    // Format duration in human-readable format
    formatDuration: (ms: number): string => {
      if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`
      if (ms < 1000) return `${ms.toFixed(2)}ms`
      return `${(ms / 1000).toFixed(2)}s`
    },

    // Format throughput
    formatThroughput: (opsPerSec: number): string => {
      if (opsPerSec < 1000) return `${opsPerSec.toFixed(2)} ops/sec`
      if (opsPerSec < 1000000) return `${(opsPerSec / 1000).toFixed(2)}K ops/sec`
      return `${(opsPerSec / 1000000).toFixed(2)}M ops/sec`
    },

    // Format memory usage
    formatMemory: (bytes: number): string => {
      const units = ['B', 'KB', 'MB', 'GB']
      let size = bytes
      let unitIndex = 0

      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
      }

      return `${size.toFixed(2)} ${units[unitIndex]}`
    },

    // Create a performance report
    createReport: (results: PerformanceTestResult[]): string => {
      let report = '# Performance Test Report\n\n'

      for (const result of results) {
        report += `## ${result.testName}\n`
        report += `- **Iterations**: ${result.iterations}\n`
        report += `- **Concurrency**: ${result.concurrency}\n`
        report += `- **Success Rate**: ${result.metrics.successRate.toFixed(2)}%\n`
        report += `- **Throughput**: ${performanceTesting.utils.formatThroughput(result.metrics.throughput)}\n`
        report += `- **Average Duration**: ${performanceTesting.utils.formatDuration(result.metrics.averageDuration)}\n`
        report += `- **P95 Duration**: ${performanceTesting.utils.formatDuration(result.metrics.p95Duration)}\n`
        report += `- **P99 Duration**: ${performanceTesting.utils.formatDuration(result.metrics.p99Duration)}\n`

        if (result.metrics.memoryUsage) {
          report += `- **Memory Usage**: ${performanceTesting.utils.formatMemory(result.metrics.memoryUsage.heapUsed)}\n`
        }

        if (result.errors.length > 0) {
          report += `- **Errors**: ${result.errors.length}\n`
        }

        report += '\n'
      }

      return report
    },
  },
}
