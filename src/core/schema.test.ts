import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { schema } from './schema'
import { Result } from './result'

describe('Schema', () => {
  describe('string schema', () => {
    it('should parse valid string', () => {
      const stringSchema = schema.string()
      const result = stringSchema.parse('hello')

      expect(Result.isOk(result)).toBe(true)
      expect(result).toEqual({ tag: 'Ok', value: 'hello' })
    })

    it('should fail on non-string', () => {
      const stringSchema = schema.string()
      const result = stringSchema.parse(123)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.code).toBe('VALIDATION_ERROR')
        expect(result.error.issues).toHaveLength(1)
      }
    })
  })

  describe('number schema', () => {
    it('should parse valid number', () => {
      const numberSchema = schema.number()
      const result = numberSchema.parse(42)

      expect(result).toEqual({ tag: 'Ok', value: 42 })
    })

    it('should fail on non-number', () => {
      const numberSchema = schema.number()
      const result = numberSchema.parse('not a number')

      expect(Result.isErr(result)).toBe(true)
    })
  })

  describe('object schema', () => {
    it('should parse valid object', () => {
      const userSchema = schema.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email(),
      })

      const result = userSchema.parse({
        name: 'John',
        age: 30,
        email: 'john@example.com',
      })

      expect(Result.isOk(result)).toBe(true)
      expect(result).toEqual({
        tag: 'Ok',
        value: { name: 'John', age: 30, email: 'john@example.com' },
      })
    })

    it('should fail on invalid object', () => {
      const userSchema = schema.object({
        name: z.string(),
        age: z.number(),
      })

      const result = userSchema.parse({
        name: 'John',
        age: 'thirty',
      })

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.field).toBe('age')
      }
    })

    it('should provide detailed error information', () => {
      const userSchema = schema.object({
        name: z.string().min(2),
        age: z.number().positive(),
      })

      const result = userSchema.parse({
        name: 'J',
        age: -5,
      })

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.issues).toHaveLength(2)
      }
    })
  })

  describe('array schema', () => {
    it('should parse valid array', () => {
      const numbersSchema = schema.array(schema.number())
      const result = numbersSchema.parse([1, 2, 3])

      expect(result).toEqual({ tag: 'Ok', value: [1, 2, 3] })
    })

    it('should work with zod schemas directly', () => {
      const stringsSchema = schema.array(z.string())
      const result = stringsSchema.parse(['a', 'b', 'c'])

      expect(result).toEqual({ tag: 'Ok', value: ['a', 'b', 'c'] })
    })

    it('should fail on invalid array items', () => {
      const numbersSchema = schema.array(schema.number())
      const result = numbersSchema.parse([1, 'two', 3])

      expect(Result.isErr(result)).toBe(true)
    })
  })

  describe('optional and nullable', () => {
    it('should handle optional values', () => {
      const optionalString = schema.optional(schema.string())

      expect(Result.isOk(optionalString.parse('hello'))).toBe(true)
      expect(Result.isOk(optionalString.parse(undefined))).toBe(true)
      expect(Result.isErr(optionalString.parse(null))).toBe(true)
    })

    it('should handle nullable values', () => {
      const nullableString = schema.nullable(schema.string())

      expect(Result.isOk(nullableString.parse('hello'))).toBe(true)
      expect(Result.isOk(nullableString.parse(null))).toBe(true)
      expect(Result.isErr(nullableString.parse(undefined))).toBe(true)
    })
  })

  describe('enum and literal', () => {
    it('should validate enum values', () => {
      const statusSchema = schema.enum(['pending', 'active', 'inactive'] as const)

      expect(Result.isOk(statusSchema.parse('active'))).toBe(true)
      expect(Result.isErr(statusSchema.parse('unknown'))).toBe(true)
    })

    it('should validate literal values', () => {
      const trueSchema = schema.literal(true)

      expect(Result.isOk(trueSchema.parse(true))).toBe(true)
      expect(Result.isErr(trueSchema.parse(false))).toBe(true)
      expect(Result.isErr(trueSchema.parse('true'))).toBe(true)
    })
  })

  describe('union types', () => {
    it('should validate union of types', () => {
      const numberOrString = schema.union([z.number(), z.string()])

      expect(Result.isOk(numberOrString.parse(42))).toBe(true)
      expect(Result.isOk(numberOrString.parse('hello'))).toBe(true)
      expect(Result.isErr(numberOrString.parse(true))).toBe(true)
    })
  })

  describe('record types', () => {
    it('should validate record of values', () => {
      const scoresSchema = schema.record(schema.number())
      const result = scoresSchema.parse({
        math: 95,
        science: 87,
        english: 92,
      })

      expect(Result.isOk(result)).toBe(true)
    })
  })

  describe('from existing zod schema', () => {
    it('should wrap existing zod schemas', () => {
      const zodEmail = z.string().email().min(5)
      const emailSchema = schema.from(zodEmail)

      expect(Result.isOk(emailSchema.parse('test@example.com'))).toBe(true)
      expect(Result.isErr(emailSchema.parse('bad'))).toBe(true)
    })
  })

  describe('safeParse', () => {
    it('should return success result for valid data', () => {
      const numberSchema = schema.number()
      const result = numberSchema.safeParse(42)

      expect(result.success).toBe(true)
      expect(result.data).toBe(42)
      expect(result.error).toBeUndefined()
    })

    it('should return error result for invalid data', () => {
      const numberSchema = schema.number()
      const result = numberSchema.safeParse('not a number')

      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })
  })
})
