# Application Learning Path

**Build real-world applications using Tier 1 functions (15 total functions).**

## 🎯 Learning Goals

By completing this path, you will:
- ✅ Integrate with external APIs safely and efficiently
- ✅ Store and retrieve data with relationships
- ✅ Implement complex business rules and validation
- ✅ Build production-ready data processing workflows
- ✅ Handle errors gracefully across entire applications

**Time Investment**: 2-3 weeks  
**Functions Learned**: 15 Tier 1 functions (builds on Foundation 5)  
**Prerequisites**: Completed [Foundation Path](./foundation-path) or equivalent experience

## 📚 The Application Functions

```typescript
// Foundation (5) - you already know these
import { Result, schema, pipeline, map, match } from 'kairo/beginner'

// Essential (3 more) - for APIs and basic apps  
import { resource, resourceUtils } from 'kairo/essential'

// Tier 1 (7 more) - for complete applications
import { 
  repository, hasMany, hasOne, belongsTo,
  rule, rules, cache, pipe
} from 'kairo/tier1'
```

**Total**: 15 functions that cover 80%+ of application development needs.

## 🚀 Learning Modules

### Module 1: API Integration Mastery (Week 1, Days 1-3)

#### 🎯 Learning Objectives
- Master type-safe API calls with automatic validation
- Handle API errors and edge cases gracefully  
- Build resilient API integration patterns

#### 📖 Core Concepts: Resources

```typescript
import { resource, schema } from 'kairo/essential'

// Define what your API looks like
const UserAPI = resource('users', {
  get: {
    method: 'GET',
    path: '/users/:id',
    params: schema.object({ id: schema.string() }),
    response: UserSchema
  },
  create: {
    method: 'POST', 
    path: '/users',
    body: CreateUserSchema,
    response: UserSchema
  }
})

// Use it - fully typed and validated
const result = await UserAPI.get.run({ id: '123' })
```

#### 🧪 Exercise 1.1: Build a Complete API Client
```typescript
// Build a GitHub API client
const GitHubUserSchema = schema.object({
  id: schema.number(),
  login: schema.string(),
  name: schema.string().optional(),
  email: schema.string().optional(),
  public_repos: schema.number(),
  followers: schema.number(),
  following: schema.number()
})

const GitHubRepoSchema = schema.object({
  id: schema.number(),
  name: schema.string(),
  full_name: schema.string(),
  description: schema.string().optional(),
  language: schema.string().optional(),
  stargazers_count: schema.number(),
  forks_count: schema.number()
})

const GitHubAPI = resource('github', {
  getUser: {
    method: 'GET',
    path: 'https://api.github.com/users/:username',
    params: schema.object({ username: schema.string() }),
    response: GitHubUserSchema
  },
  getUserRepos: {
    method: 'GET',
    path: 'https://api.github.com/users/:username/repos',
    params: schema.object({ username: schema.string() }),
    query: schema.object({
      sort: schema.enum(['created', 'updated', 'pushed', 'full_name']).optional(),
      direction: schema.enum(['asc', 'desc']).optional(),
      per_page: schema.number().min(1).max(100).optional()
    }),
    response: schema.array(GitHubRepoSchema)
  }
})

// Test your API client
const testGitHubAPI = async (username: string) => {
  console.log(`Fetching data for GitHub user: ${username}`)
  
  // Get user info
  const userResult = await GitHubAPI.getUser.run({ username })
  
  if (Result.isErr(userResult)) {
    console.error('Failed to fetch user:', userResult.error.message)
    return
  }
  
  const user = userResult.value
  console.log(`User: ${user.name || user.login}`)
  console.log(`Public repos: ${user.public_repos}`)
  console.log(`Followers: ${user.followers}`)
  
  // Get user's repositories
  const reposResult = await GitHubAPI.getUserRepos.run({ 
    username,
    sort: 'updated',
    direction: 'desc',
    per_page: 5
  })
  
  match(reposResult, {
    Ok: repos => {
      console.log('\nTop 5 recent repositories:')
      repos.forEach(repo => {
        console.log(`- ${repo.name} (${repo.stargazers_count} ⭐)`)
        if (repo.description) {
          console.log(`  ${repo.description}`)
        }
      })
    },
    Err: error => {
      console.error('Failed to fetch repos:', error.message)
    }
  })
}

// Test it
testGitHubAPI('octocat')
```

