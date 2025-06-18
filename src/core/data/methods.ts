/**
 * DATA Pillar Core Methods
 * 
 * Implements the 10 core DATA methods according to V2 specifications:
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

import { Result, Schema, schema as nativeSchema } from '../shared'
import { DataError, createDataError } from '../shared'
import { mergeOptions } from '../shared/config'
import {
  SchemaOptions,
  DataValidationOptions,
  DataTransformOptions,
  ConvertOptions,
  AggregateOptions,
  GroupByOptions,
  SerializeOptions,
  DeserializeOptions,
  CloneOptions,
  MergeOptions,
  DataResult,
  SchemaDefinition,
  TransformMapping,
  TransformContext,
  AggregateOperations,
  AggregateResult,
  SerializationFormat,
  MigrationFunction,
  PropertyPath,
  GroupByKeyFunction
} from './types'
import { 
  get, 
  set, 
  has, 
  inferType, 
  isValid, 
  unique, 
  flatten, 
  deepClone, 
  isPlainObject, 
  isEmpty 
} from './utils'

/**
 * Create native schema for validation
 */
export const schema = <T>(
  definition: SchemaDefinition<T>,
  options: SchemaOptions = {}
): Schema<T> => {
  const opts = mergeOptions({
    strict: true,
    timestamps: false,
    coerce: false
  }, options)
  
  try {
    // Convert definition to native schema format
    const schemaFields: Record<string, any> = {}
    
    for (const [key, field] of Object.entries(definition)) {
      if (typeof field === 'string') {
        // Simple type definition
        schemaFields[key] = { type: field }
      } else {
        // Full field definition
        schemaFields[key] = field
      }
    }
    
    // Add timestamps if requested
    if (opts.timestamps) {
      schemaFields.createdAt = { type: 'date', default: () => new Date() }
      schemaFields.updatedAt = { type: 'date', default: () => new Date() }
    }
    
    return nativeSchema(schemaFields, {
      strict: opts.strict,
      coerce: opts.coerce
    })
  } catch (error: any) {
    throw createDataError(
      'schema',
      `Failed to create schema: ${error.message}`,
      { definition, error }
    )
  }
}

/**
 * Validate data against schema
 */
export const validate = <T>(
  input: unknown,
  schema: Schema<T>,
  options: DataValidationOptions = {}
): DataResult<T> => {
  const opts = mergeOptions({
    coerce: false,
    stripUnknown: false,
    collectErrors: false
  }, options)
  
  try {
    const result = schema.validate(input)
    
    if (Result.isError(result)) {
      return Result.error(createDataError(
        'validate',
        'Validation failed',
        { input, errors: result.error, options: opts }
      ))
    }
    
    return Result.ok(result.value)
  } catch (error: any) {
    return Result.error(createDataError(
      'validate',
      `Schema validation error: ${error.message}`,
      { input, error }
    ))
  }
}

/**
 * Transform data structure according to mapping
 */
export const transform = <TInput, TOutput>(
  input: TInput,
  mapping: TransformMapping<TInput, TOutput>,
  options: DataTransformOptions = {}
): DataResult<TOutput> => {
  const opts = mergeOptions({
    strict: false,
    defaults: true,
    computed: true
  }, options)
  
  try {
    const context: TransformContext = {
      timezone: opts.timezone || 'UTC',
      timestamp: new Date(),
      ...opts.context
    }
    
    // Handle array input
    if (Array.isArray(input)) {
      const results = input.map(item => transformSingle(item, mapping, context, opts))
      return Result.ok(results as TOutput)
    }
    
    // Transform single object
    const result = transformSingle(input, mapping, context, opts)
    return Result.ok(result as TOutput)
    
  } catch (error: any) {
    return Result.error(createDataError(
      'transform',
      `Transformation failed: ${error.message}`,
      { input, mapping, error }
    ))
  }
}

/**
 * Internal function to transform a single object
 */
