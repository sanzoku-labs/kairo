# Business Rules API

The Business Rules API is a core component of Kairo's **PROCESS Pillar** - providing declarative validation logic, conditional rule execution, and seamless integration with pipelines and external systems.

## Overview

- **📋 Declarative Validation** - Express business rules as readable, reusable declarations
- **🔀 Conditional Logic** - Apply rules based on dynamic conditions and context
- **⚡ Async Support** - Handle external validations and API calls natively
- **🛡️ Type Safety** - Full TypeScript inference with Result pattern integration
- **🔄 Pipeline Integration** - Seamless validation within business process flows
- **🧪 Composable Rules** - Build complex validation logic from simple, testable components

## Creating Rules

### Basic Rule Definition

```typescript
import { rule, rules, nativeSchema } from 'kairo'

// Define data schema for type safety
const UserSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(2).max(100),
  email: nativeSchema.string().email(),
  age: nativeSchema.number().min(0).max(150),
  country: nativeSchema.string(),
  role: nativeSchema.enum(['user', 'admin', 'moderator'] as const),
  lastLoginAt: nativeSchema.string().datetime().optional(),
  isActive: nativeSchema.boolean(),
  registeredAt: nativeSchema.string().datetime(),
})

type User = typeof UserSchema.infer

// Basic synchronous rule
const ageRequirementRule = rule<User>('age-requirement')
  .require(user => user.age >= 18)
  .message('Must be 18 years or older to register')
  .code('MINIMUM_AGE_REQUIRED')
  .field('age')

// Conditional rule based on user context
const countrySpecificAgeRule = rule<User>('country-age-requirement')
  .when(user => user.country === 'US')
  .require(user => user.age >= 21)
  .message('Must be 21 years or older in the United States')
  .code('US_MINIMUM_AGE')
  .field('age')

// Asynchronous rule with external validation
const emailUniquenessRule = rule<User>('email-uniqueness')
  .async(async user => {
    const checkResult = await UserAPI.checkEmail.run({ email: user.email })
    return checkResult.match({
      Ok: response =>
        response.available ? Result.Ok(true) : Result.Err('Email already registered'),
      Err: error => Result.Err(`Email validation failed: ${error.message}`),
    })
  })
  .message('This email address is already registered')
  .code('DUPLICATE_EMAIL')
  .field('email')

// Complex business logic rule
const accountSecurityRule = rule<User>('account-security')
  .require(user => {
    // Multi-factor security validation
    const hasRecentLogin =
      user.lastLoginAt &&
      new Date(user.lastLoginAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days

    const isLongTimeUser =
      new Date(user.registeredAt) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year

    // Active users with recent login or established accounts
    return user.isActive && (hasRecentLogin || isLongTimeUser)
  })
  .message('Account does not meet security requirements')
  .code('ACCOUNT_SECURITY_VIOLATION')
  .context({
    requiresRecentLogin: true,
    minimumAccountAge: '1 year',
  })
```

### Rule Collections

```typescript
// Organize related rules into collections
const userValidationRules = rules('user-validation', {
  // Required field validations
  nameRequired: rule<User>('name-required')
    .require(user => user.name.trim().length > 0)
    .message('Name is required')
    .code('NAME_REQUIRED')
    .field('name'),

  emailFormat: rule<User>('email-format')
    .require(user => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email))
    .message('Please enter a valid email address')
    .code('INVALID_EMAIL_FORMAT')
    .field('email'),

  // Business rules
  ageRequirement: ageRequirementRule,
  countryAgeRequirement: countrySpecificAgeRule,
  emailUniqueness: emailUniquenessRule,
  accountSecurity: accountSecurityRule,

  // Role-based validations
  adminPrivileges: rule<User>('admin-privileges')
    .when(user => user.role === 'admin')
    .require(user => user.isActive)
    .message('Admin accounts must be active')
    .code('INACTIVE_ADMIN')
    .field('isActive'),

  moderatorPermissions: rule<User>('moderator-permissions')
    .when(user => user.role === 'moderator')
    .async(async user => {
      const permissionCheck = await PermissionAPI.check.run({
        userId: user.id,
        role: 'moderator',
      })
      return permissionCheck.match({
        Ok: result =>
          result.hasPermission ? Result.Ok(true) : Result.Err('Insufficient permissions'),
        Err: () => Result.Err('Permission check failed'),
      })
    })
    .message('Moderator permissions verification failed')
    .code('MODERATOR_PERMISSION_DENIED'),
})

// Context-aware rule collection
const orderValidationRules = rules('order-validation', {
  minimumAmount: rule<Order>('minimum-amount')
    .require(order => order.total >= 10.0)
    .message('Minimum order amount is $10.00')
    .code('ORDER_MINIMUM_NOT_MET')
    .field('total'),

  inventoryAvailability: rule<Order>('inventory-check')
    .async(async order => {
      const checks = await Promise.all(
        order.items.map(item =>
          InventoryAPI.check.run({ productId: item.productId, quantity: item.quantity })
        )
      )

      const unavailableItems = checks
        .map((result, index) => ({ result, item: order.items[index] }))
        .filter(({ result }) => result.match({ Ok: stock => !stock.available, Err: () => true }))

      return unavailableItems.length === 0
        ? Result.Ok(true)
        : Result.Err(
            `Items out of stock: ${unavailableItems.map(({ item }) => item.name).join(', ')}`
          )
    })
    .message('Some items in your order are out of stock')
    .code('INVENTORY_UNAVAILABLE'),

  customerCreditLimit: rule<Order>('credit-limit')
    .when(order => order.paymentMethod === 'credit')
    .async(async order => {
      const creditCheck = await CreditAPI.check.run({
        customerId: order.customerId,
        amount: order.total,
      })
      return creditCheck.match({
        Ok: credit =>
          credit.approved
            ? Result.Ok(true)
            : Result.Err(`Credit limit exceeded by $${credit.overageAmount}`),
        Err: () => Result.Err('Credit check failed'),
      })
    })
    .message('Credit limit exceeded for this order')
    .code('CREDIT_LIMIT_EXCEEDED'),

  businessHoursOnly: rule<Order>('business-hours')
    .when(order => order.priority === 'urgent')
    .require(() => {
      const now = new Date()
      const hour = now.getHours()
      const day = now.getDay()
      // Monday-Friday, 9 AM - 5 PM
      return day >= 1 && day <= 5 && hour >= 9 && hour <= 17
    })
    .message('Urgent orders can only be placed during business hours (Mon-Fri, 9 AM - 5 PM)')
    .code('OUTSIDE_BUSINESS_HOURS'),

  geographicRestrictions: rule<Order>('geographic-restrictions')
    .async(async order => {
      const restrictionCheck = await ComplianceAPI.checkShipping.run({
        country: order.shippingAddress.country,
        products: order.items.map(item => item.productId),
      })
      return restrictionCheck.match({
        Ok: result =>
          result.allowed ? Result.Ok(true) : Result.Err(`Shipping restricted: ${result.reason}`),
        Err: () => Result.Err('Geographic restriction check failed'),
      })
    })
    .message('Order cannot be shipped to the specified location')
    .code('SHIPPING_RESTRICTED'),
})
```

