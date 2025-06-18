# Common Development Patterns

**Quick solutions for everyday development challenges using Kairo.**

## 🎯 API Integration Patterns

### Problem: "I need to fetch user data from an API"

```typescript
import { resource, schema, Result } from 'kairo/essential'

// Define what you expect from the API
const UserSchema = schema.object({
  id: schema.number(),
  name: schema.string(),
  email: schema.string().email(),
  avatar: schema.string().optional()
})

// Define the API resource
const UserAPI = resource('users', {
  get: {
    method: 'GET',
    path: '/api/users/:id',
    params: schema.object({ id: schema.string() }),
    response: UserSchema
  }
})

// Use it safely
const result = await UserAPI.get.run({ id: '123' })

Result.match(result, {
  Ok: user => console.log('User:', user.name),
  Err: error => console.error('Failed to fetch user:', error.message)
})
```

**Why this works**: Type-safe API calls with automatic validation and error handling.

### Problem: "I need to handle API pagination"

```typescript
const PaginatedUsersSchema = schema.object({
  users: schema.array(UserSchema),
  total: schema.number(),
  page: schema.number(),
  hasMore: schema.boolean()
})

const UserAPI = resource('users', {
  list: {
    method: 'GET',
    path: '/api/users',
    query: schema.object({
      page: schema.number().default(1),
      limit: schema.number().default(20),
      search: schema.string().optional()
    }),
    response: PaginatedUsersSchema
  }
})

// Fetch paginated data
const fetchAllUsers = async (search?: string) => {
  const allUsers = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const result = await UserAPI.list.run({ page, limit: 20, search })
    
    if (Result.isErr(result)) {
      console.error('Error fetching users:', result.error.message)
      break
    }
    
    const data = result.value
    allUsers.push(...data.users)
    hasMore = data.hasMore
    page++
  }

  return allUsers
}
```

## 🔄 Data Processing Patterns

### Problem: "I need to validate and transform form data"

```typescript
import { pipeline, schema, rules, rule } from 'kairo/tier1'

// Define form schema
const RegisterFormSchema = schema.object({
  email: schema.string().email(),
  password: schema.string().min(8),
  confirmPassword: schema.string(),
  age: schema.number().min(13)
})

// Define business rules
const registrationRules = rules('registration', {
  passwordMatch: rule('passwords-match')
    .require(form => form.password === form.confirmPassword)
    .message('Passwords must match')
    .code('PASSWORD_MISMATCH'),
    
  ageRequirement: rule('minimum-age')
    .require(form => form.age >= 18)
    .message('Must be 18 or older to register')
    .code('AGE_REQUIREMENT')
})

// Create processing pipeline
const processRegistration = pipeline('process-registration')
  .input(RegisterFormSchema)
  .validateAllRules(registrationRules)
  .map(form => ({
    email: form.email.toLowerCase(),
    password: form.password, // Hash this in real app
    age: form.age
  }))

// Use it
const formData = {
  email: 'John@Example.com',
  password: 'mypassword123',
  confirmPassword: 'mypassword123',
  age: 25
}

const result = await processRegistration.run(formData)
Result.match(result, {
  Ok: processedData => {
    console.log('Registration valid:', processedData.email)
    // Create user account...
  },
  Err: error => {
    console.error('Registration failed:', error.message)
    // Show validation errors to user...
  }
})
```

### Problem: "I need to process a CSV file safely"

