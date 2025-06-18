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
        schemaFields[key] = nativeSchema.any() // Simplified for now
      }
    }

    // Add timestamps if requested
    if (opts.timestamps) {
      schemaFields.createdAt = nativeSchema.string()
      schemaFields.updatedAt = nativeSchema.string()
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

    let converted: unknown = validationResult.value

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
  schema: Schema<T>,
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

    // Validate against schema
    return validate(parsed, schema, opts)
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
    const cloned = deepClone(input, opts)
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
    const json = JSON.stringify(input, undefined, options.pretty ? 2 : undefined)
    return Result.Ok(json)
  } catch (error: unknown) {
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

const serializeXML = <T>(_input: T, _options: SerializeOptions): DataResult<string> => {
  // Basic XML serialization - can be enhanced
  return Result.Err(createDataError('serialize', 'XML serialization not implemented yet', {}))
}

const serializeYAML = <T>(_input: T, _options: SerializeOptions): DataResult<string> => {
  // Basic YAML serialization - can be enhanced
  return Result.Err(createDataError('serialize', 'YAML serialization not implemented yet', {}))
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
    const obj: Record<string, string> = {}

    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })

    return obj
  })
}

const deserializeXML = (_input: string | Buffer, _options: DeserializeOptions): unknown => {
  // Basic XML deserialization - can be enhanced
  throw new Error('XML deserialization not implemented yet')
}

const deserializeYAML = (_input: string | Buffer, _options: DeserializeOptions): unknown => {
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
