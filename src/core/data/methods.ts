/**
 * DATA Pillar Core Methods
 *
 * Implements the 10 core DATA methods:
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

import { Result, schema as nativeSchema } from '../shared'
import type { Schema } from '../shared'
import { createDataError } from '../shared'
import { mergeOptions } from '../shared/config'
import type {
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
  SchemaFieldDefinition,
  TransformMapping,
  TransformContext,
  TransformFunction,
  AggregateOperations,
  AggregateResult,
  SerializationFormat,
  GroupByKeyFunction,
} from './types'
import { get, has, deepClone, isPlainObject } from './utils'

/**
 * Create native schema for validation
 */
export const schema = <T>(
  definition: SchemaDefinition<T>,
  options: SchemaOptions = {}
): Schema<T> => {
  const opts = mergeOptions(
    {
      strict: true,
      timestamps: false,
      coerce: false,
    },
    options
  )

  try {
    // Convert definition to native schema format
    const schemaFields: Record<string, Schema<unknown>> = {}

    for (const [key, field] of Object.entries(definition)) {
      if (typeof field === 'string') {
        // Simple type definition - convert string to schema
        switch (field) {
          case 'string':
            schemaFields[key] = nativeSchema.string()
            break
          case 'number':
            schemaFields[key] = nativeSchema.number()
            break
          case 'boolean':
            schemaFields[key] = nativeSchema.boolean()
            break
          case 'date':
            schemaFields[key] = nativeSchema.string() // Convert to proper date schema when available
            break
          default:
            schemaFields[key] = nativeSchema.any()
        }
      } else {
        // Full field definition - convert to appropriate schema
        const fieldDef = field as SchemaFieldDefinition
        let fieldSchema: Schema<unknown>

        // Create base schema based on type
        switch (fieldDef.type) {
          case 'string': {
            let stringSchema = nativeSchema.string()

            // Apply string constraints
            if (fieldDef.min !== undefined) {
              stringSchema = stringSchema.min(fieldDef.min)
            }
            if (fieldDef.max !== undefined) {
              stringSchema = stringSchema.max(fieldDef.max)
            }
            if (fieldDef.format === 'email') {
              stringSchema = stringSchema.email()
            }
            if (fieldDef.format === 'url') {
              stringSchema = stringSchema.url()
            }
            if (fieldDef.format === 'uuid') {
              stringSchema = stringSchema.uuid()
            }
            if (fieldDef.pattern) {
              stringSchema = stringSchema.regex(fieldDef.pattern)
            }
            if (fieldDef.enum && Array.isArray(fieldDef.enum)) {
              const enumValues = fieldDef.enum.filter(v => typeof v === 'string')
              if (enumValues.length > 0) {
                fieldSchema = nativeSchema.enum(
                  enumValues as unknown as readonly [string, ...string[]]
                )
                break
              }
            }

            fieldSchema = stringSchema
            break
          }
          case 'number': {
            let numberSchema = nativeSchema.number()

            // Apply number constraints
            if (fieldDef.min !== undefined) {
              numberSchema = numberSchema.min(fieldDef.min)
            }
            if (fieldDef.max !== undefined) {
              numberSchema = numberSchema.max(fieldDef.max)
            }

            fieldSchema = numberSchema
            break
          }
          case 'boolean':
            fieldSchema = nativeSchema.boolean()
            break
          case 'array': {
            // Handle array items
            let itemSchema: Schema<unknown> = nativeSchema.any()
            if (fieldDef.items) {
              if (typeof fieldDef.items === 'object' && 'type' in fieldDef.items) {
                // Recursively process item schema definition
                const itemDef = fieldDef.items as SchemaFieldDefinition
                switch (itemDef.type) {
                  case 'string':
                    itemSchema = nativeSchema.string()
                    break
                  case 'number':
                    itemSchema = nativeSchema.number()
                    break
                  case 'boolean':
                    itemSchema = nativeSchema.boolean()
                    break
                  default:
                    itemSchema = nativeSchema.any()
                }
              } else if (fieldDef.items && 'parse' in fieldDef.items) {
                // Already a schema
                itemSchema = fieldDef.items as Schema<unknown>
              }
            }

            let arraySchema = nativeSchema.array(itemSchema)
            if (fieldDef.min !== undefined) {
              arraySchema = arraySchema.min(fieldDef.min)
            }
            if (fieldDef.max !== undefined) {
              arraySchema = arraySchema.max(fieldDef.max)
            }

            fieldSchema = arraySchema
            break
          }
          case 'object':
            fieldSchema = fieldDef.schema || nativeSchema.any()
            break
          case 'date':
            fieldSchema = nativeSchema.string() // ISO date string validation could be added
            break
          default:
            fieldSchema = nativeSchema.any()
        }

        // Apply optional/nullable modifiers
        if (fieldDef.nullable) {
          fieldSchema = fieldSchema.nullable()
        }
        // Only make field optional if explicitly marked as not required OR has a default value
        if (fieldDef.required === false || fieldDef.default !== undefined) {
          fieldSchema = fieldSchema.optional()
        }
        if (fieldDef.default !== undefined) {
          fieldSchema = fieldSchema.default(fieldDef.default)
        }

        schemaFields[key] = fieldSchema
      }
    }

    // Add timestamps if requested
    if (opts.timestamps) {
      schemaFields['createdAt'] = nativeSchema.string()
      schemaFields['updatedAt'] = nativeSchema.string()
    }

    return nativeSchema.object(schemaFields) as unknown as Schema<T>
  } catch (error: unknown) {
    const dataError = createDataError(
      'schema',
      `Failed to create schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { definition, error }
    )
    throw new Error(dataError.message)
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
  const opts = mergeOptions(
    {
      coerce: false,
      stripUnknown: false,
      collectErrors: false,
    },
    options
  )

  try {
    const result = schema.parse(input)

    if (Result.isErr(result)) {
      return Result.Err(
        createDataError('validate', 'Validation failed', {
          input,
          errors: result.error,
          options: opts,
        })
      )
    }

    return Result.Ok(result.value)
  } catch (error: unknown) {
    return Result.Err(
      createDataError(
        'validate',
        `Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { input, error }
      )
    )
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
  const opts = mergeOptions(
    {
      strict: false,
      defaults: true,
      computed: true,
      timezone: 'UTC',
      context: {},
    },
    options
  )

  try {
    const context: TransformContext = {
      timezone: opts.timezone || 'UTC',
      timestamp: new Date(),
      ...opts.context,
    }

    // Handle array input
    if (Array.isArray(input)) {
      const results = input.map(item => transformSingle(item, mapping, context, opts))
      return Result.Ok(results as TOutput)
    }

    // Transform single object
    const result = transformSingle(input, mapping, context, opts)
    return Result.Ok(result as TOutput)
  } catch (error: unknown) {
    return Result.Err(
      createDataError(
        'transform',
        `Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { input, mapping, error }
      )
    )
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
  const result: Record<string, unknown> = {}

  for (const [targetKey, transform] of Object.entries(mapping)) {
    try {
      let value: unknown

      if (typeof transform === 'string') {
        // Simple field mapping
        value = get(input as Record<string, unknown>, transform)
      } else if (typeof transform === 'function') {
        // Transform function
        value = (transform as TransformFunction<TInput, unknown>)(input, context)
      } else if (typeof transform === 'object' && transform !== null) {
        // Complex transform definition
        const transformObj = transform as {
          source?: string
          fn?: (value: unknown, context: TransformContext) => unknown
          default?: unknown
        }
        const sourceKey = transformObj.source || targetKey
        const sourceValue = get(input as Record<string, unknown>, sourceKey)

        if (transformObj.fn) {
          value = transformObj.fn(sourceValue, context)
        } else {
          value = sourceValue
        }

        // Apply default if value is undefined
        if (value === undefined && 'default' in transformObj) {
          value = transformObj.default
        }
      }

      // Set the transformed value
      if (value !== undefined || options.defaults) {
        result[targetKey] = value
      }
    } catch (error: unknown) {
      if (options.strict) {
        throw error
      }
      // Skip failed transformations in non-strict mode
    }
  }

  return result as Partial<TOutput>
}

/**
 * Convert between different data schemas
 */
export const convert = <TInput, TOutput>(
  input: TInput,
  fromSchema: Schema<TInput>,
  toSchema: Schema<TOutput>,
  mapping: Record<string, string | ((data: TInput) => unknown)>,
  options: ConvertOptions = {}
): DataResult<TOutput> => {
  const opts = mergeOptions(
    {
      strict: false,
      fillDefaults: true,
      context: {},
    },
    options
  )

  try {
    // First validate input against source schema
    const validationResult = validate(input, fromSchema)
    if (Result.isErr(validationResult)) {
      return Result.Err(
        createDataError('convert', 'Input validation failed', {
          validation: validationResult.error,
        })
      )
    }

    // Apply mapping transformation
    const convertedData: Record<string, unknown> = {}

    for (const [targetKey, sourceKey] of Object.entries(mapping)) {
      if (typeof sourceKey === 'function') {
        // Function mapping
        convertedData[targetKey] = sourceKey(validationResult.value)
      } else {
        // String mapping - get value from source
        convertedData[targetKey] = get(validationResult.value as Record<string, unknown>, sourceKey)
      }
    }

    let converted: unknown = convertedData

    // Apply migration function if provided
    if (options.migration) {
      converted = options.migration(converted as TInput, {
        timestamp: new Date(),
        ...opts.context,
      })
    }

    // Validate against target schema
    const targetValidation = validate(converted, toSchema)
    if (Result.isErr(targetValidation)) {
      return Result.Err(
        createDataError('convert', 'Target schema validation failed', {
          validation: targetValidation.error,
        })
      )
    }

    return Result.Ok(targetValidation.value)
  } catch (error: unknown) {
    return Result.Err(
      createDataError(
        'convert',
        `Schema conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { input, error }
      )
    )
  }
}

