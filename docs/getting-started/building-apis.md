# Building APIs with Kairo

**Goal**: Master the INTERFACE pillar - integrate with external APIs safely and efficiently.  
**Perfect for**: Developers building applications that communicate with external services.

## 🎯 What You'll Learn

By the end of this guide, you'll know how to:
- ✅ Define type-safe API resources
- ✅ Handle API responses and errors gracefully
- ✅ Build resilient API integrations
- ✅ Create reusable API patterns

**Prerequisites**: Complete [Your First App](./your-first-app) or familiar with `Result`, `schema`, and `pipeline`.

## 🚀 Quick Start

### Import What You Need
```typescript
// Essential functions for API integration
import { Result, schema, resource, resourceUtils } from 'kairo/essential'
```

**Added functions**: `resource`, `resourceUtils` (2 new functions total: 7)

## 🌟 Core Pattern: Type-Safe API Resources

### Problem: "I want to call an API without worrying about response types"

```typescript
// Define what the API returns
const UserSchema = schema.object({
  id: schema.number(),
  name: schema.string(),
  email: schema.string().email(),
  createdAt: schema.string()
})

// Define the API resource with full type safety
const UserAPI = resource('users', {
  get: {
    method: 'GET',
    path: '/api/users/:id',
    params: schema.object({ id: schema.string() }),
    response: UserSchema
  }
})

// Use it - fully typed!
const result = await UserAPI.get.run({ id: '123' })

Result.match(result, {
  Ok: user => {
    // user is fully typed as User
    console.log('User:', user.name)
  },
  Err: error => {
    // Handle API errors gracefully
    console.error('API call failed:', error.message)
  }
})
```

**🎓 Key Benefits**:
- **Type Safety**: Response is automatically typed
- **Validation**: API responses are validated against schema
- **Error Handling**: Network and validation errors handled uniformly

### Real-World Example: User Management API

```typescript
import { resource, schema } from 'kairo/essential'

// Define all your schemas
const CreateUserSchema = schema.object({
  name: schema.string().min(2),
  email: schema.string().email(),
  role: schema.enum(['user', 'admin'])
})

const UpdateUserSchema = schema.object({
  name: schema.string().min(2).optional(),
  email: schema.string().email().optional(),
  role: schema.enum(['user', 'admin']).optional()
})

const UserSchema = schema.object({
  id: schema.number(),
  name: schema.string(),
  email: schema.string(),
  role: schema.string(),
  createdAt: schema.string(),
  updatedAt: schema.string()
})

// Define complete CRUD API
const UserAPI = resource('users', {
  list: {
    method: 'GET',
    path: '/api/users',
    response: schema.array(UserSchema)
  },
  
  get: {
    method: 'GET', 
    path: '/api/users/:id',
    params: schema.object({ id: schema.string() }),
    response: UserSchema
  },
  
  create: {
    method: 'POST',
    path: '/api/users',
    body: CreateUserSchema,
    response: UserSchema
  },
  
  update: {
    method: 'PUT',
    path: '/api/users/:id',
    params: schema.object({ id: schema.string() }),
    body: UpdateUserSchema,
    response: UserSchema
  },
  
  delete: {
    method: 'DELETE',
    path: '/api/users/:id',
    params: schema.object({ id: schema.string() }),
    response: schema.object({ success: schema.boolean() })
  }
})

// Use any method with full type safety
const users = await UserAPI.list.run()
const newUser = await UserAPI.create.run({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user'
})
```

## ⚡ Productivity Patterns

### Problem: "Writing resource definitions is repetitive"

Use `resourceUtils` for common patterns:

