# Processing Data with Kairo

**Goal**: Master the PROCESS pillar - compose business logic, validate rules, and orchestrate complex workflows.  
**Perfect for**: Developers building applications with complex business logic and data processing requirements.

## 🎯 What You'll Learn

By the end of this guide, you'll know how to:
- ✅ Compose complex data processing workflows
- ✅ Define and validate business rules
- ✅ Build resilient, cacheable operations
- ✅ Orchestrate multi-step business processes

**Prerequisites**: Complete [Your First App](./your-first-app) or familiar with `Result`, `schema`, and `pipeline`.

## 🚀 Quick Start

### Import What You Need
```typescript
// Essential functions for data processing
import { 
  Result, schema, pipeline, rule, rules,
  cache, pipe 
} from 'kairo/tier1'
```

**Added functions**: `rule`, `rules`, `cache`, `pipe` (4 new functions total: 15 - Complete Tier 1!)

## 🌟 Core Pattern: Business Rule Validation

### Problem: "I need to validate complex business rules"

```typescript
// Define individual business rules
const ageRule = rule('age-requirement')
  .require(user => user.age >= 18)
  .message('User must be 18 or older')
  .code('AGE_REQUIREMENT')
  .field('age')

const emailRule = rule('email-uniqueness')
  .async(async user => {
    const exists = await checkEmailExists(user.email)
    return exists ? Result.Err('Email already exists') : Result.Ok(true)
  })
  .message('Email address is already registered')
  .code('DUPLICATE_EMAIL')
  .field('email')

// Combine rules into rule sets
const userValidationRules = rules('user-validation', {
  ageCheck: ageRule,
  emailCheck: emailRule,
  nameRequired: commonRules.required('name', 'Name is required'),
  emailFormat: commonRules.email('email', 'Please enter a valid email')
})

// Validate data against all rules
const userData = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 25
}

const validationResult = await userValidationRules.validateAll(userData)

Result.match(validationResult, {
  Ok: () => {
    console.log('✅ All business rules passed!')
    // Proceed with user creation
  },
  Err: errors => {
    console.error('❌ Business rule violations:')
    errors.forEach(error => {
      console.error(`- ${error.field}: ${error.userMessage}`)
    })
  }
})
```

**🎓 Key Benefits**:
- **Centralized Logic**: Business rules defined in one place
- **Reusable Validation**: Rules can be used across different contexts
- **Clear Error Messages**: User-friendly validation feedback
- **Async Support**: Handle external validation (database checks, API calls)

### Real-World Example: User Registration Workflow

```typescript
// Define comprehensive business rules
const registrationRules = rules('user-registration', {
  // Basic validation
  nameRequired: commonRules.required('name', 'Name is required'),
  emailFormat: commonRules.email('email', 'Please enter a valid email'),
  passwordLength: commonRules.minLength('password', 8, 'Password must be at least 8 characters'),
  
  // Custom business rules
  ageRequirement: rule('age-verification')
    .require((user, context) => {
      const minAge = context?.country === 'US' ? 21 : 18
      return user.age >= minAge
    })
    .message('You must meet the minimum age requirement for your country')
    .code('AGE_REQUIREMENT'),
    
  passwordStrength: rule('password-strength')
    .require(user => {
      const { password } = user
      return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)
    })
    .message('Password must contain lowercase, uppercase, number, and special character')
    .code('WEAK_PASSWORD')
    .field('password'),
    
  emailUniqueness: rule('email-unique')
    .async(async user => {
      const exists = await checkEmailExists(user.email)
      return exists ? Result.Err('Email taken') : Result.Ok(true)
    })
    .message('This email is already registered')
    .code('DUPLICATE_EMAIL')
    .field('email'),
    
  termsAcceptance: rule('terms-accepted')
    .require((user, context) => context?.termsAccepted === true)
    .message('You must accept the terms and conditions')
    .code('TERMS_NOT_ACCEPTED')
})
```

## ⚡ Advanced Pipeline Patterns

### Problem: "I need complex, multi-step data processing"

