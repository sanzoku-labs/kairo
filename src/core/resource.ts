import { Result } from './result'
import { type KairoError, createError } from './errors'
import { type Schema } from './native-schema'
import { type Pipeline, pipeline, cache } from './pipeline'
import {
  ContractVerifier,
  type ResourceContract,
  type MockScenarios,
  type MockedResource,
} from '../extensions/contract'
import { Lazy, ResourcePool } from '../extensions/performance/performance'

export interface ResourceError extends KairoError {
  code: 'RESOURCE_ERROR'
  operation: string
}

export interface ResourceMethod<TParams = unknown, TBody = unknown, TResponse = unknown> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  params?: Schema<TParams>
  body?: Schema<TBody>
  response: Schema<TResponse>
  cache?: {
    ttl: number
    key?: (input: unknown) => string
    invalidateOn?: string[]
  }
  retry?: {
    times: number
    delay?: number
  }
  timeout?: number
}

export type ResourceMethods = Record<string, ResourceMethod>
export type ResourceConfig = ResourceMethods

export type ResourceInput<M extends ResourceMethod> =
  M extends ResourceMethod<infer TParams, infer TBody, unknown>
    ? TParams extends undefined
      ? TBody extends undefined
        ? void
        : TBody
      : TBody extends undefined
        ? TParams
        : TParams & TBody
    : never

export type ResourceOutput<M extends ResourceMethod> =
  M extends ResourceMethod<unknown, unknown, infer TResponse> ? TResponse : never

export type Resource<TMethods extends ResourceMethods> = {
  [K in keyof TMethods]: Pipeline<ResourceInput<TMethods[K]>, ResourceOutput<TMethods[K]>>
} & {
  readonly name: string
  readonly baseUrl: string
  getMethod<K extends keyof TMethods>(method: K): TMethods[K]
  contract(): ResourceContract<TMethods>
  withContract(): Resource<TMethods>
  mock(scenarios: MockScenarios<TMethods>): MockedResource<TMethods>
}

interface ResourceOptionsInternal {
  baseUrl?: string
  defaultCache?: {
    ttl: number
    key?: (input: unknown) => string
    invalidateOn?: string[]
  }
  defaultRetry?: {
    times: number
    delay?: number
  }
  defaultTimeout?: number
  httpClient?: {
    fetch(url: string, options?: RequestInit): Promise<Response>
  }
  lazy?: boolean // Enable lazy loading for resources
  connectionPool?: {
    enabled: boolean
    min?: number
    max?: number
    idleTimeout?: number
  }
}

const createResourceError = (operation: string, message: string, context = {}): ResourceError => ({
  ...createError('RESOURCE_ERROR', message, context),
  code: 'RESOURCE_ERROR',
  operation,
})

// URL interpolation utility
const interpolateUrl = (template: string, params: Record<string, unknown>): string => {
  return template.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, paramName: string) => {
    const value = params[paramName]
    if (value === undefined || value === null) {
      throw new Error(`Missing required parameter: ${paramName}`)
    }
    return encodeURIComponent(typeof value === 'string' ? value : JSON.stringify(value))
  })
}

// Extract path parameters from URL template
const extractPathParams = (path: string): string[] => {
  const matches = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g)
  return matches ? matches.map(match => match.substring(1)) : []
}

// Separate path params from body/query params
const separateParams = <T extends Record<string, unknown>>(
  input: T,
  pathParams: string[]
): { pathParams: Record<string, unknown>; bodyParams: Record<string, unknown> } => {
  const pathParamsObj: Record<string, unknown> = {}
  const bodyParams: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(input)) {
    if (pathParams.includes(key)) {
      pathParamsObj[key] = value
    } else {
      bodyParams[key] = value
    }
  }

  return { pathParams: pathParamsObj, bodyParams }
}

