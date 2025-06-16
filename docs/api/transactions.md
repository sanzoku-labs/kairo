# Transaction API

The Transaction API provides ACID-compliant transaction management with automatic rollback, compensation patterns, and cross-pillar integration.

## Core Concepts

Transactions in Kairo ensure that a series of operations either all succeed or all fail, maintaining data consistency across your application. They support all ACID properties: Atomicity, Consistency, Isolation, and Durability.

## Creating a Transaction Manager

```typescript
import { createTransactionManager } from 'kairo/transactions'

const transactionManager = createTransactionManager({
  defaultIsolation: 'read-committed',
  defaultTimeout: 30000,
  maxConcurrentTransactions: 100,
  deadlockDetection: true,
})
```

### Configuration Options

- `defaultIsolation`: Default isolation level ('read-uncommitted', 'read-committed', 'repeatable-read', 'serializable')
- `defaultTimeout`: Default transaction timeout in milliseconds
- `maxConcurrentTransactions`: Maximum concurrent transactions
- `deadlockDetection`: Enable automatic deadlock detection

## Defining Transactions

```typescript
import { transaction, transactionStep } from 'kairo/transactions'

const userOnboardingTransaction = transaction(
  'user-onboarding',
  [
    transactionStep('validate-data', async userData => {
      const validation = await validateUser(userData)
      if (!validation.valid) {
        throw new ValidationError(validation.errors)
      }
      return validation.data
    }),

    transactionStep('create-user', async validatedData => {
      const user = await userRepo.create(validatedData)
      return user
    }),

    transactionStep('send-welcome-email', async user => {
      await emailService.sendWelcome(user.email)
      return { emailSent: true, userId: user.id }
    }),

    transactionStep('create-profile', async context => {
      const profile = await profileRepo.create({
        userId: context.user.id,
        displayName: context.user.name,
      })
      return profile
    }),
  ],
  {
    isolation: 'read-committed',
    timeout: 30000,
    compensationEnabled: true,
  }
)
```

## Executing Transactions

```typescript
// Execute with automatic rollback on failure
const result = await transactionManager.execute(userOnboardingTransaction, userData)

result.match({
  Ok: result => {
    console.log('Transaction committed successfully:', result.transactionId)
    console.log('User created:', result.result.user)
  },
  Err: error => {
    console.log('Transaction failed and rolled back:', error.message)
    // All steps automatically compensated
  },
})
```

## Isolation Levels

### Read Uncommitted

Allows dirty reads, non-repeatable reads, and phantom reads:

```typescript
const transaction = transaction('read-uncommitted', steps, {
  isolation: 'read-uncommitted',
})
```

### Read Committed (Default)

Prevents dirty reads, but allows non-repeatable reads and phantom reads:

```typescript
const transaction = transaction('read-committed', steps, {
  isolation: 'read-committed',
})
```

### Repeatable Read

Prevents dirty reads and non-repeatable reads, but allows phantom reads:

```typescript
const transaction = transaction('repeatable-read', steps, {
  isolation: 'repeatable-read',
})
```

### Serializable

Prevents all read phenomena:

```typescript
const transaction = transaction('serializable', steps, {
  isolation: 'serializable',
})
```

## Compensation and Rollback

### Automatic Compensation

```typescript
transactionManager.registerCompensation('create', 'user-repository', async operation => {
  // Compensate user creation by deleting the user
  await userRepo.delete(operation.compensationData.entityId)
  return Result.Ok(undefined)
})

transactionManager.registerCompensation('debit', 'account-service', async operation => {
  // Compensate debit by crediting back the amount
  await accountService.credit(operation.data.accountId, operation.data.amount)
  return Result.Ok(undefined)
})
```

### Custom Rollback Logic

