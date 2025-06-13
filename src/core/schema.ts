import { z, ZodError, type ZodSchema, type ZodTypeAny } from 'zod'
import { Result } from './result'

export interface ValidationError {
  code: 'VALIDATION_ERROR'
  message: string
  field?: string
  expected?: string
  actual?: unknown
  issues: Array<{
    path: (string | number)[]
    message: string
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
          const validationError: ValidationError = {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Validation failed',
            issues: error.errors.map(issue => ({
              path: issue.path,
              message: issue.message
            }))
          }
          
          const firstErrorPath = error.errors[0]?.path.join('.')
          if (firstErrorPath) {
            validationError.field = firstErrorPath
          }
          return Result.Err(validationError)
        }
        return Result.Err({
          code: 'VALIDATION_ERROR',
          message: 'Unknown validation error',
          issues: []
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
  }
}