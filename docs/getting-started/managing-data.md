# Managing Data with Kairo

**Goal**: Master the DATA pillar - model, validate, store, and retrieve data with relationships.  
**Perfect for**: Developers building applications that manage persistent data and complex relationships.

## 🎯 What You'll Learn

By the end of this guide, you'll know how to:
- ✅ Model complex data structures with relationships
- ✅ Store and retrieve data safely
- ✅ Handle data validation and business rules
- ✅ Work with related data (users, posts, comments, etc.)

**Prerequisites**: Complete [Your First App](./your-first-app) or familiar with `Result`, `schema`, and `pipeline`.

## 🚀 Quick Start

### Import What You Need
```typescript
// Essential functions for data management
import { 
  Result, schema, repository, 
  hasMany, hasOne, belongsTo 
} from 'kairo/tier1'
```

**Added functions**: `repository`, `hasMany`, `hasOne`, `belongsTo` (4 new functions total: 11)

## 🌟 Core Pattern: Type-Safe Data Persistence

### Problem: "I want to store and retrieve data safely"

```typescript
// 1. Define your data structure
const UserSchema = schema.object({
  id: schema.number(),
  name: schema.string().min(2),
  email: schema.string().email(),
  age: schema.number().min(0).max(150),
  isActive: schema.boolean().default(true),
  createdAt: schema.string().optional(),
  updatedAt: schema.string().optional()
})

// 2. Create a repository for managing users
const userRepository = repository('users', {
  schema: UserSchema,
  storage: 'memory', // In-memory for this example
  timestamps: true   // Automatically add createdAt/updatedAt
})

// 3. Create, read, update, delete - all type-safe!
const createResult = await userRepository.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  isActive: true
})

Result.match(createResult, {
  Ok: user => {
    console.log('✅ User created:', user.id)
    console.log('Created at:', user.createdAt) // Added automatically
  },
  Err: error => {
    console.error('❌ Creation failed:', error.message)
  }
})
```

**🎓 Key Benefits**:
- **Type Safety**: All operations are fully typed
- **Validation**: Data validated against schema before storage
- **Automatic Timestamps**: Created/updated timestamps handled automatically
- **Error Handling**: Database errors handled gracefully

### Complete CRUD Operations

```typescript
// CREATE
const newUser = await userRepository.create({
  name: 'Jane Smith',
  email: 'jane@example.com',
  age: 28,
  isActive: true
})

// READ - Find by ID
const userResult = await userRepository.find(1)
Result.match(userResult, {
  Ok: user => {
    if (user) {
      console.log('Found user:', user.name)
    } else {
      console.log('User not found')
    }
  },
  Err: error => console.error('Find failed:', error)
})

// READ - Find many with criteria
const activeUsersResult = await userRepository.findMany({
  where: { isActive: true },
  orderBy: [{ field: 'createdAt', direction: 'desc' }],
  limit: 10
})

// UPDATE
const updateResult = await userRepository.update(1, {
  name: 'Jane Updated',
  age: 29
})

// DELETE
const deleteResult = await userRepository.delete(1)
```

## 🔗 Modeling Relationships

### Problem: "I need to model related data (users have posts, posts have comments)"

```typescript
// Define all your schemas first
const PostSchema = schema.object({
  id: schema.number(),
  title: schema.string().min(1),
  content: schema.string(),
  userId: schema.number(), // Foreign key to user
  publishedAt: schema.string().optional(),
  createdAt: schema.string().optional(),
  updatedAt: schema.string().optional()
})

const CommentSchema = schema.object({
  id: schema.number(),
  content: schema.string().min(1),
  postId: schema.number(), // Foreign key to post
  userId: schema.number(), // Foreign key to user (comment author)
  createdAt: schema.string().optional(),
  updatedAt: schema.string().optional()
})

// Create repositories with relationships
const userRepository = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  timestamps: true,
  relationships: {
    // One user has many posts
    posts: hasMany('posts', 'userId', PostSchema),
    // One user has one profile (example)
    profile: hasOne('profile', 'userId', ProfileSchema)
  }
})

const postRepository = repository('posts', {
  schema: PostSchema,
  storage: 'memory', 
  timestamps: true,
  relationships: {
    // One post belongs to one user
    author: belongsTo('users', 'userId', UserSchema),
    // One post has many comments
    comments: hasMany('comments', 'postId', CommentSchema)
  }
})

const commentRepository = repository('comments', {
  schema: CommentSchema,
  storage: 'memory',
  timestamps: true,
  relationships: {
    // One comment belongs to one post
    post: belongsTo('posts', 'postId', PostSchema),
    // One comment belongs to one user (author)
    author: belongsTo('users', 'userId', UserSchema)
  }
})
```

