# Three-Pillar Architecture Overview ✅ IMPLEMENTED

> **The foundational architecture of Kairo V2 - built from scratch with strategic V1 reuse**  
> **Status: ✅ Complete three-pillar architecture implemented and functional**

## Core Philosophy

Kairo V2 is a **complete architectural redesign** built on **three pure abstractions** that handle the fundamental patterns in every application:

1. **SERVICE** - External system integration (HTTP APIs)
2. **PIPELINE** - Logic composition and workflows
3. **DATA** - Data validation, transformation, and processing

## The Three Pillars

### 🌐 SERVICE Pillar - External Integration

**Purpose**: Type-safe HTTP API integration with zero boilerplate

```typescript
// Simple: Smart defaults
const users = await service.get('/users')

// Flexible: Configure when needed
const users = await service.get('/users', {
  cache: true,
  retry: true,
  timeout: 5000,
  validate: UserSchema,
})
```

**Scope**:

- ✅ HTTP APIs only (GET, POST, PUT, DELETE, PATCH) - **IMPLEMENTED**
- ✅ Native HTTP client implementation - **IMPLEMENTED**
- ✅ Request/response transformation - **IMPLEMENTED**
- ❌ Not databases, files, or other external systems - **Design maintained**

**Implementation Status**: ✅ **5/5 methods + 4/4 utilities implemented**

### ⚡ PIPELINE Pillar - Logic Composition

**Purpose**: Declarative business logic and data transformation

```typescript
// Simple: Direct operations
const result = pipeline.map(data, transform)

// Flexible: Configure behavior
const result = pipeline.map(data, transform, {
  async: true,
  parallel: true,
  fallback: defaultValue,
})
```

**Scope**:

- ✅ Functional composition patterns
- ✅ Data transformation workflows
- ✅ Business rule validation
- ✅ Pure computation only

### 📊 DATA Pillar - Data Operations

**Purpose**: Comprehensive data validation, transformation, and processing

```typescript
// Simple: Basic validation
const isValid = data.validate(userData, UserSchema)

// Flexible: Rich processing
const result = data.aggregate(salesData, {
  groupBy: ['region', 'quarter'],
  sum: ['revenue'],
  avg: ['deals'],
  count: '*',
})
```

**Scope**:

- ✅ Schema validation (native, fast)
- ✅ Data transformation and mapping
- ✅ Aggregation and analytics
- ✅ Serialization and normalization

## Pillar Interactions

### **Independent Usage**

Each pillar works standalone:

```typescript
// SERVICE only
const response = await service.post('/users', userData)

// PIPELINE only
const clean = pipeline.filter(items, isValid)

// DATA only
const validated = data.validate(input, schema)
```

### **Composed Usage**

Pillars compose naturally:

```typescript
// SERVICE → DATA → PIPELINE flow
const processUsers = async filters => {
  // 1. Fetch from API
  const users = await service.get('/users', {
    params: filters,
    validate: UserSchema,
  })

  // 2. Validate and transform
  const validUsers = data.validate(users, UserSchema)
  const normalized = data.transform(validUsers, normalizeUser)

  // 3. Process with business logic
  const processed = pipeline.map(normalized, applyBusinessRules, {
    async: true,
    fallback: [],
  })

  return processed
}
```

## Design Principles

### **1. Predictable Over Clever**

- No magic behavior or context-awareness
- Same function signature patterns across pillars
- Configuration objects instead of method chaining

### **2. Simple by Default, Powerful When Needed**

- Zero configuration required for basic usage
- Rich configuration options for complex cases
- Smart defaults handle 80% of use cases

### **3. Universal Abstractions**

- Same patterns work in browser, Node.js, edge functions
- Framework-agnostic by design
- Environment-independent APIs

### **4. Complexity Absorption**

- Hard problems solved in Kairo internals
- Users get clean, declarative interfaces
- Progressive enhancement through configuration

## Benefits

### **For Developers**

- **Reduced Cognitive Load**: Three clear concepts instead of dozens
- **Predictable APIs**: Same patterns everywhere
- **Zero Boilerplate**: Kairo handles infrastructure concerns
- **Type Safety**: Full TypeScript inference throughout

### **For Applications**

- **Smaller Bundle Size**: Tree-shakable, focused API surface
- **Better Performance**: Native implementations, no external deps
- **Easier Testing**: Predictable functions, no magic
- **Maintainable Code**: Clear separation of concerns

## Migration from V1

### **V1 Mapping**

```typescript
// V1: Many concepts
resource()     → service()     // Focused on HTTP only
pipeline()     → pipeline()    // Enhanced with config objects
repository()   → data()        // Broader data operations
schema()       → data.schema() // Part of data pillar
transform()    → data.transform() // Part of data pillar
```

### **Implementation Strategy**

- **Built from scratch** - No V1 legacy constraints
- **Strategic component reuse** - Only proven V1 foundations:
  - `Result` pattern (error handling)
  - `native-schema` (3x faster than Zod)
  - FP utilities (curry, compose, pipe)
  - Error handling foundation

### **Simplification**

- **340+ functions** → **23 core methods** (93% reduction)
- **Multiple patterns** → **One consistent pattern** (function + config)
- **Complex composition** → **Simple function calls**
- **Method chaining** → **Configuration objects**

---

**Next**: [Data Flow Patterns](./data-flow-patterns.md) - How data moves between pillars
