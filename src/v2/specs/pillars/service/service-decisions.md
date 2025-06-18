# SERVICE Pillar Decision Points

> **Decisions needed for SERVICE pillar implementation (HTTP-only API integration)**

## Overview

The SERVICE pillar handles all HTTP communication with external APIs. These decisions will shape how developers interact with APIs through Kairo V2.

## **Phase 2 Decision Checkpoint** 
*These decisions must be made before starting SERVICE pillar implementation (Weeks 5-8)*

---

## **1. Authentication Strategy** 🔐

### **Decision Required**
How should SERVICE handle authentication across different auth patterns?

### **Options**
```typescript
// Option A: Configuration-based auth
const result = await service.get('/api/users', {
  auth: {
    type: 'bearer',
    token: 'jwt-token'
  }
})

// Option B: Global auth configuration
service.configure({
  auth: { 
    type: 'bearer',
    token: () => getStoredToken()
  }
})

// Option C: Auth middleware approach
const authedService = service.withAuth('bearer', token)
const result = await authedService.get('/api/users')
```

### **Questions to Answer**
- Do you typically use JWT tokens, API keys, or session-based auth?
- Should auth be per-request, globally configured, or both?
- How do you handle token refresh in your current applications?
- Do you need support for multiple auth schemes in the same app?

### **Decision Status**: ⏳ Pending

---

## **2. Error Handling Granularity** ❌

### **Decision Required**
What level of HTTP error detail should SERVICE provide?

### **Options**
```typescript
// Option A: Simple error categories
type ServiceError = {
  code: 'SERVICE_ERROR'
  category: 'network' | 'client' | 'server' | 'timeout'
  message: string
}

// Option B: Detailed HTTP error info
type ServiceError = {
  code: 'SERVICE_ERROR'
  httpStatus: number
  httpStatusText: string
  requestUrl: string
  responseHeaders: Headers
  networkError?: boolean
  timeout?: boolean
}

// Option C: Structured error codes
type ServiceError = {
  code: 'NETWORK_ERROR' | 'CLIENT_ERROR' | 'SERVER_ERROR' | 'TIMEOUT_ERROR'
  details: { status?: number, url: string, message: string }
}
```

### **Questions to Answer**
- How much HTTP detail do your error handlers typically need?
- Do you need access to response headers for debugging?
- Should errors differentiate between 4xx and 5xx responses?
- Do you have specific retry logic based on HTTP status codes?

### **Decision Status**: ⏳ Pending

---

## **3. Caching Strategy** 💾

### **Decision Required**
What caching capabilities should SERVICE provide out of the box?

### **Options**
```typescript
// Option A: Simple TTL cache
const result = await service.get('/api/config', {
  cache: { ttl: 300000 } // 5 minutes
})

// Option B: Advanced cache control
const result = await service.get('/api/data', {
  cache: {
    ttl: 300000,
    key: 'custom-cache-key',
    staleWhileRevalidate: true,
    maxStale: 60000
  }
})

// Option C: HTTP-aware caching
const result = await service.get('/api/users', {
  cache: {
    respectHttpHeaders: true, // Use Cache-Control, ETag, etc.
    fallbackTtl: 300000
  }
})
```

### **Questions to Answer**
- Do your APIs provide proper Cache-Control headers?
- Do you need custom cache keys for parameterized requests?
- Should caching be in-memory only or support persistence?
- Do you need cache invalidation patterns?

### **Decision Status**: ⏳ Pending

---

## **4. Request/Response Transformation** 🔄

### **Decision Required**
Should SERVICE provide built-in data transformation capabilities?

### **Options**
```typescript
// Option A: No transformation (keep SERVICE focused)
const result = await service.get('/api/users')
// Transform with DATA pillar: data.transform(result.value, UserSchema)

// Option B: Request/response transforms
const result = await service.get('/api/users', {
  transformRequest: (data) => ({ query: data }),
  transformResponse: (data) => data.users
})

// Option C: Schema-driven transformation
const result = await service.get('/api/users', {
  validate: UserSchema,
  transform: {
    'user_name': 'name',
    'email_address': 'email'
  }
})
```

