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

/**
 * Error type specific to resource operations in the INTERFACE pillar.
 *
 * @interface ResourceError
 * @extends {KairoError}
 * @example
 * ```typescript
 * const error: ResourceError = {
 *   code: 'RESOURCE_ERROR',
 *   operation: 'validateMethod',
 *   message: 'Invalid resource configuration',
 *   context: { path: '/invalid' }
 * }
 * ```
 */
export interface ResourceError extends KairoError {
  /** Always 'RESOURCE_ERROR' for resource-specific errors */
  code: 'RESOURCE_ERROR'
  /** The resource operation that caused the error */
  operation: string
}

/**
 * Defines a single HTTP method configuration for a resource.
 * Forms the core building block of the INTERFACE pillar's resource system.
 *
 * @template TParams - Type of URL path parameters
 * @template TBody - Type of request body
 * @template TResponse - Type of response data
 *
 * @interface ResourceMethod
 * @example
 * ```typescript
 * const getUserMethod: ResourceMethod<{ id: string }, never, User> = {
 *   method: 'GET',
 *   path: '/users/:id',
 *   params: schema.object({ id: schema.string() }),
 *   response: UserSchema,
 *   cache: { ttl: 60000 },
 *   retry: { times: 3 },
 *   timeout: 5000
 * }
 * ```
 */
export interface ResourceMethod<TParams = unknown, TBody = unknown, TResponse = unknown> {
  /** HTTP method type */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** URL path template with parameter placeholders (e.g., '/users/:id') */
  path: string
  /** Schema for validating URL path parameters */
  params?: Schema<TParams>
  /** Schema for validating request body */
  body?: Schema<TBody>
  /** Schema for validating response data */
  response: Schema<TResponse>
  /** Caching configuration for this method */
  cache?: {
    /** Time-to-live in milliseconds */
    ttl: number
    /** Custom cache key generator function */
    key?: (input: unknown) => string
    /** Cache invalidation triggers */
    invalidateOn?: string[]
  }
  /** Retry configuration for failed requests */
  retry?: {
    /** Number of retry attempts */
    times: number
    /** Delay between retries in milliseconds */
    delay?: number
  }
  /** Request timeout in milliseconds */
  timeout?: number
}

/**
 * Collection of resource methods keyed by operation name.
 *
 * @example
 * ```typescript
 * const userMethods: ResourceMethods = {
 *   get: { method: 'GET', path: '/users/:id', response: UserSchema },
 *   create: { method: 'POST', path: '/users', body: CreateUserSchema, response: UserSchema }
 * }
 * ```
 */
export type ResourceMethods = Record<string, ResourceMethod>

/**
 * Alias for ResourceMethods for backward compatibility.
 * @deprecated Use ResourceMethods instead
 */
export type ResourceConfig = ResourceMethods

/**
 * Extracts the input type for a resource method.
 * Combines path parameters and body parameters intelligently based on the method configuration.
 *
 * @template M - The resource method type
 *
 * @example
 * ```typescript
 * type GetUserInput = ResourceInput<typeof getUserMethod>
 * // { id: string } (from path params)
 *
 * type CreateUserInput = ResourceInput<typeof createUserMethod>
 * // { name: string; email: string } (from body)
 *
 * type UpdateUserInput = ResourceInput<typeof updateUserMethod>
 * // { id: string; name: string; email: string } (combined params + body)
 * ```
 */
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

/**
 * Extracts the output/response type for a resource method.
 * Represents the validated response data after successful execution.
 *
 * @template M - The resource method type
 *
 * @example
 * ```typescript
 * type GetUserOutput = ResourceOutput<typeof getUserMethod>
 * // User (from response schema)
 *
 * type CreateUserOutput = ResourceOutput<typeof createUserMethod>
 * // User (from response schema)
 *
 * // Usage in pipeline composition
 * const pipeline = pipeline('user-flow')
 *   .input<ResourceInput<typeof getUserMethod>>()
 *   .pipeline(UserAPI.get)
 *   .map((user: ResourceOutput<typeof getUserMethod>) => {
 *     return { ...user, lastAccessed: new Date() }
 *   })
 * ```
 */
export type ResourceOutput<M extends ResourceMethod> =
  M extends ResourceMethod<unknown, unknown, infer TResponse> ? TResponse : never

