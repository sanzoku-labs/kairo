# What is Kairo?

Kairo is a clean, focused TypeScript library built around three core pillars with a simple configuration object pattern. It provides 23 essential methods across SERVICE, DATA, and PIPELINE operations with zero dependencies.

## Core Philosophy

### 🎯 **Focused & Predictable**
- **23 core methods** - exactly what you need, nothing more
- **Configuration objects** everywhere - no method chaining
- **Consistent patterns** - learn once, use everywhere
- **TypeScript-first** with full type inference

### 🏛️ **Three-Pillar Architecture**

Kairo organizes functionality into three distinct pillars:

1. **SERVICE Pillar** - HTTP-only API operations (5 methods + 4 utilities)
2. **DATA Pillar** - Data validation, transformation, aggregation (10 methods + 6 utilities)  
3. **PIPELINE Pillar** - Logic composition and workflows (8 methods + 5 utilities)

Each pillar is independent but designed to work seamlessly together.

### ⚙️ **Configuration Object Pattern**

Every method uses configuration objects instead of method chaining:

```typescript
// ✅ Configuration objects (Kairo approach)
service.get('/api/data', {
  timeout: 5000,
  retry: { attempts: 3 },
  cache: { enabled: true }
})

// ❌ Method chaining (what we avoid)
client.timeout(5000).retry(3).cache().get('/api/data')
```

This approach provides:
- **Better TypeScript inference** - full autocompletion
- **Clearer intent** - all options visible at call site
- **Easier testing** - configuration objects are easily mocked
- **Better composability** - configurations can be reused

### 🛡️ **Result Pattern**

All operations return `Result<Error, Data>` for safe error handling:

```typescript
type Result<E, T> = 
  | { tag: 'Ok'; value: T }
  | { tag: 'Err'; error: E }

// Usage with pattern matching
const result = await service.get('/api/users')
Result.match(result, {
  Ok: users => console.log('Success:', users),
  Err: error => console.error('Error:', error.message)
})

// Or with type guards
if (Result.isOk(result)) {
  // result.value is properly typed
  console.log('Users:', result.value)
}
```

## Why Choose Kairo?

### 🚀 **Production Benefits**

- **Zero dependencies** - no supply chain risks
- **Tree-shakable** - only bundle what you use
- **Native performance** - faster than schema libraries
- **Comprehensive error handling** - no silent failures

### 🏗️ **Development Benefits**

- **Excellent TypeScript support** - full type inference
- **Predictable APIs** - consistent patterns across all methods
- **Clear error messages** - structured error reporting
- **Framework agnostic** - works with any TypeScript project

### 🔧 **Architecture Benefits**

- **Clean separation of concerns** - each pillar has a specific purpose
- **Composable by design** - mix and match as needed
- **Four-layer architecture** - maintainable and extensible
- **Functional programming friendly** - immutable by default

## When to Use Kairo

### ✅ **Perfect for:**
- **API clients** - rich HTTP configuration with validation
- **Data processing** - transformation and aggregation pipelines
- **Workflow orchestration** - complex business logic composition
- **TypeScript projects** - full type safety and inference
- **Production applications** - zero dependencies, high performance

### 🤔 **Consider alternatives for:**
- **Simple scripts** - might be overkill for basic operations
- **React components** - use React-specific libraries for UI state
- **Database queries** - use dedicated ORM/query builders
- **Real-time features** - use WebSocket/SSE specific libraries

## Architecture Overview

Kairo follows a four-layer architecture:

```
┌─────────────────────────────────────────┐
│           Core Methods (23)             │ ← Public API
├─────────────────────────────────────────┤
│      Configuration Objects              │ ← Type-safe configs
├─────────────────────────────────────────┤  
│         Public Utilities               │ ← Helper functions
├─────────────────────────────────────────┤
│        Internal Utilities              │ ← Implementation details
└─────────────────────────────────────────┘
```

This design ensures:
- **Predictable API surface** - only 23 methods to learn
- **Rich configuration** - extensive options without complexity
- **Clear boundaries** - public vs internal interfaces
- **Easy testing** - each layer can be tested independently

## Next Steps

Ready to get started? Check out:

- [Getting Started](/guide/getting-started) - Installation and first steps
- [Quick Start](/guide/quick-start) - Your first Kairo application
- [Architecture](/guide/architecture) - Deep dive into the three pillars
- [Examples](/examples/) - Real-world usage patterns