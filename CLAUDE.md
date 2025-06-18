# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kairo is undergoing a **complete V2 refactoring** to create a simplified, predictable three-pillar TypeScript platform.

### **Current Status: V2 Development**
- **V1**: Complex platform with 340+ functions (being completely replaced)
- **V2**: Simplified three-pillar architecture with 45 functions
- **Branch**: `develop` (all V2 work happens here)
- **Strategy**: Complete replacement, no V1 maintenance

### **V2 Three-Pillar Architecture**
1. **SERVICE** - HTTP-only API integration (14 methods)
2. **PIPELINE** - Logic composition (15 methods) 
3. **DATA** - Data operations + aggregation (16 methods)

## Development Commands

### Essential Commands
- **Build**: `bun run build` - Build using tsup
- **Development**: `bun run dev` - Watch mode building
- **Test**: `bun run test` - Run tests with Vitest
- **Test (watch)**: `bun run test:watch` - Watch mode testing
- **Test (coverage)**: `bun run test:coverage` - Generate coverage reports
- **Type checking**: `bun run typecheck` - Validate TypeScript
- **Linting**: `bun run lint` - Run ESLint validation
- **Formatting**: `bun run format` - Format with Prettier

### Documentation Commands
- **Docs (dev)**: `bun run docs:dev` - Local documentation server
- **Docs (build)**: `bun run docs:build` - Build documentation site
- **API docs**: `bun run docs:api` - Generate TypeDoc API documentation

## V2 Implementation Strategy

### **Hybrid Approach: Reuse + Rebuild**

#### **REUSE from V1** (15K+ lines of proven code)
- ✅ **Result Pattern** (`src/core/result.ts`) - Excellent error handling foundation
- ✅ **Native Schemas** (`src/core/native-schema.ts`) - 3x faster than Zod, zero deps
- ✅ **FP Utilities** (`src/utils/fp/`) - Comprehensive functional programming tools

#### **BUILD NEW for V2**
- 🔵 **SERVICE Pillar** - HTTP-only (V1 resource() was too broad)
- ⚡ **PIPELINE Pillar** - Config objects (V1 used method chaining)
- 📊 **DATA Pillar** - Enhanced with aggregation (major V1 gap)

## V2 Specifications (Source of Truth)

All V2 development follows specifications in `src/v2/specs/`:

### **Architecture Specs**
- [Three-Pillar Overview](./src/v2/specs/architecture/three-pillar-overview.md)
- [Data Flow Patterns](./src/v2/specs/architecture/data-flow-patterns.md)

### **Pillar Specifications**
- [SERVICE Methods](./src/v2/specs/pillars/service/service-methods.md) - HTTP-only operations
- [PIPELINE Methods](./src/v2/specs/pillars/pipeline/pipeline-methods.md) - Logic composition
- [DATA Methods](./src/v2/specs/pillars/data/data-methods.md) - Data operations + aggregation

### **API Design Standards**
- [Function Signatures](./src/v2/specs/api-design/function-signatures.md) - Consistent patterns
- [Implementation Strategy](./src/v2/specs/implementation/implementation-strategy.md) - Development roadmap

## V2 Core Design Principles

### **1. Predictable Over Clever**
```typescript
// V2 Pattern: Simple, predictable functions
const users = await service.get('/users', { 
  cache: true, 
  retry: true, 
  validate: UserSchema 
})

// NOT: Magic context-awareness or method chaining
```

### **2. Configuration Objects Only**
```typescript
// V2: Configuration objects
pipeline.map(data, transform, { async: true, parallel: true })
data.aggregate(sales, { groupBy: ['region'], sum: ['revenue'] })

// NOT: Method chaining or fluent APIs
```

### **3. Three Clear Pillars**
```typescript
// SERVICE: HTTP APIs only
service.get() | service.post() | service.put() | service.patch() | service.delete()

// PIPELINE: Logic composition
pipeline.map() | pipeline.filter() | pipeline.reduce() | pipeline.compose()

// DATA: Complete data operations
data.schema() | data.validate() | data.transform() | data.aggregate()
```

### **4. Universal TypeScript Patterns**
- Works everywhere: browser, Node.js, Bun, Deno, edge functions
- Framework-agnostic: React, Vue, Node, any TypeScript environment
- Zero external dependencies

## Development Guidelines

