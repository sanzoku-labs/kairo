import { Result } from './result'
import { type Schema, type ValidationError } from './schema'
import { isNil, isEmpty, cond, resolve, conditionalEffect, tryCatch, retry } from '../utils/fp'
import { type KairoError, createError } from './errors'

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
  timestamp: number
  pipelineName: string
  stepName: string
  success: boolean
  duration?: number
  input?: unknown
  output?: unknown
  error?: unknown
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

  cache(ttl: number): Pipeline<Input, Output> {
    return new Pipeline<Input, Output>(
      this.steps,
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig,
      { ttl }
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

    // Cache logic
    if (this.cacheConfig) {
      const cacheKey = `pipeline:${this.name}:${JSON.stringify(input || {})}`
      const cached = PipelineCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.cacheConfig.ttl) {
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
                  return await step.execute(result.value, context)
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

    // Cache successful results
    if (this.cacheConfig && Result.isOk(finalResult)) {
      const cacheKey = `pipeline:${this.name}:${JSON.stringify(input || {})}`
      PipelineCache.set(cacheKey, {
        result: finalResult,
        timestamp: Date.now(),
      })
    }

    return finalResult
  }

  private async executeWithRetry(
    executeWithTimeout: () => Promise<Result<unknown, Output>>,
    input: Input | undefined
  ): Promise<Result<unknown, Output>> {
    const retryPipeline = retry(
      (_: unknown) => executeWithTimeout(),
      this.retryConfig!.times,
      this.retryConfig!.delay
    )

    try {
      const result = await retryPipeline(input)
      return Result.Ok(result) as Result<unknown, Output>
    } catch {
      const networkError: NetworkError = {
        ...createError(
          'NETWORK_ERROR',
          `Pipeline failed after ${this.retryConfig!.times} attempts`,
          {
            pipelineName: this.name,
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
    (trace: TraceEntry) => context.traces.push(trace)
  )

const createTraceEntry = (
  context: PipelineContext,
  stepName: string,
  start: number,
  result: Result<unknown, unknown>,
  input?: unknown,
  error?: unknown
): TraceEntry => ({
  timestamp: Date.now(),
  pipelineName: context.name,
  stepName,
  success: Result.isOk(result),
  duration: performance.now() - start,
  input,
  output: Result.isOk(result) ? result.value : undefined,
  error: Result.isErr(result) ? result.error : error,
})
