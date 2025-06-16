/**
 * Business Rules Engine for the PROCESS Pillar
 *
 * Provides declarative business rule definition and validation capabilities
 * for enforcing complex business logic with conditional execution, async
 * validation, and comprehensive error reporting.
 *
 * Features:
 * - Conditional rule execution with when() clauses
 * - Synchronous and asynchronous validation
 * - Rich error context and user-friendly messages
 * - Rule composition and reusable rule sets
 * - Pipeline integration for seamless validation flows
 */

import { Result } from './result'
import type { KairoError } from './errors'
import { createError } from './errors'

/**
 * Error type for business rule validation failures in the PROCESS pillar.
 * Contains detailed context about which rule failed, the field involved,
 * and user-friendly error messages for display purposes.
 *
 * @interface BusinessRuleError
 * @extends {KairoError}
 * @example
 * ```typescript
 * const ruleError: BusinessRuleError = {
 *   code: 'BUSINESS_RULE_ERROR',
 *   ruleName: 'email-validation',
 *   field: 'email',
 *   userMessage: 'Please enter a valid email address',
 *   message: 'Email validation failed for user@invalid',
 *   context: { attemptedValue: 'user@invalid', pattern: 'email' }
 * }
 * ```
 */
export interface BusinessRuleError extends KairoError {
  /** Always 'BUSINESS_RULE_ERROR' for business rule validation failures */
  code: 'BUSINESS_RULE_ERROR'
  /** Name of the rule that failed validation */
  ruleName: string
  /** Field name that failed validation (when applicable) */
  field?: string | undefined
  /** User-friendly error message for display in UI */
  userMessage: string
  /** Additional context data about the validation failure */
  context: Record<string, unknown>
}

/**
 * Context object passed to rule validation functions.
 * Provides additional data and state for rule evaluation.
 *
 * @interface RuleValidationContext
 * @example
 * ```typescript
 * const context: RuleValidationContext = {
 *   userId: '123',
 *   requestId: 'req-456',
 *   userRole: 'admin',
 *   currentUser: userObject
 * }
 *
 * const rule = rule('admin-only')
 *   .when((data, ctx) => ctx?.userRole === 'admin')
 *   .require(data => validateAdminAction(data))
 * ```
 */
export interface RuleValidationContext {
  /** Any additional context data for rule evaluation */
  [key: string]: unknown
}

/**
 * Function type for rule conditions that determine when a rule should be applied.
 * Returns true if the rule should be executed, false if it should be skipped.
 *
 * @template T - Type of data being validated
 * @param data - The data being validated
 * @param context - Optional validation context
 * @returns True if rule should be applied, false to skip
 */
export type RuleCondition<T> = (data: T, context?: RuleValidationContext) => boolean

/**
 * Function type for synchronous rule validation logic.
 * Can return a boolean directly or a Promise<boolean> for async validation.
 *
 * @template T - Type of data being validated
 * @param data - The data being validated
 * @param context - Optional validation context
 * @returns True if validation passes, false if it fails
 */
export type RuleValidation<T> = (
  data: T,
  context?: RuleValidationContext
) => boolean | Promise<boolean>

/**
 * Function type for asynchronous rule validation with external dependencies.
 * Can perform API calls, database queries, or other async operations.
 *
 * @template T - Type of data being validated
 * @param data - The data being validated
 * @param context - Optional validation context
 * @returns Promise resolving with validation result or throwing on failure
 */
export type AsyncRuleValidation<T> = (data: T, context?: RuleValidationContext) => Promise<unknown>

/**
 * Core business rule interface for the PROCESS pillar.
 *
 * Provides a fluent API for defining business rules with conditional execution,
 * validation logic, error messages, and metadata. Rules are composable and
 * can be used individually or as part of rule sets.
 *
 * @template T - Type of data this rule validates
 * @interface Rule
 * @example
 * ```typescript
 * // Simple validation rule
 * const emailRule = rule('email-validation')
 *   .require(user => /^[^@]+@[^@]+\.[^@]+$/.test(user.email))
 *   .message('Please enter a valid email address')
 *   .field('email')
 *   .code('INVALID_EMAIL')
 *
 * // Conditional rule with async validation
 * const uniqueEmailRule = rule('unique-email')
 *   .when(user => user.email !== user.originalEmail) // Only check if email changed
 *   .async(async user => {
 *     const exists = await checkEmailExists(user.email)
 *     return !exists
 *   })
 *   .message('This email address is already in use')
 *   .field('email')
 *
 * // Usage
 * const result = await emailRule.validate(userData)
 * if (Result.isErr(result)) {
 *   console.error(result.error.userMessage)
 * }
 * ```
 */