#### ✅ Checkpoint 1.1
- [ ] I can define API resources with full type safety
- [ ] I can handle API responses and validation errors
- [ ] I can work with query parameters and path parameters
- [ ] I understand how schemas provide automatic validation

#### 🧪 Exercise 1.2: API Integration with Pipelines
```typescript
// Combine API calls with data processing
const getUserProfile = pipeline('get-user-profile')
  .input(schema.object({ username: schema.string() }))
  .run(async ({ username }) => {
    // Fetch user and repos in parallel
    const [userResult, reposResult] = await Promise.all([
      GitHubAPI.getUser.run({ username }),
      GitHubAPI.getUserRepos.run({ username, per_page: 10 })
    ])
    
    if (Result.isErr(userResult)) {
      throw new Error(`User fetch failed: ${userResult.error.message}`)
    }
    
    if (Result.isErr(reposResult)) {
      throw new Error(`Repos fetch failed: ${reposResult.error.message}`)
    }
    
    return {
      user: userResult.value,
      repos: reposResult.value
    }
  })
  .map(({ user, repos }) => ({
    // Compute profile stats
    username: user.login,
    displayName: user.name || user.login,
    bio: `${user.public_repos} repos • ${user.followers} followers`,
    totalStars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    totalForks: repos.reduce((sum, repo) => sum + repo.forks_count, 0),
    languages: [...new Set(repos.map(r => r.language).filter(Boolean))],
    topRepos: repos
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 3)
      .map(repo => ({
        name: repo.name,
        stars: repo.stargazers_count,
        description: repo.description
      }))
  }))

// Test the profile pipeline
const profileResult = await getUserProfile.run({ username: 'octocat' })

match(profileResult, {
  Ok: profile => {
    console.log(`Profile for ${profile.displayName}`)
    console.log(`Bio: ${profile.bio}`)
    console.log(`Total stars across all repos: ${profile.totalStars}`)
    console.log(`Languages: ${profile.languages.join(', ')}`)
    console.log('\nTop repositories:')
    profile.topRepos.forEach(repo => {
      console.log(`- ${repo.name} (${repo.stars} ⭐)`)
    })
  },
  Err: error => {
    console.error('Profile generation failed:', error.message)
  }
})
```

#### ✅ Checkpoint 1.2
- [ ] I can combine multiple API calls in pipelines
- [ ] I can process API responses with complex transformations
- [ ] I can handle parallel API calls efficiently
- [ ] I understand error propagation in multi-step operations

---

### Module 2: Data Persistence and Relationships (Week 1, Days 4-7)

#### 🎯 Learning Objectives
- Model complex data with relationships
- Perform CRUD operations with type safety
- Handle related data efficiently
- Implement data validation and business rules

#### 📖 Core Concepts: Repositories and Relations

```typescript
import { repository, hasMany, hasOne, belongsTo } from 'kairo/tier1'

// Define related schemas
const UserSchema = schema.object({
  id: schema.number(),
  name: schema.string(),
  email: schema.string().email()
})

const PostSchema = schema.object({
  id: schema.number(),
  title: schema.string(),
  content: schema.string(),
  userId: schema.number() // Foreign key
})

// Create repositories with relationships
const userRepo = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  relationships: {
    posts: hasMany('posts', 'userId', PostSchema)
  }
})

const postRepo = repository('posts', {
  schema: PostSchema,
  storage: 'memory',
  relationships: {
    author: belongsTo('users', 'userId', UserSchema)
  }
})
```

