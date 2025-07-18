# Common Patterns

Frequently used patterns and best practices with Kairo.

## API Client Pattern

```typescript
class ApiClient {
  private baseUrl = 'https://api.example.com'
  private timeout = 10000
  
  async getUsers() {
    return service.get(`${this.baseUrl}/users`, {
      timeout: this.timeout,
      retry: { attempts: 3 }
    })
  }
  
  async createUser(userData: any) {
    return service.post(`${this.baseUrl}/users`, {
      body: userData,
      timeout: this.timeout,
      validate: UserSchema
    })
  }
}
```

## Data Processing Pipeline

```typescript
const processData = pipeline.compose([
  data => pipeline.validate(data, InputSchema),
  data => pipeline.filter(data, item => item.active),
  data => pipeline.map(data, item => transformItem(item)),
  data => data.aggregate(data, { groupBy: ['category'] })
])
```

## Error Handling Pattern

```typescript
const handleResult = <T>(result: Result<any, T>) => {
  return Result.match(result, {
    Ok: data => {
      console.log('Success:', data)
      return data
    },
    Err: error => {
      console.error('Error:', error.message)
      return null
    }
  })
}
```

## Next Steps

- [API Client Examples](/examples/api-client)
- [Data Processing](/examples/data-processing)
- [Advanced Patterns](/examples/performance)