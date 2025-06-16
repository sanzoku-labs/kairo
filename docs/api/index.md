# API Reference

Welcome to the Kairo API reference. This comprehensive guide covers all APIs across Kairo's **Three-Pillar Declarative Architecture** and **Advanced Extensions**.

> **Architecture Overview**: [Three-Pillar Architecture Guide](/guide/architecture) for complete architectural context

---

## 📦 API Organization

Kairo APIs are organized into **Core** and **Extensions** for optimal bundle size and progressive enhancement:

### [🚀 Core APIs](/api/core/)

Essential three-pillar architecture - always available with minimal bundle size (~20KB):

- **[INTERFACE Pillar](/api/core/)** - Resources and external system integration
- **[PROCESS Pillar](/api/core/)** - Pipelines and business rules
- **[DATA Pillar](/api/core/)** - Schemas, transforms, and repositories
- **[Result Pattern](/api/core/result)** - Type-safe error handling foundation

### [⚡ Extensions](/api/extensions/)

Enterprise-grade advanced features - import only what you need:

- **[Event-Driven Architecture](/api/extensions/events)** - Event bus, sagas, and sourcing
- **[Transaction Management](/api/extensions/transactions)** - ACID transactions with compensation
- **[Advanced Caching](/api/extensions/cache)** - Multi-level cache with analytics
- **[Plugin System](/api/extensions/plugins)** - Extensible architecture with hooks
- **[Contract Testing](/api/extensions/contract)** - API verification and mocking
- **[Complex Workflows](/api/extensions/workflow)** - Multi-step process orchestration

---

## 🔗 INTERFACE Pillar (Core)

_Zero-boilerplate external system integration_

### [Resource API](/api/core/resource)

Declarative API definitions with type safety, contract testing, and intelligent mocking

- HTTP operations (GET, POST, PUT, DELETE)
- Automatic retry, timeout, and error handling
- URL parameter interpolation
- Built-in caching strategies

---

## ⚡ PROCESS Pillar (Core)

_Declarative business logic composition_

### [Pipeline API](/api/core/pipeline)

The core abstraction for composable business workflows

- Functional composition with type safety
- Built-in error handling and Result pattern integration
- Parallel execution and branching logic
- Observability and tracing

### [Business Rules API](/api/core/rules)

Declarative validation and business logic

- Conditional rule application
- Async rule validation
- Rule composition and reusability
- Rich error messaging

---

## 🛡️ DATA Pillar (Core)

_Native data definition, validation, and access_

### [Native Schema API](/api/core/schema)

High-performance validation (3x faster than Zod, zero dependencies)

- Type-safe schema definition with full inference
- Schema composition (extend, pick, omit, partial)
- Data transformation and refinement
- Rich validation error reporting

### [Transform API](/api/core/transform)

Declarative data mapping and conversion

- Field-to-field mapping
- Computed field generation
- Data filtering and validation
- Transform composition and chaining

### [Repository API](/api/core/repository)

Type-safe data access with relationships

- CRUD operations with Result pattern integration
- Relationship management (hasOne, hasMany, belongsTo)
- Lifecycle hooks and validation
- Pluggable storage adapters

---

## 🚀 Core Foundation

### [Result Pattern](/api/core/result)

Type-safe error handling without exceptions

- `Result<Error, Value>` type for predictable error handling
- Pattern matching with `.match()` method
- Helper functions and composition utilities
- Integration across all Kairo APIs

---

## 🔄 Event-Driven Architecture (Extensions)

### [Event Bus API](/api/extensions/events)

Type-safe publish/subscribe event system with advanced features

- Event publishing and subscription
- Event filtering and retry logic
- Dead letter queues and replay capabilities
- Saga patterns for complex workflows
- Cross-pillar event integration

---

## 💾 Transaction Management (Extensions)

### [Transaction API](/api/extensions/transactions)

ACID-compliant transaction management with distributed support

- Transaction definition and execution
- Isolation levels and lock management
- Automatic rollback and compensation
- Cross-pillar transaction support
- Deadlock detection and resolution

---

## ⚡ Advanced Caching (Extensions)

### [Cache Manager API](/api/extensions/cache)

Multi-level caching with real-time analytics

- Cache layer management with priority-based promotion
- Invalidation strategies (tag-based, pattern-based, dependency-based)
- Real-time analytics and monitoring
- Distributed cache support with Redis clustering
- Cache warming strategies and predictive loading

---

## 🔌 Plugin System (Extensions)

### [Plugin API](/api/extensions/plugins)

Extensible plugin architecture with three-pillar integration

- Plugin definition and registration
- Lifecycle management (load, enable, disable)
- Three-pillar integration hooks
- Dependency management and validation
- Health monitoring and status tracking

