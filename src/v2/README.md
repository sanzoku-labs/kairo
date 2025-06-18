# Kairo V2 Development

> **Complete V2 refactoring toward three-pillar architecture**

## Vision

Kairo V2 represents a fundamental shift toward **simplicity, predictability, and focused functionality**:

```typescript
// V1: Complex, many concepts, 340+ functions
resource(), pipeline(), repository(), schema(), transform(), rules(), cache()...

// V2: Simple, three pillars, ~45 functions
service(), pipeline(), data()
```

## The Three Pillars

### 🌐 **SERVICE** - HTTP APIs Only
```typescript
// Zero boilerplate HTTP integration
const users = await service.get('/users', { 
  cache: true, 
  retry: true, 
  validate: UserSchema 
})
```

### ⚡ **PIPELINE** - Logic Composition  
```typescript
// Functional business logic
const processed = pipeline.map(users, enrichUser, {
  async: true,
  parallel: true,
  fallback: []
})
```

### 📊 **DATA** - Complete Data Operations
```typescript
// Validation, transformation, aggregation
const insights = data.aggregate(salesData, {
  groupBy: ['region', 'quarter'],
  sum: ['revenue'],
  avg: ['orderValue']
})
```

## Key Improvements

### **Massive Simplification**
- **340+ functions** → **45 functions** (87% reduction)
- **Multiple patterns** → **One consistent pattern** (function + config)
- **Complex composition** → **Simple function calls**

### **Predictable APIs**
- No magic, no context-awareness, no surprises
- Configuration objects instead of method chaining
- Same patterns across all pillars

### **Major New Capabilities**
- **Data aggregation** (sum, avg, groupBy, pivot) - major V1 gap
- **Native HTTP client** optimized for Kairo patterns
- **Enhanced pipeline control flow** (branch, parallel, retry)

### **Universal TypeScript**
- Framework-agnostic (React, Vue, Node.js, Bun, edge)
- Zero external dependencies
- Full TypeScript inference

## Development Structure

```
src/v2/
├── specs/                  # Complete specifications
│   ├── architecture/      # Three-pillar architecture
│   ├── pillars/           # Detailed pillar specs
│   │   ├── service/       # HTTP-only service operations
│   │   ├── pipeline/      # Logic composition
│   │   └── data/          # Data operations + aggregation
│   ├── api-design/        # Consistent API patterns
│   └── implementation/    # Implementation strategy
├── core/                  # V2 implementation (coming)
├── examples/              # Usage examples (coming)
└── migration/             # V1→V2 migration tools (coming)
```

## Current Status

- ✅ **Complete specifications** - All three pillars designed
- ✅ **Implementation strategy** - 6-phase roadmap
- 🟡 **Phase 1: Foundation** - In progress
- ⏳ **Implementation** - Starting with SERVICE pillar

[View detailed status →](./specs/status.md)

## Philosophy Changes

### **V1 Philosophy Issues**
- ❌ Unclear boundaries (340+ functions)
- ❌ Multiple ways to do same thing
- ❌ Complex composition patterns
- ❌ Magic behavior and context-awareness

### **V2 Philosophy**
- ✅ **Three clear pillars** with focused responsibilities
- ✅ **One way per operation** - no confusion
- ✅ **Predictable functions** - configuration over magic
- ✅ **Complexity absorption** - hard problems solved in Kairo

## Example: Before & After

### **V1: Multiple concepts, complex patterns**
```typescript
// Many different patterns and concepts
const api = resource('users', { endpoint: '/users' })
const schema = nativeSchema.object({ name: string() })
const repo = repository('users', { schema, storage: 'memory' })
const transform = createTransform({ /* mapping */ })
const rules = businessRules([...])

// Complex composition
const result = await pipeline()
  .input(api.get())
  .validate(schema)
  .transform(transform)
  .rules(rules)
  .execute()
```

### **V2: Three pillars, simple patterns**
```typescript
// Three clear concepts, consistent patterns
const users = await service.get('/users', { 
  cache: true, 
  validate: UserSchema 
})

const processed = pipeline.map(users, enrichUser, { 
  async: true 
})

const insights = data.aggregate(processed, { 
  groupBy: ['region'], 
  sum: ['revenue'] 
})
```

## Key Documents

### **Start Here**
- [Three-Pillar Overview](./specs/architecture/three-pillar-overview.md) - Core architecture
- [Implementation Strategy](./specs/implementation/implementation-strategy.md) - Development roadmap
- [Current Status](./specs/status.md) - Real-time progress

### **Specifications**
- [SERVICE Methods](./specs/pillars/service/service-methods.md) - HTTP API operations
- [PIPELINE Methods](./specs/pillars/pipeline/pipeline-methods.md) - Logic composition
- [DATA Methods](./specs/pillars/data/data-methods.md) - Data operations

### **API Design**
- [Function Signatures](./specs/api-design/function-signatures.md) - Consistent patterns
- [Configuration Patterns](./specs/api-design/configuration-patterns.md) - Options design

## Implementation Timeline

```
🏗️  Phase 1: Foundation (Weeks 1-4)
    └─ Core infrastructure, Result pattern, types

🌐  Phase 2: SERVICE Pillar (Weeks 5-8)
    └─ HTTP methods, caching, retry, batch operations

📊  Phase 3: DATA Pillar (Weeks 9-12)
    └─ Schemas, validation, transformation, aggregation

⚡  Phase 4: PIPELINE Pillar (Weeks 13-16)
    └─ Map/filter/reduce, composition, control flow

🔗  Phase 5: Integration (Weeks 17-20)
    └─ Cross-pillar composition, optimization

🚀  Phase 6: Migration & Release (Weeks 21-24)
    └─ V1→V2 migration, documentation, release
```

## Success Criteria

### **Technical Goals**
- **Bundle size**: <50KB gzipped (optimized)
- **API surface**: <50 core methods (vs 340+ in V1)
- **Performance**: Within 10% of V1 equivalent operations
- **Type safety**: 100% TypeScript strict mode

### **Developer Experience**
- **Learning curve**: 3 core concepts (pillars)
- **Mental model**: Simple, predictable functions
- **Migration**: 80% automated for common patterns
- **Documentation**: Complete coverage

## Contributing to V2

### **Current Focus**: Phase 1 Foundation
1. Review [implementation strategy](./specs/implementation/implementation-strategy.md)
2. Check [current status](./specs/status.md) for priority tasks
3. Follow [function signature patterns](./specs/api-design/function-signatures.md)
4. Maintain [TypeScript strict mode](./specs/api-design/type-inference.md)

### **Getting Started**
```bash
# Work in develop branch for V2
git checkout develop

# Review specifications first
open src/v2/specs/README.md

# Check current implementation status
open src/v2/specs/status.md
```

---

**The future of Kairo**: Simple, predictable, powerful abstractions for the TypeScript ecosystem.

**Questions?** See [specifications](./specs/README.md) or check [current status](./specs/status.md)