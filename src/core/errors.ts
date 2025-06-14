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