#### 🧪 Exercise 2.1: Build a Blog Data Model
```typescript
// Complete blog data model with multiple relationships
const UserSchema = schema.object({
  id: schema.number(),
  username: schema.string(),
  email: schema.string().email(),
  firstName: schema.string(),
  lastName: schema.string(),
  bio: schema.string().optional(),
  createdAt: schema.string().optional(),
  updatedAt: schema.string().optional()
})

const CategorySchema = schema.object({
  id: schema.number(),
  name: schema.string(),
  slug: schema.string(),
  description: schema.string().optional()
})

const PostSchema = schema.object({
  id: schema.number(),
  title: schema.string(),
  slug: schema.string(),
  content: schema.string(),
  excerpt: schema.string().optional(),
  userId: schema.number(),
  categoryId: schema.number(),
  publishedAt: schema.string().optional(),
  createdAt: schema.string().optional(),
  updatedAt: schema.string().optional()
})

const CommentSchema = schema.object({
  id: schema.number(),
  content: schema.string(),
  postId: schema.number(),
  userId: schema.number(),
  parentId: schema.number().optional(), // For nested comments
  createdAt: schema.string().optional()
})

// Create repositories with complex relationships
const userRepository = repository('users', {
  schema: UserSchema,
  storage: 'memory',
  timestamps: true,
  relationships: {
    posts: hasMany('posts', 'userId', PostSchema),
    comments: hasMany('comments', 'userId', CommentSchema)
  }
})

const categoryRepository = repository('categories', {
  schema: CategorySchema,
  storage: 'memory',
  relationships: {
    posts: hasMany('posts', 'categoryId', PostSchema)
  }
})

const postRepository = repository('posts', {
  schema: PostSchema,
  storage: 'memory',
  timestamps: true,
  relationships: {
    author: belongsTo('users', 'userId', UserSchema),
    category: belongsTo('categories', 'categoryId', CategorySchema),
    comments: hasMany('comments', 'postId', CommentSchema)
  }
})

const commentRepository = repository('comments', {
  schema: CommentSchema,
  storage: 'memory',
  timestamps: true,
  relationships: {
    author: belongsTo('users', 'userId', UserSchema),
    post: belongsTo('posts', 'postId', PostSchema),
    parent: belongsTo('comments', 'parentId', CommentSchema),
    replies: hasMany('comments', 'parentId', CommentSchema)
  }
})
```

#### 🧪 Exercise 2.2: Data Operations Workflow
```typescript
// Build a complete blog management system
const createBlogContent = async () => {
  console.log('Creating blog content...')
  
  // 1. Create categories
  const techCategory = await categoryRepository.create({
    name: 'Technology',
    slug: 'technology',
    description: 'Posts about technology and programming'
  })
  
  const tutorialCategory = await categoryRepository.create({
    name: 'Tutorials',
    slug: 'tutorials',
    description: 'Step-by-step guides and tutorials'
  })
  
  if (Result.isErr(techCategory) || Result.isErr(tutorialCategory)) {
    console.error('Failed to create categories')
    return
  }
  
  // 2. Create users
  const user1 = await userRepository.create({
    username: 'alice_dev',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Johnson',
    bio: 'Full-stack developer passionate about clean code'
  })
  
  const user2 = await userRepository.create({
    username: 'bob_writes',
    email: 'bob@example.com',
    firstName: 'Bob',
    lastName: 'Smith',
    bio: 'Technical writer and educator'
  })
  
  if (Result.isErr(user1) || Result.isErr(user2)) {
    console.error('Failed to create users')
    return
  }
  
  // 3. Create posts
  const post1 = await postRepository.create({
    title: 'Getting Started with Kairo',
    slug: 'getting-started-with-kairo',
    content: 'Kairo is a functional TypeScript library that makes building applications easier...',
    excerpt: 'Learn the basics of Kairo in this comprehensive guide.',
    userId: user1.value.id,
    categoryId: tutorialCategory.value.id,
    publishedAt: new Date().toISOString()
  })
  
  const post2 = await postRepository.create({
    title: 'Advanced Pipeline Patterns',
    slug: 'advanced-pipeline-patterns',
    content: 'Once you understand the basics, you can build complex workflows...',
    excerpt: 'Master advanced techniques for data processing pipelines.',
    userId: user1.value.id,
    categoryId: techCategory.value.id,
    publishedAt: new Date().toISOString()
  })
  
  if (Result.isErr(post1) || Result.isErr(post2)) {
    console.error('Failed to create posts')
    return
  }
  
  // 4. Create comments
  const comment1 = await commentRepository.create({
    content: 'Great introduction! This really helped me understand the concepts.',
    postId: post1.value.id,
    userId: user2.value.id
  })
  
  const comment2 = await commentRepository.create({
    content: 'Thanks for the feedback! Let me know if you have questions.',
    postId: post1.value.id,
    userId: user1.value.id,
    parentId: comment1.value?.id // Reply to first comment
  })
  
  console.log('✅ Blog content created successfully!')
  return {
    categories: [techCategory.value, tutorialCategory.value],
    users: [user1.value, user2.value],
    posts: [post1.value, post2.value],
    comments: [comment1.value, comment2.value].filter(c => c)
  }
}

// 5. Query with relationships
const getBlogOverview = async () => {
  console.log('\nFetching blog overview...')
  
  // Get all posts with authors and categories
  const postsResult = await postRepository
    .with(['author', 'category', 'comments'])
    .findMany({
      where: { publishedAt: { $ne: null } },
      orderBy: [{ field: 'publishedAt', direction: 'desc' }]
    })
  
  if (Result.isErr(postsResult)) {
    console.error('Failed to fetch posts:', postsResult.error.message)
    return
  }
  
  console.log('📝 Published posts:')
  postsResult.value.forEach(post => {
    console.log(`\n"${post.title}" by ${post.author.firstName} ${post.author.lastName}`)
    console.log(`Category: ${post.category.name}`)
    console.log(`Comments: ${post.comments.length}`)
    console.log(`Excerpt: ${post.excerpt}`)
  })
  
  // Get user stats
  const usersResult = await userRepository
    .with(['posts', 'comments'])
    .findMany()
  
  if (Result.isOk(usersResult)) {
    console.log('\n👥 User statistics:')
    usersResult.value.forEach(user => {
      console.log(`${user.firstName} ${user.lastName} (@${user.username})`)
      console.log(`  Posts: ${user.posts.length}`)
      console.log(`  Comments: ${user.comments.length}`)
    })
  }
}

// Run the example
const runBlogExample = async () => {
  await createBlogContent()
  await getBlogOverview()
}

runBlogExample()
```