const transformSingle = <TInput, TOutput>(
  input: TInput,
  mapping: TransformMapping<TInput, TOutput>,
  context: TransformContext,
  options: DataTransformOptions
): Partial<TOutput> => {
  const result: any = {}
  
  for (const [targetKey, transform] of Object.entries(mapping)) {
    try {
      let value: unknown
      
      if (typeof transform === 'string') {
        // Simple field mapping
        value = get(input as any, transform)
      } else if (typeof transform === 'function') {
        // Transform function
        value = transform(input, context)
      } else if (typeof transform === 'object' && transform !== null) {
        // Complex transform definition
        const sourceKey = transform.source || targetKey
        const sourceValue = get(input as any, sourceKey)
        
        if (transform.fn) {
          value = transform.fn(sourceValue, context)
        } else {
          value = sourceValue
        }
        
        // Apply default if value is undefined
        if (value === undefined && 'default' in transform) {
          value = transform.default
        }
      }
      
      // Set the transformed value
      if (value !== undefined || options.defaults) {
        result[targetKey] = value
      }
      
    } catch (error: any) {
      if (options.strict) {
        throw error
      }
      // Skip failed transformations in non-strict mode
    }
  }
  
  return result
}

/**
 * Convert between different data schemas
 */
export const convert = <TInput, TOutput>(
  input: TInput,
  fromSchema: Schema<TInput>,
  toSchema: Schema<TOutput>,
  options: ConvertOptions = {}
): DataResult<TOutput> => {
  const opts = mergeOptions({
    strict: false,
    fillDefaults: true
  }, options)
  
  try {
    // First validate input against source schema
    const validationResult = validate(input, fromSchema)
    if (Result.isError(validationResult)) {
      return Result.error(createDataError(
        'convert',
        'Input validation failed',
        { validation: validationResult.error }
      ))
    }
    
    let converted: unknown = validationResult.value
    
    // Apply migration function if provided
    if (opts.migration) {
      converted = opts.migration(converted as TInput, {
        timestamp: new Date(),
        ...opts.context
      })
    }
    
    // Validate against target schema
    const targetValidation = validate(converted, toSchema)
    if (Result.isError(targetValidation)) {
      return Result.error(createDataError(
        'convert',
        'Target schema validation failed',
        { validation: targetValidation.error }
      ))
    }
    
    return Result.ok(targetValidation.value)
    
  } catch (error: any) {
    return Result.error(createDataError(
      'convert',
      `Schema conversion failed: ${error.message}`,
      { input, error }
    ))
  }
}

/**
 * Perform statistical operations on data collections
 */
export const aggregate = <T, R = AggregateResult>(
  input: T[],
  operations: AggregateOperations,
  options: AggregateOptions = {}
): DataResult<R> => {
  const opts = mergeOptions({
    parallel: false,
    cache: false
  }, options)
  
  try {
    if (!Array.isArray(input)) {
      return Result.error(createDataError(
        'aggregate',
        'Input must be an array',
        { input }
      ))
    }
    
    const result: AggregateResult = {
      groups: {},
      totals: {},
      averages: {},
      counts: {},
      minimums: {},
      maximums: {},
      custom: {}
    }
    
    // Group data if groupBy is specified
    if (operations.groupBy) {
      const groupKeys = Array.isArray(operations.groupBy) 
        ? operations.groupBy 
        : [operations.groupBy]
      
      result.groups = groupByMultiple(input, groupKeys)
    } else {
      result.groups = { _all: input }
    }
    
    // Process each group
    for (const [groupKey, groupData] of Object.entries(result.groups)) {
      // Sum operations
      if (operations.sum) {
        const sumFields = Array.isArray(operations.sum) ? operations.sum : [operations.sum]
        for (const field of sumFields) {
          const key = `${groupKey}.${field}`
          result.totals[key] = sumField(groupData, field)
        }
      }
      
      // Average operations
      if (operations.avg) {
        const avgFields = Array.isArray(operations.avg) ? operations.avg : [operations.avg]
        for (const field of avgFields) {
          const key = `${groupKey}.${field}`
          result.averages[key] = averageField(groupData, field)
        }
      }
      
      // Count operations
      if (operations.count) {
        const key = `${groupKey}.count`
        result.counts[key] = operations.count === '*' 
          ? groupData.length 
          : countField(groupData, operations.count)
      }
      
      // Min operations
      if (operations.min) {
        const minFields = Array.isArray(operations.min) ? operations.min : [operations.min]
        for (const field of minFields) {
          const key = `${groupKey}.${field}`
          result.minimums[key] = minField(groupData, field)
        }
      }
      
      // Max operations
      if (operations.max) {
        const maxFields = Array.isArray(operations.max) ? operations.max : [operations.max]
        for (const field of maxFields) {
          const key = `${groupKey}.${field}`
          result.maximums[key] = maxField(groupData, field)
        }
      }
      
      // Custom operations
      if (operations.custom) {
        for (const [customKey, customFn] of Object.entries(operations.custom)) {
          const key = `${groupKey}.${customKey}`
          result.custom[key] = customFn(groupData)
        }
      }
    }
    
    return Result.ok(result as R)
    
  } catch (error: any) {
    return Result.error(createDataError(
      'aggregate',
      `Aggregation failed: ${error.message}`,
      { input, operations, error }
    ))
  }
}

