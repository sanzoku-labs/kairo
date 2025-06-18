# Error Handling Strategy

> **Comprehensive error handling using Result patterns across Kairo V2's three-pillar architecture**

## Overview

Kairo V2 uses the Result pattern for all error handling, eliminating exceptions and providing explicit, type-safe error management. This document defines how errors are handled within and across the three pillars.

## Core Error Handling Principles

### **1. No Exceptions, Only Results**
```typescript
// V2: Everything returns Result<Error, Value>
const users = await service.get('/users')          // Result<ServiceError, User[]>
const valid = data.validate(users, UserSchema)     // Result<ValidationError, User[]>  
const processed = pipeline.map(valid, transform)   // Result<PipelineError, ProcessedUser[]>

// Never throws - always returns Result
if (Result.isOk(users)) {
  // Safe to access users.value
} else {
  // Handle users.error
}
```

### **2. Pillar-Specific Error Types**
```typescript
// Each pillar has specific error types
type ServiceError = {
  code: 'SERVICE_ERROR'
  operation: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'batch' | 'stream'
  httpStatus?: number
  url?: string
  timeout?: boolean
  networkError?: boolean
}

type ValidationError = {
  code: 'VALIDATION_ERROR'
  field?: string
  expected?: string
  actual?: unknown
  fieldPath: string[]
  issues: ValidationIssue[]
}

type PipelineError = {
  code: 'PIPELINE_ERROR'
  operation: 'map' | 'filter' | 'reduce' | 'compose' | 'branch' | 'parallel'
  step?: number
  itemIndex?: number
  cause?: unknown
}
```

### **3. Error Context and Traceability**
```typescript
// Rich error context for debugging
const error: ServiceError = {
  code: 'SERVICE_ERROR',
  operation: 'get',
  message: 'Request timeout after 5000ms',
  httpStatus: undefined,
  url: '/api/users',
  timeout: true,
  networkError: false,
  context: {
    requestId: 'req_123',
    timestamp: '2024-01-15T10:30:00Z',
    retryAttempt: 2,
    options: { timeout: 5000, retry: { attempts: 3 } }
  }
}
```

## Pillar-Specific Error Handling

### **SERVICE Pillar Errors**

#### **HTTP Error Categories**
```typescript
interface ServiceError extends KairoError {
  code: 'SERVICE_ERROR'
  operation: ServiceOperation
  
  // HTTP-specific context
  httpStatus?: number
  url?: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  
  // Error categories
  timeout?: boolean
  networkError?: boolean
  serverError?: boolean
  clientError?: boolean
  
  // Request context
  requestId?: string
  headers?: Record<string, string>
  body?: unknown
}

type ServiceOperation = 
  | 'get' | 'post' | 'put' | 'patch' | 'delete'
  | 'batch' | 'stream' | 'upload'
  | 'configure' | 'create'
```

#### **SERVICE Error Examples**
```typescript
// Network timeout
const timeoutError: ServiceError = {
  code: 'SERVICE_ERROR',
  operation: 'get',
  message: 'Request timeout after 5000ms',
  timeout: true,
  url: '/api/users',
  context: { timeoutMs: 5000 }
}

// HTTP error response
const httpError: ServiceError = {
  code: 'SERVICE_ERROR', 
  operation: 'post',
  message: 'Validation failed',
  httpStatus: 400,
  clientError: true,
  url: '/api/users',
  context: { 
    responseBody: { errors: ['Email required'] }
  }
}

// Network connection error
const networkError: ServiceError = {
  code: 'SERVICE_ERROR',
  operation: 'get', 
  message: 'Network unreachable',
  networkError: true,
  url: '/api/users',
  context: { 
    cause: 'ENOTFOUND' 
  }
}
```

### **DATA Pillar Errors**

#### **Validation Error Structure**
```typescript
interface ValidationError extends KairoError {
  code: 'VALIDATION_ERROR'
  field?: string
  expected?: string
  actual?: unknown
  fieldPath: string[]
  issues: ValidationIssue[]
}

interface ValidationIssue {
  path: (string | number)[]
  message: string
  code: string
  expected?: string
  received?: string
}
```

