/**
 * Kairo Configuration System
 *
 * Implements the configuration object pattern for all pillars.
 * Follows "smart defaults, rich configuration" principle with progressive enhancement.
 */

import type { Schema } from './schema'

/**
 * Base configuration options shared across all Kairo methods
 */
export interface BaseOptions {
  // Execution control
  async?: boolean // Force async execution
  timeout?: number // Operation timeout in milliseconds

  // Error handling
  fallback?: unknown // Fallback value on error
  continueOnError?: boolean // Continue processing despite errors

  // Performance
  parallel?: boolean // Enable parallel processing
  batchSize?: number // Batch size for large datasets

  // Debugging and observability
  debug?: boolean // Enable debug mode
  trace?: string // Tracing identifier for debugging
}

/**
 * Validation configuration options
 */
export interface ValidationOptions extends BaseOptions {
  strict?: boolean // Strict validation mode
  coerce?: boolean // Enable type coercion
  stripUnknown?: boolean // Remove unknown properties
  abortEarly?: boolean // Stop on first validation error
  maxErrors?: number // Maximum number of errors to collect
}

/**
 * Caching configuration options
 */
export interface CacheOptions {
  enabled?: boolean // Enable caching
  ttl?: number // Time to live in milliseconds
  strategy?: 'memory' | 'localStorage' | 'sessionStorage' | 'custom'
  key?: string | ((input: unknown) => string) // Cache key
  tags?: string[] // Cache invalidation tags
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  attempts?: number // Maximum retry attempts
  delay?: number // Delay between retries (ms)
  backoff?: 'linear' | 'exponential' | 'fixed'
  maxDelay?: number // Maximum delay cap
  retryOn?: (error: unknown) => boolean // Custom retry condition
}

/**
 * Transform configuration options
 */
export interface TransformOptions extends BaseOptions {
  preserveOriginal?: boolean // Keep original structure
  deepTransform?: boolean // Transform nested objects
  defaultValues?: Record<string, unknown> // Default values for missing fields
}

/**
 * Progress tracking configuration
 */
export interface ProgressOptions {
  enabled?: boolean
  onProgress?: (completed: number, total: number, current?: unknown) => void
  reportInterval?: number // Report progress every N items
}

/**
 * Schema validation configuration
 */
export interface SchemaValidationOptions {
  schema?: Schema<unknown>
  validate?: boolean
  coerce?: boolean
  strict?: boolean
}

/**
 * Configuration utility functions
 */
export const mergeOptions = <T>(defaults: T, userOptions: Partial<T> = {} as Partial<T>): T =>
  ({
    ...defaults,
    ...userOptions,
  }) as T

/**
 * Normalize timeout value to safe bounds
 * @param timeout - Timeout in milliseconds
 * @returns Normalized timeout between 0 and 300000ms
 */
export const normalizeTimeout = (timeout?: number): number => {
  if (timeout === undefined) return 30000 // 30 second default
  if (timeout <= 0) return 30000
  return Math.min(timeout, 300000) // 5 minute maximum
}

/**
 * Normalize batch size to safe bounds
 * @param batchSize - Batch size for operations
 * @returns Normalized batch size between 1 and 10000
 */
export const normalizeBatchSize = (batchSize?: number): number => {
  if (batchSize === undefined) return 100 // Default batch size
  if (batchSize <= 0) return 1
  return Math.min(batchSize, 10000) // Maximum batch size
}

/**
 * Normalize retry options to standardized format
 * @param retry - Retry configuration (boolean or RetryOptions)
 * @returns Normalized retry options
 */
export const normalizeRetryOptions = (retry?: boolean | RetryOptions): RetryOptions => {
  if (retry === false || retry === undefined) {
    return { attempts: 0 }
  }

  if (retry === true) {
    return {
      attempts: 3,
      delay: 1000,
      backoff: 'exponential',
      maxDelay: 10000,
    }
  }

  return {
    attempts: retry.attempts ?? 3,
    delay: retry.delay ?? 1000, // Use provided delay or default to 1000ms
    backoff: retry.backoff ?? 'exponential',
    maxDelay: retry.maxDelay ?? 10000,
    ...(retry.retryOn && { retryOn: retry.retryOn }),
  }
}

export const normalizeCacheOptions = (cache?: boolean | CacheOptions): CacheOptions => {
  if (cache === false || cache === undefined) {
    return { enabled: false }
  }

  if (cache === true) {
    return {
      enabled: true,
      ttl: 300000, // 5 minutes default
      strategy: 'memory',
    }
  }

  return {
    enabled: cache.enabled ?? true,
    ttl: Math.max(cache.ttl ?? 300000, 0), // Minimum TTL of 0
    strategy: cache.strategy ?? 'memory',
    ...(cache.key && { key: cache.key }),
    ...(cache.tags && { tags: cache.tags }),
  }
}
