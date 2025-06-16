# Extensions API Reference

**Extensions** provide enterprise-grade advanced features for complex applications. These APIs extend Kairo's three-pillar architecture with powerful capabilities while maintaining the same declarative philosophy.

> **Progressive Enhancement**: _"Start simple with core APIs. Add extensions only when you need advanced features."_

---

## 📦 Import Pattern

Extensions use a separate import path to keep your core bundle minimal:

```typescript
// Core APIs - Always available
import { schema, pipeline, resource } from 'kairo'

// Extensions - Import only what you need
import { createEventBus } from 'kairo/extensions/events'
import { transactionManager } from 'kairo/extensions/transactions'
import { CacheManager } from 'kairo/extensions/caching'
import { createPlugin } from 'kairo/extensions/plugins'
```

---

## 🔄 Event-Driven Architecture

_Scalable event systems with sagas and sourcing_

### [Event Bus API](/api/extensions/events)

Type-safe publish/subscribe event system

- Event publishing and subscription
- Event filtering and retry logic
- Dead letter queues and replay capabilities
- Cross-pillar event integration

---

## 💾 Transaction Management

_ACID transactions with automatic compensation_

### [Transaction API](/api/extensions/transactions)

ACID-compliant transaction management

- Transaction definition and execution
- Isolation levels and lock management
- Automatic rollback and compensation
- Cross-pillar transaction support

---

## ⚡ Advanced Caching

_Multi-level intelligent caching with analytics_

### [Cache Manager API](/api/extensions/cache)

Multi-level caching with analytics

- Cache layer management
- Invalidation strategies (tag-based, pattern-based)
- Real-time analytics and monitoring
- Distributed cache support

---

## 🔌 Plugin System

_Extensible architecture with three-pillar integration_

### [Plugin API](/api/extensions/plugins)

Extensible plugin architecture

- Plugin definition and registration
- Lifecycle management (load, enable, disable)
- Three-pillar integration hooks
- Dependency management and validation

---

## 🧪 Advanced Testing & Contracts

_Enterprise testing patterns and API contracts_

### [Contract Testing](/api/extensions/contract)

API contract verification and mock generation

- Live contract verification against APIs
- Intelligent mock scenario generation
- Response validation and schema verification

### [Complex Workflows](/api/extensions/workflow)

Multi-step process orchestration

- Sequential and parallel step execution
- Error handling and compensation patterns
- Conditional branching and loops
- Distributed transaction support

---

## Use Cases for Extensions

### When to Use Event-Driven Architecture

- Microservices with loose coupling
- Real-time notifications and updates
- Complex business workflows with multiple steps
- Event sourcing and audit requirements

### When to Use Transaction Management

- Financial applications requiring ACID compliance
- Multi-step operations that must be atomic
- Distributed systems with coordination needs
- Data consistency across multiple resources

### When to Use Advanced Caching

- High-traffic applications with performance needs
- Multi-tier caching strategies
- Cache analytics and optimization
- Distributed cache coordination

### When to Use Plugin System

- Applications with customizable functionality
- Third-party integrations and extensions
- Multi-tenant systems with varying features
- Component reusability across projects

---

## Performance & Bundle Impact

**Extensions are designed for efficiency:**

- **Tree-shakeable**: Only imported extensions affect bundle size
- **Lazy loading**: Extensions load when first used
- **Minimal overhead**: <5KB per extension when gzipped
- **Zero conflicts**: Extensions don't interfere with core APIs

### Typical Bundle Sizes

```
Core only:           ~20KB (gzipped)
+ Events:           +8KB
+ Transactions:     +12KB
+ Caching:          +6KB
+ Plugins:          +4KB
All extensions:     ~50KB (gzipped)
```

---

## Extension Examples

### Event-Driven User Onboarding

```typescript
import { createEventBus, saga, sagaStep } from 'kairo/extensions/events'

const eventBus = createEventBus()

// Complex saga with automatic compensation
const userOnboardingSaga = saga(
  'user-onboarding',
  [
    sagaStep('create-user', async input => {
      const user = await userService.create(input.userData)
      return Result.Ok(user)
    }),
    sagaStep('send-welcome-email', async user => {
      await emailService.sendWelcome(user.email)
      return Result.Ok(undefined)
    }),
    sagaStep('setup-profile', async user => {
      const profile = await profileService.create(user.id)
      return Result.Ok(profile)
    }),
  ],
  { rollbackOnFailure: true, eventBus }
)
```

### ACID Financial Transactions

```typescript
import {
  transaction,
  transactionStep,
  createTransactionManager,
} from 'kairo/extensions/transactions'

const transferFunds = transaction(
  'transfer-funds',
  [
    transactionStep('debit-source', async input => {
      return await accountService.debit(input.fromAccount, input.amount)
    }),
    transactionStep('credit-target', async input => {
      return await accountService.credit(input.toAccount, input.amount)
    }),
    transactionStep('create-audit-log', async transferData => {
      return await auditService.log(transferData)
    }),
  ],
  { isolation: 'serializable', timeout: 30000 }
)
```

### Multi-Level Caching

```typescript
import { CacheManager } from 'kairo/extensions/cache'

const cacheManager = new CacheManager({
  layers: [
    { name: 'memory', storage: 'memory', ttl: 300000, priority: 100 },
    { name: 'redis', storage: 'redis', ttl: 3600000, priority: 50 },
  ],
  analytics: { enabled: true, healthCheckInterval: 60000 },
})

// Cache with invalidation strategies
await cacheManager.set('user:123', userData, {
  tags: ['user', 'profile'],
  dependencies: ['user-service'],
})

// Tag-based invalidation
await cacheManager.invalidateByTag('user')
```

---

## Navigation

**Start here:** [Core APIs](/api/core/) for essential functionality

**Architecture:** [Three-Pillar Architecture Guide](/guide/architecture)

**Examples:** [Extension Examples](/examples/) for real-world usage patterns
