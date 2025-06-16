import { Result } from './result'
import { type Schema, type ValidationError } from './schema'
import { isNil, isEmpty, cond, resolve, conditionalEffect, tryCatch, retry } from '../utils/fp'
import { type KairoError, createError } from './errors'
import type { Rule, Rules, BusinessRuleError, RuleValidationContext } from './rules'
import type { Transform, TransformError, TransformContext } from './transform'
import { performance as perf } from './performance'
import { cache as advancedCache, type CacheConfig as AdvancedCacheConfig } from './cache'

export interface HttpError extends KairoError {
  code: 'HTTP_ERROR'
  status: number
  statusText: string
  url: string
}

export interface NetworkError extends KairoError {
  code: 'NETWORK_ERROR'
  url: string
  method: string
  attempt: number
  maxAttempts: number
  retryDelay?: number | undefined
}

export interface TimeoutError extends KairoError {
  code: 'TIMEOUT_ERROR'
  duration: number
  timeout: number
  operation: string
}

export interface TraceEntry {
  id: string
  timestamp: number
  pipelineName: string
  stepName: string
  duration: number
  success: boolean
  input?: unknown
  output?: unknown
  error?: KairoError
  metadata: Record<string, unknown>
}

export interface TraceFilter {
  pipelineName?: string
  stepName?: string
  success?: boolean
  minDuration?: number
  maxDuration?: number
  startTime?: number
  endTime?: number
  errorCode?: string
}

export interface TraceData {
  entries: TraceEntry[]
  summary: {
    totalEntries: number
    successCount: number
    errorCount: number
    avgDuration: number
    minDuration: number
    maxDuration: number
  }
}

export interface TraceCollector {
  collect(entry: TraceEntry): void
  query(filter?: TraceFilter): TraceEntry[]
  export(): TraceData
  clear(): void
}

interface Step<TError = unknown, TOutput = unknown> {
  type: string
  execute(input: unknown, context: PipelineContext): Promise<Result<TError, TOutput>>
}

interface PipelineContext {
  name: string
  traces: TraceEntry[]
  httpClient?: HttpClient
}

interface HttpClient {
  fetch(url: string, options?: RequestInit): Promise<Response>
}

const defaultHttpClient: HttpClient = {
  fetch: (url, options) => fetch(url, options),
}

class InputStep<T> implements Step<ValidationError, T> {
  type = 'input'
  constructor(private schema: Schema<T>) {}

  execute(input: unknown, context: PipelineContext): Promise<Result<ValidationError, T>> {
    const start = performance.now()
    const result = this.schema.parse(input)

    const logTrace = createTraceLogger(context)
    logTrace(createTraceEntry(context, 'input', start, result, input))

    return Promise.resolve(result)
  }
}

class FetchStep<TInput = unknown> implements Step<HttpError, unknown> {
  type = 'fetch'
  constructor(
    private urlOrFn: string | ((input: TInput) => string),
    private options?: RequestInit | ((input: TInput) => RequestInit)
  ) {}

  async execute(input: unknown, context: PipelineContext): Promise<Result<HttpError, unknown>> {
    const start = performance.now()
    const logTrace = createTraceLogger(context)

    const url = resolve(this.urlOrFn)(input as TInput)
    const options = resolve(this.options || {})(input as TInput)
    const httpClient = context.httpClient || defaultHttpClient

    const buildFetchOptions = (opts: RequestInit): RequestInit => {
      const baseOpts = {
        ...opts,
        headers: {
          'Content-Type': 'application/json',
          ...opts.headers,
        },
      }

      return !isNil(input) && !isEmpty(input)
        ? { ...baseOpts, body: JSON.stringify(input) }
        : baseOpts
    }

    const createHttpError = (status: number, statusText: string, message: string): HttpError => ({
      code: 'HTTP_ERROR',
      status,
      statusText,
      url,
      message,
      timestamp: Date.now(),
      context: { url, method: options.method || 'GET', status },
    })

    const handleResponse = async (response: Response): Promise<Result<HttpError, unknown>> => {
      if (!response.ok) {
        const error = createHttpError(
          response.status,
          response.statusText,
          `HTTP ${response.status}: ${response.statusText}`
        )
        logTrace(
          createTraceEntry(
            context,
            'fetch',
            start,
            Result.Err(error),
            { url, options, body: input },
            error
          )
        )
        return Result.Err(error)
      }

      const data = await response.json()
      logTrace(
        createTraceEntry(context, 'fetch', start, Result.Ok(data), { url, options, body: input })
      )
      return Result.Ok(data)
    }

    try {
      const fetchOptions = buildFetchOptions(options)
      const response = await httpClient.fetch(url, fetchOptions)
      return await handleResponse(response)
    } catch (error) {
      const httpError = createHttpError(
        0,
        'Network Error',
        error instanceof Error ? error.message : 'Unknown network error'
      )
      logTrace(
        createTraceEntry(
          context,
          'fetch',
          start,
          Result.Err(httpError),
          { url, options, body: input },
          httpError
        )
      )
      return Result.Err(httpError)
    }
  }
}