/**
 * Perform statistical operations on data collections
 */
export const aggregate = <T, R = AggregateResult>(
  input: T[],
  operations: AggregateOperations,
  _options: AggregateOptions = {}
): DataResult<R> => {
  // TODO: Implement options for parallel processing and caching
  // const opts = mergeOptions({
  //   parallel: false,
  //   cache: false
  // }, options)

  try {
    if (!Array.isArray(input)) {
      return Result.Err(createDataError('aggregate', 'Input must be an array', { input }))
    }

    const result: AggregateResult = {
      groups: {},
      totals: {},
      averages: {},
      counts: {},
      minimums: {},
      maximums: {},
      custom: {},
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
        result.counts[key] =
          operations.count === '*' ? groupData.length : countField(groupData, operations.count)
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

    return Result.Ok(result as R)
  } catch (error: unknown) {
    return Result.Err(
      createDataError(
        'aggregate',
        `Aggregation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { input, operations, error }
      )
    )
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
  const opts = mergeOptions(
    {
      preserveOrder: true,
      includeEmpty: false,
    },
    options
  )

  try {
    if (!Array.isArray(input)) {
      return Result.Err(createDataError('groupBy', 'Input must be an array', { input }))
    }

    const groups: Record<string, T[]> = {}

    // Determine key function
    let keyFn: GroupByKeyFunction<T>

    if (typeof keys === 'function') {
      keyFn = keys
    } else if (Array.isArray(keys)) {
      keyFn = (item: T): string => keys.map(key => String(item[key])).join('-')
    } else {
      keyFn = (item: T): string => String(item[keys])
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

    return Result.Ok(groups)
  } catch (error: unknown) {
    return Result.Err(
      createDataError(
        'groupBy',
        `Grouping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { input, keys, error }
      )
    )
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
  const opts = mergeOptions(
    {
      pretty: false,
      dateFormat: 'iso',
      excludePrivate: false,
    },
    options
  )

  try {
    switch (format) {
      case 'json':
        return serializeJSON(input, opts as SerializeOptions)
      case 'csv':
        return serializeCSV(input, opts as SerializeOptions)
      case 'xml':
        return serializeXML(input, opts as SerializeOptions)
      case 'yaml':
        return serializeYAML(input, opts as SerializeOptions)
      default:
        return Result.Err(
          createDataError('serialize', `Unsupported serialization format: ${format}`, { format })
        )
    }
  } catch (error: unknown) {
    return Result.Err(
      createDataError(
        'serialize',
        `Serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { input, format, error }
      )
    )
  }
}

/**
 * Deserialize data from various formats
 */
export const deserialize = <T>(
  input: string | Buffer,
  format: SerializationFormat,
  schema?: Schema<T>,
  options: DeserializeOptions = {}
): DataResult<T> => {
  const opts = mergeOptions(
    {
      strict: true,
      coerce: false,
    },
    options
  )

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
        return Result.Err(
          createDataError('deserialize', `Unsupported deserialization format: ${format}`, {
            format,
          })
        )
    }

    // Validate against schema if provided
    if (schema) {
      return validate(parsed, schema, opts)
    }

    return Result.Ok(parsed as T)
  } catch (error: unknown) {
    return Result.Err(
      createDataError(
        'deserialize',
        `Deserialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { input, format, error }
      )
    )
  }
}

/**
 * Deep clone data structures
 */
export const clone = <T>(input: T, options: CloneOptions = {}): DataResult<T> => {
  const opts = mergeOptions(
    {
      deep: true,
      preservePrototype: false,
      handleCircular: true,
    },
    options
  )

  try {
    const cloned = opts.deep ? deepClone(input, opts) : shallowClone(input)
    return Result.Ok(cloned)
  } catch (error: unknown) {
    return Result.Err(
      createDataError(
        'clone',
        `Cloning failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { input, error }
      )
    )
  }
}

// Internal helper functions

const groupByMultiple = <T>(input: T[], keys: string[]): Record<string, T[]> => {
  const groups: Record<string, T[]> = {}

  for (const item of input) {
    const groupKey = keys.map(key => String(get(item as Record<string, unknown>, key))).join('-')

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }

    groups[groupKey].push(item)
  }

  return groups
}

const sumField = <T>(items: T[], field: string): number => {
  return items.reduce((sum, item) => {
    const value = get(item as Record<string, unknown>, field)
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)
}

const averageField = <T>(items: T[], field: string): number => {
  const values = items
    .map(item => get(item as Record<string, unknown>, field))
    .filter(v => typeof v === 'number')
  return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
}

const countField = <T>(items: T[], field: string): number => {
  return items.filter(item => get(item as Record<string, unknown>, field) !== undefined).length
}

const minField = <T>(items: T[], field: string): unknown => {
  const values = items
    .map(item => get(item as Record<string, unknown>, field))
    .filter(v => v !== undefined)
  return values.length > 0 ? Math.min(...values.filter(v => typeof v === 'number')) : undefined
}

const maxField = <T>(items: T[], field: string): unknown => {
  const values = items
    .map(item => get(item as Record<string, unknown>, field))
    .filter(v => v !== undefined)
  return values.length > 0 ? Math.max(...values.filter(v => typeof v === 'number')) : undefined
}

const serializeJSON = <T>(input: T, options: SerializeOptions): DataResult<string> => {
  try {
    // Handle circular references
    const seen = new WeakSet()
    let hasCircular = false

    const json = JSON.stringify(
      input,
      (_key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value as object)) {
            hasCircular = true
            if (options.handleCircular === false) {
              throw new Error('Converting circular structure to JSON')
            }
            return '[Circular]'
          }
          seen.add(value as object)
        }

        // Handle encoding options
        if (options.escapeUnicode === false && typeof value === 'string') {
          return value
        }

        return value as unknown
      },
      options.pretty ? 2 : undefined
    )

    // If circular reference found and not handled, throw error
    if (hasCircular && options.handleCircular !== true) {
      return Result.Err(
        createDataError('serialize', 'JSON serialization failed: circular reference detected', {})
      )
    }

    return Result.Ok(json)
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('circular')) {
      return Result.Err(
        createDataError('serialize', 'JSON serialization failed: circular reference detected', {
          error,
        })
      )
    }
    return Result.Err(
      createDataError(
        'serialize',
        `JSON serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      )
    )
  }
}

const serializeCSV = <T>(input: T, options: SerializeOptions): DataResult<string> => {
  try {
    if (!Array.isArray(input)) {
      return Result.Err(
        createDataError('serialize', 'CSV serialization requires array input', { input })
      )
    }

    if (input.length === 0) {
      return Result.Ok('')
    }

    const delimiter = options.delimiter || ','
    const headers = Object.keys(input[0] as Record<string, unknown>)

    let csv = ''

    if (options.headers) {
      csv += headers.join(delimiter) + '\n'
    }

    for (const row of input) {
      const values = headers.map(header => {
        const value = get(row as Record<string, unknown>, header)
        if (value === undefined) return ''
        if (value === null) return 'null'
        if (typeof value === 'object') return JSON.stringify(value)
        if (typeof value === 'string') return value
        if (typeof value === 'number') return value.toString()
        if (typeof value === 'boolean') return value.toString()
        // Fallback for any other type (symbol, function, etc.)
        return `[${typeof value}]`
      })
      csv += values.join(delimiter) + '\n'
    }

    return Result.Ok(csv)
  } catch (error: unknown) {
    return Result.Err(
      createDataError(
        'serialize',
        `CSV serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      )
    )
  }
}

const serializeXML = <T>(input: T, options: SerializeOptions): DataResult<string> => {
  try {
    const xmlString = convertToXML(input, '', options.pretty || false)
    return Result.Ok(xmlString)
  } catch (error: unknown) {
    return Result.Err(
      createDataError(
        'serialize',
        `XML serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { input, error }
      )
    )
  }
}

const serializeYAML = <T>(input: T, options: SerializeOptions): DataResult<string> => {
  try {
    const yamlString = convertToYAML(input, 0, options.pretty || false)
    return Result.Ok(yamlString)
  } catch (error: unknown) {
    return Result.Err(
      createDataError(
        'serialize',
        `YAML serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { input, error }
      )
    )
  }
}

const deserializeJSON = (input: string | Buffer, options: DeserializeOptions): unknown => {
  const str = Buffer.isBuffer(input) ? input.toString(options.encoding || 'utf8') : input

  if (!str.trim()) {
    throw new Error('Empty input')
  }

  try {
    return JSON.parse(str)
  } catch (error: unknown) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`)
  }
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
    headers = lines[0]?.split(delimiter) || []
    dataLines = lines.slice(1)
  } else {
    // Generate generic headers
    const firstLine = lines[0]?.split(delimiter) || []
    headers = firstLine.map((_, index) => `col${index}`)
    dataLines = lines
  }

  return dataLines.map(line => {
    const values = line.split(delimiter)
    const obj: Record<string, unknown> = {}

    headers.forEach((header, index) => {
      const rawValue = values[index] || ''

      if (options.coerceTypes) {
        // Try to coerce to appropriate type
        obj[header] = coerceValue(rawValue)
      } else {
        obj[header] = rawValue
      }
    })

    return obj
  })
}

const deserializeXML = (input: string | Buffer, options: DeserializeOptions): unknown => {
  const str = Buffer.isBuffer(input) ? input.toString(options.encoding || 'utf8') : input

  if (!str.trim()) {
    throw new Error('Empty input')
  }

  return parseXMLToObject(str)
}

const deserializeYAML = (input: string | Buffer, options: DeserializeOptions): unknown => {
  const str = Buffer.isBuffer(input) ? input.toString(options.encoding || 'utf8') : input

  if (!str.trim()) {
    throw new Error('Empty input')
  }

  return parseYAMLToObject(str)
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
          merged[index] = item as unknown
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
        result[key] = options.conflictResolver(targetValue, sourceValue, key) as T[Extract<
          keyof T,
          string
        >]
      } else {
        // Default to source wins
        result[key] = sourceValue as T[Extract<keyof T, string>]
      }
    }
  }

  return result
}