/**
 * Main Resource interface representing a collection of HTTP operations.
 * Integrates with the INTERFACE pillar to provide type-safe external system communication.
 *
 * Each method becomes a Pipeline that can be composed with other operations.
 * Includes contract testing, mocking, and caching capabilities.
 *
 * @template TMethods - The resource methods configuration
 *
 * @interface Resource
 * @example
 * ```typescript
 * const UserAPI = resource('users', {
 *   get: resourceUtils.get('/users/:id', UserParamsSchema, UserSchema),
 *   create: resourceUtils.post('/users', CreateUserSchema, UserSchema)
 * })
 *
 * // Each method is a pipeline
 * const user = await UserAPI.get.run({ id: '123' })
 *
 * // Contract testing
 * await UserAPI.contract().verify('https://api.example.com')
 *
 * // Mocking
 * const mockAPI = UserAPI.mock([mockScenario('success', ...)])
 * ```
 */
export type Resource<TMethods extends ResourceMethods> = {
  /** Each method becomes a Pipeline for composition */
  [K in keyof TMethods]: Pipeline<ResourceInput<TMethods[K]>, ResourceOutput<TMethods[K]>>
} & {
  /** Resource identifier name */
  readonly name: string
  /** Base URL for all requests */
  readonly baseUrl: string
  /** Get the raw method configuration */
  getMethod<K extends keyof TMethods>(method: K): TMethods[K]
  /** Get contract verifier for testing against live APIs */
  contract(): ResourceContract<TMethods>
  /** Enable contract verification for this resource */
  withContract(): Resource<TMethods>
  /** Create a mocked version for testing */
  mock(scenarios: MockScenarios<TMethods>): MockedResource<TMethods>
}

/**
 * Internal configuration options for resource creation.
 * Supports performance optimizations like lazy loading and connection pooling.
 *
 * @interface ResourceOptionsInternal
 * @example
 * ```typescript
 * const config: ResourceOptionsInternal = {
 *   baseUrl: 'https://api.example.com',
 *   defaultCache: { ttl: 60000 },
 *   defaultRetry: { times: 3, delay: 1000 },
 *   defaultTimeout: 5000,
 *   lazy: true,
 *   connectionPool: { enabled: true, max: 10 }
 * }
 * ```
 */
interface ResourceOptionsInternal {
  /** Base URL prepended to all method paths */
  baseUrl?: string
  /** Default caching configuration applied to all methods */
  defaultCache?: {
    /** Default time-to-live in milliseconds */
    ttl: number
    /** Default cache key generator */
    key?: (input: unknown) => string
    /** Default cache invalidation triggers */
    invalidateOn?: string[]
  }
  /** Default retry configuration for all methods */
  defaultRetry?: {
    /** Default number of retry attempts */
    times: number
    /** Default delay between retries in milliseconds */
    delay?: number
  }
  /** Default timeout for all requests in milliseconds */
  defaultTimeout?: number
  /** Custom HTTP client for requests */
  httpClient?: {
    fetch(url: string, options?: RequestInit): Promise<Response>
  }
  /** Enable lazy loading for resource pipelines (performance optimization) */
  lazy?: boolean
  /** HTTP connection pooling configuration */
  connectionPool?: {
    /** Whether to enable connection pooling */
    enabled: boolean
    /** Minimum number of connections in pool */
    min?: number
    /** Maximum number of connections in pool */
    max?: number
    /** Idle timeout for pooled connections in milliseconds */
    idleTimeout?: number
  }
}

/**
 * Creates a standardized ResourceError with operation context.
 * Used throughout the resource system for consistent error handling.
 *
 * @param operation - The resource operation that failed
 * @param message - Human-readable error description
 * @param context - Additional context for debugging
 * @returns Formatted ResourceError
 *
 * @example
 * ```typescript
 * const error = createResourceError(
 *   'validateMethod',
 *   'Path must start with /',
 *   { path: 'invalid-path' }
 * )
 * ```
 */
const createResourceError = (operation: string, message: string, context = {}): ResourceError => ({
  ...createError('RESOURCE_ERROR', message, context),
  code: 'RESOURCE_ERROR',
  operation,
})

