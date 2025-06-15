# Repository API

The Repository API is a key component of Kairo's **DATA Pillar** - providing type-safe, declarative data access with relationships, lifecycle hooks, and seamless integration with native schemas.

## Overview

- **🛡️ Type Safe** - Full TypeScript inference with Result pattern integration
- **🔗 Relationship Management** - Declarative one-to-one, one-to-many, and many-to-one relationships
- **🎣 Lifecycle Hooks** - beforeCreate, afterCreate, beforeUpdate, afterUpdate hooks
- **🔌 Pluggable Storage** - Memory, Database, File, or custom storage adapters
- **🔄 Result Pattern** - Predictable error handling without exceptions
- **📊 Rich Querying** - Filtering, ordering, pagination with type safety

## Creating Repositories

### Basic Repository Definition

```typescript
import { repository, nativeSchema, hasMany, hasOne, belongsTo } from 'kairo'

// Define your data schemas with native validation
const UserSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(2).max(100),
  email: nativeSchema.string().email(),
  age: nativeSchema.number().min(0).max(150),
  active: nativeSchema.boolean().default(true),
  createdAt: nativeSchema.string().datetime(),
  updatedAt: nativeSchema.string().datetime().optional(),
})

const PostSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  userId: nativeSchema.string().uuid(),
  title: nativeSchema.string().min(1).max(200),
  content: nativeSchema.string().min(1),
  published: nativeSchema.boolean().default(false),
  createdAt: nativeSchema.string().datetime(),
  updatedAt: nativeSchema.string().datetime().optional(),
})

const ProfileSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  userId: nativeSchema.string().uuid(),
  bio: nativeSchema.string().optional(),
  avatar: nativeSchema.string().url().optional(),
  website: nativeSchema.string().url().optional(),
  location: nativeSchema.string().optional(),
})

// Define repository with relationships and configuration
const userRepository = repository('users', {
  schema: UserSchema,
  storage: 'memory', // or custom StorageAdapter
  timestamps: true, // Automatic createdAt/updatedAt fields
  relationships: {
    posts: hasMany('posts', 'userId', PostSchema),
    profile: hasOne('profile', 'userId', ProfileSchema),
  },
  hooks: {
    beforeCreate: data => ({
      ...data,
      id: generateId(),
      slug: slugify(data.name),
    }),
    afterCreate: user => {
      console.log(`User ${user.name} created with ID ${user.id}`)
      // Trigger welcome email, analytics, etc.
    },
    beforeUpdate: (data, existing) => ({
      ...data,
      updatedAt: new Date().toISOString(),
    }),
    afterUpdate: (user, changes) => {
      console.log(`User ${user.id} updated:`, Object.keys(changes))
    },
  },
})
```

### Storage Configuration

```typescript
// Memory storage (default) - great for development and testing
const memoryRepo = repository('users', {
  schema: UserSchema,
  storage: 'memory',
})

// Database storage - for production applications
const databaseRepo = repository('users', {
  schema: UserSchema,
  storage: new DatabaseStorageAdapter({
    connectionString: process.env.DATABASE_URL,
    table: 'users',
  }),
})

// File storage - for lightweight applications
const fileRepo = repository('users', {
  schema: UserSchema,
  storage: new FileStorageAdapter({
    path: './data/users.json',
  }),
})

// Custom storage adapter
const customRepo = repository('users', {
  schema: UserSchema,
  storage: new CustomRedisAdapter({
    host: 'redis.example.com',
    port: 6379,
  }),
})
```

## CRUD Operations with Result Pattern

### Create Operations

```typescript
// Create a single user
const createResult = await userRepository.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  active: true,
})

createResult.match({
  Ok: user => {
    // user is fully typed with generated ID and timestamps
    console.log('User created:', user.id)
    console.log('Created at:', user.createdAt)
  },
  Err: error => {
    // Handle specific error types
    switch (error.code) {
      case 'VALIDATION_ERROR':
        console.log('Invalid user data:', error.field, error.message)
        break
      case 'DUPLICATE_ERROR':
        console.log('User already exists:', error.field)
        break
      case 'STORAGE_ERROR':
        console.log('Database error:', error.message)
        break
      default:
        console.log('Unexpected error:', error.message)
    }
  },
})

// Create multiple users in batch
const users = [
  { name: 'Alice Smith', email: 'alice@example.com', age: 25 },
  { name: 'Bob Johnson', email: 'bob@example.com', age: 35 },
  { name: 'Carol Davis', email: 'carol@example.com', age: 28 },
]

const batchResults = await Promise.all(users.map(userData => userRepository.create(userData)))

const successfulUsers = batchResults
  .filter(result => result.tag === 'Ok')
  .map(result => result.value)

console.log(`Created ${successfulUsers.length} users`)
```