### Working with Related Data

```typescript
// Create a user and their posts
const userResult = await userRepository.create({
  name: 'Alice Author',
  email: 'alice@example.com',
  age: 32,
  isActive: true
})

if (Result.isOk(userResult)) {
  const user = userResult.value
  
  // Create posts for this user
  await postRepository.create({
    title: 'My First Post',
    content: 'This is my first blog post!',
    userId: user.id,
    publishedAt: new Date().toISOString()
  })
  
  await postRepository.create({
    title: 'Another Great Post',
    content: 'More amazing content here.',
    userId: user.id,
    publishedAt: new Date().toISOString()
  })
}

// Load user with their posts
const userWithPostsResult = await userRepository.with('posts').find(1)

Result.match(userWithPostsResult, {
  Ok: user => {
    if (user) {
      console.log(`User: ${user.name}`)
      console.log(`Posts: ${user.posts.length}`)
      user.posts.forEach(post => {
        console.log(`- ${post.title}`)
      })
    }
  },
  Err: error => console.error('Failed to load user with posts:', error)
})

// Load post with author and comments
const postWithDataResult = await postRepository
  .with(['author', 'comments'])
  .find(1)

Result.match(postWithDataResult, {
  Ok: post => {
    if (post) {
      console.log(`Post: ${post.title}`)
      console.log(`Author: ${post.author.name}`)
      console.log(`Comments: ${post.comments.length}`)
    }
  },
  Err: error => console.error('Failed to load post data:', error)
})
```

## 🔍 Querying and Filtering

### Problem: "I need to find specific data with complex criteria"

```typescript
// Find all published posts by active users
const publishedPostsResult = await postRepository.findMany({
  where: {
    publishedAt: { $ne: null }, // Not null
    // You can also join conditions with relationships
  },
  orderBy: [
    { field: 'publishedAt', direction: 'desc' }
  ],
  limit: 20,
  offset: 0
})

// Find users by email pattern
const gmailUsersResult = await userRepository.findMany({
  where: {
    email: { $like: '%@gmail.com' },
    isActive: true
  }
})

// Count total users
const totalUsersResult = await userRepository.count()

// Check if user exists
const userExistsResult = await userRepository.exists(1)
```

## 🎯 Integration Patterns

### Problem: "I want to combine data operations with API calls"

```typescript
import { pipeline, resource, repository } from 'kairo/tier1'

// Combine API and data operations
const syncUserFromAPI = pipeline('sync-user')
  .input(schema.object({ userId: schema.string() }))
  .run(async ({ userId }) => {
    // 1. Fetch user from external API
    const apiResult = await ExternalUserAPI.get.run({ id: userId })
    if (Result.isErr(apiResult)) {
      throw new Error(`API fetch failed: ${apiResult.error.message}`)
    }
    return apiResult.value
  })
  .run(async (externalUser) => {
    // 2. Check if user exists locally
    const localResult = await userRepository.findOne({
      where: { email: externalUser.email }
    })
    
    if (Result.isOk(localResult) && localResult.value) {
      // Update existing user
      return await userRepository.update(localResult.value.id, {
        name: externalUser.name,
        age: externalUser.age
      })
    } else {
      // Create new user
      return await userRepository.create({
        name: externalUser.name,
        email: externalUser.email,
        age: externalUser.age,
        isActive: true
      })
    }
  })

// Use the sync pipeline
const syncResult = await syncUserFromAPI.run({ userId: '123' })
```

### Problem: "I need lifecycle hooks for data operations"

```typescript
const userRepositoryWithHooks = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  timestamps: true,
  hooks: {
    beforeCreate: async (data) => {
      // Validate business rules before creation
      if (await emailAlreadyExists(data.email)) {
        throw new Error('Email already exists')
      }
      
      // Transform data before saving
      return {
        ...data,
        email: data.email.toLowerCase(),
        name: data.name.trim()
      }
    },
    
    afterCreate: async (user) => {
      console.log(`✅ User created: ${user.email}`)
      
      // Send welcome email
      await EmailAPI.sendWelcome.run({
        email: user.email,
        name: user.name
      })
      
      // Create default settings
      await SettingsRepository.create({
        userId: user.id,
        theme: 'light',
        notifications: true
      })
    },
    
    beforeUpdate: async (id, data) => {
      console.log(`📝 Updating user ${id}`)
      return data
    },
    
    afterUpdate: async (user) => {
      console.log(`✅ User updated: ${user.email}`)
      // Invalidate caches, update search index, etc.
    },
    
    beforeDelete: async (id) => {
      // Check if user can be deleted
      const postsResult = await postRepository.findMany({
        where: { userId: id }
      })
      
      if (Result.isOk(postsResult) && postsResult.value.length > 0) {
        throw new Error('Cannot delete user with existing posts')
      }
    },
    
    afterDelete: async (id) => {
      console.log(`🗑️ User ${id} deleted`)
      // Cleanup related data, clear caches, etc.
    }
  }
})
```