#### **DATA Error Examples**
```typescript
// Single field validation error
const fieldError: ValidationError = {
  code: 'VALIDATION_ERROR',
  message: 'Email validation failed',
  field: 'email',
  expected: 'valid email format',
  actual: 'invalid-email',
  fieldPath: ['user', 'email'],
  issues: [{
    path: ['user', 'email'],
    message: 'Invalid email format',
    code: 'invalid_email',
    expected: 'email',
    received: 'string'
  }]
}

// Multiple validation errors
const multipleErrors: ValidationError = {
  code: 'VALIDATION_ERROR',
  message: 'Multiple validation failures',
  fieldPath: [],
  issues: [
    {
      path: ['name'],
      message: 'Name is required',
      code: 'required',
      expected: 'string',
      received: 'undefined'
    },
    {
      path: ['age'],
      message: 'Age must be a positive number',
      code: 'min_value',
      expected: 'number >= 0',
      received: 'number'
    }
  ]
}

// Schema transformation error
const transformError: ValidationError = {
  code: 'VALIDATION_ERROR',
  message: 'Schema transformation failed',
  fieldPath: ['user'],
  issues: [{
    path: ['user', 'birthDate'],
    message: 'Cannot convert string to Date',
    code: 'transform_failed',
    expected: 'Date',
    received: 'string'
  }]
}
```

### **PIPELINE Pillar Errors**

#### **Pipeline Error Structure**
```typescript
interface PipelineError extends KairoError {
  code: 'PIPELINE_ERROR'
  operation: PipelineOperation
  step?: number
  itemIndex?: number
  cause?: unknown
}

type PipelineOperation = 
  | 'map' | 'filter' | 'reduce' | 'flatMap'
  | 'compose' | 'chain' 
  | 'branch' | 'parallel' | 'retry'
  | 'validate' | 'guard'
  | 'tap' | 'delay' | 'chunk' | 'stream'
```

#### **PIPELINE Error Examples**
```typescript
// Map operation error
const mapError: PipelineError = {
  code: 'PIPELINE_ERROR',
  operation: 'map',
  message: 'Transform function failed on item 3',
  itemIndex: 3,
  cause: new Error('Division by zero'),
  context: {
    totalItems: 10,
    processedItems: 3,
    failedItem: { id: 'item_3', value: 0 }
  }
}

// Composition step error
const composeError: PipelineError = {
  code: 'PIPELINE_ERROR',
  operation: 'compose',
  message: 'Composition failed at step 2',
  step: 2,
  cause: 'Validation failed',
  context: {
    totalSteps: 4,
    completedSteps: 1,
    stepName: 'validateUser'
  }
}

// Parallel processing error
const parallelError: PipelineError = {
  code: 'PIPELINE_ERROR',
  operation: 'parallel',
  message: '3 out of 10 parallel operations failed',
  context: {
    totalOperations: 10,
    successfulOperations: 7,
    failedOperations: 3,
    failures: [
      { index: 2, error: 'Timeout' },
      { index: 5, error: 'Validation failed' },
      { index: 8, error: 'Network error' }
    ]
  }
}
```

## Error Propagation Patterns

### **1. Automatic Error Propagation**
```typescript
// Errors propagate automatically through compositions
const processUser = async (userId: string): Promise<Result<KairoError, ProcessedUser>> => {
  const userResult = await service.get(`/users/${userId}`)
  if (Result.isErr(userResult)) {
    return userResult // ServiceError propagates
  }
  
  const validatedResult = data.validate(userResult.value, UserSchema)
  if (Result.isErr(validatedResult)) {
    return validatedResult // ValidationError propagates
  }
  
  const processedResult = pipeline.map([validatedResult.value], enrichUser)
  if (Result.isErr(processedResult)) {
    return processedResult // PipelineError propagates
  }
  
  return Result.Ok(processedResult.value[0])
}
```

### **2. Error Context Enrichment**
```typescript
// Add context as errors propagate
const enrichError = <E extends KairoError>(error: E, context: Record<string, unknown>): E => {
  return {
    ...error,
    context: { ...error.context, ...context }
  }
}

const processWithContext = async (data: unknown) => {
  const result = await service.get('/process', { body: data })
  
  if (Result.isErr(result)) {
    // Enrich with processing context
    return Result.Err(enrichError(result.error, {
      operation: 'processWithContext',
      inputData: data,
      timestamp: Date.now()
    }))
  }
  
  return result
}
```