### Read Operations

```typescript
// Find by ID
const findResult = await userRepository.find('user-123')

findResult.match({
  Ok: user => {
    if (user) {
      console.log('Found user:', user.name)
    } else {
      console.log('User not found')
    }
  },
  Err: error => console.error('Find operation failed:', error.message),
})

// Find one with conditions
const findOneResult = await userRepository.findOne({
  where: { email: 'john@example.com' },
})

// Find many with complex querying
const findManyResult = await userRepository.findMany({
  where: {
    active: true,
    age: { $gte: 18, $lte: 65 },
    email: { $contains: '@company.com' },
  },
  orderBy: [
    { field: 'createdAt', direction: 'desc' },
    { field: 'name', direction: 'asc' },
  ],
  limit: 20,
  offset: 0,
})

findManyResult.match({
  Ok: users => {
    console.log(`Found ${users.length} users`)
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email})`)
    })
  },
  Err: error => console.error('Query failed:', error.message),
})

// Count records
const countResult = await userRepository.count({
  where: { active: true },
})

countResult.match({
  Ok: count => console.log(`${count} active users`),
  Err: error => console.error('Count failed:', error.message),
})

// Check existence
const existsResult = await userRepository.exists('user-123')
existsResult.match({
  Ok: exists => console.log(exists ? 'User exists' : 'User not found'),
  Err: error => console.error('Exists check failed:', error.message),
})
```

### Update Operations

```typescript
// Update by ID
const updateResult = await userRepository.update('user-123', {
  name: 'John Updated',
  age: 31,
})

updateResult.match({
  Ok: updatedUser => {
    console.log('User updated:', updatedUser.name)
    console.log('Updated at:', updatedUser.updatedAt)
  },
  Err: error => {
    if (error.code === 'NOT_FOUND') {
      console.log('User not found for update')
    } else {
      console.error('Update failed:', error.message)
    }
  },
})

// Update many with conditions
const updateManyResult = await userRepository.updateMany(
  { active: false }, // Data to update
  { where: { lastLoginAt: { $lt: thirtyDaysAgo } } } // Conditions
)

updateManyResult.match({
  Ok: updatedUsers => {
    console.log(`Deactivated ${updatedUsers.length} inactive users`)
  },
  Err: error => console.error('Bulk update failed:', error.message),
})
```

### Delete Operations

```typescript
// Delete by ID
const deleteResult = await userRepository.delete('user-123')

deleteResult.match({
  Ok: () => console.log('User deleted successfully'),
  Err: error => {
    if (error.code === 'NOT_FOUND') {
      console.log('User not found for deletion')
    } else {
      console.error('Delete failed:', error.message)
    }
  },
})

// Delete many with conditions
const deleteManyResult = await userRepository.deleteMany({
  where: {
    active: false,
    createdAt: { $lt: oneYearAgo },
  },
})

deleteManyResult.match({
  Ok: () => console.log('Inactive users cleaned up'),
  Err: error => console.error('Bulk delete failed:', error.message),
})
```

## Relationship Management

### Defining Relationships

```typescript
const userRepository = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  relationships: {
    // One-to-many: User has many Posts
    posts: hasMany('posts', 'userId', PostSchema),

    // One-to-one: User has one Profile
    profile: hasOne('profile', 'userId', ProfileSchema),

    // Many-to-many through junction table
    roles: hasMany('user_roles', 'userId', UserRoleSchema),
  },
})

const postRepository = repository('posts', {
  schema: PostSchema,
  storage: 'memory',
  relationships: {
    // Many-to-one: Post belongs to User
    author: belongsTo('users', 'userId', UserSchema),

    // One-to-many: Post has many Comments
    comments: hasMany('comments', 'postId', CommentSchema),
  },
})

const profileRepository = repository('profiles', {
  schema: ProfileSchema,
  storage: 'memory',
  relationships: {
    // One-to-one: Profile belongs to User
    user: belongsTo('users', 'userId', UserSchema),
  },
})
```

### Loading Relationships

```typescript
// Load a single relationship
const userWithPostsResult = await userRepository.with('posts').find('user-123')