```typescript
// Build complex workflows with pipelines
const userRegistrationPipeline = pipeline('user-registration')
  .input(CreateUserSchema)
  .validateAllRules(registrationRules, {
    country: 'US',
    termsAccepted: true
  })
  .map(async user => {
    // Hash password securely
    const hashedPassword = await hashPassword(user.password)
    return { ...user, password: hashedPassword }
  })
  .run(async user => {
    // Create user in database
    const userResult = await userRepository.create(user)
    if (Result.isErr(userResult)) {
      throw new Error(`User creation failed: ${userResult.error.message}`)
    }
    return userResult.value
  })
  .run(async user => {
    // Send welcome email (async, don't wait)
    EmailAPI.sendWelcome.run({
      email: user.email,
      name: user.name
    }).catch(error => {
      console.warn('Welcome email failed:', error)
    })
    
    return user
  })
  .cache(300000) // Cache successful registrations for 5 minutes
  .trace('user-registration') // Add tracing for debugging

// Use the complete pipeline
const registrationResult = await userRegistrationPipeline.run({
  name: 'Jane Smith',
  email: 'jane@example.com',
  password: 'SecurePass123!',
  age: 28
})
```

### Problem: "I need conditional processing and error recovery"

```typescript
// Conditional processing based on data
const processUserUpdate = pipeline('user-update')
  .input(UpdateUserSchema)
  .run(async (updateData, context) => {
    // Get current user
    const userResult = await userRepository.find(context.userId)
    if (Result.isErr(userResult) || !userResult.value) {
      throw new Error('User not found')
    }
    return { currentUser: userResult.value, updateData }
  })
  .run(async ({ currentUser, updateData }) => {
    // Conditional validation based on current state
    if (updateData.email && updateData.email !== currentUser.email) {
      // Email is changing - validate uniqueness
      const emailValidation = await emailRule.validate({
        ...currentUser,
        email: updateData.email
      })
      if (Result.isErr(emailValidation)) {
        throw new Error('Email validation failed')
      }
    }
    
    return { currentUser, updateData }
  })
  .run(async ({ currentUser, updateData }) => {
    // Apply updates
    const updateResult = await userRepository.update(currentUser.id, updateData)
    if (Result.isErr(updateResult)) {
      throw new Error(`Update failed: ${updateResult.error.message}`)
    }
    
    return updateResult.value
  })
  .run(async (updatedUser) => {
    // Post-processing: clear caches, update search index, etc.
    await clearUserCache(updatedUser.id)
    await updateSearchIndex(updatedUser)
    
    return updatedUser
  })
  .cache(60000) // Cache for 1 minute
```

## 🔧 Function Composition with Pipe

### Problem: "I want to compose functions for readable data flow"

```typescript
import { pipe, tap, maybe, when } from 'kairo/tier1'

// Compose functions for clear data flow
const processUserData = pipe(
  // 1. Validate input
  tap(user => console.log('Processing user:', user.name)),
  
  // 2. Normalize data
  user => ({
    ...user,
    email: user.email.toLowerCase(),
    name: user.name.trim()
  }),
  
  // 3. Add computed fields
  user => ({
    ...user,
    displayName: user.name.toUpperCase(),
    initials: user.name.split(' ').map(n => n[0]).join(''),
    isAdult: user.age >= 18
  }),
  
  // 4. Conditional processing
  when(
    user => user.isAdult,
    user => ({ ...user, permissions: ['read', 'write'] })
  ),
  
  // 5. Optional enhancement
  maybe(
    user => user.email.includes('@company.com'),
    user => ({ ...user, isEmployee: true }),
    user => ({ ...user, isEmployee: false })
  ),
  
  // 6. Final validation
  tap(user => {
    if (!user.displayName) {
      throw new Error('Display name generation failed')
    }
  })
)

// Use the composed function
const processedUser = processUserData({
  name: 'John Doe',
  email: 'JOHN@COMPANY.COM',
  age: 30
})

console.log(processedUser)
// {
//   name: 'John Doe',
//   email: 'john@company.com',
//   age: 30,
//   displayName: 'JOHN DOE',
//   initials: 'JD',
//   isAdult: true,
//   permissions: ['read', 'write'],
//   isEmployee: true
// }
```