```typescript
import { pipeline, schema, map } from 'kairo/tier1'

const CSVRowSchema = schema.object({
  name: schema.string(),
  email: schema.string().email(),
  age: schema.string() // CSV gives us strings
})

const processCSVRow = pipeline('process-csv-row')
  .input(CSVRowSchema)
  .map(row => ({
    ...row,
    age: parseInt(row.age, 10), // Convert to number
    email: row.email.toLowerCase(),
    name: row.name.trim()
  }))
  .map(row => ({
    ...row,
    isAdult: row.age >= 18,
    initials: row.name.split(' ').map(n => n[0]).join('')
  }))

// Process multiple rows
const processCSVFile = async (csvRows: any[]) => {
  const results = await Promise.all(
    csvRows.map(row => processCSVRow.run(row))
  )
  
  const validRows = []
  const invalidRows = []
  
  results.forEach((result, index) => {
    if (Result.isOk(result)) {
      validRows.push(result.value)
    } else {
      invalidRows.push({ row: index + 1, error: result.error.message })
    }
  })
  
  return { validRows, invalidRows }
}
```

## 💾 Data Storage Patterns

### Problem: "I need to store user profiles with relationships"

```typescript
import { repository, schema, hasMany, hasOne } from 'kairo/tier1'

// Define schemas
const UserSchema = schema.object({
  id: schema.number(),
  email: schema.string().email(),
  name: schema.string(),
  createdAt: schema.string().optional()
})

const ProfileSchema = schema.object({
  id: schema.number(),
  userId: schema.number(),
  bio: schema.string().optional(),
  avatar: schema.string().optional(),
  website: schema.string().optional()
})

const PostSchema = schema.object({
  id: schema.number(),
  userId: schema.number(),
  title: schema.string(),
  content: schema.string(),
  publishedAt: schema.string().optional()
})

// Create repositories with relationships
const userRepository = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  timestamps: true,
  relationships: {
    profile: hasOne('profiles', 'userId', ProfileSchema),
    posts: hasMany('posts', 'userId', PostSchema)
  }
})

const profileRepository = repository('profiles', {
  schema: ProfileSchema,
  storage: 'memory',
  timestamps: true
})

// Usage examples
const createUserWithProfile = async (userData: any, profileData: any) => {
  // Create user first
  const userResult = await userRepository.create(userData)
  if (Result.isErr(userResult)) {
    return userResult
  }
  
  const user = userResult.value
  
  // Create profile for the user
  const profileResult = await profileRepository.create({
    ...profileData,
    userId: user.id
  })
  
  if (Result.isErr(profileResult)) {
    console.warn('Profile creation failed, but user created')
    return Result.Ok(user)
  }
  
  return Result.Ok({
    ...user,
    profile: profileResult.value
  })
}

// Load user with all related data
const getUserWithRelations = async (userId: number) => {
  return await userRepository
    .with(['profile', 'posts'])
    .find(userId)
}
```

## 🔧 Error Handling Patterns

### Problem: "I need comprehensive error handling"

```typescript
import { Result, createError, chainResult } from 'kairo/tier1'

// Define custom error types
const UserNotFoundError = createError('USER_NOT_FOUND', 'User not found')
const ValidationError = createError('VALIDATION_ERROR', 'Validation failed')
const NetworkError = createError('NETWORK_ERROR', 'Network request failed')

const getUserProfile = async (userId: string) => {
  // Chain multiple operations that can fail
  return chainResult(
    // 1. Validate user ID
    async () => {
      if (!userId || userId.trim() === '') {
        return Result.Err(ValidationError('User ID is required'))
      }
      return Result.Ok(userId.trim())
    },
    
    // 2. Fetch user from API
    async (validUserId) => {
      const result = await UserAPI.get.run({ id: validUserId })
      if (Result.isErr(result)) {
        if (result.error.message.includes('404')) {
          return Result.Err(UserNotFoundError(`User ${validUserId} not found`))
        }
        return Result.Err(NetworkError(result.error.message))
      }
      return result
    },
    
    // 3. Fetch user profile
    async (user) => {
      const profileResult = await ProfileAPI.get.run({ userId: user.id })
      if (Result.isErr(profileResult)) {
        // Profile is optional, so don't fail the whole operation
        return Result.Ok({ ...user, profile: null })
      }
      return Result.Ok({ ...user, profile: profileResult.value })
    }
  )
}

// Usage with comprehensive error handling
const result = await getUserProfile('123')

Result.match(result, {
  Ok: userWithProfile => {
    console.log('User loaded:', userWithProfile.name)
    if (userWithProfile.profile) {
      console.log('Profile:', userWithProfile.profile.bio)
    }
  },
  Err: error => {
    switch (error.code) {
      case 'USER_NOT_FOUND':
        console.error('User does not exist')
        // Redirect to 404 page
        break
      case 'VALIDATION_ERROR':
        console.error('Invalid input:', error.message)
        // Show validation message
        break
      case 'NETWORK_ERROR':
        console.error('Network issue:', error.message)
        // Show retry button
        break
      default:
        console.error('Unexpected error:', error.message)
        // Show generic error message
    }
  }
})
```