userWithPostsResult.match({
  Ok: user => {
    if (user) {
      console.log(`User ${user.name} has ${user.posts.length} posts`)
      user.posts.forEach(post => {
        console.log(`- ${post.title}`)
      })
    }
  },
  Err: error => console.error('Failed to load user with posts:', error.message),
})

// Load multiple relationships
const userWithAllResult = await userRepository.with(['posts', 'profile']).find('user-123')

userWithAllResult.match({
  Ok: user => {
    if (user) {
      console.log('User:', user.name)
      console.log('Bio:', user.profile?.bio || 'No bio')
      console.log('Posts:', user.posts.length)
    }
  },
  Err: error => console.error('Failed to load user data:', error.message),
})

// Chain relationship loading for complex queries
const complexQuery = await userRepository
  .with('posts')
  .with('profile')
  .findMany({
    where: { active: true },
    orderBy: { field: 'createdAt', direction: 'desc' },
    limit: 10,
  })

// Load relationships in queries
const activeUsersWithPosts = await userRepository.findMany({
  where: { active: true },
  include: ['posts'],
  orderBy: { field: 'createdAt', direction: 'desc' },
})
```

### Nested Relationship Loading

```typescript
// Load deeply nested relationships
const userWithNestedData = await userRepository
  .with('posts')
  .with('posts.comments') // Load comments for each post
  .with('profile')
  .find('user-123')

userWithNestedData.match({
  Ok: user => {
    if (user) {
      console.log(`User: ${user.name}`)
      user.posts.forEach(post => {
        console.log(`  Post: ${post.title} (${post.comments.length} comments)`)
        post.comments.forEach(comment => {
          console.log(`    - ${comment.content}`)
        })
      })
    }
  },
  Err: error => console.error('Failed to load nested data:', error.message),
})
```

## Lifecycle Hooks

### Comprehensive Hook System

```typescript
const userRepository = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  hooks: {
    // Before create - modify data before insertion
    beforeCreate: async data => {
      const enrichedData = {
        ...data,
        id: generateId(),
        slug: slugify(data.name),
        emailVerified: false,
        createdAt: new Date().toISOString(),
      }

      // Validate business rules
      if (await emailExists(data.email)) {
        throw new Error('Email already exists')
      }

      return enrichedData
    },

    // After create - perform side effects
    afterCreate: async user => {
      console.log(`User ${user.name} created with ID ${user.id}`)

      // Send welcome email
      await EmailAPI.sendWelcome.run({
        userId: user.id,
        email: user.email,
        name: user.name,
      })

      // Create default profile
      await profileRepository.create({
        userId: user.id,
        bio: '',
        isPublic: true,
      })

      // Track analytics
      await AnalyticsAPI.track.run({
        event: 'user_created',
        userId: user.id,
        properties: {
          email: user.email,
          source: 'registration',
        },
      })
    },

    // Before update - validate and modify update data
    beforeUpdate: async (data, existing) => {
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      }

      // Prevent email changes without verification
      if (data.email && data.email !== existing.email) {
        if (!data.emailVerified) {
          throw new Error('Email change requires verification')
        }
      }

      // Audit trail
      if (data.active !== existing.active) {
        updateData.statusChangedAt = new Date().toISOString()
        updateData.statusChangedBy = getCurrentUserId()
      }

      return updateData
    },

    // After update - handle side effects
    afterUpdate: async (user, changes) => {
      const changedFields = Object.keys(changes)
      console.log(`User ${user.id} updated: ${changedFields.join(', ')}`)

      // Send notification for important changes
      if (changes.email) {
        await EmailAPI.sendEmailChangeConfirmation.run({
          userId: user.id,
          newEmail: user.email,
        })
      }

      // Invalidate caches
      await CacheAPI.invalidateUser.run({ userId: user.id })

      // Update search index
      await SearchAPI.updateUser.run(user)
    },

    // Before delete - validation and cleanup preparation
    beforeDelete: async id => {
      const user = await userRepository.find(id)
      if (user.tag === 'Ok' && user.value) {
        // Check for dependencies
        const postsCount = await postRepository.count({ where: { userId: id } })
        if (postsCount.tag === 'Ok' && postsCount.value > 0) {
          throw new Error('Cannot delete user with existing posts')
        }

        // Archive user data
        await ArchiveAPI.archiveUser.run({ userId: id })
      }
    },

    // After delete - cleanup and notifications
    afterDelete: async id => {
      console.log(`User ${id} deleted`)

      // Clean up related data
      await profileRepository.deleteMany({ where: { userId: id } })
      await sessionRepository.deleteMany({ where: { userId: id } })

      // Remove from external services
      await EmailAPI.unsubscribe.run({ userId: id })
      await AnalyticsAPI.deleteUser.run({ userId: id })

      // Audit log
      await AuditAPI.log.run({
        action: 'user_deleted',
        userId: id,
        timestamp: new Date().toISOString(),
      })
    },
  },
})
```

### Conditional Hooks

```typescript
const conditionalRepo = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  hooks: {
    beforeCreate: async data => {
      // Only apply special processing for admin users
      if (data.role === 'admin') {
        return {
          ...data,
          adminCode: generateAdminCode(),
          requiresApproval: true,
        }
      }
      return data
    },

    afterUpdate: async (user, changes) => {
      // Only send notifications for significant changes
      const significantFields = ['email', 'role', 'active']
      const hasSignificantChange = significantFields.some(field => field in changes)

      if (hasSignificantChange) {
        await NotificationAPI.sendUserUpdate.run({
          userId: user.id,
          changes: Object.keys(changes),
        })
      }
    },
  },
})
```

## Advanced Querying

### Complex Where Conditions

```typescript
// Advanced filtering with operators
const complexQuery = await userRepository.findMany({
  where: {
    // Basic equality
    active: true,

    // Comparison operators
    age: { $gte: 18, $lte: 65 },

    // String operations
    name: { $contains: 'john', $startsWith: 'J' },
    email: { $endsWith: '@company.com' },

    // Array operations
    roles: { $in: ['admin', 'moderator'] },
    tags: { $contains: 'premium' },

    // Date operations
    createdAt: {
      $gte: '2024-01-01T00:00:00Z',
      $lt: '2024-12-31T23:59:59Z',
    },

    // Nested object queries
    'profile.location': 'New York',
    'settings.notifications.email': true,

    // Complex conditions
    $or: [{ email: { $endsWith: '@admin.com' } }, { role: 'admin' }],

    $and: [{ active: true }, { emailVerified: true }],
  },
  orderBy: [
    { field: 'createdAt', direction: 'desc' },
    { field: 'name', direction: 'asc' },
  ],
  limit: 50,
})
```

### Pagination and Ordering

```typescript
// Cursor-based pagination
const paginatedQuery = async (cursor?: string, limit = 20) => {
  const where = cursor ? { createdAt: { $lt: cursor } } : {}

  return userRepository.findMany({
    where,
    orderBy: { field: 'createdAt', direction: 'desc' },
    limit,
  })
}

