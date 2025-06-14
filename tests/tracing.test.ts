import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pipeline, tracing } from '../src/core/pipeline'

// Type-safe mock interfaces
interface MockStorage {
  getItem: ReturnType<typeof vi.fn>
  setItem: ReturnType<typeof vi.fn>
  removeItem: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
  key: ReturnType<typeof vi.fn>
  length: number
}

describe('Enhanced Tracing System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tracing.clear()

    // Enable tracing for tests with proper typing
    const mockStorage: MockStorage = {
      getItem: vi.fn().mockReturnValue('true'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    }
    globalThis.localStorage = mockStorage as unknown as Storage
  })

  afterEach(() => {
    tracing.clear()
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.removeItem('lucid:trace')
    }
  })

  describe('trace collection', () => {
    it('should collect traces with unique IDs and metadata', async () => {
      const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({ data: 'test' }),
        }),
      }

      const pipe = pipeline('trace-collection-test', { httpClient: mockHttpClient })
        .fetch('/api/test')
        .map((data: unknown) => ({ ...(data as Record<string, unknown>), processed: true }))

      await pipe.run()

      const traces = tracing.query()
      expect(traces.length).toBeGreaterThan(0)

      // Check trace structure
      const trace = traces[0]
      if (trace) {
        expect(trace.id).toMatch(/^trace_\d+_\w+$/)
        expect(trace.timestamp).toBeTypeOf('number')
        expect(trace.pipelineName).toBe('trace-collection-test')
        expect(trace.stepName).toBeDefined()
        expect(trace.duration).toBeTypeOf('number')
        expect(trace.success).toBeTypeOf('boolean')
        expect(trace.metadata).toBeTypeOf('object')
      }
    })

    it('should collect traces for successful operations', async () => {
      const pipe = pipeline('success-test')
        .map((x: unknown) => (x as number) * 2)
        .map(x => x + 1)

      await pipe.run(5)

      const traces = tracing.query()
      expect(traces.length).toBe(2) // Two map operations

      traces.forEach(trace => {
        expect(trace.success).toBe(true)
        expect(trace.pipelineName).toBe('success-test')
        expect(trace.stepName).toBe('map')
      })
    })

    it('should collect traces for failed operations', async () => {
      const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        }),
      }

      const pipe = pipeline('error-test', { httpClient: mockHttpClient }).fetch('/api/notfound')

      await pipe.run()

      const traces = tracing.query({ success: false })
      expect(traces.length).toBe(1)

      const errorTrace = traces[0]
      if (errorTrace) {
        expect(errorTrace.success).toBe(false)
        expect(errorTrace.error?.code).toBe('HTTP_ERROR')
      }
    })
  })

  describe('trace filtering and querying', () => {
    beforeEach(async () => {
      // Set up test data
      const mockHttpClient = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: vi.fn().mockResolvedValue({ data: 'success' }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Server Error',
          }),
      }

      // Successful pipeline
      const successPipe = pipeline('success-pipeline', { httpClient: mockHttpClient }).fetch(
        '/api/success'
      )
      await successPipe.run()

      // Failed pipeline
      const errorPipe = pipeline('error-pipeline', { httpClient: mockHttpClient }).fetch(
        '/api/error'
      )
      await errorPipe.run()

      // Slow pipeline (simulate with manual trace)
      const collector = tracing.getCollector()
      collector.collect({
        id: 'test-slow-trace',
        timestamp: Date.now(),
        pipelineName: 'slow-pipeline',
        stepName: 'fetch',
        duration: 250,
        success: true,
        metadata: {},
      })
    })

    it('should filter by pipeline name', () => {
      const successTraces = tracing.query({ pipelineName: 'success-pipeline' })
      expect(successTraces.length).toBeGreaterThan(0)
      successTraces.forEach(trace => {
        expect(trace.pipelineName).toContain('success-pipeline')
      })

      const errorTraces = tracing.query({ pipelineName: 'error-pipeline' })
      expect(errorTraces.length).toBeGreaterThan(0)
      errorTraces.forEach(trace => {
        expect(trace.pipelineName).toContain('error-pipeline')
      })
    })

    it('should filter by success status', () => {
      const successTraces = tracing.query({ success: true })
      expect(successTraces.length).toBeGreaterThan(0)
      successTraces.forEach(trace => {
        expect(trace.success).toBe(true)
      })

      const errorTraces = tracing.query({ success: false })
      expect(errorTraces.length).toBeGreaterThan(0)
      errorTraces.forEach(trace => {
        expect(trace.success).toBe(false)
      })
    })

    it('should filter by step name', () => {
      const fetchTraces = tracing.query({ stepName: 'fetch' })
      expect(fetchTraces.length).toBeGreaterThan(0)
      fetchTraces.forEach(trace => {
        expect(trace.stepName).toBe('fetch')
      })
    })

    it('should filter by duration', () => {
      const slowTraces = tracing.query({ minDuration: 200 })
      expect(slowTraces.length).toBeGreaterThan(0)
      slowTraces.forEach(trace => {
        expect(trace.duration).toBeGreaterThanOrEqual(200)
      })

      const fastTraces = tracing.query({ maxDuration: 100 })
      fastTraces.forEach(trace => {
        expect(trace.duration).toBeLessThanOrEqual(100)
      })
    })

    it('should filter by error code', () => {
      const httpErrorTraces = tracing.query({ errorCode: 'HTTP_ERROR' })
      expect(httpErrorTraces.length).toBeGreaterThan(0)
      httpErrorTraces.forEach(trace => {
        expect(trace.error?.code).toBe('HTTP_ERROR')
      })
    })

    it('should filter by time range', () => {
      const now = Date.now()
      const fiveMinutesAgo = now - 5 * 60 * 1000

      const recentTraces = tracing.query({ startTime: fiveMinutesAgo })
      expect(recentTraces.length).toBeGreaterThan(0)
      recentTraces.forEach(trace => {
        expect(trace.timestamp).toBeGreaterThanOrEqual(fiveMinutesAgo)
      })
    })
  })

  describe('trace export and summary', () => {
    beforeEach(async () => {
      // Create diverse test data
      const mockHttpClient = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: vi.fn().mockResolvedValue({ data: 'test1' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: vi.fn().mockResolvedValue({ data: 'test2' }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          }),
      }

      await pipeline('test1', { httpClient: mockHttpClient }).fetch('/api/test1').run()
      await pipeline('test2', { httpClient: mockHttpClient }).fetch('/api/test2').run()
      await pipeline('test3', { httpClient: mockHttpClient }).fetch('/api/test3').run()
    })

    it('should export trace data with summary', () => {
      const exportData = tracing.export()

      expect(exportData.entries).toBeInstanceOf(Array)
      expect(exportData.entries.length).toBeGreaterThan(0)

      expect(exportData.summary).toBeDefined()
      expect(exportData.summary.totalEntries).toBe(exportData.entries.length)
      expect(exportData.summary.successCount).toBeTypeOf('number')
      expect(exportData.summary.errorCount).toBeTypeOf('number')
      expect(exportData.summary.avgDuration).toBeTypeOf('number')
      expect(exportData.summary.minDuration).toBeTypeOf('number')
      expect(exportData.summary.maxDuration).toBeTypeOf('number')

      expect(exportData.summary.successCount + exportData.summary.errorCount).toBe(
        exportData.summary.totalEntries
      )
    })

    it('should calculate correct summary statistics', () => {
      const exportData = tracing.export()
      const { summary } = exportData

      expect(summary.successCount).toBeGreaterThan(0)
      expect(summary.errorCount).toBeGreaterThan(0)
      expect(summary.avgDuration).toBeGreaterThan(0)
      expect(summary.minDuration).toBeGreaterThanOrEqual(0)
      expect(summary.maxDuration).toBeGreaterThanOrEqual(summary.minDuration)
    })
  })

  describe('visualization helpers', () => {
    beforeEach(async () => {
      const mockHttpClient = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: vi.fn().mockResolvedValue({ data: 'success' }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Server Error',
          }),
      }

      await pipeline('viz-test-success', { httpClient: mockHttpClient }).fetch('/api/success').run()
      await pipeline('viz-test-error', { httpClient: mockHttpClient }).fetch('/api/error').run()
    })

    it('should print summary', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      tracing.printSummary()

      expect(consoleSpy).toHaveBeenCalledWith('📊 Kairo Tracing Summary')
      expect(consoleSpy).toHaveBeenCalledWith('========================')
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Total Entries: \d+/))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Success Rate: \d+\.\d+%/))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Average Duration: \d+\.\d+ms/))
    })

    it('should print table', () => {
      const consoleTableSpy = vi.spyOn(console, 'table')

      tracing.printTable()

      expect(consoleTableSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            Pipeline: expect.any(String) as string,
            Step: expect.any(String) as string,
            Success: expect.stringMatching(/[✅❌]/) as string,
            Duration: expect.stringMatching(/\d+\.\d+ms/) as string,
            Error: expect.any(String) as string,
          }),
        ])
      )
    })

    it('should print timeline', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      tracing.printTimeline()

      expect(consoleSpy).toHaveBeenCalledWith('⏱️  Kairo Pipeline Timeline')
      expect(consoleSpy).toHaveBeenCalledWith('===========================')
    })

    it('should get slow queries', () => {
      const slowQueries = tracing.getSlowQueries(0) // All queries
      expect(slowQueries).toBeInstanceOf(Array)

      // Should be sorted by duration descending
      for (let i = 1; i < slowQueries.length; i++) {
        expect(slowQueries[i - 1]?.duration).toBeGreaterThanOrEqual(slowQueries[i]?.duration ?? 0)
      }
    })

    it('should get error breakdown', () => {
      const errorBreakdown = tracing.getErrorBreakdown()
      expect(errorBreakdown).toBeInstanceOf(Array)

      if (errorBreakdown.length > 0) {
        const firstError = errorBreakdown[0]
        if (firstError) {
          expect(firstError).toHaveProperty('code')
          expect(firstError).toHaveProperty('count')
          expect(firstError.count).toBeGreaterThan(0)
        }

        // Should be sorted by count descending
        for (let i = 1; i < errorBreakdown.length; i++) {
          expect(errorBreakdown[i - 1]?.count).toBeGreaterThanOrEqual(errorBreakdown[i]?.count ?? 0)
        }
      }
    })
  })

  describe('performance metrics', () => {
    beforeEach(async () => {
      // Create test data with different performance characteristics
      const mockHttpClient = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: vi.fn().mockResolvedValue({ data: 'fast' }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Server Error',
          }),
      }

      // Fast successful operation
      await pipeline('perf-fast', { httpClient: mockHttpClient }).fetch('/api/fast').run()

      // Failed operation
      await pipeline('perf-error', { httpClient: mockHttpClient }).fetch('/api/error').run()

      // Manually add a slow operation
      const collector = tracing.getCollector()
      collector.collect({
        id: 'perf-slow-trace',
        timestamp: Date.now(),
        pipelineName: 'perf-slow',
        stepName: 'fetch',
        duration: 500,
        success: true,
        metadata: {},
      })
    })

    it('should calculate performance metrics by step', () => {
      const perfMetrics = tracing.getPerformanceMetrics()

      expect(perfMetrics).toBeInstanceOf(Array)
      expect(perfMetrics.length).toBeGreaterThan(0)

      const metric = perfMetrics[0]
      if (metric) {
        expect(metric).toHaveProperty('step')
        expect(metric).toHaveProperty('count')
        expect(metric).toHaveProperty('successRate')
        expect(metric).toHaveProperty('avgDuration')
        expect(metric).toHaveProperty('minDuration')
        expect(metric).toHaveProperty('maxDuration')
        expect(metric).toHaveProperty('p95Duration')

        expect(metric.count).toBeGreaterThan(0)
        expect(metric.successRate).toBeGreaterThanOrEqual(0)
        expect(metric.successRate).toBeLessThanOrEqual(100)
        expect(metric.avgDuration).toBeGreaterThan(0)
        expect(metric.minDuration).toBeGreaterThanOrEqual(0)
        expect(metric.maxDuration).toBeGreaterThanOrEqual(metric.minDuration)
      }
    })

    it('should calculate performance metrics for specific pipeline', () => {
      const perfMetrics = tracing.getPerformanceMetrics('perf-fast')

      expect(perfMetrics).toBeInstanceOf(Array)
      if (perfMetrics.length > 0) {
        perfMetrics.forEach(metric => {
          expect(metric.step).toContain('perf-fast')
        })
      }
    })

    it('should calculate throughput metrics', () => {
      const throughput = tracing.getThroughput(60000) // 1 minute window

      expect(throughput).toHaveProperty('totalRequests')
      expect(throughput).toHaveProperty('timeWindowMs')
      expect(throughput).toHaveProperty('throughputPerSecond')
      expect(throughput).toHaveProperty('successRate')

      expect(throughput.totalRequests).toBeGreaterThanOrEqual(0)
      expect(throughput.timeWindowMs).toBe(60000)
      expect(throughput.throughputPerSecond).toBeGreaterThanOrEqual(0)
      expect(throughput.successRate).toBeGreaterThanOrEqual(0)
      expect(throughput.successRate).toBeLessThanOrEqual(100)
    })
  })

  describe('trace collector management', () => {
    it('should clear traces', () => {
      // Add some traces first
      const collector = tracing.getCollector()
      collector.collect({
        id: 'test-trace',
        timestamp: Date.now(),
        pipelineName: 'test',
        stepName: 'test',
        duration: 10,
        success: true,
        metadata: {},
      })

      expect(tracing.query().length).toBeGreaterThan(0)

      tracing.clear()
      expect(tracing.query().length).toBe(0)
    })

    it('should limit trace collection to 1000 entries', () => {
      const collector = tracing.getCollector()

      // Add more than 1000 traces
      for (let i = 0; i < 1100; i++) {
        collector.collect({
          id: `test-trace-${i}`,
          timestamp: Date.now(),
          pipelineName: 'test',
          stepName: 'test',
          duration: 10,
          success: true,
          metadata: { index: i },
        })
      }

      const traces = tracing.query()
      expect(traces.length).toBe(1000)

      // Should keep the most recent traces
      const lastTrace = traces[traces.length - 1]
      if (lastTrace) {
        expect((lastTrace.metadata as { index: number }).index).toBe(1099)
      }
    })
  })
})
