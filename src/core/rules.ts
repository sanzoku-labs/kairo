import { Result } from './result'
import type { KairoError } from './errors'
import { createError } from './errors'

export interface BusinessRuleError extends KairoError {
  code: 'BUSINESS_RULE_ERROR'
  ruleName: string
  field?: string | undefined
  userMessage: string
  context: Record<string, unknown>
}

export interface RuleValidationContext {
  [key: string]: unknown
}

export type RuleCondition<T> = (data: T, context?: RuleValidationContext) => boolean
export type RuleValidation<T> = (
  data: T,
  context?: RuleValidationContext
) => boolean | Promise<boolean>
export type AsyncRuleValidation<T> = (data: T, context?: RuleValidationContext) => Promise<unknown>

export interface Rule<T> {
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

export interface Rules<T> {
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

// Factory functions
export const rule = <T>(name: string): Rule<T> => new RuleImpl<T>(name)

export const rules = <T>(name: string, ruleDefinitions: Record<string, Rule<T>>): Rules<T> =>
  new RulesImpl<T>(name, ruleDefinitions)

// Utility functions for common validations
export const commonRules = {
  required: <T>(field: keyof T, message?: string) =>
    rule<T>(`required-${String(field)}`)
      .require(data => {
        const value = data[field]
        return value !== null && value !== undefined && value !== ''
      })
      .message(message || `${String(field)} is required`)
      .field(String(field))
      .code('REQUIRED_FIELD'),

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

  custom: <T>(name: string, validation: RuleValidation<T>, message: string, code?: string) =>
    rule<T>(name)
      .require(validation)
      .message(message)
      .code(code || 'CUSTOM_VALIDATION'),
}