### **3. Error Transformation**
```typescript
// Transform errors between contexts
const transformError = (error: KairoError, newContext: string): KairoError => {
  return {
    ...error,
    message: `[${newContext}] ${error.message}`,
    context: {
      ...error.context,
      transformedIn: newContext,
      originalError: error
    }
  }
}

const userWorkflow = async (userId: string) => {
  const result = await processUser(userId)
  
  if (Result.isErr(result)) {
    // Transform error for user workflow context
    return Result.Err(transformError(result.error, 'userWorkflow'))
  }
  
  return result
}
```

## Error Recovery Strategies

### **1. Fallback Values**
```typescript
// Provide default values on error
const getConfigWithFallback = async (): Promise<Result<never, Config>> => {
  const configResult = await service.get('/config')
  
  if (Result.isErr(configResult)) {
    // Use default configuration
    return Result.Ok({
      timeout: 5000,
      retries: 3,
      cache: true
    })
  }
  
  return configResult
}
```

### **2. Retry Strategies**
```typescript
// Automatic retry with exponential backoff
const retryableOperation = async <T>(
  operation: () => Promise<Result<KairoError, T>>,
  options: { attempts: number; delay: number }
): Promise<Result<KairoError, T>> => {
  let lastError: KairoError
  
  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    const result = await operation()
    
    if (Result.isOk(result)) {
      return result
    }
    
    lastError = result.error
    
    // Don't retry on client errors (4xx)
    if (result.error.code === 'SERVICE_ERROR' && 
        (result.error as ServiceError).clientError) {
      break
    }
    
    if (attempt < options.attempts) {
      await delay(options.delay * Math.pow(2, attempt - 1))
    }
  }
  
  return Result.Err({
    ...lastError,
    message: `Operation failed after ${options.attempts} attempts: ${lastError.message}`,
    context: {
      ...lastError.context,
      retryAttempts: options.attempts,
      finalAttempt: true
    }
  })
}
```

### **3. Alternative Strategies**
```typescript
// Try multiple strategies until one succeeds
const tryMultipleStrategies = async <T>(
  strategies: Array<() => Promise<Result<KairoError, T>>>
): Promise<Result<KairoError, T>> => {
  const errors: KairoError[] = []
  
  for (const strategy of strategies) {
    const result = await strategy()
    
    if (Result.isOk(result)) {
      return result
    }
    
    errors.push(result.error)
  }
  
  // All strategies failed
  return Result.Err({
    code: 'PIPELINE_ERROR',
    operation: 'branch',
    message: 'All strategies failed',
    context: {
      strategiesAttempted: strategies.length,
      errors: errors
    }
  } as PipelineError)
}

// Usage
const getUserData = () => tryMultipleStrategies([
  () => service.get('/users/current'),           // Try current user endpoint
  () => service.get('/profile'),                 // Try profile endpoint
  () => service.get('/users/me'),                // Try alternative endpoint
  () => Result.fromPromise(getCachedUser())      // Try cached data
])
```

## Error Handling Utilities

### **1. Error Type Guards**
```typescript
// Type guards for error discrimination
export const isServiceError = (error: KairoError): error is ServiceError => {
  return error.code === 'SERVICE_ERROR'
}

export const isValidationError = (error: KairoError): error is ValidationError => {
  return error.code === 'VALIDATION_ERROR'
}

export const isPipelineError = (error: KairoError): error is PipelineError => {
  return error.code === 'PIPELINE_ERROR'
}

// Usage
const handleError = (error: KairoError) => {
  if (isServiceError(error)) {
    if (error.timeout) {
      return 'Request timed out. Please try again.'
    }
    if (error.networkError) {
      return 'Network connection failed. Check your internet connection.'
    }
    if (error.httpStatus === 401) {
      return 'Authentication required. Please log in.'
    }
  }
  
  if (isValidationError(error)) {
    return `Validation failed: ${error.issues.map(i => i.message).join(', ')}`
  }
  
  if (isPipelineError(error)) {
    return `Processing failed at step ${error.step}: ${error.message}`
  }
  
  return 'An unexpected error occurred.'
}
```

