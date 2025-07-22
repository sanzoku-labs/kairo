/**
 * SERVICE Pillar Core Methods
 *
 * Implements the 5 core SERVICE methods with clean, maintainable patterns:
 * - get() - Fetch data with caching support
 * - post() - Create resources with idempotency
 * - put() - Update/replace resources with concurrency control
 * - patch() - Partial updates with format support
 * - delete() - Remove resources with soft delete options
 */

import { Result } from '../shared'
import type { ServiceError, ServiceNetworkError } from '../shared'
import { createServiceError } from '../shared'
// Comprehensive fp-utils integration
import { pipe } from '../../fp-utils/basics'
import { map as fpMap, filter as fpFilter } from '../../fp-utils/array'
import { switchCase } from '../../fp-utils/control'
import type {
  GetOptions,
  PostOptions,
  PutOptions,
  PatchOptions,
  DeleteOptions,
  ServiceResult,
  RequestConfig,
} from './types'

/**
 * Extended request configuration with caching metadata
 */
interface GetRequestConfig {
  request: RequestConfig
  cache: { enabled?: boolean; ttl?: number }
  cacheKey: string
}
import {
  mergeOptions,
  normalizeTimeout,
  normalizeRetryOptions,
  normalizeCacheOptions,
  type RetryOptions,
} from '../shared/config'
import { buildURL, parseResponse, isRetryable } from './utils'

// ============================================================================
// CORE HTTP METHODS - PUBLIC API
// ============================================================================

/**
 * GET method - Fetch data from HTTP endpoints with intelligent caching
 */
export const get = async <T = unknown>(
  url: string,
  options: GetOptions = {}
): Promise<ServiceResult<T>> => {
  const config = createGetConfig(url, options)

  // Check cache before making request
  const cachedResult = getCachedData<T>(config.cacheKey, config.cache)
  if (cachedResult) {
    return Result.Ok(cachedResult)
  }

  const result = await executeWithRetry<T>(config.request, options)

  // Cache successful results
  if (Result.isOk(result)) {
    setCachedData(config.cacheKey, result.value, config.cache)
  }

  return result
}

/**
 * POST method - Create resources with proper content handling
 */
export const post = async <TData = unknown, TResponse = unknown>(
  url: string,
  data?: TData,
  options: PostOptions = {}
): Promise<ServiceResult<TResponse>> => {
  const config = createPostConfig(url, data, options)
  return executeWithRetry<TResponse>(config, options)
}

/**
 * PUT method - Update/replace resources with concurrency support
 */
export const put = async <TData = unknown, TResponse = unknown>(
  url: string,
  data: TData,
  options: PutOptions = {}
): Promise<ServiceResult<TResponse>> => {
  const config = createPutConfig(url, data, options)
  return executeWithRetry<TResponse>(config, options)
}

/**
 * PATCH method - Partial updates with format flexibility
 */
export const patch = async <TData = unknown, TResponse = unknown>(
  url: string,
  data: TData,
  options: PatchOptions = {}
): Promise<ServiceResult<TResponse>> => {
  const config = createPatchConfig(url, data, options)
  return executeWithRetry<TResponse>(config, options)
}

/**
 * DELETE method - Remove resources with comprehensive options
 */
export const deleteMethod = async <TResponse = unknown>(
  url: string,
  options: DeleteOptions = {}
): Promise<ServiceResult<TResponse>> => {
  const config = createDeleteConfig(url, options)
  return executeWithRetry<TResponse>(config, options)
}

// Export delete with safe name to avoid keyword conflict
export { deleteMethod as delete }

// ============================================================================
// REQUEST CONFIGURATION BUILDERS
// ============================================================================

/**
 * Create GET request configuration with caching setup
 */