export interface Rule<T> {
  /** Rule name for identification and error reporting */
  readonly name: string

  /** Set condition for when this rule should be applied */
  when(condition: RuleCondition<T>): Rule<T>

  /** Define synchronous validation logic */
  require(validation: RuleValidation<T>): Rule<T>

  /** Define asynchronous validation logic */
  async(asyncValidation: AsyncRuleValidation<T>): Rule<T>

  /** Set user-friendly error message */
  message(text: string): Rule<T>

  /** Set error code for programmatic handling */
  code(errorCode: string): Rule<T>

  /** Associate rule with a specific field */
  field(fieldName: string): Rule<T>

  /** Add context data to rule */
  context(contextData: Record<string, unknown>): Rule<T>

  /** Execute rule validation and return Result */
  validate(data: T, context?: RuleValidationContext): Promise<Result<BusinessRuleError, T>>
}

/**
 * Collection of business rules for comprehensive data validation.
 *
 * Provides methods to validate data against multiple rules, with options for
 * selective validation, batch validation, and individual rule execution.
 * Integrates seamlessly with pipelines for business logic enforcement.
 *
 * @template T - Type of data these rules validate
 * @interface Rules
 * @example
 * ```typescript
 * const userRules = rules('user-validation', {
 *   email: rule('email')
 *     .require(user => /^[^@]+@[^@]+\.[^@]+$/.test(user.email))
 *     .message('Invalid email format'),
 *
 *   age: rule('age')
 *     .require(user => user.age >= 18)
 *     .message('Must be 18 or older'),
 *
 *   uniqueEmail: rule('unique-email')
 *     .async(async user => !(await emailExists(user.email)))
 *     .message('Email already registered')
 * })
 *
 * // Validate all rules
 * const allResult = await userRules.validateAll(userData)
 *
 * // Validate specific rules
 * const emailResult = await userRules.validate(userData, ['email', 'uniqueEmail'])
 *
 * // Validate single rule
 * const ageResult = await userRules.validateRule(userData, 'age')
 * ```
 */
export interface Rules<T> {
  /** Rules collection name */
  readonly name: string

  /** Map of rule names to Rule instances */
  readonly rules: Record<string, Rule<T>>

  /** Validate data against specified rules (or all if none specified) */
  validate(
    data: T,
    ruleNames?: string[],
    context?: RuleValidationContext
  ): Promise<Result<BusinessRuleError[], T>>

  /** Validate data against all rules in this collection */
  validateAll(data: T, context?: RuleValidationContext): Promise<Result<BusinessRuleError[], T>>

  /** Validate data against a single named rule */
  validateRule(
    data: T,
    ruleName: string,
    context?: RuleValidationContext
  ): Promise<Result<BusinessRuleError, T>>

  /** Get a specific rule by name */
  getRule(name: string): Rule<T> | undefined
}

/**
 * Creates a structured BusinessRuleError with full context information.
 * Used throughout the rules system for consistent error reporting.
 *
 * @param ruleName - Name of the rule that failed
 * @param message - Technical error message for logging
 * @param options - Additional error options
 * @param options.code - Error code for programmatic handling
 * @param options.field - Field name that failed validation
 * @param options.userMessage - User-friendly message for UI display
 * @param options.context - Additional context data
 * @returns Structured BusinessRuleError with full context
 *
 * @example
 * ```typescript
 * const error = createBusinessRuleError(
 *   'email-validation',
 *   'Email format validation failed',
 *   {
 *     code: 'INVALID_EMAIL',
 *     field: 'email',
 *     userMessage: 'Please enter a valid email address',
 *     context: { attemptedValue: 'invalid-email', pattern: 'email' }
 *   }
 * )
 * ```
 */