#### ✅ Checkpoint 2
- [ ] I can model complex data relationships
- [ ] I can perform CRUD operations with type safety
- [ ] I can query related data efficiently
- [ ] I understand foreign key relationships and joins

---

### Module 3: Business Rules and Validation (Week 2, Days 1-3)

#### 🎯 Learning Objectives
- Implement complex business rules and validation
- Create reusable validation logic
- Handle conditional and async validation
- Build validation workflows

#### 📖 Core Concepts: Rules and Rule Sets

```typescript
import { rule, rules } from 'kairo/tier1'

// Define individual business rules
const ageRule = rule('age-requirement')
  .require(user => user.age >= 18)
  .message('User must be 18 or older')
  .code('AGE_REQUIREMENT')

// Combine rules into rule sets
const userValidationRules = rules('user-validation', {
  ageCheck: ageRule,
  emailUnique: rule('email-unique').async(async user => {
    const exists = await checkEmailExists(user.email)
    return exists ? Result.Err('Email already taken') : Result.Ok(true)
  })
})
```

#### 🧪 Exercise 3.1: E-commerce Validation System
```typescript
// Build a comprehensive e-commerce validation system
const ProductValidationRules = rules('product-validation', {
  nameRequired: rule('name-required')
    .require(product => product.name && product.name.trim().length > 0)
    .message('Product name is required')
    .code('NAME_REQUIRED')
    .field('name'),
    
  priceValid: rule('price-valid')
    .require(product => product.price > 0)
    .message('Price must be greater than 0')
    .code('INVALID_PRICE')
    .field('price'),
    
  skuUnique: rule('sku-unique')
    .async(async product => {
      const existing = await productRepository.findOne({ where: { sku: product.sku } })
      if (Result.isOk(existing) && existing.value) {
        return Result.Err('SKU already exists')
      }
      return Result.Ok(true)
    })
    .message('SKU must be unique')
    .code('DUPLICATE_SKU')
    .field('sku'),
    
  categoryExists: rule('category-exists')
    .async(async product => {
      const category = await categoryRepository.find(product.categoryId)
      return Result.isOk(category) && category.value 
        ? Result.Ok(true) 
        : Result.Err('Category not found')
    })
    .message('Selected category does not exist')
    .code('CATEGORY_NOT_FOUND')
    .field('categoryId'),
    
  discountValid: rule('discount-valid')
    .require(product => {
      if (product.discountPercent === undefined) return true
      return product.discountPercent >= 0 && product.discountPercent <= 100
    })
    .message('Discount must be between 0 and 100 percent')
    .code('INVALID_DISCOUNT')
    .field('discountPercent')
})

const OrderValidationRules = rules('order-validation', {
  customerExists: rule('customer-exists')
    .async(async order => {
      const customer = await userRepository.find(order.customerId)
      return Result.isOk(customer) && customer.value
        ? Result.Ok(true)
        : Result.Err('Customer not found')
    })
    .message('Customer does not exist')
    .code('CUSTOMER_NOT_FOUND'),
    
  itemsNotEmpty: rule('items-not-empty')
    .require(order => order.items && order.items.length > 0)
    .message('Order must contain at least one item')
    .code('NO_ITEMS'),
    
  itemsAvailable: rule('items-available')
    .async(async order => {
      for (const item of order.items) {
        const product = await productRepository.find(item.productId)
        if (Result.isErr(product) || !product.value) {
          return Result.Err(`Product ${item.productId} not found`)
        }
        if (product.value.stock < item.quantity) {
          return Result.Err(`Insufficient stock for ${product.value.name}`)
        }
      }
      return Result.Ok(true)
    })
    .message('Some items are not available or out of stock')
    .code('INSUFFICIENT_STOCK'),
    
  totalValid: rule('total-valid')
    .async(async order => {
      let calculatedTotal = 0
      
      for (const item of order.items) {
        const product = await productRepository.find(item.productId)
        if (Result.isOk(product) && product.value) {
          calculatedTotal += product.value.price * item.quantity
        }
      }
      
      const difference = Math.abs(calculatedTotal - order.total)
      return difference < 0.01 // Allow for floating point precision
        ? Result.Ok(true)
        : Result.Err(`Total mismatch: expected ${calculatedTotal}, got ${order.total}`)
    })
    .message('Order total does not match item prices')
    .code('TOTAL_MISMATCH')
})
```