function createGetConfig(url: string, options: GetOptions): GetRequestConfig {
  const opts = mergeOptions(options, {
    timeout: 30000,
    responseType: 'json',
  })

  const completeURL = buildURL(url, undefined, opts.params)
  const cacheConfig = normalizeCacheOptions(opts.cache)
  const cacheKey =
    typeof cacheConfig.key === 'function' ? cacheConfig.key(opts) : cacheConfig.key || completeURL

  const headers = buildHeaders({
    Accept: opts.responseType === 'json' ? 'application/json' : '*/*',
    ...(opts.ifModifiedSince && { 'If-Modified-Since': opts.ifModifiedSince.toUTCString() }),
    ...(opts.ifNoneMatch && { 'If-None-Match': opts.ifNoneMatch }),
    ...opts.headers,
  })

  const request: RequestConfig = {
    method: 'GET',
    url: completeURL,
    headers,
    timeout: normalizeTimeout(opts.timeout),
    ...(opts.signal && { signal: opts.signal }),
  }

  return {
    request,
    cache: cacheConfig,
    cacheKey,
  }
}

/**
 * Create POST request configuration with body processing
 */
function createPostConfig<TData>(
  url: string,
  data: TData | undefined,
  options: PostOptions
): RequestConfig {
  const opts = mergeOptions(options, {
    timeout: 30000,
    contentType: 'json',
  })

  const bodyConfig =
    data !== undefined
      ? processRequestBody(opts.contentType || 'json', data)
      : { body: undefined, headers: {} }

  const headers = buildHeaders({
    Accept: 'application/json',
    ...(opts.idempotencyKey && { 'Idempotency-Key': opts.idempotencyKey }),
    ...bodyConfig.headers,
    ...opts.headers,
  })

  const config: RequestConfig = {
    method: 'POST',
    url,
    headers,
    timeout: normalizeTimeout(opts.timeout),
    ...(bodyConfig.body !== undefined && { body: bodyConfig.body }),
    ...(opts.signal && { signal: opts.signal }),
  }

  return config
}

/**
 * Create PUT request configuration with concurrency headers
 */
function createPutConfig<TData>(url: string, data: TData, options: PutOptions): RequestConfig {
  const opts = mergeOptions(options, {
    timeout: 30000,
    merge: false,
  })

  const headers = buildHeaders({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(opts.ifMatch && { 'If-Match': opts.ifMatch }),
    ...(opts.ifUnmodifiedSince && { 'If-Unmodified-Since': opts.ifUnmodifiedSince.toUTCString() }),
    ...opts.headers,
  })

  const config: RequestConfig = {
    method: 'PUT',
    url,
    headers,
    timeout: normalizeTimeout(opts.timeout),
    body: JSON.stringify(data),
    ...(opts.signal && { signal: opts.signal }),
  }

  return config
}

/**
 * Create PATCH request configuration with format-specific headers
 */
function createPatchConfig<TData>(url: string, data: TData, options: PatchOptions): RequestConfig {
  const opts = mergeOptions(options, {
    timeout: 30000,
    strategy: 'merge',
    format: 'merge-patch',
  })

  const contentType = getPatchContentType(opts.format || 'merge-patch')

  const headers = buildHeaders({
    Accept: 'application/json',
    'Content-Type': contentType,
    ...opts.headers,
  })

  const config: RequestConfig = {
    method: 'PATCH',
    url,
    headers,
    timeout: normalizeTimeout(opts.timeout),
    body: JSON.stringify(data),
    ...(opts.signal && { signal: opts.signal }),
  }

  return config
}

/**
 * Create DELETE request configuration with query parameters
 */