```typescript
import { resourceUtils, schema } from 'kairo/essential'

// Quick method definitions
const quickUserAPI = resource('users', {
  // Shorthand for GET requests
  get: resourceUtils.get('/users/:id', 
    schema.object({ id: schema.string() }), 
    UserSchema
  ),
  
  // Shorthand for POST requests
  create: resourceUtils.post('/users', 
    CreateUserSchema, 
    UserSchema
  ),
  
  // Shorthand for PUT requests
  update: resourceUtils.put('/users/:id',
    schema.object({ id: schema.string() }),
    UpdateUserSchema,
    UserSchema
  ),
  
  // Shorthand for DELETE requests
  delete: resourceUtils.delete('/users/:id',
    schema.object({ id: schema.string() }),
    schema.object({ success: schema.boolean() })
  )
})
```

**🎓 Benefits**: Less boilerplate, same type safety and validation.

### Problem: "I need to handle authentication"

```typescript
const AuthenticatedAPI = resource('protected', {
  getUserProfile: {
    method: 'GET',
    path: '/api/me',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN',
      'Content-Type': 'application/json'
    },
    response: UserSchema
  },
  
  updateProfile: {
    method: 'PUT',
    path: '/api/me',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN',
      'Content-Type': 'application/json'
    },
    body: UpdateUserSchema,
    response: UserSchema
  }
})
```

### Problem: "I need to handle query parameters"

```typescript
const SearchAPI = resource('search', {
  users: {
    method: 'GET',
    path: '/api/users',
    query: schema.object({
      search: schema.string().optional(),
      role: schema.enum(['user', 'admin']).optional(),
      limit: schema.number().min(1).max(100).optional(),
      offset: schema.number().min(0).optional()
    }),
    response: schema.object({
      users: schema.array(UserSchema),
      total: schema.number(),
      hasMore: schema.boolean()
    })
  }
})

// Use with query parameters
const searchResult = await SearchAPI.users.run({
  search: 'john',
  role: 'user',
  limit: 20,
  offset: 0
})
```

## 🔧 Integration Patterns

### Problem: "I want to use APIs in data processing pipelines"

```typescript
import { pipeline, resource, schema } from 'kairo/essential'

// Combine APIs with pipelines for complex workflows
const processUserCreation = pipeline('create-user-workflow')
  .input(CreateUserSchema)
  .run(async userData => {
    // 1. Create user via API
    const userResult = await UserAPI.create.run(userData)
    if (Result.isErr(userResult)) {
      throw new Error(`User creation failed: ${userResult.error.message}`)
    }
    return userResult.value
  })
  .run(async user => {
    // 2. Send welcome email via API
    const emailResult = await EmailAPI.sendWelcome.run({
      email: user.email,
      name: user.name
    })
    if (Result.isErr(emailResult)) {
      console.warn('Welcome email failed, but user created successfully')
    }
    return user
  })

// Use the complete workflow
const result = await processUserCreation.run({
  name: 'Jane Smith',
  email: 'jane@example.com',
  role: 'user'
})
```

### Problem: "I need error handling for different API failure types"

```typescript
const handleApiCall = async (apiCall: Promise<Result<Error, User>>) => {
  const result = await apiCall
  
  return Result.match(result, {
    Ok: user => {
      console.log('✅ Success:', user.name)
      return user
    },
    Err: error => {
      // Different error types
      if (error.message.includes('404')) {
        console.error('❌ User not found')
        // Handle not found
      } else if (error.message.includes('401')) {
        console.error('❌ Unauthorized - check your token')
        // Handle auth errors
      } else if (error.message.includes('500')) {
        console.error('❌ Server error - try again later')
        // Handle server errors
      } else {
        console.error('❌ Network error:', error.message)
        // Handle network errors
      }
      throw error // Re-throw if you want to stop processing
    }
  })
}

// Use with any API call
try {
  const user = await handleApiCall(UserAPI.get.run({ id: '123' }))
  // Continue processing...
} catch (error) {
  // Handle errors appropriately for your app
}
```

## 🌟 Advanced Patterns

### Problem: "I need to work with multiple APIs together"