#### 🧪 Exercise 3.2: Validation Workflow Pipeline
```typescript
// Create validation workflows that integrate with data processing
const createProductWorkflow = pipeline('create-product')
  .input(schema.object({
    name: schema.string(),
    description: schema.string(),
    price: schema.number(),
    sku: schema.string(),
    categoryId: schema.number(),
    stock: schema.number(),
    discountPercent: schema.number().optional()
  }))
  .validateAllRules(ProductValidationRules)
  .map(product => ({
    ...product,
    slug: product.name.toLowerCase().replace(/\s+/g, '-'),
    finalPrice: product.discountPercent 
      ? product.price * (1 - product.discountPercent / 100)
      : product.price,
    createdAt: new Date().toISOString()
  }))
  .run(async (product) => {
    const result = await productRepository.create(product)
    if (Result.isErr(result)) {
      throw new Error(`Product creation failed: ${result.error.message}`)
    }
    return result.value
  })

const createOrderWorkflow = pipeline('create-order')
  .input(schema.object({
    customerId: schema.number(),
    items: schema.array(schema.object({
      productId: schema.number(),
      quantity: schema.number()
    })),
    total: schema.number(),
    shippingAddress: schema.string()
  }))
  .validateAllRules(OrderValidationRules)
  .run(async (order) => {
    // Reserve inventory
    for (const item of order.items) {
      const productResult = await productRepository.find(item.productId)
      if (Result.isOk(productResult) && productResult.value) {
        const product = productResult.value
        await productRepository.update(item.productId, {
          stock: product.stock - item.quantity
        })
      }
    }
    
    return order
  })
  .run(async (order) => {
    // Create order record
    const orderResult = await orderRepository.create({
      ...order,
      status: 'pending',
      createdAt: new Date().toISOString()
    })
    
    if (Result.isErr(orderResult)) {
      throw new Error(`Order creation failed: ${orderResult.error.message}`)
    }
    
    return orderResult.value
  })

// Test the workflows
const testWorkflows = async () => {
  // Test product creation
  const productResult = await createProductWorkflow.run({
    name: 'Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    price: 199.99,
    sku: 'WH-001',
    categoryId: 1,
    stock: 50,
    discountPercent: 10
  })
  
  match(productResult, {
    Ok: product => console.log('✅ Product created:', product.name),
    Err: error => console.error('❌ Product creation failed:', error.message)
  })
  
  // Test order creation
  const orderResult = await createOrderWorkflow.run({
    customerId: 1,
    items: [
      { productId: 1, quantity: 2 }
    ],
    total: 359.98, // 2 * (199.99 * 0.9)
    shippingAddress: '123 Main St, Anytown, USA'
  })
  
  match(orderResult, {
    Ok: order => console.log('✅ Order created:', order.id),
    Err: error => console.error('❌ Order creation failed:', error.message)
  })
}

testWorkflows()
```

