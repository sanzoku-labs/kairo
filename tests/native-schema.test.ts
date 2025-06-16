import { describe, it, expect } from 'vitest'
import { nativeSchema, type Schema } from '../src/core/native-schema'
import { Result } from '../src/core/result'

describe('Native Schema System', () => {
  describe('Basic Types', () => {
    describe('string schema', () => {
      it('should validate valid strings', () => {
        const schema = nativeSchema.string()
        const result = schema.parse('hello')

        expect(Result.isOk(result)).toBe(true)
        expect(result).toEqual({ tag: 'Ok', value: 'hello' })
      })

      it('should reject non-strings', () => {
        const schema = nativeSchema.string()
        const result = schema.parse(123)

        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.code).toBe('VALIDATION_ERROR')
          expect(result.error.message).toBe('Expected string')
          expect(result.error.issues[0]!.code).toBe('INVALID_TYPE')
        }
      })

      it('should support string constraints', () => {
        const schema = nativeSchema.string().min(5).max(10)

        expect(Result.isOk(schema.parse('hello'))).toBe(true)
        expect(Result.isOk(schema.parse('hello world'))).toBe(false)
        expect(Result.isOk(schema.parse('hi'))).toBe(false)
      })

      it('should validate email format', () => {
        const schema = nativeSchema.string().email()

        expect(Result.isOk(schema.parse('test@example.com'))).toBe(true)
        expect(Result.isOk(schema.parse('invalid-email'))).toBe(false)
      })

      it('should validate UUID format', () => {
        const schema = nativeSchema.string().uuid()

        expect(Result.isOk(schema.parse('123e4567-e89b-12d3-a456-426614174000'))).toBe(true)
        expect(Result.isOk(schema.parse('not-a-uuid'))).toBe(false)
      })

      it('should support regex validation', () => {
        const schema = nativeSchema.string().regex(/^[A-Z]+$/)

        expect(Result.isOk(schema.parse('HELLO'))).toBe(true)
        expect(Result.isOk(schema.parse('hello'))).toBe(false)
      })

      it('should support transformations', () => {
        const schema = nativeSchema.string().trim()
        const result = schema.parse('  hello  ')

        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value).toBe('hello')
        }
      })
    })

    describe('number schema', () => {
      it('should validate valid numbers', () => {
        const schema = nativeSchema.number()
        const result = schema.parse(42)

        expect(Result.isOk(result)).toBe(true)
        expect(result).toEqual({ tag: 'Ok', value: 42 })
      })

      it('should reject non-numbers', () => {
        const schema = nativeSchema.number()
        const result = schema.parse('not a number')

        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.code).toBe('VALIDATION_ERROR')
          expect(result.error.message).toBe('Expected number')
        }
      })

      it('should reject NaN', () => {
        const schema = nativeSchema.number()
        const result = schema.parse(NaN)

        expect(Result.isErr(result)).toBe(true)
      })

      it('should support number constraints', () => {
        const schema = nativeSchema.number().min(0).max(100)

        expect(Result.isOk(schema.parse(50))).toBe(true)
        expect(Result.isOk(schema.parse(-1))).toBe(false)
        expect(Result.isOk(schema.parse(101))).toBe(false)
      })

      it('should validate positive numbers', () => {
        const schema = nativeSchema.number().positive()

        expect(Result.isOk(schema.parse(1))).toBe(true)
        expect(Result.isOk(schema.parse(0))).toBe(false)
        expect(Result.isOk(schema.parse(-1))).toBe(false)
      })

      it('should validate integers', () => {
        const schema = nativeSchema.number().integer()

        expect(Result.isOk(schema.parse(42))).toBe(true)
        expect(Result.isOk(schema.parse(42.5))).toBe(false)
      })
    })

    describe('boolean schema', () => {
      it('should validate valid booleans', () => {
        const schema = nativeSchema.boolean()

        expect(Result.isOk(schema.parse(true))).toBe(true)
        expect(Result.isOk(schema.parse(false))).toBe(true)
      })

      it('should reject non-booleans', () => {
        const schema = nativeSchema.boolean()
        const result = schema.parse('true')

        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.message).toBe('Expected boolean')
        }
      })
    })
  })

  describe('Complex Types', () => {
    describe('object schema', () => {
      it('should validate valid objects', () => {
        const schema = nativeSchema.object({
          name: nativeSchema.string(),
          age: nativeSchema.number(),
          active: nativeSchema.boolean(),
        })

        const result = schema.parse({
          name: 'John',
          age: 30,
          active: true,
        })

        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value).toEqual({
            name: 'John',
            age: 30,
            active: true,
          })
        }
      })

      it('should reject invalid objects', () => {
        const schema = nativeSchema.object({
          name: nativeSchema.string(),
          age: nativeSchema.number(),
        })

        const result = schema.parse({
          name: 'John',
          age: 'thirty',
        })

        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.field).toBe('age')
          expect(result.error.issues).toHaveLength(1)
        }
      })

      it('should support nested objects', () => {
        const schema = nativeSchema.object({
          user: nativeSchema.object({
            name: nativeSchema.string(),
            profile: nativeSchema.object({
              bio: nativeSchema.string(),
            }),
          }),
        })

        const result = schema.parse({
          user: {
            name: 'John',
            profile: {
              bio: 'Software developer',
            },
          },
        })

        expect(Result.isOk(result)).toBe(true)
      })

      it('should support object composition methods', () => {
        const baseSchema = nativeSchema.object({
          name: nativeSchema.string(),
          age: nativeSchema.number(),
        })

        const extendedSchema = baseSchema.extend({
          email: nativeSchema.string().email(),
        })

        const result = extendedSchema.parse({
          name: 'John',
          age: 30,
          email: 'john@example.com',
        })

        expect(Result.isOk(result)).toBe(true)
      })

      it('should support pick and omit', () => {
        const schema = nativeSchema.object({
          name: nativeSchema.string(),
          age: nativeSchema.number(),
          email: nativeSchema.string(),
        })

        const pickedSchema = schema.pick(['name', 'email'])
        const omittedSchema = schema.omit(['age'])

        const testData = { name: 'John', email: 'john@example.com' }

        expect(Result.isOk(pickedSchema.parse(testData))).toBe(true)
        expect(Result.isOk(omittedSchema.parse(testData))).toBe(true)
      })

      it('should support partial objects', () => {
        const schema = nativeSchema.object({
          name: nativeSchema.string(),
          age: nativeSchema.number(),
        })

        const partialSchema = schema.partial()

        expect(Result.isOk(partialSchema.parse({}))).toBe(true)
        expect(Result.isOk(partialSchema.parse({ name: 'John' }))).toBe(true)
      })
    })

    describe('array schema', () => {
      it('should validate valid arrays', () => {
        const schema = nativeSchema.array(nativeSchema.number())
        const result = schema.parse([1, 2, 3])

        expect(Result.isOk(result)).toBe(true)
        expect(result).toEqual({ tag: 'Ok', value: [1, 2, 3] })
      })

      it('should reject non-arrays', () => {
        const schema = nativeSchema.array(nativeSchema.string())
        const result = schema.parse('not an array')

        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.message).toBe('Expected array')
        }
      })

      it('should validate array items', () => {
        const schema = nativeSchema.array(nativeSchema.number())
        const result = schema.parse([1, 'two', 3])

        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.field).toBe('1')
          expect(result.error.issues).toHaveLength(1)
        }
      })

      it('should support array constraints', () => {
        const schema = nativeSchema.array(nativeSchema.string()).min(2).max(5)

        expect(Result.isOk(schema.parse(['a', 'b']))).toBe(true)
        expect(Result.isOk(schema.parse(['a']))).toBe(false)
        expect(Result.isOk(schema.parse(['a', 'b', 'c', 'd', 'e', 'f']))).toBe(false)
      })

      it('should support nonempty arrays', () => {
        const schema = nativeSchema.array(nativeSchema.string()).nonempty()

        expect(Result.isOk(schema.parse(['a']))).toBe(true)
        expect(Result.isOk(schema.parse([]))).toBe(false)
      })
    })

    describe('union schema', () => {
      it('should validate union types', () => {
        const schema = nativeSchema.union([nativeSchema.string(), nativeSchema.number()])

        expect(Result.isOk(schema.parse('hello'))).toBe(true)
        expect(Result.isOk(schema.parse(42))).toBe(true)
        expect(Result.isOk(schema.parse(true))).toBe(false)
      })

      it('should try schemas in order', () => {
        const schema = nativeSchema.union([
          nativeSchema.string().min(5),
          nativeSchema.string().max(3),
        ])

        expect(Result.isOk(schema.parse('hello'))).toBe(true)
        expect(Result.isOk(schema.parse('hi'))).toBe(true)
        expect(Result.isOk(schema.parse('test'))).toBe(false) // 4 chars, doesn't match either
      })
    })

    describe('enum schema', () => {
      it('should validate enum values', () => {
        const schema = nativeSchema.enum(['red', 'green', 'blue'] as const)

        expect(Result.isOk(schema.parse('red'))).toBe(true)
        expect(Result.isOk(schema.parse('green'))).toBe(true)
        expect(Result.isOk(schema.parse('yellow'))).toBe(false)
      })

      it('should reject non-string values', () => {
        const schema = nativeSchema.enum(['a', 'b'] as const)
        const result = schema.parse(123)

        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.message).toBe('Expected string')
        }
      })
    })

    describe('literal schema', () => {
      it('should validate literal values', () => {
        const schema = nativeSchema.literal('exact')

        expect(Result.isOk(schema.parse('exact'))).toBe(true)
        expect(Result.isOk(schema.parse('different'))).toBe(false)
      })

      it('should work with numbers and booleans', () => {
        const numSchema = nativeSchema.literal(42)
        const boolSchema = nativeSchema.literal(true)

        expect(Result.isOk(numSchema.parse(42))).toBe(true)
        expect(Result.isOk(numSchema.parse(43))).toBe(false)
        expect(Result.isOk(boolSchema.parse(true))).toBe(true)
        expect(Result.isOk(boolSchema.parse(false))).toBe(false)
      })
    })

    describe('record schema', () => {
      it('should validate record types', () => {
        const schema = nativeSchema.record(nativeSchema.number())
        const result = schema.parse({
          a: 1,
          b: 2,
          c: 3,
        })

        expect(Result.isOk(result)).toBe(true)
      })

      it('should validate all record values', () => {
        const schema = nativeSchema.record(nativeSchema.string())
        const result = schema.parse({
          a: 'hello',
          b: 42,
          c: 'world',
        })

        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.field).toBe('b')
        }
      })
    })
  })

  describe('Schema Composition', () => {
    describe('optional', () => {
      it('should accept undefined values', () => {
        const schema = nativeSchema.string().optional()

        expect(Result.isOk(schema.parse('hello'))).toBe(true)
        expect(Result.isOk(schema.parse(undefined))).toBe(true)
        expect(Result.isOk(schema.parse(null))).toBe(false)
      })

      it('should maintain original validation for defined values', () => {
        const schema = nativeSchema.string().min(5).optional()

        expect(Result.isOk(schema.parse('hello'))).toBe(true)
        expect(Result.isOk(schema.parse('hi'))).toBe(false)
        expect(Result.isOk(schema.parse(undefined))).toBe(true)
      })
    })

    describe('nullable', () => {
      it('should accept null values', () => {
        const schema = nativeSchema.string().nullable()

        expect(Result.isOk(schema.parse('hello'))).toBe(true)
        expect(Result.isOk(schema.parse(null))).toBe(true)
        expect(Result.isOk(schema.parse(undefined))).toBe(false)
      })
    })

    describe('default', () => {
      it('should use default values for undefined input', () => {
        const schema = nativeSchema.string().default('fallback')

        const result1 = schema.parse(undefined)
        const result2 = schema.parse('provided')

        expect(Result.isOk(result1)).toBe(true)
        if (Result.isOk(result1)) {
          expect(result1.value).toBe('fallback')
        }

        expect(Result.isOk(result2)).toBe(true)
        if (Result.isOk(result2)) {
          expect(result2.value).toBe('provided')
        }
      })
    })

    describe('transform', () => {
      it('should transform valid values', () => {
        const schema = nativeSchema.string().transform(s => s.toUpperCase())
        const result = schema.parse('hello')

        expect(Result.isOk(result)).toBe(true)
        if (Result.isOk(result)) {
          expect(result.value).toBe('HELLO')
        }
      })

      it('should handle transformation errors', () => {
        const schema = nativeSchema.string().transform(_s => {
          throw new Error('Transform failed')
        })
        const result = schema.parse('hello')

        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.message).toContain('Transformation failed')
        }
      })
    })

    describe('refine', () => {
      it('should apply custom validation', () => {
        const schema = nativeSchema.string().refine(s => s.includes('@'), 'Must contain @ symbol')

        expect(Result.isOk(schema.parse('test@example.com'))).toBe(true)
        expect(Result.isOk(schema.parse('invalid'))).toBe(false)
      })

      it('should provide custom error messages', () => {
        const schema = nativeSchema.number().refine(n => n % 2 === 0, 'Must be even')
        const result = schema.parse(3)

        expect(Result.isErr(result)).toBe(true)
        if (Result.isErr(result)) {
          expect(result.error.message).toBe('Must be even')
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('should provide detailed error information', () => {
      const schema = nativeSchema.object({
        user: nativeSchema.object({
          name: nativeSchema.string().min(2),
          age: nativeSchema.number().positive(),
        }),
      })

      const result = schema.parse({
        user: {
          name: 'J',
          age: -5,
        },
      })

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.issues).toHaveLength(2)
        expect(result.error.field).toBeTruthy()
        expect(result.error.fieldPath).toBeInstanceOf(Array)
      }
    })

    it('should include field paths in errors', () => {
      const schema = nativeSchema.object({
        items: nativeSchema.array(
          nativeSchema.object({
            value: nativeSchema.number(),
          })
        ),
      })

      const result = schema.parse({
        items: [{ value: 42 }, { value: 'invalid' }],
      })

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.field).toBe('items.1.value')
        expect(result.error.fieldPath).toEqual(['items', '1', 'value'])
      }
    })
  })

  describe('safeParse', () => {
    it('should return success object for valid data', () => {
      const schema = nativeSchema.string()
      const result = schema.safeParse('hello')

      expect(result.success).toBe(true)
      expect(result.data).toBe('hello')
      expect(result.error).toBeUndefined()
    })

    it('should return error object for invalid data', () => {
      const schema = nativeSchema.string()
      const result = schema.safeParse(123)

      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Performance', () => {
    it('should handle large objects efficiently', () => {
      const schema = nativeSchema.object({
        id: nativeSchema.string().uuid(),
        name: nativeSchema.string().min(1).max(100),
        email: nativeSchema.string().email(),
        age: nativeSchema.number().min(0).max(150),
        active: nativeSchema.boolean(),
      })

      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `123e4567-e89b-12d3-a456-42661417${i.toString().padStart(4, '0')}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        age: 20 + (i % 50),
        active: i % 2 === 0,
      }))

      const start = performance.now()

      for (const data of largeData) {
        const result = schema.parse(data)
        expect(Result.isOk(result)).toBe(true)
      }

      const end = performance.now()
      const duration = end - start

      // Should be significantly faster than equivalent Zod operations
      expect(duration).toBeLessThan(300) // 300ms for 1000 validations (adjusted for CI performance)
    })

    it('should handle deep nesting efficiently', () => {
      const createNestedSchema = (depth: number): Schema<unknown> => {
        if (depth === 0) {
          return nativeSchema.string()
        }
        return nativeSchema.object({
          value: createNestedSchema(depth - 1),
          level: nativeSchema.number(),
        })
      }

      const schema = createNestedSchema(10)

      type NestedData = string | { value: NestedData; level: number }

      const createNestedData = (depth: number): NestedData => {
        if (depth === 0) {
          return 'deep value'
        }
        return {
          value: createNestedData(depth - 1),
          level: depth,
        }
      }

      const data = createNestedData(10)

      const start = performance.now()
      const result = schema.parse(data)
      const end = performance.now()

      expect(Result.isOk(result)).toBe(true)
      expect(end - start).toBeLessThan(10) // Should be very fast
    })
  })

  describe('Type Safety', () => {
    it('should maintain type inference through composition', () => {
      const schema = nativeSchema.object({
        name: nativeSchema.string(),
        age: nativeSchema.number().optional(),
        tags: nativeSchema.array(nativeSchema.string()),
      })

      const result = schema.parse({
        name: 'John',
        age: 30,
        tags: ['developer', 'typescript'],
      })

      if (Result.isOk(result)) {
        // These should be properly typed
        const name: string = result.value.name
        const age: number | undefined = result.value.age
        const tags: string[] = result.value.tags

        expect(name).toBe('John')
        expect(age).toBe(30)
        expect(tags).toEqual(['developer', 'typescript'])
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle null and undefined correctly', () => {
      const stringSchema = nativeSchema.string()

      expect(Result.isErr(stringSchema.parse(null))).toBe(true)
      expect(Result.isErr(stringSchema.parse(undefined))).toBe(true)
    })

    it('should handle empty strings and arrays', () => {
      const stringSchema = nativeSchema.string()
      const arraySchema = nativeSchema.array(nativeSchema.string())

      expect(Result.isOk(stringSchema.parse(''))).toBe(true)
      expect(Result.isOk(arraySchema.parse([]))).toBe(true)
    })

    it('should handle special number values', () => {
      const numberSchema = nativeSchema.number()

      expect(Result.isOk(numberSchema.parse(0))).toBe(true)
      expect(Result.isOk(numberSchema.parse(-0))).toBe(true)
      expect(Result.isErr(numberSchema.parse(NaN))).toBe(true)
      expect(Result.isOk(numberSchema.parse(Infinity))).toBe(true)
      expect(Result.isOk(numberSchema.parse(-Infinity))).toBe(true)
    })

    it('should handle circular references gracefully', () => {
      interface CircularObj {
        name: string
        self?: CircularObj
      }

      const obj: CircularObj = { name: 'test' }
      obj.self = obj

      const schema = nativeSchema.object({
        name: nativeSchema.string(),
      })

      // Should not cause infinite recursion
      const result = schema.parse(obj as unknown)
      expect(Result.isOk(result)).toBe(true)
    })
  })

  describe('Utility Schemas', () => {
    describe('any', () => {
      it('should accept any value', () => {
        const schema = nativeSchema.any()

        expect(Result.isOk(schema.parse('string'))).toBe(true)
        expect(Result.isOk(schema.parse(123))).toBe(true)
        expect(Result.isOk(schema.parse(null))).toBe(true)
        expect(Result.isOk(schema.parse(undefined))).toBe(true)
        expect(Result.isOk(schema.parse({ complex: 'object' }))).toBe(true)
      })
    })

    describe('unknown', () => {
      it('should accept any value', () => {
        const schema = nativeSchema.unknown()

        expect(Result.isOk(schema.parse('string'))).toBe(true)
        expect(Result.isOk(schema.parse(123))).toBe(true)
        expect(Result.isOk(schema.parse(null))).toBe(true)
        expect(Result.isOk(schema.parse(undefined))).toBe(true)
      })
    })

    describe('void', () => {
      it('should only accept undefined', () => {
        const schema = nativeSchema.void()

        expect(Result.isOk(schema.parse(undefined))).toBe(true)
        expect(Result.isErr(schema.parse(null))).toBe(true)
        expect(Result.isErr(schema.parse('string'))).toBe(true)
      })
    })

    describe('lazy', () => {
      it('should support recursive schemas', () => {
        interface TreeNode {
          value: string
          children?: TreeNode[]
        }

        // Create a properly typed recursive schema
        let nodeSchema: Schema<TreeNode>

        nodeSchema = nativeSchema.lazy(() =>
          nativeSchema.object({
            value: nativeSchema.string(),
            children: nativeSchema.array(nodeSchema!).optional(),
          })
        ) as Schema<TreeNode>

        const treeData: TreeNode = {
          value: 'root',
          children: [
            {
              value: 'child1',
              children: [{ value: 'grandchild1' }],
            },
            { value: 'child2' },
          ],
        }

        const result = nodeSchema.parse(treeData)
        expect(Result.isOk(result)).toBe(true)
      })
    })
  })
})
