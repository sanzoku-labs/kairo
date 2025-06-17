# API Tiers Specification

**Document**: Function Categorization & Learning Progression  
**Version**: 1.0  
**Phase**: Phase 1 (API Curation & Learning Experience)  
**Priority**: High

---

## 🎯 Objective

Define clear tiers of Kairo's **existing functionality** based on learning progression and usage patterns, enabling developers to master the framework incrementally through better organization and documentation.

### Core Philosophy

**Pure Organization Approach**: Tiers are for learning organization only, not feature restriction:
- ✅ **All APIs Preserved**: Every existing function remains available and unchanged
- ✅ **No Feature Hiding**: Tiers guide learning, don't limit access
- ✅ **Flexible Usage**: Developers can use any function at any time
- ✅ **Documentation Focus**: Tiers organize docs and examples, not functionality

### Success Criteria

- **Clear Learning Boundaries**: Unambiguous tier assignments for all 340+ API elements
- **Logical Progression**: Each tier builds naturally on previous tiers  
- **Usage Alignment**: Tier assignments match real-world learning patterns
- **Complete Coverage**: 100% of existing API surface categorized appropriately
- **Validation**: Developer testing confirms tier-based learning effectiveness

---

## 📊 Tiering Methodology

### **Classification Criteria**

1. **Usage Frequency**: How often is this function used in real applications?
2. **Learning Complexity**: How difficult is this concept to understand?
3. **Dependency Requirements**: What other concepts must be learned first?
4. **Problem Scope**: What class of problems does this solve?
5. **Alternative Availability**: Are there simpler ways to accomplish the same goal?

### **Tier Assignment Principles**

- **Tier 1**: Essential for basic functionality, low complexity, high frequency
- **Tier 2**: Required for production apps, moderate complexity, medium frequency
- **Tier 3**: Advanced use cases, high complexity, specialized frequency
- **Tier 4**: Framework internals, expert-level, rare usage

---

## 📋 Detailed Tier Definitions

### **Tier 1: Essential First Week (15 functions)**

**Goal**: Build a functional application  
**Time Investment**: 2-4 hours  
**Use Cases**: Basic CRUD, simple validation, error handling

#### **Result Pattern (5 functions)**

| Function     | Purpose                              | Learning Priority |
| ------------ | ------------------------------------ | ----------------- |
| `Result.Ok`  | Create successful result             | Critical          |
| `Result.Err` | Create error result                  | Critical          |
| `map`        | Transform success value              | Critical          |
| `flatMap`    | Chain operations that return Results | Critical          |
| `Result`     | Type constructor/namespace           | Critical          |

**Rationale**: Error handling is fundamental to all Kairo operations. These 5 functions enable safe composition of operations.

#### **Core Pillar Entry Points (5 functions)**

| Function          | Pillar    | Purpose                     | When to Learn         |
| ----------------- | --------- | --------------------------- | --------------------- |
| `schema.string()` | DATA      | String validation           | First data validation |
| `schema.object()` | DATA      | Object structure validation | Building forms/APIs   |
| `resource()`      | INTERFACE | Create API resource         | Building REST APIs    |
| `pipeline()`      | PROCESS   | Create processing pipeline  | Data transformation   |
| `repository()`    | DATA      | Data storage abstraction    | Database operations   |

**Rationale**: One entry point per pillar allows developers to focus on their primary use case while understanding Kairo's architecture.

#### **Essential Composition (5 functions)**

| Function   | Purpose                            | Usage Pattern               |
| ---------- | ---------------------------------- | --------------------------- |
| `pipe`     | Left-to-right function composition | Primary composition pattern |
| `compose`  | Right-to-left function composition | Mathematical composition    |
| `identity` | No-op function for composition     | Default values, testing     |
| `isNil`    | Check for null/undefined           | Defensive programming       |
| `isEmpty`  | Check for empty values             | Data validation             |

**Rationale**: Basic functional programming concepts needed for effective Kairo usage.

#### **Tier 1 Complete Example**

