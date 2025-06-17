# Kairo Tier-Based Imports

Choose the right import for your learning stage and project needs.

## Quick Start Guide

### 🚀 New to Kairo? Start here
```typescript
import { Result, schema, pipeline } from 'kairo/beginner'
```
**5 essential functions** for learning core concepts

### ⚡ Ready to build? Essential functions
```typescript
import { Result, schema, pipeline, resource, repository } from 'kairo/essential'
```
**8 core functions** for building real applications

### 🏗️ Need foundation? Complete core
```typescript
import { Result, schema, pipeline, resource, repository, rule } from 'kairo/tier1'
```
**15 functions** providing complete foundation patterns

### 🚀 Building production? Full power
```typescript
import { Result, schema, pipeline, retry, timeout } from 'kairo/tier2'
```
**40 functions** with production resilience and optimization

### 🎯 Need everything? Complete API
```typescript
import { Result, schema, pipeline, retry } from 'kairo'
```
**All 40 core functions** plus testing and extended FP utilities

## Detailed Import Options

### `kairo/beginner` (5 functions)
Perfect for first-time users and learning the basics.

**What's included:**
- `Result` - Safe error handling
- `schema` - Data validation  
- `pipeline` - Data processing
- `map` - Data transformation
- `match` - Result handling

**Use when:**
- Learning Kairo for the first time
- Teaching functional programming concepts
- Building simple demos or prototypes

### `kairo/essential` (8 functions)
Minimum viable API for building real applications.

**What's included:**
- Everything from beginner
- `resource` - API integration
- `repository` - Data persistence
- `pipe` - Function composition

**Use when:**
- Building micro-frontends with size constraints
- Want minimal bundle size
- Need core functionality without extras

### `kairo/tier1` (15 functions)
Complete foundation with all essential patterns.

**What's included:**
- Everything from essential
- `flatMap` - Advanced Result handling
- `createError` - Structured error creation
- `rule`, `rules` - Business validation  
- `hasMany`, `hasOne`, `belongsTo` - Data relationships
- `resourceUtils` - API helper utilities
- `cache` - Performance optimization

**Use when:**
- Building complete applications
- Need business rules and relationships
- Want solid foundation before production

### `kairo/tier2` (40 functions)
Production-ready with resilience and optimization.

**What's included:**
- Everything from tier1
- Enhanced error handling (`chain`, `mapError`, `chainError`)
- Complete schema types and repository operations
- Resilient API patterns (`resourceCache`)
- Advanced pipeline features (`tracing`)
- Business rule utilities (`commonRules`)
- Essential FP utilities (`tap`, `maybe`, `when`, `unless`)
- Data transformation system (`transform`)
- Complete testing utilities
- Extended functional programming utilities

**Use when:**
- Building production applications
- Need error recovery and debugging
- Want comprehensive testing support
- Team uses functional programming patterns

### `kairo` (40+ functions)
Complete core API with all utilities.

**What's included:**
- Everything from tier2
- Extended export pattern for convenience
- Clear JSDoc documentation with tier information

**Use when:**
- Want convenient access to everything
- Don't mind larger bundle size
- Building complex applications

## Learning Path Recommendations

### 1. Beginner → Essential (Week 1-2)
```typescript
// Week 1: Start with basics
import { Result, schema, pipeline } from 'kairo/beginner'

// Week 2: Add core capabilities  
import { Result, schema, pipeline, resource, repository } from 'kairo/essential'
```

### 2. Essential → Tier 1 (Week 3-5)
```typescript
// Week 3-4: Add business logic
import { rule, rules, hasMany, hasOne } from 'kairo/tier1'

// Week 5: Master complete foundation
import * from 'kairo/tier1'
```

### 3. Tier 1 → Tier 2 (Week 6-10)  
```typescript
// Week 6-7: Add production resilience
import { retry, timeout, tracing } from 'kairo/tier2'

// Week 8-10: Master production patterns
import * from 'kairo/tier2'
```

### 4. Tier 2 → Extensions (Week 11+)
```typescript
// Choose specialization tracks
import { eventBus, saga } from 'kairo/extensions/events'
import { CacheManager } from 'kairo/extensions/caching'
import { transactionManager } from 'kairo/extensions/transactions'
```

## Bundle Size Impact

| Import | Functions | Estimated Size* | Use Case |
|--------|-----------|----------------|----------|
| `kairo/beginner` | 5 | ~15KB | Learning |
| `kairo/essential` | 8 | ~25KB | Minimal apps |
| `kairo/tier1` | 15 | ~35KB | Complete foundation |
| `kairo/tier2` | 40 | ~50KB | Production apps |
| `kairo` | 40+ | ~55KB | Full convenience |

*Minified + gzipped estimates. Actual size depends on usage.

## Migration Guide

### From Full Import to Tiered
```typescript
// Before: Import everything
import { Result, schema, pipeline, /* many more */ } from 'kairo'

// After: Import only what you need
import { Result, schema, pipeline } from 'kairo/tier1'
```

### Adding Functions as Needed
```typescript
// Start small
import { Result, schema } from 'kairo/beginner'

// Add capabilities progressively
import { Result, schema, resource } from 'kairo/essential'
import { Result, schema, resource, rule } from 'kairo/tier1'
```

### Team Migration Strategy
1. **Week 1**: Everyone starts with `kairo/beginner`
2. **Week 2-3**: Move to `kairo/tier1` as foundation solidifies
3. **Week 4-6**: Adopt `kairo/tier2` for production features
4. **Week 7+**: Selective extension adoption based on needs

This tiered approach ensures teams can adopt Kairo at their own pace while maintaining access to the full power of the framework when needed.