#### ✅ Checkpoint 3
- [ ] I can create complex business rules with clear error messages
- [ ] I can implement async validation (database checks, API calls)
- [ ] I can combine validation with data processing workflows
- [ ] I can handle validation errors gracefully across the application

---

### Module 4: Performance and Caching (Week 2, Days 4-5)

#### 🎯 Learning Objectives
- Implement caching for expensive operations
- Build efficient data processing pipelines
- Optimize API calls and database queries
- Use functional composition for performance

#### 📖 Core Concepts: Cache and Pipe

```typescript
import { cache, pipe } from 'kairo/tier1'

// Cache expensive operations
const expensiveUserLookup = pipeline('user-lookup')
  .input(UserSchema)
  .run(expensiveUserProcessing)
  .cache(300000) // Cache for 5 minutes

// Compose functions efficiently
const processUserData = pipe(
  user => normalizeUser(user),
  user => addComputedFields(user),
  user => validateBusinessRules(user)
)
```

#### 🧪 Exercise 4.1: Comprehensive Caching Strategy
```typescript
// Build a caching layer for the blog application
const cachedUserProfile = pipeline('cached-user-profile')
  .input(schema.object({ userId: schema.number() }))
  .cache(600000) // Cache for 10 minutes
  .run(async ({ userId }) => {
    // Expensive operation: fetch user with all related data
    const userResult = await userRepository
      .with(['posts', 'comments'])
      .find(userId)
    
    if (Result.isErr(userResult) || !userResult.value) {
      throw new Error('User not found')
    }
    
    const user = userResult.value
    
    // Calculate expensive stats
    const totalViews = user.posts.reduce((sum, post) => sum + (post.views || 0), 0)
    const totalLikes = user.posts.reduce((sum, post) => sum + (post.likes || 0), 0)
    const engagementRate = user.posts.length > 0 
      ? (totalLikes / totalViews) * 100 
      : 0
    
    return {
      user,
      stats: {
        totalPosts: user.posts.length,
        totalComments: user.comments.length,
        totalViews,
        totalLikes,
        engagementRate: Math.round(engagementRate * 100) / 100
      }
    }
  })

const cachedPopularPosts = pipeline('cached-popular-posts')
  .input(schema.object({ 
    limit: schema.number().default(10),
    category: schema.string().optional()
  }))
  .cache(1800000) // Cache for 30 minutes
  .run(async ({ limit, category }) => {
    // Complex query with relationships
    const query = {
      where: {
        publishedAt: { $ne: null },
        ...(category && { 'category.slug': category })
      },
      orderBy: [
        { field: 'views', direction: 'desc' as const },
        { field: 'likes', direction: 'desc' as const }
      ],
      limit
    }
    
    const postsResult = await postRepository
      .with(['author', 'category', 'comments'])
      .findMany(query)
    
    if (Result.isErr(postsResult)) {
      throw new Error('Failed to fetch popular posts')
    }
    
    return postsResult.value.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      author: {
        name: `${post.author.firstName} ${post.author.lastName}`,
        username: post.author.username
      },
      category: post.category.name,
      stats: {
        views: post.views || 0,
        likes: post.likes || 0,
        comments: post.comments.length
      },
      publishedAt: post.publishedAt
    }))
  })
```

