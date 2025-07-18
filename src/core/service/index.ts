/**
 * SERVICE Pillar - HTTP-only API Integration
 *
 * The SERVICE pillar provides essential HTTP operations:
 * - 5 core methods for HTTP operations
 * - 4 public utilities for URL handling and error management
 * - Configuration object pattern (no method chaining)
 * - Built with strategic component reuse
 */

// Core HTTP Methods (5 methods)
import { get, post, put, patch, delete as deleteMethod } from './methods'
export { get, post, put, patch, deleteMethod }

// Public Utilities (4 utilities)
import { buildURL, parseURL, isServiceError, isRetryable } from './utils'
export { buildURL, parseURL, isServiceError, isRetryable }

// Types and Interfaces
export type {
  ServiceBaseOptions,
  GetOptions,
  PostOptions,
  PutOptions,
  PatchOptions,
  DeleteOptions,
  ServiceResult,
  HttpMethod,
  ServiceResponse,
} from './types'

// Error Types
export type { ServiceError, ServiceHttpError, ServiceNetworkError } from '../shared'

/**
 * SERVICE Pillar API
 *
 * All SERVICE methods follow the same pattern:
 * service.method(url, data?, options?) -> Promise<Result<ServiceError, T>>
 *
 * @example
 * ```typescript
 * // Simple usage (smart defaults)
 * const users = await service.get('/users')
 *
 * // With configuration
 * const users = await service.get('/users', {
 *   params: { page: 1, limit: 10 },
 *   cache: true,
 *   retry: { attempts: 3 },
 *   timeout: 5000
 * })
 *
 * // Error handling
 * if (Result.isErr(users)) {
 *   if (service.isRetryable(users.error)) {
 *     // Handle retryable error
 *   }
 * }
 * ```
 */
export const service = {
  // Core HTTP methods
  get,
  post,
  put,
  patch,
  delete: deleteMethod,

  // Public utilities
  buildURL,
  parseURL,
  isError: isServiceError,
  isRetryable,
} as const

// Default export for convenient usage
export default service