// Create pipeline for a resource method
const createMethodPipeline = (
  resourceName: string,
  methodName: string,
  method: ResourceMethod,
  config: ResourceOptionsInternal
): Pipeline<unknown, unknown> => {
  const pipelineName = `${resourceName}.${methodName}`
  const baseUrl = config.baseUrl || ''
  const fullPath = `${baseUrl}${method.path}`
  const pathParams = extractPathParams(method.path)

  // Create the base pipeline
  let basePipeline = pipeline(
    pipelineName,
    config.httpClient ? { httpClient: config.httpClient } : undefined
  )

  // For now, skip input validation at the pipeline level
  // since we need to handle combined param+body inputs properly
  // The validation will be handled in the individual method level

  // Add fetch step with URL interpolation
  basePipeline = basePipeline.fetch(
    // URL function that handles parameter interpolation
    (input: unknown) => {
      if (pathParams.length === 0) {
        return fullPath
      }

      const inputObj = input as Record<string, unknown>
      const { pathParams: pathParamsObj } = separateParams(inputObj, pathParams)
      return interpolateUrl(fullPath, pathParamsObj)
    },
    // Options function that handles HTTP method and body
    (input: unknown) => {
      const options: RequestInit = {
        method: method.method,
      }

      // For methods that can have a body
      if (['POST', 'PUT', 'PATCH'].includes(method.method) && input) {
        const inputObj = input as Record<string, unknown>

        if (pathParams.length > 0 && method.body) {
          // We have both path params and a body schema, separate them
          const { bodyParams } = separateParams(inputObj, pathParams)
          options.body = JSON.stringify(bodyParams)
        } else if (pathParams.length > 0) {
          // We have path params but no body schema, so don't include params in body
          // This shouldn't happen in normal usage but just in case
          options.body = JSON.stringify(inputObj)
        } else if (pathParams.length === 0) {
          // No path params, entire input is the body
          options.body = JSON.stringify(input)
        }
        // If pathParams.length > 0 but no body schema, don't add body
      }

      return options
    }
  )

  // Add response validation
  basePipeline = basePipeline.validate(method.response)

  // Apply caching if configured
  const cacheConfig = method.cache || config.defaultCache
  if (cacheConfig) {
    basePipeline = basePipeline.cache(cacheConfig.ttl)
  }

  // Apply retry if configured
  const retryConfig = method.retry || config.defaultRetry
  if (retryConfig) {
    basePipeline = basePipeline.retry(retryConfig.times, retryConfig.delay)
  }

  // Apply timeout if configured
  const timeoutMs = method.timeout || config.defaultTimeout
  if (timeoutMs) {
    basePipeline = basePipeline.timeout(timeoutMs)
  }

  return basePipeline
}

// Connection pool manager for HTTP connections
class ConnectionPoolManager {
  private static pools = new Map<string, ResourcePool<Response>>()

  static getPool(
    baseUrl: string,
    config?: ResourceOptionsInternal['connectionPool']
  ): ResourcePool<Response> | null {
    if (!config?.enabled) {
      return null
    }

    const poolKey = baseUrl
    if (!this.pools.has(poolKey)) {
      const pool = new ResourcePool<Response>({
        min: config.min ?? 0,
        max: config.max ?? 10,
        idleTimeout: config.idleTimeout ?? 30000,
        createResource: async () => {
          // For HTTP/2, we can reuse the same connection
          // This is a placeholder - actual implementation would depend on the HTTP client
          await Promise.resolve()
          return new Response()
        },
        validateResource: async () => {
          await Promise.resolve()
          return true
        },
      })
      this.pools.set(poolKey, pool)
    }

    return this.pools.get(poolKey)!
  }

  static async drainAll(): Promise<void> {
    const drainPromises = Array.from(this.pools.values()).map(pool => pool.drain())
    await Promise.all(drainPromises)
    this.pools.clear()
  }
}

class ResourceImpl<TMethods extends ResourceMethods> {
  public readonly name: string
  public readonly baseUrl: string
  private pipelines: Map<string, Pipeline<unknown, unknown>> = new Map()
  private lazyPipelines: Map<string, Lazy<Pipeline<unknown, unknown>>> = new Map()
  private contractVerifier: ContractVerifier<TMethods>
  private connectionPool: ResourcePool<Response> | null

