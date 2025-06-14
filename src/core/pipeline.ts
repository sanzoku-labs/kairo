import { Result } from './result'
import { type Schema, type ValidationError } from './schema'
import { isNil, isEmpty, tryCatch, cond, resolve, conditionalEffect } from '../utils/fp'

export interface HttpError {
  code: 'HTTP_ERROR'
  status: number
  statusText: string
  url: string
  message: string
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
  fetch: (url, options) => fetch(url, options)
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
    
    const url = resolve(this.urlOrFn)(input as TInput)
    const options = resolve(this.options || {})(input as TInput)
    
    try {
      const httpClient = context.httpClient || defaultHttpClient
      
      const baseOptions: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      }

      const shouldAddBody = !baseOptions.body && !isNil(input) && !isEmpty(input)
      const fetchOptions: RequestInit = shouldAddBody 
        ? { ...baseOptions, body: JSON.stringify(input) }
        : baseOptions
      const response = await httpClient.fetch(url, fetchOptions)

      if (!response.ok) {
        const error: HttpError = {
          code: 'HTTP_ERROR',
          status: response.status,
          statusText: response.statusText,
          url,
          message: `HTTP ${response.status}: ${response.statusText}`
        }
        
        const logTrace = createTraceLogger(context)
        logTrace(createTraceEntry(context, 'fetch', start, Result.Err(error), { url, options, body: input }, error))
        
        return Result.Err(error)
      }

      const data = await response.json()
      
      const logTrace = createTraceLogger(context)
      logTrace(createTraceEntry(context, 'fetch', start, Result.Ok(data), { url, options, body: input }))
      
      return Result.Ok(data)
    } catch (error) {
      const httpError: HttpError = {
        code: 'HTTP_ERROR',
        status: 0,
        statusText: 'Network Error',
        url,
        message: error instanceof Error ? error.message : 'Unknown network error'
      }
      
      const logTrace = createTraceLogger(context)
      logTrace(createTraceEntry(context, 'fetch', start, Result.Err(httpError), { url, options, body: input }, httpError))
      
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

export class Pipeline<Input, Output> {
  constructor(
    private readonly steps: Step[],
    private readonly name: string,
    private readonly deps?: { httpClient?: HttpClient }
  ) {}

  input<I>(schema: Schema<I>): Pipeline<I, I> {
    return new Pipeline<I, I>(
      [...this.steps, new InputStep(schema)],
      this.name,
      this.deps
    )
  }

  fetch(
    url: string | ((input: Input) => string),
    options?: RequestInit | ((input: Input) => RequestInit)
  ): Pipeline<Input, unknown> {
    return new Pipeline<Input, unknown>(
      [...this.steps, new FetchStep<Input>(url, options)],
      this.name,
      this.deps
    )
  }

  validate<O>(schema: Schema<O>): Pipeline<Input, O> {
    return new Pipeline<Input, O>(
      [...this.steps, new ValidateStep(schema)],
      this.name,
      this.deps
    )
  }

  map<U>(fn: (value: Output) => U): Pipeline<Input, U> {
    return new Pipeline<Input, U>(
      [...this.steps, new MapStep(fn)],
      this.name,
      this.deps
    )
  }

  mapError<E, F>(fn: (error: E) => F): Pipeline<Input, Output> {
    return new Pipeline<Input, Output>(
      [...this.steps, new MapErrorStep(fn)],
      this.name,
      this.deps
    )
  }

  trace(label?: string): Pipeline<Input, Output> {
    return new Pipeline<Input, Output>(
      [...this.steps, new TraceStep(label)],
      this.name,
      this.deps
    )
  }

  async run(input?: Input): Promise<Result<unknown, Output>> {
    const context: PipelineContext = {
      name: this.name,
      traces: []
    }
    
    if (this.deps?.httpClient) {
      context.httpClient = this.deps.httpClient
    }

    const stepExecutors = {
      mapError: (result: Result<unknown, unknown>, step: Step) => 
        Result.isErr(result) 
          ? Promise.resolve(Result.mapError(result, (step as MapErrorStep<unknown, unknown>).fn))
          : Promise.resolve(result),
          
      default: async (result: Result<unknown, unknown>, step: Step) =>
        Result.isOk(result) 
          ? await step.execute(result.value, context)
          : result
    }

    const executeStep = async (
      result: Result<unknown, unknown>,
      step: Step
    ): Promise<Result<unknown, unknown>> => {
      const stepStrategy = cond<[Result<unknown, unknown>, Step], Promise<Result<unknown, unknown>>>([
        // Skip step if error and not mapError
        [([res, s]) => Result.isErr(res) && s.type !== 'mapError', 
         ([res]) => Promise.resolve(res)],
        
        // Handle mapError specifically 
        [([_, step]) => step.type === 'mapError',
         ([result, step]) => stepExecutors.mapError(result, step)],
        
        // Default case - execute step
        [() => true,
         ([result, step]) => stepExecutors.default(result, step)]
      ])

      const executor = stepStrategy([result, step])
      return executor || Promise.resolve(result)
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
  return new Pipeline<T, T>([], name, deps)
}

function isTraceEnabled(): boolean {
  if (typeof globalThis !== 'undefined') {
    if (globalThis.process?.env?.LUCID_TRACE === 'true') return true
    if (typeof globalThis.localStorage !== 'undefined') {
      return globalThis.localStorage?.getItem('lucid:trace') === 'true'
    }
  }
  return false
}

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
  error: Result.isErr(result) ? result.error : error
})