## Rule Execution and Validation

### Single Rule Validation

```typescript
// Validate individual rules
const user: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'John Doe',
  email: 'john@example.com',
  age: 25,
  country: 'US',
  role: 'user',
  isActive: true,
  registeredAt: '2023-01-01T00:00:00Z',
}

// Single rule validation
const ageResult = await ageRequirementRule.validate(user)
ageResult.match({
  Ok: validatedUser => {
    console.log('Age validation passed:', validatedUser.age)
  },
  Err: error => {
    console.error('Age validation failed:', {
      rule: error.ruleName,
      field: error.field,
      message: error.userMessage,
      code: error.code,
    })
  },
})

// Conditional rule validation
const countryAgeResult = await countrySpecificAgeRule.validate(user)
countryAgeResult.match({
  Ok: validatedUser => {
    console.log('Country-specific age validation passed')
  },
  Err: error => {
    console.error('Country age requirement failed:', error.userMessage)
  },
})

// Async rule validation
const emailResult = await emailUniquenessRule.validate(user)
emailResult.match({
  Ok: validatedUser => {
    console.log('Email is unique and available')
  },
  Err: error => {
    switch (error.code) {
      case 'DUPLICATE_EMAIL':
        console.log('Email already exists, user should choose another')
        break
      case 'NETWORK_ERROR':
        console.log('Could not verify email, please try again')
        break
      default:
        console.log('Email validation failed:', error.userMessage)
    }
  },
})
```

### Collection Validation

```typescript
// Validate all rules in a collection
const allValidationResult = await userValidationRules.validateAll(user)
allValidationResult.match({
  Ok: validatedUser => {
    console.log('All user validation rules passed!')
    console.log('User is ready for registration:', validatedUser.email)
  },
  Err: errors => {
    console.log(`Validation failed with ${errors.length} errors:`)
    errors.forEach(error => {
      console.log(`- ${error.field}: ${error.userMessage} (${error.code})`)
    })
  },
})

// Validate specific rules only
const essentialValidationResult = await userValidationRules.validate(user, [
  'nameRequired',
  'emailFormat',
  'ageRequirement',
])

// Validate single rule from collection
const emailUniquenessResult = await userValidationRules.validateRule(user, 'emailUniqueness')

// Conditional validation with context
const adminContext = { isAdminOperation: true, requestingUserId: 'admin-123' }
const contextualResult = await userValidationRules.validateAll(user, adminContext)
```

### Batch Validation

```typescript
// Validate multiple entities
const users: User[] = [user1, user2, user3, user4]

const batchValidationResults = await Promise.all(
  users.map(async (user, index) => {
    const result = await userValidationRules.validateAll(user)
    return {
      index,
      user,
      result,
    }
  })
)

// Process batch results
const validUsers = batchValidationResults
  .filter(({ result }) => result.tag === 'Ok')
  .map(({ user }) => user)

const invalidUsers = batchValidationResults
  .filter(({ result }) => result.tag === 'Err')
  .map(({ index, user, result }) => ({
    index,
    user,
    errors: result.tag === 'Err' ? result.error : [],
  }))

console.log(`${validUsers.length} users passed validation`)
console.log(`${invalidUsers.length} users failed validation`)

invalidUsers.forEach(({ index, errors }) => {
  console.log(`User ${index} errors:`)
  errors.forEach(error => {
    console.log(`  - ${error.field}: ${error.userMessage}`)
  })
})
```

## Advanced Rule Patterns

### Context-Aware Rules

```typescript
// Rules that adapt based on execution context
const dynamicPermissionRule = rule<User>('dynamic-permissions')
  .require((user, context) => {
    const { operation, resourceId, requesterRole } = context || {}

    // Admin can do anything
    if (requesterRole === 'admin') return true

    // Users can only modify their own data
    if (operation === 'update' && user.id === context?.requesterId) return true

    // Moderators can view all user data
    if (operation === 'read' && requesterRole === 'moderator') return true

    return false
  })
  .message('Insufficient permissions for this operation')
  .code('PERMISSION_DENIED')

// Usage with context
const operationContext = {
  operation: 'update',
  resourceId: user.id,
  requesterId: 'current-user-id',
  requesterRole: 'user',
}

const permissionResult = await dynamicPermissionRule.validate(user, operationContext)
```

### Async External Validation Rules

```typescript
// Rules that integrate with external services
const creditScoreRule = rule<LoanApplication>('credit-score-check')
  .async(async application => {
    try {
      // Call external credit bureau API
      const creditResponse = await CreditBureauAPI.getScore.run({
        ssn: application.ssn,
        fullName: application.fullName,
        dateOfBirth: application.dateOfBirth,
      })

      return creditResponse.match({
        Ok: creditData => {
          const minimumScore = application.loanAmount > 50000 ? 700 : 650
          return creditData.score >= minimumScore
            ? Result.Ok(true)
            : Result.Err(`Credit score ${creditData.score} below required minimum ${minimumScore}`)
        },
        Err: error => Result.Err(`Credit check failed: ${error.message}`),
      })
    } catch (error) {
      return Result.Err(`Credit bureau service unavailable: ${error.message}`)
    }
  })
  .message('Credit score verification failed')
  .code('CREDIT_SCORE_INSUFFICIENT')
  .field('creditScore')
  .context({ externalService: 'credit-bureau', retryable: true })

// Rule with timeout and retry logic
const externalVerificationRule = rule<User>('external-verification')
  .async(async user => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Verification timeout')), 5000)
    })

    const verificationPromise = VerificationAPI.verify.run({
      userId: user.id,
      email: user.email,
    })

    try {
      const result = await Promise.race([verificationPromise, timeoutPromise])
      return result.match({
        Ok: verified =>
          verified.status === 'approved' ? Result.Ok(true) : Result.Err('Verification rejected'),
        Err: error => Result.Err(`Verification failed: ${error.message}`),
      })
    } catch (error) {
      return Result.Err(`Verification timeout or service error: ${error.message}`)
    }
  })
  .message('External verification could not be completed')
  .code('EXTERNAL_VERIFICATION_FAILED')
```

### Rule Composition and Factories