```typescript
const complexTransaction = transaction(
  'complex-workflow',
  [
    transactionStep('transfer-funds', async input => {
      await accountService.debit(input.fromAccount, input.amount)
      await accountService.credit(input.toAccount, input.amount)
      return { transferId: generateId() }
    }),

    transactionStep('create-audit-log', async transferData => {
      await auditRepo.create({
        action: 'transfer',
        transferId: transferData.transferId,
        amount: transferData.amount,
      })
      return transferData
    }),
  ],
  {
    onRollback: async (context, error) => {
      // Custom rollback logic
      await auditRepo.create({
        action: 'transfer-failed',
        error: error.message,
        transactionId: context.transactionId,
      })
      await notificationService.notifyFailure(context)
    },
  }
)
```

## Lock Management

### Acquiring Locks

```typescript
import { createLockManager } from 'kairo/transactions'

const lockManager = createLockManager({
  enableDeadlockDetection: true,
  conflictStrategy: 'wait', // or 'fail-fast'
  maxWaitTime: 60000,
})

// Acquire exclusive lock
await lockManager.acquireLock('user:123', 'exclusive', 'transaction-1')

// Acquire shared lock
await lockManager.acquireLock('profile:456', 'shared', 'transaction-1')

// Automatic lock release on transaction completion
await lockManager.releaseAllLocks('transaction-1')
```

### Lock-Aware Transactions

```typescript
const lockedTransaction = transaction(
  'locked-workflow',
  [
    transactionStep('acquire-locks', async (input, context) => {
      await lockManager.acquireLock(`user:${input.userId}`, 'exclusive', context.transactionId)
      await lockManager.acquireLock(
        `account:${input.accountId}`,
        'exclusive',
        context.transactionId
      )
      return input
    }),

    transactionStep('process-data', async input => {
      // Process with exclusive access
      return await processUserAccount(input)
    }),
  ],
  {
    onCommit: async context => {
      await lockManager.releaseAllLocks(context.transactionId)
    },
    onRollback: async context => {
      await lockManager.releaseAllLocks(context.transactionId)
    },
  }
)
```

## Transactional Pipelines

```typescript
import { transactionalPipeline } from 'kairo/transactions'

const txPipeline = transactionalPipeline('user-processing', transactionManager)
  .map((user: User) => ({ ...user, processed: true }))
  .step('persist-user', async (user, context) => {
    return await userRepo.executeInTransaction(async () => {
      return await userRepo.create(user)
    }, context)
  })
  .step('notify-admin', async user => {
    await adminNotificationService.notify(user)
    return user
  })

// Execute with automatic transaction management
const result = await txPipeline.execute(rawUserData)
```

## Transactional Repositories

```typescript
import { transactionalRepository } from 'kairo/transactions'

const txUserRepo = transactionalRepository('users', UserSchema, transactionManager, {
  autoRegisterCompensation: true,
  enableTransactions: true,
})

// Operations automatically participate in transactions
const createUserTransaction = transaction('create-user', [
  transactionStep('create-user', async userData => {
    return await txUserRepo.create(userData)
  }),
  transactionStep('create-profile', async user => {
    return await txProfileRepo.create({
      userId: user.id,
      displayName: user.name,
    })
  }),
])

const result = await transactionManager.execute(createUserTransaction, userData)
```

## Distributed Transactions

### Saga Pattern

```typescript
import { saga, sagaStep } from 'kairo/transactions'

const distributedOrderSaga = saga(
  'distributed-order',
  [
    sagaStep('reserve-inventory', async order => {
      const reservation = await inventoryService.reserve(order.items)
      return { ...order, reservationId: reservation.id }
    }),

    sagaStep('charge-payment', async orderWithReservation => {
      const payment = await paymentService.charge({
        amount: orderWithReservation.total,
        customerId: orderWithReservation.customerId,
      })
      return { ...orderWithReservation, paymentId: payment.id }
    }),

    sagaStep('fulfill-order', async orderWithPayment => {
      const fulfillment = await fulfillmentService.fulfill(orderWithPayment)
      return { ...orderWithPayment, fulfillmentId: fulfillment.id }
    }),
  ],
  {
    compensations: {
      'reserve-inventory': async context => {
        await inventoryService.release(context.reservationId)
      },
      'charge-payment': async context => {
        await paymentService.refund(context.paymentId)
      },
      'fulfill-order': async context => {
        await fulfillmentService.cancel(context.fulfillmentId)
      },
    },
  }
)
```

