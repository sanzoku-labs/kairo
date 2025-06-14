export { Result, map, flatMap, mapError, match, chain } from './core/result'
export type { OkResult, ErrResult } from './core/result'

export { pipeline } from './core/pipeline'
export type { Pipeline, HttpError, TraceEntry } from './core/pipeline'

export { schema } from './core/schema'
export type { Schema, ValidationError } from './core/schema'

// Export functional utilities
export * from './utils/fp'