// Offset-based pagination
const offsetPagination = async (page = 1, pageSize = 20) => {
  const offset = (page - 1) * pageSize

  const [usersResult, countResult] = await Promise.all([
    userRepository.findMany({
      where: { active: true },
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: pageSize,
      offset,
    }),
    userRepository.count({ where: { active: true } }),
  ])

  return usersResult.match({
    Ok: users =>
      countResult.match({
        Ok: total => ({
          users,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
            hasNext: page * pageSize < total,
            hasPrev: page > 1,
          },
        }),
        Err: error => ({ error }),
      }),
    Err: error => ({ error }),
  })
}
```

### Query Performance Optimization

```typescript
// Use indexes for better performance
const optimizedRepo = repository('users', {
  schema: UserSchema,
  storage: 'database',
  indexes: [
    'email', // Single field index
    'active',
    'createdAt',
    ['active', 'role'], // Composite index
    ['email', 'active'],
  ],
})

// Efficient queries with indexes
const efficientQueries = {
  // Uses email index
  findByEmail: (email: string) => userRepository.findOne({ where: { email } }),

  // Uses composite index
  findActiveByRole: (role: string) => userRepository.findMany({ where: { active: true, role } }),

  // Uses createdAt index for sorting
  findRecent: (limit = 10) =>
    userRepository.findMany({
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit,
    }),
}
```

## Pipeline Integration

### Repository Operations in Pipelines

```typescript
import { pipeline } from 'kairo'

// User registration pipeline
const registerUser = pipeline('user-registration')
  .input(
    nativeSchema.object({
      name: nativeSchema.string().min(2),
      email: nativeSchema.string().email(),
      password: nativeSchema.string().min(8),
    })
  )
  .map(data => ({
    ...data,
    email: data.email.toLowerCase(),
    passwordHash: hashPassword(data.password),
  }))
  .run(async userData => {
    // Create user with repository
    return userRepository.create(userData)
  })
  .map(user => ({ ...user, registrationComplete: true }))
  .trace('user-registered')