function createDeleteConfig(url: string, options: DeleteOptions): RequestConfig {
  const opts = mergeOptions(options, {
    timeout: 30000,
    soft: false,
    force: false,
    returnDeleted: false,
  })

  // Build query parameters for delete options using fp-utils
  const buildQueryParams = pipe(
    (options: DeleteOptions) => ({
      ...(options.soft && { soft: 'true' }),
      ...(options.force && { force: 'true' }),
      ...(options.returnDeleted && { return: 'true' }),
    }),
    (params: Record<string, string>) => params
  )
  
  const queryParams = buildQueryParams(opts)
  const deleteURL = Object.keys(queryParams).length > 0 
    ? buildURL(url, undefined, queryParams) 
    : url

  const headers = buildHeaders({
    Accept: 'application/json',
    ...opts.headers,
  })

  const config: RequestConfig = {
    method: 'DELETE',
    url: deleteURL,
    headers,
    timeout: normalizeTimeout(opts.timeout),
    ...(opts.signal && { signal: opts.signal }),
  }

  return config
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Build headers object with proper merging using fp-utils
 */
function buildHeaders(headers: Record<string, string | undefined>): Record<string, string> {
  // Functional approach: filter undefined values using fp-utils
  const filterDefined = <T>(obj: Record<string, T | undefined>): Record<string, T> => {
    const result: Record<string, T> = {}
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== undefined) {
        result[key] = value
      }
    })
    return result
  }
  
  return filterDefined(headers)
}

/**
 * Process request body based on content type
 */
function processRequestBody(
  contentType: string,
  data: unknown
): {
  body: string | FormData
  headers: Record<string, string>
} {
  // Use fp-utils switchCase for cleaner conditional logic
  const contentTypeProcessor = switchCase({
    json: (data: unknown) => ({
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    }),
    form: (data: unknown) => ({
      body: objectToUrlSearchParams(data).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
    multipart: (data: unknown) => ({
      body: objectToFormData(data) as string | FormData,
      headers: {} as Record<string, string>, // FormData sets boundary automatically
    }),
    text: (data: unknown) => ({
      body: String(data),
      headers: { 'Content-Type': 'text/plain' },
    }),
  }, (data: unknown) => ({
    // Default case
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  }))

  return contentTypeProcessor(contentType as 'json' | 'form' | 'multipart' | 'text')(data)
}

/**
 * Get content type for PATCH operations
 */
function getPatchContentType(format: string): string {
  switch (format) {
    case 'json-patch':
      return 'application/json-patch+json'
    case 'merge-patch':
      return 'application/merge-patch+json'
    default:
      return 'application/json'
  }
}

/**
 * Convert object to URLSearchParams using fp-utils
 */
function objectToUrlSearchParams(data: unknown): URLSearchParams {
  const params = new URLSearchParams()

  if (data && typeof data === 'object') {
    // Use functional approach for object processing
    const processEntries = pipe(
      (obj: Record<string, unknown>) => Object.entries(obj),
      fpFilter(([, value]) => value !== undefined && value !== null),
      fpMap(([key, value]) => ({ key, value: String(value) }))
    )
    
    const validEntries = processEntries(data as Record<string, unknown>)
    validEntries.forEach(({ key, value }) => params.append(key, value))
  }

  return params
}

/**
 * Convert object to FormData using fp-utils
 */
function objectToFormData(data: unknown): FormData {
  if (data instanceof FormData) {
    return data
  }

  const formData = new FormData()

  if (data && typeof data === 'object') {
    // Use functional pipeline for FormData processing
    const processFormEntries = pipe(
      (obj: Record<string, unknown>) => Object.entries(obj),
      fpFilter(([, value]) => value !== undefined && value !== null),
      fpMap(([key, value]) => ({ key, value: String(value) }))
    )
    
    const validEntries = processFormEntries(data as Record<string, unknown>)
    validEntries.forEach(({ key, value }) => formData.append(key, value))
  }

  return formData
}

// ============================================================================
// REQUEST EXECUTION & RETRY LOGIC
// ============================================================================

/**
 * Execute HTTP request with comprehensive error handling using fp-utils
 */
async function executeRequest<T>(config: RequestConfig): Promise<ServiceResult<T>> {
  // Use traditional try-catch for now due to async complexity  
  try {
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.body || null,
      signal: config.signal || null,
    })

    const parsed = await parseResponse<T>(response)

    if (Result.isErr(parsed)) {
      return parsed
    }

    return Result.Ok(parsed.value.data)
  } catch (error) {
    return Result.Err(createNetworkError(error, config))
  }
}