```typescript
// Create reusable rule factories
const createAgeRuleForCountry = (country: string, minimumAge: number) =>
  rule<User>(`age-requirement-${country.toLowerCase()}`)
    .when(user => user.country === country)
    .require(user => user.age >= minimumAge)
    .message(`Must be ${minimumAge} years or older in ${country}`)
    .code(`${country.toUpperCase()}_AGE_REQUIREMENT`)
    .field('age')

const createEmailDomainRule = (allowedDomains: string[]) =>
  rule<User>('email-domain-restriction')
    .require(user => {
      const domain = user.email.split('@')[1]?.toLowerCase()
      return allowedDomains.some(allowed => domain === allowed.toLowerCase())
    })
    .message(`Email must be from one of these domains: ${allowedDomains.join(', ')}`)
    .code('EMAIL_DOMAIN_RESTRICTED')
    .field('email')

const createPasswordComplexityRule = (config: {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
}) =>
  rule<User>('password-complexity')
    .require(user => {
      const { password } = user as any // Assuming password field exists in context
      if (password.length < config.minLength) return false
      if (config.requireUppercase && !/[A-Z]/.test(password)) return false
      if (config.requireLowercase && !/[a-z]/.test(password)) return false
      if (config.requireNumbers && !/\d/.test(password)) return false
      if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false
      return true
    })
    .message('Password does not meet complexity requirements')
    .code('PASSWORD_COMPLEXITY_FAILED')
    .field('password')

// Use rule factories
const countrySpecificRules = rules('country-specific', {
  usAge: createAgeRuleForCountry('US', 21),
  ukAge: createAgeRuleForCountry('UK', 18),
  deAge: createAgeRuleForCountry('DE', 16),
})

const corporateEmailRule = createEmailDomainRule(['company.com', 'enterprise.org', 'business.net'])

const strongPasswordRule = createPasswordComplexityRule({
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
})
```

### Conditional Rule Chains

```typescript
// Rules that build upon each other
const userOnboardingRules = rules('user-onboarding', {
  // Step 1: Basic validation
  basicInfo: rule<User>('basic-info')
    .require(user => user.name && user.email && user.age)
    .message('Basic information is required')
    .code('BASIC_INFO_MISSING'),

  // Step 2: Email validation (depends on basic info)
  emailFormat: rule<User>('email-format')
    .when(user => user.email && user.email.length > 0)
    .require(user => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email))
    .message('Valid email address is required')
    .code('EMAIL_FORMAT_INVALID'),

  // Step 3: Age validation (depends on basic info)
  legalAge: rule<User>('legal-age')
    .when(user => typeof user.age === 'number')
    .require(user => user.age >= 18)
    .message('Must be 18 years or older')
    .code('UNDERAGE'),

  // Step 4: External validation (depends on email format)
  emailUniqueness: rule<User>('email-uniqueness')
    .when(user => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email))
    .async(async user => {
      const exists = await UserAPI.checkEmail.run({ email: user.email })
      return exists.match({
        Ok: result => (result.exists ? Result.Err('Email already exists') : Result.Ok(true)),
        Err: () => Result.Err('Email check failed'),
      })
    })
    .message('Email address is already registered')
    .code('EMAIL_EXISTS'),

  // Step 5: Final business rules
  accountEligibility: rule<User>('account-eligibility')
    .when(user => user.age >= 18 && user.email)
    .async(async user => {
      const eligibilityCheck = await EligibilityAPI.check.run({
        email: user.email,
        age: user.age,
        country: user.country,
      })
      return eligibilityCheck.match({
        Ok: result => (result.eligible ? Result.Ok(true) : Result.Err(result.reason)),
        Err: () => Result.Err('Eligibility check failed'),
      })
    })
    .message('Account is not eligible for registration')
    .code('ACCOUNT_INELIGIBLE'),
})
```

## Pipeline Integration

### Basic Pipeline Integration

```typescript
import { pipeline } from 'kairo'

// Simple rule validation in pipeline
const userRegistrationPipeline = pipeline('user-registration')
  .input(UserRegistrationSchema)
  .validateAllRules(userValidationRules)
  .map(user => ({
    ...user,
    id: generateUserId(),
    registeredAt: new Date().toISOString(),
    isActive: true,
  }))
  .pipeline(UserAPI.create)
  .trace('user-registered')

// Conditional rule application
const userUpdatePipeline = pipeline('user-update')
  .input(UserUpdateSchema)
  .branch({
    condition: (data, context) => context?.isAdminUpdate === true,
    then: pipeline('admin-update').validateRules(adminValidationRules, [
      'adminPrivileges',
      'securityClearance',
    ]),
    else: pipeline('user-update').validateRules(userValidationRules, ['basicInfo', 'emailFormat']),
  })
  .pipeline(UserAPI.update)
  .trace('user-updated')
```

### Advanced Pipeline Rule Integration

```typescript
// Multi-stage validation pipeline
const orderProcessingPipeline = pipeline('order-processing')
  .input(OrderSchema)

  // Stage 1: Basic order validation
  .validateRules(orderValidationRules, ['minimumAmount', 'requiredFields'])
  .trace('basic-validation-complete')

  // Stage 2: Customer validation
  .run(async order => {
    const customerResult = await CustomerAPI.get.run({ id: order.customerId })
    return customerResult.match({
      Ok: customer => ({ ...order, customer }),
      Err: error => {
        throw new Error(`Customer not found: ${error.message}`)
      },
    })
  })
  .validateRules(customerValidationRules, [
    'customerActive',
    'creditLimit',
    'geographicRestrictions',
  ])
  .trace('customer-validation-complete')

  // Stage 3: Inventory validation
  .validateRules(orderValidationRules, ['inventoryAvailability'])
  .trace('inventory-validation-complete')

  // Stage 4: Business rules
  .validateRules(orderValidationRules, ['businessHoursOnly', 'specialPromotions'])
  .trace('business-rules-complete')

  // Stage 5: Final processing
  .map(order => ({
    ...order,
    status: 'validated',
    validatedAt: new Date().toISOString(),
  }))
  .pipeline(OrderAPI.create)
  .trace('order-created')

// Error handling with rule-specific recovery
const resilientValidationPipeline = pipeline('resilient-validation')
  .input(UserSchema)
  .retry({ times: 3, delay: 1000 })
  .validateRules(userValidationRules, ['basicInfo', 'emailFormat'])
  .fallback(
    // Primary validation path
    pipeline('primary-validation').validateAllRules(strictValidationRules),

    // Fallback validation path
    pipeline('fallback-validation').validateRules(basicValidationRules, ['required-only']),

    // Last resort - manual review
    pipeline('manual-review').map(user => ({ ...user, requiresManualReview: true }))
  )
  .trace('validation-complete')
```

