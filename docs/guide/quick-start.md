# Quick Start

Build your first Kairo application in 10 minutes. This tutorial walks you through creating a complete user management system that demonstrates all three pillars.

## What We'll Build

A user management system that:
- Fetches users from an API (SERVICE)
- Validates and transforms user data (DATA)
- Processes users through a pipeline (PIPELINE)
- Handles errors gracefully (Result pattern)

## Step 1: Project Setup

Create a new TypeScript project:

```bash
mkdir kairo-quickstart
cd kairo-quickstart
npm init -y
npm install @sanzoku-labs/kairo typescript @types/node ts-node
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Step 2: Define Your Data Schema

Create `src/schemas.ts`:

```typescript
import { data } from '@sanzoku-labs/kairo'

// User schema with validation rules
export const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 150 },
  active: { type: 'boolean' },
  department: { 
    type: 'string', 
    enum: ['engineering', 'marketing', 'sales', 'hr'] 
  },
  salary: { type: 'number', min: 0 },
  joinDate: { type: 'string', format: 'date' }
})

// API response schema
export const ApiResponseSchema = data.schema({
  users: { type: 'array', items: UserSchema },
  total: { type: 'number' },
  page: { type: 'number' }
})

// Type inference
export type User = InferSchema<typeof UserSchema>
export type ApiResponse = InferSchema<typeof ApiResponseSchema>
```

## Step 3: Create API Service

Create `src/api.ts`:

```typescript
import { service, Result } from '@sanzoku-labs/kairo'
import { ApiResponseSchema } from './schemas'

// Configuration for our API
const API_CONFIG = {
  baseUrl: 'https://jsonplaceholder.typicode.com',
  timeout: 5000,
  retry: { attempts: 3, delay: 1000 }
}