/**
 * Merge multiple objects into a single object with configurable strategies
 *
 * @param target - Base object to merge into
 * @param sources - Objects to merge from
 * @param options - Merge configuration options
 * @returns Result with merged object or error
 *
 * @example
 * ```typescript
 * const base = { a: 1, b: { x: 1 } }
 * const update = { b: { y: 2 }, c: 3 }
 *
 * const result = merge(base, [update], {
 *   deep: true,
 *   strategy: 'source-wins'
 * })
 *
 * if (Result.isOk(result)) {
 *   // result.value: { a: 1, b: { x: 1, y: 2 }, c: 3 }
 * }
 * ```
 */
export const merge = <T extends Record<string, unknown>>(
  target: T,
  sources: Partial<T>[],
  options: MergeOptions = {}
): DataResult<T> => {
  const opts = {
    ...options,
    deep: options.deep ?? true,
    strategy: options.strategy ?? ('source-wins' as const),
    arrays: options.arrays ?? ('replace' as const),
  }

  try {
    let result = deepClone(target)

    for (const source of sources) {
      if (source && typeof source === 'object') {
        result = mergeObjects(result, source, opts)
      }
    }

    return Result.Ok(result)
  } catch (error: unknown) {
    return Result.Err(
      createDataError(
        'merge',
        `Object merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { target, sources, options: opts, error }
      )
    )
  }
}

// Helper functions for serialization

/**
 * Convert object to XML string
 */
const convertToXML = (obj: unknown, rootTag = 'root', pretty = false): string => {
  const indent = pretty ? '  ' : ''
  const newline = pretty ? '\n' : ''

  const escapeXML = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  const convertValue = (value: unknown, tag: string, depth = 0): string => {
    const currentIndent = pretty ? indent.repeat(depth) : ''

    if (value === null || value === undefined) {
      return `${currentIndent}<${tag} />${newline}`
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return `${currentIndent}<${tag}>${escapeXML(String(value))}</${tag}>${newline}`
    }

    if (Array.isArray(value)) {
      const items = value.map(item => convertValue(item, 'item', depth + 1)).join('')
      return `${currentIndent}<${tag}>${newline}${items}${currentIndent}</${tag}>${newline}`
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
      const items = entries.map(([key, val]) => convertValue(val, key, depth + 1)).join('')
      return `${currentIndent}<${tag}>${newline}${items}${currentIndent}</${tag}>${newline}`
    }

    const stringValue =
      typeof value === 'string'
        ? value
        : typeof value === 'number'
          ? value.toString()
          : JSON.stringify(value)
    return `${currentIndent}<${tag}>${escapeXML(stringValue)}</${tag}>${newline}`
  }

  if (rootTag) {
    return `<?xml version="1.0" encoding="UTF-8"?>${newline}${convertValue(obj, rootTag)}`
  }

  return convertValue(obj, 'root')
}

/**
 * Convert object to YAML string
 */
const convertToYAML = (obj: unknown, depth = 0, pretty = false): string => {
  const indent = '  '
  const currentIndent = indent.repeat(depth)

  if (obj === null || obj === undefined) {
    return 'null'
  }

  if (typeof obj === 'string') {
    // Check if string needs quoting
    if (obj.includes('\n') || obj.includes(':') || obj.includes('"') || obj.includes("'")) {
      return `"${obj.replace(/"/g, '\\"')}"`
    }
    return obj
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj)
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'
    return obj.map(item => `${currentIndent}- ${convertToYAML(item, depth + 1, pretty)}`).join('\n')
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>)
    if (entries.length === 0) return '{}'

    return entries
      .map(([key, value]) => {
        const yamlValue = convertToYAML(value, depth + 1, pretty)
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `${currentIndent}${key}:\n${yamlValue}`
        } else if (Array.isArray(value) && value.length > 0) {
          return `${currentIndent}${key}:\n${yamlValue}`
        } else {
          return `${currentIndent}${key}: ${yamlValue}`
        }
      })
      .join('\n')
  }

  return typeof obj === 'string' ? obj : JSON.stringify(obj)
}