const createBusinessRuleError = (
  ruleName: string,
  message: string,
  options: {
    code?: string | undefined
    field?: string | undefined
    userMessage?: string | undefined
    context?: Record<string, unknown> | undefined
  } = {}
): BusinessRuleError => ({
  ...createError('BUSINESS_RULE_ERROR', message, options.context || {}),
  code: 'BUSINESS_RULE_ERROR',
  ruleName,
  field: options.field,
  userMessage: options.userMessage || message,
  context: options.context || {},
})

class RuleImpl<T> implements Rule<T> {
  public readonly name: string
  private condition?: RuleCondition<T> | undefined
  private validation?: RuleValidation<T> | undefined
  private asyncValidation?: AsyncRuleValidation<T> | undefined
  private errorMessage: string = 'Validation failed'
  private errorCode: string = 'VALIDATION_FAILED'
  private fieldName?: string | undefined
  private ruleContext: Record<string, unknown> = {}

  constructor(name: string) {
    this.name = name
  }

  when(condition: RuleCondition<T>): Rule<T> {
    const newRule = this.clone()
    newRule.condition = condition
    return newRule
  }

  require(validation: RuleValidation<T>): Rule<T> {
    const newRule = this.clone()
    newRule.validation = validation
    return newRule
  }

  async(asyncValidation: AsyncRuleValidation<T>): Rule<T> {
    const newRule = this.clone()
    newRule.asyncValidation = asyncValidation
    return newRule
  }

  message(text: string): Rule<T> {
    const newRule = this.clone()
    newRule.errorMessage = text
    return newRule
  }

  code(errorCode: string): Rule<T> {
    const newRule = this.clone()
    newRule.errorCode = errorCode
    return newRule
  }

  field(fieldName: string): Rule<T> {
    const newRule = this.clone()
    newRule.fieldName = fieldName
    return newRule
  }

  context(contextData: Record<string, unknown>): Rule<T> {
    const newRule = this.clone()
    newRule.ruleContext = { ...newRule.ruleContext, ...contextData }
    return newRule
  }

  async validate(data: T, context?: RuleValidationContext): Promise<Result<BusinessRuleError, T>> {
    try {
      // Check condition first (if present)
      if (this.condition && !this.condition(data, context)) {
        // Condition not met, rule doesn't apply - this is considered a pass
        return Result.Ok(data)
      }

      // Handle async validation
      if (this.asyncValidation) {
        try {
          const asyncResult = await this.asyncValidation(data, context)
          // If async validation returns a Result, handle it
          if (asyncResult && typeof asyncResult === 'object' && 'tag' in asyncResult) {
            const result = asyncResult as Result<unknown, unknown>
            if (result.tag === 'Err') {
              return Result.Err(
                createBusinessRuleError(this.name, this.errorMessage, {
                  code: this.errorCode,
                  field: this.fieldName,
                  userMessage: this.errorMessage,
                  context: { ...this.ruleContext, asyncError: result.error },
                })
              )
            }
          }
          // If async validation completed without error, continue to sync validation
        } catch (error) {
          return Result.Err(
            createBusinessRuleError(this.name, this.errorMessage, {
              code: this.errorCode,
              field: this.fieldName,
              userMessage: this.errorMessage,
              context: { ...this.ruleContext, asyncError: error },
            })
          )
        }
      }

      // Handle synchronous validation
      if (this.validation) {
        try {
          const isValid = await Promise.resolve(this.validation(data, context))
          if (!isValid) {
            return Result.Err(
              createBusinessRuleError(this.name, this.errorMessage, {
                code: this.errorCode,
                field: this.fieldName,
                userMessage: this.errorMessage,
                context: this.ruleContext,
              })
            )
          }
        } catch (error) {
          return Result.Err(
            createBusinessRuleError(this.name, this.errorMessage, {
              code: this.errorCode,
              field: this.fieldName,
              userMessage: this.errorMessage,
              context: { ...this.ruleContext, validationError: error },
            })
          )
        }
      }

      return Result.Ok(data)
    } catch (error) {
      return Result.Err(
        createBusinessRuleError(this.name, 'Rule validation failed unexpectedly', {
          code: 'RULE_EXECUTION_ERROR',
          field: this.fieldName,
          userMessage: 'An unexpected error occurred during validation',
          context: { ...this.ruleContext, unexpectedError: error },
        })
      )
    }
  }

