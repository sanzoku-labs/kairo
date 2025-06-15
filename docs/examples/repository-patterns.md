# Repository Patterns

Learn how to use Kairo's repository system for type-safe data access with relationships and lifecycle hooks.

## Basic Repository Setup

```typescript
import { repository, nativeSchema, hasMany, hasOne, belongsTo } from 'kairo'

// Define schemas
const UserSchema = nativeSchema.object({
  id: nativeSchema.number(),
  name: nativeSchema.string().min(1),
  email: nativeSchema.string().email(),
  age: nativeSchema.number().min(0),
  isActive: nativeSchema.boolean().default(true),
  createdAt: nativeSchema.string().optional(),
  updatedAt: nativeSchema.string().optional(),
})

const PostSchema = nativeSchema.object({
  id: nativeSchema.number(),
  title: nativeSchema.string().min(1),
  content: nativeSchema.string(),
  userId: nativeSchema.number(),
  publishedAt: nativeSchema.string().optional(),
  createdAt: nativeSchema.string().optional(),
  updatedAt: nativeSchema.string().optional(),
})

const ProfileSchema = nativeSchema.object({
  id: nativeSchema.number(),
  userId: nativeSchema.number(),
  bio: nativeSchema.string().optional(),
  avatar: nativeSchema.string().optional(),
  website: nativeSchema.string().optional(),
})

// Create repositories with relationships
const userRepository = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  timestamps: true,
  relationships: {
    posts: hasMany('posts', 'userId', PostSchema),
    profile: hasOne('profile', 'userId', ProfileSchema),
  },
  hooks: {
    beforeCreate: data => ({ ...data, slug: slugify(data.name) }),
    afterCreate: user => console.log(`User ${user.name} created`),
  },
})

const postRepository = repository('posts', {
  schema: PostSchema,
  storage: 'memory',
  timestamps: true,
  relationships: {
    author: belongsTo('users', 'userId', UserSchema),
  },
})

const profileRepository = repository('profiles', {
  schema: ProfileSchema,
  storage: 'memory',
  timestamps: true,
  relationships: {
    user: belongsTo('users', 'userId', UserSchema),
  },
})
```

## CRUD Operations

### Creating Records

```typescript
// Create a user
const createUserResult = await userRepository.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  isActive: true,
})

createUserResult.match({
  Ok: user => {
    console.log('User created:', user)
    // user includes timestamps: createdAt, updatedAt
  },
  Err: error => {
    console.error('Failed to create user:', error.message)
  },
})

// Create related records
const createPostResult = await postRepository.create({
  title: 'My First Post',
  content: 'This is the content of my first post.',
  userId: 1, // Reference to user
})
```

### Reading Records

```typescript
// Find by ID
const userResult = await userRepository.find(1)
userResult.match({
  Ok: user => {
    if (user) {
      console.log('Found user:', user.name)
    } else {
      console.log('User not found')
    }
  },
  Err: error => console.error('Query failed:', error),
})

// Find many with filtering
const activeUsersResult = await userRepository.findMany({
  where: { isActive: true },
  orderBy: [{ field: 'createdAt', direction: 'desc' }],
  limit: 10,
})

// Find one with specific criteria
const userByEmailResult = await userRepository.findOne({
  where: { email: 'john@example.com' },
})

// Check existence
const existsResult = await userRepository.exists(1)

// Count records
const countResult = await userRepository.count({
  where: { isActive: true },
})
```

### Updating Records

```typescript
// Update single record
const updateResult = await userRepository.update(1, {
  name: 'John Updated',
  age: 31,
})

updateResult.match({
  Ok: user => console.log('User updated:', user.name),
  Err: error => console.error('Update failed:', error),
})

// Update multiple records
const updateManyResult = await userRepository.updateMany(
  { isActive: false },
  { where: { age: { $lt: 18 } } }
)
```

### Deleting Records

```typescript
// Delete single record
const deleteResult = await userRepository.delete(1)

deleteResult.match({
  Ok: () => console.log('User deleted'),
  Err: error => console.error('Delete failed:', error),
})

// Delete multiple records
const deleteManyResult = await userRepository.deleteMany({
  where: { isActive: false },
})
```

## Working with Relationships

### Loading Relationships

```typescript
// Load user with posts
const userWithPostsResult = await userRepository.with('posts').find(1)

userWithPostsResult.match({
  Ok: user => {
    if (user) {
      console.log(`User ${user.name} has ${user.posts.length} posts`)
      user.posts.forEach(post => {
        console.log(`- ${post.title}`)
      })
    }
  },
  Err: error => console.error('Failed to load user with posts:', error),
})

// Load multiple relationships
const userWithAllDataResult = await userRepository.with(['posts', 'profile']).find(1)

// Chain relationship loading
const userWithEverything = await userRepository.with('posts').with('profile').find(1)
```

### Querying Related Data

```typescript
// Find posts by specific user
const userPostsResult = await postRepository.findMany({
  where: { userId: 1 },
  orderBy: [{ field: 'publishedAt', direction: 'desc' }],
})

// Complex relationship queries
const publishedPostsResult = await postRepository.findMany({
  where: {
    userId: 1,
    publishedAt: { $ne: null },
  },
})
```