```typescript
// Compose multiple APIs into higher-level operations
const UserManagementService = {
  async createUserWithProfile(userData: CreateUserData) {
    // 1. Create user
    const userResult = await UserAPI.create.run(userData)
    if (Result.isErr(userResult)) return userResult
    
    const user = userResult.value
    
    // 2. Create default profile
    const profileResult = await ProfileAPI.create.run({
      userId: user.id,
      bio: `Hello, I'm ${user.name}!`,
      avatar: null
    })
    
    // 3. Return combined result
    if (Result.isErr(profileResult)) {
      console.warn('Profile creation failed, but user created')
      return Result.Ok(user)
    }
    
    return Result.Ok({
      ...user,
      profile: profileResult.value
    })
  },
  
  async deleteUserCompletely(userId: string) {
    // Delete in correct order (profile first, then user)
    await ProfileAPI.deleteByUser.run({ userId })
    return await UserAPI.delete.run({ id: userId })
  }
}
```

### Problem: "I want reusable API configuration"

```typescript
// Create reusable patterns
const createCRUDResource = <T>(
  name: string, 
  schema: Schema<T>, 
  createSchema: Schema<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
) => {
  return resource(name, {
    list: resourceUtils.get(`/${name}`, undefined, array(schema)),
    get: resourceUtils.get(`/${name}/:id`, IdSchema, schema),
    create: resourceUtils.post(`/${name}`, createSchema, schema),
    update: resourceUtils.put(`/${name}/:id`, IdSchema, createSchema, schema),
    delete: resourceUtils.delete(`/${name}/:id`, IdSchema, SuccessSchema)
  })
}

// Use the pattern
const PostAPI = createCRUDResource('posts', PostSchema, CreatePostSchema)
const CommentAPI = createCRUDResource('comments', CommentSchema, CreateCommentSchema)
```

## 🎓 What You've Learned

### New Concepts Mastered ✅

1. **Type-Safe API Integration**: Define APIs with full type safety
2. **Automatic Validation**: API responses validated against schemas
3. **Unified Error Handling**: Network, validation, and HTTP errors handled consistently
4. **Productivity Utilities**: `resourceUtils` for common patterns
5. **Pipeline Integration**: Combine APIs with data processing workflows

### Functions You Can Use Now ✅

From `kairo/essential` (7 total):
- `Result`, `schema`, `pipeline`, `map`, `match` (from Your First App)
- `resource` - Define type-safe API resources
- `resourceUtils` - Helper utilities for common API patterns

## 🚀 What's Next?

Choose your path based on your needs:

### Build Complete Applications
👉 **[Managing Data](./managing-data)** - Add data persistence and relationships  
*Learn: `repository`, `hasMany`, `hasOne`, `belongsTo`*

### Master Data Processing  
👉 **[Processing Data](./processing-data)** - Advanced business logic and validation  
*Learn: `rule`, `rules`, advanced pipeline patterns*

### Go Production-Ready
👉 **[Production Ready Guide](../production-ready/README)** - Add resilience and optimization  
*Learn: retry logic, caching, enhanced error handling*

## 🆘 Troubleshooting

### Common Issues

**"My API response doesn't match the schema"**
- Check the actual API response format
- Update your schema to match the real data structure
- Use `schema.object({ /* actual fields */ })` based on real responses

**"Path parameters aren't working"**  
- Ensure path uses `:paramName` syntax: `/users/:id`
- Provide matching params schema: `schema.object({ id: schema.string() })`
- Check that parameter names match exactly

**"Authentication headers not working"**
- Add headers to the resource method definition
- For dynamic tokens, consider using a wrapper function
- Check that your API expects the exact header format

### Need More Help?

- 📚 **Examples**: Check out [Data Fetching Examples](../examples/data-fetching)
- 🔍 **API Reference**: [Resource API docs](../api-reference/index/functions/resource)
- 💬 **Community**: Join our Discord for help

## 🎉 Congratulations!

You've mastered API integration with Kairo! You can now:
- ✅ Define type-safe API resources
- ✅ Handle API responses and errors gracefully  
- ✅ Build complex API workflows
- ✅ Create reusable API patterns

**Ready for the next pillar?** → [Managing Data](./managing-data)