  private clone(): RuleImpl<T> {
    const cloned = new RuleImpl<T>(this.name)
    cloned.condition = this.condition
    cloned.validation = this.validation
    cloned.asyncValidation = this.asyncValidation
    cloned.errorMessage = this.errorMessage
    cloned.errorCode = this.errorCode
    cloned.fieldName = this.fieldName
    cloned.ruleContext = { ...this.ruleContext }
    return cloned
  }
}

class RulesImpl<T> implements Rules<T> {
  public readonly name: string
  public readonly rules: Record<string, Rule<T>>

  constructor(name: string, rules: Record<string, Rule<T>>) {
    this.name = name
    this.rules = rules
  }

  async validate(
    data: T,
    ruleNames?: string[],
    context?: RuleValidationContext
  ): Promise<Result<BusinessRuleError[], T>> {
    const rulesToValidate = ruleNames || Object.keys(this.rules)
    const errors: BusinessRuleError[] = []

    for (const ruleName of rulesToValidate) {
      const rule = this.rules[ruleName]
      if (!rule) {
        errors.push(
          createBusinessRuleError(ruleName, `Rule '${ruleName}' not found`, {
            code: 'RULE_NOT_FOUND',
            context: { availableRules: Object.keys(this.rules) },
          })
        )
        continue
      }

      const result = await rule.validate(data, context)
      if (result.tag === 'Err') {
        errors.push(result.error)
      }
    }

    if (errors.length > 0) {
      return Result.Err(errors)
    }

    return Result.Ok(data)
  }

  async validateAll(
    data: T,
    context?: RuleValidationContext
  ): Promise<Result<BusinessRuleError[], T>> {
    return this.validate(data, undefined, context)
  }

  async validateRule(
    data: T,
    ruleName: string,
    context?: RuleValidationContext
  ): Promise<Result<BusinessRuleError, T>> {
    const rule = this.rules[ruleName]
    if (!rule) {
      return Result.Err(
        createBusinessRuleError(ruleName, `Rule '${ruleName}' not found`, {
          code: 'RULE_NOT_FOUND',
          context: { availableRules: Object.keys(this.rules) },
        })
      )
    }

    return rule.validate(data, context)
  }

