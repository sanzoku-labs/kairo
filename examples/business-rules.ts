import { z } from 'zod'
import { resource, schema, rule, rules, commonRules, pipeline } from '../src'

interface CreateUserRequest {
  name: string
  email: string
  age: number
  country?: string
  password: string
}

interface BusinessContext {
  isAdmin: boolean
  requestId: string
  ipCountry: string
}

// Schema definitions
const CreateUserSchema = schema.from(
  z.object({
    name: z.string().min(1),
    email: z.string().email(),
    age: z.number(),
    country: z.string().optional(),
    password: z.string(),
  })
)

const UserSchema = schema.from(
  z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    age: z.number(),
    country: z.string().optional(),
    membershipLevel: z.enum(['basic', 'premium', 'enterprise']).optional(),
  })
)

// Mock external services for async validation
const externalServices = {
  async checkEmailExists(email: string): Promise<boolean> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100))
    // Mock some existing emails
    const existingEmails = ['admin@example.com', 'test@example.com', 'existing@example.com']
    return existingEmails.includes(email)
  },

  async checkCountryRestrictions(country: string): Promise<boolean> {
    // Simulate checking if country is restricted
    await new Promise(resolve => setTimeout(resolve, 50))
    const restrictedCountries = ['XX', 'YY'] // Mock restricted countries
    return !restrictedCountries.includes(country)
  },

  async validatePasswordStrength(password: string): Promise<{ score: number; feedback: string[] }> {
    await new Promise(resolve => setTimeout(resolve, 75))

    let score = 0
    const feedback: string[] = []

    if (password.length >= 8) score += 1
    else feedback.push('Password should be at least 8 characters')

    if (/[A-Z]/.test(password)) score += 1
    else feedback.push('Password should contain uppercase letters')

    if (/[a-z]/.test(password)) score += 1
    else feedback.push('Password should contain lowercase letters')

    if (/[0-9]/.test(password)) score += 1
    else feedback.push('Password should contain numbers')

    if (/[^A-Za-z0-9]/.test(password)) score += 1
    else feedback.push('Password should contain special characters')

    return { score, feedback }
  },
}

// Example 1: Basic Business Rules
console.log('🔧 Basic Business Rules Examples\n')

const basicUserRules = rules('basic-user-validation', {
  // Required field validation
  nameRequired: commonRules.required<CreateUserRequest>('name', 'Name is required'),

  // Email format validation
  emailFormat: commonRules.email<CreateUserRequest>(
    'email',
    'Please provide a valid email address'
  ),

  // Age range validation
  ageRange: commonRules.range<CreateUserRequest>('age', 13, 120, 'Age must be between 13 and 120'),

  // Custom password strength rule
  passwordStrength: rule<CreateUserRequest>('password-strength')
    .require(user => {
      const password = user.password
      return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password)
      )
    })
    .message('Password must be 8+ characters with uppercase, lowercase, and numbers')
    .code('WEAK_PASSWORD')
    .field('password'),
})

async function demonstrateBasicRules() {
  console.log('📋 Basic Rule Validation:')

  const validUser: CreateUserRequest = {
    name: 'John Doe',
    email: 'john@example.com',
    age: 28,
    password: 'SecurePass123',
  }

  const invalidUser: CreateUserRequest = {
    name: '',
    email: 'invalid-email',
    age: 10,
    password: 'weak',
  }

  console.log('\n✅ Valid user:')
  const validResult = await basicUserRules.validateAll(validUser)
  if (validResult.tag === 'Ok') {
    console.log('   All validations passed!')
  }

  console.log('\n❌ Invalid user:')
  const invalidResult = await basicUserRules.validateAll(invalidUser)
  if (invalidResult.tag === 'Err') {
    console.log(`   Found ${invalidResult.error.length} validation errors:`)
    invalidResult.error.forEach(error => {
      console.log(`   - ${error.field || 'unknown'}: ${error.userMessage}`)
    })
  }
}

// Example 2: Conditional Business Rules
console.log('\n🎯 Conditional Business Rules Examples\n')