## Lifecycle Hooks

### Before/After Hooks

```typescript
const userRepositoryWithHooks = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  hooks: {
    beforeCreate: async data => {
      // Validate business rules
      if (await emailExists(data.email)) {
        throw new Error('Email already exists')
      }

      // Transform data
      return {
        ...data,
        slug: slugify(data.name),
        emailVerified: false,
      }
    },

    afterCreate: async user => {
      // Send welcome email
      await sendWelcomeEmail(user.email)

      // Create default profile
      await profileRepository.create({
        userId: user.id,
        bio: `Hello, I'm ${user.name}!`,
      })

      // Log user creation
      console.log(`New user registered: ${user.email}`)
    },

    beforeUpdate: async (id, data) => {
      // Audit changes
      const existingUser = await userRepository.find(id)
      if (Result.isOk(existingUser) && existingUser.value) {
        logUserChange(existingUser.value, data)
      }

      return data
    },

    afterUpdate: async user => {
      // Invalidate cache
      await clearUserCache(user.id)

      // Update search index
      await updateSearchIndex(user)
    },

    beforeDelete: async id => {
      // Check dependencies
      const posts = await postRepository.findMany({ where: { userId: id } })
      if (Result.isOk(posts) && posts.value.length > 0) {
        throw new Error('Cannot delete user with existing posts')
      }

      // Cleanup related data
      await profileRepository.deleteMany({ where: { userId: id } })
    },

    afterDelete: async id => {
      // Log deletion
      console.log(`User ${id} deleted`)

      // Clear caches
      await clearUserCache(id)
    },
  },
})
```

## Advanced Query Patterns

### Complex Filtering

```typescript
// Advanced where conditions
const complexQuery = await userRepository.findMany({
  where: {
    age: { $gte: 18, $lte: 65 },
    isActive: true,
    email: { $like: '%@company.com' },
    createdAt: { $gte: '2023-01-01' },
  },
  orderBy: [
    { field: 'age', direction: 'asc' },
    { field: 'name', direction: 'asc' },
  ],
  limit: 50,
  offset: 100,
})

// Find users with specific posts
const activeAuthorsResult = await userRepository.findMany({
  where: {
    isActive: true,
    // Custom query logic
  },
})
```

### Pagination

```typescript
async function getPaginatedUsers(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize

  const [usersResult, countResult] = await Promise.all([
    userRepository.findMany({
      limit: pageSize,
      offset,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    }),
    userRepository.count(),
  ])

  if (Result.isOk(usersResult) && Result.isOk(countResult)) {
    return {
      users: usersResult.value,
      total: countResult.value,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.value / pageSize),
    }
  }

  throw new Error('Failed to fetch paginated users')
}
```

## Custom Storage Adapters

### Database Adapter Example

```typescript
import { StorageAdapter, Result, RepositoryError } from 'kairo'

class DatabaseAdapter<T extends Record<string, unknown>> implements StorageAdapter<T> {
  constructor(
    private db: Database,
    private tableName: string,
    private primaryKey: string = 'id'
  ) {}

  async create(data: T): Promise<Result<RepositoryError, T>> {
    try {
      const result = await this.db
        .insertInto(this.tableName)
        .values(data)
        .returningAll()
        .executeTakeFirst()

      return Result.Ok(result as T)
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Failed to create record',
          'create',
          this.tableName,
          undefined,
          error as Error
        )
      )
    }
  }

  async find(id: string | number): Promise<Result<RepositoryError, T | null>> {
    try {
      const result = await this.db
        .selectFrom(this.tableName)
        .selectAll()
        .where(this.primaryKey, '=', id)
        .executeTakeFirst()

      return Result.Ok((result as T) || null)
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Failed to find record',
          'find',
          this.tableName,
          String(id),
          error as Error
        )
      )
    }
  }

  // Implement other methods...
}

// Use custom adapter
const userRepository = repository('users', {
  schema: UserSchema,
  storage: new DatabaseAdapter(db, 'users'),
  relationships: {
    posts: hasMany('posts', 'userId', PostSchema),
  },
})
```

### Redis Cache Adapter

```typescript
class RedisCacheAdapter<T extends Record<string, unknown>> implements StorageAdapter<T> {
  constructor(
    private redis: RedisClient,
    private keyPrefix: string,
    private ttl: number = 3600
  ) {}

  async create(data: T): Promise<Result<RepositoryError, T>> {
    try {
      const id = generateId()
      const record = { ...data, id }
      const key = `${this.keyPrefix}:${id}`

      await this.redis.setex(key, this.ttl, JSON.stringify(record))

      return Result.Ok(record)
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Failed to create record in cache',
          'create',
          this.keyPrefix,
          undefined,
          error as Error
        )
      )
    }
  }

  async find(id: string | number): Promise<Result<RepositoryError, T | null>> {
    try {
      const key = `${this.keyPrefix}:${id}`
      const data = await this.redis.get(key)

      if (!data) return Result.Ok(null)

      const record = JSON.parse(data) as T
      return Result.Ok(record)
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Failed to find record in cache',
          'find',
          this.keyPrefix,
          String(id),
          error as Error
        )
      )
    }
  }

  // Implement other methods...
}
```

## Pipeline Integration

```typescript
import { pipeline } from 'kairo'

