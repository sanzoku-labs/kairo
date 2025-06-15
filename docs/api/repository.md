# Repository API

The Repository API provides a declarative, type-safe data access layer as part of Kairo's DATA pillar.

## Overview

Repositories eliminate data access boilerplate by providing a declarative interface for CRUD operations, relationships, and data validation. They integrate seamlessly with Kairo's native schema system and Result types.

## Basic Usage

```typescript
import { repository, nativeSchema, hasMany, hasOne } from 'kairo'

const UserSchema = nativeSchema.object({
  id: nativeSchema.number(),
  name: nativeSchema.string().min(1),
  email: nativeSchema.string().email(),
  age: nativeSchema.number().min(0),
  isActive: nativeSchema.boolean().default(true),
})

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

// Create a user
const result = await userRepository.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
})

result.match({
  Ok: user => console.log('User created:', user),
  Err: error => console.error('Failed to create user:', error),
})
```

## API Reference

### `repository(name, config)`

Creates a new repository instance.

**Parameters:**

- `name: string` - Repository name
- `config: RepositoryConfig<T, R>` - Repository configuration

**Returns:** `Repository<T, R>`

### Repository Configuration

```typescript
interface RepositoryConfig<T, R extends Relations> {
  schema: Schema<T>
  storage: StorageAdapter<T> | 'memory' | 'database' | 'file'
  primaryKey?: string
  timestamps?: boolean | { createdAt: string; updatedAt: string }
  indexes?: string[]
  relationships?: R
  hooks?: RepositoryHooks<T>
}
```

#### Storage Options

- `'memory'` - In-memory storage (default)
- `'database'` - Database storage (requires configuration)
- `'file'` - File-based storage
- Custom `StorageAdapter<T>` - Custom storage implementation

#### Timestamps

```typescript
// Boolean flag (uses default field names)
timestamps: true // adds 'createdAt' and 'updatedAt'

// Custom field names
timestamps: {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}
```

### CRUD Operations

#### `create(data)`

Creates a new record.

```typescript
const result = await repository.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
})
```

**Returns:** `Promise<Result<RepositoryError, T>>`

#### `find(id)`

Finds a record by ID.

```typescript
const result = await repository.find(1)
```

**Returns:** `Promise<Result<RepositoryError, T | null>>`

#### `findMany(options?)`

Finds multiple records with optional filtering, ordering, and pagination.

```typescript
const result = await repository.findMany({
  where: { isActive: true },
  orderBy: [{ field: 'createdAt', direction: 'desc' }],
  limit: 10,
  offset: 0,
})
```

**Returns:** `Promise<Result<RepositoryError, T[]>>`

#### `findOne(options)`

Finds a single record matching the criteria.

```typescript
const result = await repository.findOne({
  where: { email: 'john@example.com' },
})
```

**Returns:** `Promise<Result<RepositoryError, T | null>>`

#### `update(id, data)`

Updates a record by ID.

```typescript
const result = await repository.update(1, {
  name: 'John Updated',
  age: 31,
})
```

**Returns:** `Promise<Result<RepositoryError, T>>`

#### `updateMany(data, options?)`

Updates multiple records.

```typescript
const result = await repository.updateMany({ isActive: false }, { where: { age: { $lt: 18 } } })
```

**Returns:** `Promise<Result<RepositoryError, T[]>>`

#### `delete(id)`

Deletes a record by ID.

```typescript
const result = await repository.delete(1)
```

**Returns:** `Promise<Result<RepositoryError, void>>`

#### `deleteMany(options?)`

Deletes multiple records.

```typescript
const result = await repository.deleteMany({
  where: { isActive: false },
})
```

**Returns:** `Promise<Result<RepositoryError, void>>`

### Query Operations

#### `exists(id)`

Checks if a record exists.

```typescript
const result = await repository.exists(1)
```

**Returns:** `Promise<Result<RepositoryError, boolean>>`

#### `count(options?)`

Counts records matching the criteria.

```typescript
const result = await repository.count({
  where: { isActive: true },
})
```

**Returns:** `Promise<Result<RepositoryError, number>>`

### Relationships

#### Defining Relationships

```typescript
import { hasOne, hasMany, belongsTo } from 'kairo'

const userRepository = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  relationships: {
    // One-to-many: User has many Posts
    posts: hasMany('posts', 'userId', PostSchema),

    // One-to-one: User has one Profile
    profile: hasOne('profile', 'userId', ProfileSchema),

    // Many-to-one: Post belongs to User
    author: belongsTo('users', 'userId', UserSchema),
  },
})
```

#### Loading Relationships