class ValidateStep<T> implements Step<ValidationError, T> {
  type = 'validate'
  constructor(private schema: Schema<T>) {}

  execute(input: unknown, context: PipelineContext): Promise<Result<ValidationError, T>> {
    const start = performance.now()
    const result = this.schema.parse(input)

    const logTrace = createTraceLogger(context)
    logTrace(createTraceEntry(context, 'validate', start, result, input))

    return Promise.resolve(result)
  }
}

class ValidateRuleStep<T> implements Step<BusinessRuleError, T> {
  type = 'validateRule'
  constructor(
    private rule: Rule<T>,
    private context?: RuleValidationContext
  ) {}

  async execute(input: unknown, context: PipelineContext): Promise<Result<BusinessRuleError, T>> {
    const start = performance.now()
    const result = await this.rule.validate(input as T, this.context)

    const logTrace = createTraceLogger(context)
    logTrace(createTraceEntry(context, 'validateRule', start, result, input))

    return result
  }
}

class ValidateRulesStep<T> implements Step<BusinessRuleError[], T> {
  type = 'validateRules'
  constructor(
    private rules: Rules<T>,
    private ruleNames?: string[],
    private context?: RuleValidationContext
  ) {}

  async execute(input: unknown, context: PipelineContext): Promise<Result<BusinessRuleError[], T>> {
    const start = performance.now()
    const result = await this.rules.validate(input as T, this.ruleNames, this.context)

    const logTrace = createTraceLogger(context)
    logTrace(createTraceEntry(context, 'validateRules', start, result, input))

    return result
  }
}

class ValidateAllRulesStep<T> implements Step<BusinessRuleError[], T> {
  type = 'validateAllRules'
  constructor(
    private rules: Rules<T>,
    private context?: RuleValidationContext
  ) {}

  async execute(input: unknown, context: PipelineContext): Promise<Result<BusinessRuleError[], T>> {
    const start = performance.now()
    const result = await this.rules.validateAll(input as T, this.context)

    const logTrace = createTraceLogger(context)
    logTrace(createTraceEntry(context, 'validateAllRules', start, result, input))

    return result
  }
}

class MapStep<T, U> implements Step<never, U> {
  type = 'map'
  constructor(private fn: (value: T) => U) {}

  execute(input: unknown, context: PipelineContext): Promise<Result<never, U>> {
    const start = performance.now()

    const result = tryCatch(() => this.fn(input as T))

    const logTrace = createTraceLogger(context)
    logTrace(createTraceEntry(context, 'map', start, result, input))

    if (Result.isErr(result)) {
      throw result.error
    }

    return Promise.resolve(result as Result<never, U>)
  }
}

class MapErrorStep<E, F> implements Step<F, unknown> {
  type = 'mapError'
  constructor(public readonly fn: (error: E) => F) {}

  execute(input: unknown, _context: PipelineContext): Promise<Result<F, unknown>> {
    return Promise.resolve(Result.Ok(input))
  }
}

class TransformStep<TSource, TTarget> implements Step<TransformError, TTarget> {
  type = 'transform'
  constructor(
    private transform: Transform<TSource, TTarget>,
    private transformContext?: TransformContext
  ) {}

  execute(input: unknown, context: PipelineContext): Promise<Result<TransformError, TTarget>> {
    const start = performance.now()
    const result = this.transform.execute(input as TSource, this.transformContext)

    const logTrace = createTraceLogger(context)
    logTrace(createTraceEntry(context, 'transform', start, result, input))

    return Promise.resolve(result)
  }
}

class TraceStep implements Step<never, unknown> {
  type = 'trace'
  constructor(private label?: string) {}

  execute(input: unknown, context: PipelineContext): Promise<Result<never, unknown>> {
    console.log(`[${context.name}${this.label ? `:${this.label}` : ''}]`, input)
    return Promise.resolve(Result.Ok(input))
  }
}

class ParallelStep<I, T> implements Step<KairoError, T[]> {
  type = 'parallel'
  constructor(private pipelines: Pipeline<I, T>[]) {}

  async execute(input: unknown, context: PipelineContext): Promise<Result<KairoError, T[]>> {
    const start = performance.now()
    const logTrace = createTraceLogger(context)

    try {
      const results = await Promise.all(this.pipelines.map(pipeline => pipeline.run(input as I)))

      const errors: KairoError[] = []
      const values: T[] = []

      for (const result of results) {
        if (Result.isErr(result)) {
          errors.push(result.error as KairoError)
        } else {
          values.push(result.value)
        }
      }

      if (errors.length > 0) {
        const parallelError: KairoError = {
          ...createError(
            'PARALLEL_ERROR',
            `${errors.length} out of ${this.pipelines.length} parallel pipelines failed`,
            { errors, successCount: values.length }
          ),
          code: 'PARALLEL_ERROR',
        }
        logTrace(
          createTraceEntry(
            context,
            'parallel',
            start,
            Result.Err(parallelError),
            input,
            parallelError
          )
        )
        return Result.Err(parallelError)
      }

      logTrace(createTraceEntry(context, 'parallel', start, Result.Ok(values), input))
      return Result.Ok(values)
    } catch (error) {
      const parallelError: KairoError = {
        ...createError(
          'PARALLEL_ERROR',
          error instanceof Error ? error.message : 'Unknown parallel execution error',
          { pipelineCount: this.pipelines.length }
        ),
        code: 'PARALLEL_ERROR',
      }
      logTrace(
        createTraceEntry(
          context,
          'parallel',
          start,
          Result.Err(parallelError),
          input,
          parallelError
        )
      )
      return Result.Err(parallelError)
    }
  }
}