### Rule Context in Pipelines

```typescript
// Pipeline with rule context propagation
const contextAwarePipeline = pipeline('context-aware-validation')
  .input(UserSchema)
  .run(async (user, pipelineContext) => {
    // Build rule validation context from pipeline context
    const ruleContext = {
      operation: pipelineContext?.operation || 'create',
      requesterId: pipelineContext?.requesterId,
      requesterRole: pipelineContext?.requesterRole,
      clientIP: pipelineContext?.clientIP,
      timestamp: new Date().toISOString(),
    }

    // Validate with context
    const validationResult = await userValidationRules.validateAll(user, ruleContext)
    return validationResult.match({
      Ok: validatedUser => validatedUser,
      Err: errors => {
        throw new Error(`Validation failed: ${errors.map(e => e.userMessage).join(', ')}`)
      },
    })
  })
  .trace('context-validation-complete')

// Usage with context
const result = await contextAwarePipeline.run(userData, {
  operation: 'update',
  requesterId: 'user-123',
  requesterRole: 'admin',
  clientIP: '192.168.1.100',
})
```

## Testing Business Rules

### Unit Testing Individual Rules

```typescript
import { describe, it, expect } from 'vitest'

describe('User Validation Rules', () => {
  describe('Age Requirement Rule', () => {
    it('should pass for users 18 and older', async () => {
      const adultUser: User = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        country: 'US',
        role: 'user',
        isActive: true,
        registeredAt: '2023-01-01T00:00:00Z',
      }

      const result = await ageRequirementRule.validate(adultUser)
      expect(result.tag).toBe('Ok')
    })

    it('should fail for users under 18', async () => {
      const minorUser: User = {
        ...adultUser,
        age: 16,
      }

      const result = await ageRequirementRule.validate(minorUser)
      expect(result.tag).toBe('Err')
      if (result.tag === 'Err') {
        expect(result.error.code).toBe('MINIMUM_AGE_REQUIRED')
        expect(result.error.field).toBe('age')
        expect(result.error.userMessage).toContain('18 years')
      }
    })

    it('should handle edge case of exactly 18', async () => {
      const eighteenUser: User = {
        ...adultUser,
        age: 18,
      }

      const result = await ageRequirementRule.validate(eighteenUser)
      expect(result.tag).toBe('Ok')
    })
  })

  describe('Conditional Rules', () => {
    it('should apply country-specific age rules only for US users', async () => {
      const usUser: User = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        age: 19,
        country: 'US',
        role: 'user',
        isActive: true,
        registeredAt: '2023-01-01T00:00:00Z',
      }

      const result = await countrySpecificAgeRule.validate(usUser)
      expect(result.tag).toBe('Err') // 19 is under 21 for US
      if (result.tag === 'Err') {
        expect(result.error.code).toBe('US_MINIMUM_AGE')
      }
    })

    it('should not apply US age rule for non-US users', async () => {
      const nonUsUser: User = {
        ...adultUser,
        age: 19,
        country: 'CA', // Canada
      }

      const result = await countrySpecificAgeRule.validate(nonUsUser)
      expect(result.tag).toBe('Ok') // Rule doesn't apply to non-US users
    })
  })

  describe('Async Rules', () => {
    it('should validate email uniqueness', async () => {
      // Mock the API response
      const mockUserAPI = UserAPI.mock([
        {
          operation: 'checkEmail',
          scenario: 'email-available',
          response: { available: true },
        },
      ])

      const user: User = {
        ...adultUser,
        email: 'unique@example.com',
      }

      // Test with mocked API
      const customEmailRule = rule<User>('email-uniqueness-test').async(async user => {
        const result = await mockUserAPI.checkEmail.run({ email: user.email })
        return result.match({
          Ok: response => (response.available ? Result.Ok(true) : Result.Err('Email exists')),
          Err: () => Result.Err('Check failed'),
        })
      })

      const result = await customEmailRule.validate(user)
      expect(result.tag).toBe('Ok')
    })
  })
})
```

### Testing Rule Collections

```typescript
describe('User Validation Rules Collection', () => {
  it('should validate all rules successfully for valid user', async () => {
    const validUser: User = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
      country: 'US',
      role: 'user',
      isActive: true,
      registeredAt: '2023-01-01T00:00:00Z',
    }

    // Mock external dependencies
    const mockedRules = mockAsyncRules(userValidationRules, {
      emailUniqueness: { available: true },
      accountSecurity: { approved: true },
    })

    const result = await mockedRules.validateAll(validUser)
    expect(result.tag).toBe('Ok')
  })

  it('should collect all validation errors for invalid user', async () => {
    const invalidUser: User = {
      id: '',
      name: '',
      email: 'invalid-email',
      age: 16,
      country: 'US',
      role: 'user',
      isActive: false,
      registeredAt: '2023-01-01T00:00:00Z',
    }

    const result = await userValidationRules.validateAll(invalidUser)
    expect(result.tag).toBe('Err')
    if (result.tag === 'Err') {
      expect(result.error.length).toBeGreaterThan(0)

      const errorCodes = result.error.map(e => e.code)
      expect(errorCodes).toContain('NAME_REQUIRED')
      expect(errorCodes).toContain('INVALID_EMAIL_FORMAT')
      expect(errorCodes).toContain('MINIMUM_AGE_REQUIRED')
    }
  })

  it('should validate only specified rules', async () => {
    const user: User = {
      id: '123',
      name: 'John Doe',
      email: 'invalid-email', // Invalid email format
      age: 25, // Valid age
      country: 'US',
      role: 'user',
      isActive: true,
      registeredAt: '2023-01-01T00:00:00Z',
    }

    // Only validate age, not email
    const result = await userValidationRules.validate(user, ['ageRequirement'])
    expect(result.tag).toBe('Ok') // Should pass since we're only checking age
  })
})
```

### Property-Based Testing