/**
 * Safely interpolates URL template parameters using functional error handling.
 * Replaces :paramName placeholders with actual values from the params object.
 *
 * @param template - URL template with :paramName placeholders
 * @param params - Object containing parameter values
 * @returns Result containing interpolated URL or error
 *
 * @example
 * ```typescript
 * const result = interpolateUrl('/users/:id/posts/:postId', {
 *   id: '123',
 *   postId: '456'
 * })
 * // Result.Ok('/users/123/posts/456')
 *
 * const errorResult = interpolateUrl('/users/:id', {})
 * // Result.Err('Missing required parameter: id')
 * ```
 */
const interpolateUrl = (
  template: string,
  params: Record<string, unknown>
): Result<ResourceError, string> => {
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
    error =>
      createResourceError(
        'interpolateUrl',
        error instanceof Error ? error.message : 'URL interpolation failed',
        { template, params }
      )
  )
}

/**
 * Extracts parameter names from a URL template path.
 * Finds all :paramName patterns and returns the parameter names.
 *
 * @param path - URL template path
 * @returns Array of parameter names
 *
 * @example
 * ```typescript
 * extractPathParams('/users/:userId/posts/:postId')
 * // Returns: ['userId', 'postId']
 *
 * extractPathParams('/static/path')
 * // Returns: []
 * ```
 */
const extractPathParams = (path: string): string[] => {
  const matches = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g)
  return matches ? matches.map(match => match.substring(1)) : []
}

/**
 * Separates input parameters into path parameters and body parameters.
 * Uses functional error handling to safely categorize request data.
 *
 * @template T - Type of input parameters
 * @param input - Combined input parameters
 * @param pathParams - Array of path parameter names
 * @returns Result containing separated parameters or error
 *
 * @example
 * ```typescript
 * const input = { id: '123', name: 'John', email: 'john@example.com' }
 * const pathParams = ['id']
 *
 * const result = separateParams(input, pathParams)
 * // Result.Ok({
 * //   pathParams: { id: '123' },
 * //   bodyParams: { name: 'John', email: 'john@example.com' }
 * // })
 * ```
 */
const separateParams = <T extends Record<string, unknown>>(
  input: T,
  pathParams: string[]
): Result<
  ResourceError,
  { pathParams: Record<string, unknown>; bodyParams: Record<string, unknown> }
