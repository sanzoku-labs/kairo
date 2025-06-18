/**
 * SERVICE Pillar Core Methods
 * 
 * Implements the 5 core SERVICE methods according to V2 specifications:
 * - get() - Fetch data
 * - post() - Create resources  
 * - put() - Update resources
 * - patch() - Partial updates
 * - delete() - Remove resources
 */

import { Result } from '../shared'
import { ServiceError, ServiceNetworkError, createServiceError, createServiceHttpError } from '../shared'
import { 
  GetOptions, 
  PostOptions, 
  PutOptions, 
  PatchOptions, 
  DeleteOptions,
  ServiceResult,
  RequestConfig,
  HttpMethod
} from './types'
import { 
  mergeOptions, 
  normalizeTimeout, 
  normalizeRetryOptions, 
  normalizeCacheOptions 
} from '../shared/config'
import { buildURL, parseResponse, isRetryable } from './utils'

/**
 * Internal cache storage for SERVICE methods
 */
const cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>()

/**
 * Internal function to execute HTTP requests
 */
const executeRequest = async <T>(config: RequestConfig): Promise<ServiceResult<T>> => {
  try {
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.body,
      signal: config.signal
    })
    
    const parsed = await parseResponse<T>(response)
    if (Result.isError(parsed)) {
      return parsed
    }
    
    return Result.ok(parsed.value.data)
    
  } catch (error: any) {
    // Handle different types of errors
    if (error.name === 'AbortError') {
      return Result.error(createServiceError(
        config.method.toLowerCase(),
        'Request was aborted',
        { url: config.url }
      ))
    }
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return Result.error({
        code: 'SERVICE_NETWORK_ERROR',
        pillar: 'SERVICE',
        operation: config.method.toLowerCase(),
        message: 'Network error occurred',
        url: config.url,
        context: { error }
      } as ServiceNetworkError)
    }
    
    return Result.error(createServiceError(
      config.method.toLowerCase(),
      error.message || 'Unknown error occurred',
      { url: config.url, error }
    ))
  }
}

/**
 * Internal function to handle retry logic
 */
const executeWithRetry = async <T>(
  config: RequestConfig,
  options: { retry?: boolean | any }
): Promise<ServiceResult<T>> => {
  const retryConfig = normalizeRetryOptions(options.retry)
  
  if (retryConfig.attempts === 0) {
    return executeRequest<T>(config)
  }
  
  let lastError: ServiceError | undefined
  
  for (let attempt = 0; attempt <= retryConfig.attempts; attempt++) {
    const result = await executeRequest<T>(config)
    
    if (Result.isOk(result)) {
      return result
    }
    
    lastError = result.error
    
    // Don't retry on last attempt
    if (attempt === retryConfig.attempts) {
      break
    }
    
    // Check if error is retryable
    if (!isRetryable(lastError)) {
      break
    }
    
    // Calculate delay for next attempt
    const delay = retryConfig.delay || 1000
    let actualDelay = delay
    
    if (retryConfig.backoff === 'exponential') {
      actualDelay = delay * Math.pow(2, attempt)
    } else if (retryConfig.backoff === 'linear') {
      actualDelay = delay * (attempt + 1)
    }
    
    // Apply max delay cap
    if (retryConfig.maxDelay && actualDelay > retryConfig.maxDelay) {
      actualDelay = retryConfig.maxDelay
    }
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, actualDelay))
  }
  
  return Result.error(lastError!)
}

/**
 * Internal function to handle caching
 */
const getCachedResult = <T>(cacheKey: string, cacheConfig: any): T | null => {
  if (!cacheConfig.enabled) {
    return null
  }
  
  const cached = cache.get(cacheKey)
  if (!cached) {
    return null
  }
  
  // Check if cache is expired
  if (Date.now() - cached.timestamp > cached.ttl) {
    cache.delete(cacheKey)
    return null
  }
  
  return cached.data as T
}

/**
 * Internal function to set cache
 */
const setCachedResult = <T>(cacheKey: string, data: T, cacheConfig: any): void => {
  if (!cacheConfig.enabled) {
    return
  }
  
  cache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl: cacheConfig.ttl || 300000
  })
}

/**
 * GET method - Fetch data from HTTP endpoints
 */
export const get = async <T = unknown>(
  url: string,
  options: GetOptions = {}
): Promise<ServiceResult<T>> => {
  const opts = mergeOptions({
    timeout: 30000,
    responseType: 'json' as const
  }, options)
  
  // Build complete URL with query parameters
  const completeURL = buildURL(url, undefined, opts.params)
  
  // Handle caching
  const cacheConfig = normalizeCacheOptions(opts.cache)
  const cacheKey = typeof cacheConfig.key === 'function' 
    ? cacheConfig.key(opts)
    : cacheConfig.key || completeURL
  
  // Check cache first
  if (cacheConfig.enabled) {
    const cached = getCachedResult<T>(cacheKey, cacheConfig)
    if (cached !== null) {
      return Result.ok(cached)
    }
  }
  
  // Prepare request
  const headers: Record<string, string> = {
    'Accept': opts.responseType === 'json' ? 'application/json' : '*/*',
    ...opts.headers
  }
  
  // Add conditional request headers
  if (opts.ifModifiedSince) {
    headers['If-Modified-Since'] = opts.ifModifiedSince.toUTCString()
  }
  if (opts.ifNoneMatch) {
    headers['If-None-Match'] = opts.ifNoneMatch
  }
  
  const config: RequestConfig = {
    method: 'GET',
    url: completeURL,
    headers,
    timeout: normalizeTimeout(opts.timeout),
    signal: opts.signal
  }
  
  // Execute with retry logic
  const result = await executeWithRetry<T>(config, opts)
  
  // Cache successful results
  if (Result.isOk(result) && cacheConfig.enabled) {
    setCachedResult(cacheKey, result.value, cacheConfig)
  }
  
  return result
}