```typescript
import { rulesTesting } from 'kairo/testing'

describe('Rules Property-Based Testing', () => {
  it('should handle all valid user variations', async () => {
    const tester = rulesTesting.createTester(userValidationRules)

    const results = await tester.propertyTest(
      () => ({
        id: rulesTesting.generators.uuid(),
        name: rulesTesting.generators.randomString(10),
        email: `${rulesTesting.generators.randomString(5)}@example.com`,
        age: rulesTesting.generators.randomNumber(18, 65),
        country: rulesTesting.generators.randomChoice(['US', 'CA', 'UK', 'DE']),
        role: rulesTesting.generators.randomChoice(['user', 'admin', 'moderator']),
        isActive: true,
        registeredAt: rulesTesting.generators
          .randomDate(new Date('2020-01-01'), new Date())
          .toISOString(),
      }),
      1000 // Generate 1000 test cases
    )

    expect(results.passed).toBeGreaterThan(900) // Allow for some edge cases
    expect(results.failed).toBeLessThan(100)
  })

  it('should properly reject invalid users', async () => {
    const tester = rulesTesting.createTester(userValidationRules)

    const invalidUserGenerator = () => ({
      id: '',
      name: '',
      email: 'invalid-email',
      age: rulesTesting.generators.randomNumber(0, 17), // Always invalid age
      country: 'US',
      role: 'user' as const,
      isActive: false,
      registeredAt: '2023-01-01T00:00:00Z',
    })

    const results = await tester.propertyTest(invalidUserGenerator, 100)
    expect(results.passed).toBe(0) // All should fail
    expect(results.failed).toBe(100)
  })
})
```

### Performance Testing

```typescript
describe('Rules Performance', () => {
  it('should validate large batches efficiently', async () => {
    const users = Array.from({ length: 1000 }, (_, index) => ({
      id: `user-${index}`,
      name: `User ${index}`,
      email: `user${index}@example.com`,
      age: 25,
      country: 'US',
      role: 'user' as const,
      isActive: true,
      registeredAt: '2023-01-01T00:00:00Z',
    }))

    const startTime = Date.now()

    const results = await Promise.all(users.map(user => userValidationRules.validateAll(user)))

    const duration = Date.now() - startTime

    const successfulValidations = results.filter(r => r.tag === 'Ok').length

    expect(successfulValidations).toBe(1000)
    expect(duration).toBeLessThan(2000) // Should complete in under 2 seconds
  })

  it('should handle async rules efficiently', async () => {
    const user: User = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
      country: 'US',
      role: 'user',
      isActive: true,
      registeredAt: '2023-01-01T00:00:00Z',
    }

    // Test async rule performance
    const iterations = 100
    const startTime = Date.now()

    const results = await Promise.all(
      Array.from({ length: iterations }, () => emailUniquenessRule.validate(user))
    )

    const duration = Date.now() - startTime
    const avgDuration = duration / iterations

    expect(avgDuration).toBeLessThan(100) // Average should be under 100ms per validation
  })
})
```

## Error Handling and Debugging

### Comprehensive Error Types

```typescript
const result = await userValidationRules.validateAll(userData)

result.match({
  Ok: validatedUser => {
    console.log('All validations passed:', validatedUser.email)
  },
  Err: errors => {
    // Handle different types of validation errors
    errors.forEach(error => {
      switch (error.code) {
        case 'MINIMUM_AGE_REQUIRED':
          console.log(`Age validation failed: ${error.userMessage}`)
          console.log(`User provided age: ${error.context?.providedAge}`)
          break

        case 'DUPLICATE_EMAIL':
          console.log(`Email validation failed: ${error.userMessage}`)
          console.log(`Suggested alternatives: ${error.context?.suggestions}`)
          break

        case 'NETWORK_ERROR':
          console.log(`External validation failed: ${error.userMessage}`)
          console.log(`Retry recommended: ${error.context?.retryable}`)
          break

        case 'CREDIT_LIMIT_EXCEEDED':
          console.log(`Credit validation failed: ${error.userMessage}`)
          console.log(`Available credit: $${error.context?.availableCredit}`)
          console.log(`Requested amount: $${error.context?.requestedAmount}`)
          break

        case 'BUSINESS_RULE_ERROR':
          console.log(`Business rule violation: ${error.userMessage}`)
          console.log(`Rule: ${error.ruleName}`)
          console.log(`Field: ${error.field}`)
          console.log(`Context: ${JSON.stringify(error.context, null, 2)}`)
          break

        default:
          console.log(`Unknown validation error: ${error.userMessage}`)
          console.log(`Error details:`, {
            rule: error.ruleName,
            code: error.code,
            field: error.field,
            context: error.context,
          })
      }
    })
  },
})
```

### Rule Debugging and Tracing

```typescript
// Enable detailed rule tracing
const debugUserRules = rules('debug-user-validation', {
  nameRequired: rule<User>('name-required')
    .require(user => {
      console.log(`Checking name requirement for: ${user.name}`)
      const isValid = user.name.trim().length > 0
      console.log(`Name validation result: ${isValid}`)
      return isValid
    })
    .message('Name is required')
    .trace('name-validation'),

  emailFormat: rule<User>('email-format')
    .require(user => {
      console.log(`Checking email format for: ${user.email}`)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const isValid = emailRegex.test(user.email)
      console.log(`Email format validation result: ${isValid}`)
      return isValid
    })
    .message('Valid email required')
    .trace('email-validation'),

  asyncEmailCheck: rule<User>('async-email-check')
    .async(async user => {
      console.log(`Starting async email check for: ${user.email}`)
      const startTime = Date.now()

      try {
        const result = await UserAPI.checkEmail.run({ email: user.email })
        const duration = Date.now() - startTime
        console.log(`Async email check completed in ${duration}ms`)

        return result.match({
          Ok: response => {
            console.log(`Email availability: ${response.available}`)
            return response.available ? Result.Ok(true) : Result.Err('Email taken')
          },
          Err: error => {
            console.log(`Email check API error: ${error.message}`)
            return Result.Err('Email check failed')
          },
        })
      } catch (error) {
        const duration = Date.now() - startTime
        console.log(`Async email check failed after ${duration}ms: ${error.message}`)
        return Result.Err(`Email check exception: ${error.message}`)
      }
    })
    .message('Email verification failed')
    .trace('async-email-check'),
})

// Rule performance monitoring
const performanceMonitoredRule = rule<User>('monitored-rule')
  .require(user => {
    const startTime = performance.now()
    const result = complexValidationLogic(user)
    const endTime = performance.now()

    console.log(`Rule execution time: ${endTime - startTime}ms`)
    if (endTime - startTime > 100) {
      console.warn(`Slow rule execution detected: ${endTime - startTime}ms`)
    }

    return result
  })
  .message('Complex validation failed')
```

### Error Recovery and Fallbacks