```typescript
import { Result, map, flatMap, schema, resource, pipe, isNil } from 'kairo'

// Schema definition
const UserSchema = schema.object({
  name: schema.string(),
  email: schema.string().email(),
})

// Resource creation
const UserAPI = resource('users', {
  create: {
    path: '/users',
    method: 'POST',
    body: UserSchema,
    response: UserSchema,
  },
})

// Usage with error handling
const createUser = pipe(
  userData => (isNil(userData) ? Result.Err('User data is required') : Result.Ok(userData)),
  flatMap(data => UserAPI.create.run({ body: data })),
  map(user => ({ ...user, createdAt: new Date() }))
)

// Can build functional apps with just these 15 functions
```

### **Tier 2: Production Ready (40 functions)**

**Goal**: Build robust, real-world applications  
**Time Investment**: 1-2 weeks  
**Use Cases**: Production APIs, complex validation, error handling, basic performance

#### **Extended Result Pattern (8 functions)**

| Function           | Purpose                         | When Needed                      |
| ------------------ | ------------------------------- | -------------------------------- |
| `chain`            | Alias for flatMap               | Alternative naming               |
| `mapError`         | Transform error values          | Error handling patterns          |
| `match`            | Pattern matching on Result      | Complex result handling          |
| `unwrap`           | Extract value (unsafe)          | Testing, controlled environments |
| `Result.isOk`      | Type guard for success          | Control flow                     |
| `Result.isErr`     | Type guard for error            | Control flow                     |
| `Result.from`      | Convert from throwing function  | Integration with external code   |
| `Result.fromAsync` | Convert async throwing function | Async integration                |

#### **Multi-Pillar Integration (12 functions)**

| Function                     | Pillar Combination | Purpose                    |
| ---------------------------- | ------------------ | -------------------------- |
| `rules()`                    | DATA + PROCESS     | Business rule validation   |
| `rule()`                     | DATA + PROCESS     | Single business rule       |
| `transform()`                | DATA + PROCESS     | Data transformation        |
| `schema.number()`            | DATA               | Numeric validation         |
| `schema.boolean()`           | DATA               | Boolean validation         |
| `schema.array()`             | DATA               | Array validation           |
| `pipeline.step()`            | PROCESS            | Individual pipeline step   |
| `resource.withAuth()`        | INTERFACE          | Authentication integration |
| `resource.withCache()`       | INTERFACE          | Basic caching              |
| `repository.withTransform()` | DATA               | Repository transformation  |
| `createError()`              | Foundation         | Error creation             |
| `isKairoError()`             | Foundation         | Error type checking        |

#### **Essential FP Utilities (20 functions)**

| Category              | Functions                                                   | Purpose             |
| --------------------- | ----------------------------------------------------------- | ------------------- |
| **Array Operations**  | `map`, `filter`, `flatMap`, `reduce`, `find`                | Data processing     |
| **Object Operations** | `pick`, `omit`, `merge`, `path`, `pathOr`                   | Object manipulation |
| **Maybe Pattern**     | `maybe`, `isSome`, `isNone`, `chain`, `orElse`              | Null safety         |
| **Async Operations**  | `asyncPipe`, `asyncMap`, `sequence`, `traverse`, `parallel` | Async composition   |

#### **Tier 2 Production Example**

```typescript
import {
  Result,
  map,
  flatMap,
  mapError,
  match,
  schema,
  resource,
  pipeline,
  rules,
  rule,
  asyncPipe,
  maybe,
  pick,
  merge,
} from 'kairo'

// Advanced schema with validation
const UserSchema = schema.object({
  name: schema.string().min(2).max(50),
  email: schema.string().email(),
  age: schema.number().int().min(18).max(120),
})

// Business rules
const userRules = rules('user')
  .add(
    rule('unique-email', async user => {
      const exists = await checkEmailExists(user.email)
      return exists ? Result.Err('Email already exists') : Result.Ok(user)
    })
  )
  .add(
    rule('valid-domain', user => {
      const allowedDomains = ['company.com', 'trusted.org']
      const domain = user.email.split('@')[1]
      return allowedDomains.includes(domain)
        ? Result.Ok(user)
        : Result.Err('Email domain not allowed')
    })
  )

// Production resource with error handling
const UserAPI = resource('users', {
  create: {
    path: '/users',
    method: 'POST',
    body: UserSchema,
    response: UserSchema,
    pipeline: pipeline('create-user')
      .validate(UserSchema)
      .validateRules(userRules)
      .transform(user =>
        merge(user, {
          id: generateId(),
          createdAt: new Date(),
          status: 'active',
        })
      ),
  },
})

// Robust error handling
const createUser = asyncPipe(
  userData => maybe(userData).orElse({}),
  data => pick(['name', 'email', 'age'], data),
  cleanData => UserAPI.create.run({ body: cleanData }),
  match({
    Ok: user => Result.Ok(user),
    Err: error => mapError(error, err => `User creation failed: ${err.message}`),
  })
)
```