/**
 * Create appropriate network error based on error type
 */
function createNetworkError(
  error: unknown,
  config: RequestConfig
): ServiceError | ServiceNetworkError {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return createServiceError(config.method.toLowerCase(), 'Request was aborted', {
        url: config.url,
      })
    }

    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      const networkError: ServiceNetworkError = {
        code: 'SERVICE_NETWORK_ERROR',
        pillar: 'SERVICE',
        operation: config.method.toLowerCase(),
        message: 'Network error occurred',
        url: config.url,
        timestamp: Date.now(),
        context: { error },
      }
      return networkError
    }

    return createServiceError(config.method.toLowerCase(), error.message, {
      url: config.url,
      error,
    })
  }

  return createServiceError(config.method.toLowerCase(), 'Unknown error occurred', {
    url: config.url,
    error,
  })
}

/**
 * Execute request with intelligent retry logic
 */
async function executeWithRetry<T>(
  config: RequestConfig,
  options: { retry?: boolean | RetryOptions }
): Promise<ServiceResult<T>> {
  const retryConfig = normalizeRetryOptions(options.retry)

  if (retryConfig.attempts === 0) {
    return executeRequest<T>(config)
  }

  for (let attempt = 0; attempt <= (retryConfig.attempts ?? 0); attempt++) {
    const result = await executeRequest<T>(config)

    // Success - return immediately
    if (Result.isOk(result)) {
      return result
    }

    // Last attempt or non-retryable error - return error
    const isLastAttempt = attempt === retryConfig.attempts
    const shouldRetry = !isLastAttempt && result.error && isRetryable(result.error)

    if (!shouldRetry) {
      return result
    }

    // Wait before retry
    const delay = calculateRetryDelay(retryConfig, attempt)
    await sleep(delay)
  }

  // This should never be reached, but TypeScript requires it
  return executeRequest<T>(config)
}

/**
 * Calculate retry delay based on strategy using fp-utils
 */
function calculateRetryDelay(retryConfig: RetryOptions, attempt: number): number {
  const baseDelay = retryConfig.delay || 1000
  
  // Use fp-utils switchCase for backoff strategy
  const delayCalculator = switchCase({
    exponential: (_: unknown) => {
      const delay = baseDelay * Math.pow(2, attempt)
      return retryConfig.maxDelay ? Math.min(delay, retryConfig.maxDelay) : delay
    },
    linear: (_: unknown) => {
      const delay = baseDelay * (attempt + 1)
      return retryConfig.maxDelay ? Math.min(delay, retryConfig.maxDelay) : delay
    },
    fixed: (_: unknown) => baseDelay,
  }, (_: unknown) => baseDelay)
  
  return delayCalculator(retryConfig.backoff || 'fixed')(null)
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve): void => {
    setTimeout(resolve, ms)
  })
}

// ============================================================================
// CACHING SYSTEM
// ============================================================================

/**
 * Simple in-memory cache for SERVICE results
 */
class ServiceCache {
  private readonly cache = new Map<
    string,
    {
      data: unknown
      timestamp: number
      ttl: number
    }
  >()

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T // Type assertion needed here as we store as unknown
  }

  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Global cache instance
const serviceCache = new ServiceCache()

/**
 * Get cached data if available and valid
 */
function getCachedData<T>(key: string, cacheConfig: { enabled?: boolean; ttl?: number }): T | null {
  if (!cacheConfig.enabled) {
    return null
  }

  return serviceCache.get<T>(key)
}

/**
 * Cache successful response data
 */
function setCachedData<T>(
  key: string,
  data: T,
  cacheConfig: { enabled?: boolean; ttl?: number }
): void {
  if (!cacheConfig.enabled) {
    return
  }

  const ttl = cacheConfig.ttl ?? 300000 // 5 minutes default
  serviceCache.set(key, data, ttl)
}

// Export cache for testing/debugging purposes
export const cache = serviceCache