#### 🧪 Exercise 4.2: Function Composition for Performance
```typescript
// Use pipe for efficient data transformations
const optimizedDataProcessor = pipe(
  // Step 1: Normalize and clean data
  (data: any[]) => data.map(item => ({
    ...item,
    email: item.email?.toLowerCase(),
    name: item.name?.trim(),
    phone: item.phone?.replace(/\D/g, '')
  })),
  
  // Step 2: Filter valid items
  (data: any[]) => data.filter(item => 
    item.email && 
    item.name && 
    item.email.includes('@')
  ),
  
  // Step 3: Add computed fields
  (data: any[]) => data.map(item => ({
    ...item,
    displayName: item.name.toUpperCase(),
    domain: item.email.split('@')[1],
    initials: item.name.split(' ').map((n: string) => n[0]).join('')
  })),
  
  // Step 4: Group by domain
  (data: any[]) => {
    const groups = data.reduce((acc, item) => {
      const domain = item.domain
      if (!acc[domain]) acc[domain] = []
      acc[domain].push(item)
      return acc
    }, {} as Record<string, any[]>)
    
    return Object.entries(groups).map(([domain, users]) => ({
      domain,
      userCount: users.length,
      users: users.map(u => ({
        name: u.displayName,
        email: u.email,
        initials: u.initials
      }))
    }))
  }
)

// Batch processing with caching
const batchProcessor = pipeline('batch-processor')
  .input(schema.array(schema.any()))
  .cache(300000) // Cache results for 5 minutes
  .run(async (items) => {
    // Process in chunks for better performance
    const chunkSize = 100
    const chunks = []
    
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize))
    }
    
    // Process chunks in parallel
    const results = await Promise.all(
      chunks.map(chunk => optimizedDataProcessor(chunk))
    )
    
    // Flatten results
    return results.flat()
  })

// Performance monitoring
const monitoredOperation = pipeline('monitored-operation')
  .input(schema.any())
  .run(async (data) => {
    const startTime = Date.now()
    
    try {
      const result = await expensiveOperation(data)
      const duration = Date.now() - startTime
      
      console.log(`Operation completed in ${duration}ms`)
      
      return {
        result,
        performance: {
          duration,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`Operation failed after ${duration}ms:`, error.message)
      throw error
    }
  })
```

#### ✅ Checkpoint 4
- [ ] I can implement effective caching strategies
- [ ] I can use pipe for efficient function composition
- [ ] I can optimize data processing workflows
- [ ] I can monitor and measure performance

---

## 🎓 Application Mastery Assessment

### Comprehensive Project: Social Media Dashboard

Build a complete social media dashboard application that demonstrates all Tier 1 concepts:

#### Requirements:
1. **API Integration**: Fetch data from social media APIs (or mock APIs)
2. **Data Modeling**: Users, posts, comments, likes with relationships
3. **Business Rules**: Content validation, user permissions, rate limiting
4. **Performance**: Caching, batch processing, optimized queries
5. **Error Handling**: Graceful degradation and user feedback

#### Success Criteria:
- ✅ **API Integration**: Multiple external services integrated safely
- ✅ **Data Management**: Complex relationships and CRUD operations
- ✅ **Business Logic**: Comprehensive validation and rules
- ✅ **Performance**: Efficient caching and data processing
- ✅ **Error Resilience**: Graceful handling of all failure scenarios

### Knowledge Assessment:

1. **When would you use `resource` vs direct fetch calls?**
2. **How do relationships in repositories differ from SQL joins?**
3. **What's the difference between synchronous and asynchronous rules?**
4. **When should you use caching and what are the tradeoffs?**
5. **How does `pipe` differ from `pipeline` and when to use each?**

## 🚀 Next Steps

Congratulations! You've mastered application development with Kairo. You're ready to:

### Continue to Professional Level
👉 **[Professional Path](./professional-path)** - Production-ready applications with advanced patterns

### Explore Specialized Topics
👉 **[Event-Driven Architecture](../examples/event-driven-architecture)** - Event sourcing and CQRS patterns  
👉 **[Enterprise Integration](../examples/enterprise-integration)** - Large-scale system integration

### Build Real Projects
- Deploy your dashboard to production
- Add authentication and authorization
- Implement real-time updates
- Scale to handle multiple users

---

**Excellent work!** You now have the skills to build sophisticated, production-ready applications. The 15 Tier 1 functions give you everything needed for most application development scenarios. 🎉