class FallbackStep<I, O, F> implements Step<KairoError, O | F> {
  type = 'fallback'
  constructor(
    private primaryPipeline: Pipeline<I, O>,
    private fallbackPipeline: Pipeline<I, F>
  ) {}

  async execute(input: unknown, context: PipelineContext): Promise<Result<KairoError, O | F>> {
    const start = performance.now()
    const logTrace = createTraceLogger(context)

    try {
      const primaryResult = await this.primaryPipeline.run(input as I)

      if (Result.isOk(primaryResult)) {
        logTrace(createTraceEntry(context, 'fallback', start, primaryResult, input))
        return Result.Ok(primaryResult.value)
      }

      const fallbackResult = await this.fallbackPipeline.run(input as I)

      if (Result.isOk(fallbackResult)) {
        logTrace(createTraceEntry(context, 'fallback', start, fallbackResult, input))
        return Result.Ok(fallbackResult.value)
      }

      const fallbackError: KairoError = {
        ...createError('FALLBACK_ERROR', 'Both primary and fallback pipelines failed', {
          primaryError: primaryResult.error,
          fallbackError: fallbackResult.error,
        }),
        code: 'FALLBACK_ERROR',
      }
      logTrace(
        createTraceEntry(
          context,
          'fallback',
          start,
          Result.Err(fallbackError),
          input,
          fallbackError
        )
      )
      return Result.Err(fallbackError)
    } catch (error) {
      const fallbackError: KairoError = {
        ...createError(
          'FALLBACK_ERROR',
          error instanceof Error ? error.message : 'Unknown fallback execution error',
          {}
        ),
        code: 'FALLBACK_ERROR',
      }
      logTrace(
        createTraceEntry(
          context,
          'fallback',
          start,
          Result.Err(fallbackError),
          input,
          fallbackError
        )
      )
      return Result.Err(fallbackError)
    }
  }
}

interface RetryConfig {
  times: number
  delay?: number
}

interface TimeoutConfig {
  ms: number
}

interface CacheConfig {
  ttl: number
  strategy?: 'memory' | 'distributed' | 'multi-level'
  evictionPolicy?: 'lru' | 'lfu' | 'fifo' | 'ttl'
  tags?: string[]
  namespace?: string
  maxSize?: number
  maxMemory?: number
}

interface CacheEntry {
  result: Result<unknown, unknown>
  timestamp: number
}

class PipelineCache {
  private static cache = new Map<string, CacheEntry>()

  static get(key: string): CacheEntry | undefined {
    return this.cache.get(key)
  }

  static set(key: string, entry: CacheEntry): void {
    this.cache.set(key, entry)
  }

  static clear(): void {
    this.cache.clear()
  }

  static cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      // Clean up entries older than 1 hour by default
      if (now - entry.timestamp > 3600000) {
        this.cache.delete(key)
      }
    }
  }

  static invalidate(pattern: string | RegExp): number {
    let count = 0
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        count++
      }
    }

    return count
  }

  static invalidateByPipeline(pipelineName: string): number {
    return this.invalidate(`^pipeline:${pipelineName}:`)
  }

  static invalidateByTag(tag: string): number {
    // For future enhancement: tag-based invalidation
    // Currently invalidate by pattern matching
    return this.invalidate(tag)
  }

  static size(): number {
    return this.cache.size
  }

  static entries(): Array<[string, CacheEntry]> {
    return Array.from(this.cache.entries())
  }
}

class GlobalTraceCollector implements TraceCollector {
  private static instance: GlobalTraceCollector
  private traces: TraceEntry[] = []

  static getInstance(): GlobalTraceCollector {
    if (!GlobalTraceCollector.instance) {
      GlobalTraceCollector.instance = new GlobalTraceCollector()
    }
    return GlobalTraceCollector.instance
  }

  collect(entry: TraceEntry): void {
    this.traces.push(entry)

    // Auto-cleanup old traces (keep last 1000 entries)
    if (this.traces.length > 1000) {
      this.traces = this.traces.slice(-1000)
    }
  }

  query(filter?: TraceFilter): TraceEntry[] {
    if (!filter) return [...this.traces]

    return this.traces.filter(entry => {
      if (filter.pipelineName && !entry.pipelineName.includes(filter.pipelineName)) return false
      if (filter.stepName && !entry.stepName.includes(filter.stepName)) return false
      if (filter.success !== undefined && entry.success !== filter.success) return false
      if (filter.minDuration && entry.duration < filter.minDuration) return false
      if (filter.maxDuration && entry.duration > filter.maxDuration) return false
      if (filter.startTime && entry.timestamp < filter.startTime) return false
      if (filter.endTime && entry.timestamp > filter.endTime) return false
      if (filter.errorCode && (!entry.error || entry.error.code !== filter.errorCode)) return false

      return true
    })
  }

