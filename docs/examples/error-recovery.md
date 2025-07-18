# Error Recovery

Error recovery patterns and techniques with Kairo.

## Fallback Strategies

```typescript
const fetchWithFallback = async (url: string) => {
  // Try primary endpoint
  const result = await service.get(url)
  
  if (Result.isOk(result)) {
    return result
  }
  
  // Try fallback endpoint
  const fallbackResult = await service.get(`${url}/fallback`)
  
  if (Result.isOk(fallbackResult)) {
    return fallbackResult
  }
  
  // Return cached data
  return getCachedData(url)
}
```

## Retry with Exponential Backoff

```typescript
const retryWithBackoff = async (operation: () => Promise<Result<any, any>>) => {
  let attempt = 0
  const maxAttempts = 3
  
  while (attempt < maxAttempts) {
    const result = await operation()
    
    if (Result.isOk(result)) {
      return result
    }
    
    attempt++
    if (attempt < maxAttempts) {
      const delay = Math.pow(2, attempt) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return Result.Err({ code: 'MAX_RETRIES_EXCEEDED' })
}
```

## Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0
  private state = 'CLOSED'
  private lastFailureTime = 0
  
  async execute(operation: () => Promise<Result<any, any>>) {
    if (this.state === 'OPEN') {
      return Result.Err({ code: 'CIRCUIT_BREAKER_OPEN' })
    }
    
    const result = await operation()
    
    if (Result.isOk(result)) {
      this.onSuccess()
    } else {
      this.onFailure()
    }
    
    return result
  }
  
  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }
  
  private onFailure() {
    this.failures++
    if (this.failures >= 5) {
      this.state = 'OPEN'
      this.lastFailureTime = Date.now()
    }
  }
}
```

## Next Steps

- [Performance Optimization](/examples/performance)
- [Testing Strategies](/examples/testing)
- [Error Handling Guide](/guide/error-handling)