  constructor(
    name: string,
    baseUrl: string,
    public methods: TMethods,
    private _config: ResourceOptionsInternal
  ) {
    this.name = name
    this.baseUrl = baseUrl
    this.contractVerifier = new ContractVerifier(name, methods)
    // Store connection pool for future use (not currently used but reserved for HTTP/2 optimizations)
    this.connectionPool = ConnectionPoolManager.getPool(baseUrl, _config.connectionPool)
    // Prevent unused variable warning
    void this.connectionPool

    // Generate pipelines for each method
    for (const [methodName, methodConfig] of Object.entries(methods)) {
      if (_config.lazy) {
        // Create lazy-loaded pipeline
        const lazyPipeline = new Lazy({
          loader: () =>
            Promise.resolve(createMethodPipeline(name, methodName, methodConfig, this._config)),
          cache: true,
          onLoad: () => {
            console.log(`[Lazy] Loaded pipeline: ${name}.${methodName}`)
          },
        })
        this.lazyPipelines.set(methodName, lazyPipeline)

        // Create lazy property for each method
        Object.defineProperty(this, methodName, {
          get: () => {
            // Return a wrapper that loads the pipeline on first use
            return {
              run: async (input: unknown) => {
                const pipelineResult = await lazyPipeline.get()
                if (Result.isOk(pipelineResult)) {
                  return pipelineResult.value.run(input)
                }
                return pipelineResult
              },
            }
          },
          enumerable: true,
          configurable: false,
        })
      } else {
        // Create pipeline immediately
        const pipeline = createMethodPipeline(name, methodName, methodConfig, this._config)
        this.pipelines.set(methodName, pipeline)

        // Create property for each method
        Object.defineProperty(this, methodName, {
          get: () => pipeline,
          enumerable: true,
          configurable: false,
        })
      }
    }
  }

  getMethod<K extends keyof TMethods>(method: K): TMethods[K] {
    return this.methods[method]
  }

  contract(): ResourceContract<TMethods> {
    return this.contractVerifier
  }

  withContract(): Resource<TMethods> {
    // Return self as it already has contract support
    return createResourceProxy(this)
  }

  mock(scenarios: MockScenarios<TMethods>): MockedResource<TMethods> {
    return this.contractVerifier.mock(scenarios)
  }
}

// Create a typed proxy to ensure all methods are accessible
const createResourceProxy = <TMethods extends ResourceMethods>(
  impl: ResourceImpl<TMethods>
): Resource<TMethods> => {
  return new Proxy(impl, {
    get(target, prop) {
      // Handle contract-related methods
      if (prop === 'contract' || prop === 'withContract' || prop === 'mock') {
        return target[prop as keyof ResourceImpl<TMethods>]
      }
      // Handle resource methods
      if (typeof prop === 'string' && prop in target.methods) {
        return target[prop as keyof ResourceImpl<TMethods>]
      }
      return target[prop as keyof ResourceImpl<TMethods>]
    },
  }) as Resource<TMethods>
}

export const resource = <TMethods extends ResourceMethods>(
  name: string,
  methods: TMethods,
  config: ResourceOptionsInternal = {}
): Resource<TMethods> => {
  const impl = new ResourceImpl(name, config.baseUrl || '', methods, config)
  return createResourceProxy(impl)
}

