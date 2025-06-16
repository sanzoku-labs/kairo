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
import {
  tryCatch,
  mapError,
  recover,
  sequence,
  firstOk,
  mapResult,
  asyncToResult,
} from '../utils/fp'

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

// URL interpolation utility with FP error handling
const interpolateUrl = (template: string, params: Record<string, unknown>): Result<ResourceError, string> => {
  return tryCatch(
    () => {
      return template.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, paramName: string) => {
        const value = params[paramName]
        if (value === undefined || value === null) {
          throw new Error(`Missing required parameter: ${paramName}`)
        }
        return encodeURIComponent(typeof value === 'string' ? value : JSON.stringify(value))
      })
    },
    error => createResourceError(
      'interpolateUrl',
      error instanceof Error ? error.message : 'URL interpolation failed',
      { template, params }
    )
  )
}

// Extract path parameters from URL template
const extractPathParams = (path: string): string[] => {
  const matches = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g)
  return matches ? matches.map(match => match.substring(1)) : []
}

// Separate path params from body/query params with FP error handling
const separateParams = <T extends Record<string, unknown>>(
  input: T,
  pathParams: string[]
): Result<ResourceError, { pathParams: Record<string, unknown>; bodyParams: Record<string, unknown> }> => {
  return tryCatch(
    () => {
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
    },
    error => createResourceError(
      'separateParams',
      error instanceof Error ? error.message : 'Parameter separation failed',
      { input, pathParams }
    )
  )
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

  // Add fetch step with FP-based URL interpolation
  basePipeline = basePipeline.fetch(
    // URL function that handles parameter interpolation with error handling
    (input: unknown) => {
      if (pathParams.length === 0) {
        return fullPath
      }

      const inputObj = input as Record<string, unknown>
      const separateResult = separateParams(inputObj, pathParams)
      if (Result.isErr(separateResult)) {
        throw new Error(separateResult.error.message)
      }
      
      const interpolateResult = interpolateUrl(fullPath, separateResult.value.pathParams)
      if (Result.isErr(interpolateResult)) {
        throw new Error(interpolateResult.error.message)
      }
      
      return interpolateResult.value
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
          const separationResult = separateParams(inputObj, pathParams)
          if (Result.isErr(separationResult)) {
            throw new Error(separationResult.error.message)
          }
          const { bodyParams } = separationResult.value
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
  interpolateUrl: (template: string, params: Record<string, unknown>) => interpolateUrl(template, params),
  extractPathParams,

  // FP-based validation helpers
  validatePath: (path: string): Result<ResourceError, string> => {
    return path.startsWith('/')
      ? Result.Ok(path)
      : Result.Err(createResourceError('validatePath', 'Resource path must start with /', { path }))
  },

  validatePathParams: (path: string, method: ResourceMethod): Result<ResourceError, void> => {
    const pathParams = extractPathParams(path)
    return pathParams.length > 0 && !method.params
      ? Result.Err(createResourceError('validatePathParams', 'Path parameters require params schema', {
          pathParams,
          path,
        }))
      : Result.Ok(undefined)
  },

  validateBodySchema: (method: ResourceMethod): Result<ResourceError, void> => {
    return ['POST', 'PUT', 'PATCH'].includes(method.method) && !method.body && !method.params
      ? Result.Err(createResourceError(
          'validateBodySchema',
          `${method.method} method should have body or params schema`,
          { method: method.method, path: method.path }
        ))
      : Result.Ok(undefined)
  },

  // Composed validation using FP patterns
  validateMethod: (method: ResourceMethod): Result<ResourceError, void> => {
    const pathValidation = resourceUtils.validatePath(method.path)
    if (Result.isErr(pathValidation)) return pathValidation
    
    const paramsValidation = resourceUtils.validatePathParams(method.path, method)
    if (Result.isErr(paramsValidation)) return paramsValidation
    
    return resourceUtils.validateBodySchema(method)
  },

  // Validate multiple methods using sequence
  validateMethods: <TMethods extends ResourceMethods>(
    methods: TMethods
  ): Result<ResourceError, void> => {
    const validations = Object.entries(methods).map(([methodName, method]) => {
      const validation = resourceUtils.validateMethod(method)
      return mapError((error: ResourceError) => createResourceError(
        'validateMethods',
        `Method '${methodName}' validation failed: ${error.message}`,
        { methodName, originalError: error }
      ))(validation)
    })

    const sequenceResult = sequence(validations)
    return mapResult(() => undefined)(sequenceResult) as Result<ResourceError, void>
  },

  // Create resource with FP-based validation
  createValidated: <TMethods extends ResourceMethods>(
    name: string,
    methods: TMethods,
    config: ResourceOptionsInternal = {}
  ): Result<ResourceError, Resource<TMethods>> => {
    const validation = resourceUtils.validateMethods(methods)
    if (Result.isErr(validation)) return validation
    
    return tryCatch(
      () => resource(name, methods, config),
      error => createResourceError(
        'createValidated',
        error instanceof Error ? error.message : 'Resource creation failed',
        { name, config }
      )
    )
  },

  // Create resource with fallback strategies using FP patterns
  createWithFallback: <TMethods extends ResourceMethods>(
    configurations: Array<{
      name: string
      methods: TMethods
      config?: ResourceOptionsInternal
    }>
  ): Result<ResourceError, Resource<TMethods>> => {
    const results = configurations.map(({ name, methods, config }) =>
      resourceUtils.createValidated(name, methods, config || {})
    )
    return firstOk(results)
  },

  // Compose multiple resource configurations with error recovery
  composeResources: <TMethods extends ResourceMethods>(
    primaryConfig: { name: string; methods: TMethods; config?: ResourceOptionsInternal },
    fallbackConfigs: Array<{ name: string; methods: TMethods; config?: ResourceOptionsInternal }>
  ): Result<ResourceError, Resource<TMethods>> => {
    const primaryResult = resourceUtils.createValidated(primaryConfig.name, primaryConfig.methods, primaryConfig.config || {})
    return recover(() => resourceUtils.createWithFallback(fallbackConfigs))(primaryResult)
  },
}

// FP-enhanced cache system integration
export const resourceCache = {
  // Invalidate cache for specific resource method with FP error handling
  invalidate: async (
    resourceName: string,
    methodName: string,
    input?: unknown
  ): Promise<Result<ResourceError, number>> => {
    const operation = async (): Promise<number> => {
      const pipelineName = `${resourceName}.${methodName}`
      if (input) {
        // Invalidate specific cache entry
        const cacheKey = `pipeline:${pipelineName}:${JSON.stringify(input)}`
        return await cache.invalidate(`^${cacheKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
      } else {
        // Invalidate all cache entries for this pipeline
        return await cache.invalidateByPipeline(pipelineName)
      }
    }

    const result = await asyncToResult(operation())
    return mapError((error: Error) => createResourceError(
      'invalidateCache',
      error.message,
      { resourceName, methodName, input }
    ))(result) as Result<ResourceError, number>
  },

  // FP-based cache key generation
  generateCacheKey: (
    resourceName: string,
    methodName: string,
    input?: unknown
  ): Result<ResourceError, string> => {
    return tryCatch(
      () => {
        const pipelineName = `${resourceName}.${methodName}`
        return input
          ? `pipeline:${pipelineName}:${JSON.stringify(input)}`
          : `pipeline:${pipelineName}`
      },
      error => createResourceError(
        'generateCacheKey',
        error instanceof Error ? error.message : 'Cache key generation failed',
        { resourceName, methodName, input }
      )
    )
  },

  // Invalidate cache for entire resource with error handling
  invalidateResource: async (resourceName: string): Promise<Result<ResourceError, number>> => {
    const result = await asyncToResult(cache.invalidate(`^pipeline:${resourceName}\\.`))
    return mapError((error: Error) => createResourceError(
      'invalidateResource',
      error.message,
      { resourceName }
    ))(result) as Result<ResourceError, number>
  },

  // Composed cache operations
  invalidateByPattern: async (pattern: string | RegExp): Promise<Result<ResourceError, number>> => {
    const result = await asyncToResult(cache.invalidate(pattern))
    return mapError((error: Error) => createResourceError(
      'invalidateByPattern',
      error.message,
      { pattern }
    ))(result) as Result<ResourceError, number>
  },

  // Invalidate cache by tags with error handling
  invalidateByTag: async (tag: string): Promise<Result<ResourceError, number>> => {
    const result = await asyncToResult(cache.invalidateByTag(tag))
    return mapError((error: Error) => createResourceError(
      'invalidateByTag',
      error.message,
      { tag }
    ))(result) as Result<ResourceError, number>
  },

  // Safe cache statistics with error handling
  stats: (): Result<ResourceError, { size: number; entries: Array<{ key: string; timestamp: number; age: number }> }> => {
    return tryCatch(
      () => ({
        size: cache.size(),
        entries: cache.entries().map(([key, entry]) => ({
          key,
          timestamp: entry.timestamp,
          age: Date.now() - entry.timestamp,
        })),
      }),
      error => createResourceError(
        'cacheStats',
        error instanceof Error ? error.message : 'Cache statistics retrieval failed'
      )
    )
  },

  // Safe cleanup with error handling
  cleanup: (): Result<ResourceError, void> => {
    return tryCatch(
      () => {
        void cache.cleanup()
      },
      error => createResourceError(
        'cacheCleanup',
        error instanceof Error ? error.message : 'Cache cleanup failed'
      )
    )
  },

  // Clear all resource caches safely
  clear: (): Result<ResourceError, void> => {
    return tryCatch(
      () => {
        void cache.clear()
      },
      error => createResourceError(
        'cacheClear',
        error instanceof Error ? error.message : 'Cache clear failed'
      )
    )
  },
}