## 🎯 Integration Patterns

### Problem: "I need to orchestrate multiple services and data sources"

```typescript
// Complex business workflow
const createOrderWorkflow = pipeline('create-order')
  .input(CreateOrderSchema)
  .validateAllRules(orderValidationRules)
  .run(async (orderData) => {
    // 1. Validate inventory
    const inventoryCheck = await InventoryAPI.check.run({
      items: orderData.items
    })
    
    if (Result.isErr(inventoryCheck)) {
      throw new Error('Inventory check failed')
    }
    
    if (!inventoryCheck.value.available) {
      throw new Error('Insufficient inventory')
    }
    
    return orderData
  })
  .run(async (orderData) => {
    // 2. Calculate pricing
    const pricingResult = await PricingAPI.calculate.run({
      items: orderData.items,
      customerId: orderData.customerId
    })
    
    if (Result.isErr(pricingResult)) {
      throw new Error('Pricing calculation failed')
    }
    
    return {
      ...orderData,
      pricing: pricingResult.value
    }
  })
  .run(async (orderData) => {
    // 3. Process payment
    const paymentResult = await PaymentAPI.charge.run({
      amount: orderData.pricing.total,
      customerId: orderData.customerId,
      paymentMethod: orderData.paymentMethod
    })
    
    if (Result.isErr(paymentResult)) {
      throw new Error('Payment processing failed')
    }
    
    return {
      ...orderData,
      payment: paymentResult.value
    }
  })
  .run(async (orderData) => {
    // 4. Create order record
    const orderResult = await orderRepository.create({
      customerId: orderData.customerId,
      items: orderData.items,
      total: orderData.pricing.total,
      paymentId: orderData.payment.id,
      status: 'confirmed'
    })
    
    if (Result.isErr(orderResult)) {
      // TODO: Initiate payment refund
      throw new Error('Order creation failed')
    }
    
    return orderResult.value
  })
  .run(async (order) => {
    // 5. Send confirmation email
    await EmailAPI.sendOrderConfirmation.run({
      orderId: order.id,
      customerEmail: order.customer.email
    })
    
    return order
  })
  .cache(0) // Don't cache orders
  .trace('order-creation')

// Use the workflow
const orderResult = await createOrderWorkflow.run({
  customerId: 123,
  items: [
    { productId: 456, quantity: 2 },
    { productId: 789, quantity: 1 }
  ],
  paymentMethod: 'credit_card'
})
```

### Problem: "I need error recovery and rollback capabilities"

```typescript
// Pipeline with error recovery
const safeUserOperation = pipeline('safe-user-operation')
  .input(UserOperationSchema)
  .run(async (operation) => {
    // Create checkpoint for rollback
    const checkpointResult = await createCheckpoint(operation.userId)
    if (Result.isErr(checkpointResult)) {
      throw new Error('Failed to create checkpoint')
    }
    
    return { operation, checkpoint: checkpointResult.value }
  })
  .run(async ({ operation, checkpoint }) => {
    try {
      // Perform the risky operation
      const result = await performRiskyOperation(operation)
      
      // Clean up checkpoint on success
      await cleanupCheckpoint(checkpoint.id)
      
      return result
    } catch (error) {
      // Rollback on failure
      console.warn('Operation failed, rolling back...')
      await rollbackToCheckpoint(checkpoint.id)
      throw error
    }
  })
  .recover(async (error, context) => {
    // Alternative recovery strategy
    console.log('Attempting recovery...')
    
    if (error.message.includes('network')) {
      // Retry with different endpoint
      return await performAlternativeOperation(context.operation)
    }
    
    // Re-throw if no recovery possible
    throw error
  })
```

## 🌟 Advanced Patterns

### Problem: "I need performance optimization and caching"