### **Questions to Answer**
- Do your APIs have consistent response formats?
- Do you frequently need to rename fields from API responses?
- Should transformation be SERVICE concern or DATA pillar concern?
- Do you need request body transformation for POST/PUT requests?

### **Decision Status**: ⏳ Pending

---

## **5. URL Construction Patterns** 🔗

### **Decision Required**
How should SERVICE handle URL building and parameterization?

### **Options**
```typescript
// Option A: String URLs only
const result = await service.get('/api/users/123')
const result2 = await service.get(`/api/users/${userId}`)

// Option B: Template URLs
const result = await service.get('/api/users/{id}', {
  params: { id: 123 }
})

// Option C: URL builder pattern
const result = await service.get('/api/users', {
  pathParams: { id: 123 },      // /api/users/123
  queryParams: { active: true }  // ?active=true
})
```

### **Questions to Answer**
- Do you prefer template strings or parameter objects?
- How do you typically handle query parameters?
- Do you need automatic URL encoding for special characters?
- Should SERVICE validate required path parameters?

### **Decision Status**: ⏳ Pending

---

## **6. Retry Logic Configuration** 🔄

### **Decision Required**
What retry strategies should SERVICE support by default?

### **Options**
```typescript
// Option A: Simple retry count
const result = await service.get('/api/data', {
  retry: { attempts: 3, delay: 1000 }
})

// Option B: Advanced retry strategies
const result = await service.get('/api/data', {
  retry: {
    attempts: 3,
    strategy: 'exponential', // exponential, linear, fixed
    baseDelay: 1000,
    maxDelay: 10000,
    retryOn: [408, 429, 503, 504]
  }
})

// Option C: Custom retry functions
const result = await service.get('/api/data', {
  retry: {
    shouldRetry: (error, attempt) => attempt < 3 && error.networkError,
    getDelay: (attempt) => Math.pow(2, attempt) * 1000
  }
})
```

### **Questions to Answer**
- What types of failures do you typically retry in your apps?
- Do you need different retry strategies for different endpoints?
- Should retries be based on HTTP status codes or error types?
- Do your APIs have rate limiting that affects retry strategy?

### **Decision Status**: ⏳ Pending

---

## **7. File Upload Handling** 📁

### **Decision Required**
Should SERVICE include file upload capabilities in V2.0?

### **Options**
```typescript
// Option A: Basic FormData support
const result = await service.post('/api/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

// Option B: Upload helpers
const result = await service.upload('/api/files', {
  file: fileBlob,
  metadata: { description: 'User avatar' },
  onProgress: (progress) => console.log(`${progress}%`)
})

// Option C: Defer to V2.1 (keep V2.0 focused)
// File uploads handled by external libraries
```

### **Questions to Answer**
- Do your applications frequently upload files?
- Do you need upload progress tracking?
- Are file uploads critical for V2.0 or can they wait for V2.1?
- Should SERVICE handle file validation or leave that to DATA pillar?

### **Decision Status**: ⏳ Pending

---

## **Implementation Impact**

### **High Impact Decisions** (affect API design)
- Authentication strategy
- Error handling granularity  
- URL construction patterns

### **Medium Impact Decisions** (affect configuration options)
- Caching strategy
- Request/response transformation
- Retry logic configuration

### **Low Impact Decisions** (affect feature scope)
- File upload handling

---

## **Decision Timeline**

**Target Date**: Before Week 5 (SERVICE implementation start)
**Review Process**: Architecture review with team
**Documentation**: Update service-methods.md with chosen patterns

---

## **Next Steps After Decisions**

1. Update `service-methods.md` with chosen patterns
2. Update `service-options.md` with configuration details
3. Create implementation tasks in `implementation-strategy.md`
4. Begin SERVICE pillar development

---

**Remember**: These decisions will affect how thousands of developers interact with APIs through Kairo V2. Choose patterns that are predictable, consistent, and align with modern TypeScript best practices.