// User data enrichment pipeline
const enrichUserData = pipeline('enrich-user')
  .input(nativeSchema.object({ userId: nativeSchema.string() }))
  .run(async ({ userId }) => {
    // Load user with all relationships
    return userRepository.with(['posts', 'profile']).find(userId)
  })
  .map(user => {
    if (!user) throw new Error('User not found')

    return {
      ...user,
      stats: {
        postsCount: user.posts.length,
        hasProfile: !!user.profile,
        joinedDaysAgo: Math.floor(
          (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
    }
  })
  .trace('user-enriched')

// Bulk user processing pipeline
const processBulkUsers = pipeline('bulk-user-processing')
  .input(nativeSchema.array(UserSchema))
  .run(async users => {
    // Process users in batches
    const batchSize = 10
    const results = []

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(user => userRepository.create(user)))
      results.push(...batchResults)
    }

    return results
  })
  .map(results => {
    const successful = results.filter(r => r.tag === 'Ok').length
    const failed = results.filter(r => r.tag === 'Err').length

    return {
      total: results.length,
      successful,
      failed,
      successRate: (successful / results.length) * 100,
    }
  })
  .trace('bulk-processing-complete')
```

## Storage Adapters

### Memory Storage Adapter

```typescript
import { MemoryStorageAdapter } from 'kairo'

// Default memory storage (great for development and testing)
const memoryRepo = repository('users', {
  schema: UserSchema,
  storage: 'memory', // Uses default MemoryStorageAdapter
})

// Custom memory storage with options
const customMemoryRepo = repository('users', {
  schema: UserSchema,
  storage: new MemoryStorageAdapter({
    primaryKey: 'id',
    autoIncrement: false, // Use custom ID generation
    initialData: seedUsers, // Pre-populate with data
  }),
})
```

### Database Storage Adapter

```typescript
import { DatabaseStorageAdapter } from 'kairo'

// PostgreSQL adapter
const postgresRepo = repository('users', {
  schema: UserSchema,
  storage: new DatabaseStorageAdapter({
    type: 'postgresql',
    connectionString: process.env.DATABASE_URL,
    table: 'users',
    schema: 'public',
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
    },
  }),
})

// MySQL adapter
const mysqlRepo = repository('users', {
  schema: UserSchema,
  storage: new DatabaseStorageAdapter({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    table: 'users',
  }),
})

// SQLite adapter
const sqliteRepo = repository('users', {
  schema: UserSchema,
  storage: new DatabaseStorageAdapter({
    type: 'sqlite',
    database: './data/app.db',
    table: 'users',
  }),
})
```

### File Storage Adapter

```typescript
import { FileStorageAdapter } from 'kairo'

// JSON file storage
const jsonRepo = repository('users', {
  schema: UserSchema,
  storage: new FileStorageAdapter({
    path: './data/users.json',
    format: 'json',
    encoding: 'utf8',
    backupCount: 5, // Keep 5 backup files
  }),
})

// CSV file storage
const csvRepo = repository('users', {
  schema: UserSchema,
  storage: new FileStorageAdapter({
    path: './data/users.csv',
    format: 'csv',
    headers: ['id', 'name', 'email', 'age', 'active'],
  }),
})
```

### Custom Storage Adapter

```typescript
import { StorageAdapter, Result, RepositoryError } from 'kairo'

// Redis storage adapter example
class RedisStorageAdapter<T> implements StorageAdapter<T> {
  constructor(
    private redis: RedisClient,
    private keyPrefix: string
  ) {}

  async create(data: T & { id: string }): Promise<Result<RepositoryError, T>> {
    try {
      const key = `${this.keyPrefix}:${data.id}`
      await this.redis.set(key, JSON.stringify(data))
      return { tag: 'Ok', value: data }
    } catch (error) {
      return {
        tag: 'Err',
        error: new RepositoryError('STORAGE_ERROR', error.message, {
          operation: 'create',
          data,
        }),
      }
    }
  }

  async find(id: string): Promise<Result<RepositoryError, T | null>> {
    try {
      const key = `${this.keyPrefix}:${id}`
      const data = await this.redis.get(key)
      return {
        tag: 'Ok',
        value: data ? JSON.parse(data) : null,
      }
    } catch (error) {
      return {
        tag: 'Err',
        error: new RepositoryError('STORAGE_ERROR', error.message, {
          operation: 'find',
          id,
        }),
      }
    }
  }