const conditionalUserRules = rules('conditional-user-validation', {
  // US users must be 21+
  usAgeRequirement: rule<CreateUserRequest>('us-age-requirement')
    .when(user => user.country === 'US')
    .require(user => user.age >= 21)
    .message('Users in the US must be 21 or older')
    .code('US_AGE_REQUIREMENT')
    .field('age'),

  // European users need GDPR consent context
  gdprConsent: rule<CreateUserRequest>('gdpr-consent')
    .when(user => ['DE', 'FR', 'IT', 'ES', 'NL'].includes(user.country || ''))
    .require((_user, context) => {
      // In real app, this would check for GDPR consent in context
      const hasGdprConsent = (context as unknown as BusinessContext & { gdprConsent?: boolean })
        ?.gdprConsent
      return hasGdprConsent === true
    })
    .message('GDPR consent is required for EU users')
    .code('GDPR_CONSENT_REQUIRED'),

  // Premium features require higher age
  premiumAgeCheck: rule<CreateUserRequest>('premium-age-check')
    .when((_user, context) => {
      const requestedLevel = (context as unknown as { membershipLevel?: string })?.membershipLevel
      return requestedLevel === 'premium' || requestedLevel === 'enterprise'
    })
    .require(user => user.age >= 18)
    .message('Premium memberships require age 18+')
    .code('PREMIUM_AGE_REQUIREMENT'),
})

async function demonstrateConditionalRules() {
  console.log('🎯 Conditional Rule Validation:')

  const usUser: CreateUserRequest = {
    name: 'John American',
    email: 'john@us.example.com',
    age: 20,
    country: 'US',
    password: 'SecurePass123',
  }

  const germanUser: CreateUserRequest = {
    name: 'Hans Mueller',
    email: 'hans@de.example.com',
    age: 25,
    country: 'DE',
    password: 'SecurePass123',
  }

  console.log('\n🇺🇸 US User (age 20):')
  const usResult = await conditionalUserRules.validateAll(usUser)
  if (usResult.tag === 'Err') {
    console.log(`   Failed: ${usResult.error[0]?.userMessage}`)
  } else {
    console.log('   Passed!')
  }

  console.log('\n🇩🇪 German User (without GDPR consent):')
  const germanResult = await conditionalUserRules.validateAll(germanUser, {
    isAdmin: false,
    requestId: '123',
    ipCountry: 'DE',
  })
  if (germanResult.tag === 'Err') {
    console.log(`   Failed: ${germanResult.error[0]?.userMessage}`)
  }

  console.log('\n🇩🇪 German User (with GDPR consent):')
  const germanWithConsentResult = await conditionalUserRules.validateAll(germanUser, {
    isAdmin: false,
    requestId: '123',
    ipCountry: 'DE',
    gdprConsent: true,
  })
  if (germanWithConsentResult.tag === 'Ok') {
    console.log('   Passed!')
  }
}

// Example 3: Async Business Rules
console.log('\n🌐 Async Business Rules Examples\n')

const asyncUserRules = rules('async-user-validation', {
  // Check if email is already taken
  emailUniqueness: rule<CreateUserRequest>('email-uniqueness')
    .async(async user => {
      const exists = await externalServices.checkEmailExists(user.email)
      if (exists) {
        return { tag: 'Err', error: { message: 'Email already exists' } }
      }
      return { tag: 'Ok', value: true }
    })
    .message('Email address is already taken')
    .code('EMAIL_TAKEN')
    .field('email'),

  // Check country restrictions
  countryAllowed: rule<CreateUserRequest>('country-allowed')
    .when(user => !!user.country)
    .async(async user => {
      const allowed = await externalServices.checkCountryRestrictions(user.country!)
      return {
        tag: allowed ? 'Ok' : 'Err',
        value: allowed,
        error: { message: 'Country restricted' },
      }
    })
    .message('Registration not available in your country')
    .code('COUNTRY_RESTRICTED')
    .field('country'),

  // Advanced password validation
  advancedPasswordCheck: rule<CreateUserRequest>('advanced-password')
    .async(async user => {
      const result = await externalServices.validatePasswordStrength(user.password)
      if (result.score < 4) {
        return {
          tag: 'Err',
          error: {
            message: `Password strength: ${result.score}/5. ${result.feedback.join(', ')}`,
          },
        }
      }
      return { tag: 'Ok', value: true }
    })
    .message('Password does not meet security requirements')
    .code('INSUFFICIENT_PASSWORD_STRENGTH')
    .field('password'),
})

