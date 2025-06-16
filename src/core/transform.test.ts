/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  transform,
  createTransform,
  commonTransforms,
  schema,
  Result,
  type TransformContext,
} from '../index'

// Test data interfaces
interface APIUser {
  user_id: string
  user_name: string
  user_email: string
  created_at: string
  is_active: boolean
  metadata?: Record<string, unknown>
}

interface InternalUser {
  id: string
  name: string
  email: string
  createdAt: Date
  active: boolean
  displayName: string
  metadata?: Record<string, unknown>
}

interface NestedSource {
  profile: {
    firstName: string
    lastName: string
    contact: {
      email: string
      phone: string
    }
  }
  settings: {
    theme: string
    notifications: boolean
  }
}

interface FlatTarget {
  firstName: string
  lastName: string
  email: string
  phone: string
  theme: string
  notifications: boolean
  fullName: string
}

// Schemas
const APIUserSchema = schema.object({
  user_id: schema.string().uuid(),
  user_name: schema.string().min(1),
  user_email: schema.string().email(),
  created_at: schema.string(),
  is_active: schema.boolean(),
  metadata: schema.record(schema.unknown()).optional(),
})

const InternalUserSchema = schema.object({
  id: schema.string().uuid(),
  name: schema.string().min(1),
  email: schema.string().email(),
  createdAt: schema.unknown(), // Date object
  active: schema.boolean(),
  displayName: schema.string(),
  metadata: schema.record(schema.unknown()).optional(),
})

const NestedSourceSchema = schema.object({
  profile: schema.object({
    firstName: schema.string(),
    lastName: schema.string(),
    contact: schema.object({
      email: schema.string().email(),
      phone: schema.string(),
    }),
  }),
  settings: schema.object({
    theme: schema.string(),
    notifications: schema.boolean(),
  }),
})

const FlatTargetSchema = schema.object({
  firstName: schema.string(),
  lastName: schema.string(),
  email: schema.string().email(),
  phone: schema.string(),
  theme: schema.string(),
  notifications: schema.boolean(),
  fullName: schema.string(),
})