  async findMany(options: QueryOptions): Promise<Result<RepositoryError, T[]>> {
    try {
      const pattern = `${this.keyPrefix}:*`
      const keys = await this.redis.keys(pattern)
      const data = await Promise.all(keys.map(key => this.redis.get(key).then(JSON.parse)))

      // Apply filtering, ordering, pagination
      let filtered = this.applyWhere(data, options.where)
      filtered = this.applyOrderBy(filtered, options.orderBy)
      filtered = this.applyPagination(filtered, options.offset, options.limit)

      return { tag: 'Ok', value: filtered }
    } catch (error) {
      return {
        tag: 'Err',
        error: new RepositoryError('STORAGE_ERROR', error.message, {
          operation: 'findMany',
          options,
        }),
      }
    }
  }

  // Implement other required methods...
  async update(id: string, data: Partial<T>): Promise<Result<RepositoryError, T>> {
    /* ... */
  }
  async delete(id: string): Promise<Result<RepositoryError, void>> {
    /* ... */
  }
  async count(options?: QueryOptions): Promise<Result<RepositoryError, number>> {
    /* ... */
  }
  async exists(id: string): Promise<Result<RepositoryError, boolean>> {
    /* ... */
  }
}

// Use custom adapter
const redisRepo = repository('users', {
  schema: UserSchema,
  storage: new RedisStorageAdapter(redisClient, 'user'),
})
```

## Testing Repositories

### Unit Testing with Mock Storage

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorageAdapter } from 'kairo'

describe('User Repository', () => {
  let userRepository: Repository<User>

  beforeEach(() => {
    // Fresh memory storage for each test
    userRepository = repository('users', {
      schema: UserSchema,
      storage: new MemoryStorageAdapter(),
    })
  })

  it('should create a user successfully', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    }

    const result = await userRepository.create(userData)

    expect(result.tag).toBe('Ok')
    if (result.tag === 'Ok') {
      expect(result.value.name).toBe('John Doe')
      expect(result.value.email).toBe('john@example.com')
      expect(result.value.id).toBeDefined()
      expect(result.value.createdAt).toBeDefined()
    }
  })

  it('should validate user data on create', async () => {
    const invalidData = {
      name: '', // Too short
      email: 'invalid-email', // Invalid format
      age: -5, // Negative age
    }

    const result = await userRepository.create(invalidData)

    expect(result.tag).toBe('Err')
    if (result.tag === 'Err') {
      expect(result.error.code).toBe('VALIDATION_ERROR')
    }
  })

  it('should handle relationships correctly', async () => {
    // Create user
    const userResult = await userRepository.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      age: 25,
    })

    expect(userResult.tag).toBe('Ok')
    const user = userResult.value

    // Create posts for user
    const postResults = await Promise.all([
      postRepository.create({
        userId: user.id,
        title: 'First Post',
        content: 'Hello world!',
      }),
      postRepository.create({
        userId: user.id,
        title: 'Second Post',
        content: 'Another post!',
      }),
    ])

    // Load user with posts
    const userWithPostsResult = await userRepository.with('posts').find(user.id)

    expect(userWithPostsResult.tag).toBe('Ok')
    if (userWithPostsResult.tag === 'Ok' && userWithPostsResult.value) {
      expect(userWithPostsResult.value.posts).toHaveLength(2)
      expect(userWithPostsResult.value.posts[0].title).toBe('First Post')
    }
  })

  it('should trigger hooks correctly', async () => {
    const hooksCalled: string[] = []

    const repoWithHooks = repository('users', {
      schema: UserSchema,
      storage: new MemoryStorageAdapter(),
      hooks: {
        beforeCreate: async data => {
          hooksCalled.push('beforeCreate')
          return { ...data, slug: 'test-slug' }
        },
        afterCreate: async user => {
          hooksCalled.push('afterCreate')
        },
      },
    })

    const result = await repoWithHooks.create({
      name: 'Test User',
      email: 'test@example.com',
      age: 25,
    })

    expect(result.tag).toBe('Ok')
    expect(hooksCalled).toEqual(['beforeCreate', 'afterCreate'])
    if (result.tag === 'Ok') {
      expect(result.value.slug).toBe('test-slug')
    }
  })
})
```

### Integration Testing with Real Database