### **V2 Implementation Rules**
1. **Follow specifications exactly** - No deviations from `src/v2/specs/`
2. **Use Result pattern** - All operations return `Result<Error, Data>`
3. **Configuration objects** - No method chaining or fluent APIs
4. **TypeScript strict mode** - Full type safety
5. **Zero external deps** - Native implementations only

### **Code Quality Standards**
- **Result pattern** for all error handling
- **Native schemas** for validation (not Zod)
- **FP utilities** from `src/utils/fp/` for composition
- **TypeScript inference** - minimal type annotations needed
- **Predictable behavior** - no magic, no surprises

### **File Structure**
```
src/
├── core/           # V1 components (reusable: result, native-schema, etc.)
├── utils/fp/       # V1 FP utilities (reuse directly)
├── v2/             # V2 development
│   ├── specs/      # Complete V2 specifications
│   ├── core/       # V2 implementation (coming)
│   └── README.md   # V2 overview
└── extensions/     # V1 extensions (evaluate per extension)
```

## Implementation Priorities

### **Current Phase: Foundation Setup**
- [x] Complete V2 specifications
- [ ] Set up V2 build system
- [ ] Implement base infrastructure (Result, errors, types)
- [ ] Create method signature framework

### **Phase Sequence**
1. **Foundation** (Weeks 1-4) - Core infrastructure
2. **SERVICE Pillar** (Weeks 5-8) - HTTP-only methods
3. **DATA Pillar** (Weeks 9-12) - Schemas + aggregation
4. **PIPELINE Pillar** (Weeks 13-16) - Logic composition
5. **Integration** (Weeks 17-20) - Cross-pillar composition
6. **Release** (Weeks 21-24) - Documentation + migration

[View detailed status →](./src/v2/specs/status.md)

## Key V2 Improvements

### **Massive Simplification**
- **API Surface**: 340+ functions → 45 functions (87% reduction)
- **Learning Curve**: Many concepts → 3 pillars
- **Mental Model**: Complex patterns → Simple configuration

### **Major New Capabilities**
- **Data Aggregation**: sum, avg, groupBy, pivot (major V1 gap)
- **Native HTTP Client**: Optimized for Kairo patterns
- **Enhanced Pipelines**: branch, parallel, retry with config objects

### **Better Developer Experience**
- **Predictable APIs**: Same patterns everywhere
- **Zero Magic**: No context-awareness or surprising behavior
- **Universal**: Same abstractions across TypeScript ecosystem

## Testing Requirements

### **V2 Testing Standards**
- **Unit tests**: 90% coverage target
- **Integration tests**: Cross-pillar composition
- **Performance tests**: Benchmark against V1 equivalents
- **Type tests**: Validate TypeScript inference

### **Test Structure**
```typescript
// V2 test pattern using Result assertions
test('service.get returns Result with data', async () => {
  const result = await service.get('/users')
  expect(Result.isOk(result)).toBe(true)
  if (Result.isOk(result)) {
    expect(result.value).toBeDefined()
  }
})
```

## Working with V2

### **Before Making Changes**
1. **Read specifications** in `src/v2/specs/`
2. **Check current status** in `src/v2/specs/status.md`
3. **Follow API patterns** in `src/v2/specs/api-design/`
4. **Understand phase priorities** in implementation strategy

### **Development Workflow**
1. Work in `develop` branch
2. Follow V2 specifications exactly
3. Reuse V1 components where specified (Result, schemas, FP utils)
4. Build new architecture for SERVICE, PIPELINE, DATA pillars
5. Maintain predictable function patterns

### **When to Reuse V1 Code**
- ✅ `src/core/result.ts` - Proven Result pattern
- ✅ `src/core/native-schema.ts` - High-performance schemas
- ✅ `src/utils/fp/` - Mature functional utilities
- ❌ `src/core/resource.ts` - Too broad for V2 SERVICE pillar
- ❌ `src/core/repository.ts` - Replaced by enhanced DATA pillar

## Questions or Issues

For V2 development questions:
1. Check [V2 specifications](./src/v2/specs/README.md)
2. Review [implementation strategy](./src/v2/specs/implementation/implementation-strategy.md)
3. Verify [current status](./src/v2/specs/status.md)

---

**Remember**: V2 is a complete replacement focused on simplicity, predictability, and focused functionality. Every decision should align with the three-pillar architecture and configuration-over-composition principles.