import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import { rule, rules, commonRules, pipeline, schema, Result } from '../src'
import type { Rules } from '../src'

// Test data interfaces
interface User {
  id: string
  name: string
  email: string
  age: number
  country?: string
  password?: string
}

interface CreateUserRequest {
  name: string
  email: string
  age: number
  country?: string
  password?: string
}

// Mock external service for async validation
const mockUserService = {
  checkEmailExists: vi.fn(),
  checkUsernameExists: vi.fn(),
}

describe('Business Rules Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rule Creation and Validation', () => {
    it('should create a basic rule with require validation', async () => {
      const ageRule = rule<User>('age-requirement')
        .require(user => user.age >= 18)
        .message('Must be 18 or older')
        .code('AGE_REQUIREMENT')
        .field('age')

      const validUser: User = { id: '1', name: 'John', email: 'john@example.com', age: 25 }
      const invalidUser: User = { id: '2', name: 'Jane', email: 'jane@example.com', age: 16 }

      const validResult = await ageRule.validate(validUser)
      expect(validResult.tag).toBe('Ok')
      if (validResult.tag === 'Ok') {
        expect(validResult.value).toEqual(validUser)
      }

      const invalidResult = await ageRule.validate(invalidUser)
      expect(invalidResult.tag).toBe('Err')
      if (invalidResult.tag === 'Err') {
        expect(invalidResult.error.code).toBe('BUSINESS_RULE_ERROR')
        expect(invalidResult.error.ruleName).toBe('age-requirement')
        expect(invalidResult.error.userMessage).toBe('Must be 18 or older')
        expect(invalidResult.error.field).toBe('age')
      }
    })

    it('should create conditional rules with when clause', async () => {
      const usAgeRule = rule<User>('us-age-requirement')
        .when(user => user.country === 'US')
        .require(user => user.age >= 21)
        .message('Must be 21+ in US')
        .code('AGE_REQUIREMENT_US')

      const usUser: User = {
        id: '1',
        name: 'John',
        email: 'john@example.com',
        age: 20,
        country: 'US',
      }
      const nonUsUser: User = {
        id: '2',
        name: 'Jane',
        email: 'jane@example.com',
        age: 20,
        country: 'CA',
      }

      const usResult = await usAgeRule.validate(usUser)
      expect(usResult.tag).toBe('Err')

      const nonUsResult = await usAgeRule.validate(nonUsUser)
      expect(nonUsResult.tag).toBe('Ok') // Rule doesn't apply to non-US users
    })

    it('should support async validation', async () => {
      mockUserService.checkEmailExists.mockResolvedValue(false as boolean) // Email available

      const emailUniquenessRule = rule<CreateUserRequest>('email-uniqueness')
        .async(async user => {
          const exists = (await mockUserService.checkEmailExists(user.email)) as boolean
          return Result.Ok(!exists) // Return Result.Ok(true) if email is unique
        })
        .require(() => true) // Async validation handles the logic
        .message('Email already taken')
        .code('EMAIL_TAKEN')

      const user: CreateUserRequest = { name: 'John', email: 'john@example.com', age: 25 }

      const result = await emailUniquenessRule.validate(user)
      expect(result.tag).toBe('Ok')
      expect(mockUserService.checkEmailExists).toHaveBeenCalledWith('john@example.com')
    })

    it('should handle async validation failures', async () => {
      mockUserService.checkEmailExists.mockResolvedValue(true as boolean) // Email exists

      const emailUniquenessRule = rule<CreateUserRequest>('email-uniqueness')
        .async(async user => {
          const exists = (await mockUserService.checkEmailExists(user.email)) as boolean
          if (exists) {
            return Result.Err({ message: 'Email exists' })
          }
          return Result.Ok(true)
        })
        .message('Email already taken')
        .code('EMAIL_TAKEN')

      const user: CreateUserRequest = { name: 'John', email: 'existing@example.com', age: 25 }

      const result = await emailUniquenessRule.validate(user)
      expect(result.tag).toBe('Err')
      if (result.tag === 'Err') {
        expect(result.error.userMessage).toBe('Email already taken')
      }
    })

    it('should add context to rules', async () => {
      const contextRule = rule<User>('context-rule')
        .require(() => false) // Always fail
        .message('Rule failed')
        .context({ requestId: '123', timestamp: Date.now() })

      const user: User = { id: '1', name: 'John', email: 'john@example.com', age: 25 }

      const result = await contextRule.validate(user)
      expect(result.tag).toBe('Err')
      if (result.tag === 'Err') {
        expect(result.error.context).toMatchObject({ requestId: '123' })
      }
    })
  })

  describe('Rules Collection', () => {
    const userValidationRules: Rules<CreateUserRequest> = rules('user-validation', {
      nameRequired: commonRules.required<CreateUserRequest>('name'),
      emailRequired: commonRules.required<CreateUserRequest>('email'),
      emailValid: commonRules.email<CreateUserRequest>('email'),
      ageRange: commonRules.range<CreateUserRequest>('age', 13, 120),
      passwordStrength: rule<CreateUserRequest>('password-strength')
        .require(user => {
          if (!user.password) return false
          return user.password.length >= 8 && /[A-Z]/.test(user.password)
        })
        .message('Password must be 8+ chars with uppercase')
        .code('WEAK_PASSWORD')
        .field('password'),
    })

    it('should validate all rules and collect errors', async () => {
      const invalidUser: CreateUserRequest = {
        name: '',
        email: 'invalid-email',
        age: 150,
        password: 'weak',
      }

      const result = await userValidationRules.validateAll(invalidUser)
      expect(result.tag).toBe('Err')
      if (result.tag === 'Err') {
        expect(result.error.length).toBeGreaterThan(0)
        const errorCodes = result.error.map(e => e.code)
        expect(errorCodes).toContain('BUSINESS_RULE_ERROR')
      }
    })

    it('should validate specific rules only', async () => {
      const user: CreateUserRequest = {
        name: 'John',
        email: 'invalid-email',
        age: 25,
      }

      const result = await userValidationRules.validate(user, ['emailValid'])
      expect(result.tag).toBe('Err')
      if (result.tag === 'Err') {
        expect(result.error).toHaveLength(1)
        expect(result.error[0]?.field).toBe('email')
      }
    })

    it('should validate single rule by name', async () => {
      const user: CreateUserRequest = {
        name: 'John',
        email: 'john@example.com',
        age: 25,
      }

      const result = await userValidationRules.validateRule(user, 'nameRequired')
      expect(result.tag).toBe('Ok')
    })

    it('should return error for non-existent rule', async () => {
      const user: CreateUserRequest = {
        name: 'John',
        email: 'john@example.com',
        age: 25,
      }

      const result = await userValidationRules.validateRule(user, 'nonExistentRule')
      expect(result.tag).toBe('Err')
      if (result.tag === 'Err') {
        expect(result.error.code).toBe('BUSINESS_RULE_ERROR')
        expect(result.error.ruleName).toBe('nonExistentRule')
      }
    })

    it('should get individual rules', () => {
      const nameRule = userValidationRules.getRule('nameRequired')
      expect(nameRule).toBeDefined()
      expect(nameRule?.name).toBe('required-name')

      const nonExistentRule = userValidationRules.getRule('nonExistent')
      expect(nonExistentRule).toBeUndefined()
    })
  })

  describe('Common Rules', () => {
    it('should validate required fields', async () => {
      const requiredRule = commonRules.required<User>('name', 'Name is mandatory')

      const validUser: User = { id: '1', name: 'John', email: 'john@example.com', age: 25 }
      const invalidUser: User = { id: '2', name: '', email: 'jane@example.com', age: 25 }

      const validResult = await requiredRule.validate(validUser)
      expect(validResult.tag).toBe('Ok')

      const invalidResult = await requiredRule.validate(invalidUser)
      expect(invalidResult.tag).toBe('Err')
      if (invalidResult.tag === 'Err') {
        expect(invalidResult.error.userMessage).toBe('Name is mandatory')
      }
    })

    it('should validate minimum length', async () => {
      const minLengthRule = commonRules.minLength<User>('name', 3)

      const validUser: User = { id: '1', name: 'John', email: 'john@example.com', age: 25 }
      const invalidUser: User = { id: '2', name: 'Jo', email: 'jo@example.com', age: 25 }

      const validResult = await minLengthRule.validate(validUser)
      expect(validResult.tag).toBe('Ok')

      const invalidResult = await minLengthRule.validate(invalidUser)
      expect(invalidResult.tag).toBe('Err')
    })

    it('should validate email format', async () => {
      const emailRule = commonRules.email<User>('email')

      const validUser: User = { id: '1', name: 'John', email: 'john@example.com', age: 25 }
      const invalidUser: User = { id: '2', name: 'Jane', email: 'invalid-email', age: 25 }

      const validResult = await emailRule.validate(validUser)
      expect(validResult.tag).toBe('Ok')

      const invalidResult = await emailRule.validate(invalidUser)
      expect(invalidResult.tag).toBe('Err')
      if (invalidResult.tag === 'Err') {
        expect(invalidResult.error.code).toBe('BUSINESS_RULE_ERROR')
      }
    })

    it('should validate numeric ranges', async () => {
      const ageRule = commonRules.range<User>('age', 18, 65)

      const validUser: User = { id: '1', name: 'John', email: 'john@example.com', age: 30 }
      const tooYoung: User = { id: '2', name: 'Jane', email: 'jane@example.com', age: 16 }
      const tooOld: User = { id: '3', name: 'Bob', email: 'bob@example.com', age: 70 }

      const validResult = await ageRule.validate(validUser)
      expect(validResult.tag).toBe('Ok')

      const youngResult = await ageRule.validate(tooYoung)
      expect(youngResult.tag).toBe('Err')

      const oldResult = await ageRule.validate(tooOld)
      expect(oldResult.tag).toBe('Err')
    })

    it('should create custom rules', async () => {
      const customRule = commonRules.custom<User>(
        'strong-name',
        user => user.name.length >= 3 && /[A-Z]/.test(user.name),
        'Name must be 3+ chars with uppercase',
        'CUSTOM_NAME_RULE'
      )

      const validUser: User = { id: '1', name: 'John', email: 'john@example.com', age: 25 }
      const invalidUser: User = { id: '2', name: 'john', email: 'john@example.com', age: 25 }

      const validResult = await customRule.validate(validUser)
      expect(validResult.tag).toBe('Ok')

      const invalidResult = await customRule.validate(invalidUser)
      expect(invalidResult.tag).toBe('Err')
      if (invalidResult.tag === 'Err') {
        expect(invalidResult.error.code).toBe('BUSINESS_RULE_ERROR')
      }
    })
  })

  describe('Pipeline Integration', () => {
    const UserSchema = schema.from(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        age: z.number(),
      })
    )

    const userRules = rules('user-validation', {
      ageCheck: commonRules.range<User>('age', 18, 65),
      emailFormat: commonRules.email<User>('email'),
    })

    it('should integrate with pipeline validateRule method', async () => {
      const ageRule = commonRules.range<User>('age', 18, 65)

      const validationPipeline = pipeline('user-validation').input(UserSchema).validateRule(ageRule)

      const validUser = { id: '1', name: 'John', email: 'john@example.com', age: 30 }
      const result = await validationPipeline.run(validUser)
      expect(result.tag).toBe('Ok')

      const invalidUser = { id: '2', name: 'Jane', email: 'jane@example.com', age: 16 }
      const invalidResult = await validationPipeline.run(invalidUser)
      expect(invalidResult.tag).toBe('Err')
    })

    it('should integrate with pipeline validateRules method', async () => {
      const validationPipeline = pipeline('user-validation')
        .input(UserSchema)
        .validateRules(userRules, ['ageCheck'])

      const validUser = { id: '1', name: 'John', email: 'john@example.com', age: 30 }
      const result = await validationPipeline.run(validUser)
      expect(result.tag).toBe('Ok')

      const invalidUser = { id: '2', name: 'Jane', email: 'jane@example.com', age: 16 }
      const invalidResult = await validationPipeline.run(invalidUser)
      expect(invalidResult.tag).toBe('Err')
    })

    it('should integrate with pipeline validateAllRules method', async () => {
      const validationPipeline = pipeline('user-validation')
        .input(UserSchema)
        .validateAllRules(userRules)

      const validUser = { id: '1', name: 'John', email: 'john@example.com', age: 30 }
      const result = await validationPipeline.run(validUser)
      expect(result.tag).toBe('Ok')

      const invalidUser = { id: '2', name: 'Jane', email: 'invalid-email', age: 16 }
      const invalidResult = await validationPipeline.run(invalidUser)
      expect(invalidResult.tag).toBe('Err')
      if (invalidResult.tag === 'Err') {
        // Should have multiple validation errors (validateAllRules returns BusinessRuleError[])
        if (Array.isArray(invalidResult.error)) {
          expect(invalidResult.error.length).toBeGreaterThan(0)
        } else {
          // Single error case
          expect(invalidResult.error).toBeDefined()
        }
      }
    })

    it('should work with rule validation context', async () => {
      const contextRule = rule<User>('context-aware-rule')
        .require((user, context) => {
          const isAdmin = context?.isAdmin as boolean
          return isAdmin || user.age >= 18
        })
        .message('Must be admin or 18+')

      const validationPipeline = pipeline('context-validation')
        .input(UserSchema)
        .validateRule(contextRule, { isAdmin: true })

      const youngUser = { id: '1', name: 'John', email: 'john@example.com', age: 16 }
      const result = await validationPipeline.run(youngUser)
      expect(result.tag).toBe('Ok') // Should pass because isAdmin: true
    })
  })

  describe('Resource Integration', () => {
    const CreateUserSchema = schema.from(
      z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number(),
      })
    )

    const userValidationRules = rules('create-user-validation', {
      nameRequired: commonRules.required<CreateUserRequest>('name'),
      emailFormat: commonRules.email<CreateUserRequest>('email'),
      ageValid: commonRules.range<CreateUserRequest>('age', 13, 120),
    })

    it('should integrate rules with resource creation pipeline', () => {
      // Create a pipeline that validates business rules before API call
      const createUserWithValidation = pipeline('create-user-validated')
        .input(CreateUserSchema)
        .validateAllRules(userValidationRules)
        .map(user => {
          // In real usage, you would call UserAPI.create.run(user) here
          // For this test, we're just demonstrating the pipeline structure
          return user
        })

      // Note: In a real scenario, you'd pass the httpClient to the resource
      // For this test, we're just checking that the pipeline structure works
      expect(createUserWithValidation).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle rule execution errors gracefully', async () => {
      const faultyRule = rule<User>('faulty-rule')
        .require(() => {
          throw new Error('Unexpected validation error')
        })
        .message('Validation failed')

      const user: User = { id: '1', name: 'John', email: 'john@example.com', age: 25 }

      const result = await faultyRule.validate(user)
      expect(result.tag).toBe('Err')
      if (result.tag === 'Err') {
        expect(result.error.context.validationError).toBeDefined()
      }
    })

    it('should handle async rule errors gracefully', async () => {
      const faultyAsyncRule = rule<User>('faulty-async-rule')
        .async(() => {
          throw new Error('Async validation failed')
        })
        .message('Async validation failed')

      const user: User = { id: '1', name: 'John', email: 'john@example.com', age: 25 }

      const result = await faultyAsyncRule.validate(user)
      expect(result.tag).toBe('Err')
      if (result.tag === 'Err') {
        expect(result.error.context.asyncError).toBeDefined()
      }
    })
  })
})
