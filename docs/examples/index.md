# Examples

Practical examples demonstrating how to use Kairo in real-world scenarios. Learn through working code examples that you can copy and adapt for your own projects.

## Quick Start Examples

### Basic API Client

```typescript
import { service, data, Result } from '@sanzoku-labs/kairo'

// Define user schema
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  active: { type: 'boolean' }
})

// Create API client
const userApi = {
  async getUsers() {
    return service.get('/api/users', {
      timeout: 5000,
      retry: { attempts: 3 },
      validate: data.schema({
        users: { type: 'array', items: UserSchema }
      })
    })
  },
  
  async createUser(userData: any) {
    return service.post('/api/users', {
      body: userData,
      validate: UserSchema,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Usage
const result = await userApi.getUsers()
if (Result.isOk(result)) {
  console.log('Users:', result.value.users)
}
```

### Data Processing Pipeline

```typescript
import { pipeline, data, Result } from '@sanzoku-labs/kairo'

// Define processing pipeline
const dataProcessor = pipeline.compose([
  // Step 1: Validate input
  data => pipeline.validate(data, UserSchema),
  
  // Step 2: Filter active users
  data => pipeline.filter(data, user => user.active),
  
  // Step 3: Transform for display
  data => pipeline.map(data, user => ({
    ...user,
    displayName: user.name.toUpperCase(),
    status: user.active ? 'Active' : 'Inactive'
  })),
  
  // Step 4: Sort by name
  data => pipeline.map(data, users => 
    users.sort((a, b) => a.name.localeCompare(b.name))
  )
])

// Process data
const processedResult = dataProcessor(rawUserData)
if (Result.isOk(processedResult)) {
  console.log('Processed users:', processedResult.value)
}
```

### Error Handling Pattern

```typescript
import { service, Result } from '@sanzoku-labs/kairo'

const robustApiCall = async (url: string) => {
  const result = await service.get(url, {
    timeout: 5000,
    retry: { attempts: 3, delay: 1000 }
  })
  
  return Result.match(result, {
    Ok: data => {
      console.log('Success:', data)
      return data
    },
    Err: error => {
      console.error('Error:', error.message)
      
      // Provide fallback
      return { data: [], error: true }
    }
  })
}
```

## By Use Case

### 🌐 **API Integration**
Learn how to build robust API clients with proper error handling and validation.

**[View API Client Examples →](/examples/api-client)**

### 📊 **Data Processing**
Transform, validate, and aggregate data using the DATA pillar.

**[View Data Processing Examples →](/examples/data-processing)**

### 🔄 **Complex Workflows**
Compose complex business logic using the PIPELINE pillar.

**[View Workflow Examples →](/examples/workflows)**

### 🔗 **Cross-Pillar Integration**
Combine all three pillars for complete application workflows.

**[View Integration Examples →](/examples/integration)**

## By Complexity Level

### 🟢 **Basic Usage**
Simple, single-pillar examples perfect for getting started.

**[View Basic Examples →](/examples/basic-usage)**

### 🟡 **Common Patterns**
Frequently used patterns and best practices.

**[View Common Patterns →](/examples/common-patterns)**

### 🔴 **Advanced Patterns**
Complex scenarios with error recovery and performance optimization.

**[View Advanced Examples →](/examples/performance)**

## Featured Examples

### E-commerce Product Catalog

```typescript
import { service, data, pipeline, Result } from '@sanzoku-labs/kairo'

// Product schema
const ProductSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 1, max: 200 },
  price: { type: 'number', min: 0 },
  category: { type: 'string' },
  inStock: { type: 'boolean' },
  rating: { type: 'number', min: 0, max: 5 }
})

// Product service
const productService = {
  async getProducts(category?: string) {
    return service.get('/api/products', {
      params: category ? { category } : {},
      timeout: 5000,
      cache: { enabled: true, ttl: 300 },
      validate: data.schema({
        products: { type: 'array', items: ProductSchema }
      })
    })
  }
}

// Product processor
const productProcessor = pipeline.compose([
  // Filter in-stock products
  products => pipeline.filter(products, p => p.inStock),
  
  // Sort by rating
  products => pipeline.map(products, list => 
    list.sort((a, b) => b.rating - a.rating)
  ),
  
  // Add computed fields
  products => pipeline.map(products, p => ({
    ...p,
    priceRange: p.price < 50 ? 'Budget' : p.price < 200 ? 'Mid' : 'Premium',
    isHighRated: p.rating >= 4.0
  }))
])

// Usage
const result = await productService.getProducts('electronics')
if (Result.isOk(result)) {
  const processedProducts = productProcessor(result.value.products)
  if (Result.isOk(processedProducts)) {
    console.log('Featured products:', processedProducts.value)
  }
}
```

### User Analytics Dashboard

