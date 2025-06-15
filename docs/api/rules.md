# Business Rules Engine

The Business Rules Engine provides a declarative way to define, compose, and execute validation rules across your application. It centralizes business logic in reusable, testable components.

## Overview

Business rules allow you to:

- Define validation logic declaratively
- Compose conditional and async validations
- Integrate seamlessly with pipelines and resources
- Provide rich error context and user-friendly messages
- Reuse rules across different parts of your application

## Core Concepts

### Rule

A `Rule` represents a single validation constraint with support for:

- **Conditional execution** with `.when()`
- **Synchronous validation** with `.require()`
- **Asynchronous validation** with `.async()`
- **Rich error context** with `.message()`, `.code()`, and `.field()`

### Rules Collection

A `Rules` collection manages multiple related rules and provides:

- **Batch validation** with `.validateAll()`
- **Selective validation** with `.validate(ruleNames)`
- **Individual rule access** with `.getRule(name)`

## Basic Usage

### Creating Rules

```typescript
import { rule, commonRules } from 'kairo'

// Basic rule
const ageRule = rule<User>('age-requirement')
  .require(user => user.age >= 18)
  .message('Must be 18 or older')
  .code('AGE_REQUIREMENT')
  .field('age')

// Conditional rule
const usAgeRule = rule<User>('us-age-requirement')
  .when(user => user.country === 'US')
  .require(user => user.age >= 21)
  .message('Must be 21+ in US')
  .code('US_AGE_REQUIREMENT')

// Async rule
const emailUniquenessRule = rule<User>('email-uniqueness')
  .async(async user => {
    const exists = await checkEmailExists(user.email)
    return exists ? Result.Err('Email taken') : Result.Ok(true)
  })
  .message('Email already in use')
  .code('EMAIL_TAKEN')
```

### Using Common Rules

```typescript
// Pre-built validation rules
const userRules = rules('user-validation', {
  nameRequired: commonRules.required<User>('name'),
  emailFormat: commonRules.email<User>('email'),
  ageRange: commonRules.range<User>('age', 13, 120),
  passwordLength: commonRules.minLength<User>('password', 8),

  // Custom rule
  strongPassword: commonRules.custom<User>(
    'strong-password',
    user => /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/.test(user.password),
    'Password must contain uppercase, lowercase, and numbers',
    'WEAK_PASSWORD'
  ),
})
```

### Validation

```typescript
// Validate all rules
const result = await userRules.validateAll(userData)
if (result.tag === 'Err') {
  console.log('Validation errors:', result.error)
}

// Validate specific rules
const emailResult = await userRules.validate(userData, ['emailFormat', 'emailUniqueness'])

// Validate single rule
const ageResult = await userRules.validateRule(userData, 'ageRange')
```

## Pipeline Integration

Business rules integrate seamlessly with Kairo pipelines:

```typescript
import { pipeline } from 'kairo'

const userValidationPipeline = pipeline('user-validation')
  .input(UserSchema)
  .validateRule(ageRule) // Single rule
  .validateRules(userRules, ['required']) // Specific rules
  .validateAllRules(userRules) // All rules
  .map(user => ({ ...user, validated: true }))

const result = await userValidationPipeline.run(userData)
```

## Advanced Features

### Context-Aware Validation

Rules can access validation context for dynamic behavior:

```typescript
const adminRule = rule<User>('admin-access')
  .require((user, context) => {
    const isAdmin = context?.isAdmin as boolean
    return isAdmin || user.role === 'admin'
  })
  .message('Admin access required')

// Use with context
const result = await adminRule.validate(user, { isAdmin: true })
```

### Async External Validation

Rules can perform async operations like API calls:

```typescript
const uniqueEmailRule = rule<User>('unique-email')
  .async(async user => {
    const response = await fetch(`/api/users/check-email`, {
      method: 'POST',
      body: JSON.stringify({ email: user.email }),
    })
    const { exists } = await response.json()
    return exists ? Result.Err('Email exists') : Result.Ok(true)
  })
  .message('Email address is already registered')
  .code('DUPLICATE_EMAIL')
  .field('email')
```

### Rule Composition

Create reusable rule factories:

```typescript
const createCountryRules = (country: string, minAge: number) => {
  return rules(`${country}-rules`, {
    ageRequirement: rule<User>(`${country}-age`)
      .when(user => user.country === country)
      .require(user => user.age >= minAge)
      .message(`Must be ${minAge}+ in ${country}`),

    localCompliance: rule<User>(`${country}-compliance`)
      .when(user => user.country === country)
      .async(async user => checkLocalCompliance(user, country))
      .message(`Compliance check failed for ${country}`),
  })
}

const usRules = createCountryRules('US', 21)
const ukRules = createCountryRules('UK', 18)
```

## Error Handling

### BusinessRuleError

Rule validation errors provide rich context:

```typescript
interface BusinessRuleError extends KairoError {
  code: 'BUSINESS_RULE_ERROR'
  ruleName: string // Rule that failed
  field?: string // Field being validated
  userMessage: string // User-friendly message
  context: Record<string, unknown> // Additional context
}
```

