export { Result, map, flatMap, mapError, match, chain } from './core/result'
export type { OkResult, ErrResult } from './core/result'

export { pipeline, tracing } from './core/pipeline'
export type {
  Pipeline,
  HttpError,
  NetworkError,
  TimeoutError,
  TraceEntry,
  TraceFilter,
  TraceData,
  TraceCollector,
} from './core/pipeline'

export { createSignal, signal, signalEffect } from './core/signal'
export type { Signal, SignalError, SignalSubscription } from './core/signal'

export { schema } from './core/schema'
export type { Schema, ValidationError } from './core/schema'

export {
  createError,
  chainError,
  isKairoError,
  getErrorChain,
  serializeError,
  findErrorByCode,
  hasErrorCode,
} from './core/errors'
export type { KairoError, ErrorWithCause } from './core/errors'

// Export functional utilities
export * from './utils/fp'
