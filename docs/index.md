---
layout: home

hero:
  name: "Kairo"
  text: "Clean Three-Pillar TypeScript Library"
  tagline: "23 methods. Configuration objects. Zero dependencies."
  image:
    src: /logo.svg
    alt: Kairo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/sovanaryththorng/kairo

features:
  - icon: 🏛️
    title: Three-Pillar Architecture
    details: SERVICE, DATA, and PIPELINE pillars with 23 focused methods. Clean separation of concerns with predictable patterns.
  - icon: ⚙️
    title: Configuration Objects
    details: No method chaining. Every method uses configuration objects for maximum flexibility and TypeScript inference.
  - icon: 🛡️
    title: Result Pattern
    details: Comprehensive error handling with Result<Error, Data> pattern. No exceptions, predictable error handling.
  - icon: 📦
    title: Zero Dependencies
    details: No external dependencies. Tree-shakable design optimized for modern JavaScript engines.
  - icon: 🎯
    title: TypeScript-First
    details: Full type inference, compile-time safety, and excellent IDE support with comprehensive JSDoc documentation.
  - icon: ⚡
    title: High Performance
    details: Native implementations faster than schema libraries. Optimized for modern JavaScript engines.

# Quick Example Section
---

## Quick Example

```typescript
import { service, data, pipeline, Result } from 'kairo'

// SERVICE: HTTP operations with configuration
const users = await service.get('/api/users', {
  timeout: 5000,
  retry: { attempts: 3 },
  cache: { enabled: true, ttl: 300 }
})

// DATA: Schema creation and validation
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  active: { type: 'boolean' }
})

// PIPELINE: Logic composition
const processUsers = pipeline.compose([
  users => pipeline.filter(users, user => user.active),
  users => pipeline.map(users, user => data.validate(user, UserSchema)),
  users => data.aggregate(users, {
    groupBy: ['department'],
    sum: ['salary'],
    avg: ['experience']
  })
])

// Result pattern for error handling
const result = await processUsers(users)
Result.match(result, {
  Ok: analytics => console.log('Success:', analytics),
  Err: error => console.error('Error:', error.message)
})
```

## Why Kairo?

### 🎯 **Focused & Predictable**
- **23 core methods** across 3 pillars
- **Configuration objects** everywhere - no method chaining
- **Consistent patterns** - learn once, use everywhere
- **TypeScript-first** with full type inference

### 🚀 **Production Ready**
- **Zero dependencies** - no supply chain risks
- **Tree-shakable** - only bundle what you use
- **Native validation** - faster than schema libraries
- **Comprehensive error handling** with Result pattern

### 🏗️ **Well Architected**
- **Clean separation** between SERVICE, DATA, and PIPELINE
- **Composable by design** - mix and match as needed
- **Framework agnostic** - works with any TypeScript project
- **Four-layer architecture** ensures maintainability

---

## Three Pillars

### 🔗 SERVICE Pillar
**HTTP-only API operations** with rich configuration support.

```typescript
// GET with validation and caching
const users = await service.get('/api/users', {
  headers: { Authorization: 'Bearer token' },
  timeout: 5000,
  retry: { attempts: 3, delay: 1000 },
  cache: { enabled: true, ttl: 300 },
  validate: UserArraySchema
})
```

**Methods**: `get()`, `post()`, `put()`, `patch()`, `delete()` + 4 utilities

### 📊 DATA Pillar
**Data validation, transformation, and aggregation** with native performance.

```typescript
// Schema creation and validation
const ProductSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 1, max: 200 },
  price: { type: 'number', min: 0 },
  category: { type: 'string', enum: ['electronics', 'books'] }
})

// Data aggregation
const analytics = data.aggregate(salesData, {
  groupBy: ['region', 'quarter'],
  sum: ['revenue', 'units'],
  avg: ['satisfaction'],
  count: ['orders']
})
```

**Methods**: `schema()`, `validate()`, `transform()`, `convert()`, `aggregate()`, `groupBy()`, `serialize()`, `deserialize()`, `clone()`, `merge()` + 6 utilities

### ⚡ PIPELINE Pillar
**Logic composition and workflows** with functional programming patterns.

```typescript
// Complex data processing pipeline
const dataProcessor = pipeline.compose([
  // Step 1: Validate input
  data => pipeline.validate(data, InputSchema),
  
  // Step 2: Transform and filter
  data => pipeline.map(data, item => ({ ...item, processed: true })),
  data => pipeline.filter(data, item => item.isValid),
  
  // Step 3: Aggregate results
  data => data.aggregate(data, {
    groupBy: ['type'],
    sum: ['amount'],
    count: ['items']
  })
])
```

**Methods**: `map()`, `filter()`, `reduce()`, `compose()`, `chain()`, `branch()`, `parallel()`, `validate()` + 5 utilities

---

## Get Started

<div class="tip custom-block" style="padding-top: 8px">

Ready to build with Kairo? Start with our [Getting Started Guide](/guide/getting-started) or explore [Examples](/examples/) to see real-world usage patterns.

</div>

## Community & Support

- **GitHub**: [sanzoku-labs/kairo](https://github.com/sanzoku-labs/kairo)
- **Issues**: Report bugs and request features
- **Discussions**: Community support and questions
- **Contributing**: We welcome contributions!

---

<div class="tip custom-block">

**Ready for Production**: Kairo is production-ready with 100% TypeScript compliance, zero ESLint warnings, and comprehensive test coverage.

</div>