## 🌟 Advanced Patterns

### Problem: "I need custom storage (database, API, etc.)"

```typescript
// Custom storage adapter (example for external API)
class APIStorageAdapter {
  constructor(private apiClient) {}
  
  async create(data) {
    const result = await this.apiClient.post('/users', data)
    return Result.isOk(result) ? Result.Ok(result.value) : result
  }
  
  async find(id) {
    const result = await this.apiClient.get(`/users/${id}`)
    return Result.isOk(result) ? Result.Ok(result.value) : result
  }
  
  // Implement other methods...
}

// Use custom storage
const apiUserRepository = repository('users', {
  schema: UserSchema,
  storage: new APIStorageAdapter(myApiClient),
  timestamps: false // API handles timestamps
})
```

### Problem: "I need data transformations"

```typescript
import { transform } from 'kairo/tier2'

// Define data transformations
const userDisplayTransform = transform('user-display')
  .map({
    displayName: user => user.name.toUpperCase(),
    initials: user => user.name.split(' ').map(n => n[0]).join(''),
    isAdult: user => user.age >= 18
  })
  .compute({
    profileUrl: user => `/users/${user.id}`,
    memberSince: user => new Date(user.createdAt).getFullYear()
  })

// Apply transformation to repository results
const processUsers = pipeline('process-users')
  .input(schema.array(UserSchema))
  .run(async (users) => {
    return users.map(user => userDisplayTransform.apply(user))
  })

const usersResult = await userRepository.findMany({ limit: 10 })
if (Result.isOk(usersResult)) {
  const processedUsers = await processUsers.run(usersResult.value)
}
```

## 🎓 What You've Learned

### New Concepts Mastered ✅

1. **Data Modeling**: Define schemas with validation and relationships
2. **Type-Safe Persistence**: Store/retrieve data with full type safety
3. **Relationship Management**: Model complex relationships (hasMany, hasOne, belongsTo)
4. **Lifecycle Hooks**: Execute logic before/after data operations
5. **Query Operations**: Find, filter, count, and check existence
6. **Integration Patterns**: Combine data operations with APIs and pipelines

### Functions You Can Use Now ✅

From `kairo/tier1` (11 total):
- `Result`, `schema`, `pipeline`, `map`, `match` (from Your First App)
- `resource`, `resourceUtils` (from Building APIs)
- `repository` - Type-safe data persistence
- `hasMany` - One-to-many relationships
- `hasOne` - One-to-one relationships  
- `belongsTo` - Many-to-one relationships

## 🚀 What's Next?

Choose your path based on your needs:

### Master Business Logic
👉 **[Processing Data](./processing-data)** - Advanced data processing and business rules  
*Learn: `rule`, `rules`, advanced validation, complex workflows*

### Go Production-Ready
👉 **[Production Ready Guide](../production-ready/README)** - Add resilience, caching, and optimization  
*Learn: enhanced error handling, performance patterns, testing utilities*

### Explore Advanced Data Patterns
👉 **[Repository Patterns Examples](../examples/repository-patterns)** - Complex data modeling examples  
*See: Advanced relationships, custom storage, complex queries*

## 🆘 Troubleshooting

### Common Issues

**"Relationships aren't loading"**
- Use `.with('relationshipName')` to load relationships
- Check that foreign keys match between schemas
- Ensure relationship definitions use correct field names

**"Validation errors on create/update"**
- Check that your data matches the schema exactly
- Use `schema.optional()` for optional fields
- Review the error message for specific validation failures

**"TypeScript errors with relationships"**
- Ensure relationship schemas are defined before use
- Check that foreign key types match (string vs number)
- Use type assertions if needed: `user.posts as Post[]`

### Need More Help?

- 📚 **Examples**: Check out [Repository Patterns](../examples/repository-patterns)
- 🔍 **API Reference**: [Repository API docs](../api-reference/index/functions/repository)
- 💬 **Community**: Join our Discord for help

## 🎉 Congratulations!

You've mastered data management with Kairo! You can now:
- ✅ Model complex data structures with relationships
- ✅ Store and retrieve data safely with full type safety
- ✅ Handle data validation and business rules
- ✅ Work with related data efficiently
- ✅ Integrate data operations with APIs and processing pipelines

**Ready for the final pillar?** → [Processing Data](./processing-data)