/**
 * Group data by specified criteria
 */
export const groupBy = <T, K extends keyof T>(
  input: T[],
  keys: K | K[] | GroupByKeyFunction<T>,
  options: GroupByOptions = {}
): DataResult<Record<string, T[]>> => {
  const opts = mergeOptions({
    preserveOrder: true,
    includeEmpty: false
  }, options)
  
  try {
    if (!Array.isArray(input)) {
      return Result.error(createDataError(
        'groupBy',
        'Input must be an array',
        { input }
      ))
    }
    
    const groups: Record<string, T[]> = {}
    
    // Determine key function
    let keyFn: GroupByKeyFunction<T>
    
    if (typeof keys === 'function') {
      keyFn = keys
    } else if (Array.isArray(keys)) {
      keyFn = (item: T) => keys.map(key => String(item[key])).join('-')
    } else {
      keyFn = (item: T) => String(item[keys])
    }
    
    // Group items
    for (const item of input) {
      const key = keyFn(item)
      
      if (!groups[key]) {
        groups[key] = []
      }
      
      groups[key].push(item)
    }
    
    // Remove empty groups if not included
    if (!opts.includeEmpty) {
      for (const [key, group] of Object.entries(groups)) {
        if (group.length === 0) {
          delete groups[key]
        }
      }
    }
    
    return Result.ok(groups)
    
  } catch (error: any) {
    return Result.error(createDataError(
      'groupBy',
      `Grouping failed: ${error.message}`,
      { input, keys, error }
    ))
  }
}

/**
 * Serialize data to various formats
 */
export const serialize = <T>(
  input: T,
  format: SerializationFormat,
  options: SerializeOptions = {}
): DataResult<string | Buffer> => {
  const opts = mergeOptions({
    pretty: false,
    dateFormat: 'iso' as const,
    excludePrivate: false
  }, options)
  
  try {
    switch (format) {
      case 'json':
        return serializeJSON(input, opts)
      case 'csv':
        return serializeCSV(input, opts)
      case 'xml':
        return serializeXML(input, opts)
      case 'yaml':
        return serializeYAML(input, opts)
      default:
        return Result.error(createDataError(
          'serialize',
          `Unsupported serialization format: ${format}`,
          { format }
        ))
    }
  } catch (error: any) {
    return Result.error(createDataError(
      'serialize',
      `Serialization failed: ${error.message}`,
      { input, format, error }
    ))
  }
}

/**
 * Deserialize data from various formats
 */
export const deserialize = <T>(
  input: string | Buffer,
  format: SerializationFormat,
  schema: Schema<T>,
  options: DeserializeOptions = {}
): DataResult<T> => {
  const opts = mergeOptions({
    strict: true,
    coerce: false
  }, options)
  
  try {
    let parsed: unknown
    
    switch (format) {
      case 'json':
        parsed = deserializeJSON(input, opts)
        break
      case 'csv':
        parsed = deserializeCSV(input, opts)
        break
      case 'xml':
        parsed = deserializeXML(input, opts)
        break
      case 'yaml':
        parsed = deserializeYAML(input, opts)
        break
      default:
        return Result.error(createDataError(
          'deserialize',
          `Unsupported deserialization format: ${format}`,
          { format }
        ))
    }
    
    // Validate against schema
    return validate(parsed, schema, opts)
    
  } catch (error: any) {
    return Result.error(createDataError(
      'deserialize',
      `Deserialization failed: ${error.message}`,
      { input, format, error }
    ))
  }
}