```typescript
describe('User Repository Integration', () => {
  let userRepository: Repository<User>
  let testDatabase: TestDatabase

  beforeAll(async () => {
    testDatabase = await TestDatabase.create()
    userRepository = repository('users', {
      schema: UserSchema,
      storage: new DatabaseStorageAdapter({
        connectionString: testDatabase.connectionString,
        table: 'users',
      }),
    })
  })

  afterAll(async () => {
    await testDatabase.destroy()
  })

  beforeEach(async () => {
    await testDatabase.clear()
  })

  it('should persist data correctly', async () => {
    const userData = {
      name: 'Integration Test User',
      email: 'integration@example.com',
      age: 30,
    }

    // Create user
    const createResult = await userRepository.create(userData)
    expect(createResult.tag).toBe('Ok')
    const userId = createResult.value.id

    // Find user in new repository instance (simulates restart)
    const freshRepo = repository('users', {
      schema: UserSchema,
      storage: new DatabaseStorageAdapter({
        connectionString: testDatabase.connectionString,
        table: 'users',
      }),
    })

    const findResult = await freshRepo.find(userId)
    expect(findResult.tag).toBe('Ok')
    if (findResult.tag === 'Ok' && findResult.value) {
      expect(findResult.value.name).toBe('Integration Test User')
    }
  })
})
```

## Real-World Examples

### E-commerce Repository Setup

```typescript
// Product repository
const productRepository = repository('products', {
  schema: ProductSchema,
  storage: 'database',
  indexes: ['category', 'price', 'inStock', ['category', 'price']],
  relationships: {
    reviews: hasMany('reviews', 'productId', ReviewSchema),
    variants: hasMany('product_variants', 'productId', VariantSchema),
    category: belongsTo('categories', 'categoryId', CategorySchema),
  },
  hooks: {
    beforeCreate: async data => ({
      ...data,
      slug: generateSlug(data.name),
      searchKeywords: generateKeywords(data.name, data.description),
    }),
    afterUpdate: async (product, changes) => {
      if (changes.price) {
        await NotificationAPI.sendPriceAlert.run({
          productId: product.id,
          oldPrice: changes.price.old,
          newPrice: changes.price.new,
        })
      }
    },
  },
})

// Order repository with complex relationships
const orderRepository = repository('orders', {
  schema: OrderSchema,
  storage: 'database',
  relationships: {
    customer: belongsTo('users', 'customerId', UserSchema),
    items: hasMany('order_items', 'orderId', OrderItemSchema),
    payments: hasMany('payments', 'orderId', PaymentSchema),
    shipments: hasMany('shipments', 'orderId', ShipmentSchema),
  },
  hooks: {
    beforeCreate: async data => ({
      ...data,
      orderNumber: await generateOrderNumber(),
      status: 'pending',
    }),
    afterCreate: async order => {
      // Update inventory
      for (const item of order.items) {
        await productRepository.update(item.productId, {
          stock: { $decrement: item.quantity },
        })
      }

      // Send confirmation email
      await EmailAPI.sendOrderConfirmation.run({
        orderId: order.id,
        customerId: order.customerId,
      })
    },
    afterUpdate: async (order, changes) => {
      if (changes.status) {
        await NotificationAPI.sendOrderStatusUpdate.run({
          orderId: order.id,
          status: order.status,
        })
      }
    },
  },
})
```

### User Management System

```typescript
// User repository with role-based access
const userRepository = repository('users', {
  schema: UserSchema,
  storage: 'database',
  relationships: {
    profile: hasOne('profiles', 'userId', ProfileSchema),
    sessions: hasMany('sessions', 'userId', SessionSchema),
    roles: hasMany('user_roles', 'userId', UserRoleSchema),
    permissions: hasMany('user_permissions', 'userId', PermissionSchema),
    auditLogs: hasMany('audit_logs', 'userId', AuditLogSchema),
  },
  hooks: {
    beforeCreate: async data => {
      // Hash password
      const hashedPassword = await hashPassword(data.password)

      return {
        ...data,
        password: hashedPassword,
        emailVerificationToken: generateToken(),
        emailVerified: false,
        lastLoginAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      }
    },
    afterCreate: async user => {
      // Create default profile
      await profileRepository.create({
        userId: user.id,
        displayName: user.name,
        isPublic: false,
      })

      // Send verification email
      await EmailAPI.sendEmailVerification.run({
        userId: user.id,
        email: user.email,
        token: user.emailVerificationToken,
      })

      // Assign default role
      await userRoleRepository.create({
        userId: user.id,
        roleId: 'user',
      })
    },
    beforeUpdate: async (data, existing) => {
      // Track password changes
      if (data.password && data.password !== existing.password) {
        data.passwordChangedAt = new Date().toISOString()
        data.password = await hashPassword(data.password)
      }

      // Reset failed login attempts on successful login
      if (data.lastLoginAt && data.lastLoginAt !== existing.lastLoginAt) {
        data.failedLoginAttempts = 0
        data.lockedUntil = null
      }

      return data
    },
    afterUpdate: async (user, changes) => {
      // Log audit trail
      await auditLogRepository.create({
        userId: user.id,
        action: 'user_updated',
        changes: Object.keys(changes),
        timestamp: new Date().toISOString(),
        ipAddress: getCurrentIP(),
      })
    },
  },
})
```