### **Tier 3: Advanced Patterns (100+ functions)**

**Goal**: Handle complex enterprise requirements  
**Time Investment**: 1-3 months  
**Use Cases**: Workflows, transactions, events, performance optimization, complex data patterns

#### **Extension Integration (30 functions)**

| Extension        | Key Functions                               | Use Cases                   |
| ---------------- | ------------------------------------------- | --------------------------- |
| **Events**       | `eventBus`, `emit`, `subscribe`, `saga`     | Event-driven architecture   |
| **Transactions** | `transaction`, `rollback`, `commit`, `lock` | Data consistency            |
| **Caching**      | `cache`, `invalidate`, `warm`, `analytics`  | Performance optimization    |
| **Workflows**    | `workflow`, `step`, `branch`, `parallel`    | Business process automation |
| **Plugins**      | `plugin`, `register`, `extend`, `configure` | Extensibility               |

#### **Advanced Data Patterns (25 functions)**

| Category                | Functions                                                         | Purpose                 |
| ----------------------- | ----------------------------------------------------------------- | ----------------------- |
| **Relationships**       | `hasOne`, `hasMany`, `belongsTo`, `through`                       | Data modeling           |
| **Transformations**     | `transform.map`, `transform.filter`, `transform.reduce`           | Complex data processing |
| **Repository Patterns** | `repository.transaction`, `repository.batch`, `repository.stream` | Advanced data access    |
| **Schema Composition**  | `schema.union`, `schema.intersection`, `schema.conditional`       | Complex validation      |

#### **Performance Utilities (15 functions)**

| Function         | Purpose              | When to Use                        |
| ---------------- | -------------------- | ---------------------------------- |
| `BatchProcessor` | Batch operations     | High-throughput processing         |
| `ResourcePool`   | Resource management  | Database connections, HTTP clients |
| `Lazy`           | Deferred execution   | Expensive computations             |
| `Debounce`       | Rate limiting        | User input, API calls              |
| `Throttle`       | Frequency control    | Event handling                     |
| `Cache`          | Memoization          | Expensive function calls           |
| `Monitor`        | Performance tracking | Production monitoring              |

#### **Specialized FP Patterns (30+ functions)**

| Category               | Functions                            | Advanced Use Cases   |
| ---------------------- | ------------------------------------ | -------------------- |
| **Curry Functions**    | `curry2`, `curry3`, `curryN`, `flip` | Partial application  |
| **Effect Management**  | `effect`, `IO`, `Task`, `Reader`     | Side effect control  |
| **Monadic Operations** | `monad`, `bind`, `join`, `lift`      | Advanced composition |
| **Control Flow**       | `cond`, `when`, `unless`, `branch`   | Complex logic        |

### **Tier 4: Expert Level (340+ functions)**

**Goal**: Framework contribution and custom extensions  
**Time Investment**: 6+ months  
**Use Cases**: Core development, custom extensions, performance optimization, architectural patterns

#### **Complete API Surface**

- All testing utilities (~150 functions)
- Internal utilities and helpers
- Extension development APIs
- Performance profiling tools
- Debugging and development aids
- Experimental features
- Legacy compatibility layers

---

## 🎯 Learning Progression Strategy

### **Tier Advancement Criteria**

#### **Tier 1 → Tier 2**