// Repository operations in pipelines
const createUserPipeline = pipeline('create-user')
  .input(
    nativeSchema.object({
      name: nativeSchema.string(),
      email: nativeSchema.string().email(),
      age: nativeSchema.number(),
    })
  )
  .validateAllRules(userValidationRules)
  .run(async userData => {
    // Create user
    const userResult = await userRepository.create(userData)
    if (Result.isErr(userResult)) {
      throw new Error(`Failed to create user: ${userResult.error.message}`)
    }

    return userResult.value
  })
  .run(async user => {
    // Create default profile
    await profileRepository.create({
      userId: user.id,
      bio: `Hello, I'm ${user.name}!`,
    })

    return user
  })
  .trace('user-creation')

// Execute pipeline
const result = await createUserPipeline.run({
  name: 'Jane Doe',
  email: 'jane@example.com',
  age: 28,
})
```

## Testing Repositories

```typescript
import { describe, it, expect, beforeEach } from 'vitest'

describe('User Repository', () => {
  let userRepo: ReturnType<typeof repository>

  beforeEach(() => {
    userRepo = repository('users', {
      schema: UserSchema,
      storage: 'memory', // Use in-memory storage for tests
      timestamps: true,
    })
  })

  it('should create a user successfully', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      age: 25,
      isActive: true,
    }

    const result = await userRepo.create(userData)

    expect(Result.isOk(result)).toBe(true)
    if (Result.isOk(result)) {
      expect(result.value.name).toBe('Test User')
      expect(result.value.email).toBe('test@example.com')
      expect(result.value).toHaveProperty('createdAt')
      expect(result.value).toHaveProperty('updatedAt')
    }
  })

  it('should validate data before creation', async () => {
    const invalidData = {
      name: '', // Invalid: empty string
      email: 'invalid-email', // Invalid: not an email
      age: -5, // Invalid: negative age
      isActive: true,
    }

    const result = await userRepo.create(invalidData as any)

    expect(Result.isErr(result)).toBe(true)
    if (Result.isErr(result)) {
      expect(result.error.code).toBe('REPOSITORY_ERROR')
    }
  })

  it('should handle relationships correctly', async () => {
    const userWithRelations = repository('users', {
      schema: UserSchema,
      storage: 'memory',
      relationships: {
        posts: hasMany('posts', 'userId', PostSchema),
      },
    })

    const userData = {
      name: 'User with Posts',
      email: 'user@example.com',
      age: 30,
      isActive: true,
    }

    const userResult = await userWithRelations.create(userData)
    expect(Result.isOk(userResult)).toBe(true)

    if (Result.isOk(userResult)) {
      const userWithPosts = await userWithRelations.with('posts').find(userResult.value.id)
      expect(Result.isOk(userWithPosts)).toBe(true)
    }
  })
})
```

## Best Practices

### Repository Organization

```typescript
// repositories/index.ts
export { userRepository } from './user'
export { postRepository } from './post'
export { profileRepository } from './profile'

// repositories/user.ts
export const userRepository = repository('users', {
  schema: UserSchema,
  storage: process.env.NODE_ENV === 'test' ? 'memory' : databaseAdapter,
  relationships: {
    posts: hasMany('posts', 'userId', PostSchema),
    profile: hasOne('profile', 'userId', ProfileSchema),
  },
  hooks: userHooks,
})

// services/user.ts
import { userRepository } from '../repositories'

export class UserService {
  async createUser(data: CreateUserData) {
    const result = await userRepository.create(data)
    if (Result.isErr(result)) {
      throw new Error(`Failed to create user: ${result.error.message}`)
    }
    return result.value
  }

  async getUserWithPosts(id: number) {
    const result = await userRepository.with('posts').find(id)
    if (Result.isErr(result)) {
      throw new Error(`Failed to find user: ${result.error.message}`)
    }
    return result.value
  }
}
```

### Error Handling Patterns

```typescript
// Helper for unwrapping repository results
export async function unwrapRepository<T>(
  operation: Promise<Result<RepositoryError, T>>
): Promise<T> {
  const result = await operation
  if (Result.isErr(result)) {
    throw new Error(`Repository operation failed: ${result.error.message}`)
  }
  return result.value
}

// Usage in services
export class UserService {
  async createUser(data: CreateUserData) {
    try {
      return await unwrapRepository(userRepository.create(data))
    } catch (error) {
      console.error('Failed to create user:', error)
      throw error
    }
  }
}
```

Repository patterns provide a powerful, type-safe way to manage data access in Kairo applications. They integrate seamlessly with the framework's declarative philosophy while providing the flexibility to work with different storage backends and complex relationships.