/**
 * Deep clone data structures
 */
export const clone = <T>(
  input: T,
  options: CloneOptions = {}
): DataResult<T> => {
  const opts = mergeOptions({
    deep: true,
    preservePrototype: false,
    handleCircular: true
  }, options)
  
  try {
    const cloned = deepClone(input, opts)
    return Result.ok(cloned)
  } catch (error: any) {
    return Result.error(createDataError(
      'clone',
      `Cloning failed: ${error.message}`,
      { input, error }
    ))
  }
}

/**
 * Merge multiple data objects
 */
export function merge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): DataResult<T>
export function merge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
  options: MergeOptions
): DataResult<T>
export function merge<T extends Record<string, unknown>>(
  target: T,
  ...args: any[]
): DataResult<T> {
  try {
    // Parse arguments
    let sources: Partial<T>[]
    let options: MergeOptions = {}
    
    if (args.length > 0 && isPlainObject(args[args.length - 1]) && 'deep' in args[args.length - 1]) {
      // Last argument is options
      options = args.pop()
      sources = args
    } else {
      sources = args
    }
    
    const opts = mergeOptions({
      deep: true,
      strategy: 'source-wins' as const,
      arrays: 'replace' as const
    }, options)
    
    let result = deepClone(target)
    
    for (const source of sources) {
      result = mergeObjects(result, source, opts)
    }
    
    return Result.ok(result)
    
  } catch (error: any) {
    return Result.error(createDataError(
      'merge',
      `Merge failed: ${error.message}`,
      { target, sources: args, error }
    ))
  }
}

// Internal helper functions

const groupByMultiple = <T>(input: T[], keys: string[]): Record<string, T[]> => {
  const groups: Record<string, T[]> = {}
  
  for (const item of input) {
    const groupKey = keys.map(key => String(get(item as any, key))).join('-')
    
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    
    groups[groupKey].push(item)
  }
  
  return groups
}

