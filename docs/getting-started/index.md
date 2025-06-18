# Getting Started with Kairo

Welcome to Kairo! This guide will help you build your first application using the tiered learning approach.

## 🎯 Choose Your Starting Point

### 🌱 New to Kairo? Start Here
**Goal**: Build your first application in 30 minutes

👉 **[Your First App](./your-first-app)** - Essential 5 functions to get started  
🕒 *Time to success: 30 minutes*  
📦 *Bundle size: ~15KB*

### ⚡ Ready to Build? Jump In
**Goal**: Build real applications with core patterns

👉 **[Building APIs](./building-apis)** - INTERFACE pillar mastery  
👉 **[Processing Data](./processing-data)** - PROCESS pillar patterns  
👉 **[Managing Data](./managing-data)** - DATA pillar foundations  
🕒 *Time to productivity: 1-2 weeks*  
📦 *Bundle size: ~35KB*

### 🚀 Production Ready? Go Further  
**Goal**: Deploy robust, production-grade applications

👉 **[Production Ready Guide](../production-ready/README)** - Tier 2 patterns  
🕒 *Time to production: 6-10 weeks*  
📦 *Bundle size: ~50KB*

## 🗺️ Learning Paths by Goal

### "I want to validate an API response"
```typescript
import { schema, Result } from 'kairo/beginner'

const UserSchema = schema.object({
  name: schema.string(),
  email: schema.string().email()
})

const result = UserSchema.parse(apiResponse)
Result.match(result, {
  Ok: user => console.log('Valid user:', user),
  Err: error => console.error('Invalid response:', error)
})
```
**Next**: [Data validation patterns](./managing-data#validation)

### "I want to call an external API"  
```typescript
import { resource, schema } from 'kairo/essential'

const UserAPI = resource('users', {
  get: {
    method: 'GET',
    path: '/users/:id',
    params: schema.object({ id: schema.string() }),
    response: UserSchema
  }
})

const result = await UserAPI.get.run({ id: '123' })
```
**Next**: [API integration patterns](./building-apis)

### "I want to transform data safely"
```typescript
import { pipeline, schema } from 'kairo/essential'

const processUser = pipeline('process-user')
  .input(UserSchema)
  .map(user => ({ ...user, displayName: user.name.toUpperCase() }))
  .map(user => ({ ...user, initials: user.name.split(' ').map(n => n[0]).join('') }))

const result = await processUser.run(userData)
```
**Next**: [Data processing patterns](./processing-data)

### "I want to store data with relationships"
```typescript
import { repository, schema, hasMany } from 'kairo/tier1'

const userRepo = repository('users', {
  schema: UserSchema,
  relationships: {
    posts: hasMany('posts', 'userId', PostSchema)
  }
})

const result = await userRepo.create(userData)
const userWithPosts = await userRepo.with('posts').find(userId)
```
**Next**: [Data persistence patterns](./managing-data#persistence)

## 🎓 Learning Progression

### Week 1: Foundation (Tier 1)
- **Days 1-2**: Error handling with Result pattern → [Your First App](./your-first-app)
- **Days 3-4**: Data modeling with schemas → [Managing Data](./managing-data)  
- **Days 5-7**: API integration → [Building APIs](./building-apis)

**✅ Success Criteria**: Can build basic applications with safe error handling

### Week 2-5: Production Ready (Tier 2)  
- **Week 2**: Enhanced error handling and debugging
- **Week 3**: Resilient API patterns (retry, timeout, caching)
- **Week 4**: Complete business logic patterns
- **Week 5**: Testing and functional programming utilities

**✅ Success Criteria**: Can deploy production applications confidently

### Week 6+: Specialization (Tier 3)
Choose your domain:
- 🚀 **Event-Driven Architecture**: [Event-driven examples](../examples/event-driven-architecture)
- ⚡ **High Performance**: [Performance optimization](../advanced-patterns/performance-optimization)  
- 🏢 **Enterprise Integration**: [Enterprise patterns](../examples/enterprise-integration)

## 🆘 Need Help?

### Common Issues
- **"Too many functions!"** → Start with [Your First App](./your-first-app) (just 5 functions)
- **"Complex examples!"** → Try [Essential patterns](./building-apis) first
- **"Performance concerns!"** → Review [bundle size optimization](../production-ready/performance-basics)

### Get Support
- 📚 **Documentation**: Complete guides for every tier
- 🐛 **Troubleshooting**: [Common issues and solutions](../troubleshooting/README)
- 💬 **Community**: Join our Discord for help and discussions

## 🔗 Quick Problem-Solving

### Common Development Challenges
👉 **[Common Patterns](../examples/common-patterns)** - Ready-to-use solutions for everyday problems  
👉 **[Decision Tree](../examples/decision-tree)** - Choose the right Kairo pattern for your situation

### Need Help Choosing?
- **"I don't know where to start"** → [Decision Tree](../examples/decision-tree)
- **"I have a specific problem"** → [Common Patterns](../examples/common-patterns)
- **"I want to see examples"** → [Examples Index](../examples/index)

## 🎯 What's Next?

Choose based on your experience level:

- **Never used Kairo**: → [Your First App](./your-first-app)
- **Familiar with functional programming**: → [Building APIs](./building-apis)  
- **Ready for production**: → [Production Ready Guide](../production-ready/README)
- **Need advanced features**: → [Advanced Patterns](../advanced-patterns/README)

Let's build something amazing with Kairo! 🚀