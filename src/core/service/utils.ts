/**
 * SERVICE Pillar Utilities
 * 
 * Public utility functions for SERVICE pillar following V2 specifications.
 * These utilities can be used within SERVICE methods and by users.
 */

import { Result } from '../shared'
import { ServiceError, ServiceHttpError, createServiceError, createServiceHttpError } from '../shared'
import { ServiceResponse } from './types'

/**
 * Builds URLs with query parameters
 * 
 * @param base - Base URL
 * @param path - Optional path to append
 * @param params - Optional query parameters
 * @returns Complete URL with parameters
 */
export const buildURL = (
  base: string,
  path?: string,
  params?: Record<string, unknown>
): string => {
  let url = base
  
  // Append path if provided
  if (path) {
    // Ensure base doesn't end with / and path doesn't start with /
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    url = cleanBase + cleanPath
  }
  
  // Append query parameters if provided
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    
    const queryString = searchParams.toString()
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString
    }
  }
  
  return url
}

/**
 * Parses URLs into components
 * 
 * @param url - URL to parse
 * @returns URL components
 */
export const parseURL = (url: string): {
  base: string
  path: string
  params: Record<string, string>
  hash?: string
} => {
  try {
    const parsed = new URL(url)
    const params: Record<string, string> = {}
    
    // Extract query parameters
    parsed.searchParams.forEach((value, key) => {
      params[key] = value
    })
    
    const result: {
      base: string
      path: string
      params: Record<string, string>
      hash?: string
    } = {
      base: `${parsed.protocol}//${parsed.host}`,
      path: parsed.pathname,
      params
    }
    
    if (parsed.hash) {
      result.hash = parsed.hash.slice(1)
    }
    
    return result
  } catch (error) {
    throw createServiceError(
      'parseURL',
      `Invalid URL: ${url}`,
      { url, error }
    )
  }
}

/**
 * Type guard for service errors
 * 
 * @param error - Error to check
 * @returns True if error is a ServiceError
 */
export const isServiceError = (error: unknown): error is ServiceError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'pillar' in error &&
    (error as any).pillar === 'SERVICE'
  )
}

/**
 * Determines if an error should trigger retry
 * 
 * @param error - Error to check
 * @returns True if error is retryable
 */
export const isRetryable = (error: ServiceError): boolean => {
  // Network errors are generally retryable
  if (error.code === 'SERVICE_NETWORK_ERROR') {
    return true
  }
  
  // HTTP errors - only certain status codes are retryable
  if (error.code === 'SERVICE_HTTP_ERROR') {
    const httpError = error as ServiceHttpError
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504]
    return retryableStatusCodes.includes(httpError.status)
  }
  
  // Other service errors are generally not retryable
  return false
}

/**
 * Parses and validates HTTP responses
 * 
 * @param response - Fetch Response object
 * @param expectedSchema - Optional schema for validation
 * @returns Parsed response data
 */
export const parseResponse = async <T = unknown>(
  response: Response,
  expectedSchema?: any  // Using any temporarily, will be proper Schema<T> once schema integration is complete
): Promise<Result<ServiceError, ServiceResponse<T>>> => {
  try {
    // Check if response is ok
    if (!response.ok) {
      return Result.error(createServiceHttpError(
        'parseResponse',
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response.statusText,
        response.url
      ))
    }
    
    // Parse response body based on content type
    const contentType = response.headers.get('content-type') || ''
    let data: T
    
    if (contentType.includes('application/json')) {
      data = await response.json()
    } else if (contentType.includes('text/')) {
      data = await response.text() as T
    } else {
      // For binary data, return as blob
      data = await response.blob() as T
    }
    
    // TODO: Add schema validation when schema integration is complete
    // if (expectedSchema) {
    //   const validation = schema.validate(data, expectedSchema)
    //   if (Result.isError(validation)) {
    //     return Result.error(createServiceError(
    //       'parseResponse', 
    //       'Response validation failed',
    //       { validation: validation.error }
    //     ))
    //   }
    // }
    
    // Extract headers
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })
    
    return Result.ok({
      data,
      status: response.status,
      statusText: response.statusText,
      headers,
      url: response.url
    })
    
  } catch (error) {
    return Result.error(createServiceError(
      'parseResponse',
      'Failed to parse response',
      { error, url: response.url }
    ))
  }
}

/**
 * Extracts specific headers from response
 * 
 * @param response - ServiceResponse object
 * @param keys - Header keys to extract
 * @returns Extracted headers
 */
export const extractHeaders = (
  response: ServiceResponse,
  keys?: string[]
): Record<string, string> => {
  if (!keys) {
    return response.headers
  }
  
  const extracted: Record<string, string> = {}
  keys.forEach(key => {
    const lowerKey = key.toLowerCase()
    const value = response.headers[lowerKey] || response.headers[key]
    if (value) {
      extracted[key] = value
    }
  })
  
  return extracted
}