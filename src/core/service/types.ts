/**
 * SERVICE Pillar Types
 * 
 * Type definitions for the SERVICE pillar following V2 specifications.
 * Implements HTTP-only operations with configuration object pattern.
 */

import { Result, Schema } from '../shared'
import { ServiceError, ServiceHttpError, ServiceNetworkError } from '../shared'
import { BaseOptions, CacheOptions, RetryOptions, ValidationOptions } from '../shared'

/**
 * Base options for all SERVICE methods
 */
export interface ServiceBaseOptions extends BaseOptions, ValidationOptions {
  // Request configuration
  headers?: Record<string, string>
  timeout?: number
  signal?: AbortSignal
  
  // Response handling
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer'
  
  // Caching
  cache?: boolean | CacheOptions
  
  // Retry logic
  retry?: boolean | RetryOptions
}

/**
 * GET method specific options
 */
export interface GetOptions extends ServiceBaseOptions {
  // Query parameters
  params?: Record<string, unknown>
  
  // Conditional requests
  ifModifiedSince?: Date
  ifNoneMatch?: string
}

/**
 * POST method specific options
 */
export interface PostOptions extends ServiceBaseOptions {
  // Content handling
  contentType?: 'json' | 'form' | 'multipart' | 'text'
  
  // Request validation
  validateRequest?: Schema<unknown>
  
  // Idempotency
  idempotencyKey?: string
}

/**
 * PUT method specific options
 */
export interface PutOptions extends ServiceBaseOptions {
  // Update strategy
  merge?: boolean          // Merge with existing vs replace
  upsert?: boolean         // Create if doesn't exist
  
  // Concurrency control
  ifMatch?: string         // ETag for optimistic locking
  ifUnmodifiedSince?: Date
}

/**
 * PATCH method specific options
 */
export interface PatchOptions extends ServiceBaseOptions {
  // Merge strategy
  strategy?: 'merge' | 'replace' | 'remove'
  deep?: boolean           // Deep merge for nested objects
  
  // Patch format
  format?: 'merge-patch' | 'json-patch' | 'strategic-merge'
}

/**
 * DELETE method specific options
 */
export interface DeleteOptions extends ServiceBaseOptions {
  // Deletion strategy
  soft?: boolean           // Soft delete vs hard delete
  force?: boolean          // Force delete (bypass confirmations)
  
  // Return data
  returnDeleted?: boolean  // Return deleted resource
  
  // Confirmation
  confirm?: boolean | string  // Require confirmation
}

/**
 * SERVICE method result types
 */
export type ServiceResult<T> = Result<ServiceError | ServiceHttpError | ServiceNetworkError, T>

/**
 * HTTP method type
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Request configuration for internal use
 */
export interface RequestConfig {
  method: HttpMethod
  url: string
  headers: Record<string, string>
  body?: string | FormData | ArrayBuffer
  timeout: number
  signal?: AbortSignal
}

/**
 * Response wrapper for internal use
 */
export interface ServiceResponse<T = unknown> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  url: string
}