export const userApi = {
  // Fetch all users
  getUsers: async () => {
    return service.get(`${API_CONFIG.baseUrl}/users`, {
      timeout: API_CONFIG.timeout,
      retry: API_CONFIG.retry,
      headers: {
        'Content-Type': 'application/json'
      },
      // Validate response against schema
      validate: ApiResponseSchema
    })
  },

  // Create a new user
  createUser: async (userData: Partial<User>) => {
    return service.post(`${API_CONFIG.baseUrl}/users`, {
      body: userData,
      timeout: API_CONFIG.timeout,
      retry: API_CONFIG.retry,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  },

  // Update user
  updateUser: async (id: string, userData: Partial<User>) => {
    return service.put(`${API_CONFIG.baseUrl}/users/${id}`, {
      body: userData,
      timeout: API_CONFIG.timeout,
      merge: true, // Merge with existing data
      headers: {
        'Content-Type': 'application/json'
      }
    })
  },

  // Delete user
  deleteUser: async (id: string) => {
    return service.delete(`${API_CONFIG.baseUrl}/users/${id}`, {
      timeout: API_CONFIG.timeout,
      retry: API_CONFIG.retry
    })
  }
}
```

## Step 4: Data Processing Pipeline

Create `src/processors.ts`:

```typescript
import { pipeline, data, Result } from '@sanzoku-labs/kairo'
import { UserSchema, User } from './schemas'

// User transformation pipeline
export const userProcessor = pipeline.compose([
  // Step 1: Validate users
  (users: unknown[]) => pipeline.map(users, user => 
    data.validate(user, UserSchema)
  ),

  // Step 2: Filter out invalid users and extract values
  (validationResults) => pipeline.filter(
    validationResults.map(r => Result.isOk(r) ? r.value : null),
    user => user !== null
  ),

  // Step 3: Transform users
  (users: User[]) => pipeline.map(users, user => ({
    ...user,
    displayName: user.name.toUpperCase(),
    seniority: calculateSeniority(user.joinDate),
    salaryRange: getSalaryRange(user.salary),
    isActive: user.active
  })),

  // Step 4: Filter active users only
  (users) => pipeline.filter(users, user => user.isActive),

  // Step 5: Sort by salary (descending)
  (users) => pipeline.map(users, user => user).sort((a, b) => b.salary - a.salary)
])

// Analytics pipeline
export const analyticsProcessor = pipeline.compose([
  // Group users by department
  (users: User[]) => data.groupBy(users, 'department'),

  // Calculate department analytics
  (groupedUsers) => Object.entries(groupedUsers).map(([dept, users]) => ({
    department: dept,
    analytics: data.aggregate(users, {
      count: ['id'],
      sum: ['salary'],
      avg: ['age', 'salary'],
      min: ['age', 'salary'],
      max: ['age', 'salary']
    })
  })),

  // Sort by total salary budget
  (deptAnalytics) => deptAnalytics.sort((a, b) => 
    b.analytics.sum.salary - a.analytics.sum.salary
  )
])

// Utility functions
function calculateSeniority(joinDate: string): string {
  const years = (Date.now() - new Date(joinDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  if (years < 1) return 'Junior'
  if (years < 3) return 'Mid-level'
  if (years < 7) return 'Senior'
  return 'Principal'
}

function getSalaryRange(salary: number): string {
  if (salary < 50000) return 'Entry'
  if (salary < 80000) return 'Mid'
  if (salary < 120000) return 'Senior'
  return 'Executive'
}
```

## Step 5: Main Application

Create `src/main.ts`:

```typescript
import { Result } from '@sanzoku-labs/kairo'
import { userApi } from './api'
import { userProcessor, analyticsProcessor } from './processors'

class UserManager {
  async processUsers() {
    console.log('🚀 Fetching users...')
    
    // Fetch users from API
    const apiResult = await userApi.getUsers()
    
    if (Result.isErr(apiResult)) {
      console.error('❌ Failed to fetch users:', apiResult.error.message)
      return
    }

    console.log('✅ Users fetched successfully')
    
    // Process users through pipeline
    const processedResult = userProcessor(apiResult.value.users)
    
    if (Result.isErr(processedResult)) {
      console.error('❌ Failed to process users:', processedResult.error.message)
      return
    }

    console.log('✅ Users processed successfully')
    console.log(`📊 Processed ${processedResult.value.length} active users`)

    // Generate analytics
    const analyticsResult = analyticsProcessor(processedResult.value)
    
    if (Result.isOk(analyticsResult)) {
      console.log('📈 Department Analytics:')
      analyticsResult.value.forEach(dept => {
        console.log(`  ${dept.department}:`)
        console.log(`    👥 Count: ${dept.analytics.count.id}`)
        console.log(`    💰 Total Salary: $${dept.analytics.sum.salary.toLocaleString()}`)
        console.log(`    📊 Avg Salary: $${dept.analytics.avg.salary.toLocaleString()}`)
        console.log(`    🎂 Avg Age: ${dept.analytics.avg.age.toFixed(1)} years`)
        console.log('')
      })
    }

    return processedResult.value
  }

  async createUser(userData: Partial<User>) {
    console.log('👤 Creating user...')
    
    const result = await userApi.createUser(userData)
    
    if (Result.isOk(result)) {
      console.log('✅ User created successfully:', result.value)
    } else {
      console.error('❌ Failed to create user:', result.error.message)
    }
    
    return result
  }

  async updateUser(id: string, userData: Partial<User>) {
    console.log(`✏️ Updating user ${id}...`)
    
    const result = await userApi.updateUser(id, userData)
    
    if (Result.isOk(result)) {
      console.log('✅ User updated successfully')
    } else {
      console.error('❌ Failed to update user:', result.error.message)
    }
    
    return result
  }
}

// Run the application
async function main() {
  const manager = new UserManager()
  
  try {
    // Process existing users
    const users = await manager.processUsers()
    
    // Create a new user
    await manager.createUser({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      department: 'engineering',
      salary: 90000,
      active: true
    })
    
    // Update a user
    if (users && users.length > 0) {
      await manager.updateUser(users[0].id, {
        salary: 95000,
        department: 'engineering'
      })
    }
    
  } catch (error) {
    console.error('💥 Application error:', error)
  }
}

// Run the application
main()
```

## Step 6: Run Your Application

Add to `package.json`:

```json
{
  "scripts": {
    "start": "ts-node src/main.ts",
    "dev": "ts-node --watch src/main.ts"
  }
}
```

Run the application:

```bash
npm run start
```

Expected output:
```
🚀 Fetching users...
✅ Users fetched successfully
✅ Users processed successfully
📊 Processed 8 active users
📈 Department Analytics:
  engineering:
    👥 Count: 4
    💰 Total Salary: $380,000
    📊 Avg Salary: $95,000
    🎂 Avg Age: 28.5 years

  marketing:
    👥 Count: 2
    💰 Total Salary: $140,000
    📊 Avg Salary: $70,000
    🎂 Avg Age: 31.0 years

👤 Creating user...
✅ User created successfully: { id: "123", name: "John Doe", ... }
✏️ Updating user 1...
✅ User updated successfully
```

## What We Accomplished

In this tutorial, we built a complete application using all three Kairo pillars:

### 🔗 SERVICE Pillar
- **API client** with retry and timeout configuration
- **HTTP methods** (GET, POST, PUT, DELETE)
- **Response validation** with schemas
- **Error handling** with Result pattern

### 📊 DATA Pillar
- **Schema definition** with validation rules
- **Data validation** for API responses
- **Data transformation** and enrichment
- **Aggregation** for analytics

### ⚡ PIPELINE Pillar
- **Composition** of data processing steps
- **Filtering** and mapping operations
- **Complex workflows** with multiple stages
- **Error propagation** through pipeline

### 🛡️ Cross-Cutting Concerns
- **Type safety** with TypeScript inference
- **Error handling** with Result pattern
- **Configuration objects** for all operations
- **Predictable patterns** across all methods

## Key Learnings

### 1. **Configuration Objects**
```typescript
// Every method uses configuration objects
service.get('/api/users', {
  timeout: 5000,
  retry: { attempts: 3 },
  validate: UserSchema
})
```

### 2. **Result Pattern**
```typescript
// All operations return Result<Error, Data>
if (Result.isOk(result)) {
  // Handle success
} else {
  // Handle error
}
```

### 3. **Pipeline Composition**
```typescript
// Compose complex operations from simple steps
const processor = pipeline.compose([
  step1,
  step2,
  step3
])
```

### 4. **Type Safety**
```typescript
// Full TypeScript inference
const schema = data.schema({ name: { type: 'string' } })
type User = InferSchema<typeof schema> // { name: string }
```

## Next Steps

Now that you've built your first Kairo application:

1. **[Architecture Guide](/guide/architecture)** - Deep dive into the three pillars
2. **[Configuration Patterns](/guide/configuration)** - Advanced configuration techniques
3. **[Error Handling](/guide/error-handling)** - Comprehensive error management
4. **[API Reference](/api/)** - Complete method documentation
5. **[Examples](/examples/)** - More real-world patterns

## Extending Your Application

### Add Caching
```typescript
const cachedGet = service.get('/api/users', {
  cache: { 
    enabled: true, 
    ttl: 300, // 5 minutes
    key: 'users-list' 
  }
})
```

### Add Parallel Processing
```typescript
const parallelProcessor = pipeline.map(users, processUser, {
  parallel: true,
  concurrency: 5
})
```

### Add Complex Validation
```typescript
const ComplexUserSchema = data.schema({
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  // Custom validation
  password: { 
    type: 'string', 
    custom: (value) => value.length >= 8 && /[A-Z]/.test(value)
  }
})
```

Great job! You've successfully built a complete Kairo application. Continue exploring the documentation to learn more advanced patterns and techniques.