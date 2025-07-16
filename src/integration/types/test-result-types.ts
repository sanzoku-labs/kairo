/**
 * TypeScript interfaces for integration test result types
 * 
 * These interfaces provide proper typing for test result objects
 * to eliminate 'any' types and improve type safety.
 */

// Core interfaces for test results
export interface TestResult<T = unknown> {
  success: boolean
  error?: string | null
  data?: T
}

export interface BatchProcessingResult<T = unknown> {
  totalChunks: number
  processedCount: number
  results: T[]
}

export interface ValidationResult<T = unknown> {
  index: number
  success: boolean
  error: string | null
  data: T | null
}

export interface DataNormalizationResult<T = unknown> {
  totalRecords: number
  validRecords: number
  uniqueRecords: number
  data: T[]
}

export interface SynchronizationResult<T = unknown> {
  totalUpdates: number
  successCount: number
  conflictCount: number
  results: T[]
}

export interface CircuitBreakerResult<T = unknown> {
  totalEndpoints: number
  validResponses: number
  users: T[]
}

export interface EmptyDataResult {
  inputCount: number
  processedCount: number
  aggregation: Record<string, unknown>
}

export interface LargeDataResult<T = unknown> {
  totalBatches: number
  batchResults: T[]
  totalProcessed: number
}

export interface PipelineResult<T = unknown> {
  originalData: T[]
  processedResults: (T | null)[]
  successCount: number
  errorCount: number
}

export interface RetryResult<T = unknown> {
  result: T
  totalAttempts: number
  retrySuccessful: boolean
}

export interface FallbackResult<T = unknown> {
  dataSource: string
  userCount: number
  users: T[]
  fallbackUsed: boolean
}

export interface DegradationResult<T = unknown> {
  userCount: number
  users: T[]
  enhancementAvailable: boolean
  enhancementError: string | null
  operationMode: 'degraded' | 'full'
}

export interface ValidationError {
  message: string
  code: string
  fieldPath?: string
  issues?: unknown[]
  timestamp: number
}

export interface DebugResult {
  totalProcessed: number
  successfulValidations: number
  failedValidations: number
  detailedErrors: Array<{
    userIndex: number
    errorMessage?: string
    errorCode?: string
    fieldPath?: string
    issueCount: number
    timestamp?: number
  }>
}

export interface ErrorPropagationResult<T = unknown> {
  source: 'api' | 'fallback'
  serviceError: unknown
  validatedData: T
}

export interface ValidationErrorResult<T = unknown> {
  totalUsers: number
  validUsers: ValidationResult<T>[]
  invalidUsers: ValidationResult<T>[]
  errorSummary: Array<{
    index: number
    error: string | null
  }>
}

// User-specific interfaces
export interface User {
  id: number
  name: string
  email: string
  active: boolean
  department: string
  salary: number
  joinDate: string
  skills: string[]
  performance: number
  region: string
}

export interface TransformedUser {
  id: number
  name: string
  email: string
  age: number
  status: string
  profile: {
    initials: string
    emailDomain: string
  }
}

export interface MigratedUser {
  id: number
  name: string
  email: string
  version: number
  profile: unknown
  settings: unknown
}

export interface UserProcessingResult {
  totalUsers: number
  validUsers: ValidationResult<User>[]
  invalidUsers: ValidationResult<User>[]
  errorSummary: Array<{
    index: number
    error: string | null
  }>
}

// Service-specific interfaces
export interface ServiceResponse<T = unknown> {
  data: T
  status: number
  headers?: Record<string, string>
}

export interface ApiEndpointResult<T = unknown> {
  endpoint: string
  success: boolean
  data?: T
  error?: string
}

// Schema integration result types
export interface SchemaValidationResult<T = unknown> {
  totalUsers: number
  validUsers: number
  users: T[]
}

export interface SchemaErrorResult<T = unknown> {
  totalUsers: number
  validUsers: T[]
  invalidUsers: T[]
  errorSummary: Array<{
    index: number
    errorCount: number
    message: string
  }>
}

export interface SchemaTransformResult<T = unknown> {
  inputCount: number
  validOutputCount: number
  transformedUsers: T[]
}

export interface SchemaMigrationResult<T = unknown> {
  totalUsers: number
  v1Users: number
  v2Users: number
  migratedUsers: number
  finalUsers: T[]
}

export interface SchemaContractResult<T = unknown> {
  totalEndpoints: number
  validResponses: number
  users: T[]
}

// Utility type for Result unwrapping
export type UnwrapResult<T> = T extends { value: infer U } ? U : T