async function demonstrateAsyncRules() {
  console.log('🌐 Async Rule Validation:')

  const newUser: CreateUserRequest = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    age: 25,
    country: 'CA',
    password: 'MySecurePassword123!',
  }

  const existingUser: CreateUserRequest = {
    name: 'Admin User',
    email: 'admin@example.com', // This email "exists" in our mock
    age: 30,
    password: 'weak',
  }

  console.log('\n✅ New user with strong password:')
  const start = Date.now()
  const newUserResult = await asyncUserRules.validateAll(newUser)
  const duration = Date.now() - start

  if (newUserResult.tag === 'Ok') {
    console.log(`   All async validations passed! (${duration}ms)`)
  } else {
    console.log(`   Failed: ${newUserResult.error.map(e => e.userMessage).join(', ')}`)
  }

  console.log('\n❌ Existing user with weak password:')
  const existingUserResult = await asyncUserRules.validateAll(existingUser)
  if (existingUserResult.tag === 'Err') {
    console.log(`   Found ${existingUserResult.error.length} async validation errors:`)
    existingUserResult.error.forEach(error => {
      console.log(`   - ${error.field || 'unknown'}: ${error.userMessage}`)
    })
  }
}

// Example 4: Pipeline Integration
console.log('\n🔄 Pipeline Integration Examples\n')

async function demonstratePipelineIntegration() {
  console.log('🔄 Business Rules in Pipelines:')

  // Create a comprehensive user validation pipeline
  const userValidationPipeline = pipeline('user-validation')
    .input(CreateUserSchema)
    .validateAllRules(basicUserRules)
    .validateAllRules(conditionalUserRules, {
      isAdmin: false,
      requestId: 'req-123',
      ipCountry: 'US',
    })
    .validateRules(asyncUserRules, ['emailUniqueness', 'advancedPasswordCheck'])
    .map(user => ({
      ...user,
      id: `user-${Date.now()}`,
      membershipLevel: 'basic' as const,
      createdAt: new Date().toISOString(),
    }))

  const testUser: CreateUserRequest = {
    name: 'Pipeline User',
    email: 'pipeline@example.com',
    age: 25,
    password: 'SecurePassword123!',
  }

  console.log('\n🔄 Running comprehensive validation pipeline...')
  const result = await userValidationPipeline.run(testUser)

  if (result.tag === 'Ok') {
    console.log('✅ User validation pipeline completed successfully!')
    console.log(`   Created user: ${result.value.id}`)
  } else {
    console.log('❌ Pipeline validation failed:')
    if (Array.isArray(result.error)) {
      ;(result.error as { userMessage: string }[]).forEach(error => {
        console.log(`   - ${error.userMessage}`)
      })
    } else {
      console.log(`   - ${(result.error as { message: string }).message}`)
    }
  }
}

// Example 5: Resource Integration
console.log('\n🔌 Resource Integration Examples\n')

const UserAPI = resource('users', {
  create: {
    method: 'POST',
    path: '/users',
    body: CreateUserSchema,
    response: UserSchema,
  },

  get: {
    method: 'GET',
    path: '/users/:id',
    params: schema.from(z.object({ id: z.string() })),
    response: UserSchema,
  },
})

async function demonstrateResourceIntegration() {
  console.log('🔌 Business Rules with Resources:')

  // Create a complete user creation workflow with validation
  const createUserWorkflow = pipeline('create-user-workflow')
    .input(CreateUserSchema)
    .validateAllRules(basicUserRules)
    .validateRules(asyncUserRules, ['emailUniqueness'])
    // In a real app, this would call UserAPI.create
    .map(user => {
      console.log(`   Would create user: ${user.name} (${user.email})`)
      return {
        id: `user-${Date.now()}`,
        ...user,
        membershipLevel: 'basic' as const,
      }
    })

  const validUser: CreateUserRequest = {
    name: 'Resource User',
    email: 'resource@example.com',
    age: 28,
    password: 'ResourcePass123!',
  }

  console.log('\n🔌 Running user creation workflow...')
  const result = await createUserWorkflow.run(validUser)

  if (result.tag === 'Ok') {
    console.log('✅ User creation workflow completed!')
    console.log(`   User ID: ${result.value.id}`)
  } else {
    console.log('❌ Workflow failed validation')
  }
}

