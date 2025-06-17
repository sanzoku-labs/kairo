// Kairo Core API - Tiered Learning Experience
//
// Organized by learning progression: Tier 1 (Essential) → Tier 2 (Production) → Tier 3 (Extensions)
// Start with Tier 1 functions for foundation, then add Tier 2 for production readiness.
// Tier 3 advanced features are available as optional extensions.

// =============================================================================
// TIER 1: ESSENTIAL FOUNDATION (15 functions)
// Master these first - they enable all other patterns and workflows
// =============================================================================

/**
 * FOUNDATION LAYER - Error-safe computation patterns (5 functions)
 * 
 * The Result pattern eliminates exceptions and provides safe composition.
 * Master these first as they underpin every other operation in Kairo.
 */
export { Result, map, flatMap, match } from './core/result'
export { createError } from './core/errors'
export type { OkResult, ErrResult } from './core/result'

/**
 * DATA PILLAR CORE - Type-safe data handling (4 functions)
 * 
 * Essential functions for modeling, validating, and persisting data.
 * Forms the foundation of Kairo's declarative data approach.
 */
export { nativeSchema as schema } from './core/native-schema'
export { repository, hasMany, hasOne, belongsTo } from './core/repository'
export type { Schema, ValidationError, SchemaShape, InferSchema } from './core/native-schema'

/**
 * INTERFACE PILLAR CORE - External system integration (2 functions)
 * 
 * Type-safe patterns for integrating with APIs and external services.
 * Foundation for all external communication.
 */
export { resource, resourceUtils } from './core/resource'
export type { Resource, ResourceMethod, ResourceMethods } from './core/resource'

/**
 * PROCESS PILLAR CORE - Business logic composition (3 functions)
 * 
 * Essential patterns for data processing, business rules, and performance.
 * Core abstractions for building business workflows.
 */
export { pipeline, cache } from './core/pipeline'
export { rule, rules } from './core/rules'
export type { Pipeline } from './core/pipeline'
export type { Rule, Rules } from './core/rules'

/**
 * ESSENTIAL UTILITIES - Function composition (1 function)
 * 
 * Core functional programming utility for readable data flow.
 * Foundation for all composition patterns in Kairo.
 */
export { pipe } from './utils/fp'

// =============================================================================
// TIER 2: PRODUCTION READY (25 additional functions)
// Add these for production-grade applications with resilience and optimization
// =============================================================================

/**
 * ENHANCED FOUNDATION - Advanced error handling (4 functions)
 * 
 * Extended Result operations and error management for production debugging.
 */
export { chain, mapError } from './core/result'
export { chainError, isKairoError } from './core/errors'
export type { KairoError, ErrorWithCause } from './core/errors'

/**
 * ENHANCED DATA LAYER - Complete data handling (8 functions)
 * 
 * Full schema validation types and complete CRUD repository operations.
 * Everything needed for complex data modeling and persistence.
 */
export type {
  StringSchema,
  NumberSchema,
  BooleanSchema,
  ObjectSchema,
  ArraySchema,
} from './core/native-schema'
export type {
  Repository,
  RepositoryError,
  RepositoryConfig,
  StorageAdapter,
  QueryOptions,
  UpdateOptions,
  DeleteOptions,
  Relations,
  HasOneRelation,
  HasManyRelation,
  BelongsToRelation,
  Relation,
} from './core/repository'
export { MemoryStorageAdapter, createRepositoryError } from './core/repository'

/**
 * ENHANCED INTERFACE LAYER - Resilient API patterns (5 functions)
 * 
 * Production-grade API integration with retry logic, timeouts, and caching.
 * Essential for reliable external system communication.
 */
export { resourceCache } from './core/resource'
export type {
  ResourceError,
  ResourceInput,
  ResourceOutput,
  ResourceConfig,
} from './core/resource'

/**
 * ENHANCED PROCESS LAYER - Production business logic (4 functions)
 * 
 * Complete pipeline operations and business rule utilities.
 * Advanced patterns for complex workflows and validation.
 */