```typescript
// Rules with graceful degradation
const resilientEmailRule = rule<User>('resilient-email-check')
  .async(async user => {
    try {
      // Primary email validation service
      const primaryResult = await PrimaryEmailAPI.check.run({ email: user.email })
      return primaryResult.match({
        Ok: result => (result.valid ? Result.Ok(true) : Result.Err('Invalid email')),
        Err: () => {
          // Fall back to secondary service
          console.log('Primary email service failed, trying secondary')
          return attemptSecondaryEmailValidation(user.email)
        },
      })
    } catch (error) {
      console.log('All email services failed, using basic regex validation')
      // Fallback to basic regex validation
      const basicValidation = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)
      return basicValidation ? Result.Ok(true) : Result.Err('Invalid email format')
    }
  })
  .message('Email validation failed')
  .code('EMAIL_VALIDATION_ERROR')
  .context({
    fallbackUsed: true,
    primaryServiceUnavailable: true,
  })

async function attemptSecondaryEmailValidation(email: string): Promise<Result<string, boolean>> {
  try {
    const secondaryResult = await SecondaryEmailAPI.validate.run({ email })
    return secondaryResult.match({
      Ok: result => (result.isValid ? Result.Ok(true) : Result.Err('Invalid email')),
      Err: error => Result.Err(`Secondary validation failed: ${error.message}`),
    })
  } catch (error) {
    return Result.Err(`Secondary service error: ${error.message}`)
  }
}
```

## Real-World Examples

### E-commerce Order Validation

```typescript
const OrderSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  customerId: nativeSchema.string().uuid(),
  items: nativeSchema.array(
    nativeSchema.object({
      productId: nativeSchema.string(),
      name: nativeSchema.string(),
      quantity: nativeSchema.number().positive(),
      price: nativeSchema.number().positive(),
    })
  ),
  shippingAddress: nativeSchema.object({
    street: nativeSchema.string(),
    city: nativeSchema.string(),
    state: nativeSchema.string(),
    zipCode: nativeSchema.string(),
    country: nativeSchema.string(),
  }),
  paymentMethod: nativeSchema.enum(['credit', 'debit', 'paypal'] as const),
  total: nativeSchema.number().positive(),
  priority: nativeSchema.enum(['standard', 'urgent'] as const),
})

type Order = typeof OrderSchema.infer

const ecommerceOrderRules = rules('ecommerce-order-validation', {
  minimumOrderValue: rule<Order>('minimum-order-value')
    .require(order => order.total >= 25.0)
    .message('Minimum order value is $25.00')
    .code('ORDER_MINIMUM_NOT_MET')
    .field('total'),

  maximumItemQuantity: rule<Order>('maximum-item-quantity')
    .require(order => order.items.every(item => item.quantity <= 100))
    .message('Maximum quantity per item is 100')
    .code('QUANTITY_LIMIT_EXCEEDED')
    .field('items'),

  inventoryValidation: rule<Order>('inventory-validation')
    .async(async order => {
      const inventoryChecks = await Promise.all(
        order.items.map(async item => {
          const stockResult = await InventoryAPI.check.run({
            productId: item.productId,
            quantity: item.quantity,
          })
          return stockResult.match({
            Ok: stock => ({
              item,
              available: stock.quantity >= item.quantity,
              shortage: Math.max(0, item.quantity - stock.quantity),
            }),
            Err: () => ({ item, available: false, shortage: item.quantity }),
          })
        })
      )

      const unavailableItems = inventoryChecks.filter(check => !check.available)

      if (unavailableItems.length > 0) {
        const itemNames = unavailableItems
          .map(check => `${check.item.name} (need ${check.shortage} more)`)
          .join(', ')
        return Result.Err(`Insufficient inventory for: ${itemNames}`)
      }

      return Result.Ok(true)
    })
    .message('Some items are out of stock')
    .code('INVENTORY_INSUFFICIENT'),

  shippingRestrictions: rule<Order>('shipping-restrictions')
    .async(async order => {
      const restrictionCheck = await ShippingAPI.validateAddress.run({
        address: order.shippingAddress,
        items: order.items.map(item => item.productId),
      })

      return restrictionCheck.match({
        Ok: result =>
          result.canShip
            ? Result.Ok(true)
            : Result.Err(`Cannot ship to ${order.shippingAddress.country}: ${result.reason}`),
        Err: error => Result.Err(`Shipping validation failed: ${error.message}`),
      })
    })
    .message('Shipping not available for this address')
    .code('SHIPPING_RESTRICTED'),

  paymentValidation: rule<Order>('payment-validation')
    .async(async order => {
      if (order.paymentMethod === 'credit') {
        const creditCheck = await PaymentAPI.validateCredit.run({
          customerId: order.customerId,
          amount: order.total,
        })

        return creditCheck.match({
          Ok: result =>
            result.approved
              ? Result.Ok(true)
              : Result.Err(`Credit limit exceeded by $${result.overage}`),
          Err: error => Result.Err(`Credit validation failed: ${error.message}`),
        })
      }

      // Other payment methods validated elsewhere
      return Result.Ok(true)
    })
    .message('Payment validation failed')
    .code('PAYMENT_VALIDATION_FAILED'),

  urgentOrderRestrictions: rule<Order>('urgent-order-restrictions')
    .when(order => order.priority === 'urgent')
    .require(order => {
      const now = new Date()
      const hour = now.getHours()
      const day = now.getDay()

      // Business hours: Monday-Friday, 8 AM - 6 PM
      const isBusinessHours = day >= 1 && day <= 5 && hour >= 8 && hour <= 18

      // Urgent orders require higher minimum value during business hours
      if (isBusinessHours) {
        return order.total >= 100.0
      }

      // No urgent orders outside business hours
      return false
    })
    .message('Urgent orders require minimum $100 during business hours only')
    .code('URGENT_ORDER_RESTRICTIONS'),

  fraudDetection: rule<Order>('fraud-detection')
    .async(async order => {
      const fraudScore = await FraudAPI.analyzeOrder.run({
        customerId: order.customerId,
        orderValue: order.total,
        shippingAddress: order.shippingAddress,
        items: order.items,
      })

      return fraudScore.match({
        Ok: analysis =>
          analysis.riskScore < 75
            ? Result.Ok(true)
            : Result.Err(`High fraud risk detected (score: ${analysis.riskScore})`),
        Err: error => Result.Err(`Fraud detection failed: ${error.message}`),
      })
    })
    .message('Order flagged for potential fraud')
    .code('FRAUD_RISK_HIGH'),
})
```

### Financial Transaction Validation