```typescript
import { service, data, pipeline, Result } from '@sanzoku-labs/kairo'

// Analytics data processor
const analyticsProcessor = pipeline.compose([
  // Fetch user data
  async () => service.get('/api/users/analytics', {
    timeout: 10000,
    cache: { enabled: true, ttl: 60 }
  }),
  
  // Process analytics
  async (result) => {
    if (Result.isErr(result)) return result
    
    const analytics = data.aggregate(result.value.users, {
      groupBy: ['department', 'level'],
      sum: ['salary', 'projectCount'],
      avg: ['age', 'experience', 'satisfaction'],
      count: ['total']
    })
    
    return analytics
  },
  
  // Format for display
  (analytics) => {
    if (Result.isErr(analytics)) return analytics
    
    return pipeline.map(analytics.value, dept => ({
      ...dept,
      avgSalary: Math.round(dept.avg.salary),
      totalBudget: dept.sum.salary,
      teamSize: dept.count.total,
      experienceLevel: dept.avg.experience > 5 ? 'Senior' : 'Junior'
    }))
  }
])

// Generate dashboard data
const dashboardData = await analyticsProcessor()
if (Result.isOk(dashboardData)) {
  console.log('Dashboard data:', dashboardData.value)
}
```

### Real-time Data Sync

```typescript
import { service, data, pipeline, Result } from '@sanzoku-labs/kairo'

class DataSyncManager {
  private cache = new Map()
  
  async syncData(endpoint: string) {
    // Create sync pipeline
    const syncPipeline = pipeline.compose([
      // Fetch latest data
      async () => service.get(endpoint, {
        timeout: 5000,
        headers: this.getHeaders(),
        cache: { enabled: false } // Always fetch fresh data
      }),
      
      // Validate data
      (result) => {
        if (Result.isErr(result)) return result
        return data.validate(result.value, this.getSchema(endpoint))
      },
      
      // Check for changes
      (result) => {
        if (Result.isErr(result)) return result
        
        const cached = this.cache.get(endpoint)
        if (cached && JSON.stringify(cached) === JSON.stringify(result.value)) {
          return Result.Ok({ changed: false, data: cached })
        }
        
        return Result.Ok({ changed: true, data: result.value })
      },
      
      // Update cache
      (result) => {
        if (Result.isOk(result) && result.value.changed) {
          this.cache.set(endpoint, result.value.data)
        }
        return result
      }
    ])
    
    return syncPipeline()
  }
  
  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getToken()}`,
      'X-Client-Version': '1.0.0'
    }
  }
  
  private getSchema(endpoint: string) {
    // Return appropriate schema based on endpoint
    // Implementation depends on your data structure
    return data.schema({ data: { type: 'object' } })
  }
  
  private getToken() {
    // Get authentication token
    return 'your-auth-token'
  }
}

// Usage
const syncManager = new DataSyncManager()
const result = await syncManager.syncData('/api/users')

if (Result.isOk(result)) {
  if (result.value.changed) {
    console.log('Data updated:', result.value.data)
  } else {
    console.log('No changes detected')
  }
}
```

## Interactive Examples

### Try Online

You can try these examples in your browser by setting up a new project with Kairo:

1. Create a new project: `npm init -y`
2. Install Kairo: `npm install @sanzoku-labs/kairo`
3. Copy and run the examples above

### Local Setup

Set up a local project to test examples:

```bash
mkdir kairo-examples
cd kairo-examples
npm init -y
npm install @sanzoku-labs/kairo
# Copy examples from documentation
```

## Example Categories

### By Pillar

- **[SERVICE Examples](/examples/api-client)** - HTTP operations and API integration
- **[DATA Examples](/examples/data-processing)** - Validation, transformation, and aggregation
- **[PIPELINE Examples](/examples/workflows)** - Logic composition and workflows

### By Framework

- **Node.js Examples** - Server-side applications (coming soon)
- **React Examples** - Frontend applications (coming soon)
- **Vue Examples** - Vue.js applications (coming soon)
- **Next.js Examples** - Full-stack applications (coming soon)

### By Use Case

- **Authentication** - Login, JWT, and session management (coming soon)
- **File Upload** - File handling and validation (coming soon)
- **Real-time** - WebSocket and SSE integration (coming soon)
- **Background Jobs** - Queue processing and scheduling (coming soon)

## Getting Help

Need help with your specific use case?

- **[GitHub Discussions](https://github.com/sanzoku-labs/kairo/discussions)** - Community support
- **[Issues](https://github.com/sanzoku-labs/kairo/issues)** - Bug reports and feature requests
- **[API Reference](/api/)** - Complete method documentation

## Contributing Examples

Have a great example? We'd love to include it! Please [open an issue](https://github.com/sanzoku-labs/kairo/issues) or [start a discussion](https://github.com/sanzoku-labs/kairo/discussions) to share your examples with the community.

## Next Steps

- **[Basic Usage](/examples/basic-usage)** - Start with simple examples
- **[Common Patterns](/examples/common-patterns)** - Learn best practices
- **[API Reference](/api/)** - Complete method documentation
- **[Migration Guide](/migration/)** - Moving from other libraries