export { tracing } from './core/pipeline'
export { commonRules } from './core/rules'
export type {
  HttpError,
  NetworkError,
  TimeoutError,
  TraceEntry,
  TraceFilter,
  TraceData,
  TraceCollector,
} from './core/pipeline'
export type {
  BusinessRuleError,
  RuleValidationContext,
  RuleCondition,
  RuleValidation,
  AsyncRuleValidation,
} from './core/rules'

/**
 * ENHANCED UTILITIES - Production FP patterns (4 functions)
 * 
 * Essential functional programming utilities for clean, maintainable code.
 * Productivity improvements for complex data processing.
 */
export { tap, maybe, when, unless } from './utils/fp'

/**
 * DATA TRANSFORMATIONS - Declarative data processing
 * 
 * Alternative to manual object manipulation with declarative patterns.
 * Used in data processing workflows and complex transformations.
 */
export { transform, createTransform, commonTransforms } from './core/transform'
export type {
  Transform,
  TransformError,
  TransformContext,
  TransformBuilder,
  FieldMapper,
  ComputeFunction,
  FilterPredicate,
  FieldMapping,
  ComputeMapping,
  TransformStep,
} from './core/transform'

// =============================================================================
// TIER 2: TESTING UTILITIES
// Essential for production development workflows
// =============================================================================

/**
 * TESTING SUPPORT - Development and testing utilities
 * 
 * Comprehensive testing tools for all Kairo patterns.
 * Essential for test-driven development and quality assurance.
 */
export * from './testing'

/**
 * FUNCTIONAL PROGRAMMING UTILITIES - Extended FP support
 * 
 * Additional functional programming utilities for advanced patterns.
 * Import selectively based on team functional programming adoption.
 */
export * from './utils/fp'

// =============================================================================
// TIER 3: ADVANCED EXTENSIONS (285+ functions)
// Optional, specialized modules for complex use cases - import only what you need
// =============================================================================

/**
 * ADVANCED EXTENSIONS - Specialized functionality (285+ functions)
 * 
 * These extensions provide enterprise-grade features for specific domains.
 * Each extension is tree-shakable - only import what your application needs.
 * 
 * LEARNING TRACKS:
 * 
 * 🚀 Event-Driven Architecture (50+ functions)
 *   import { eventBus, saga, eventStore } from 'kairo/extensions/events'
 *   Usage: 10-15% of applications (microservices, event sourcing, CQRS)
 * 
 * ⚡ High Performance (65+ functions)  
 *   import { CacheManager, ResourcePool } from 'kairo/extensions/caching'
 *   import { PerformanceMonitor } from 'kairo/extensions/performance'
 *   Usage: 20-25% of applications (high-load, optimization-focused)
 * 
 * 🏢 Enterprise Integration (85+ functions)
 *   import { transactionManager } from 'kairo/extensions/transactions'
 *   import { workflow } from 'kairo/extensions/workflows'
 *   import { PluginRegistry } from 'kairo/extensions/plugins'
 *   Usage: 5-15% of applications (complex business processes, extensibility)
 * 
 * 🧪 Quality Engineering (75+ functions)
 *   import { ContractVerifier } from 'kairo/extensions/contracts'
 *   import { IntegrationTester, PerformanceTester } from 'kairo/testing'
 *   Usage: 25-30% of applications (test-driven development, API governance)
 * 
 * 🔧 Advanced Functional Programming (60+ functions)
 *   import { lens, curry, asyncMap } from 'kairo/utils/fp'
 *   Usage: 15-20% of applications (functional programming heavy)
 * 
 * Learn more about extension patterns and advanced use cases:
 * - Event-driven examples: docs/examples/event-driven-architecture.md
 * - Enterprise patterns: docs/examples/enterprise-integration.md
 * - Performance optimization: docs/examples/workflows.md
 * - Contract testing: docs/examples/contract-testing.md
 */

// =============================================================================
// LEGACY SCHEMA NOTICE
// =============================================================================

/**
 * MIGRATION NOTICE: Zod Schema Support Removed
 * 
 * Kairo now uses the native schema system exclusively for better performance
 * and zero runtime dependencies. The native schema API is 3x faster than Zod
 * and provides the same type safety.
 * 
 * Migration guide: Use `schema` (native) instead of legacy Zod schemas
 */
