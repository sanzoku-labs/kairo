import { z, ZodError, type ZodSchema, type ZodTypeAny } from 'zod'
import { Result } from './result'
import { isNil, isEmpty, path } from '../utils/fp'
import { type KairoError } from './errors'

export interface ValidationError extends KairoError {
  code: 'VALIDATION_ERROR'
  field?: string | undefined
  expected?: string | undefined
  actual?: unknown
  fieldPath: string[]
  issues: Array<{
    path: (string | number)[]
    message: string
    code: string
    expected?: string | undefined
    received?: string | undefined
  }>
}

export interface Schema<T> {
  parse(input: unknown): Result<ValidationError, T>
  safeParse(input: unknown): { success: boolean; data?: T; error?: ValidationError }
  zod: ZodSchema<T>
}

function createSchema<T>(zodSchema: ZodSchema<T>): Schema<T> {
  return {
    parse(input: unknown): Result<ValidationError, T> {
      try {
        const data = zodSchema.parse(input)
        return Result.Ok(data)
      } catch (error) {
        if (error instanceof ZodError) {
          const firstError = error.errors[0]
          const fieldPath = firstError?.path.map(String) || []
          
          const validationError: ValidationError = {
            code: 'VALIDATION_ERROR',
            message: firstError?.message || 'Validation failed',
            field: fieldPath.join('.'),
            fieldPath,
            expected: firstError && 'expected' in firstError ? String(firstError.expected) : undefined,
            actual: firstError && firstError.path.length > 0 ? 
              (input as Record<string, unknown>)?.[String(firstError.path[0])] : input,
            issues: error.errors.map(issue => ({
              path: issue.path,
              message: issue.message,
              code: issue.code,
              expected: 'expected' in issue ? String(issue.expected) : undefined,
              received: 'received' in issue ? String(issue.received) : undefined
            })),
            timestamp: Date.now(),
            context: { input: typeof input === 'object' ? input : { value: input } }
          }
          
          return Result.Err(validationError)
        }
        return Result.Err({
          code: 'VALIDATION_ERROR',
          message: 'Unknown validation error',
          fieldPath: [],
          issues: [],
          timestamp: Date.now(),
          context: { input: typeof input === 'object' ? input : { value: input } }
        })
      }
    },

    safeParse(input: unknown) {
      const result = this.parse(input)
      if (Result.isOk(result)) {
        return { success: true, data: result.value }
      }
      return { success: false, error: result.error }
    },

    zod: zodSchema
  }
}

export const schema = {
  string(): Schema<string> {
    return createSchema(z.string())
  },

  number(): Schema<number> {
    return createSchema(z.number())
  },

  boolean(): Schema<boolean> {
    return createSchema(z.boolean())
  },

  object<T extends Record<string, ZodTypeAny>>(shape: T): Schema<z.infer<z.ZodObject<T>>> {
    return createSchema(z.object(shape))
  },

  array<T>(itemSchema: Schema<T> | ZodTypeAny): Schema<T[]> {
    const zodSchema = 'zod' in itemSchema ? itemSchema.zod : itemSchema
    return createSchema(z.array(zodSchema as ZodSchema<T>))
  },

  union<T extends readonly [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]>(
    schemas: T
  ): Schema<z.infer<z.ZodUnion<T>>> {
    return createSchema(z.union(schemas))
  },

  optional<T>(innerSchema: Schema<T> | ZodTypeAny): Schema<T | undefined> {
    const zodSchema = 'zod' in innerSchema ? innerSchema.zod : innerSchema
    return createSchema(zodSchema.optional() as ZodSchema<T | undefined>)
  },

  nullable<T>(innerSchema: Schema<T> | ZodTypeAny): Schema<T | null> {
    const zodSchema = 'zod' in innerSchema ? innerSchema.zod : innerSchema
    return createSchema(zodSchema.nullable() as ZodSchema<T | null>)
  },

  literal<T extends string | number | boolean>(value: T): Schema<T> {
    return createSchema(z.literal(value))
  },

  enum<T extends readonly [string, ...string[]]>(values: T): Schema<T[number]> {
    return createSchema(z.enum(values))
  },

  record<T>(valueSchema: Schema<T> | ZodTypeAny): Schema<Record<string, T>> {
    const zodSchema = 'zod' in valueSchema ? valueSchema.zod : valueSchema
    return createSchema(z.record(zodSchema as ZodSchema<T>))
  },

  from<T>(zodSchema: ZodSchema<T>): Schema<T> {
    return createSchema(zodSchema)
  },

  // FP utilities for validation
  validate<T>(schema: Schema<T>) {
    return (input: unknown): Result<ValidationError, T> => schema.parse(input)
  },

  isValid<T>(schema: Schema<T>) {
    return (input: unknown): boolean => {
      const result = schema.safeParse(input)
      return result.success
    }
  },

  extractField<T>(fieldPath: string, schema: Schema<T>) {
    return (input: unknown): Result<ValidationError, T> => {
      if (isNil(input) || typeof input !== 'object') {
        return Result.Err({
          code: 'VALIDATION_ERROR',
          message: 'Input is not an object',
          field: fieldPath,
          fieldPath: fieldPath.split('.'),
          issues: [],
          timestamp: Date.now(),
          context: { input: typeof input === 'object' ? input : { value: input }, expectedField: fieldPath }
        })
      }

      const fieldValue = path(fieldPath.split('.'))(input)
      return schema.parse(fieldValue)
    }
  },

  validateNonEmpty<T>(schema: Schema<T>) {
    return (input: unknown): Result<ValidationError, T> => {
      if (isEmpty(input)) {
        return Result.Err({
          code: 'VALIDATION_ERROR',
          message: 'Value cannot be empty',
          fieldPath: [],
          issues: [],
          timestamp: Date.now(),
          context: { input: typeof input === 'object' ? input : { value: input } }
        })
      }
      return schema.parse(input)
    }
  }
}