### **2. Error Aggregation**
```typescript
// Collect and aggregate multiple errors
export const aggregateErrors = (errors: KairoError[]): KairoError => {
  const serviceErrors = errors.filter(isServiceError)
  const validationErrors = errors.filter(isValidationError)
  const pipelineErrors = errors.filter(isPipelineError)
  
  if (validationErrors.length > 0) {
    // Merge validation errors
    const allIssues = validationErrors.flatMap(e => e.issues)
    return {
      code: 'VALIDATION_ERROR',
      message: `${allIssues.length} validation errors`,
      fieldPath: [],
      issues: allIssues
    } as ValidationError
  }
  
  if (serviceErrors.length > 0) {
    return {
      code: 'SERVICE_ERROR',
      operation: 'batch',
      message: `${serviceErrors.length} service errors`,
      context: { errors: serviceErrors }
    } as ServiceError
  }
  
  return {
    code: 'PIPELINE_ERROR',
    operation: 'parallel',
    message: `${errors.length} operation errors`,
    context: { errors: errors }
  } as PipelineError
}
```

### **3. Error Reporting**
```typescript
// Structured error reporting
export const reportError = (error: KairoError, context?: Record<string, unknown>) => {
  const errorReport = {
    timestamp: new Date().toISOString(),
    errorCode: error.code,
    message: error.message,
    context: { ...error.context, ...context },
    
    // Add pillar-specific details
    ...(isServiceError(error) && {
      service: {
        operation: error.operation,
        url: error.url,
        httpStatus: error.httpStatus,
        timeout: error.timeout,
        networkError: error.networkError
      }
    }),
    
    ...(isValidationError(error) && {
      validation: {
        field: error.field,
        fieldPath: error.fieldPath,
        issueCount: error.issues.length,
        issues: error.issues
      }
    }),
    
    ...(isPipelineError(error) && {
      pipeline: {
        operation: error.operation,
        step: error.step,
        itemIndex: error.itemIndex
      }
    })
  }
  
  // Send to logging service
  console.error('Kairo Error:', errorReport)
  
  // Could also send to external error reporting service
  // errorReportingService.report(errorReport)
  
  return errorReport
}
```

## Testing Error Handling

### **1. Error Scenario Testing**
```typescript
// Test all error scenarios
describe('User processing error handling', () => {
  it('should handle service timeout errors', async () => {
    const mockService = {
      get: jest.fn().mockResolvedValue(Result.Err({
        code: 'SERVICE_ERROR',
        operation: 'get',
        message: 'Request timeout',
        timeout: true
      }))
    }
    
    const result = await processUser('user123')
    
    expect(Result.isErr(result)).toBe(true)
    expect(isServiceError(result.error)).toBe(true)
    expect(result.error.timeout).toBe(true)
  })
  
  it('should handle validation errors with field details', async () => {
    const invalidUser = { name: '', email: 'invalid' }
    
    const result = data.validate(invalidUser, UserSchema)
    
    expect(Result.isErr(result)).toBe(true)
    expect(isValidationError(result.error)).toBe(true)
    expect(result.error.issues).toHaveLength(2)
    expect(result.error.issues[0].path).toEqual(['name'])
    expect(result.error.issues[1].path).toEqual(['email'])
  })
})
```

### **2. Error Recovery Testing**
```typescript
// Test error recovery mechanisms
describe('Error recovery', () => {
  it('should fall back to cached data on service error', async () => {
    const mockService = {
      get: jest.fn()
        .mockResolvedValueOnce(Result.Err({ code: 'SERVICE_ERROR' }))
        .mockResolvedValueOnce(Result.Ok(cachedData))
    }
    
    const result = await getDataWithFallback()
    
    expect(Result.isOk(result)).toBe(true)
    expect(result.value).toEqual(cachedData)
    expect(mockService.get).toHaveBeenCalledTimes(2)
  })
})
```

## Best Practices

### **1. Error Message Quality**
- Provide clear, actionable error messages
- Include relevant context for debugging
- Use consistent terminology across pillars

### **2. Error Granularity**
- Create specific error types for different failure modes
- Include enough context for error recovery
- Don't over-engineer error hierarchies

### **3. Error Recovery**
- Design for graceful degradation
- Provide sensible fallbacks where possible
- Make retry strategies configurable

### **4. Error Monitoring**
- Log errors with structured context
- Include correlation IDs for tracing
- Monitor error patterns and trends

---

**Next**: See [Performance Considerations](./performance-considerations.md) for optimization strategies across error handling scenarios.