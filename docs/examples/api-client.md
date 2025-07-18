# API Client Examples

Building robust API clients with the SERVICE pillar.

## Basic API Client

```typescript
import { service, data, Result } from '@sanzoku-labs/kairo'

class UserApiClient {
  private baseUrl = 'https://api.example.com'
  private defaultConfig = {
    timeout: 10000,
    retry: { attempts: 3 },
    headers: {
      'Content-Type': 'application/json'
    }
  }
  
  async getUser(id: string) {
    return service.get(`${this.baseUrl}/users/${id}`, {
      ...this.defaultConfig,
      validate: UserSchema
    })
  }
  
  async createUser(userData: any) {
    return service.post(`${this.baseUrl}/users`, {
      ...this.defaultConfig,
      body: userData,
      validate: UserSchema
    })
  }
  
  async updateUser(id: string, userData: any) {
    return service.put(`${this.baseUrl}/users/${id}`, {
      ...this.defaultConfig,
      body: userData,
      validate: UserSchema
    })
  }
  
  async deleteUser(id: string) {
    return service.delete(`${this.baseUrl}/users/${id}`, {
      ...this.defaultConfig
    })
  }
}
```

## Advanced API Client

```typescript
class ApiClient {
  private baseUrl: string
  private authToken?: string
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }
  
  setAuthToken(token: string) {
    this.authToken = token
  }
  
  private getConfig(overrides = {}) {
    const config = {
      timeout: 10000,
      retry: { attempts: 3 },
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MyApp/1.0'
      },
      ...overrides
    }
    
    if (this.authToken) {
      config.headers['Authorization'] = `Bearer ${this.authToken}`
    }
    
    return config
  }
  
  async request(method: string, endpoint: string, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const config = this.getConfig(options)
    
    return service[method](url, config)
  }
  
  async get(endpoint: string, options = {}) {
    return this.request('get', endpoint, options)
  }
  
  async post(endpoint: string, options = {}) {
    return this.request('post', endpoint, options)
  }
  
  async put(endpoint: string, options = {}) {
    return this.request('put', endpoint, options)
  }
  
  async delete(endpoint: string, options = {}) {
    return this.request('delete', endpoint, options)
  }
}
```

## Next Steps

- [Data Processing](/examples/data-processing)
- [Common Patterns](/examples/common-patterns)
- [SERVICE Pillar](/api/service/)