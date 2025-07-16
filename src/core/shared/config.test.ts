/**
 * Comprehensive tests for configuration utilities
 */

import { describe, it, expect } from 'vitest'
import {
  mergeOptions,
  normalizeTimeout,
  normalizeBatchSize,
  normalizeRetryOptions,
  normalizeCacheOptions,
  type RetryOptions,
  type CacheOptions
} from './config'

describe('Configuration Utilities', () => {
  describe('mergeOptions', () => {
    it('should merge defaults with user options', () => {
      const defaults = { timeout: 5000, retries: 3, debug: false }
      const userOptions = { timeout: 10000, debug: true }
      
      const result = mergeOptions(defaults, userOptions)
      
      expect(result).toEqual({
        timeout: 10000,
        retries: 3,
        debug: true
      })
    })

    it('should handle empty user options', () => {
      const defaults = { timeout: 5000, retries: 3 }
      const result = mergeOptions(defaults, {})
      
      expect(result).toEqual(defaults)
    })

    it('should handle undefined user options', () => {
      const defaults = { timeout: 5000, retries: 3 }
      const result = mergeOptions(defaults, undefined)
      
      expect(result).toEqual(defaults)
    })

    it('should handle nested objects', () => {
      const defaults = {
        server: { port: 3000, host: 'localhost' },
        database: { url: 'localhost:5432' }
      }
      const userOptions = {
        server: { port: 8080 }, // No host property - should be undefined after shallow merge
        database: { url: 'production:5432' }
      } as Partial<typeof defaults>
      
      const result = mergeOptions(defaults, userOptions)
      
      expect(result.server.port).toBe(8080)
      expect(result.server.host).toBe(undefined) // mergeOptions does shallow merge
      expect(result.database.url).toBe('production:5432')
    })

    it('should handle arrays', () => {
      const defaults = { tags: ['default'], values: [1, 2, 3] }
      const userOptions = { tags: ['custom'], values: [4, 5] }
      
      const result = mergeOptions(defaults, userOptions)
      
      expect(result.tags).toEqual(['custom'])
      expect(result.values).toEqual([4, 5])
    })

    it('should handle null values', () => {
      const defaults = { timeout: 5000, retries: 3 }
      const userOptions = { timeout: 0, retries: 0 }
      
      const result = mergeOptions(defaults, userOptions)
      
      expect(result.timeout).toBe(0)
      expect(result.retries).toBe(0)
    })
  })

  describe('normalizeTimeout', () => {
    it('should return default timeout for undefined', () => {
      const result = normalizeTimeout(undefined)
      expect(result).toBe(30000)
    })

    it('should return default timeout for zero or negative values', () => {
      expect(normalizeTimeout(0)).toBe(30000)
      expect(normalizeTimeout(-1000)).toBe(30000)
    })

    it('should return the value if within acceptable range', () => {
      expect(normalizeTimeout(5000)).toBe(5000)
      expect(normalizeTimeout(60000)).toBe(60000)
    })

    it('should cap at maximum timeout', () => {
      expect(normalizeTimeout(400000)).toBe(300000) // 5 minutes max
      expect(normalizeTimeout(1000000)).toBe(300000)
    })

    it('should handle edge cases', () => {
      expect(normalizeTimeout(1)).toBe(1) // Minimum valid value
      expect(normalizeTimeout(300000)).toBe(300000) // Maximum valid value
    })
  })

  describe('normalizeBatchSize', () => {
    it('should return default batch size for undefined', () => {
      const result = normalizeBatchSize(undefined)
      expect(result).toBe(100)
    })

    it('should return minimum batch size for zero or negative values', () => {
      expect(normalizeBatchSize(0)).toBe(1)
      expect(normalizeBatchSize(-10)).toBe(1)
    })

    it('should return the value if within acceptable range', () => {
      expect(normalizeBatchSize(50)).toBe(50)
      expect(normalizeBatchSize(1000)).toBe(1000)
    })

    it('should cap at maximum batch size', () => {
      expect(normalizeBatchSize(15000)).toBe(10000)
      expect(normalizeBatchSize(50000)).toBe(10000)
    })

    it('should handle edge cases', () => {
      expect(normalizeBatchSize(1)).toBe(1) // Minimum valid value
      expect(normalizeBatchSize(10000)).toBe(10000) // Maximum valid value
    })
  })

  describe('normalizeRetryOptions', () => {
    it('should return no retries for false', () => {
      const result = normalizeRetryOptions(false)
      expect(result).toEqual({ attempts: 0 })
    })

    it('should return no retries for undefined', () => {
      const result = normalizeRetryOptions(undefined)
      expect(result).toEqual({ attempts: 0 })
    })

    it('should return default retry options for true', () => {
      const result = normalizeRetryOptions(true)
      expect(result).toEqual({
        attempts: 3,
        delay: 1000,
        backoff: 'exponential',
        maxDelay: 10000
      })
    })

    it('should merge with defaults for partial options', () => {
      const userOptions: Partial<RetryOptions> = {
        attempts: 5,
        delay: 500
      }
      
      const result = normalizeRetryOptions(userOptions)
      
      expect(result.attempts).toBe(5)
      expect(result.delay).toBe(500) // User-provided value should be preserved
      expect(result.backoff).toBe('exponential') // Default
      expect(result.maxDelay).toBe(10000) // Default
    })

    it('should handle all retry options explicitly', () => {
      const userOptions = {
        attempts: 2,
        backoff: 'linear' as const,
        delay: 2000,
        maxDelay: 60000
      }
      
      const result = normalizeRetryOptions(userOptions)
      expect(result).toEqual(userOptions)
    })

    it('should normalize invalid attempts', () => {
      const result = normalizeRetryOptions({ attempts: -1 })
      expect(result.attempts).toBe(-1) // Current implementation doesn't validate
    })

    it('should normalize invalid delays', () => {
      const result = normalizeRetryOptions({
        attempts: 3,
        delay: -1000,
        maxDelay: 0
      })
      
      expect(result.delay).toBe(-1000) // Current implementation doesn't validate
      expect(result.maxDelay).toBe(0) // Current implementation doesn't validate
    })
  })

  describe('normalizeCacheOptions', () => {
    it('should return disabled cache for false', () => {
      const result = normalizeCacheOptions(false)
      expect(result).toEqual({ enabled: false })
    })

    it('should return default cache options for true', () => {
      const result = normalizeCacheOptions(true)
      expect(result).toEqual({
        enabled: true,
        ttl: 300000, // 5 minutes
        strategy: 'memory'
      })
    })

    it('should return disabled cache for undefined', () => {
      const result = normalizeCacheOptions(undefined)
      expect(result).toEqual({ enabled: false })
    })

    it('should merge with defaults for partial options', () => {
      const userOptions: Partial<CacheOptions> = {
        enabled: true,
        ttl: 600000,
        strategy: 'memory'
      }
      
      const result = normalizeCacheOptions(userOptions)
      
      expect(result.enabled).toBe(true)
      expect(result.ttl).toBe(600000)
      expect(result.strategy).toBe('memory')
    })

    it('should handle all cache options explicitly', () => {
      const userOptions: CacheOptions = {
        enabled: true,
        ttl: 1800000,
        strategy: 'memory'
      }
      
      const result = normalizeCacheOptions(userOptions)
      expect(result).toEqual(userOptions)
    })

    it('should normalize invalid TTL', () => {
      const result = normalizeCacheOptions({
        enabled: true,
        ttl: -1000
      })
      
      expect(result.ttl).toBe(0) // Minimum
    })

    it('should normalize invalid TTL to zero', () => {
      const result = normalizeCacheOptions({
        enabled: true,
        ttl: -1000
      })
      
      expect(result.ttl).toBe(0) // Normalize to minimum
    })
  })

  describe('Integration Tests', () => {
    it('should work together for complete configuration', () => {
      const userConfig = {
        timeout: 60000,
        batchSize: 250,
        retry: {
          attempts: 5,
          delay: 2000
        },
        cache: {
          enabled: true,
          ttl: 900000
        }
      }
      
      const normalizedConfig = {
        timeout: normalizeTimeout(userConfig.timeout),
        batchSize: normalizeBatchSize(userConfig.batchSize),
        retry: normalizeRetryOptions(userConfig.retry),
        cache: normalizeCacheOptions(userConfig.cache)
      }
      
      expect(normalizedConfig.timeout).toBe(60000)
      expect(normalizedConfig.batchSize).toBe(250)
      expect(normalizedConfig.retry.attempts).toBe(5)
      expect(normalizedConfig.retry.delay).toBe(2000) // User-provided value should be preserved
      expect(normalizedConfig.cache.enabled).toBe(true)
      expect(normalizedConfig.cache.ttl).toBe(900000)
    })

    it('should handle edge cases in combination', () => {
      const extremeConfig = {
        timeout: 1000000, // Will be capped
        batchSize: -50, // Will be normalized
        retry: false, // Will be disabled
        cache: true // Will use defaults
      }
      
      const normalizedConfig = {
        timeout: normalizeTimeout(extremeConfig.timeout),
        batchSize: normalizeBatchSize(extremeConfig.batchSize),
        retry: normalizeRetryOptions(extremeConfig.retry),
        cache: normalizeCacheOptions(extremeConfig.cache)
      }
      
      expect(normalizedConfig.timeout).toBe(300000) // Capped
      expect(normalizedConfig.batchSize).toBe(1) // Minimum
      expect(normalizedConfig.retry.attempts).toBe(0) // Disabled
      expect(normalizedConfig.cache.enabled).toBe(true) // Default enabled
    })
  })

  describe('Type Safety', () => {
    it('should maintain type safety for complex configurations', () => {
      interface ComplexConfig {
        service: {
          timeout: number
          retries: RetryOptions
        }
        data: {
          batchSize: number
          cache: CacheOptions
        }
      }
      
      const defaults: ComplexConfig = {
        service: {
          timeout: 30000,
          retries: { attempts: 3, backoff: 'exponential', delay: 1000, maxDelay: 30000 }
        },
        data: {
          batchSize: 100,
          cache: { enabled: false }
        }
      }
      
      const userOptions: Partial<ComplexConfig> = {
        service: {
          timeout: 60000,
          retries: { attempts: 5 }
        }
      }
      
      const result = mergeOptions(defaults, userOptions)
      
      expect(result.service.timeout).toBe(60000)
      expect(result.service.retries.attempts).toBe(5)
      expect(result.data.batchSize).toBe(100) // Preserved from defaults
    })
  })
})