/**
 * Parse XML string to object
 */
const parseXMLToObject = (xmlString: string): unknown => {
  // Remove XML declaration and comments
  const cleanXml = xmlString
    .replace(/<\?xml[^>]*\?>/i, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()

  // Simple XML parser for basic structures
  const parseElement = (str: string): unknown => {
    // Handle self-closing tags
    if (str.includes('/>')) {
      const tagMatch = str.match(/<(\w+)([^>]*)\s*\/>/)
      if (tagMatch) {
        return null
      }
    }

    // Handle regular tags
    const tagMatch = str.match(/<(\w+)([^>]*)>([\s\S]*?)<\/\1>/)
    if (!tagMatch) {
      return str.trim()
    }

    const [, , , content] = tagMatch

    // Check if content has nested tags
    if (content && content.includes('<')) {
      const result: Record<string, unknown> = {}
      let remaining = content

      while (remaining && remaining.trim()) {
        const nextTagMatch = remaining.match(/<(\w+)([^>]*)>([\s\S]*?)<\/\1>/)
        if (!nextTagMatch) {
          // No more tags, treat as text content
          const textContent = remaining.trim()
          if (textContent) {
            if (Object.keys(result).length === 0) {
              return textContent
            }
            result['_text'] = textContent
          }
          break
        }

        const [fullMatch, childTagName] = nextTagMatch
        if (!childTagName) continue

        const childValue = parseElement(fullMatch)

        if (result[childTagName]) {
          if (Array.isArray(result[childTagName])) {
            ;(result[childTagName] as unknown[]).push(childValue)
          } else {
            result[childTagName] = [result[childTagName], childValue]
          }
        } else {
          result[childTagName] = childValue
        }

        remaining = remaining.replace(fullMatch, '')
      }

      return result
    } else {
      // Plain text content
      const trimmed = content ? content.trim() : ''
      if (!isNaN(Number(trimmed)) && trimmed !== '') {
        return Number(trimmed)
      }
      if (trimmed === 'true' || trimmed === 'false') {
        return trimmed === 'true'
      }
      return trimmed
    }
  }

  return parseElement(cleanXml)
}

/**
 * Parse YAML string to object
 */
const parseYAMLToObject = (yamlString: string): unknown => {
  const lines = yamlString.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'))

  const parseValue = (value: string): unknown => {
    const trimmed = value.trim()

    // Handle quoted strings
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1)
    }

    // Handle arrays
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const items = trimmed
        .slice(1, -1)
        .split(',')
        .map(item => parseValue(item))
      return items
    }

    // Handle objects
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const obj: Record<string, unknown> = {}
      const pairs = trimmed.slice(1, -1).split(',')
      for (const pair of pairs) {
        const [k, v] = pair.split(':')
        if (k && v) {
          obj[k.trim()] = parseValue(v)
        }
      }
      return obj
    }

    // Handle null
    if (trimmed === 'null' || trimmed === '~') {
      return null
    }

    // Handle booleans
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false

    // Handle numbers
    if (!isNaN(Number(trimmed)) && trimmed !== '') {
      return Number(trimmed)
    }

    return trimmed
  }

  const parseLines = (lines: string[], startIndex = 0, parentIndent = -1): [unknown, number] => {
    const result: Record<string, unknown> = {}
    let i = startIndex

    while (i < lines.length) {
      const line = lines[i]
      if (!line) {
        i++
        continue
      }
      const indent = line.length - line.trimStart().length

      if (indent <= parentIndent && i !== startIndex) {
        break
      }

      if (line.trim().startsWith('-')) {
        // Array item
        const items: unknown[] = []
        while (i < lines.length) {
          const arrayLine = lines[i]
          if (!arrayLine) {
            i++
            continue
          }
          const arrayIndent = arrayLine.length - arrayLine.trimStart().length

          if (
            arrayIndent < indent ||
            (!arrayLine.trim().startsWith('-') && arrayIndent === indent)
          ) {
            break
          }

          if (arrayLine.trim().startsWith('-')) {
            const itemValue = arrayLine.trim().substring(1).trim()
            if (itemValue.includes(':')) {
              // Object in array
              const [objResult, nextIndex] = parseLines(lines, i, arrayIndent)
              items.push(objResult)
              i = nextIndex - 1
            } else {
              items.push(parseValue(itemValue))
            }
          }
          i++
        }
        return [items, i]
      } else if (line.includes(':')) {
        // Key-value pair
        const colonIndex = line.indexOf(':')
        const key = line.substring(0, colonIndex).trim()
        const value = line.substring(colonIndex + 1).trim()

        if (value === '') {
          // Nested object
          const [nestedResult, nextIndex] = parseLines(lines, i + 1, indent)
          result[key] = nestedResult
          i = nextIndex - 1
        } else {
          result[key] = parseValue(value)
        }
      }

      i++
    }

    return [Object.keys(result).length === 0 ? null : result, i]
  }

  const [parsed] = parseLines(lines)
  return parsed
}

