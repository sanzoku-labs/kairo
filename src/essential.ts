/**
 * Kairo Essential - Focused Core API (8 functions)
 * 
 * The absolute minimum functions needed to build Kairo applications.
 * Perfect for micro-frontends, learning, or teams wanting minimal imports.
 * 
 * Usage:
 *   import { Result, schema, pipeline, resource } from 'kairo/essential'
 * 
 * What's included:
 *   - Error handling: Result, map, match
 *   - Data validation: schema
 *   - API integration: resource
 *   - Data processing: pipeline
 *   - Function composition: pipe
 *   - Data persistence: repository
 * 
 * What's missing:
 *   - Advanced error handling (chain, mapError, createError)
 *   - Business rules (rule, rules)
 *   - Relationships (hasMany, hasOne, belongsTo)
 *   - Production features (retry, timeout, caching)
 *   - Testing utilities
 *   - Advanced FP utilities
 */

// Core foundation (3 functions)
export { Result, map, match } from './core/result'

// Essential pillars (4 functions)
export { nativeSchema as schema } from './core/native-schema'
export { resource } from './core/resource'
export { pipeline } from './core/pipeline'
export { repository } from './core/repository'

// Function composition (1 function)
export { pipe } from './utils/fp'

// Essential types
export type { OkResult, ErrResult } from './core/result'
export type { Schema, ValidationError } from './core/native-schema'
export type { Resource, ResourceMethod } from './core/resource'
export type { Pipeline } from './core/pipeline'
export type { Repository } from './core/repository'