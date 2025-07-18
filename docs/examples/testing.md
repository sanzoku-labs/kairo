# Testing Strategies

Testing patterns and strategies for Kairo applications.

## Unit Testing

```typescript
describe('User Service', () => {
  it('should fetch users successfully', async () => {
    const result = await service.get('/api/users')
    
    expect(result).toHaveProperty('tag')
    expect(['Ok', 'Err']).toContain(result.tag)
    
    if (Result.isOk(result)) {
      expect(Array.isArray(result.value)).toBe(true)
    }
  })
  
  it('should handle errors gracefully', async () => {
    const result = await service.get('/api/nonexistent')
    
    if (Result.isErr(result)) {
      expect(result.error).toHaveProperty('code')
      expect(result.error.code).toBe('SERVICE_HTTP_ERROR')
    }
  })
})
```

## Schema Testing

```typescript
describe('User Schema', () => {
  it('should validate valid user data', () => {
    const validUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      active: true
    }
    
    const result = data.validate(validUser, UserSchema)
    expect(Result.isOk(result)).toBe(true)
  })
  
  it('should reject invalid user data', () => {
    const invalidUser = {
      id: 'invalid-uuid',
      name: 'J', // Too short
      email: 'invalid-email',
      age: -1 // Negative age
    }
    
    const result = data.validate(invalidUser, UserSchema)
    expect(Result.isErr(result)).toBe(true)
  })
})
```

## Pipeline Testing

```typescript
describe('Data Processing Pipeline', () => {
  it('should process data correctly', () => {
    const inputData = [
      { name: 'John', active: true },
      { name: 'Jane', active: false },
      { name: 'Bob', active: true }
    ]
    
    const result = pipeline.compose([
      data => pipeline.filter(data, item => item.active),
      data => pipeline.map(data, item => item.name.toUpperCase())
    ])(inputData)
    
    if (Result.isOk(result)) {
      expect(result.value).toEqual(['JOHN', 'BOB'])
    }
  })
})
```

## Integration Testing

```typescript
describe('Full Workflow Integration', () => {
  it('should handle complete user workflow', async () => {
    // Create user
    const createResult = await service.post('/api/users', {
      body: { name: 'Test User', email: 'test@example.com' }
    })
    
    expect(Result.isOk(createResult)).toBe(true)
    
    if (Result.isOk(createResult)) {
      const userId = createResult.value.id
      
      // Fetch user
      const fetchResult = await service.get(`/api/users/${userId}`)
      expect(Result.isOk(fetchResult)).toBe(true)
      
      // Update user
      const updateResult = await service.put(`/api/users/${userId}`, {
        body: { name: 'Updated User' }
      })
      expect(Result.isOk(updateResult)).toBe(true)
      
      // Delete user
      const deleteResult = await service.delete(`/api/users/${userId}`)
      expect(Result.isOk(deleteResult)).toBe(true)
    }
  })
})
```

## Mocking

```typescript
// Mock service responses
const mockService = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}

// Mock successful response
mockService.get.mockResolvedValue(Result.Ok([
  { id: '1', name: 'John', email: 'john@example.com' }
]))

// Mock error response
mockService.get.mockResolvedValue(Result.Err({
  code: 'SERVICE_HTTP_ERROR',
  message: 'Not found',
  status: 404
}))
```

## Next Steps

- [Performance Optimization](/examples/performance)
- [Error Recovery](/examples/error-recovery)
- [Common Patterns](/examples/common-patterns)