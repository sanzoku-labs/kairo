/**
 * Kairo Tier 1 - Essential Foundation (15 functions)
 * 
 * Master these functions first - they enable all other patterns and workflows.
 * Perfect for beginners or teams wanting to learn Kairo progressively.
 * 
 * Usage:
 *   import { Result, schema, pipeline, resource, repository } from 'kairo/tier1'
 * 
 * Learning Path:
 *   Week 1: Foundation patterns (Result, map, match, flatMap, createError)
 *   Week 2: Data modeling (schema, repository, relationships)  
 *   Week 3: System integration (resource, resourceUtils)
 *   Week 4: Business logic (pipeline, rules)
 *   Week 5: Composition & performance (pipe, cache)
 */

// FOUNDATION LAYER - Error-safe computation patterns (5 functions)
export { Result, map, flatMap, match } from './core/result'
export { createError } from './core/errors'
export type { OkResult, ErrResult } from './core/result'

// DATA PILLAR CORE - Type-safe data handling (4 functions)
export { nativeSchema as schema } from './core/native-schema'
export { repository, hasMany, hasOne, belongsTo } from './core/repository'
export type { Schema, ValidationError, SchemaShape, InferSchema } from './core/native-schema'

// INTERFACE PILLAR CORE - External system integration (2 functions)
export { resource, resourceUtils } from './core/resource'
export type { Resource, ResourceMethod, ResourceMethods } from './core/resource'

// PROCESS PILLAR CORE - Business logic composition (3 functions)
export { pipeline, cache } from './core/pipeline'
export { rule, rules } from './core/rules'
export type { Pipeline } from './core/pipeline'
export type { Rule, Rules } from './core/rules'

// ESSENTIAL UTILITIES - Function composition (1 function)
export { pipe } from './utils/fp'