## Transaction Events

```typescript
// Listen to transaction events
transactionManager.onTransactionStarted(event => {
  console.log(`Transaction ${event.transactionId} started`)
})

transactionManager.onTransactionCommitted(event => {
  console.log(`Transaction ${event.transactionId} committed successfully`)
})

transactionManager.onTransactionRolledBack(event => {
  console.log(`Transaction ${event.transactionId} rolled back: ${event.reason}`)
})

transactionManager.onDeadlockDetected(event => {
  console.log(`Deadlock detected between transactions: ${event.transactions.join(', ')}`)
})
```

## Performance Monitoring

```typescript
// Transaction metrics
const metrics = transactionManager.getMetrics()
console.log(`Active transactions: ${metrics.activeTransactions}`)
console.log(`Committed transactions: ${metrics.committedTransactions}`)
console.log(`Rolled back transactions: ${metrics.rolledBackTransactions}`)
console.log(`Average duration: ${metrics.averageDuration}ms`)

// Lock metrics
const lockMetrics = lockManager.getMetrics()
console.log(`Active locks: ${lockMetrics.activeLocks}`)
console.log(`Lock wait time: ${lockMetrics.averageWaitTime}ms`)
console.log(`Deadlocks detected: ${lockMetrics.deadlocksDetected}`)
```

## Best Practices

### Transaction Scope

Keep transactions as short as possible:

```typescript
// Good - Short transaction
const shortTransaction = transaction('quick-update', [
  transactionStep('validate', async data => validateQuickly(data)),
  transactionStep('update', async data => updateDirectly(data)),
])

// Avoid - Long-running transaction
const longTransaction = transaction('long-process', [
  transactionStep('external-api', async data => {
    // Avoid calling external APIs in transactions
    return await slowExternalService.process(data)
  }),
])
```

### Error Handling

Handle different error types appropriately:

```typescript
transactionStep('process-payment', async paymentData => {
  try {
    return await paymentService.process(paymentData)
  } catch (error) {
    if (error.code === 'INSUFFICIENT_FUNDS') {
      // Business logic error - don't retry
      throw new BusinessError('Insufficient funds', { cause: error })
    }
    if (error.code === 'NETWORK_ERROR') {
      // Transient error - can retry
      throw new TransientError('Network error', { cause: error })
    }
    throw error
  }
})
```

### Deadlock Prevention

Order lock acquisition to prevent deadlocks:

```typescript
// Good - Consistent lock ordering
const orderedLocks = [
  `account:${Math.min(fromAccountId, toAccountId)}`,
  `account:${Math.max(fromAccountId, toAccountId)}`,
]

for (const lockKey of orderedLocks) {
  await lockManager.acquireLock(lockKey, 'exclusive', transactionId)
}
```

## Type Safety

Transactions are fully typed for maximum safety:

```typescript
interface TransferData {
  fromAccount: string
  toAccount: string
  amount: number
}

interface TransferResult {
  transferId: string
  fromBalance: number
  toBalance: number
}

const typedTransaction = transaction<TransferData, TransferResult>('typed-transfer', [
  transactionStep('validate-transfer', async (data: TransferData) => {
    // data is typed as TransferData
    return await validateTransfer(data)
  }),
  transactionStep('execute-transfer', async (data: TransferData) => {
    // Return type must match TransferResult
    return await executeTransfer(data)
  }),
])

// Result is typed as Result<TransactionError, TransferResult>
const result = await transactionManager.execute(typedTransaction, transferData)
```
