import { describe, test, expect, beforeEach } from 'vitest'
import {
  repository,
  hasOne,
  hasMany,
  belongsTo,
  MemoryStorageAdapter,
  createRepositoryError,
} from '../src/core/repository'
import { schema } from '../src'
import { Result } from '../src/core/result'

// Test schemas
const UserSchema = schema.object({
  id: schema.number(),
  name: schema.string().min(1),
  email: schema.string().email(),
  age: schema.number().min(0),
  isActive: schema.boolean().default(true),
})

const PostSchema = schema.object({
  id: schema.number(),
  title: schema.string().min(1),
  content: schema.string(),
  userId: schema.number(),
  publishedAt: schema.string().optional(),
})

const ProfileSchema = schema.object({
  id: schema.number(),
  userId: schema.number(),
  bio: schema.string().optional(),
  avatar: schema.string().optional(),
})

type User = {
  id: number
  name: string
  email: string
  age: number
  isActive: boolean
}

// type Post = {
//   id: number
//   title: string
//   content: string
//   userId: number
//   publishedAt?: string
// }
//
// type Profile = {
//   id: number
//   userId: number
//   bio?: string
//   avatar?: string
// }

describe('Repository System', () => {
  describe('Basic Repository Operations', () => {
    let userRepo: ReturnType<typeof repository<User>>

    beforeEach(() => {
      userRepo = repository('users', {
        schema: UserSchema,
        storage: 'memory',
        timestamps: true,
      })
    })

    test('should create a repository with correct configuration', () => {
      expect(userRepo.name).toBe('users')
      expect(userRepo.schema).toBe(UserSchema)
    })

    test('should create a record successfully', async () => {
      const userData = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
      }

      const result = await userRepo.create(userData)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.id).toBe(1)
        expect(result.value.name).toBe('John Doe')
        expect(result.value.email).toBe('john@example.com')
        expect(result.value).toHaveProperty('createdAt')
        expect(result.value).toHaveProperty('updatedAt')
      }
    })

    test('should validate data before creation', async () => {
      const invalidData = {
        id: 1,
        name: '', // Invalid: empty string
        email: 'invalid-email', // Invalid: not an email
        age: -5, // Invalid: negative age
        isActive: true,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      const result = await userRepo.create(invalidData as any)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.code).toBe('REPOSITORY_ERROR')
        expect(result.error.context.operation).toBe('create')
      }
    })

    test('should find a record by id', async () => {
      const userData = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
      }

      await userRepo.create(userData)
      const result = await userRepo.find(1)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value?.id).toBe(1)
        expect(result.value?.name).toBe('John Doe')
      }
    })

    test('should return null for non-existent record', async () => {
      const result = await userRepo.find(999)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBeNull()
      }
    })

    test('should find multiple records with options', async () => {
      const users = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, isActive: true },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, isActive: true },
        { id: 3, name: 'Bob Wilson', email: 'bob@example.com', age: 35, isActive: false },
      ]

      for (const user of users) {
        await userRepo.create(user)
      }

      // Test basic findMany
      const allResult = await userRepo.findMany()
      expect(Result.isOk(allResult)).toBe(true)
      if (Result.isOk(allResult)) {
        expect(allResult.value).toHaveLength(3)
      }

      // Test with where clause
      const activeResult = await userRepo.findMany({ where: { isActive: true } })
      expect(Result.isOk(activeResult)).toBe(true)
      if (Result.isOk(activeResult)) {
        expect(activeResult.value).toHaveLength(2)
        expect(activeResult.value.every(u => u.isActive)).toBe(true)
      }

      // Test with limit
      const limitedResult = await userRepo.findMany({ limit: 2 })
      expect(Result.isOk(limitedResult)).toBe(true)
      if (Result.isOk(limitedResult)) {
        expect(limitedResult.value).toHaveLength(2)
      }

      // Test with ordering
      const orderedResult = await userRepo.findMany({
        orderBy: [{ field: 'age', direction: 'desc' }],
      })
      expect(Result.isOk(orderedResult)).toBe(true)
      if (Result.isOk(orderedResult)) {
        expect(orderedResult.value[0]?.age).toBe(35)
        expect(orderedResult.value[1]?.age).toBe(30)
        expect(orderedResult.value[2]?.age).toBe(25)
      }
    })

    test('should find one record with where clause', async () => {
      const userData = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
      }

      await userRepo.create(userData)
      const result = await userRepo.findOne({ where: { email: 'john@example.com' } })

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value?.email).toBe('john@example.com')
      }
    })

    test('should update a record', async () => {
      const userData = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
      }

      await userRepo.create(userData)
      const updateResult = await userRepo.update(1, { name: 'John Updated', age: 31 })

      expect(Result.isOk(updateResult)).toBe(true)
      if (Result.isOk(updateResult)) {
        expect(updateResult.value.name).toBe('John Updated')
        expect(updateResult.value.age).toBe(31)
        expect(updateResult.value.email).toBe('john@example.com') // Unchanged
        expect(updateResult.value).toHaveProperty('updatedAt')
      }
    })

    test('should update multiple records', async () => {
      const users = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, isActive: true },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, isActive: true },
        { id: 3, name: 'Bob Wilson', email: 'bob@example.com', age: 35, isActive: false },
      ]

      for (const user of users) {
        await userRepo.create(user)
      }

      const updateResult = await userRepo.updateMany(
        { isActive: false },
        { where: { isActive: true } }
      )

      expect(Result.isOk(updateResult)).toBe(true)
      if (Result.isOk(updateResult)) {
        expect(updateResult.value).toHaveLength(2)
        expect(updateResult.value.every(u => !u.isActive)).toBe(true)
      }
    })

    test('should delete a record', async () => {
      const userData = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
      }

      const createResult = await userRepo.create(userData)
      expect(Result.isOk(createResult)).toBe(true)

      const deleteResult = await userRepo.delete(1)

      if (Result.isErr(deleteResult)) {
        console.log('Delete error:', deleteResult.error)
      }

      expect(Result.isOk(deleteResult)).toBe(true)

      const findResult = await userRepo.find(1)
      expect(Result.isOk(findResult)).toBe(true)
      if (Result.isOk(findResult)) {
        expect(findResult.value).toBeNull()
      }
    })

    test('should delete multiple records', async () => {
      const users = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, isActive: true },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, isActive: true },
        { id: 3, name: 'Bob Wilson', email: 'bob@example.com', age: 35, isActive: false },
      ]

      for (const user of users) {
        await userRepo.create(user)
      }

      const deleteResult = await userRepo.deleteMany({ where: { isActive: true } })
      expect(Result.isOk(deleteResult)).toBe(true)

      const remainingResult = await userRepo.findMany()
      expect(Result.isOk(remainingResult)).toBe(true)
      if (Result.isOk(remainingResult)) {
        expect(remainingResult.value).toHaveLength(1)
        expect(remainingResult.value[0]?.isActive).toBe(false)
      }
    })

    test('should check if record exists', async () => {
      const userData = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
      }

      const existsBefore = await userRepo.exists(1)
      expect(Result.isOk(existsBefore)).toBe(true)
      if (Result.isOk(existsBefore)) {
        expect(existsBefore.value).toBe(false)
      }

      await userRepo.create(userData)

      const existsAfter = await userRepo.exists(1)
      expect(Result.isOk(existsAfter)).toBe(true)
      if (Result.isOk(existsAfter)) {
        expect(existsAfter.value).toBe(true)
      }
    })

    test('should count records', async () => {
      const users = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, isActive: true },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, isActive: true },
        { id: 3, name: 'Bob Wilson', email: 'bob@example.com', age: 35, isActive: false },
      ]

      for (const user of users) {
        await userRepo.create(user)
      }

      const totalCount = await userRepo.count()
      expect(Result.isOk(totalCount)).toBe(true)
      if (Result.isOk(totalCount)) {
        expect(totalCount.value).toBe(3)
      }

      const activeCount = await userRepo.count({ where: { isActive: true } })
      expect(Result.isOk(activeCount)).toBe(true)
      if (Result.isOk(activeCount)) {
        expect(activeCount.value).toBe(2)
      }
    })
  })

  describe('Repository Relationships', () => {
    test('should define relationships correctly', () => {
      const userRepo = repository('users', {
        schema: UserSchema,
        storage: 'memory',
        relationships: {
          posts: hasMany('posts', 'userId', PostSchema),
          profile: hasOne('profile', 'userId', ProfileSchema),
        },
      })

      expect(userRepo.relationships.posts.type).toBe('hasMany')
      expect(userRepo.relationships.posts.entity).toBe('posts')
      expect(userRepo.relationships.posts.foreignKey).toBe('userId')

      expect(userRepo.relationships.profile.type).toBe('hasOne')
      expect(userRepo.relationships.profile.entity).toBe('profile')
      expect(userRepo.relationships.profile.foreignKey).toBe('userId')
    })

    test('should create repository with relationships', () => {
      const postRepo = repository('posts', {
        schema: PostSchema,
        storage: 'memory',
        relationships: {
          author: belongsTo('users', 'userId', UserSchema),
        },
      })

      expect(postRepo.relationships.author.type).toBe('belongsTo')
      expect(postRepo.relationships.author.entity).toBe('users')
      expect(postRepo.relationships.author.foreignKey).toBe('userId')
    })

    test('should return repository with relationship loading enabled', () => {
      const userRepo = repository('users', {
        schema: UserSchema,
        storage: 'memory',
        relationships: {
          posts: hasMany('posts', 'userId', PostSchema),
          profile: hasOne('profile', 'userId', ProfileSchema),
        },
      })

      const repoWithPosts = userRepo.with('posts')
      expect(repoWithPosts.name).toBe('users')
      expect(repoWithPosts.schema).toBe(UserSchema)

      const repoWithMultiple = userRepo.with(['posts', 'profile'])
      expect(repoWithMultiple.name).toBe('users')
    })
  })

  describe('Repository Hooks', () => {
    test('should execute hooks during operations', async () => {
      let beforeCreateCalled = false
      let afterCreateCalled = false
      let beforeUpdateCalled = false
      let afterUpdateCalled = false

      const userRepo = repository('users', {
        schema: UserSchema,
        storage: 'memory',
        hooks: {
          beforeCreate: (data: { name: string; email: string; age: number; isActive: boolean }) => {
            beforeCreateCalled = true
            return { ...data, name: data.name.toUpperCase() }
          },
          afterCreate: _data => {
            afterCreateCalled = true
          },
          beforeUpdate: (_id, data) => {
            beforeUpdateCalled = true
            return data
          },
          afterUpdate: _data => {
            afterUpdateCalled = true
          },
        },
      })

      const userData = {
        id: 1,
        name: 'john doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
      }

      const createResult = await userRepo.create(userData)
      expect(Result.isOk(createResult)).toBe(true)
      expect(beforeCreateCalled).toBe(true)
      expect(afterCreateCalled).toBe(true)
      if (Result.isOk(createResult)) {
        expect(createResult.value.name).toBe('JOHN DOE')
      }

      const updateResult = await userRepo.update(1, { age: 31 })
      expect(Result.isOk(updateResult)).toBe(true)
      expect(beforeUpdateCalled).toBe(true)
      expect(afterUpdateCalled).toBe(true)
    })
  })

  describe('Storage Adapters', () => {
    test('should work with memory storage adapter', () => {
      const adapter = new MemoryStorageAdapter<User>('id')
      expect(adapter).toBeDefined()
    })

    test('should create memory storage when storage is "memory"', () => {
      const userRepo = repository('users', {
        schema: UserSchema,
        storage: 'memory',
        primaryKey: 'id',
      })

      expect(userRepo.name).toBe('users')
    })
  })

  describe('Error Handling', () => {
    test('should create repository errors correctly', () => {
      const error = createRepositoryError('Test error', 'create', 'users', '123')

      expect(error.code).toBe('REPOSITORY_ERROR')
      expect(error.message).toBe('Test error')
      expect(error.context.operation).toBe('create')
      expect(error.context.entity).toBe('users')
      expect(error.context.identifier).toBe('123')
    })

    test('should handle validation errors', async () => {
      const userRepo = repository('users', {
        schema: UserSchema,
        storage: 'memory',
      })

      const invalidData = {
        id: 'not-a-number', // Invalid type
        name: '',
        email: 'invalid',
        age: -1,
        isActive: true,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      const result = await userRepo.create(invalidData as any)
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.code).toBe('REPOSITORY_ERROR')
        expect(result.error.context.operation).toBe('create')
      }
    })

    test('should handle not found errors on update', async () => {
      const userRepo = repository('users', {
        schema: UserSchema,
        storage: 'memory',
      })

      const result = await userRepo.update(999, { name: 'Updated' })
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.code).toBe('REPOSITORY_ERROR')
        expect(result.error.context.operation).toBe('update')
      }
    })

    test('should handle not found errors on delete', async () => {
      const userRepo = repository('users', {
        schema: UserSchema,
        storage: 'memory',
      })

      const result = await userRepo.delete(999)
      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.code).toBe('REPOSITORY_ERROR')
        expect(result.error.context.operation).toBe('delete')
      }
    })
  })

  describe('Custom Timestamps', () => {
    test('should use custom timestamp field names', async () => {
      const userRepo = repository('users', {
        schema: UserSchema,
        storage: 'memory',
        timestamps: {
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      })

      const userData = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
      }

      const result = await userRepo.create(userData)
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toHaveProperty('created_at')
        expect(result.value).toHaveProperty('updated_at')
      }
    })
  })
})
