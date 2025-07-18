# Migrating from Axios

A comprehensive guide to migrating from Axios to Kairo's SERVICE pillar.

## Why Migrate?

While Axios is a great HTTP client, Kairo provides:

- **Built-in Result pattern** - No more try/catch blocks
- **Schema validation** - Automatic response validation
- **Configuration objects** - No method chaining
- **Consistent error handling** - Structured error types
- **TypeScript-first** - Better type safety and inference

## Quick Migration

### Before (Axios)

```javascript
import axios from 'axios'

try {
  const response = await axios.get('/api/users', {
    timeout: 5000,
    headers: { 'Authorization': 'Bearer token' }
  })
  console.log(response.data)
} catch (error) {
  console.error('Error:', error.message)
}
```

### After (Kairo)

```typescript
import { service, Result } from 'kairo'

const result = await service.get('/api/users', {
  timeout: 5000,
  headers: { 'Authorization': 'Bearer token' }
})

Result.match(result, {
  Ok: data => console.log(data),
  Err: error => console.error('Error:', error.message)
})
```

## Method Mapping

### GET Requests

```typescript
// Axios
const response = await axios.get('/api/users')

// Kairo
const result = await service.get('/api/users')
```

### POST Requests

```typescript
// Axios
const response = await axios.post('/api/users', { name: 'John' })

// Kairo
const result = await service.post('/api/users', {
  body: { name: 'John' }
})
```

### PUT Requests

```typescript
// Axios
const response = await axios.put('/api/users/123', { name: 'John' })

// Kairo
const result = await service.put('/api/users/123', {
  body: { name: 'John' }
})
```

### DELETE Requests

```typescript
// Axios
const response = await axios.delete('/api/users/123')

// Kairo
const result = await service.delete('/api/users/123')
```

### PATCH Requests

```typescript
// Axios
const response = await axios.patch('/api/users/123', { name: 'John' })

// Kairo
const result = await service.patch('/api/users/123', {
  body: { name: 'John' }
})
```

## Configuration Migration

### Request Configuration

```typescript
// Axios
const axiosConfig = {
  timeout: 5000,
  headers: { 'Authorization': 'Bearer token' },
  params: { page: 1, limit: 10 }
}

// Kairo
const kairoConfig = {
  timeout: 5000,
  headers: { 'Authorization': 'Bearer token' },
  params: { page: 1, limit: 10 }
}
```

### Interceptors → Middleware

```typescript
// Axios Interceptors
axios.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${getToken()}`
  return config
})

// Kairo Middleware (configuration pattern)
const authConfig = {
  headers: { 'Authorization': `Bearer ${getToken()}` }
}

const result = await service.get('/api/users', authConfig)
```

## Error Handling Migration

### Axios Error Handling

```typescript
// Axios
try {
  const response = await axios.get('/api/users')
  return response.data
} catch (error) {
  if (error.response) {
    // Server responded with error status
    console.error('Status:', error.response.status)
    console.error('Data:', error.response.data)
  } else if (error.request) {
    // Network error
    console.error('Network error:', error.message)
  } else {
    // Other error
    console.error('Error:', error.message)
  }
  throw error
}
```

### Kairo Error Handling

```typescript
// Kairo
const result = await service.get('/api/users')

Result.match(result, {
  Ok: data => data,
  Err: error => {
    switch (error.code) {
      case 'SERVICE_HTTP_ERROR':
        console.error('HTTP Error:', error.status, error.message)
        break
      case 'SERVICE_NETWORK_ERROR':
        console.error('Network Error:', error.message)
        break
      case 'SERVICE_TIMEOUT_ERROR':
        console.error('Timeout Error:', error.message)
        break
      default:
        console.error('Unknown Error:', error.message)
    }
    return null
  }
})
```

## Advanced Features

### Response Validation

```typescript
// Axios (manual validation)
const response = await axios.get('/api/users')
const users = response.data

// Manual validation
if (!Array.isArray(users)) {
  throw new Error('Expected array of users')
}

// Kairo (automatic validation)
const UserSchema = data.schema({
  id: { type: 'string' },
  name: { type: 'string' },
  email: { type: 'string', format: 'email' }
})

const result = await service.get('/api/users', {
  validate: data.schema({
    users: { type: 'array', items: UserSchema }
  })
})
```

### Retry Logic

```typescript
// Axios (using axios-retry)
import axiosRetry from 'axios-retry'

axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay
})

// Kairo (built-in)
const result = await service.get('/api/users', {
  retry: {
    attempts: 3,
    delay: 1000,
    exponential: true
  }
})
```

### Request Cancellation

```typescript
// Axios
const controller = new AbortController()
const response = await axios.get('/api/users', {
  signal: controller.signal
})

// Later...
controller.abort()

// Kairo
const result = await service.get('/api/users', {
  signal: controller.signal
})
```

## Instance Migration

### Axios Instance

```typescript
// Axios
const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' }
})