```typescript
const TransactionSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  accountId: nativeSchema.string().uuid(),
  type: nativeSchema.enum(['deposit', 'withdrawal', 'transfer'] as const),
  amount: nativeSchema.number().positive(),
  currency: nativeSchema.string().length(3),
  destinationAccountId: nativeSchema.string().uuid().optional(),
  description: nativeSchema.string(),
  requestedAt: nativeSchema.string().datetime(),
})

type Transaction = typeof TransactionSchema.infer

const financialTransactionRules = rules('financial-transaction-validation', {
  accountExists: rule<Transaction>('account-exists')
    .async(async transaction => {
      const accountResult = await AccountAPI.get.run({ id: transaction.accountId })
      return accountResult.match({
        Ok: account =>
          account.status === 'active'
            ? Result.Ok(true)
            : Result.Err(`Account is ${account.status}`),
        Err: () => Result.Err('Account not found'),
      })
    })
    .message('Source account is invalid or inactive')
    .code('INVALID_ACCOUNT'),

  sufficientBalance: rule<Transaction>('sufficient-balance')
    .when(transaction => transaction.type === 'withdrawal' || transaction.type === 'transfer')
    .async(async transaction => {
      const balanceResult = await AccountAPI.getBalance.run({
        accountId: transaction.accountId,
        currency: transaction.currency,
      })

      return balanceResult.match({
        Ok: balance =>
          balance.available >= transaction.amount
            ? Result.Ok(true)
            : Result.Err(
                `Insufficient funds: available $${balance.available}, requested $${transaction.amount}`
              ),
        Err: error => Result.Err(`Balance check failed: ${error.message}`),
      })
    })
    .message('Insufficient account balance')
    .code('INSUFFICIENT_FUNDS'),

  dailyLimits: rule<Transaction>('daily-limits')
    .async(async transaction => {
      const limitsResult = await AccountAPI.getDailyLimits.run({
        accountId: transaction.accountId,
      })

      return limitsResult.match({
        Ok: async limits => {
          const todayTransactionsResult = await TransactionAPI.getTodayTotal.run({
            accountId: transaction.accountId,
            type: transaction.type,
          })

          return todayTransactionsResult.match({
            Ok: todayTotal => {
              const newTotal = todayTotal + transaction.amount
              const dailyLimit = limits[transaction.type] || Infinity

              return newTotal <= dailyLimit
                ? Result.Ok(true)
                : Result.Err(
                    `Daily ${transaction.type} limit exceeded: $${newTotal} > $${dailyLimit}`
                  )
            },
            Err: error => Result.Err(`Daily limit check failed: ${error.message}`),
          })
        },
        Err: error => Result.Err(`Limits check failed: ${error.message}`),
      })
    })
    .message('Daily transaction limit exceeded')
    .code('DAILY_LIMIT_EXCEEDED'),

  transferValidation: rule<Transaction>('transfer-validation')
    .when(transaction => transaction.type === 'transfer')
    .require(transaction => transaction.destinationAccountId !== undefined)
    .async(async transaction => {
      if (!transaction.destinationAccountId) {
        return Result.Err('Destination account required for transfers')
      }

      // Check destination account exists and is active
      const destAccountResult = await AccountAPI.get.run({
        id: transaction.destinationAccountId,
      })

      return destAccountResult.match({
        Ok: account =>
          account.status === 'active' && account.canReceiveTransfers
            ? Result.Ok(true)
            : Result.Err(
                `Destination account cannot receive transfers (status: ${account.status})`
              ),
        Err: () => Result.Err('Destination account not found'),
      })
    })
    .message('Invalid destination account for transfer')
    .code('INVALID_DESTINATION_ACCOUNT'),

  fraudMonitoring: rule<Transaction>('fraud-monitoring')
    .async(async transaction => {
      const fraudAnalysis = await FraudAPI.analyzeTransaction.run({
        accountId: transaction.accountId,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        timestamp: transaction.requestedAt,
      })

      return fraudAnalysis.match({
        Ok: analysis => {
          if (analysis.riskLevel === 'high') {
            return Result.Err(`High fraud risk: ${analysis.reasons.join(', ')}`)
          }
          if (analysis.riskLevel === 'medium' && transaction.amount > 10000) {
            return Result.Err('Medium fraud risk for large transaction requires manual review')
          }
          return Result.Ok(true)
        },
        Err: error => Result.Err(`Fraud analysis failed: ${error.message}`),
      })
    })
    .message('Transaction flagged by fraud monitoring')
    .code('FRAUD_DETECTED'),

  complianceCheck: rule<Transaction>('compliance-check')
    .when(transaction => transaction.amount > 10000) // Large transactions
    .async(async transaction => {
      const complianceResult = await ComplianceAPI.checkTransaction.run({
        accountId: transaction.accountId,
        amount: transaction.amount,
        currency: transaction.currency,
        type: transaction.type,
        destinationAccountId: transaction.destinationAccountId,
      })

      return complianceResult.match({
        Ok: compliance =>
          compliance.approved
            ? Result.Ok(true)
            : Result.Err(`Compliance check failed: ${compliance.reason}`),
        Err: error => Result.Err(`Compliance verification failed: ${error.message}`),
      })
    })
    .message('Transaction requires compliance approval')
    .code('COMPLIANCE_APPROVAL_REQUIRED'),

  businessHoursRestriction: rule<Transaction>('business-hours-restriction')
    .when(transaction => transaction.amount > 50000) // Very large transactions
    .require(() => {
      const now = new Date()
      const hour = now.getHours()
      const day = now.getDay()

      // Large transactions only during business hours: Monday-Friday, 9 AM - 5 PM
      return day >= 1 && day <= 5 && hour >= 9 && hour <= 17
    })
    .message('Large transactions ($50,000+) only allowed during business hours')
    .code('OUTSIDE_BUSINESS_HOURS'),
})
```

## Best Practices

### Rule Design Principles

```typescript
// ✅ Good: Descriptive rule names and clear purpose
const userAccountRules = rules('user-account-validation', {
  emailFormat: rule<User>('email-format-validation')
    .require(user => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email))
    .message('Please enter a valid email address')
    .code('INVALID_EMAIL_FORMAT')
    .field('email'),

  passwordStrength: rule<User>('password-strength-validation')
    .require(user => {
      const password = (user as any).password // Assuming password in context
      return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password)
      )
    })
    .message('Password must be at least 8 characters with uppercase, lowercase, and numbers')
    .code('WEAK_PASSWORD')
    .field('password'),
})

// ❌ Avoid: Generic names and unclear purpose
const badRules = rules('validation', {
  rule1: rule<User>('check1')
    .require(user => user.email.includes('@'))
    .message('Error'),

  rule2: rule<User>('check2')
    .require(user => user.age > 0)
    .message('Bad age'),
})
```

### Error Message Guidelines

