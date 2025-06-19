/**
 * DATA Pillar Methods Tests
 * 
 * Comprehensive tests for all DATA pillar methods following Kairo patterns:
 * - schema() - Create schemas
 * - validate() - Data validation
 * - transform() - Data transformation
 * - convert() - Schema migration
 * - aggregate() - Statistical operations
 * - groupBy() - Data grouping
 * - serialize() - Data export
 * - deserialize() - Data import
 * - clone() - Deep copying
 * - merge() - Object merging
 */

import { describe, it, expect } from 'vitest'
import { 
  schema, 
  validate, 
  transform, 
  convert,
  aggregate,
  groupBy,
  serialize,
  deserialize,
  clone,
  merge
} from './methods'
import { Result, schema as nativeSchema } from '../shared'
import type { TransformMapping, SerializationFormat } from './types'
import { 
  ResultTestUtils, 
  MockDataGenerator
} from '../../test-utils'

describe('DATA Pillar Methods', () => {
  describe('schema() method', () => {
    it('should create schema from simple definition', () => {
      const userSchema = schema({
        id: 'string',
        name: 'string',
        age: 'number',
        active: 'boolean'
      })

      expect(userSchema).toBeDefined()
      expect(typeof userSchema.parse).toBe('function')
    })

    it('should create schema with timestamps when enabled', () => {
      const userSchema = schema({
        name: 'string',
        email: 'string'
      }, {
        timestamps: true
      })

      expect(userSchema).toBeDefined()
    })

    it('should handle strict mode configuration', () => {
      const strictSchema = schema({
        id: 'string',
        name: 'string'
      }, {
        strict: true,
        coerce: false
      })

      expect(strictSchema).toBeDefined()
    })

    it('should handle complex field definitions', () => {
      const complexSchema = schema({
        id: 'string',
        profile: {
          type: 'object',
          schema: schema({
            name: 'string',
            settings: 'object'
          })
        }
      })

      expect(complexSchema).toBeDefined()
    })
  })

  describe('validate() method', () => {
    it('should validate correct data successfully', () => {
      const userSchema = nativeSchema.object({
        id: nativeSchema.string(),
        name: nativeSchema.string(),
        age: nativeSchema.number()
      })

      const validUser = { id: 'user-123', name: 'John Doe', age: 30 }
      const result = validate(validUser, userSchema)
      
      const validatedData = ResultTestUtils.expectOk(result)
      expect(validatedData).toEqual(validUser)
    })

    it('should reject invalid data with proper error', () => {
      const userSchema = nativeSchema.object({
        id: nativeSchema.string(),
        name: nativeSchema.string(),
        age: nativeSchema.number()
      })

      const invalidUser = { id: 'user-123', name: 123, age: 'not-a-number' }
      const result = validate(invalidUser, userSchema)
      
      const error = ResultTestUtils.expectErrType(result, 'DATA_ERROR')
      expect(error.pillar).toBe('DATA')
      expect(error.operation).toBe('validate')
    })

    it('should handle validation options correctly', () => {
      const userSchema = nativeSchema.object({
        id: nativeSchema.string(),
        name: nativeSchema.string()
      })

      const testData = { id: 'user-123', name: 'John', extra: 'field' }
      const result = validate(testData, userSchema, {
        stripUnknown: true,
        coerce: false
      })
      
      // Should validate successfully even with extra field when stripUnknown is true
      ResultTestUtils.expectOk(result)
    })
  })

  describe('transform() method', () => {
    it('should transform data with simple field mapping', () => {
      const input = { firstName: 'John', lastName: 'Doe', userAge: 30 }
      const mapping: TransformMapping<typeof input, { name: string; surname: string; age: number }> = {
        name: 'firstName' as keyof typeof input,
        surname: 'lastName' as keyof typeof input,
        age: 'userAge' as keyof typeof input
      }

      const result = transform(input, mapping)
      
      const transformed = ResultTestUtils.expectOk(result)
      expect(transformed).toEqual({
        name: 'John',
        surname: 'Doe',
        age: 30
      })
    })

    it('should transform data with function mappings', () => {
      const input = { firstName: 'john', lastName: 'doe' }
      const mapping = {
        fullName: (data: typeof input) => `${data.firstName} ${data.lastName}`,
        displayName: (data: typeof input) => `${data.firstName.toUpperCase()} ${data.lastName.toUpperCase()}`
      }

      const result = transform(input, mapping)
      
      const transformed = ResultTestUtils.expectOk(result)
      expect(transformed).toEqual({
        fullName: 'john doe',
        displayName: 'JOHN DOE'
      })
    })

    it('should transform individual objects from array', () => {
      const input = { firstName: 'John', age: 30 }
      const mapping: TransformMapping<typeof input, { name: string; years: number }> = {
        name: 'firstName' as keyof typeof input,
        years: 'age' as keyof typeof input
      }

      const result = transform(input, mapping)
      
      const transformed = ResultTestUtils.expectOk(result)
      expect(transformed).toEqual({
        name: 'John', 
        years: 30
      })
    })

    it('should handle complex transform definitions', () => {
      const input = { user: { name: 'John' }, timestamp: '2024-01-01' }
      const mapping: TransformMapping<typeof input, { userName: string; createdAt: string; defaultField: string }> = {
        userName: { 
          source: 'user' as keyof typeof input,
          fn: (value: { name: string } | string) => (value as { name: string }).name
        },
        createdAt: { 
          source: 'timestamp' as keyof typeof input,
          fn: (value: { name: string } | string) => new Date(value as string).toISOString()
        },
        defaultField: { 
          fn: (_value: { name: string } | string) => 'default-value',
          default: 'default-value' as string
        }
      }

      const result = transform(input, mapping)
      
      const transformed = ResultTestUtils.expectOk(result)
      expect(transformed.userName).toBe('John')
      expect(transformed.createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(transformed.defaultField).toBe('default-value')
    })

    it('should handle transform options correctly', () => {
      const input = { name: 'John', age: 30 }
      const mapping: TransformMapping<typeof input, { displayName: string; years: number; missingField: string }> = {
        displayName: 'name' as keyof typeof input,
        years: 'age' as keyof typeof input,
        missingField: { 
          fn: (_value: string | number) => 'default-value',
          default: 'default-value' as string
        }
      }

      const result = transform(input, mapping, {
        strict: false,
        defaults: true,
        timezone: 'UTC'
      })
      
      const transformed = ResultTestUtils.expectOk(result)
      expect(transformed.displayName).toBe('John')
      expect(transformed.years).toBe(30)
    })
  })

  describe('aggregate() method', () => {
    it('should perform basic aggregation operations', () => {
      const salesData = [
        { region: 'North', amount: 1000, quantity: 10 },
        { region: 'North', amount: 1500, quantity: 15 },
        { region: 'South', amount: 2000, quantity: 20 },
        { region: 'South', amount: 1200, quantity: 12 }
      ]

      const result = aggregate(salesData, {
        groupBy: 'region',
        sum: ['amount', 'quantity'],
        avg: 'amount',
        count: '*'
      })
      
      const aggregated = ResultTestUtils.expectOk(result)
      expect(aggregated.groups).toBeDefined()
      expect(aggregated.totals).toBeDefined()
      expect(aggregated.averages).toBeDefined()
      expect(aggregated.counts).toBeDefined()
    })

    it('should handle multiple groupBy fields', () => {
      const data = [
        { region: 'North', department: 'Sales', revenue: 1000 },
        { region: 'North', department: 'Marketing', revenue: 800 },
        { region: 'South', department: 'Sales', revenue: 1200 }
      ]

      const result = aggregate(data, {
        groupBy: ['region', 'department'],
        sum: 'revenue',
        count: '*'
      })
      
      const aggregated = ResultTestUtils.expectOk(result)
      expect(Object.keys(aggregated.groups).length).toBeGreaterThan(0)
    })

    it('should handle custom aggregation functions', () => {
      const data = [
        { name: 'Product A', sales: [100, 200, 150] },
        { name: 'Product B', sales: [300, 250, 400] }
      ]

      const result = aggregate(data, {
        custom: {
          totalSalesSum: (items: unknown[]) => {
            const typedItems = items as typeof data
            return typedItems.reduce((sum, item) => sum + item.sales.reduce((s, v) => s + v, 0), 0)
          },
          productCount: (items: unknown[]) => items.length
        }
      })
      
      const aggregated = ResultTestUtils.expectOk(result)
      expect(aggregated.custom).toBeDefined()
    })

    it('should handle min and max operations', () => {
      const data = [
        { category: 'A', value: 10 },
        { category: 'A', value: 20 },
        { category: 'B', value: 5 },
        { category: 'B', value: 15 }
      ]

      const result = aggregate(data, {
        groupBy: 'category',
        min: 'value',
        max: 'value'
      })
      
      const aggregated = ResultTestUtils.expectOk(result)
      expect(aggregated.minimums).toBeDefined()
      expect(aggregated.maximums).toBeDefined()
    })

    it('should handle invalid input gracefully', () => {
      const result = aggregate('not-an-array' as unknown as unknown[], {
        sum: 'field'
      })
      
      const error = ResultTestUtils.expectErrType(result, 'DATA_ERROR')
      expect(error.message).toContain('Input must be an array')
    })
  })

  describe('groupBy() method', () => {
    it('should group by single field', () => {
      const users = MockDataGenerator.users(4)
      users[0]!.department = 'Engineering'
      users[1]!.department = 'Engineering'
      users[2]!.department = 'Sales'
      users[3]!.department = 'Sales'

      const result = groupBy(users, 'department')
      
      const grouped = ResultTestUtils.expectOk(result)
      expect(grouped.Engineering).toHaveLength(2)
      expect(grouped.Sales).toHaveLength(2)
    })

    it('should group by multiple fields', () => {
      const data = [
        { region: 'North', active: true, name: 'User1' },
        { region: 'North', active: false, name: 'User2' },
        { region: 'South', active: true, name: 'User3' }
      ]

      const result = groupBy(data, ['region', 'active'])
      
      const grouped = ResultTestUtils.expectOk(result)
      expect(Object.keys(grouped)).toContain('North-true')
      expect(Object.keys(grouped)).toContain('North-false')
      expect(Object.keys(grouped)).toContain('South-true')
    })

    it('should group using custom function', () => {
      const users = MockDataGenerator.users(3)
      users[0]!.salary = 50000
      users[1]!.salary = 75000
      users[2]!.salary = 100000

      const result = groupBy(users, (user) => 
        user.salary < 60000 ? 'junior' : user.salary < 90000 ? 'mid' : 'senior'
      )
      
      const grouped = ResultTestUtils.expectOk(result)
      expect(grouped.junior).toBeDefined()
      expect(grouped.mid).toBeDefined()
      expect(grouped.senior).toBeDefined()
    })

    it('should handle groupBy options correctly', () => {
      const data = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 }
      ]

      const result = groupBy(data, 'category', {
        preserveOrder: true,
        includeEmpty: false
      })
      
      ResultTestUtils.expectOk(result)
    })
  })

  describe('serialize() method', () => {
    it('should serialize to JSON format', () => {
      const data = MockDataGenerator.user()
      
      const result = serialize(data, 'json')
      
      const serialized = ResultTestUtils.expectOk(result)
      expect(typeof serialized).toBe('string')
      expect(JSON.parse(serialized as string)).toEqual(data)
    })

    it('should serialize to pretty JSON', () => {
      const data = { name: 'John', age: 30 }
      
      const result = serialize(data, 'json', { pretty: true })
      
      const serialized = ResultTestUtils.expectOk(result)
      expect(serialized).toContain('\n') // Pretty printing includes newlines
    })

    it('should serialize array to CSV format', () => {
      const users = MockDataGenerator.users(2)
      
      const result = serialize(users, 'csv', { headers: true })
      
      const csv = ResultTestUtils.expectOk(result) as string
      expect(csv).toContain('id,name,email') // Headers
      expect(csv.split('\n').length).toBeGreaterThan(2) // Headers + data rows
    })

    it('should handle CSV serialization options', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ]
      
      const result = serialize(data, 'csv', {
        headers: true,
        delimiter: ';'
      })
      
      const csv = ResultTestUtils.expectOk(result) as string
      expect(csv).toContain(';') // Custom delimiter
    })

    it('should serialize to XML format', () => {
      const data = { user: { name: 'John', age: 30 } }
      
      const result = serialize(data, 'xml')
      
      const xml = ResultTestUtils.expectOk(result) as string
      expect(xml).toContain('<user>')
      expect(xml).toContain('<name>John</name>')
      expect(xml).toContain('<age>30</age>')
    })

    it('should handle YAML serialization', () => {
      const data = { name: 'John', preferences: { theme: 'dark', language: 'en' } }
      
      const result = serialize(data, 'yaml')
      
      const yaml = ResultTestUtils.expectOk(result) as string
      expect(yaml).toContain('name: John')
      expect(yaml).toContain('preferences:')
    })

    it('should handle serialization with encoding options', () => {
      const data = { message: 'Hello 世界' }
      
      const result = serialize(data, 'json', {
        encoding: 'utf8',
        escapeUnicode: false
      })
      
      const serialized = ResultTestUtils.expectOk(result) as string
      expect(serialized).toContain('世界')
    })

    it('should handle circular reference errors', () => {
      const circular: Record<string, unknown> = { name: 'test' }
      circular.self = circular
      
      const result = serialize(circular, 'json')
      
      const error = ResultTestUtils.expectErrType(result, 'DATA_ERROR')
      expect(error.message).toContain('circular')
    })

    it('should handle unsupported formats gracefully', () => {
      const data = { test: 'data' }
      
      const result = serialize(data, 'unsupported' as unknown as SerializationFormat)
      
      const error = ResultTestUtils.expectErrType(result, 'DATA_ERROR')
      expect(error.message).toContain('Unsupported serialization format')
    })
  })

  describe('clone() method', () => {
    it('should deep clone simple objects', () => {
      const original = MockDataGenerator.user()
      
      const result = clone(original)
      
      const cloned = ResultTestUtils.expectOk(result)
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original) // Different object reference
    })

    it('should handle deep cloning with nested objects', () => {
      const original = {
        user: MockDataGenerator.user(),
        metadata: {
          tags: ['admin', 'user'],
          settings: { theme: 'dark', notifications: true }
        }
      }
      
      const result = clone(original)
      
      const cloned = ResultTestUtils.expectOk(result)
      expect(cloned).toEqual(original)
      expect(cloned.metadata).not.toBe(original.metadata)
      expect(cloned.metadata.tags).not.toBe(original.metadata.tags)
    })

    it('should handle shallow clone option', () => {
      const original = { name: 'John', nested: { value: 42 } }
      
      const result = clone(original, { deep: false })
      
      const cloned = ResultTestUtils.expectOk(result)
      expect(cloned).not.toBe(original)
      expect(cloned.nested).toBe(original.nested) // Shallow clone shares nested reference
    })

    it('should handle circular references', () => {
      const original: Record<string, unknown> = { name: 'test' }
      original.self = original
      
      const result = clone(original, { handleCircular: true })
      
      const cloned = ResultTestUtils.expectOk(result)
      expect(cloned.name).toBe('test')
      expect(cloned.self).toBe(cloned) // Circular reference preserved
    })

    it('should handle Date objects correctly', () => {
      const original = {
        createdAt: new Date('2024-01-01'),
        metadata: { timestamp: new Date('2024-01-02') }
      }
      
      const result = clone(original)
      
      const cloned = ResultTestUtils.expectOk(result)
      expect(cloned.createdAt).toEqual(original.createdAt)
      expect(cloned.createdAt).not.toBe(original.createdAt)
      expect(cloned.metadata.timestamp instanceof Date).toBe(true)
    })

    it('should handle arrays correctly', () => {
      const original = {
        tags: ['admin', 'user'],
        nested: [{ id: 1 }, { id: 2 }]
      }
      
      const result = clone(original)
      
      const cloned = ResultTestUtils.expectOk(result)
      expect(cloned.tags).toEqual(original.tags)
      expect(cloned.tags).not.toBe(original.tags)
      expect(cloned.nested[0]).not.toBe(original.nested[0])
    })

    it('should handle primitive values', () => {
      const primitives = [null, undefined, 'string', 42, true, false]
      
      for (const primitive of primitives) {
        const result = clone(primitive)
        const cloned = ResultTestUtils.expectOk(result)
        expect(cloned).toBe(primitive)
      }
    })

    it('should handle clone options correctly', () => {
      const original = { name: 'John', nested: { value: 42 } }
      
      const result = clone(original, {
        deep: true,
        preservePrototype: false,
        handleCircular: true
      })
      
      ResultTestUtils.expectOk(result)
    })
  })

  describe('merge() method', () => {
    it('should merge objects with source-wins strategy', () => {
      const target = { a: 1, b: 2, c: { x: 1 } }
      const source = { b: 3, c: { x: 2 } }
      
      const result = merge(target, [source], {
        strategy: 'source-wins',
        deep: true
      })
      
      const merged = ResultTestUtils.expectOk(result)
      expect(merged.a).toBe(1) // From target
      expect(merged.b).toBe(3) // From source (wins)
      expect(merged.c.x).toBe(2) // Source wins in deep merge
    })

    it('should handle array merging strategies', () => {
      const target = { tags: ['admin'] }
      const source = { tags: ['user', 'guest'] }
      
      const concatResult = merge(target, [source], {
        arrays: 'concat'
      })
      
      const concatenated = ResultTestUtils.expectOk(concatResult)
      expect(concatenated.tags).toEqual(['admin', 'user', 'guest'])
      
      const replaceResult = merge(target, [source], {
        arrays: 'replace'
      })
      
      const replaced = ResultTestUtils.expectOk(replaceResult)
      expect(replaced.tags).toEqual(['user', 'guest'])
    })

    it('should handle multiple source objects', () => {
      const target = { a: 1, b: 0, c: 0 }
      const source1 = { b: 2 }
      const source2 = { c: 3 }
      const source3 = { a: 1 }
      
      const result = merge(target, [source1, source2, source3])
      
      const merged = ResultTestUtils.expectOk(result)
      expect(merged).toEqual({ a: 1, b: 2, c: 3 })
    })

    it('should handle target-wins strategy', () => {
      const target = { a: 1, b: 2 }
      const source = { b: 3, a: 5 }
      
      const result = merge(target, [source], {
        strategy: 'target-wins'
      })
      
      const merged = ResultTestUtils.expectOk(result)
      expect(merged.a).toBe(1) // Target wins
      expect(merged.b).toBe(2) // Target wins
    })
  })

  describe('deserialize() method', () => {
    it('should deserialize JSON format correctly', () => {
      const original = MockDataGenerator.user()
      const jsonString = JSON.stringify(original)
      
      const result = deserialize(jsonString, 'json')
      
      const deserialized = ResultTestUtils.expectOk(result)
      expect(deserialized).toEqual(original)
    })

    it('should deserialize CSV to array of objects', () => {
      const csvData = 'name,age,active\nJohn,30,true\nJane,25,false'
      
      const result = deserialize(csvData, 'csv', undefined, {
        headers: true,
        delimiter: ','
      })
      
      const deserialized = ResultTestUtils.expectOk(result) as Record<string, unknown>[]
      expect(Array.isArray(deserialized)).toBe(true)
      expect(deserialized).toHaveLength(2)
      expect((deserialized[0] as Record<string, unknown>).name).toBe('John')
      expect((deserialized[0] as Record<string, unknown>).age).toBe('30') // CSV values are strings by default
    })

    it('should deserialize XML format', () => {
      const xmlData = '<user><name>John</name><age>30</age></user>'
      
      const result = deserialize(xmlData, 'xml')
      
      const deserialized = ResultTestUtils.expectOk(result)
      expect(deserialized).toBeDefined()
    })

    it('should deserialize YAML format', () => {
      const yamlData = 'name: John\nage: 30\npreferences:\n  theme: dark'
      
      const result = deserialize(yamlData, 'yaml')
      
      const deserialized = ResultTestUtils.expectOk(result) as Record<string, unknown>
      expect(deserialized.name).toBe('John')
      expect(deserialized.age).toBe(30)
      expect((deserialized.preferences as Record<string, unknown>).theme).toBe('dark')
    })

    it('should handle malformed JSON gracefully', () => {
      const invalidJson = '{ invalid json }'
      
      const result = deserialize(invalidJson, 'json')
      
      const error = ResultTestUtils.expectErrType(result, 'DATA_ERROR')
      expect(error.message).toContain('Invalid JSON')
    })

    it('should handle type coercion options', () => {
      const csvData = 'name,age,salary\nJohn,30,75000.50'
      
      const result = deserialize(csvData, 'csv', undefined, {
        headers: true,
        coerceTypes: true
      })
      
      const deserialized = ResultTestUtils.expectOk(result) as Record<string, unknown>[]
      expect(typeof (deserialized[0] as Record<string, unknown>).age).toBe('number')
      expect(typeof (deserialized[0] as Record<string, unknown>).salary).toBe('number')
    })

    it('should handle empty input gracefully', () => {
      const result = deserialize('', 'json')
      
      const error = ResultTestUtils.expectErrType(result, 'DATA_ERROR')
      expect(error.message).toContain('Empty input')
    })

    it('should handle unsupported formats', () => {
      const result = deserialize('test data', 'unsupported' as unknown as SerializationFormat)
      
      const error = ResultTestUtils.expectErrType(result, 'DATA_ERROR')
      expect(error.message).toContain('Unsupported deserialization format')
    })
  })

  describe('convert() method', () => {
    it('should convert between compatible schemas', () => {
      const sourceSchema = nativeSchema.object({
        id: nativeSchema.string(),
        fullName: nativeSchema.string(),
        userAge: nativeSchema.number()
      })

      const targetSchema = nativeSchema.object({
        id: nativeSchema.string(),
        name: nativeSchema.string(),
        age: nativeSchema.number()
      })

      const sourceData = { id: 'user-123', fullName: 'John Doe', userAge: 30 }
      const mapping = {
        id: 'id',
        name: 'fullName',
        age: 'userAge'
      }

      const result = convert(sourceData, sourceSchema, targetSchema, mapping)
      
      const converted = ResultTestUtils.expectOk(result)
      expect(converted).toEqual({ id: 'user-123', name: 'John Doe', age: 30 })
    })

    it('should handle schema version migration', () => {
      const sourceSchema = nativeSchema.object({
        user_name: nativeSchema.string(),
        user_email: nativeSchema.string()
      })

      const targetSchema = nativeSchema.object({
        name: nativeSchema.string(),
        email: nativeSchema.string(),
        version: nativeSchema.number()
      })

      const sourceData = { user_name: 'John', user_email: 'john@example.com' }
      const migration = {
        name: 'user_name',
        email: 'user_email',
        version: () => 2 // Default value function
      }

      const result = convert(sourceData, sourceSchema, targetSchema, migration)
      
      const migrated = ResultTestUtils.expectOk(result)
      expect(migrated.name).toBe('John')
      expect(migrated.email).toBe('john@example.com')
      expect(migrated.version).toBe(2)
    })

    it('should handle conversion errors gracefully', () => {
      const sourceSchema = nativeSchema.object({
        value: nativeSchema.string()
      })

      const targetSchema = nativeSchema.object({
        number: nativeSchema.number()
      })

      const invalidData = { value: 'not-a-number' }
      const mapping = { number: 'value' }

      const result = convert(invalidData, sourceSchema, targetSchema, mapping)
      
      const error = ResultTestUtils.expectErrType(result, 'DATA_ERROR')
      expect(error.operation).toBe('convert')
    })

    it('should handle complex field transformations', () => {
      const sourceSchema = nativeSchema.object({
        firstName: nativeSchema.string(),
        lastName: nativeSchema.string(),
        birthDate: nativeSchema.string()
      })

      const targetSchema = nativeSchema.object({
        fullName: nativeSchema.string(),
        age: nativeSchema.number()
      })

      const sourceData = {
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01'
      }

      const conversion = {
        fullName: (data: typeof sourceData) => `${data.firstName} ${data.lastName}`,
        age: (data: typeof sourceData) => {
          const birth = new Date(data.birthDate)
          const now = new Date()
          return now.getFullYear() - birth.getFullYear()
        }
      }

      const result = convert(sourceData, sourceSchema, targetSchema, conversion)
      
      const converted = ResultTestUtils.expectOk(result)
      expect(converted.fullName).toBe('John Doe')
      expect(converted.age).toBeGreaterThan(30)
    })
  })

  describe('Configuration Object Pattern', () => {
    it('should apply default configurations correctly', () => {
      const data = { test: 'value' }
      
      // Test with minimal options
      const result = serialize(data, 'json', {})
      
      ResultTestUtils.expectOk(result)
    })

    it('should merge user options with defaults', () => {
      const users = MockDataGenerator.users(2)
      
      const result = groupBy(users, 'department', {
        preserveOrder: false // Override default
      })
      
      ResultTestUtils.expectOk(result)
    })

    it('should handle complex configuration merging', () => {
      const data = [
        { region: 'North', sales: 1000 },
        { region: 'South', sales: 1500 }
      ]
      
      const result = aggregate(data, {
        groupBy: 'region',
        sum: 'sales'
      }, {
        parallel: true,
        cache: false
      })
      
      ResultTestUtils.expectOk(result)
    })
  })

  describe('Error Handling Patterns', () => {
    it('should create appropriate error types', () => {
      // Test validation error
      const invalidSchema = nativeSchema.string()
      const invalidData = 123
      const validationResult = validate(invalidData, invalidSchema)
      
      const validationError = ResultTestUtils.expectErr(validationResult)
      expect(validationError.code).toBe('DATA_ERROR')
      expect(validationError.pillar).toBe('DATA')

      // Test aggregation error with invalid input
      const aggregationResult = aggregate('invalid' as unknown as unknown[], { sum: 'field' })
      const aggregationError = ResultTestUtils.expectErrType(aggregationResult, 'DATA_ERROR')
      expect(aggregationError.operation).toBe('aggregate')
    })

    it('should include proper context in errors', () => {
      const invalidData = 'not-an-array'
      const result = aggregate(invalidData as unknown as unknown[], { sum: 'field' })
      
      const error = ResultTestUtils.expectErrType(result, 'DATA_ERROR')
      expect(error.context).toBeDefined()
      expect(error.timestamp).toBeTypeOf('number')
    })
  })

  describe('Result Pattern Compliance', () => {
    it('should always return Result type', () => {
      const data = MockDataGenerator.user()
      
      const cloneResult = clone(data)
      const serializeResult = serialize(data, 'json')
      
      expect(Result.isOk(cloneResult) || Result.isErr(cloneResult)).toBe(true)
      expect(Result.isOk(serializeResult) || Result.isErr(serializeResult)).toBe(true)
    })

    it('should never throw exceptions', () => {
      // Test with completely invalid inputs
      expect(() => {
        const result = aggregate('completely-invalid' as unknown as unknown[], { sum: 'field' })
        // Should return Err Result, not throw
        expect(Result.isErr(result)).toBe(true)
      }).not.toThrow()
    })
  })
})