```typescript
// Performance-optimized pipeline
const optimizedUserLookup = pipeline('optimized-user-lookup')
  .input(schema.object({ userId: schema.string() }))
  .cache(300000) // Cache for 5 minutes
  .run(async ({ userId }) => {
    // Try cache first (handled automatically by .cache())
    
    // Batch operations where possible
    const [userResult, preferencesResult, activityResult] = await Promise.all([
      userRepository.find(userId),
      preferencesRepository.findByUser(userId),
      activityRepository.getRecentActivity(userId)
    ])
    
    // Handle errors gracefully
    const user = Result.isOk(userResult) ? userResult.value : null
    const preferences = Result.isOk(preferencesResult) ? preferencesResult.value : null
    const activity = Result.isOk(activityResult) ? activityResult.value : []
    
    if (!user) {
      throw new Error('User not found')
    }
    
    return {
      user,
      preferences,
      activity
    }
  })
  .run(async (data) => {
    // Transform data efficiently
    return pipe(
      // Add computed fields
      userData => ({
        ...userData,
        user: {
          ...userData.user,
          lastSeen: userData.activity.length > 0 
            ? userData.activity[0].timestamp 
            : null
        }
      }),
      // Apply preferences
      userData => ({
        ...userData,
        user: {
          ...userData.user,
          theme: userData.preferences?.theme || 'light'
        }
      })
    )(data)
  })
  .trace('user-lookup') // Add performance tracing
```

## 🎓 What You've Learned

### New Concepts Mastered ✅

1. **Business Rule Validation**: Centralized, reusable business logic
2. **Complex Pipelines**: Multi-step data processing workflows  
3. **Function Composition**: Readable data transformations with `pipe`
4. **Performance Optimization**: Caching and efficient operations
5. **Error Recovery**: Graceful handling of failures and rollbacks
6. **Service Orchestration**: Coordinating multiple APIs and data sources

### Complete Tier 1 Functions ✅

You now know all 15 Tier 1 functions:
- **Foundation**: `Result`, `map`, `match`, `flatMap`, `createError`
- **Data**: `schema`, `repository`, `hasMany`, `hasOne`, `belongsTo`
- **Interface**: `resource`, `resourceUtils`
- **Process**: `pipeline`, `rule`, `rules`
- **Utilities**: `pipe`
- **Performance**: `cache`

## 🚀 What's Next?

You've completed the foundation! Choose your advancement path:

### Go Production-Ready (Recommended)
👉 **[Production Ready Guide](../production-ready/README)** - Tier 2 patterns  
*Learn: Enhanced error handling, resilient APIs, testing utilities, advanced FP*

### Explore Specializations
👉 **[Advanced Patterns](../advanced-patterns/README)** - Tier 3 extensions  
*Choose: Events, caching, transactions, workflows, performance*

### See Real Examples
👉 **[Business Rules Examples](../examples/business-rules)** - Complex validation patterns  
👉 **[Enterprise Integration](../examples/enterprise-integration)** - Large-scale patterns

## 🆘 Troubleshooting

### Common Issues

**"Business rules are too complex"**
- Break complex rules into smaller, composable pieces
- Use `rule` for individual checks, `rules` for combinations
- Leverage `commonRules` for standard validations

**"Pipeline operations are slow"**
- Add `.cache()` for expensive operations
- Use `Promise.all()` for parallel operations
- Consider `.trace()` to identify bottlenecks

**"Error handling is getting complicated"**
- Use pipeline `.recover()` for error recovery
- Implement checkpoint/rollback patterns for critical operations
- Consider the Result pattern throughout your error boundaries

### Need More Help?

- 📚 **Examples**: Check out [Processing Data Examples](../examples/workflows)
- 🔍 **API Reference**: [Pipeline](../api-reference/index/functions/pipeline) and [Rules](../api-reference/index/functions/rule)
- 💬 **Community**: Join our Discord for help

## 🎉 Congratulations!

You've mastered all three pillars of Kairo! You can now:
- ✅ **DATA**: Model, validate, and persist complex data with relationships
- ✅ **INTERFACE**: Integrate with external APIs safely and efficiently  
- ✅ **PROCESS**: Compose complex business logic and data processing workflows

You've completed **Tier 1** - the essential foundation of Kairo. With these 15 functions, you can build sophisticated applications that are type-safe, error-resilient, and maintainable.

**Ready for production?** → [Production Ready Guide](../production-ready/README)