  getRule(name: string): Rule<T> | undefined {
    return this.rules[name]
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new business rule with the specified name.
 * This is the primary way to create individual rules in Kairo applications.
 *
 * @template T - Type of data this rule will validate
 * @param name - Unique name for this rule (used in error reporting)
 * @returns New Rule instance ready for configuration
 *
 * @example
 * ```typescript
 * // Simple validation rule
 * const emailRule = rule<User>('email-validation')
 *   .require(user => /^[^@]+@[^@]+\.[^@]+$/.test(user.email))
 *   .message('Please enter a valid email address')
 *   .field('email')
 *
 * // Conditional rule
 * const adminRule = rule<User>('admin-check')
 *   .when(user => user.role === 'admin')
 *   .require(user => user.permissions.includes('admin'))
 *   .message('Admin role requires admin permissions')
 *
 * // Async rule with external validation
 * const uniqueUsernameRule = rule<User>('unique-username')
 *   .async(async user => {
 *     const exists = await checkUsernameExists(user.username)
 *     return !exists
 *   })
 *   .message('Username is already taken')
 * ```
 */
export const rule = <T>(name: string): Rule<T> => new RuleImpl<T>(name)

/**
 * Creates a collection of business rules for comprehensive validation.
 * Use this to group related rules and validate them together.
 *
 * @template T - Type of data these rules will validate
 * @param name - Name for this rule collection
 * @param ruleDefinitions - Object mapping rule names to Rule instances
 * @returns New Rules collection ready for validation
 *
 * @example
 * ```typescript
 * // User registration rules
 * const userRegistrationRules = rules<User>('user-registration', {
 *   email: rule<User>('email')
 *     .require(user => /^[^@]+@[^@]+\.[^@]+$/.test(user.email))
 *     .message('Invalid email format'),
 *
 *   password: rule<User>('password')
 *     .require(user => user.password.length >= 8)
 *     .message('Password must be at least 8 characters'),
 *
 *   age: rule<User>('age')
 *     .require(user => user.age >= 18)
 *     .message('Must be 18 or older'),
 *
 *   terms: rule<User>('terms')
 *     .require(user => user.acceptedTerms === true)
 *     .message('Must accept terms and conditions')
 * })
 *
 * // Validate all rules
 * const result = await userRegistrationRules.validateAll(userData)
 * if (Result.isErr(result)) {
 *   result.error.forEach(err => console.log(err.userMessage))
 * }
 * ```
 */
export const rules = <T>(name: string, ruleDefinitions: Record<string, Rule<T>>): Rules<T> =>
  new RulesImpl<T>(name, ruleDefinitions)

// ============================================================================
// Common Rule Utilities
// ============================================================================

/**
 * Collection of pre-built common validation rules.
 * These utilities cover the most frequent validation scenarios and can be
 * used directly or as templates for custom rules.
 *
 * @namespace commonRules
 * @example
 * ```typescript
 * const userRules = rules<User>('user-validation', {
 *   name: commonRules.required('name'),
 *   email: commonRules.email('email'),
 *   password: commonRules.minLength('password', 8),
 *   age: commonRules.range('age', 18, 120),
 *   customCheck: commonRules.custom(
 *     'business-logic',
 *     user => validateBusinessLogic(user),
 *     'Business validation failed'
 *   )
 * })
 * ```
 */
export const commonRules = {
  /**
   * Creates a required field validation rule.
   * Checks that a field is not null, undefined, or empty string.
   *
   * @template T - Type of data being validated
   * @param field - Field name to validate
   * @param message - Custom error message (optional)
   * @returns Configured required field rule
   */
  required: <T>(field: keyof T, message?: string) =>
    rule<T>(`required-${String(field)}`)
      .require(data => {
        const value = data[field]
        return value !== null && value !== undefined && value !== ''
      })
      .message(message || `${String(field)} is required`)
      .field(String(field))
      .code('REQUIRED_FIELD'),

  /**
   * Creates a minimum length validation rule for string fields.
   *
   * @template T - Type of data being validated
   * @param field - String field name to validate
   * @param minLength - Minimum required length
   * @param message - Custom error message (optional)
   * @returns Configured minimum length rule
   */
  minLength: <T>(field: keyof T, minLength: number, message?: string) =>
    rule<T>(`minLength-${String(field)}`)
      .require(data => {
        const value = data[field]
        if (typeof value !== 'string') return false
        return value.length >= minLength
      })
      .message(message || `${String(field)} must be at least ${minLength} characters`)
      .field(String(field))
      .code('MIN_LENGTH'),

  /**
   * Creates an email format validation rule.
   * Uses standard email regex pattern for validation.
   *
   * @template T - Type of data being validated
   * @param field - Email field name to validate
   * @param message - Custom error message (optional)
   * @returns Configured email validation rule
   */
  email: <T>(field: keyof T, message?: string) =>
    rule<T>(`email-${String(field)}`)
      .require(data => {
        const value = data[field]
        if (typeof value !== 'string') return false
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(value)
      })
      .message(message || `${String(field)} must be a valid email`)
      .field(String(field))
      .code('INVALID_EMAIL'),

  /**
   * Creates a numeric range validation rule.
   * Validates that a number field falls within specified bounds.
   *
   * @template T - Type of data being validated
   * @param field - Numeric field name to validate
   * @param min - Minimum allowed value (inclusive)
   * @param max - Maximum allowed value (inclusive)
   * @param message - Custom error message (optional)
   * @returns Configured range validation rule
   */
  range: <T>(field: keyof T, min: number, max: number, message?: string) =>
    rule<T>(`range-${String(field)}`)
      .require(data => {
        const value = data[field]
        if (typeof value !== 'number') return false
        return value >= min && value <= max
      })
      .message(message || `${String(field)} must be between ${min} and ${max}`)
      .field(String(field))
      .code('OUT_OF_RANGE'),

  /**
   * Creates a custom validation rule with specified logic.
   * Use this for business-specific validation that doesn't fit standard patterns.
   *
   * @template T - Type of data being validated
   * @param name - Unique name for this custom rule
   * @param validation - Custom validation function
   * @param message - Error message for validation failures
   * @param code - Error code for programmatic handling (optional)
   * @returns Configured custom validation rule
   */
  custom: <T>(name: string, validation: RuleValidation<T>, message: string, code?: string) =>
    rule<T>(name)
      .require(validation)
      .message(message)
      .code(code || 'CUSTOM_VALIDATION'),
}
