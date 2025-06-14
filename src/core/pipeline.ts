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

interface RetryConfig {
  times: number
  delay?: number
}

interface TimeoutConfig {
  ms: number
}

export class Pipeline<Input, Output> {
  constructor(
    private readonly steps: Step[],
    private readonly name: string,
    private readonly deps?: { httpClient?: HttpClient },
    private readonly retryConfig?: RetryConfig,
    private readonly timeoutConfig?: TimeoutConfig
  ) {}

  input<I>(schema: Schema<I>): Pipeline<I, I> {
    return new Pipeline<I, I>(
      [...this.steps, new InputStep(schema)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig
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
      this.timeoutConfig
    )
  }

  validate<O>(schema: Schema<O>): Pipeline<Input, O> {
    return new Pipeline<Input, O>(
      [...this.steps, new ValidateStep(schema)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig
    )
  }

  map<U>(fn: (value: Output) => U): Pipeline<Input, U> {
    return new Pipeline<Input, U>(
      [...this.steps, new MapStep(fn)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig
    )
  }

  mapError<E, F>(fn: (error: E) => F): Pipeline<Input, Output> {
    return new Pipeline<Input, Output>(
      [...this.steps, new MapErrorStep(fn)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig
    )
  }

  trace(label?: string): Pipeline<Input, Output> {
    return new Pipeline<Input, Output>(
      [...this.steps, new TraceStep(label)],
      this.name,
      this.deps,
      this.retryConfig,
      this.timeoutConfig
    )
  }

  retry(times: number, delay?: number): Pipeline<Input, Output> {
    return new Pipeline<Input, Output>(
      this.steps,
      this.name,
      this.deps,
      { times, delay: delay || 1000 },
      this.timeoutConfig
    )
  }

  timeout(ms: number): Pipeline<Input, Output> {
    return new Pipeline<Input, Output>(this.steps, this.name, this.deps, this.retryConfig, { ms })
  }

  async run(input?: Input): Promise<Result<unknown, Output>> {
    const start = performance.now()

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

    if (!this.retryConfig) {
      return executeWithTimeout()
    }

    const retryPipeline = retry(
      (_: unknown) => executeWithTimeout(),
      this.retryConfig.times,
      this.retryConfig.delay
    )

    try {
      const result = await retryPipeline(input)
      return Result.Ok(result) as Result<unknown, Output>
    } catch {
      const networkError: NetworkError = {
        ...createError(
          'NETWORK_ERROR',
          `Pipeline failed after ${this.retryConfig.times} attempts`,
          {
            pipelineName: this.name,
          }
        ),
        code: 'NETWORK_ERROR',
        url: '',
        method: 'PIPELINE',
        attempt: this.retryConfig.times,
        maxAttempts: this.retryConfig.times,
        retryDelay: this.retryConfig.delay,
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
  return new Pipeline<T, T>([], name, deps, undefined, undefined)
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