## Best Practices

### Repository Design Patterns

```typescript
// ✅ Good: Single responsibility repositories
const userRepository = repository('users', {
  /* user-specific config */
})
const postRepository = repository('posts', {
  /* post-specific config */
})
const commentRepository = repository('comments', {
  /* comment-specific config */
})

// ❌ Avoid: Generic repositories
const genericRepository = repository('entities', {
  /* handles everything */
})

// ✅ Good: Consistent naming conventions
const userRepository = repository('users', {
  /* ... */
})
const userProfileRepository = repository('user_profiles', {
  /* ... */
})
const userSessionRepository = repository('user_sessions', {
  /* ... */
})

// ❌ Avoid: Inconsistent naming
const usersRepo = repository('users', {
  /* ... */
})
const ProfileRepository = repository('profiles', {
  /* ... */
})
const user_sessions = repository('sessions', {
  /* ... */
})
```

### Error Handling Patterns

```typescript
// ✅ Good: Comprehensive error handling
const safeCreateUser = async (userData: CreateUserData) => {
  const result = await userRepository.create(userData)

  return result.match({
    Ok: user => ({
      success: true,
      user,
      message: 'User created successfully',
    }),
    Err: error => {
      switch (error.code) {
        case 'VALIDATION_ERROR':
          return {
            success: false,
            error: 'Invalid user data',
            field: error.field,
            details: error.message,
          }
        case 'DUPLICATE_ERROR':
          return {
            success: false,
            error: 'User already exists',
            field: error.field,
          }
        case 'STORAGE_ERROR':
          console.error('Database error:', error.message)
          return {
            success: false,
            error: 'Unable to create user, please try again',
          }
        default:
          console.error('Unexpected error:', error)
          return {
            success: false,
            error: 'An unexpected error occurred',
          }
      }
    },
  })
}

// ✅ Good: Helper for unwrapping results
const unwrapOrThrow = <T>(result: Result<RepositoryError, T>): T => {
  if (result.tag === 'Err') {
    throw new Error(`Repository operation failed: ${result.error.message}`)
  }
  return result.value
}

// Usage in contexts where exceptions are appropriate
const getUser = async (id: string): Promise<User> => {
  const result = await userRepository.find(id)
  const user = unwrapOrThrow(result)

  if (!user) {
    throw new Error('User not found')
  }

  return user
}
```

### Performance Optimization

```typescript
// ✅ Good: Use appropriate indexes
const optimizedRepo = repository('users', {
  schema: UserSchema,
  storage: 'database',
  indexes: [
    'email', // Unique lookups
    'active', // Status filtering
    'createdAt', // Date ordering
    ['active', 'role'], // Composite filtering
    ['email', 'emailVerified'], // Email validation queries
  ],
})

// ✅ Good: Batch operations when possible
const createMultipleUsers = async (users: CreateUserData[]) => {
  const batchSize = 100
  const results = []

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(user => userRepository.create(user)))
    results.push(...batchResults)
  }

  return results
}

// ✅ Good: Efficient relationship loading
const getUserDashboard = async (userId: string) => {
  // Load user with all required relationships in one query
  return userRepository.with(['profile', 'posts', 'sessions']).find(userId)
}

// ❌ Avoid: N+1 queries
const inefficientGetUsers = async () => {
  const users = await userRepository.findMany()

  for (const user of users.value || []) {
    // This creates N additional queries!
    const profile = await profileRepository.findOne({ where: { userId: user.id } })
    user.profile = profile.value
  }

  return users
}
```

The Repository API provides a powerful foundation for Kairo's DATA pillar, enabling you to build type-safe, performant data access layers with declarative relationships and comprehensive lifecycle management while maintaining the predictable error handling that makes Kairo applications reliable and maintainable.
