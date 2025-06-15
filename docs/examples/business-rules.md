# Business Rules Examples

This guide demonstrates how to use Kairo's Business Rules Engine to centralize validation logic in your applications.

## Basic Rule Definition

Start with simple validation rules:

```typescript
import { rule, rules, commonRules } from 'kairo'

interface User {
  id: string
  name: string
  email: string
  age: number
  country?: string
}

// Individual rule
const ageRule = rule<User>('age-requirement')
  .require(user => user.age >= 18)
  .message('Must be 18 or older')
  .code('AGE_REQUIREMENT')
  .field('age')

// Using common rules
const userRules = rules('user-validation', {
  nameRequired: commonRules.required<User>('name'),
  emailFormat: commonRules.email<User>('email'),
  ageValid: commonRules.range<User>('age', 13, 120),
})

// Validate user data
const userData = { id: '1', name: 'John', email: 'john@example.com', age: 25 }
const result = await userRules.validateAll(userData)

if (result.tag === 'Err') {
  console.log('Validation errors:', result.error)
}
```

## Conditional Rules

Create rules that apply conditionally:

```typescript
// Rule that only applies to US users
const usAgeRule = rule<User>('us-age-requirement')
  .when(user => user.country === 'US')
  .require(user => user.age >= 21)
  .message('Users in the US must be 21 or older')
  .code('US_AGE_REQUIREMENT')
  .field('age')

// Context-aware rule
const adminRule = rule<User>('admin-access')
  .require((user, context) => {
    const isAdmin = context?.isAdmin as boolean
    return isAdmin || user.role === 'admin'
  })
  .message('Admin access required')

// Validate with context
const result = await adminRule.validate(user, { isAdmin: true })
```

## Async Rules

Perform external validations:

```typescript
// Check if email is already registered
const emailUniquenessRule = rule<User>('email-uniqueness')
  .async(async user => {
    const response = await fetch('/api/users/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    })

    const { exists } = await response.json()
    return exists ? Result.Err('Email taken') : Result.Ok(true)
  })
  .message('Email address is already registered')
  .code('DUPLICATE_EMAIL')
  .field('email')

// Password strength check with external service
const passwordStrengthRule = rule<User>('password-strength')
  .async(async user => {
    const response = await fetch('/api/password/strength', {
      method: 'POST',
      body: JSON.stringify({ password: user.password }),
    })

    const { score, feedback } = await response.json()
    if (score < 4) {
      return Result.Err(`Weak password: ${feedback.join(', ')}`)
    }
    return Result.Ok(true)
  })
  .message('Password does not meet security requirements')
  .code('WEAK_PASSWORD')
```

## Pipeline Integration

Integrate rules with your data processing pipelines:

```typescript
import { pipeline, schema } from 'kairo'
import { z } from 'zod'

const CreateUserSchema = schema.from(
  z.object({
    name: z.string(),
    email: z.string().email(),
    age: z.number(),
    password: z.string(),
  })
)

// Create validation pipeline
const userValidationPipeline = pipeline('user-validation')
  .input(CreateUserSchema)
  .validateAllRules(userRules) // Apply all rules
  .validateRule(emailUniquenessRule) // Add async validation
  .map(user => ({ ...user, validated: true }))

// Use in your application
const createUser = async (userData: unknown) => {
  const result = await userValidationPipeline.run(userData)

  if (result.tag === 'Err') {
    throw new Error(`Validation failed: ${result.error}`)
  }

  return result.value
}
```

## Resource Workflow Integration

Combine rules with API resources:

```typescript
import { resource } from 'kairo'

const UserAPI = resource('users', {
  create: {
    method: 'POST',
    path: '/users',
    body: CreateUserSchema,
    response: UserSchema,
  },
})

// Complete user creation workflow
const createUserWorkflow = pipeline('create-user-workflow')
  .input(CreateUserSchema)
  .validateAllRules(userRules) // Validate business rules
  .validateRule(emailUniquenessRule) // Check email uniqueness
  .pipeline(UserAPI.create) // Create user via API
  .map(user => ({ ...user, status: 'created' }))

// Execute workflow
const newUser = await createUserWorkflow.run({
  name: 'Jane Doe',
  email: 'jane@example.com',
  age: 28,
  password: 'SecurePassword123!',
})
```

