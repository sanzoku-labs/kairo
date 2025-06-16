// Kairo Extensions - Tree-Shakable Advanced Features
//
// Import only what you need for optimal bundle sizes:
//
// import { createEventBus } from 'kairo/extensions/events'
// import { createTransactionManager } from 'kairo/extensions/transactions'
// import { CacheManager } from 'kairo/extensions/caching'

// Re-export extension modules for convenience
// These are tree-shakable when using named imports
export * as events from './extensions/events'
export * as transactions from './extensions/transactions'
export * as caching from './extensions/caching'
export * as plugins from './extensions/plugins'
export * as workflows from './extensions/workflows'
export * as performance from './extensions/performance'
export * as contracts from './extensions/contracts'