## 🚀 Performance Patterns

### Problem: "I need to cache expensive operations"

```typescript
import { pipeline, cache, pipe } from 'kairo/tier1'

const expensiveUserProcessing = pipeline('expensive-user-processing')
  .input(schema.object({ userId: schema.string() }))
  .run(async ({ userId }) => {
    // Expensive API calls
    const [user, posts, analytics] = await Promise.all([
      UserAPI.get.run({ id: userId }),
      PostAPI.listByUser.run({ userId }),
      AnalyticsAPI.getUserStats.run({ userId })
    ])
    
    if (Result.isErr(user)) throw new Error('User fetch failed')
    if (Result.isErr(posts)) throw new Error('Posts fetch failed')
    if (Result.isErr(analytics)) throw new Error('Analytics fetch failed')
    
    return {
      user: user.value,
      posts: posts.value,
      analytics: analytics.value
    }
  })
  .run(async (data) => {
    // Expensive calculations
    const processedPosts = data.posts.map(post => ({
      ...post,
      wordCount: post.content.split(' ').length,
      readingTime: Math.ceil(post.content.split(' ').length / 200)
    }))
    
    return {
      ...data,
      posts: processedPosts,
      totalWords: processedPosts.reduce((sum, post) => sum + post.wordCount, 0)
    }
  })
  .cache(300000) // Cache for 5 minutes

// Usage - subsequent calls with same userId will be cached
const result1 = await expensiveUserProcessing.run({ userId: '123' })
const result2 = await expensiveUserProcessing.run({ userId: '123' }) // Cached!
```

### Problem: "I need to batch API requests"

```typescript
import { delay, pipe } from 'kairo/tier1'

class UserBatcher {
  private queue: string[] = []
  private processing = false
  
  async getUser(userId: string): Promise<Result<any, User>> {
    return new Promise((resolve) => {
      this.queue.push({ userId, resolve })
      this.processBatch()
    })
  }
  
  private async processBatch() {
    if (this.processing) return
    this.processing = true
    
    // Wait a bit to collect more requests
    await delay(10)
    
    const batch = this.queue.splice(0, 10) // Process up to 10 at once
    if (batch.length === 0) {
      this.processing = false
      return
    }
    
    try {
      // Single API call for multiple users
      const userIds = batch.map(item => item.userId)
      const result = await UserAPI.getBatch.run({ ids: userIds })
      
      if (Result.isOk(result)) {
        const users = result.value
        batch.forEach(({ userId, resolve }) => {
          const user = users.find(u => u.id === userId)
          resolve(user ? Result.Ok(user) : Result.Err(new Error('User not found')))
        })
      } else {
        // All requests fail if batch fails
        batch.forEach(({ resolve }) => resolve(result))
      }
    } catch (error) {
      batch.forEach(({ resolve }) => 
        resolve(Result.Err(new Error(error.message)))
      )
    }
    
    this.processing = false
    
    // Process remaining items
    if (this.queue.length > 0) {
      this.processBatch()
    }
  }
}

const userBatcher = new UserBatcher()

// These will be batched together
const user1 = await userBatcher.getUser('1')
const user2 = await userBatcher.getUser('2')
const user3 = await userBatcher.getUser('3')
```

## 🎯 Integration Patterns

