/**
 * Kairo Configuration System
 *
 * Implements the configuration object pattern for all pillars.
 * Follows "smart defaults, rich configuration" principle with progressive enhancement.
 */

import type { Schema } from './schema'
// Enhanced fp-utils integration for configuration utilities
import { cond } from '../../fp-utils/control'
import { merge } from '../../fp-utils/object'
import { isNil } from '../../fp-utils/logic'

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
 * Configuration utility functions with enhanced functional programming patterns
 */
export const mergeOptions = <T>(defaults: T, userOptions: Partial<T> = {} as Partial<T>): T => {
  // Use fp-utils merge for functional approach
  return merge(defaults as object, userOptions as object) as T
}

/**
 * Normalize timeout value to safe bounds
 * @param timeout - Timeout in milliseconds
 * @returns Normalized timeout between 0 and 300000ms
 */
export const normalizeTimeout = (timeout?: number): number => {
  // Use functional approach with cond for cleaner logic
  const timeoutNormalizer = cond([
    [(val: number | undefined): boolean => isNil(val), (): number => 30000], // 30 second default
    [(val: number | undefined): boolean => (val as number) <= 0, (): number => 30000],
    [(val: number | undefined): boolean => (val as number) > 300000, (): number => 300000], // 5 minute maximum
    [(): boolean => true, (val: number | undefined): number => val as number] // Return as-is if valid
  ])
  
  return timeoutNormalizer(timeout) ?? 30000
}

/**
 * Normalize batch size to safe bounds
 * @param batchSize - Batch size for operations
 * @returns Normalized batch size between 1 and 10000
 */
export const normalizeBatchSize = (batchSize?: number): number => {
  // Use functional approach with cond for cleaner normalization logic
  const batchNormalizer = cond([
    [(val: number | undefined): boolean => isNil(val), (): number => 100], // Default batch size
    [(val: number | undefined): boolean => (val as number) <= 0, (): number => 1], // Minimum batch size
    [(val: number | undefined): boolean => (val as number) > 10000, (): number => 10000], // Maximum batch size
    [(): boolean => true, (val: number | undefined): number => val as number] // Return as-is if valid
  ])
  
  return batchNormalizer(batchSize) ?? 100
}

/**
 * Normalize retry options to standardized format
 * @param retry - Retry configuration (boolean or RetryOptions)
 * @returns Normalized retry options
 */
export const normalizeRetryOptions = (retry?: boolean | RetryOptions): RetryOptions => {
  // Use functional pattern matching for different retry configurations
  const retryNormalizer = cond([
    [(val: boolean | RetryOptions | undefined): boolean => val === false || isNil(val), 
     (): RetryOptions => ({ attempts: 0 })],
    [(val: boolean | RetryOptions | undefined): boolean => val === true,
     (): RetryOptions => ({
       attempts: 3,
       delay: 1000,
       backoff: 'exponential',
       maxDelay: 10000,
     })],
    [(): boolean => true, (val: boolean | RetryOptions | undefined): RetryOptions => {
      const retryOptions = val as RetryOptions
      return {
        attempts: retryOptions.attempts ?? 3,
        delay: retryOptions.delay ?? 1000,
        backoff: retryOptions.backoff ?? 'exponential',
        maxDelay: retryOptions.maxDelay ?? 10000,
        ...(retryOptions.retryOn && { retryOn: retryOptions.retryOn }),
      }
    }]
  ])
  
  return retryNormalizer(retry) ?? { attempts: 0 }
}

export const normalizeCacheOptions = (cache?: boolean | CacheOptions): CacheOptions => {
  // Use functional pattern matching for cache configuration normalization
  const cacheNormalizer = cond([
    [(val: boolean | CacheOptions | undefined): boolean => val === false || isNil(val),
     (): CacheOptions => ({ enabled: false })],
    [(val: boolean | CacheOptions | undefined): boolean => val === true,
     (): CacheOptions => ({
       enabled: true,
       ttl: 300000, // 5 minutes default
       strategy: 'memory',
     })],
    [(): boolean => true, (val: boolean | CacheOptions | undefined): CacheOptions => {
      const cacheOptions = val as CacheOptions
      return {
        enabled: cacheOptions.enabled ?? true,
        ttl: Math.max(cacheOptions.ttl ?? 300000, 0), // Minimum TTL of 0
        strategy: cacheOptions.strategy ?? 'memory',
        ...(cacheOptions.key && { key: cacheOptions.key }),
        ...(cacheOptions.tags && { tags: cacheOptions.tags }),
      }
    }]
  ])
  
  return cacheNormalizer(cache) ?? { enabled: false }
}