// Utility functions for working with resources
export const resourceUtils = {
  // Create HTTP method helpers
  get: <TParams, TResponse>(
    path: string,
    params: Schema<TParams>,
    response: Schema<TResponse>,
    options: Partial<Omit<ResourceMethod, 'method' | 'path' | 'params' | 'response'>> = {}
  ): ResourceMethod<TParams, undefined, TResponse> =>
    ({
      method: 'GET',
      path,
      params,
      response,
      ...options,
    }) as ResourceMethod<TParams, undefined, TResponse>,

  post: <TBody, TResponse>(
    path: string,
    body: Schema<TBody>,
    response: Schema<TResponse>,
    options: Partial<Omit<ResourceMethod, 'method' | 'path' | 'body' | 'response'>> = {}
  ): ResourceMethod<undefined, TBody, TResponse> =>
    ({
      method: 'POST',
      path,
      body,
      response,
      ...options,
    }) as ResourceMethod<undefined, TBody, TResponse>,

  put: <TParams, TBody, TResponse>(
    path: string,
    params: Schema<TParams>,
    body: Schema<TBody>,
    response: Schema<TResponse>,
    options: Partial<Omit<ResourceMethod, 'method' | 'path' | 'params' | 'body' | 'response'>> = {}
  ): ResourceMethod<TParams, TBody, TResponse> => ({
    method: 'PUT',
    path,
    params,
    body,
    response,
    ...options,
  }),

  patch: <TParams, TBody, TResponse>(
    path: string,
    params: Schema<TParams>,
    body: Schema<TBody>,
    response: Schema<TResponse>,
    options: Partial<Omit<ResourceMethod, 'method' | 'path' | 'params' | 'body' | 'response'>> = {}
  ): ResourceMethod<TParams, TBody, TResponse> => ({
    method: 'PATCH',
    path,
    params,
    body,
    response,
    ...options,
  }),

  delete: <TParams, TResponse>(
    path: string,
    params: Schema<TParams>,
    response: Schema<TResponse>,
    options: Partial<Omit<ResourceMethod, 'method' | 'path' | 'params' | 'response'>> = {}
  ): ResourceMethod<TParams, undefined, TResponse> =>
    ({
      method: 'DELETE',
      path,
      params,
      response,
      ...options,
    }) as ResourceMethod<TParams, undefined, TResponse>,

  // URL utilities
  interpolateUrl,
  extractPathParams,

  // Validation helpers
  validateMethod: (method: ResourceMethod): Result<ResourceError, void> => {
    try {
      // Validate path has proper format
      if (!method.path.startsWith('/')) {
        return Result.Err(
          createResourceError('validateMethod', 'Resource path must start with /', {
            path: method.path,
          })
        )
      }

      // Validate path parameters have corresponding schema
      const pathParams = extractPathParams(method.path)
      if (pathParams.length > 0 && !method.params) {
        return Result.Err(
          createResourceError('validateMethod', 'Path parameters require params schema', {
            pathParams,
            path: method.path,
          })
        )
      }

      // Validate body schema for appropriate methods
      if (['POST', 'PUT', 'PATCH'].includes(method.method) && !method.body && !method.params) {
        return Result.Err(
          createResourceError(
            'validateMethod',
            `${method.method} method should have body or params schema`,
            { method: method.method, path: method.path }
          )
        )
      }

      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(
        createResourceError(
          'validateMethod',
          error instanceof Error ? error.message : 'Method validation failed',
          { method }
        )
      )
    }
  },

  // Create resource with validation
  createValidated: <TMethods extends ResourceMethods>(
    name: string,
    methods: TMethods,
    config: ResourceOptionsInternal = {}
  ): Result<ResourceError, Resource<TMethods>> => {
    try {
      // Validate all methods
      for (const [methodName, method] of Object.entries(methods)) {
        const validation = resourceUtils.validateMethod(method)
        if (Result.isErr(validation)) {
          return Result.Err(
            createResourceError('createValidated', `Method '${methodName}' validation failed`, {
              methodName,
              originalError: validation.error,
            })
          )
        }
      }

      const resourceInstance = resource(name, methods, config)
      return Result.Ok(resourceInstance)
    } catch (error) {
      return Result.Err(
        createResourceError(
          'createValidated',
          error instanceof Error ? error.message : 'Resource creation failed',
          { name, config }
        )
      )
    }
  },
}

// Cache system integration
export const resourceCache = {
  // Invalidate cache for specific resource method
  invalidate: async (
    resourceName: string,
    methodName: string,
    input?: unknown
  ): Promise<number> => {
    const pipelineName = `${resourceName}.${methodName}`
    if (input) {
      // Invalidate specific cache entry
      const cacheKey = `pipeline:${pipelineName}:${JSON.stringify(input)}`
      return await cache.invalidate(`^${cacheKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
    } else {
      // Invalidate all cache entries for this pipeline
      return await cache.invalidateByPipeline(pipelineName)
    }
  },

  // Invalidate cache for entire resource
  invalidateResource: async (resourceName: string): Promise<number> => {
    return await cache.invalidate(`^pipeline:${resourceName}\\.`)
  },

  // Invalidate cache by pattern
  invalidateByPattern: async (pattern: string | RegExp): Promise<number> => {
    return await cache.invalidate(pattern)
  },

  // Invalidate cache by tags (for future enhancement)
  invalidateByTag: async (tag: string): Promise<number> => {
    return await cache.invalidateByTag(tag)
  },

  // Clear all resource caches
  clear: (): void => {
    void cache.clear()
  },

  // Get cache statistics
  stats: () => ({
    size: cache.size(),
    entries: cache.entries().map(([key, entry]) => ({
      key,
      timestamp: entry.timestamp,
      age: Date.now() - entry.timestamp,
    })),
  }),

  // Cleanup expired cache entries
  cleanup: (): void => {
    void cache.cleanup()
  },
}
