# API Curation & Learning Experience Specification

**Document**: API Curation & Learning Experience Implementation  
**Version**: 1.0  
**Phase**: Phase 1 (API Curation & Learning Experience)  
**Priority**: High

---

## 🎯 Objective

Improve Kairo's developer experience by curating the API surface, creating progressive learning paths, and organizing documentation around developer goals rather than internal architecture.

### Success Criteria

- **Learning Time**: < 30 minutes to understand core concepts and build first app
- **Progressive Mastery**: Clear 15 → 40 → 100+ function learning tiers
- **Cognitive Load**: Reduce overwhelming choice without losing feature richness
- **Developer Satisfaction**: 90%+ positive feedback on learning experience
- **Feature Preservation**: 100% of current Kairo capabilities remain accessible

---

## 📋 Problem Analysis

### Current Challenges

1. **Massive API Surface**: ~340+ exported functions/types/classes
2. **Equal Presentation**: All functions presented with equal importance
3. **Architecture-First Documentation**: Organized by internal structure, not user goals
4. **Choice Paralysis**: Multiple ways to accomplish the same task without guidance
5. **Steep Learning Curve**: No clear progression from beginner to advanced usage

### Root Cause

Kairo's richness is its strength, but without curation and progressive disclosure, it becomes overwhelming for new developers.

---

## 🏗️ Implementation Strategy

### **1. API Tiering System**

#### **Tier 1: Essential First Week (15 functions)**
Core functions that enable building a functional application:

```typescript
// Result Pattern (5 functions)
Result, Result.Ok, Result.Err, map, flatMap

// One Pillar Focus - DATA (5 functions)
schema.string(), schema.number(), schema.object(), repository(), transform()

// Basic Composition (5 functions)
pipe, compose, identity, isNil, isEmpty
```

#### **Tier 2: Production Ready (40 functions)**
Functions needed for real-world applications:

```typescript
// Complete Result handling
Result pattern + chain, mapError, match, unwrap

// Multi-pillar integration
resource(), pipeline(), rules()

// Essential FP utilities (20 functions)
map, filter, flatMap, maybe, asyncPipe, tryCatch, etc.

// Error handling
createError, chainError, isKairoError
```

#### **Tier 3: Advanced Patterns (100+ functions)**
Full feature set for complex applications:

```typescript
// Advanced pipelines
tracing, cache, transaction support

// Complex data patterns
hasOne, hasMany, belongsTo relationships

// Performance utilities
BatchProcessor, ResourcePool, Lazy

// Specialized FP utilities
curry functions, effect utilities, advanced combinators
```

#### **Tier 4: Expert Level (340+ functions)**
Complete API surface for library contributors and framework builders.

### **2. Documentation Reorganization**

#### **Problem-First Structure**

```
docs/
├── getting-started/
│   ├── your-first-app.md           # Tier 1 functions
│   ├── building-apis.md            # INTERFACE pillar focus
│   ├── processing-data.md          # PROCESS pillar focus
│   └── managing-data.md            # DATA pillar focus
├── production-ready/
│   ├── error-handling.md           # Tier 2 - robust apps
│   ├── validation-patterns.md      # Multi-pillar integration
│   └── performance-basics.md       # Essential optimizations
├── advanced-patterns/
│   ├── complex-workflows.md        # Tier 3 - enterprise apps
│   ├── extension-integration.md    # Using extensions effectively
│   └── custom-patterns.md          # Building domain-specific solutions
└── api-reference/
    ├── by-tier/                    # Functions organized by learning tier
    ├── by-pillar/                  # Traditional pillar organization
    └── alphabetical/               # Complete API listing
```

#### **Contextual Examples**

Replace abstract API documentation with problem-solution pairs:

```markdown
## "I want to build a REST API"
→ Start with `resource()` + `schema()` (Tier 1)
→ Add validation with `rules()` (Tier 2)
→ Add caching and monitoring (Tier 3)

## "I need to process data"
→ Start with `transform()` + `pipe()` (Tier 1)
→ Add error handling with Result pattern (Tier 2)
→ Add complex workflows (Tier 3)
```