### Problem: "I need to integrate multiple services"

```typescript
import { pipeline, Result } from 'kairo/tier1'

const orderFulfillment = pipeline('order-fulfillment')
  .input(OrderSchema)
  .run(async (order) => {
    // 1. Validate inventory
    const inventoryResult = await InventoryAPI.check.run({
      items: order.items
    })
    
    if (Result.isErr(inventoryResult) || !inventoryResult.value.available) {
      throw new Error('Insufficient inventory')
    }
    
    return { order, inventory: inventoryResult.value }
  })
  .run(async ({ order, inventory }) => {
    // 2. Process payment
    const paymentResult = await PaymentAPI.charge.run({
      amount: order.total,
      customerId: order.customerId
    })
    
    if (Result.isErr(paymentResult)) {
      throw new Error('Payment failed')
    }
    
    return { order, inventory, payment: paymentResult.value }
  })
  .run(async ({ order, inventory, payment }) => {
    // 3. Reserve inventory
    const reservationResult = await InventoryAPI.reserve.run({
      items: order.items,
      orderId: order.id
    })
    
    if (Result.isErr(reservationResult)) {
      // Refund payment if inventory reservation fails
      await PaymentAPI.refund.run({ paymentId: payment.id })
      throw new Error('Inventory reservation failed')
    }
    
    return { order, payment, reservation: reservationResult.value }
  })
  .run(async ({ order, payment, reservation }) => {
    // 4. Create shipment
    const shipmentResult = await ShippingAPI.createShipment.run({
      orderId: order.id,
      address: order.shippingAddress,
      items: order.items
    })
    
    if (Result.isErr(shipmentResult)) {
      console.warn('Shipment creation failed, manual intervention required')
      // Don't fail the order, just log for manual handling
    }
    
    return {
      order,
      payment,
      reservation,
      shipment: Result.isOk(shipmentResult) ? shipmentResult.value : null
    }
  })

// Usage
const fulfillmentResult = await orderFulfillment.run(newOrder)

Result.match(fulfillmentResult, {
  Ok: ({ order, payment, shipment }) => {
    console.log('Order fulfilled:', order.id)
    console.log('Payment processed:', payment.id)
    if (shipment) {
      console.log('Shipment created:', shipment.trackingNumber)
    }
  },
  Err: error => {
    console.error('Order fulfillment failed:', error.message)
    // Handle partial failures appropriately
  }
})
```

## 🔍 Testing Patterns

### Problem: "I need to test my pipelines"

```typescript
import { pipeline, schema } from 'kairo/tier1'

const testUserProcessing = async () => {
  const processUser = pipeline('test-user-processing')
    .input(UserSchema)
    .map(user => ({ ...user, displayName: user.name.toUpperCase() }))
    .map(user => ({ ...user, isAdult: user.age >= 18 }))

  // Test valid input
  const validResult = await processUser.run({
    name: 'John Doe',
    email: 'john@example.com',
    age: 25
  })
  
  console.assert(Result.isOk(validResult), 'Valid input should succeed')
  console.assert(validResult.value.displayName === 'JOHN DOE', 'Display name should be uppercase')
  console.assert(validResult.value.isAdult === true, 'Should be adult')

  // Test invalid input
  const invalidResult = await processUser.run({
    name: '',
    email: 'invalid-email',
    age: -1
  })
  
  console.assert(Result.isErr(invalidResult), 'Invalid input should fail')
  console.log('Validation error:', invalidResult.error.message)
  
  console.log('✅ All tests passed!')
}

testUserProcessing()
```

## 🎉 Next Steps

These patterns cover the most common development scenarios. For more advanced patterns:

- **[Business Rules Examples](./business-rules)** - Complex validation patterns
- **[Enterprise Integration](./enterprise-integration)** - Large-scale system integration  
- **[Data Transformations](./data-transformations)** - Advanced data processing
- **[Event-Driven Architecture](./event-driven-architecture)** - Event-based patterns