```typescript
// Load single relationship
const userWithPosts = await userRepository.with('posts').find(1)

// Load multiple relationships
const userWithAll = await userRepository.with(['posts', 'profile']).find(1)

// Chain relationship loading
const repoWithPosts = userRepository.with('posts')
const userWithEverything = await repoWithPosts.with('profile').find(1)
```

### Lifecycle Hooks

```typescript
const repository = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  hooks: {
    beforeCreate: async data => {
      // Modify data before creation
      return { ...data, slug: slugify(data.name) }
    },

    afterCreate: async user => {
      // Perform actions after creation
      await sendWelcomeEmail(user)
    },

    beforeUpdate: async (id, data) => {
      // Modify data before update
      return { ...data, updatedAt: new Date() }
    },

    afterUpdate: async user => {
      // Perform actions after update
      await invalidateCache(user.id)
    },

    beforeDelete: async id => {
      // Perform actions before deletion
      await cleanupUserData(id)
    },

    afterDelete: async id => {
      // Perform actions after deletion
      await logUserDeletion(id)
    },
  },
})
```

### Query Options

```typescript
interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string | Array<{ field: string; direction: 'asc' | 'desc' }>
  where?: Record<string, unknown>
}

// Examples
await repository.findMany({
  where: { isActive: true, age: { $gte: 18 } },
  orderBy: [
    { field: 'createdAt', direction: 'desc' },
    { field: 'name', direction: 'asc' },
  ],
  limit: 20,
  offset: 40,
})
```

### Storage Adapters

#### Memory Storage Adapter

```typescript
import { MemoryStorageAdapter } from 'kairo'

const adapter = new MemoryStorageAdapter<User>('id')

const repository = repository('users', {
  schema: UserSchema,
  storage: adapter,
})
```

#### Custom Storage Adapter

```typescript
import { StorageAdapter, Result, RepositoryError } from 'kairo'

class DatabaseAdapter<T> implements StorageAdapter<T> {
  async create(data: T): Promise<Result<RepositoryError, T>> {
    // Custom database logic
  }

  async find(id: string | number): Promise<Result<RepositoryError, T | null>> {
    // Custom database logic
  }

  // Implement other methods...
}

const repository = repository('users', {
  schema: UserSchema,
  storage: new DatabaseAdapter<User>(),
})
```

## Pipeline Integration

Repositories integrate seamlessly with pipelines:

```typescript
const createUser = pipeline('create-user')
  .input(CreateUserSchema)
  .validateAllRules(userRules)
  .run(async userData => {
    return await userRepository.create(userData)
  })
  .trace('user-creation')

// Using repository in pipeline transformations
const processUsers = pipeline('process-users')
  .input(UserArraySchema)
  .map(async users => {
    const results = await Promise.all(users.map(user => userRepository.create(user)))
    return results.filter(Result.isOk).map(r => r.value)
  })
```

## Validation Integration

Repositories automatically validate data using the configured schema:

```typescript
// This will fail validation
const result = await userRepository.create({
  name: '', // Too short
  email: 'invalid-email', // Invalid format
  age: -5, // Negative age
})

if (Result.isErr(result)) {
  console.error('Validation error:', result.error.message)
}
```

## Error Handling

Repository operations return detailed error information:

```typescript
const result = await userRepository.find(999)

if (Result.isErr(result)) {
  console.error('Repository error:', {
    code: result.error.code, // 'REPOSITORY_ERROR'
    operation: result.error.context.operation, // 'find'
    entity: result.error.context.entity, // 'users'
    identifier: result.error.context.identifier, // '999'
  })
}
```

## Type Safety

Repositories maintain complete type safety:

```typescript
// TypeScript infers User type
const userResult = await userRepository.create({
  name: 'John',
  email: 'john@example.com',
  age: 30,
})

if (Result.isOk(userResult)) {
  // userResult.value is typed as User
  console.log(userResult.value.name) // ✅ Type-safe access
}

// Relationship loading maintains type safety
const userWithPosts = await userRepository.with('posts').find(1)
if (Result.isOk(userWithPosts) && userWithPosts.value) {
  // userWithPosts.value.posts is typed as Post[]
  console.log(userWithPosts.value.posts.length) // ✅ Type-safe
}
```

## Best Practices

### Repository Organization

```typescript
// repositories/user.ts
export const userRepository = repository('users', {
  schema: UserSchema,
  storage: 'database',
  relationships: {
    posts: hasMany('posts', 'userId', PostSchema),
  },
})

// services/user.ts
export const userService = {
  async createUser(data: CreateUserData) {
    return await userRepository.create(data)
  },

  async getUserWithPosts(id: number) {
    return await userRepository.with('posts').find(id)
  },
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

// Usage
try {
  const user = await unwrapRepository(userRepository.find(1))
  console.log('User found:', user)
} catch (error) {
  console.error('Failed to find user:', error)
}
```