## Rule Composition and Reuse

Create reusable rule factories:

```typescript
// Country-specific rule factory
const createCountryRules = (country: string, minAge: number) => {
  return rules(`${country.toLowerCase()}-rules`, {
    ageRequirement: rule<User>(`${country}-age-requirement`)
      .when(user => user.country === country)
      .require(user => user.age >= minAge)
      .message(`Users in ${country} must be ${minAge} or older`)
      .code(`${country}_AGE_REQUIREMENT`)
      .field('age'),

    localCompliance: rule<User>(`${country}-compliance`)
      .when(user => user.country === country)
      .async(async user => {
        const compliant = await checkLocalCompliance(user, country)
        return compliant ? Result.Ok(true) : Result.Err('Non-compliant')
      })
      .message(`Does not meet ${country} compliance requirements`),
  })
}

// Create country-specific rule sets
const usRules = createCountryRules('US', 21)
const ukRules = createCountryRules('UK', 18)
const jpRules = createCountryRules('JP', 20)

// Use appropriate rules based on user's country
const validateUser = async (user: User) => {
  const countryRules =
    {
      US: usRules,
      UK: ukRules,
      JP: jpRules,
    }[user.country || 'US'] || usRules

  return await countryRules.validateAll(user)
}
```

## Error Handling Patterns

Handle validation errors effectively:

```typescript
// Multiple error handling
const result = await userRules.validateAll(userData)

if (result.tag === 'Err') {
  // Group errors by field
  const errorsByField = result.error.reduce(
    (acc, error) => {
      const field = error.field || 'general'
      acc[field] = acc[field] || []
      acc[field].push(error.userMessage)
      return acc
    },
    {} as Record<string, string[]>
  )

  console.log('Validation errors by field:', errorsByField)
}

// Custom error formatting
const formatValidationErrors = (errors: BusinessRuleError[]) => {
  return errors.map(error => ({
    field: error.field,
    message: error.userMessage,
    code: error.code,
    context: error.context,
  }))
}

// Selective validation
const criticalRules = ['nameRequired', 'emailFormat', 'emailUniqueness']
const criticalResult = await userRules.validate(userData, criticalRules)

if (criticalResult.tag === 'Err') {
  console.log('Critical validation failed - cannot proceed')
  return
}

// Continue with non-critical validation
const allResult = await userRules.validateAll(userData)
```

## Testing Rules

Test your business rules in isolation:

```typescript
import { describe, it, expect } from 'vitest'

describe('User Validation Rules', () => {
  it('should validate age requirement', async () => {
    const validUser = { id: '1', name: 'John', email: 'john@example.com', age: 25 }
    const invalidUser = { id: '2', name: 'Jane', email: 'jane@example.com', age: 16 }

    const validResult = await ageRule.validate(validUser)
    expect(validResult.tag).toBe('Ok')

    const invalidResult = await ageRule.validate(invalidUser)
    expect(invalidResult.tag).toBe('Err')
    expect(invalidResult.error.userMessage).toBe('Must be 18 or older')
  })

  it('should handle conditional rules', async () => {
    const usUser = { country: 'US', age: 20 }
    const nonUsUser = { country: 'CA', age: 20 }

    const usResult = await usAgeRule.validate(usUser)
    expect(usResult.tag).toBe('Err') // 20 < 21 for US

    const nonUsResult = await usAgeRule.validate(nonUsUser)
    expect(nonUsResult.tag).toBe('Ok') // Rule doesn't apply to non-US
  })

  it('should handle async validation', async () => {
    // Mock the external service
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ exists: false }),
    })

    const user = { email: 'new@example.com' }
    const result = await emailUniquenessRule.validate(user)

    expect(result.tag).toBe('Ok')
    expect(fetch).toHaveBeenCalledWith('/api/users/check-email', expect.any(Object))
  })
})
```