```typescript
// ✅ Good: Clear, actionable error messages
const goodErrorMessages = rules('good-messages', {
  ageRequirement: rule<User>('age-requirement')
    .require(user => user.age >= 18)
    .message('You must be 18 years or older to create an account')
    .code('MINIMUM_AGE_REQUIRED'),

  emailUniqueness: rule<User>('email-uniqueness')
    .async(async user => checkEmailAvailability(user.email))
    .message(
      'This email address is already registered. Please use a different email or sign in to your existing account.'
    )
    .code('EMAIL_ALREADY_EXISTS'),

  passwordComplexity: rule<User>('password-complexity')
    .require(user => validatePasswordStrength((user as any).password))
    .message(
      'Password must contain at least 8 characters including uppercase letters, lowercase letters, and numbers'
    )
    .code('PASSWORD_TOO_WEAK'),
})

// ❌ Avoid: Vague or technical error messages
const badErrorMessages = rules('bad-messages', {
  ageCheck: rule<User>('age-check')
    .require(user => user.age >= 18)
    .message('Invalid age'), // Too vague

  emailCheck: rule<User>('email-check')
    .async(async user => checkEmailAvailability(user.email))
    .message('Email validation error occurred'), // Not actionable

  passwordCheck: rule<User>('password-check')
    .require(user => validatePasswordStrength((user as any).password))
    .message('RegExp failed: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/'), // Too technical
})
```

### Performance Optimization

```typescript
// ✅ Good: Efficient async rule execution
const optimizedRules = rules('optimized-validation', {
  // Cache expensive external validations
  cachedEmailCheck: rule<User>('cached-email-check').async(async user => {
    const cacheKey = `email:${user.email}`
    const cached = await ruleCache.get(cacheKey)

    if (cached !== null) {
      return cached ? Result.Ok(true) : Result.Err('Email not available')
    }

    const result = await UserAPI.checkEmail.run({ email: user.email })
    const isAvailable = result.match({
      Ok: response => response.available,
      Err: () => false,
    })

    await ruleCache.set(cacheKey, isAvailable, 300) // Cache for 5 minutes
    return isAvailable ? Result.Ok(true) : Result.Err('Email not available')
  }),

  // Batch related validations
  batchedAccountValidation: rule<User>('batched-account-validation').async(async user => {
    // Run multiple checks in parallel
    const [emailCheck, creditCheck, complianceCheck] = await Promise.all([
      UserAPI.checkEmail.run({ email: user.email }),
      CreditAPI.checkScore.run({ userId: user.id }),
      ComplianceAPI.checkUser.run({ userId: user.id }),
    ])

    const results = {
      email: emailCheck.match({ Ok: r => r.available, Err: () => false }),
      credit: creditCheck.match({ Ok: r => r.score >= 650, Err: () => false }),
      compliance: complianceCheck.match({ Ok: r => r.approved, Err: () => false }),
    }

    const failures = Object.entries(results)
      .filter(([_, passed]) => !passed)
      .map(([check]) => check)

    return failures.length === 0
      ? Result.Ok(true)
      : Result.Err(`Failed checks: ${failures.join(', ')}`)
  }),

  // Use early returns for performance
  efficientComplexRule: rule<User>('efficient-complex-rule').require(user => {
    // Check lightweight conditions first
    if (!user.isActive) return false
    if (!user.email.includes('@')) return false
    if (user.age < 18) return false

    // Only do expensive checks if basics pass
    return performExpensiveValidation(user)
  }),
})

// ❌ Avoid: Inefficient rule execution
const inefficientRules = rules('inefficient-validation', {
  // Multiple separate async calls
  separateAsyncCalls: rule<User>('separate-calls').async(async user => {
    const emailResult = await UserAPI.checkEmail.run({ email: user.email })
    if (emailResult.tag === 'Err') return Result.Err('Email check failed')

    const creditResult = await CreditAPI.checkScore.run({ userId: user.id })
    if (creditResult.tag === 'Err') return Result.Err('Credit check failed')

    const complianceResult = await ComplianceAPI.checkUser.run({ userId: user.id })
    if (complianceResult.tag === 'Err') return Result.Err('Compliance check failed')

    return Result.Ok(true)
  }),

  // Expensive operations first
  expensiveFirst: rule<User>('expensive-first').require(user => {
    // Expensive operation done even if basics fail
    const expensiveResult = performExpensiveValidation(user)

    // Basic checks that could eliminate need for expensive operation
    return expensiveResult && user.isActive && user.age >= 18
  }),
})
```

### Rule Organization and Composition

```typescript
// ✅ Good: Logical rule grouping and composition
const createUserValidationSuite = () => {
  // Basic field validation rules
  const fieldValidationRules = rules('field-validation', {
    nameRequired: rule<User>('name-required')
      .require(user => user.name.trim().length > 0)
      .message('Name is required')
      .code('NAME_REQUIRED'),

    emailFormat: rule<User>('email-format')
      .require(user => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email))
      .message('Please enter a valid email address')
      .code('INVALID_EMAIL_FORMAT'),

    ageValid: rule<User>('age-valid')
      .require(user => user.age >= 13 && user.age <= 120)
      .message('Age must be between 13 and 120')
      .code('INVALID_AGE'),
  })

  // Business logic rules
  const businessRules = rules('business-logic', {
    ageRequirement: rule<User>('age-requirement')
      .require(user => user.age >= 18)
      .message('Must be 18 or older to register')
      .code('MINIMUM_AGE_REQUIRED'),

    countryRestrictions: rule<User>('country-restrictions')
      .require(user => !RESTRICTED_COUNTRIES.includes(user.country))
      .message('Service not available in your country')
      .code('COUNTRY_RESTRICTED'),
  })

  // External validation rules
  const externalRules = rules('external-validation', {
    emailUniqueness: rule<User>('email-uniqueness')
      .async(async user => {
        const result = await UserAPI.checkEmail.run({ email: user.email })
        return result.match({
          Ok: response => (response.available ? Result.Ok(true) : Result.Err('Email exists')),
          Err: () => Result.Err('Email check failed'),
        })
      })
      .message('Email address is already registered')
      .code('EMAIL_EXISTS'),
  })

  return {
    fieldValidation: fieldValidationRules,
    businessLogic: businessRules,
    externalValidation: externalRules,
  }
}

// Use composed validation suite
const userValidationSuite = createUserValidationSuite()

// Validate in stages for better performance and user experience
const validateUserRegistration = async (user: User) => {
  // Stage 1: Quick field validation
  const fieldResult = await userValidationSuite.fieldValidation.validateAll(user)
  if (fieldResult.tag === 'Err') {
    return fieldResult // Return early if basic validation fails
  }

  // Stage 2: Business logic validation
  const businessResult = await userValidationSuite.businessLogic.validateAll(user)
  if (businessResult.tag === 'Err') {
    return businessResult
  }

  // Stage 3: External validation (only if previous stages pass)
  const externalResult = await userValidationSuite.externalValidation.validateAll(user)
  return externalResult
}
```

The Business Rules API provides powerful declarative validation capabilities that integrate seamlessly with Kairo's Three-Pillar Architecture, enabling you to build maintainable, type-safe business logic with predictable error handling and excellent performance.