// Example 6: Rule Composition and Reuse
console.log('\n🧩 Rule Composition Examples\n')

// Reusable rule factory
const createCountrySpecificRules = (country: string, minAge: number) => {
  return rules(`${country.toLowerCase()}-rules`, {
    ageRequirement: rule<CreateUserRequest>(`${country}-age-requirement`)
      .when(user => user.country === country)
      .require(user => user.age >= minAge)
      .message(`Users in ${country} must be ${minAge} or older`)
      .code(`${country}_AGE_REQUIREMENT`)
      .field('age'),

    countrySpecificEmail: rule<CreateUserRequest>(`${country}-email-format`)
      .when(user => user.country === country)
      .require(user => {
        // Country-specific email validation (example)
        if (country === 'JP') {
          // Japanese emails might have specific requirements
          return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(user.email)
        }
        return true
      })
      .message(`Email format not valid for ${country}`)
      .code(`${country}_EMAIL_FORMAT`)
      .field('email'),
  })
}

async function demonstrateRuleComposition() {
  console.log('🧩 Rule Composition and Reuse:')

  // Create country-specific rule sets
  const usRules = createCountrySpecificRules('US', 21)
  const jpRules = createCountrySpecificRules('JP', 20)

  const usUser: CreateUserRequest = {
    name: 'US User',
    email: 'us@example.com',
    age: 19,
    country: 'US',
    password: 'SecurePass123',
  }

  const jpUser: CreateUserRequest = {
    name: 'JP User',
    email: 'jp@example.com',
    age: 19,
    country: 'JP',
    password: 'SecurePass123',
  }

  console.log('\n🇺🇸 US User (19 years old):')
  const usResult = await usRules.validateAll(usUser)
  console.log(
    usResult.tag === 'Ok' ? '   ✅ Passed' : `   ❌ Failed: ${usResult.error?.[0]?.userMessage}`
  )

  console.log('\n🇯🇵 JP User (19 years old):')
  const jpResult = await jpRules.validateAll(jpUser)
  console.log(
    jpResult.tag === 'Ok' ? '   ✅ Passed' : `   ❌ Failed: ${jpResult.error?.[0]?.userMessage}`
  )

  console.log('\n🧩 Demonstrating rule reusability across different countries!')
}

// Run all examples
async function main() {
  console.log('🚀 Kairo Business Rules Engine Examples\n')
  console.log('='.repeat(50))

  try {
    await demonstrateBasicRules()
    console.log('\n' + '-'.repeat(50))

    await demonstrateConditionalRules()
    console.log('\n' + '-'.repeat(50))

    await demonstrateAsyncRules()
    console.log('\n' + '-'.repeat(50))

    await demonstratePipelineIntegration()
    console.log('\n' + '-'.repeat(50))

    await demonstrateResourceIntegration()
    console.log('\n' + '-'.repeat(50))

    await demonstrateRuleComposition()

    console.log('\n' + '='.repeat(50))
    console.log('✨ Business Rules Examples completed!')
    console.log('\nKey Features Demonstrated:')
    console.log('• ✅ Declarative rule definition')
    console.log('• 🎯 Conditional rule execution')
    console.log('• 🌐 Async rule validation')
    console.log('• 🔄 Pipeline integration')
    console.log('• 🔌 Resource workflow integration')
    console.log('• 🧩 Rule composition and reuse')
    console.log('• 📝 Rich error context and messaging')
  } catch (error) {
    console.error('❌ Example execution failed:', error)
  }
}

// Export for use in other modules
export {
  basicUserRules,
  conditionalUserRules,
  asyncUserRules,
  createCountrySpecificRules,
  UserAPI,
  CreateUserSchema,
  UserSchema,
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}