### **3. Smart Defaults and Method Chaining**

#### **Reduce Configuration Overhead**

```typescript
// Before: Too much configuration
const userAPI = resource('users', {
  list: { 
    path: '/users', 
    method: 'GET', 
    response: UserArraySchema 
  },
  get: { 
    path: '/users/:id', 
    method: 'GET', 
    params: IdParamsSchema,
    response: UserSchema 
  },
  // ... more boilerplate
})

// After: Smart defaults with progressive enhancement
const userAPI = resource('users')
  .withSchema(UserSchema)
  .withAuth(bearerToken)
  // Automatically generates CRUD methods with sensible defaults
  // Can still override specific methods when needed
```

#### **Progressive Method Chaining**

```typescript
// Start simple
const validation = rules().required().string()

// Add complexity as needed
const advancedValidation = validation
  .minLength(3)
  .matches(/^[a-zA-Z]+$/)
  .custom(async (value) => await isUnique(value))
```

### **4. Opinionated Happy Paths**

#### **"The Kairo Way" Guidelines**

Create clear recommendations for common patterns:

```typescript
// ✅ Recommended: Standard validation pattern
const userRules = rules('user')
  .field('email').required().email()
  .field('name').required().string().minLength(2)

// ⚠️ Advanced: Custom validation (show when to use)
const customUserRules = rule('user', (data) => {
  // Complex custom logic
})

// ❌ Avoid: Multiple validation patterns in same codebase
// (Provide migration guide)
```

#### **Decision Trees**

Help developers choose the right approach:

```
Building an API?
├── Simple CRUD? → Use resource() with smart defaults
├── Complex business logic? → Add pipeline() + rules()
├── High performance? → Add caching extension
└── Enterprise features? → Add transactions + events

Processing Data?
├── Simple transformation? → Use transform() + pipe()
├── Validation needed? → Add schema() + rules()
├── Async operations? → Use asyncPipe + Result pattern
└── Complex workflows? → Use workflow extension
```

---

## 🎓 Enhanced Learning Experience

### **1. Error-Driven Learning**

#### **Helpful Error Messages**

```typescript
// Current: Generic error
"Validation failed"

// Enhanced: Learning-focused error
"Validation failed: field 'email' is required
💡 Learn more: Use schema.string().email() for email validation
📚 Guide: /docs/validation-patterns
🔧 Quick fix: Add .required() to your schema"
```

#### **Progressive Hints**

```typescript
// In development mode
console.warn(`
💡 Kairo Suggestion: You're calling this resource frequently.
   Consider adding caching: .withCache({ ttl: 300000 })
   Learn more: /docs/performance-basics#caching
`)
```

### **2. Interactive Learning Tools**

#### **Pattern Templates**

```typescript
// Kairo CLI command: `kairo create api`
// Generates:
export const UserAPI = resource('users')
  .withSchema(UserSchema) // ← Auto-generated based on prompts
  .withValidation(userRules) // ← Standard validation pattern
  .withAuth() // ← If authentication selected

// Includes inline comments explaining each part
```

#### **Upgrade Suggestions**

```typescript
// IDE hints when hovering over basic patterns
const users = resource('users') 
// 💡 Hover hint: "Add validation with .withValidation(rules)"
// 💡 Hover hint: "Enable caching with .withCache(options)"
// 💡 Quick actions: "Generate CRUD operations", "Add authentication"
```

### **3. Learning Path Integration**

#### **Documentation Navigation**

```markdown
# Current Tier: Production Ready (Tier 2)
✅ Completed: Essential First Week
🔄 In Progress: Production Ready → 65% complete
⏭️ Next: Advanced Patterns

## Related Learning
- If you're struggling: Review Tier 1 concepts
- If this is easy: Preview Tier 3 patterns
- Common next steps: Add caching, improve error handling
```

---

## 🧪 Implementation Plan

### **Week 1: API Analysis & Tiering**

#### **Day 1-2: API Usage Analysis**
- Analyze current examples, tests, and documentation
- Identify actual usage patterns vs exposed API surface
- Create data-driven function importance ranking
- Map common developer workflows to function combinations