## Performance Optimization

Optimize rule execution for better performance:

```typescript
// Cache expensive async validations
const emailCache = new Map<string, boolean>()

const cachedEmailRule = rule<User>('cached-email-check')
  .async(async user => {
    if (emailCache.has(user.email)) {
      const exists = emailCache.get(user.email)!
      return exists ? Result.Err('Email taken') : Result.Ok(true)
    }

    const exists = await checkEmailExists(user.email)
    emailCache.set(user.email, exists)

    return exists ? Result.Err('Email taken') : Result.Ok(true)
  })
  .message('Email already registered')

// Parallel async rule execution
const parallelAsyncRules = rules('parallel-validation', {
  emailCheck: emailUniquenessRule,
  passwordStrength: passwordStrengthRule,
  complianceCheck: complianceRule,
})

// Rules will execute in parallel automatically
const result = await parallelAsyncRules.validateAll(userData)

// Early termination for critical rules
const validateWithEarlyExit = async (user: User) => {
  // Check critical rules first
  const criticalResult = await userRules.validate(user, ['emailFormat'])
  if (criticalResult.tag === 'Err') {
    return criticalResult // Exit early on critical failure
  }

  // Continue with full validation
  return await userRules.validateAll(user)
}
```

## Real-World Example

Here's a complete example of a user registration system:

```typescript
// Define comprehensive user validation rules
const registrationRules = rules('user-registration', {
  // Basic validation
  nameRequired: commonRules.required<User>('name', 'Name is required'),
  emailFormat: commonRules.email<User>('email', 'Please enter a valid email'),
  passwordLength: commonRules.minLength<User>(
    'password',
    8,
    'Password must be at least 8 characters'
  ),

  // Complex password validation
  passwordStrength: rule<User>('password-strength')
    .require(user => {
      const { password } = user
      return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)
    })
    .message('Password must contain lowercase, uppercase, number, and special character')
    .code('WEAK_PASSWORD')
    .field('password'),

  // Age verification with country-specific rules
  ageVerification: rule<User>('age-verification')
    .require((user, context) => {
      const minAge = user.country === 'US' ? 21 : 18
      return user.age >= minAge
    })
    .message('You must meet the minimum age requirement for your country')
    .code('AGE_REQUIREMENT'),

  // Async email uniqueness check
  emailUnique: rule<User>('email-unique')
    .async(async user => {
      const exists = await checkEmailExists(user.email)
      return exists ? Result.Err('Email taken') : Result.Ok(true)
    })
    .message('This email is already registered')
    .code('DUPLICATE_EMAIL')
    .field('email'),

  // Terms acceptance
  termsAccepted: rule<User>('terms-accepted')
    .require((user, context) => {
      return context?.termsAccepted === true
    })
    .message('You must accept the terms and conditions')
    .code('TERMS_NOT_ACCEPTED'),
})

// Registration pipeline
const userRegistrationPipeline = pipeline('user-registration')
  .input(CreateUserSchema)
  .validateAllRules(registrationRules, {
    termsAccepted: true,
    ipCountry: 'US',
  })
  .map(async user => {
    // Hash password
    const hashedPassword = await hashPassword(user.password)
    return { ...user, password: hashedPassword }
  })
  .pipeline(UserAPI.create)
  .map(user => ({
    ...user,
    registrationDate: new Date().toISOString(),
    status: 'active',
  }))

// Use in your application
export const registerUser = async (userData: CreateUserRequest) => {
  try {
    const result = await userRegistrationPipeline.run(userData)

    if (result.tag === 'Err') {
      return {
        success: false,
        errors: result.error.map(error => ({
          field: error.field,
          message: error.userMessage,
          code: error.code,
        })),
      }
    }

    return {
      success: true,
      user: result.value,
    }
  } catch (error) {
    return {
      success: false,
      errors: [{ message: 'Registration failed unexpectedly' }],
    }
  }
}
```

This comprehensive example shows how business rules can create a robust, maintainable user registration system with clear separation of concerns and excellent error handling.