---

## 🧪 Advanced Testing & Contracts (Extensions)

### [Contract Testing](/api/extensions/contract)

API contract verification and intelligent mocking

- Live contract verification against APIs
- Intelligent mock scenario generation
- Response validation and schema verification
- Automated contract regression testing

### [Complex Workflows](/api/extensions/workflow)

Multi-step process orchestration with advanced patterns

- Sequential and parallel step execution
- Error handling and compensation patterns
- Conditional branching and loops
- Distributed transaction support
- Event-driven workflow triggers

---

## 🧪 Enhanced Testing APIs

### Pipeline Testing

Fluent assertions for pipeline execution

- Success/failure validation
- Performance testing and benchmarking
- Step-by-step execution validation
- Event-driven pipeline testing

### Resource Testing

Mock scenarios and contract verification

- HTTP response mocking
- Scenario-based testing
- Contract validation utilities
- Caching behavior testing

### Schema Testing

Property-based testing with automatic generation

- Random data generation
- Edge case validation
- Performance benchmarking
- Schema composition testing

### Transform Testing

Field mapping validation and batch processing

- Mapping correctness verification
- Batch processing validation
- Error handling testing
- Pipeline integration testing

### Repository Testing

Data access layer testing utilities

- CRUD operation testing
- Relationship testing
- Hook validation
- Storage adapter testing

### Integration Testing

End-to-end testing across all pillars

- Cross-pillar workflow testing
- Complete application flow validation
- Mock coordination and scenarios
- Event-driven architecture testing

### Performance Testing

Load testing and benchmarking utilities

- Sustained throughput testing
- Memory leak detection
- Performance regression testing
- Real-time monitoring

---

## 📦 Exports and Utilities

### Type Exports

```typescript
import type {
  // Core types
  Result,
  KairoError,
  ValidationError,
  NetworkError,
  TimeoutError,

  // INTERFACE pillar
  Resource,
  ResourceMethods,
  ResourceConfig,
  ContractTestResult,

  // PROCESS pillar
  Pipeline,
  Rule,
  Rules,
  BusinessRuleError,
  Workflow,
  WorkflowContext,
  WorkflowError,
  WorkflowStep,

  // DATA pillar
  Schema,
  InferSchema,
  Transform,
  TransformError,
  Repository,
  RepositoryError,
  StorageAdapter,
  HasOneRelation,
  HasManyRelation,
  BelongsToRelation,
} from 'kairo'
```

### Functional Utilities

```typescript
import {
  // Function composition
  pipe,
  compose,
  curry,
  identity,

  // Array utilities
  map,
  filter,
  reduce,
  find,
  some,
  every,

  // Object utilities
  pick,
  omit,
  merge,
  clone,
  deepEqual,

  // Type guards
  isDefined,
  isNull,
  isUndefined,
  isEmpty,

  // Result helpers
  Result,
  Ok,
  Err,
} from 'kairo'
```

---

---

## 🎯 Quick Navigation

**Getting Started**: [Installation & Quick Start](/guide/getting-started)

**By API Type**:

- **Core APIs** → [Essential three-pillar architecture](/api/core/)
- **Extensions** → [Advanced enterprise features](/api/extensions/)

**By Use Case**:

- Building APIs → [Resource API](/api/core/resource)
- Business Logic → [Pipeline API](/api/core/pipeline) + [Rules API](/api/core/rules)
- Data Validation → [Schema API](/api/core/schema)
- Data Access → [Repository API](/api/core/repository)
- Data Transformation → [Transform API](/api/core/transform)
- Event Systems → [Event Bus API](/api/extensions/events)
- Transactions → [Transaction API](/api/extensions/transactions)
- Caching → [Cache Manager API](/api/extensions/cache)
- Extensibility → [Plugin API](/api/extensions/plugins)

**By Pillar**:

- **INTERFACE (Core)**: [Resource](/api/core/resource)
- **PROCESS (Core)**: [Pipeline](/api/core/pipeline) • [Rules](/api/core/rules)
- **DATA (Core)**: [Schema](/api/core/schema) • [Transform](/api/core/transform) • [Repository](/api/core/repository)

**Advanced Features (Extensions)**:

- **Event-Driven**: [Events](/api/extensions/events) • [Workflows](/api/extensions/workflow)
- **Data Management**: [Transactions](/api/extensions/transactions) • [Caching](/api/extensions/cache)
- **Extensibility**: [Plugins](/api/extensions/plugins) • [Contracts](/api/extensions/contract)

**Architecture Deep Dive**: [Three-Pillar Architecture Guide](/guide/architecture)
