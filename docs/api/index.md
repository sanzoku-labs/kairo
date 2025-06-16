# API Reference

Welcome to the Kairo API reference. This comprehensive guide covers all APIs across Kairo's **Three-Pillar Declarative Architecture**: **INTERFACE**, **PROCESS**, and **DATA**.

> **Architecture Overview**: [Three-Pillar Architecture Guide](/guide/architecture) for complete architectural context

---

## 🔗 INTERFACE Pillar

_Zero-boilerplate external system integration_

### [Resource API](/api/resource)

Declarative API definitions with type safety, contract testing, and intelligent mocking

- HTTP operations (GET, POST, PUT, DELETE)
- Automatic retry, timeout, and error handling
- URL parameter interpolation
- Built-in caching strategies

### [Contract Testing](/api/contract)

API contract verification and mock generation

- Live contract verification against APIs
- Intelligent mock scenario generation
- Response validation and schema verification

---

## ⚡ PROCESS Pillar

_Declarative business logic composition_

### [Pipeline API](/api/pipeline)

The core abstraction for composable business workflows

- Functional composition with type safety
- Built-in error handling and Result pattern integration
- Parallel execution and branching logic
- Observability and tracing

### [Business Rules API](/api/rules)

Declarative validation and business logic

- Conditional rule application
- Async rule validation
- Rule composition and reusability
- Rich error messaging

### [Workflow API](/api/workflow)

Complex multi-step process orchestration

- Sequential and parallel step execution
- Error handling and compensation patterns
- Conditional branching and loops
- Distributed transaction support

---

## 🛡️ DATA Pillar

_Native data definition, validation, and access_

### [Native Schema API](/api/schema)

High-performance validation (3x faster than Zod, zero dependencies)

- Type-safe schema definition with full inference
- Schema composition (extend, pick, omit, partial)
- Data transformation and refinement
- Rich validation error reporting

### [Transform API](/api/transform)

Declarative data mapping and conversion

- Field-to-field mapping
- Computed field generation
- Data filtering and validation
- Transform composition and chaining

### [Repository API](/api/repository)

Type-safe data access with relationships

- CRUD operations with Result pattern integration
- Relationship management (hasOne, hasMany, belongsTo)
- Lifecycle hooks and validation
- Pluggable storage adapters

---

## 🚀 Core Foundation

### [Result Pattern](/api/result)

Type-safe error handling without exceptions

- `Result<Error, Value>` type for predictable error handling
- Pattern matching with `.match()` method
- Helper functions and composition utilities
- Integration across all Kairo APIs

---

## 🔄 Event-Driven Architecture

### [Event Bus API](/api/events)

Type-safe publish/subscribe event system

- Event publishing and subscription
- Event filtering and retry logic
- Dead letter queues and replay capabilities
- Cross-pillar event integration

### [Event Store API](/api/event-store)

Persistent event storage with replay capabilities

- Event stream management
- Event replay and rebuilding state
- Concurrency control and optimistic locking
- Event sourcing patterns

### [Saga API](/api/saga)

Complex workflow orchestration with compensation

- Multi-step workflow management
- Automatic rollback and compensation
- Distributed transaction patterns
- Error handling and recovery

---

## 💾 Transaction Management

### [Transaction API](/api/transactions)

ACID-compliant transaction management

- Transaction definition and execution
- Isolation levels and lock management
- Automatic rollback and compensation
- Cross-pillar transaction support

### [Lock Manager API](/api/lock-manager)

Distributed locking with deadlock detection

- Shared and exclusive locks
- Deadlock detection and resolution
- Automatic lock release
- Performance monitoring

---

## ⚡ Advanced Caching

### [Cache Manager API](/api/cache)

Multi-level caching with analytics

- Cache layer management
- Invalidation strategies (tag-based, pattern-based)
- Real-time analytics and monitoring
- Distributed cache support

### [Cache Analytics API](/api/cache-analytics)

Real-time cache performance monitoring

- Hit/miss ratio tracking
- Memory usage monitoring
- Performance metrics and alerting
- Trend analysis and optimization

---

## 🔌 Plugin System

### [Plugin API](/api/plugins)

Extensible plugin architecture

- Plugin definition and registration
- Lifecycle management (load, enable, disable)
- Three-pillar integration hooks
- Dependency management and validation

### [Plugin Registry API](/api/plugin-registry)

Centralized plugin management

- Plugin discovery and loading
- Health monitoring and status tracking
- Dependency resolution
- Plugin testing framework

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

## 🎯 Quick Navigation

**Getting Started**: [Installation & Quick Start](/guide/getting-started)

**By Use Case**:

- Building APIs → [Resource API](/api/resource)
- Business Logic → [Pipeline API](/api/pipeline) + [Rules API](/api/rules)
- Data Validation → [Schema API](/api/schema)
- Data Access → [Repository API](/api/repository)
- Data Transformation → [Transform API](/api/transform)

**By Pillar**:

- **INTERFACE**: [Resource](/api/resource) • [Contract](/api/contract)
- **PROCESS**: [Pipeline](/api/pipeline) • [Rules](/api/rules) • [Workflow](/api/workflow)
- **DATA**: [Schema](/api/schema) • [Transform](/api/transform) • [Repository](/api/repository)

**Architecture Deep Dive**: [Three-Pillar Architecture Guide](/guide/architecture)