### Multiple Error Handling

When validating multiple rules, errors are collected:

```typescript
const result = await userRules.validateAll(userData)
if (result.tag === 'Err') {
  result.error.forEach(error => {
    console.log(`${error.field}: ${error.userMessage}`)
  })
}
```

## Resource Integration

Combine rules with resource operations:

```typescript
const UserAPI = resource('users', {
  create: {
    method: 'POST',
    path: '/users',
    body: CreateUserSchema,
    response: UserSchema,
  },
})

const createUserWorkflow = pipeline('create-user')
  .input(CreateUserSchema)
  .validateAllRules(userValidationRules)
  .pipeline(UserAPI.create) // Call API after validation
  .map(user => ({ ...user, status: 'created' }))
```

## Best Practices

### 1. Rule Organization

```typescript
// Group related rules
const userAccountRules = rules('user-account', {
  emailFormat: commonRules.email<User>('email'),
  emailUnique: emailUniquenessRule,
  passwordStrength: passwordRule,
})

const userProfileRules = rules('user-profile', {
  nameRequired: commonRules.required<User>('name'),
  ageValid: commonRules.range<User>('age', 13, 120),
  bioLength: commonRules.maxLength<User>('bio', 500),
})
```

### 2. Error Messages

Provide clear, actionable error messages:

```typescript
const passwordRule = rule<User>('password-strength')
  .require(user => {
    const { password } = user
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password)
    )
  })
  .message('Password must be at least 8 characters with uppercase, lowercase, and numbers')
  .code('WEAK_PASSWORD')
  .field('password')
```

### 3. Async Rule Performance

Keep async rules efficient:

```typescript
// Cache expensive validations
const emailCache = new Map()

const cachedEmailRule = rule<User>('cached-email-check').async(async user => {
  if (emailCache.has(user.email)) {
    return emailCache.get(user.email)
  }

  const result = await checkEmailExists(user.email)
  emailCache.set(user.email, result)
  return result
})
```

### 4. Rule Testing

Test rules in isolation:

```typescript
describe('User Validation Rules', () => {
  it('should validate age requirement', async () => {
    const validUser = { age: 25, country: 'US' }
    const invalidUser = { age: 16, country: 'US' }

    const result1 = await ageRule.validate(validUser)
    expect(result1.tag).toBe('Ok')

    const result2 = await ageRule.validate(invalidUser)
    expect(result2.tag).toBe('Err')
  })
})
```

## API Reference

### Rule Interface

```typescript
interface Rule<T> {
  readonly name: string
  when(condition: RuleCondition<T>): Rule<T>
  require(validation: RuleValidation<T>): Rule<T>
  async(asyncValidation: AsyncRuleValidation<T>): Rule<T>
  message(text: string): Rule<T>
  code(errorCode: string): Rule<T>
  field(fieldName: string): Rule<T>
  context(contextData: Record<string, unknown>): Rule<T>
  validate(data: T, context?: RuleValidationContext): Promise<Result<BusinessRuleError, T>>
}
```

### Rules Interface

```typescript
interface Rules<T> {
  readonly name: string
  readonly rules: Record<string, Rule<T>>
  validate(
    data: T,
    ruleNames?: string[],
    context?: RuleValidationContext
  ): Promise<Result<BusinessRuleError[], T>>
  validateAll(data: T, context?: RuleValidationContext): Promise<Result<BusinessRuleError[], T>>
  validateRule(
    data: T,
    ruleName: string,
    context?: RuleValidationContext
  ): Promise<Result<BusinessRuleError, T>>
  getRule(name: string): Rule<T> | undefined
}
```

### Common Rules

```typescript
const commonRules = {
  required<T>(field: keyof T, message?: string): Rule<T>
  minLength<T>(field: keyof T, minLength: number, message?: string): Rule<T>
  maxLength<T>(field: keyof T, maxLength: number, message?: string): Rule<T>
  email<T>(field: keyof T, message?: string): Rule<T>
  range<T>(field: keyof T, min: number, max: number, message?: string): Rule<T>
  custom<T>(name: string, validation: RuleValidation<T>, message: string, code?: string): Rule<T>
}
```

### Pipeline Methods

```typescript
interface Pipeline<Input, Output> {
  validateRule<T>(rule: Rule<T>, context?: RuleValidationContext): Pipeline<Input, T>
  validateRules<T>(
    rules: Rules<T>,
    ruleNames?: string[],
    context?: RuleValidationContext
  ): Pipeline<Input, T>
  validateAllRules<T>(rules: Rules<T>, context?: RuleValidationContext): Pipeline<Input, T>
}
```

## Related

- [Pipeline API](./pipeline.md) - Pipeline system integration
- [Resource API](./resource.md) - Resource workflow integration
- [Schema API](./schema.md) - Data validation with schemas
- [Result API](./result.md) - Error handling patterns
