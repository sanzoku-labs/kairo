export interface KairoError {
  code: string
  message: string
  timestamp: number
  context: Record<string, unknown>
  cause?: KairoError
  trace?: string[]
}

export interface ErrorWithCause<T extends KairoError> extends KairoError {
  cause?: T
}

export const createError = <T extends KairoError>(
  code: string,
  message: string,
  context: Record<string, unknown> = {},
  cause?: KairoError
): T =>
  ({
    code,
    message,
    timestamp: Date.now(),
    context,
    cause,
    trace: cause?.trace ? [...cause.trace, code] : [code],
  }) as T

export const chainError = <T extends KairoError, U extends KairoError>(
  newError: T,
  cause: U
): T => ({
  ...newError,
  timestamp: Date.now(),
  context: newError.context || {},
  cause,
  trace: cause.trace ? [...cause.trace, newError.code] : [newError.code],
})

export const isKairoError = (error: unknown): error is KairoError =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  'message' in error &&
  'timestamp' in error

export const getErrorChain = (error: KairoError): KairoError[] => {
  const chain: KairoError[] = [error]
  let current = error.cause

  while (current) {
    chain.push(current)
    current = current.cause
  }

  return chain
}

export const serializeError = (error: KairoError): Record<string, unknown> => ({
  code: error.code,
  message: error.message,
  timestamp: error.timestamp,
  context: error.context,
  trace: error.trace,
  cause: error.cause ? serializeError(error.cause) : undefined,
})

export const findErrorByCode = (error: KairoError, code: string): KairoError | undefined => {
  const chain = getErrorChain(error)
  return chain.find(err => err.code === code)
}

export const hasErrorCode = (error: KairoError, code: string): boolean =>
  Boolean(findErrorByCode(error, code))

// ============================================================================
// V2 Pillar-Specific Error Types
// ============================================================================

/**
 * Base error type for SERVICE pillar operations
 */
export interface ServiceError extends KairoError {
  code: 'SERVICE_ERROR'
  pillar: 'SERVICE'
  operation: string
}

/**
 * HTTP-specific error for SERVICE pillar
 */
export interface ServiceHttpError extends ServiceError {
  code: 'SERVICE_HTTP_ERROR'
  status: number
  statusText: string
  url: string
}

/**
 * Network-specific error for SERVICE pillar
 */
export interface ServiceNetworkError extends ServiceError {
  code: 'SERVICE_NETWORK_ERROR'
  url: string
  timeout?: number
}

/**
 * Base error type for DATA pillar operations
 */
export interface DataError extends KairoError {
  code: 'DATA_ERROR'
  pillar: 'DATA'
  operation: string
}

/**
 * Validation-specific error for DATA pillar
 */
export interface DataValidationError extends DataError {
  code: 'DATA_VALIDATION_ERROR'
  field?: string
  value?: unknown
  constraint?: string
}

/**
 * Transformation-specific error for DATA pillar
 */
export interface DataTransformError extends DataError {
  code: 'DATA_TRANSFORM_ERROR'
  source?: string
  target?: string
}

/**
 * Aggregation-specific error for DATA pillar
 */
export interface DataAggregateError extends DataError {
  code: 'DATA_AGGREGATE_ERROR'
  operation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'groupBy' | 'custom'
}

/**
 * Base error type for PIPELINE pillar operations
 */
export interface PipelineError extends KairoError {
  code: 'PIPELINE_ERROR'
  pillar: 'PIPELINE'
  operation: string
}

/**
 * Composition-specific error for PIPELINE pillar
 */
export interface PipelineCompositionError extends PipelineError {
  code: 'PIPELINE_COMPOSITION_ERROR'
  step?: number
  stepName?: string
}

/**
 * Validation-specific error for PIPELINE pillar
 */
export interface PipelineValidationError extends PipelineError {
  code: 'PIPELINE_VALIDATION_ERROR'
  rule?: string
  value?: unknown
}

/**
 * Union type of all V2 pillar errors
 */
export type V2Error = 
  | ServiceError 
  | ServiceHttpError 
  | ServiceNetworkError
  | DataError 
  | DataValidationError 
  | DataTransformError 
  | DataAggregateError
  | PipelineError 
  | PipelineCompositionError 
  | PipelineValidationError

// ============================================================================
// V2 Error Factory Functions
// ============================================================================

/**
 * Error factory functions for each pillar
 */
export const createServiceError = (
  operation: string,
  message: string,
  context: Record<string, unknown> = {}
): ServiceError => ({
  code: 'SERVICE_ERROR',
  pillar: 'SERVICE',
  operation,
  message,
  timestamp: Date.now(),
  context
})

export const createServiceHttpError = (
  operation: string,
  message: string,
  status: number,
  statusText: string,
  url: string,
  context: Record<string, unknown> = {}
): ServiceHttpError => ({
  code: 'SERVICE_HTTP_ERROR',
  pillar: 'SERVICE',
  operation,
  message,
  status,
  statusText,
  url,
  timestamp: Date.now(),
  context
})

export const createDataError = (
  operation: string,
  message: string,
  context: Record<string, unknown> = {}
): DataError => ({
  code: 'DATA_ERROR',
  pillar: 'DATA',
  operation,
  message,
  timestamp: Date.now(),
  context
})

export const createDataValidationError = (
  operation: string,
  message: string,
  field?: string,
  value?: unknown,
  constraint?: string,
  context: Record<string, unknown> = {}
): DataValidationError => ({
  code: 'DATA_VALIDATION_ERROR',
  pillar: 'DATA',
  operation,
  message,
  field,
  value,
  constraint,
  timestamp: Date.now(),
  context
})

export const createPipelineError = (
  operation: string,
  message: string,
  context: Record<string, unknown> = {}
): PipelineError => ({
  code: 'PIPELINE_ERROR',
  pillar: 'PIPELINE',
  operation,
  message,
  timestamp: Date.now(),
  context
})

export const createPipelineCompositionError = (
  operation: string,
  message: string,
  step?: number,
  stepName?: string,
  context: Record<string, unknown> = {}
): PipelineCompositionError => ({
  code: 'PIPELINE_COMPOSITION_ERROR',
  pillar: 'PIPELINE',
  operation,
  message,
  step,
  stepName,
  timestamp: Date.now(),
  context
})