/**
 * Coerce string value to appropriate type
 */
const coerceValue = (value: string): unknown => {
  const trimmed = value.trim()

  if (trimmed === '') return ''

  // Handle null/undefined
  if (trimmed === 'null' || trimmed === 'NULL') return null
  if (trimmed === 'undefined') return undefined

  // Handle booleans
  if (trimmed === 'true' || trimmed === 'TRUE') return true
  if (trimmed === 'false' || trimmed === 'FALSE') return false

  // Handle numbers
  if (!isNaN(Number(trimmed))) {
    const num = Number(trimmed)
    // Check if it's an integer
    if (Number.isInteger(num)) {
      return num
    }
    // It's a float
    return num
  }

  // Handle dates (basic ISO format detection)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const date = new Date(trimmed)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  // Return as string if no other type matches
  return trimmed
}

/**
 * Shallow clone helper function
 */
const shallowClone = <T>(input: T): T => {
  // Handle primitives and null
  if (input === null || typeof input !== 'object') {
    return input
  }

  // Handle Date
  if (input instanceof Date) {
    return new Date(input.getTime()) as T
  }

  // Handle RegExp
  if (input instanceof RegExp) {
    return new RegExp(input.source, input.flags) as T
  }

  // Handle Arrays
  if (Array.isArray(input)) {
    return [...input] as T
  }

  // Handle Objects
  if (isPlainObject(input)) {
    return { ...(input as Record<string, unknown>) } as T
  }

  // For other object types, return as-is (shallow)
  return input
}