  export(): TraceData {
    const entries = [...this.traces]
    const successCount = entries.filter(e => e.success).length
    const errorCount = entries.length - successCount
    const durations = entries.map(e => e.duration)

    return {
      entries,
      summary: {
        totalEntries: entries.length,
        successCount,
        errorCount,
        avgDuration:
          durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      },
    }
  }

  clear(): void {
    this.traces = []
  }
}

export class Pipeline<Input, Output> {
  constructor(
    private readonly steps: Step[],
    private readonly name: string,
    private readonly deps?: { httpClient?: HttpClient },
    private readonly retryConfig?: RetryConfig,
    private readonly timeoutConfig?: TimeoutConfig,
    private readonly cacheConfig?: CacheConfig
  ) {}

  input<I>(schema: Schema<I>): Pipeline<I, I> {
    return new Pipeline<I, I>(
      [...this.steps, new InputStep(schema)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig,
      this.cacheConfig
    )
  }

  fetch(
    url: string | ((input: Input) => string),
    options?: RequestInit | ((input: Input) => RequestInit)
  ): Pipeline<Input, unknown> {
    return new Pipeline<Input, unknown>(
      [...this.steps, new FetchStep<Input>(url, options)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig,
      this.cacheConfig
    )
  }

  validate<O>(schema: Schema<O>): Pipeline<Input, O> {
    return new Pipeline<Input, O>(
      [...this.steps, new ValidateStep(schema)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig,
      this.cacheConfig
    )
  }

  validateRule<T>(rule: Rule<T>, context?: RuleValidationContext): Pipeline<Input, T> {
    return new Pipeline<Input, T>(
      [...this.steps, new ValidateRuleStep(rule, context)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig,
      this.cacheConfig
    )
  }

  validateRules<T>(
    rules: Rules<T>,
    ruleNames?: string[],
    context?: RuleValidationContext
  ): Pipeline<Input, T> {
    return new Pipeline<Input, T>(
      [...this.steps, new ValidateRulesStep(rules, ruleNames, context)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig,
      this.cacheConfig
    )
  }

  validateAllRules<T>(rules: Rules<T>, context?: RuleValidationContext): Pipeline<Input, T> {
    return new Pipeline<Input, T>(
      [...this.steps, new ValidateAllRulesStep(rules, context)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig,
      this.cacheConfig
    )
  }

  map<U>(fn: (value: Output) => U): Pipeline<Input, U> {
    return new Pipeline<Input, U>(
      [...this.steps, new MapStep(fn)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig,
      this.cacheConfig
    )
  }

  transform<T>(transform: Transform<Output, T>, context?: TransformContext): Pipeline<Input, T> {
    return new Pipeline<Input, T>(
      [...this.steps, new TransformStep(transform, context)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig,
      this.cacheConfig
    )
  }

  mapError<E, F>(fn: (error: E) => F): Pipeline<Input, Output> {
    return new Pipeline<Input, Output>(
      [...this.steps, new MapErrorStep(fn)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig,
      this.cacheConfig
    )
  }

  trace(label?: string): Pipeline<Input, Output> {
    return new Pipeline<Input, Output>(
      [...this.steps, new TraceStep(label)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig,
      this.cacheConfig
    )
  }

  retry(times: number, delay?: number): Pipeline<Input, Output> {
    return new Pipeline<Input, Output>(
      this.steps,
      this.name,
      this.deps,
      { times, delay: delay || 1000 },
      this.timeoutConfig,
      this.cacheConfig
    )
  }

  timeout(ms: number): Pipeline<Input, Output> {
    return new Pipeline<Input, Output>(
      this.steps,
      this.name,
      this.deps,
      this.retryConfig,
      { ms },
      this.cacheConfig
    )
  }

  cache(ttl: number): Pipeline<Input, Output>
  cache(config: CacheConfig): Pipeline<Input, Output>
  cache(ttlOrConfig: number | CacheConfig): Pipeline<Input, Output> {
    const cacheConfig: CacheConfig =
      typeof ttlOrConfig === 'number' ? { ttl: ttlOrConfig } : ttlOrConfig

    return new Pipeline<Input, Output>(
      this.steps,
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig,
      cacheConfig
    )
  }

  static parallel<I, T>(pipelines: Pipeline<I, T>[]): Pipeline<I, T[]> {
    return new Pipeline<I, T[]>(
      [new ParallelStep(pipelines)],
      `parallel(${pipelines.map(p => p.name).join(',')})`,
      undefined,
      undefined,
      undefined,
      undefined
    )
  }

  fallback<T>(fallbackPipeline: Pipeline<Input, T>): Pipeline<Input, Output | T> {
    return new Pipeline<Input, Output | T>(
      [new FallbackStep(this, fallbackPipeline)],
      `${this.name}.fallback(${fallbackPipeline.name})`,
      this.deps,
      this.retryConfig,
      this.timeoutConfig,
      this.cacheConfig
    )
  }

  async run(input?: Input): Promise<Result<unknown, Output>> {
    const start = performance.now()
    const span = perf.startSpan(`pipeline:${this.name}`, { input })

    // Advanced cache logic
    if (this.cacheConfig) {
      const cacheKey = `pipeline:${this.name}:${JSON.stringify(input || {})}`

      // Use advanced cache for enhanced strategies
      if (
        this.cacheConfig.strategy === 'multi-level' ||
        this.cacheConfig.strategy === 'distributed'
      ) {
        try {
          const cached = await advancedCache.get<Result<unknown, Output>>(
            cacheKey,
            this.cacheConfig.namespace
          )
          if (cached) {
            span.metadata = {
              ...span.metadata,
              cacheHit: true,
              cacheStrategy: this.cacheConfig.strategy,
            }
            perf.endSpan(span)
            return cached.value
          }
        } catch (error) {
          console.warn('Advanced cache read failed, falling back to basic cache:', error)
        }
      }

      // Fallback to basic cache
      const cached = PipelineCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.cacheConfig.ttl) {
        span.metadata = { ...span.metadata, cacheHit: true, cacheStrategy: 'memory' }
        perf.endSpan(span)
        return cached.result as Result<unknown, Output>
      }
    }

    const executePipeline = async (): Promise<Result<unknown, Output>> => {
      const context: PipelineContext = {
        name: this.name,
        traces: [],
      }

      if (this.deps?.httpClient) {
        context.httpClient = this.deps.httpClient
      }

      const executeStep = async (
        result: Result<unknown, unknown>,
        step: Step
      ): Promise<Result<unknown, unknown>> => {
        return (
          cond<[Result<unknown, unknown>, Step], Promise<Result<unknown, unknown>>>([
            // Skip step if error and not mapError
            [
              ([res, s]) => Result.isErr(res) && s.type !== 'mapError',
              ([res]) => Promise.resolve(res),
            ],

            // Handle mapError specifically
            [
              ([res, s]) => s.type === 'mapError' && Result.isErr(res),
              ([result, step]) =>
                Promise.resolve(
                  Result.mapError(result, (step as MapErrorStep<unknown, unknown>).fn)
                ),
            ],

            // Execute step if result is Ok
            [
              ([res]) => Result.isOk(res),
              async ([result, step]) => {
                if (Result.isOk(result)) {
                  const stepSpan = perf.startSpan(`${context.name}:${step.type}`, {
                    stepType: step.type,
                    input: result.value,
                  })

                  try {
                    const stepResult = await step.execute(result.value, context)
                    stepSpan.metadata = {
                      ...stepSpan.metadata,
                      success: Result.isOk(stepResult),
                      output: Result.isOk(stepResult) ? stepResult.value : undefined,
                      error: Result.isErr(stepResult) ? stepResult.error : undefined,
                    }
                    return stepResult
                  } finally {
                    perf.endSpan(stepSpan)
                  }
                }
                return result
              },
            ],

            // Default case - return result unchanged
            [() => true, ([result]) => Promise.resolve(result)],
          ])([result, step]) || Promise.resolve(result)
        )
      }

      const initialResult = Result.Ok(input as unknown)
      const finalResult = await this.steps.reduce(
        async (accPromise: Promise<Result<unknown, unknown>>, step: Step) => {
          const acc = await accPromise
          return executeStep(acc, step)
        },
        Promise.resolve(initialResult)
      )

      this.logTraces(context)
      return finalResult as Result<unknown, Output>
    }

    const executeWithTimeout = async (): Promise<Result<unknown, Output>> => {
      if (!this.timeoutConfig) {
        return executePipeline()
      }

      const timeoutPromise = new Promise<Result<unknown, Output>>((_, reject) => {
        globalThis.setTimeout(() => {
          const duration = performance.now() - start
          const timeoutError: TimeoutError = {
            ...createError(
              'TIMEOUT_ERROR',
              `Pipeline timed out after ${this.timeoutConfig!.ms}ms`,
              {
                pipelineName: this.name,
              }
            ),
            code: 'TIMEOUT_ERROR',
            duration,
            timeout: this.timeoutConfig!.ms,
            operation: this.name,
          }
          reject(new Error(`Timeout: ${JSON.stringify(timeoutError)}`))
        }, this.timeoutConfig!.ms)
      })

      try {
        return await Promise.race([executePipeline(), timeoutPromise])
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Timeout:')) {
          const timeoutData = JSON.parse(error.message.replace('Timeout: ', '')) as TimeoutError
          return Result.Err(timeoutData)
        }
        throw error
      }
    }

    const finalResult = !this.retryConfig
      ? await executeWithTimeout()
      : await this.executeWithRetry(executeWithTimeout, input)

    // Cache successful results with advanced strategies
    if (this.cacheConfig && Result.isOk(finalResult)) {
      const cacheKey = `pipeline:${this.name}:${JSON.stringify(input || {})}`

      // Use advanced cache for enhanced strategies
      if (
        this.cacheConfig.strategy === 'multi-level' ||
        this.cacheConfig.strategy === 'distributed'
      ) {
        try {
          await advancedCache.set(
            cacheKey,
            finalResult,
            {
              ttl: this.cacheConfig.ttl,
              ...(this.cacheConfig.tags && { tags: this.cacheConfig.tags }),
              ...(this.cacheConfig.evictionPolicy && {
                evictionPolicy: this.cacheConfig.evictionPolicy,
              }),
              ...(this.cacheConfig.maxSize && { maxSize: this.cacheConfig.maxSize }),
              ...(this.cacheConfig.maxMemory && { maxMemory: this.cacheConfig.maxMemory }),
            },
            this.cacheConfig.namespace
          )
        } catch (error) {
          console.warn('Advanced cache write failed, falling back to basic cache:', error)
          // Fallback to basic cache
          PipelineCache.set(cacheKey, {
            result: finalResult,
            timestamp: Date.now(),
          })
        }
      } else {
        // Use basic cache for simple strategies
        PipelineCache.set(cacheKey, {
          result: finalResult,
          timestamp: Date.now(),
        })
      }
    }

    // End performance span
    span.metadata = {
      ...span.metadata,
      success: Result.isOk(finalResult),
      output: Result.isOk(finalResult) ? finalResult.value : undefined,
      error: Result.isErr(finalResult) ? finalResult.error : undefined,
      cached: this.cacheConfig ? true : false,
    }
    perf.endSpan(span)

    return finalResult
  }

  private async executeWithRetry(
    executeWithTimeout: () => Promise<Result<unknown, Output>>,
    input: Input | undefined
  ): Promise<Result<unknown, Output>> {
    // Create a function that throws on Result.Err for the retry utility
    const throwingFunction = async (_: unknown): Promise<Output> => {
      const result = await executeWithTimeout()
      if (Result.isErr(result)) {
        throw new Error(`Pipeline execution failed: ${JSON.stringify(result.error)}`)
      }
      return result.value
    }

    const retryPipeline = retry(throwingFunction, this.retryConfig!.times, this.retryConfig!.delay)

    try {
      const result = await retryPipeline(input)
      return Result.Ok(result) as Result<unknown, Output>
    } catch (error) {
      // Try to parse the original error from the thrown message
      let originalError: unknown
      try {
        if (error instanceof Error && error.message.startsWith('Pipeline execution failed: ')) {
          originalError = JSON.parse(error.message.replace('Pipeline execution failed: ', ''))
        } else {
          originalError = error
        }
      } catch {
        originalError = error
      }

      const networkError: NetworkError = {
        ...createError(
          'NETWORK_ERROR',
          `Pipeline failed after ${this.retryConfig!.times} attempts`,
          {
            pipelineName: this.name,
            originalError,
          }
        ),
        code: 'NETWORK_ERROR',
        url: '',
        method: 'PIPELINE',
        attempt: this.retryConfig!.times,
        maxAttempts: this.retryConfig!.times,
        retryDelay: this.retryConfig!.delay,
      }
      return Result.Err(networkError)
    }
  }

  private logTraces(context: PipelineContext): void {
    if (isTraceEnabled() && context.traces.length > 0) {
      console.group(`Pipeline: ${this.name}`)
      context.traces.forEach(trace => {
        const status = trace.success ? '✓' : '✗'
        console.log(`${status} ${trace.stepName} (${trace.duration?.toFixed(2)}ms)`)
        if (trace.error) {
          console.error('  Error:', trace.error)
        }
      })
      console.groupEnd()
    }
  }
}

export function pipeline<T = unknown>(
  name: string,
  deps?: { httpClient?: HttpClient }
): Pipeline<T, T> {
  return new Pipeline<T, T>([], name, deps, undefined, undefined, undefined)
}

// Export static methods as standalone functions
pipeline.parallel = <I, T>(pipelines: Pipeline<I, T>[]): Pipeline<I, T[]> => {
  return Pipeline.parallel(pipelines)
}

export const tracing = {
  getCollector: () => GlobalTraceCollector.getInstance(),
  query: (filter?: TraceFilter) => GlobalTraceCollector.getInstance().query(filter),
  export: () => GlobalTraceCollector.getInstance().export(),
  clear: () => GlobalTraceCollector.getInstance().clear(),

  // Visualization helpers
  printSummary: () => {
    const data = GlobalTraceCollector.getInstance().export()
    console.log('📊 Kairo Tracing Summary')
    console.log('========================')
    console.log(`Total Entries: ${data.summary.totalEntries}`)
    console.log(
      `Success Rate: ${((data.summary.successCount / data.summary.totalEntries) * 100).toFixed(1)}%`
    )
    console.log(`Average Duration: ${data.summary.avgDuration.toFixed(2)}ms`)
    console.log(`Min Duration: ${data.summary.minDuration.toFixed(2)}ms`)
    console.log(`Max Duration: ${data.summary.maxDuration.toFixed(2)}ms`)
  },

  printTable: (filter?: TraceFilter) => {
    const entries = GlobalTraceCollector.getInstance().query(filter)
    if (entries.length === 0) {
      console.log('No trace entries found')
      return
    }

    console.table(
      entries.map(entry => ({
        Pipeline: entry.pipelineName,
        Step: entry.stepName,
        Success: entry.success ? '✅' : '❌',
        Duration: `${entry.duration.toFixed(2)}ms`,
        Error: entry.error?.code || '-',
      }))
    )
  },

  printTimeline: (pipelineName?: string) => {
    const filter = pipelineName ? { pipelineName } : undefined
    const entries = GlobalTraceCollector.getInstance()
      .query(filter)
      .sort((a, b) => a.timestamp - b.timestamp)

    if (entries.length === 0) {
      console.log('No trace entries found')
      return
    }

    console.log('⏱️  Kairo Pipeline Timeline')
    console.log('===========================')

    entries.forEach(entry => {
      const status = entry.success ? '✅' : '❌'
      const time = new Date(entry.timestamp).toLocaleTimeString()
      const duration = entry.duration.toFixed(2)
      console.log(`${time} ${status} ${entry.pipelineName}:${entry.stepName} (${duration}ms)`)
      if (entry.error) {
        console.log(`    ❌ ${entry.error.code}: ${entry.error.message}`)
      }
    })
  },

  getSlowQueries: (thresholdMs = 100) => {
    return GlobalTraceCollector.getInstance()
      .query({
        minDuration: thresholdMs,
      })
      .sort((a, b) => b.duration - a.duration)
  },

  getErrorBreakdown: () => {
    const entries = GlobalTraceCollector.getInstance().query({ success: false })
    const errorCounts = entries.reduce(
      (acc, entry) => {
        if (entry.error?.code) {
          acc[entry.error.code] = (acc[entry.error.code] || 0) + 1
        }
        return acc
      },
      {} as Record<string, number>
    )

    return Object.entries(errorCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
  },

  // Performance metrics
  getPerformanceMetrics: (pipelineName?: string) => {
    const filter = pipelineName ? { pipelineName } : undefined
    const entries = GlobalTraceCollector.getInstance().query(filter)

    const byStep = entries.reduce(
      (acc, entry) => {
        const key = `${entry.pipelineName}:${entry.stepName}`
        if (!acc[key]) {
          acc[key] = { durations: [], errors: 0, successes: 0 }
        }
        acc[key].durations.push(entry.duration)
        if (entry.success) {
          acc[key].successes++
        } else {
          acc[key].errors++
        }
        return acc
      },
      {} as Record<string, { durations: number[]; errors: number; successes: number }>
    )

    return Object.entries(byStep)
      .map(([step, data]) => {
        const durations = data.durations
        const total = data.successes + data.errors

        return {
          step,
          count: total,
          successRate: total > 0 ? (data.successes / total) * 100 : 0,
          avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
          minDuration: Math.min(...durations),
          maxDuration: Math.max(...durations),
          p95Duration: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)] || 0,
        }
      })
      .sort((a, b) => b.avgDuration - a.avgDuration)
  },

  getThroughput: (timeWindowMs = 60000) => {
    const now = Date.now()
    const entries = GlobalTraceCollector.getInstance().query({
      startTime: now - timeWindowMs,
      endTime: now,
    })

    const throughputPerSecond = (entries.length / timeWindowMs) * 1000
    return {
      totalRequests: entries.length,
      timeWindowMs,
      throughputPerSecond: Math.round(throughputPerSecond * 100) / 100,
      successRate:
        entries.length > 0 ? (entries.filter(e => e.success).length / entries.length) * 100 : 0,
    }
  },

  // Additional visualization helpers
  printErrorGraph: (maxBars = 10) => {
    const errorBreakdown = tracing.getErrorBreakdown()
    if (errorBreakdown.length === 0) {
      console.log('No errors found')
      return
    }

    console.log('📊 Error Distribution')
    console.log('=====================')

    const maxCount = Math.max(...errorBreakdown.map(e => e.count))
    const barLength = 40

    errorBreakdown.slice(0, maxBars).forEach(({ code, count }) => {
      const barCount = Math.round((count / maxCount) * barLength)
      const bar = '█'.repeat(barCount) + '░'.repeat(barLength - barCount)
      console.log(`${code.padEnd(20)} ${bar} ${count}`)
    })
  },

  printPipelineFlow: (pipelineName: string) => {
    const entries = GlobalTraceCollector.getInstance()
      .query({ pipelineName })
      .sort((a, b) => a.timestamp - b.timestamp)

    if (entries.length === 0) {
      console.log(`No entries found for pipeline: ${pipelineName}`)
      return
    }

    console.log(`🔄 Pipeline Flow: ${pipelineName}`)
    console.log('================================')

    const stepGroups = entries.reduce(
      (acc, entry) => {
        const key = `${entry.timestamp}_${entry.id}`
        if (!acc[key]) acc[key] = []
        acc[key].push(entry)
        return acc
      },
      {} as Record<string, TraceEntry[]>
    )

    Object.values(stepGroups).forEach(group => {
      const firstEntry = group[0]
      if (!firstEntry) return

      const time = new Date(firstEntry.timestamp).toLocaleTimeString()
      console.log(`\n⏰ ${time}`)

      group.forEach((entry, idx) => {
        const prefix = idx === group.length - 1 ? '└─' : '├─'
        const status = entry.success ? '✅' : '❌'
        console.log(`  ${prefix} ${status} ${entry.stepName} (${entry.duration.toFixed(2)}ms)`)
        if (entry.error) {
          console.log(`     └─ Error: ${entry.error.message}`)
        }
      })
    })
  },

  exportAsJSON: (filter?: TraceFilter) => {
    const entries = GlobalTraceCollector.getInstance().query(filter)
    return JSON.stringify(entries, null, 2)
  },

  exportAsCSV: (filter?: TraceFilter) => {
    const entries = GlobalTraceCollector.getInstance().query(filter)
    if (entries.length === 0) return ''

    const headers = [
      'timestamp',
      'pipeline',
      'step',
      'success',
      'duration',
      'error_code',
      'error_message',
    ]
    const rows = entries.map(entry => [
      entry.timestamp,
      entry.pipelineName,
      entry.stepName,
      entry.success,
      entry.duration.toFixed(2),
      entry.error?.code || '',
      entry.error?.message || '',
    ])

    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join(
      '\n'
    )
  },

  getHealthScore: () => {
    const data = GlobalTraceCollector.getInstance().export()

    // Calculate health score based on multiple factors
    const successRate = (data.summary.successCount / data.summary.totalEntries) * 100
    const avgDuration = data.summary.avgDuration
    const errorTypes = tracing.getErrorBreakdown().length

    let score = 100

    // Deduct points for low success rate
    if (successRate < 95) score -= 10
    if (successRate < 90) score -= 20
    if (successRate < 80) score -= 30

    // Deduct points for slow performance
    if (avgDuration > 1000) score -= 10
    if (avgDuration > 5000) score -= 20

    // Deduct points for error diversity
    if (errorTypes > 5) score -= 10
    if (errorTypes > 10) score -= 20

    return {
      score: Math.max(0, score),
      successRate,
      avgDuration,
      errorTypes,
      recommendation: score >= 80 ? 'Healthy' : score >= 60 ? 'Needs Attention' : 'Critical',
    }
  },
}

// Export cache utilities
export const cache = {
  // Basic cache operations (backward compatibility)
  clear: async () => {
    PipelineCache.clear()
    await advancedCache.clear()
  },
  cleanup: async () => {
    PipelineCache.cleanup()
    await advancedCache.cleanup()
  },
  invalidate: async (pattern: string | RegExp) => {
    const basicCount = PipelineCache.invalidate(pattern)
    const advancedCount = await advancedCache.invalidateByPattern(pattern)
    return basicCount + advancedCount
  },
  invalidateByPipeline: async (pipelineName: string) => {
    const basicCount = PipelineCache.invalidateByPipeline(pipelineName)
    const pattern = `^pipeline:${pipelineName}:`
    const advancedCount = await advancedCache.invalidateByPattern(pattern)
    return basicCount + advancedCount
  },
  invalidateByTag: async (tag: string) => {
    const basicCount = PipelineCache.invalidateByTag(tag)
    const advancedCount = await advancedCache.invalidateByTag(tag)
    return basicCount + advancedCount
  },
  size: () => {
    const basicSize = PipelineCache.size()
    const stats = advancedCache.stats()
    return basicSize + stats.size
  },
  entries: () => PipelineCache.entries(),

  // Advanced cache operations
  stats: () => advancedCache.stats(),
  warmCache: <T>(
    entries: Array<{ key: string; value: T; config?: Partial<AdvancedCacheConfig> }>
  ) => advancedCache.warmCache(entries),
  addLayer: (config: Parameters<typeof advancedCache.addLayer>[0]) =>
    advancedCache.addLayer(config),
  removeLayer: (name: string) => advancedCache.removeLayer(name),
}

const isTraceEnabled = (): boolean =>
  cond<typeof globalThis, boolean>([
    [() => typeof globalThis === 'undefined', () => false],
    [() => globalThis.process?.env?.LUCID_TRACE === 'true', () => true],
    [
      () => typeof globalThis.localStorage !== 'undefined',
      () => globalThis.localStorage?.getItem('lucid:trace') === 'true',
    ],
    [() => true, () => false],
  ])(globalThis) || false

const createTraceLogger = (context: PipelineContext) =>
  conditionalEffect(
    () => isTraceEnabled(),
    (trace: TraceEntry) => {
      context.traces.push(trace)
      GlobalTraceCollector.getInstance().collect(trace)
    }
  )

const generateTraceId = (): string => {
  return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

const createTraceEntry = (
  context: PipelineContext,
  stepName: string,
  start: number,
  result: Result<unknown, unknown>,
  input?: unknown,
  error?: unknown,
  metadata: Record<string, unknown> = {}
): TraceEntry => ({
  id: generateTraceId(),
  timestamp: Date.now(),
  pipelineName: context.name,
  stepName,
  success: Result.isOk(result),
  duration: performance.now() - start,
  input,
  output: Result.isOk(result) ? result.value : undefined,
  error: Result.isErr(result) ? (result.error as KairoError) : (error as KairoError),
  metadata,
})
