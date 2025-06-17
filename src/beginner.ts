/**
 * Kairo Beginner - Gentle Introduction (5 functions)
 * 
 * Start here if you're new to Kairo or functional programming.
 * Introduces core concepts without overwhelming complexity.
 * 
 * Usage:
 *   import { Result, schema, pipeline } from 'kairo/beginner'
 * 
 * Learning sequence:
 *   1. Result - Learn safe error handling
 *   2. schema - Learn data validation  
 *   3. pipeline - Learn data processing
 *   4. map - Learn data transformation
 *   5. match - Learn result handling
 * 
 * Next steps:
 *   After mastering these, move to 'kairo/tier1' for complete foundation
 */

// Start with Result pattern for safe computation
export { Result } from './core/result'

// Add schema for data validation
export { nativeSchema as schema } from './core/native-schema'

// Add pipeline for data processing
export { pipeline } from './core/pipeline'

// Add map for transformation
export { map } from './core/result'

// Add match for result handling
export { match } from './core/result'

// Essential types for beginners
export type { OkResult, ErrResult } from './core/result'
export type { Schema, ValidationError } from './core/native-schema'
export type { Pipeline } from './core/pipeline'