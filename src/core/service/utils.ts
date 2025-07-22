/**
 * SERVICE Pillar Utilities
 *
 * Public utility functions for SERVICE pillar.
 * These utilities can be used within SERVICE methods and by users.
 */

import { Result, createServiceError, createServiceHttpError } from '../shared'
import type { ServiceError, ServiceHttpError, ServiceNetworkError } from '../shared'
import type { ServiceResponse } from './types'
// Functional programming utilities for data processing
import { pipe } from '../../fp-utils/basics'
import { map as fpMap, filter as fpFilter } from '../../fp-utils/array'

/**
 * Builds URLs with query parameters
 *
 * @param base - Base URL
 * @param path - Optional path to append
 * @param params - Optional query parameters
 * @returns Complete URL with parameters
 */
export const buildURL = (base: string, path?: string, params?: Record<string, unknown>): string => {
  let url = base

  // Append path if provided
  if (path) {
    // Ensure base doesn't end with / and path doesn't start with /
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    url = cleanBase + cleanPath
  }

  // Append query parameters if provided using fp-utils
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams()

    // Use functional pipeline for parameter processing
    const processParams = pipe(
      (params: Record<string, unknown>) => Object.entries(params),
      fpFilter(([, value]) => value !== undefined && value !== null),
      fpMap(([key, value]) => {
        let stringValue: string
        if (typeof value === 'object') {
          stringValue = JSON.stringify(value)
        } else if (typeof value === 'string') {
          stringValue = value
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          stringValue = value.toString()
        } else {
          // For any other type (symbol, function, etc.), convert safely
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          stringValue = String(value)
        }
        return { key, value: stringValue }
      })
    )
    
    const validParams = processParams(params)
    validParams.forEach(({ key, value }) => searchParams.append(key, value))

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
 * @returns Result with URL components or error
 */
export const parseURL = (
  url: string
): Result<
  ServiceError,
  {
    base: string
    path: string
    params: Record<string, string>
    hash?: string
  }
> => {
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
      params,
    }

    if (parsed.hash) {
      result.hash = parsed.hash.slice(1)
    }

    return Result.Ok(result)
  } catch (error) {
    return Result.Err(createServiceError('parseURL', `Invalid URL: ${url}`, { url, error }))
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
    (error as { pillar: unknown }).pillar === 'SERVICE'
  )
}

/**
 * Determines if an error should trigger retry
 *
 * @param error - Error to check
 * @returns True if error is retryable
 */
export const isRetryable = (
  error: ServiceError<'SERVICE_ERROR'> | ServiceHttpError | ServiceNetworkError
): boolean => {
  // Network errors are generally retryable
  if ('url' in error && error.code === 'SERVICE_NETWORK_ERROR') {
    return true
  }

  // HTTP errors - only certain status codes are retryable
  if ('status' in error && error.code === 'SERVICE_HTTP_ERROR') {
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504]
    return retryableStatusCodes.includes(error.status)
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
  _expectedSchema?: unknown // Unused parameter, will be proper Schema<T> once schema integration is complete
): Promise<Result<ServiceError<'SERVICE_ERROR'>, ServiceResponse<T>>> => {
  try {
    // Check if response is ok
    if (!response.ok) {
      const httpError = createServiceHttpError(
        'parseResponse',
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response.statusText,
        response.url
      )
      return Result.Err(httpError as unknown as ServiceError<'SERVICE_ERROR'>)
    }

    // Parse response body based on content type
    const contentType = response.headers.get('content-type') || ''
    let data: T

    // Parse JSON with traditional try-catch for async context
    if (contentType.includes('application/json')) {
      try {
        data = (await response.json()) as T
      } catch (jsonError) {
        return Result.Err(
          createServiceError(
            'parseResponse',
            `Failed to parse response: JSON parsing failed - ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`,
            { error: jsonError, contentType }
          )
        )
      }
    } else if (contentType.includes('text/')) {
      data = (await response.text()) as T
    } else {
      // For binary data, return as blob
      data = (await response.blob()) as T
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

    return Result.Ok({
      data,
      status: response.status,
      statusText: response.statusText,
      headers,
      url: response.url,
    })
  } catch (error) {
    return Result.Err(
      createServiceError('parseResponse', 'Failed to parse response', { error, url: response.url })
    )
  }
}

/**
 * Extracts specific headers from response using fp-utils for functional processing
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

  // Use fp-utils functional pipeline for header extraction
  const extractHeaderEntries = pipe(
    (keys: string[]) => keys,
    fpMap((key: string) => {
      const lowerKey = key.toLowerCase()
      const value = response.headers[lowerKey] || response.headers[key]
      return { key, value }
    }),
    fpFilter(({ value }) => value !== undefined && value !== null && value !== '')
  )

  const validEntries = extractHeaderEntries(keys)
  const extracted: Record<string, string> = {}
  
  validEntries.forEach(({ key, value }) => {
    if (value) {
      extracted[key] = value
    }
  })

  return extracted
}
