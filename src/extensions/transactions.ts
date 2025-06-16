// Transaction Management Extension
//
// Tree-shakable named exports for ACID transaction management

// Transaction Manager
export {
  createTransactionManager,
  transactionStep,
  transaction,
  InMemoryTransactionManager,
} from './transactions/transaction-manager'

// Lock Manager
export { createLockManager, InMemoryLockManager } from './transactions/lock-manager'

// Transactional Pipelines
export {
  transactionalPipeline,
  makeTransactional,
  parallelTransaction,
  TransactionalPipeline,
} from './transactions/transactional-pipeline'

// Transactional Repositories
export {
  transactionalRepository,
  makeRepositoryTransactional,
  TransactionalRepository,
} from './transactions/transactional-repository'

// Transactional Resources
export {
  transactionalResource,
  makeResourceTransactional,
  TransactionalResourceImpl as TransactionalResourceClass,
} from './transactions/transactional-resource'

// Transaction Types (types are tree-shaken automatically)
export type * from './transactions/transactions'
export type * from './transactions/transaction-manager'
export type * from './transactions/lock-manager'
export type * from './transactions/transactional-pipeline'
export type * from './transactions/transactional-repository'
export type * from './transactions/transactional-resource'