// Add interceptor
apiClient.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${getToken()}`
  return config
})
```

### Kairo Service Pattern

```typescript
// Kairo
const createApiClient = (baseConfig = {}) => {
  const defaultConfig = {
    timeout: 5000,
    headers: { 'Content-Type': 'application/json' },
    ...baseConfig
  }

  return {
    get: (url: string, config = {}) => service.get(url, { ...defaultConfig, ...config }),
    post: (url: string, config = {}) => service.post(url, { ...defaultConfig, ...config }),
    put: (url: string, config = {}) => service.put(url, { ...defaultConfig, ...config }),
    delete: (url: string, config = {}) => service.delete(url, { ...defaultConfig, ...config }),
    patch: (url: string, config = {}) => service.patch(url, { ...defaultConfig, ...config })
  }
}

const apiClient = createApiClient({
  headers: { 'Authorization': `Bearer ${getToken()}` }
})
```

## Complete Migration Example

### Before: Axios-based User Service

```typescript
import axios from 'axios'

class UserService {
  private client = axios.create({
    baseURL: 'https://api.example.com',
    timeout: 5000
  })

  constructor() {
    this.client.interceptors.request.use(config => {
      config.headers.Authorization = `Bearer ${this.getToken()}`
      return config
    })
  }

  async getUsers(): Promise<User[]> {
    try {
      const response = await this.client.get('/users')
      return response.data
    } catch (error) {
      throw new Error(`Failed to get users: ${error.message}`)
    }
  }

  async createUser(userData: CreateUserData): Promise<User> {
    try {
      const response = await this.client.post('/users', userData)
      return response.data
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`)
    }
  }

  private getToken(): string {
    return localStorage.getItem('token') || ''
  }
}
```

### After: Kairo-based User Service

```typescript
import { service, data, Result } from 'kairo'

const UserSchema = data.schema({
  id: { type: 'string' },
  name: { type: 'string' },
  email: { type: 'string', format: 'email' },
  createdAt: { type: 'string', format: 'date-time' }
})

const CreateUserSchema = data.schema({
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' }
})

class UserService {
  private getBaseConfig() {
    return {
      timeout: 5000,
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    }
  }

  async getUsers(): Promise<Result<ServiceError, User[]>> {
    return service.get('/users', {
      ...this.getBaseConfig(),
      validate: data.schema({
        users: { type: 'array', items: UserSchema }
      })
    })
  }

  async createUser(userData: CreateUserData): Promise<Result<ServiceError, User>> {
    return service.post('/users', {
      ...this.getBaseConfig(),
      body: userData,
      validate: UserSchema
    })
  }

  private getToken(): string {
    return localStorage.getItem('token') || ''
  }
}

// Usage
const userService = new UserService()

const result = await userService.getUsers()
Result.match(result, {
  Ok: users => console.log('Users:', users),
  Err: error => console.error('Error:', error.message)
})
```

## Migration Checklist

- [ ] Replace axios imports with kairo service
- [ ] Update method calls to use configuration objects
- [ ] Replace try/catch with Result pattern
- [ ] Add schema validation for responses
- [ ] Update error handling to use structured errors
- [ ] Replace interceptors with configuration patterns
- [ ] Add retry logic using built-in configuration
- [ ] Update TypeScript types for Result pattern

## Common Migration Patterns

### 1. API Client Factory

```typescript
// Create reusable API client
const createApiClient = (baseURL: string, authToken?: string) => {
  const baseConfig = {
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    }
  }

  return {
    get: (endpoint: string, config = {}) => 
      service.get(`${baseURL}${endpoint}`, { ...baseConfig, ...config }),
    post: (endpoint: string, config = {}) => 
      service.post(`${baseURL}${endpoint}`, { ...baseConfig, ...config }),
    // ... other methods
  }
}
```

### 2. Error Recovery

```typescript
// Axios with manual retry
const retryableRequest = async (config: any, retries = 3): Promise<any> => {
  try {
    return await axios(config)
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return retryableRequest(config, retries - 1)
    }
    throw error
  }
}

// Kairo with built-in retry
const result = await service.get('/api/data', {
  retry: { attempts: 3, delay: 1000 }
})
```

### 3. Response Transformation

```typescript
// Axios with manual transformation
const response = await axios.get('/api/users')
const transformedData = response.data.map(user => ({
  ...user,
  fullName: `${user.firstName} ${user.lastName}`
}))

// Kairo with pipeline integration
const result = await service.get('/api/users')
if (Result.isOk(result)) {
  const transformed = pipeline.map(result.value, user => ({
    ...user,
    fullName: `${user.firstName} ${user.lastName}`
  }))
}
```

## Next Steps

- [Common Patterns](/examples/common-patterns)
- [Service Configuration](/api/service/config)
- [Error Handling Guide](/guide/error-handling)