> => {
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
    error =>
      createResourceError(
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

/**
 * Creates a new Resource with type-safe HTTP method configurations.
 *
 * This is the main entry point for the INTERFACE pillar, enabling declarative
 * external system integration with built-in caching, retry, timeout, and contract testing.
 *
 * @template TMethods - Resource methods configuration type
 * @param name - Unique identifier for the resource
 * @param methods - HTTP method configurations
 * @param config - Optional resource configuration
 * @returns Fully configured Resource with Pipeline integration
 *
 * @example
 * ```typescript
 * // Basic resource creation
 * const UserAPI = resource('users', {
 *   get: {
 *     method: 'GET',
 *     path: '/users/:id',
 *     params: schema.object({ id: schema.string() }),
 *     response: UserSchema
 *   },
 *   create: {
 *     method: 'POST',
 *     path: '/users',
 *     body: CreateUserSchema,
 *     response: UserSchema
 *   }
 * }, {
 *   baseUrl: 'https://api.example.com',
 *   defaultCache: { ttl: 60000 },
 *   defaultRetry: { times: 3 }
 * })
 *
 * // Usage in pipelines
 * const user = await UserAPI.get.run({ id: '123' })
 * const newUser = await UserAPI.create.run({ name: 'John', email: 'john@example.com' })
 *
 * // Contract testing
 * await UserAPI.contract().verify('https://staging-api.example.com')
 * ```
 */
export const resource = <TMethods extends ResourceMethods>(
  name: string,
  methods: TMethods,
  config: ResourceOptionsInternal = {}
): Resource<TMethods> => {
  const impl = new ResourceImpl(name, config.baseUrl || '', methods, config)
  return createResourceProxy(impl)
}

/**
 * Comprehensive utility functions for working with resources.
 *
 * Provides helper methods for creating method configurations, validation,
 * safe resource creation with fallback strategies, and functional programming
 * patterns for error handling.
 *
 * @namespace resourceUtils
 * @example
 * ```typescript
 * // Method creation helpers
 * const getUser = resourceUtils.get('/users/:id', UserParamsSchema, UserSchema)
 * const createUser = resourceUtils.post('/users', CreateUserSchema, UserSchema)
 *
 * // Validation
 * const validation = resourceUtils.validateMethod(getUser)
 *
 * // Safe resource creation
 * const result = resourceUtils.createValidated('users', { get: getUser })
 *
 * // Fallback strategies
 * const resource = resourceUtils.createWithFallback([
 *   { name: 'primary', methods: primaryMethods },
 *   { name: 'fallback', methods: fallbackMethods }
 * ])
 * ```
 */
export const resourceUtils = {
  /**
   * Creates a GET method configuration with type-safe parameters.
   *
   * @template TParams - Type of URL path parameters
   * @template TResponse - Type of response data
   * @param path - URL path template with parameters
   * @param params - Schema for path parameters
   * @param response - Schema for response validation
   * @param options - Additional method options (cache, retry, timeout)
   * @returns Configured GET method
   *
   * @example
   * ```typescript
   * const getUserMethod = resourceUtils.get(
   *   '/users/:id',
   *   schema.object({ id: schema.string().uuid() }),
   *   UserSchema,
   *   { cache: { ttl: 60000 }, timeout: 5000 }
   * )
   * ```
   */
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

  /**
   * Creates a POST method configuration with request body validation.
   *
   * @template TBody - Type of request body
   * @template TResponse - Type of response data
   * @param path - URL path (typically without parameters for POST)
   * @param body - Schema for request body validation
   * @param response - Schema for response validation
   * @param options - Additional method options
   * @returns Configured POST method
   *
   * @example
   * ```typescript
   * const createUserMethod = resourceUtils.post(
   *   '/users',
   *   CreateUserSchema,
   *   UserSchema,
   *   { retry: { times: 3, delay: 1000 } }
   * )
   * ```
   */
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
  interpolateUrl: (template: string, params: Record<string, unknown>) =>
    interpolateUrl(template, params),
  extractPathParams,

  /**
   * Validates that a resource path starts with a forward slash.
   * Uses functional programming patterns for safe validation.
   *
   * @param path - URL path to validate
   * @returns Result containing validated path or validation error
   *
   * @example
   * ```typescript
   * const validResult = resourceUtils.validatePath('/api/users')
   * // Result.Ok('/api/users')
   *
   * const invalidResult = resourceUtils.validatePath('api/users')
   * // Result.Err('Resource path must start with /')
   * ```
   */
  validatePath: (path: string): Result<ResourceError, string> => {
    return path.startsWith('/')
      ? Result.Ok(path)
      : Result.Err(createResourceError('validatePath', 'Resource path must start with /', { path }))
  },

  /**
   * Validates that path parameters have corresponding schema validation.
   * Ensures type safety for URL parameter extraction.
   *
   * @param path - URL path template
   * @param method - Resource method configuration
   * @returns Result indicating validation success or failure
   *
   * @example
   * ```typescript
   * const method = { method: 'GET', path: '/users/:id', response: UserSchema }
   * const result = resourceUtils.validatePathParams('/users/:id', method)
   * // Result.Err('Path parameters require params schema')
   *
   * const validMethod = { ...method, params: ParamsSchema }
   * const validResult = resourceUtils.validatePathParams('/users/:id', validMethod)
   * // Result.Ok(undefined)
   * ```
   */
  validatePathParams: (path: string, method: ResourceMethod): Result<ResourceError, void> => {
    const pathParams = extractPathParams(path)
    return pathParams.length > 0 && !method.params
      ? Result.Err(
          createResourceError('validatePathParams', 'Path parameters require params schema', {
            pathParams,
            path,
          })
        )
      : Result.Ok(undefined)
  },

  /**
   * Validates that HTTP methods requiring data have appropriate schemas.
   * Ensures POST, PUT, and PATCH methods have body or params validation.
   *
   * @param method - Resource method to validate
   * @returns Result indicating validation success or failure
   *
   * @example
   * ```typescript
   * const invalidMethod = { method: 'POST', path: '/users', response: UserSchema }
   * const result = resourceUtils.validateBodySchema(invalidMethod)
   * // Result.Err('POST method should have body or params schema')
   *
   * const validMethod = { ...invalidMethod, body: CreateUserSchema }
   * const validResult = resourceUtils.validateBodySchema(validMethod)
   * // Result.Ok(undefined)
   * ```
   */
  validateBodySchema: (method: ResourceMethod): Result<ResourceError, void> => {
    return ['POST', 'PUT', 'PATCH'].includes(method.method) && !method.body && !method.params
      ? Result.Err(
          createResourceError(
            'validateBodySchema',
            `${method.method} method should have body or params schema`,
            { method: method.method, path: method.path }
          )
        )
      : Result.Ok(undefined)
  },

  /**
   * Comprehensive validation of a resource method configuration.
   * Combines path, parameter, and body schema validation using FP composition.
   *
   * @param method - Resource method to validate
   * @returns Result indicating overall validation success or first error encountered
   *
   * @example
   * ```typescript
   * const method = {
   *   method: 'GET',
   *   path: '/users/:id',
   *   params: ParamsSchema,
   *   response: UserSchema
   * }
   *
   * const result = resourceUtils.validateMethod(method)
   * // Result.Ok(undefined) if all validations pass
   * // Result.Err(error) for first validation failure
   * ```
   */
  validateMethod: (method: ResourceMethod): Result<ResourceError, void> => {
    const pathValidation = resourceUtils.validatePath(method.path)
    if (Result.isErr(pathValidation)) return pathValidation

    const paramsValidation = resourceUtils.validatePathParams(method.path, method)
    if (Result.isErr(paramsValidation)) return paramsValidation

    return resourceUtils.validateBodySchema(method)
  },

  /**
   * Validates all methods in a resource configuration using functional sequence.
   * Processes all validations and returns the first error or success.
   *
   * @template TMethods - Resource methods type
   * @param methods - Collection of resource methods to validate
   * @returns Result indicating success or first validation failure
   *
   * @example
   * ```typescript
   * const methods = {
   *   get: resourceUtils.get('/users/:id', ParamsSchema, UserSchema),
   *   create: resourceUtils.post('/users', CreateUserSchema, UserSchema)
   * }
   *
   * const result = resourceUtils.validateMethods(methods)
   * // Result.Ok(undefined) if all methods are valid
   * // Result.Err(error) with method name context if any method fails
   * ```
   */
  validateMethods: <TMethods extends ResourceMethods>(
    methods: TMethods
  ): Result<ResourceError, void> => {
    const validations = Object.entries(methods).map(([methodName, method]) => {
      const validation = resourceUtils.validateMethod(method)
      return mapError((error: ResourceError) =>
        createResourceError(
          'validateMethods',
          `Method '${methodName}' validation failed: ${error.message}`,
          { methodName, originalError: error }
        )
      )(validation)
    })

    const sequenceResult = sequence(validations)
    return mapResult(() => undefined)(sequenceResult) as Result<ResourceError, void>
  },

  /**
   * Creates a resource with comprehensive upfront validation.
   * Uses functional programming patterns for safe resource creation.
   *
   * @template TMethods - Resource methods type
   * @param name - Resource identifier
   * @param methods - HTTP method configurations
   * @param config - Optional resource configuration
   * @returns Result containing created resource or validation error
   *
   * @example
   * ```typescript
   * const result = resourceUtils.createValidated('users', {
   *   get: resourceUtils.get('/users/:id', ParamsSchema, UserSchema),
   *   create: resourceUtils.post('/users', CreateUserSchema, UserSchema)
   * }, {
   *   baseUrl: 'https://api.example.com',
   *   defaultCache: { ttl: 60000 }
   * })
   *
   * if (Result.isOk(result)) {
   *   const userAPI = result.value
   *   // Safe to use - all methods validated
   * } else {
   *   console.error('Resource creation failed:', result.error)
   * }
   * ```
   */
  createValidated: <TMethods extends ResourceMethods>(
    name: string,
    methods: TMethods,
    config: ResourceOptionsInternal = {}
  ): Result<ResourceError, Resource<TMethods>> => {
    const validation = resourceUtils.validateMethods(methods)
    if (Result.isErr(validation)) return validation

    return tryCatch(
      () => resource(name, methods, config),
      error =>
        createResourceError(
          'createValidated',
          error instanceof Error ? error.message : 'Resource creation failed',
          { name, config }
        )
    )
  },

  /**
   * Creates a resource using the first successful configuration from a list.
   * Implements fallback pattern with functional programming for resilience.
   *
   * @template TMethods - Resource methods type
   * @param configurations - Array of resource configurations to try
   * @returns Result containing first successful resource or last error
   *
   * @example
   * ```typescript
   * const result = resourceUtils.createWithFallback([
   *   {
   *     name: 'primary-api',
   *     methods: primaryMethods,
   *     config: { baseUrl: 'https://primary-api.com' }
   *   },
   *   {
   *     name: 'backup-api',
   *     methods: backupMethods,
   *     config: { baseUrl: 'https://backup-api.com' }
   *   }
   * ])
   *
   * // Uses first working configuration
   * // Graceful degradation for service reliability
   * ```
   */
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
    const primaryResult = resourceUtils.createValidated(
      primaryConfig.name,
      primaryConfig.methods,
      primaryConfig.config || {}
    )
    return recover(() => resourceUtils.createWithFallback(fallbackConfigs))(primaryResult)
  },
}

/**
 * Enhanced cache system integration with functional programming patterns.
 *
 * Provides safe cache operations that return Results instead of throwing errors.
 * Includes cache key generation, invalidation strategies, and analytics.
 * All operations use async-safe error handling with proper error context.
 *
 * @namespace resourceCache
 * @example
 * ```typescript
 * // Safe cache invalidation
 * const result = await resourceCache.invalidate('users', 'get', { id: '123' })
 * if (Result.isOk(result)) {
 *   console.log(`Invalidated ${result.value} cache entries`)
 * }
 *
 * // Cache key generation
 * const keyResult = resourceCache.generateCacheKey('users', 'get', { id: '123' })
 * // Result.Ok('pipeline:users.get:{"id":"123"}')
 *
 * // Cache statistics
 * const statsResult = resourceCache.stats()
 * if (Result.isOk(statsResult)) {
 *   console.log(`Cache has ${statsResult.value.size} entries`)
 * }
 * ```
 */
export const resourceCache = {
  /**
   * Safely invalidates cache entries for a specific resource method.
   * Uses async-safe error handling to prevent uncaught promise rejections.
   *
   * @param resourceName - Name of the resource
   * @param methodName - Name of the method
   * @param input - Optional input parameters for specific cache entry
   * @returns Promise resolving to Result with number of invalidated entries
   *
   * @example
   * ```typescript
   * // Invalidate specific cache entry
   * const result = await resourceCache.invalidate('users', 'get', { id: '123' })
   *
   * // Invalidate all entries for a method
   * const allResult = await resourceCache.invalidate('users', 'get')
   *
   * if (Result.isOk(result)) {
   *   console.log(`Invalidated ${result.value} entries`)
   * } else {
   *   console.error('Cache invalidation failed:', result.error)
   * }
   * ```
   */
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
    return mapError((error: Error) =>
      createResourceError('invalidateCache', error.message, { resourceName, methodName, input })
    )(result) as Result<ResourceError, number>
  },

  /**
   * Generates cache keys using safe JSON serialization.
   * Handles complex objects and circular references gracefully.
   *
   * @param resourceName - Name of the resource
   * @param methodName - Name of the method
   * @param input - Optional input parameters
   * @returns Result containing generated cache key or error
   *
   * @example
   * ```typescript
   * // Simple cache key
   * const keyResult = resourceCache.generateCacheKey('users', 'get')
   * // Result.Ok('pipeline:users.get')
   *
   * // With parameters
   * const paramKeyResult = resourceCache.generateCacheKey('users', 'get', { id: '123' })
   * // Result.Ok('pipeline:users.get:{"id":"123"}')
   *
   * // Handles serialization errors
   * const circularObj = { self: null }
   * circularObj.self = circularObj
   * const errorResult = resourceCache.generateCacheKey('users', 'get', circularObj)
   * // Result.Err(ResourceError)
   * ```
   */
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
      error =>
        createResourceError(
          'generateCacheKey',
          error instanceof Error ? error.message : 'Cache key generation failed',
          { resourceName, methodName, input }
        )
    )
  },

  // Invalidate cache for entire resource with error handling
  invalidateResource: async (resourceName: string): Promise<Result<ResourceError, number>> => {
    const result = await asyncToResult(cache.invalidate(`^pipeline:${resourceName}\\.`))
    return mapError((error: Error) =>
      createResourceError('invalidateResource', error.message, { resourceName })
    )(result) as Result<ResourceError, number>
  },

  // Composed cache operations
  invalidateByPattern: async (pattern: string | RegExp): Promise<Result<ResourceError, number>> => {
    const result = await asyncToResult(cache.invalidate(pattern))
    return mapError((error: Error) =>
      createResourceError('invalidateByPattern', error.message, { pattern })
    )(result) as Result<ResourceError, number>
  },

  // Invalidate cache by tags with error handling
  invalidateByTag: async (tag: string): Promise<Result<ResourceError, number>> => {
    const result = await asyncToResult(cache.invalidateByTag(tag))
    return mapError((error: Error) =>
      createResourceError('invalidateByTag', error.message, { tag })
    )(result) as Result<ResourceError, number>
  },

  /**
   * Retrieves cache statistics with safe error handling.
   * Provides insights into cache usage, entry count, and entry ages.
   *
   * @returns Result containing cache statistics or error
   *
   * @example
   * ```typescript
   * const statsResult = resourceCache.stats()
   *
   * if (Result.isOk(statsResult)) {
   *   const { size, entries } = statsResult.value
   *   console.log(`Cache contains ${size} entries`)
   *
   *   // Find oldest entries
   *   const oldEntries = entries
   *     .filter(entry => entry.age > 300000) // 5 minutes
   *     .map(entry => entry.key)
   * } else {
   *   console.error('Failed to get cache stats:', statsResult.error)
   * }
   * ```
   */
  stats: (): Result<
    ResourceError,
    { size: number; entries: Array<{ key: string; timestamp: number; age: number }> }
  > => {
    return tryCatch(
      () => ({
        size: cache.size(),
        entries: cache.entries().map(([key, entry]) => ({
          key,
          timestamp: entry.timestamp,
          age: Date.now() - entry.timestamp,
        })),
      }),
      error =>
        createResourceError(
          'cacheStats',
          error instanceof Error ? error.message : 'Cache statistics retrieval failed'
        )
    )
  },

  /**
   * Safely performs cache cleanup operations.
   * Removes expired entries and optimizes cache performance.
   *
   * @returns Result indicating success or failure of cleanup operation
   *
   * @example
   * ```typescript
   * const cleanupResult = resourceCache.cleanup()
   *
   * if (Result.isOk(cleanupResult)) {
   *   console.log('Cache cleanup completed successfully')
   * } else {
   *   console.error('Cache cleanup failed:', cleanupResult.error)
   * }
   *
   * // Can be used in scheduled maintenance
   * setInterval(() => {
   *   void resourceCache.cleanup()
   * }, 300000) // Every 5 minutes
   * ```
   */
  cleanup: (): Result<ResourceError, void> => {
    return tryCatch(
      () => {
        void cache.cleanup()
      },
      error =>
        createResourceError(
          'cacheCleanup',
          error instanceof Error ? error.message : 'Cache cleanup failed'
        )
    )
  },

  /**
   * Safely clears all resource cache entries.
   * Use with caution as this removes all cached data.
   *
   * @returns Result indicating success or failure of clear operation
   *
   * @example
   * ```typescript
   * // Clear cache during application reset
   * const clearResult = resourceCache.clear()
   *
   * if (Result.isOk(clearResult)) {
   *   console.log('All caches cleared successfully')
   * } else {
   *   console.error('Cache clear failed:', clearResult.error)
   * }
   *
   * // Use in development for clean state
   * if (process.env.NODE_ENV === 'development') {
   *   void resourceCache.clear()
   * }
   * ```
   */
  clear: (): Result<ResourceError, void> => {
    return tryCatch(
      () => {
        void cache.clear()
      },
      error =>
        createResourceError(
          'cacheClear',
          error instanceof Error ? error.message : 'Cache clear failed'
        )
    )
  },
}