#### **Day 3-4: Tier Definition**
- Define the 15 Tier 1 functions based on usage analysis
- Expand to 40 Tier 2 functions for production readiness
- Identify 100+ Tier 3 functions for advanced use cases
- Document progression logic and learning rationale

#### **Day 5: Export Reorganization**
- Reorganize `src/index.ts` exports by tier importance
- Add clear grouping comments and JSDoc annotations
- Create tier-based export files (index-tier1.ts, etc.)
- Implement smart defaults for common configurations

### **Week 2: Documentation Revolution**

#### **Day 1-2: Problem-First Documentation**
- Restructure documentation around developer goals
- Create contextual examples for common use cases
- Build decision trees and recommendation engines
- Add cross-references between related concepts

#### **Day 3-4: Learning Path Creation**
- Create progressive learning guides for each tier
- Add clear advancement criteria and checkpoints
- Build interactive examples and exercises
- Implement progress tracking and recommendations

#### **Day 5: Error Message Enhancement**
- Improve error messages with learning hints
- Add contextual documentation links
- Implement development mode suggestions
- Create troubleshooting guides

### **Week 3: Validation & Polish**

#### **Day 1-2: Developer Testing**
- Test learning progression with real developers
- Validate tier boundaries and progression logic
- Gather feedback on documentation clarity
- Measure learning time and success rates

#### **Day 3-4: Tooling Integration**
- Create CLI tools for common patterns
- Add IDE hints and quick actions
- Build pattern templates and generators
- Implement upgrade suggestion system

#### **Day 5: Final Integration**
- Polish all documentation and examples
- Ensure consistent cross-references and navigation
- Create comprehensive learning metrics
- Prepare for community feedback and iteration

---

## 📊 Success Metrics

### **Learning Experience Metrics**

- **Time to First Success**: < 30 minutes to build working app with Tier 1
- **Progression Rate**: 80% of developers advance from Tier 1 to Tier 2 within first week
- **Documentation Satisfaction**: 90%+ positive feedback on new structure
- **Error Resolution**: 70% reduction in support questions about basic usage

### **Technical Quality Metrics**

- **API Coverage**: 100% of current features remain accessible
- **Performance**: No regression in API performance
- **Backward Compatibility**: Existing code continues to work unchanged
- **Bundle Size**: No increase in core bundle size

### **Adoption Metrics**

- **Developer Engagement**: Increased time spent in documentation
- **Pattern Consistency**: Higher adoption of recommended patterns
- **Community Contribution**: More examples and guides from community
- **Framework Usage**: Higher percentage of Kairo features used in real projects

---

## ✅ Acceptance Criteria

### **Functional Requirements**

- [ ] Clear API tiers defined with progression logic
- [ ] Documentation reorganized around developer goals  
- [ ] Error messages provide learning guidance
- [ ] Smart defaults reduce configuration overhead
- [ ] Interactive learning tools and templates available

### **Quality Requirements**

- [ ] All existing Kairo features remain accessible
- [ ] No performance regression in core functionality
- [ ] Complete backward compatibility maintained
- [ ] Comprehensive testing of learning progression

### **User Experience Requirements**

- [ ] New developers can build apps in < 30 minutes with Tier 1
- [ ] Clear advancement paths between tiers
- [ ] Documentation answers "how to accomplish X" questions
- [ ] Community validation shows improved learning experience

---

## 🔗 Related Documents

- [Learning Experience Specification](./LEARNING_EXPERIENCE_SPEC.md) - Detailed documentation strategy
- [API Tiers Specification](./API_TIERS_SPEC.md) - Function categorization and progression
- [Implementation Checklist](../IMPLEMENTATION_CHECKLIST.md) - Phase 1 tracking
- [Enhancement Roadmap](../KAIRO_ENHANCEMENT_SPEC.md) - Overall project context

---

**Next Phase**: [Phase 2: Integration Patterns](../integration/INTEGRATION_PATTERNS_SPEC.md)