- **Knowledge**: Understand Result pattern, one pillar basics, composition
- **Practical**: Built functional app with CRUD operations
- **Time**: Comfortable with essential 15 functions
- **Assessment**: Pass Tier 1 practical exercise

#### **Tier 2 → Tier 3**

- **Knowledge**: Multi-pillar integration, production patterns, error handling
- **Practical**: Built production-ready app with validation and testing
- **Time**: Using 30+ functions confidently
- **Assessment**: Architecture review of production app

#### **Tier 3 → Tier 4**

- **Knowledge**: Extension architecture, performance optimization, advanced patterns
- **Practical**: Built complex enterprise application
- **Time**: Contributing to community, helping others
- **Assessment**: Technical contribution to Kairo ecosystem

### **Tier-Specific Learning Materials**

#### **Tier 1: Essential First Week**

- **Interactive Tutorial**: "Your First Kairo App"
- **Video Series**: 15-minute concept explanations
- **Practice Exercises**: Guided coding challenges
- **Quick Reference**: Single-page cheat sheet
- **Assessment**: 30-minute practical exercise

#### **Tier 2: Production Ready**

- **Project-Based Learning**: "Building a Production API"
- **Deep Dives**: Architecture and pattern explanations
- **Case Studies**: Real-world application analysis
- **Best Practices**: Production deployment guide
- **Assessment**: Architecture review and code quality check

#### **Tier 3: Advanced Patterns**

- **Masterclass Series**: Advanced architecture patterns
- **Extension Guides**: Deep dives into each extension
- **Performance Lab**: Optimization techniques and measurement
- **Community Projects**: Contribution to open source projects
- **Assessment**: Technical presentation or contribution

#### **Tier 4: Expert Level**

- **Core Development**: Contributing to Kairo framework
- **Extension Development**: Building custom extensions
- **Community Leadership**: Mentoring other developers
- **Conference Speaking**: Sharing expertise publicly
- **Assessment**: Recognized expertise and contributions

---

## 📊 Usage Pattern Analysis

### **Function Usage Frequency** (Based on Examples and Documentation)

#### **High Frequency (Used in 80%+ of projects)**

- Result pattern functions
- Basic schema functions
- Essential FP utilities
- Core pillar entry points

#### **Medium Frequency (Used in 40-80% of projects)**

- Advanced validation
- Error handling patterns
- Multi-pillar integration
- Basic extensions

#### **Low Frequency (Used in 10-40% of projects)**

- Specialized extensions
- Performance optimization
- Advanced FP patterns
- Complex data relationships

#### **Rare Usage (Used in <10% of projects)**

- Framework internals
- Testing utilities
- Development tools
- Experimental features

### **Learning Difficulty Assessment**

#### **Low Complexity (Easy to understand)**

- Basic type constructors
- Simple validation
- Data transformation
- Error checking

#### **Medium Complexity (Requires understanding concepts)**

- Function composition
- Monadic patterns
- Async operations
- Multi-step workflows

#### **High Complexity (Advanced concepts required)**

- Extension integration
- Performance optimization
- Custom patterns
- Architecture design

#### **Expert Complexity (Framework-level understanding)**

- Internal APIs
- Extension development
- Performance profiling
- Core contributions

---

## ✅ Validation Criteria

### **Tier Assignment Validation**

- [ ] Each tier has clear learning objectives
- [ ] Progression between tiers is logical and achievable
- [ ] Function assignments match usage patterns
- [ ] No critical dependencies cross tier boundaries incorrectly
- [ ] Real developers can successfully progress through tiers

### **Coverage Validation**

- [ ] All 340+ API elements are categorized
- [ ] No orphaned functions without clear tier assignment
- [ ] Essential patterns are represented in appropriate tiers
- [ ] Advanced features are accessible but not overwhelming

### **Learning Experience Validation**

- [ ] Tier 1 enables functional application building
- [ ] Tier 2 supports production deployment
- [ ] Tier 3 handles enterprise requirements
- [ ] Tier 4 enables framework contribution

---

**Related Documents**: [API Curation Specification](./API_CURATION_SPEC.md) | [Learning Experience Specification](./LEARNING_EXPERIENCE_SPEC.md)