const sumField = <T>(items: T[], field: string): number => {
  return items.reduce((sum, item) => {
    const value = get(item as any, field)
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)
}

const averageField = <T>(items: T[], field: string): number => {
  const values = items.map(item => get(item as any, field)).filter(v => typeof v === 'number')
  return values.length > 0 ? values.reduce((sum, val) => sum + (val as number), 0) / values.length : 0
}

const countField = <T>(items: T[], field: string): number => {
  return items.filter(item => get(item as any, field) !== undefined).length
}

const minField = <T>(items: T[], field: string): unknown => {
  const values = items.map(item => get(item as any, field)).filter(v => v !== undefined)
  return values.length > 0 ? Math.min(...values.filter(v => typeof v === 'number') as number[]) : undefined
}

const maxField = <T>(items: T[], field: string): unknown => {
  const values = items.map(item => get(item as any, field)).filter(v => v !== undefined)
  return values.length > 0 ? Math.max(...values.filter(v => typeof v === 'number') as number[]) : undefined
}

const serializeJSON = <T>(input: T, options: SerializeOptions): DataResult<string> => {
  try {
    const json = JSON.stringify(input, undefined, options.pretty ? 2 : undefined)
    return Result.ok(json)
  } catch (error: any) {
    return Result.error(createDataError('serialize', `JSON serialization failed: ${error.message}`, { error }))
  }
}

const serializeCSV = <T>(input: T, options: SerializeOptions): DataResult<string> => {
  try {
    if (!Array.isArray(input)) {
      return Result.error(createDataError('serialize', 'CSV serialization requires array input', { input }))
    }
    
    if (input.length === 0) {
      return Result.ok('')
    }
    
    const delimiter = options.delimiter || ','
    const headers = Object.keys(input[0] as any)
    
    let csv = ''
    
    if (options.headers) {
      csv += headers.join(delimiter) + '\n'
    }
    
    for (const row of input) {
      const values = headers.map(header => {
        const value = get(row as any, header)
        return value !== undefined ? String(value) : ''
      })
      csv += values.join(delimiter) + '\n'
    }
    
    return Result.ok(csv)
  } catch (error: any) {
    return Result.error(createDataError('serialize', `CSV serialization failed: ${error.message}`, { error }))
  }
}

const serializeXML = <T>(input: T, options: SerializeOptions): DataResult<string> => {
  // Basic XML serialization - can be enhanced
  return Result.error(createDataError('serialize', 'XML serialization not implemented yet', {}))
}

const serializeYAML = <T>(input: T, options: SerializeOptions): DataResult<string> => {
  // Basic YAML serialization - can be enhanced
  return Result.error(createDataError('serialize', 'YAML serialization not implemented yet', {}))
}

const deserializeJSON = (input: string | Buffer, options: DeserializeOptions): unknown => {
  const str = Buffer.isBuffer(input) ? input.toString(options.encoding || 'utf8') : input
  return JSON.parse(str)
}

const deserializeCSV = (input: string | Buffer, options: DeserializeOptions): unknown[] => {
  const str = Buffer.isBuffer(input) ? input.toString(options.encoding || 'utf8') : input
  const lines = str.split('\n').filter(line => line.trim())
  
  if (lines.length === 0) {
    return []
  }
  
  const delimiter = options.delimiter || ','
  let headers: string[]
  let dataLines: string[]
  
  if (options.headers) {
    headers = lines[0].split(delimiter)
    dataLines = lines.slice(1)
  } else {
    // Generate generic headers
    const firstLine = lines[0].split(delimiter)
    headers = firstLine.map((_, index) => `col${index}`)
    dataLines = lines
  }
  
  return dataLines.map(line => {
    const values = line.split(delimiter)
    const obj: Record<string, string> = {}
    
    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })
    
    return obj
  })
}

const deserializeXML = (input: string | Buffer, options: DeserializeOptions): unknown => {
  // Basic XML deserialization - can be enhanced
  throw new Error('XML deserialization not implemented yet')
}

const deserializeYAML = (input: string | Buffer, options: DeserializeOptions): unknown => {
  // Basic YAML deserialization - can be enhanced
  throw new Error('YAML deserialization not implemented yet')
}

const mergeObjects = <T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
  options: MergeOptions
): T => {
  const result = { ...target }
  
  for (const key in source) {
    const sourceValue = source[key]
    const targetValue = target[key]
    
    if (sourceValue === undefined) {
      continue
    }
    
    if (!has(target, key)) {
      // New property
      result[key] = sourceValue as T[Extract<keyof T, string>]
    } else if (options.deep && isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      // Deep merge objects
      result[key] = mergeObjects(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
        options
      ) as T[Extract<keyof T, string>]
    } else if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      // Handle arrays based on strategy
      if (options.arrays === 'concat') {
        result[key] = [...targetValue, ...sourceValue] as T[Extract<keyof T, string>]
      } else if (options.arrays === 'merge') {
        // Merge arrays by index
        const merged = [...targetValue]
        sourceValue.forEach((item, index) => {
          merged[index] = item
        })
        result[key] = merged as T[Extract<keyof T, string>]
      } else {
        // Replace
        result[key] = sourceValue as T[Extract<keyof T, string>]
      }
    } else {
      // Handle conflicts based on strategy
      if (options.strategy === 'target-wins') {
        // Keep target value
      } else if (options.strategy === 'source-wins') {
        result[key] = sourceValue as T[Extract<keyof T, string>]
      } else if (options.conflictResolver) {
        result[key] = options.conflictResolver(targetValue, sourceValue, key) as T[Extract<keyof T, string>]
      } else {
        // Default to source wins
        result[key] = sourceValue as T[Extract<keyof T, string>]
      }
    }
  }
  
  return result
}