describe('Data Transformation Layer', () => {
  let apiUser: APIUser

  beforeEach(() => {
    apiUser = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      user_name: 'John Doe',
      user_email: 'john@example.com',
      created_at: '2023-01-01T00:00:00Z',
      is_active: true,
      metadata: { source: 'api', version: '1.0' },
    } as APIUser
  })

  describe('Transform Builder and Basic Operations', () => {
    it('should create transform with builder pattern', () => {
      const userTransform = transform('api-to-internal', APIUserSchema).to(InternalUserSchema)

      expect(userTransform.name).toBe('api-to-internal')
      expect(userTransform.sourceSchema).toBe(APIUserSchema)
      expect(userTransform.targetSchema).toBe(InternalUserSchema)
    })

    it('should create transform with direct function', () => {
      const userTransform = createTransform('direct-transform', APIUserSchema, InternalUserSchema)

      expect(userTransform.name).toBe('direct-transform')
      expect(userTransform.sourceSchema).toBe(APIUserSchema)
      expect(userTransform.targetSchema).toBe(InternalUserSchema)
    })

    it('should map fields with simple field mapping', () => {
      const userTransform = transform('simple-mapping', APIUserSchema)
        .to(InternalUserSchema)
        .map('user_id', 'id')
        .map('user_name', 'name')
        .map('user_email', 'email')
        .map('is_active', 'active')

      const result = userTransform.execute(apiUser as any)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.id).toBe(apiUser.user_id)
        expect(result.value.name).toBe(apiUser.user_name)
        expect(result.value.email).toBe(apiUser.user_email)
        expect(result.value.active).toBe(apiUser.is_active)
      }
    })

    it('should map fields with custom mappers', () => {
      const userTransform = transform('custom-mapping', APIUserSchema)
        .to(InternalUserSchema)
        .map('user_id', 'id')
        .map('user_name', 'name')
        .map('user_email', 'email')
        .map('created_at', 'createdAt', () => new Date(apiUser.created_at))
        .map('is_active', 'active')

      const result = userTransform.execute(apiUser as any)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.createdAt).toBeInstanceOf(Date)
        expect((result.value.createdAt as Date).toISOString()).toBe('2023-01-01T00:00:00.000Z')
      }
    })

    it('should support computed fields', () => {
      const userTransform = transform('with-computed', APIUserSchema)
        .to(InternalUserSchema)
        .map('user_id', 'id')
        .map('user_name', 'name')
        .map('user_email', 'email')
        .map('created_at', 'createdAt', () => new Date(apiUser.created_at))
        .map('is_active', 'active')
        .compute('displayName', source => `${source.user_name} <${source.user_email}>`)

      const result = userTransform.execute(apiUser as any)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.displayName).toBe('John Doe <john@example.com>')
      }
    })

    it('should support filters', () => {
      const activeUsersOnly = transform('active-only', APIUserSchema)
        .to(InternalUserSchema)
        .filter(user => user.is_active)
        .map('user_id', 'id')
        .map('user_name', 'name')
        .map('user_email', 'email')
        .map('is_active', 'active')
        .compute('displayName', source => source.user_name)
        .compute('createdAt', () => new Date())

      // Should pass for active user
      const activeResult = activeUsersOnly.execute(apiUser as any)
      expect(Result.isOk(activeResult)).toBe(true)

      // Should filter out inactive user
      const inactiveUser = { ...apiUser, is_active: false } as APIUser
      const inactiveResult = activeUsersOnly.execute(inactiveUser as any)
      expect(Result.isErr(inactiveResult)).toBe(true)
      if (Result.isErr(inactiveResult)) {
        expect(inactiveResult.error.operation).toBe('filter')
      }
    })
  })

  describe('Nested Field Mapping', () => {
    it('should handle nested field extraction', () => {
      const nestedSource: NestedSource = {
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          contact: {
            email: 'john@example.com',
            phone: '+1234567890',
          },
        },
        settings: {
          theme: 'dark',
          notifications: true,
        },
      }

      const flatTransform = transform('flatten', NestedSourceSchema)
        .to(FlatTargetSchema)
        .map('profile.firstName', 'firstName')
        .map('profile.lastName', 'lastName')
        .map('profile.contact.email', 'email')
        .map('profile.contact.phone', 'phone')
        .map('settings.theme', 'theme')
        .map('settings.notifications', 'notifications')
        .compute('fullName', source => `${source.profile.firstName} ${source.profile.lastName}`)

      const result = flatTransform.execute(nestedSource)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        const flatResult: FlatTarget = result.value
        expect(flatResult.firstName).toBe('John')
        expect(flatResult.lastName).toBe('Doe')
        expect(flatResult.email).toBe('john@example.com')
        expect(flatResult.phone).toBe('+1234567890')
        expect(flatResult.theme).toBe('dark')
        expect(flatResult.notifications).toBe(true)
        expect(flatResult.fullName).toBe('John Doe')
      }
    })

    it('should handle missing nested fields gracefully', () => {
      const incompleteSource = {
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          // Missing contact object
        },
        settings: {
          theme: 'dark',
          notifications: true,
        },
      }

      const flatTransform = transform('flatten-incomplete', NestedSourceSchema)
        .to(FlatTargetSchema)
        .map('profile.firstName', 'firstName')
        .map('profile.lastName', 'lastName')
        .map('profile.contact.email', 'email', (_, __) => 'default@example.com')
        .map('profile.contact.phone', 'phone', (_, __) => 'N/A')
        .map('settings.theme', 'theme')
        .map('settings.notifications', 'notifications')
        .compute('fullName', source => `${source.profile.firstName} ${source.profile.lastName}`)

      const result = flatTransform.execute(incompleteSource as NestedSource)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.firstName).toBe('John')
        expect(result.value.lastName).toBe('Doe')
        expect(result.value.email).toBe('default@example.com')
        expect(result.value.phone).toBe('N/A')
        expect(result.value.fullName).toBe('John Doe')
      }
    })
  })

  describe('Common Transform Utilities', () => {
    it('should apply string transformations', () => {
      const source = { text: '  Hello World  ' }
      const SourceSchema = schema.object({ text: schema.string() })
      const TargetSchema = schema.object({
        lower: schema.string(),
        upper: schema.string(),
        trimmed: schema.string(),
      })

      const stringTransform = transform('string-transforms', SourceSchema)
        .to(TargetSchema)
        .map('text', 'lower', () => commonTransforms.toLowerCase(source.text))
        .map('text', 'upper', () => commonTransforms.toUpperCase(source.text))
        .map('text', 'trimmed', () => commonTransforms.trim(source.text))

      const result = stringTransform.execute(source)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.lower).toBe('  hello world  ')
        expect(result.value.upper).toBe('  HELLO WORLD  ')
        expect(result.value.trimmed).toBe('Hello World')
      }
    })

    it('should apply date transformations', () => {
      const source = { dateString: '2023-01-01T12:00:00Z', dateObject: new Date('2023-01-01') }
      const SourceSchema = schema.object({
        dateString: schema.string(),
        dateObject: schema.unknown(),
      })
      const TargetSchema = schema.object({
        isoString: schema.string(),
        dateFromString: schema.unknown(),
      })

      const dateTransform = transform('date-transforms', SourceSchema)
        .to(TargetSchema)
        .map('dateObject', 'isoString', () => commonTransforms.toISOString(source.dateObject))
        .map('dateString', 'dateFromString', () =>
          commonTransforms.fromISOString(source.dateString)
        )

      const result = dateTransform.execute(source)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.isoString).toBe('2023-01-01T00:00:00.000Z')
        expect(result.value.dateFromString).toBeInstanceOf(Date)
      }
    })

    it('should apply number transformations', () => {
      const source = { numberString: '42.5', number: 100 }
      const SourceSchema = schema.object({
        numberString: schema.string(),
        number: schema.number(),
      })
      const TargetSchema = schema.object({
        fromString: schema.number(),
        toString: schema.string(),
      })

      const numberTransform = transform('number-transforms', SourceSchema)
        .to(TargetSchema)
        .map('numberString', 'fromString', () => commonTransforms.toNumber(source.numberString))
        .map('number', 'toString', () => commonTransforms.toString(source.number))

      const result = numberTransform.execute(source)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.fromString).toBe(42.5)
        expect(result.value.toString).toBe('100')
      }
    })

    it('should apply array transformations', () => {
      const source = {
        nested: [
          [1, 2],
          [3, 4],
        ],
        duplicates: [1, 2, 2, 3, 3, 3],
      }
      const SourceSchema = schema.object({
        nested: schema.array(schema.array(schema.number())),
        duplicates: schema.array(schema.number()),
      })
      const TargetSchema = schema.object({
        flat: schema.array(schema.number()),
        unique: schema.array(schema.number()),
      })

      const arrayTransform = transform('array-transforms', SourceSchema)
        .to(TargetSchema)
        .map('nested', 'flat', () => commonTransforms.flatten(source.nested))
        .map('duplicates', 'unique', () => commonTransforms.unique(source.duplicates))

      const result = arrayTransform.execute(source)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.flat).toEqual([1, 2, 3, 4])
        expect(result.value.unique).toEqual([1, 2, 3])
      }
    })

    it('should apply object transformations', () => {
      const source = {
        obj: { a: 1, b: 2, c: 3, d: 4 },
      }
      const SourceSchema = schema.object({
        obj: schema.record(schema.number()),
      })
      const TargetSchema = schema.object({
        picked: schema.record(schema.number()),
        omitted: schema.record(schema.number()),
      })

      const objectTransform = transform('object-transforms', SourceSchema)
        .to(TargetSchema)
        .map('obj', 'picked', () => commonTransforms.pick(['a', 'c'] as any)(source.obj))
        .map('obj', 'omitted', () => commonTransforms.omit(['a', 'c'] as any)(source.obj))

      const result = objectTransform.execute(source)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.picked).toEqual({ a: 1, c: 3 })
        expect(result.value.omitted).toEqual({ b: 2, d: 4 })
      }
    })

    it('should handle default values', () => {
      const source = { value: null, other: 'test' }
      const SourceSchema = schema.object({
        value: schema.unknown().nullable(),
        other: schema.string(),
      })
      const TargetSchema = schema.object({
        withDefault: schema.string(),
        normal: schema.string(),
      })

      const defaultTransform = transform('default-values', SourceSchema)
        .to(TargetSchema)
        .map('value', 'withDefault', () => commonTransforms.defaultValue('fallback')(source.value))
        .map('other', 'normal')

      const result = defaultTransform.execute(source)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.withDefault).toBe('fallback')
        expect(result.value.normal).toBe('test')
      }
    })

    it('should apply conditional transformations', () => {
      const SourceSchema = schema.object({ value: schema.number() })
      const TargetSchema = schema.object({
        result: schema.number(),
      })

      const conditionalTransform = transform('conditional', SourceSchema)
        .to(TargetSchema)
        .map('value', 'result', source =>
          commonTransforms.when(
            (val: number) => val > 5,
            (val: number) => val * 2
          )(source.value)
        )

      // Test with value that meets condition
      const source1 = { value: 10 }
      const result1 = conditionalTransform.execute(source1)

      expect(Result.isOk(result1)).toBe(true)
      if (Result.isOk(result1)) {
        expect(result1.value.result).toBe(20) // 10 * 2 because 10 > 5
      }

      // Test with value that doesn't meet condition
      const source2 = { value: 3 }
      const result2 = conditionalTransform.execute(source2)
      expect(Result.isOk(result2)).toBe(true)
      if (Result.isOk(result2)) {
        expect(result2.value.result).toBe(3) // Unchanged because 3 <= 5
      }
    })
  })

  describe('Transform Execution', () => {
    it('should execute transforms with context', () => {
      const userTransform = transform('with-context', APIUserSchema)
        .to(InternalUserSchema)
        .map('user_id', 'id')
        .map('user_name', 'name')
        .map('user_email', 'email')
        .map('is_active', 'active')
        .compute('displayName', (source, context) => {
          const prefix = (context?.prefix as string) || ''
          return `${prefix}${source.user_name}`
        })
        .compute('createdAt', () => new Date())

      const context: TransformContext = { prefix: 'User: ' }
      const result = userTransform.execute(apiUser as any, context)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.displayName).toBe('User: John Doe')
      }
    })

    it('should execute many transforms', () => {
      const users: APIUser[] = [
        apiUser,
        {
          user_id: '456e7890-e89b-12d3-a456-426614174001',
          user_name: 'Jane Smith',
          user_email: 'jane@example.com',
          created_at: '2023-02-01T00:00:00Z',
          is_active: false,
        } as unknown as APIUser,
      ]

      const userTransform = transform('batch-transform', APIUserSchema)
        .to(InternalUserSchema)
        .filter(user => user.is_active) // Only active users
        .map('user_id', 'id')
        .map('user_name', 'name')
        .map('user_email', 'email')
        .map('is_active', 'active')
        .compute('displayName', source => source.user_name)
        .compute('createdAt', () => new Date())

      const result = userTransform.executeMany(users as any)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(1) // Only active user
        expect(result.value[0]?.name).toBe('John Doe')
      }
    })

    it('should collect errors from many transforms', () => {
      const users: APIUser[] = [
        apiUser,
        {
          user_id: 'invalid-id', // This will cause validation to fail
          user_name: 'Jane Smith',
          user_email: 'jane@example.com',
          created_at: '2023-02-01T00:00:00Z',
          is_active: true,
        } as unknown as APIUser,
      ]

      const userTransform = transform('error-collecting', APIUserSchema)
        .to(InternalUserSchema)
        .map('user_id', 'id')
        .map('user_name', 'name')
        .map('user_email', 'email')
        .map('is_active', 'active')
        .compute('displayName', source => source.user_name)
        .compute('createdAt', () => new Date())
        .validate() // This will catch the invalid UUID

      const result = userTransform.executeMany(users as any)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toHaveLength(1) // One validation error
        expect(result.error[0]?.operation).toBe('validation')
      }
    })
  })

  describe('Transform Composition', () => {
    it('should pipe transforms together', () => {
      // First transform: API to internal format
      const apiToInternal = transform('api-to-internal', APIUserSchema)
        .to(InternalUserSchema)
        .map('user_id', 'id')
        .map('user_name', 'name')
        .map('user_email', 'email')
        .map('is_active', 'active')
        .compute('displayName', source => source.user_name)
        .compute('createdAt', () => new Date())

      // Second transform: internal to display format
      const DisplayUserSchema = schema.object({
        displayText: schema.string(),
        status: schema.string(),
      })

      const internalToDisplay = transform('internal-to-display', InternalUserSchema)
        .to(DisplayUserSchema)
        .compute('displayText', source => `${source.name} (${source.email})`)
        .compute('status', source => (source.active ? 'Active' : 'Inactive'))

      // Compose transforms
      const fullTransform = apiToInternal.pipe(internalToDisplay)

      expect(fullTransform.name).toBe('api-to-internal | internal-to-display')

      const result = fullTransform.execute(apiUser as any)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.displayText).toBe('John Doe (john@example.com)')
        expect(result.value.status).toBe('Active')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle field mapping errors', () => {
      const userTransform = transform('error-mapping', APIUserSchema)
        .to(InternalUserSchema)
        .map('user_id', 'id')
        .map('user_name', 'name')
        .map('user_email', 'email')
        .map('created_at', 'createdAt', () => {
          throw new Error('Date parsing failed')
        })
        .map('is_active', 'active')
        .compute('displayName', source => source.user_name)

      const result = userTransform.execute(apiUser as any)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.operation).toBe('field-mapping')
        expect(result.error.field).toBe('created_at')
        expect(result.error.targetField).toBe('createdAt')
      }
    })

    it('should handle compute errors', () => {
      const userTransform = transform('error-compute', APIUserSchema)
        .to(InternalUserSchema)
        .map('user_id', 'id')
        .map('user_name', 'name')
        .map('user_email', 'email')
        .map('is_active', 'active')
        .compute('displayName', () => {
          throw new Error('Display name computation failed')
        })
        .compute('createdAt', () => new Date())

      const result = userTransform.execute(apiUser as any)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.operation).toBe('compute')
        expect(result.error.targetField).toBe('displayName')
      }
    })

    it('should handle filter errors', () => {
      const userTransform = transform('error-filter', APIUserSchema)
        .to(InternalUserSchema)
        .filter(() => {
          throw new Error('Filter predicate failed')
        })

      const result = userTransform.execute(apiUser as any)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.operation).toBe('filter')
      }
    })

    it('should handle validation errors', () => {
      const userTransform = transform('error-validation', APIUserSchema)
        .to(InternalUserSchema)
        .map('user_id', 'id')
        .map('user_name', 'name')
        // Missing required fields to cause validation failure
        .validate()

      const result = userTransform.execute(apiUser as any)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.operation).toBe('validation')
      }
    })
  })

  describe('Pipeline Integration', () => {
    it('should integrate transforms with pipelines', () => {
      // Note: This test demonstrates transform creation for pipeline integration
      // The actual pipeline.transform() method would handle schema conversion
      const userTransform = transform('api-to-internal', APIUserSchema)
        .to(InternalUserSchema)
        .map('user_id', 'id')
        .map('user_name', 'name')
        .map('user_email', 'email')
        .map('is_active', 'active')
        .compute('displayName', source => source.user_name)
        .compute('createdAt', () => new Date())

      expect(userTransform.name).toBe('api-to-internal')
      expect(userTransform.sourceSchema).toBe(APIUserSchema)
      expect(userTransform.targetSchema).toBe(InternalUserSchema)
    })

    it('should pass transform context through pipeline', () => {
      // Note: This test demonstrates context usage in transforms
      const userTransform = transform('contextual-transform', APIUserSchema)
        .to(InternalUserSchema)
        .map('user_id', 'id')
        .map('user_name', 'name')
        .map('user_email', 'email')
        .map('is_active', 'active')
        .compute('displayName', (source, context) => {
          const prefix = (context?.prefix as string) || ''
          return `${prefix}${source.user_name}`
        })
        .compute('createdAt', () => new Date())

      const transformContext = { prefix: 'Processed: ' }
      const result = userTransform.execute(apiUser as any, transformContext)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value.displayName).toBe('Processed: John Doe')
      }
    })
  })

  describe('Type Safety', () => {
    it('should maintain type safety through transformations', () => {
      const userTransform = transform('type-safe', APIUserSchema)
        .to(InternalUserSchema)
        .map('user_id', 'id')
        .map('user_name', 'name')
        .map('user_email', 'email')
        .map('is_active', 'active')
        .compute('displayName', source => {
          // Source should be properly typed as APIUser
          const name: string = source.user_name
          const email: string = source.user_email
          return `${name} <${email}>`
        })
        .compute('createdAt', () => new Date())

      const result = userTransform.execute(apiUser as any)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        // Result should be properly typed as InternalUser
        const user = result.value as InternalUser
        expect(user.displayName).toBe('John Doe <john@example.com>')
        expect(user.createdAt).toBeInstanceOf(Date)
      }
    })
  })
})
