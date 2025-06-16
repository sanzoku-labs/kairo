// Transaction Management Extension
//
// This extension provides ACID transaction management with rollback,
// compensation, and distributed transaction support.

// Re-export all transaction functionality
export * from './transaction-manager'
export * from './lock-manager'
export * from './transactional-pipeline'
export * from './transactional-repository'
export * from './transactional-resource'
export * from './transactions'