/**
 * POST method - Create resources
 */
export const post = async <TData = unknown, TResponse = unknown>(
  url: string,
  data?: TData,
  options: PostOptions = {}
): Promise<ServiceResult<TResponse>> => {
  const opts = mergeOptions({
    timeout: 30000,
    contentType: 'json' as const
  }, options)
  
  // Prepare headers
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...opts.headers
  }
  
  // Prepare body based on content type
  let body: string | FormData | undefined
  
  if (data !== undefined) {
    if (opts.contentType === 'json') {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(data)
    } else if (opts.contentType === 'form') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      // Convert data to URLSearchParams
      const params = new URLSearchParams()
      if (typeof data === 'object' && data !== null) {
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value))
          }
        })
      }
      body = params.toString()
    } else if (opts.contentType === 'multipart') {
      // For multipart, assume data is already FormData or convert it
      if (data instanceof FormData) {
        body = data
      } else {
        const formData = new FormData()
        if (typeof data === 'object' && data !== null) {
          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              formData.append(key, String(value))
            }
          })
        }
        body = formData
      }
    } else if (opts.contentType === 'text') {
      headers['Content-Type'] = 'text/plain'
      body = String(data)
    }
  }
  
  // Add idempotency key if provided
  if (opts.idempotencyKey) {
    headers['Idempotency-Key'] = opts.idempotencyKey
  }
  
  const config: RequestConfig = {
    method: 'POST',
    url,
    headers,
    body,
    timeout: normalizeTimeout(opts.timeout),
    signal: opts.signal
  }
  
  return executeWithRetry<TResponse>(config, opts)
}

/**
 * PUT method - Update/replace resources
 */
export const put = async <TData = unknown, TResponse = unknown>(
  url: string,
  data: TData,
  options: PutOptions = {}
): Promise<ServiceResult<TResponse>> => {
  const opts = mergeOptions({
    timeout: 30000,
    merge: false
  }, options)
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...opts.headers
  }
  
  // Add concurrency control headers
  if (opts.ifMatch) {
    headers['If-Match'] = opts.ifMatch
  }
  if (opts.ifUnmodifiedSince) {
    headers['If-Unmodified-Since'] = opts.ifUnmodifiedSince.toUTCString()
  }
  
  const config: RequestConfig = {
    method: 'PUT',
    url,
    headers,
    body: JSON.stringify(data),
    timeout: normalizeTimeout(opts.timeout),
    signal: opts.signal
  }
  
  return executeWithRetry<TResponse>(config, opts)
}

/**
 * PATCH method - Partial updates
 */
export const patch = async <TData = unknown, TResponse = unknown>(
  url: string,
  data: TData,
  options: PatchOptions = {}
): Promise<ServiceResult<TResponse>> => {
  const opts = mergeOptions({
    timeout: 30000,
    strategy: 'merge' as const,
    format: 'merge-patch' as const
  }, options)
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...opts.headers
  }
  
  // Set content type based on patch format
  if (opts.format === 'json-patch') {
    headers['Content-Type'] = 'application/json-patch+json'
  } else if (opts.format === 'merge-patch') {
    headers['Content-Type'] = 'application/merge-patch+json'
  } else {
    headers['Content-Type'] = 'application/json'
  }
  
  const config: RequestConfig = {
    method: 'PATCH',
    url,
    headers,
    body: JSON.stringify(data),
    timeout: normalizeTimeout(opts.timeout),
    signal: opts.signal
  }
  
  return executeWithRetry<TResponse>(config, opts)
}

/**
 * DELETE method - Remove resources
 */
export const deleteMethod = async <TResponse = unknown>(
  url: string,
  options: DeleteOptions = {}
): Promise<ServiceResult<TResponse>> => {
  const opts = mergeOptions({
    timeout: 30000,
    soft: false,
    force: false,
    returnDeleted: false
  }, options)
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...opts.headers
  }
  
  // Add query parameters for delete options
  const deleteURL = buildURL(url, undefined, {
    ...(opts.soft && { soft: 'true' }),
    ...(opts.force && { force: 'true' }),
    ...(opts.returnDeleted && { return: 'true' })
  })
  
  const config: RequestConfig = {
    method: 'DELETE',
    url: deleteURL,
    headers,
    timeout: normalizeTimeout(opts.timeout),
    signal: opts.signal
  }
  
  return executeWithRetry<TResponse>(config, opts)
}

// Export delete with a different name to avoid keyword conflict
export { deleteMethod as delete }