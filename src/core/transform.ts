/**
 * Data Transformation Layer for Kairo
 *
 * Provides declarative data mapping, conversion, and computation capabilities
 * for transforming data between different schemas and formats.
 */

import { Result } from './result'
import { type KairoError, createError } from './errors'
import { type Schema } from './native-schema'

// ============================================================================
// Core Types
// ============================================================================

export interface TransformError extends KairoError {
  code: 'TRANSFORM_ERROR'
  field?: string | undefined
  operation: string
  sourceValue?: unknown
  targetField?: string | undefined
}

export interface TransformContext {
  [key: string]: unknown
}

export type FieldMapper<TSource> = (source: TSource, context?: TransformContext) => unknown
export type ComputeFunction<TSource> = (source: TSource, context?: TransformContext) => unknown
export type FilterPredicate<T> = (value: T, context?: TransformContext) => boolean

export interface FieldMapping<TSource, TTarget> {
  sourceField: keyof TSource | string
  targetField: keyof TTarget | string
  mapper?: FieldMapper<TSource> | undefined
}

export interface ComputeMapping<TSource, TTarget> {
  targetField: keyof TTarget | string
  compute: ComputeFunction<TSource>
}

export interface Transform<TSource, TTarget> {
  readonly name: string
  readonly sourceSchema: Schema<TSource>
  readonly targetSchema: Schema<TTarget>

  // Field mapping
  map<K extends keyof TSource | string, V extends keyof TTarget | string>(
    sourceField: K,
    targetField: V,
    mapper?: FieldMapper<TSource>
  ): Transform<TSource, TTarget>

  // Computed fields
  compute<V extends keyof TTarget | string>(
    targetField: V,
    computeFn: ComputeFunction<TSource>
  ): Transform<TSource, TTarget>

  // Filtering
  filter(predicate: FilterPredicate<TSource>): Transform<TSource, TTarget>

  // Validation integration
  validate(rules?: Schema<TTarget>): Transform<TSource, TTarget>

  // Execution
  execute(source: TSource, context?: TransformContext): Result<TransformError, TTarget>
  executeMany(sources: TSource[], context?: TransformContext): Result<TransformError[], TTarget[]>

  // Composition
  pipe<TNext>(nextTransform: Transform<TTarget, TNext>): Transform<TSource, TNext>
}

// ============================================================================
// Core Implementation
// ============================================================================

const createTransformError = (
  operation: string,
  message: string,
  options: {
    field?: string | undefined
    sourceValue?: unknown
    targetField?: string | undefined
    context?: Record<string, unknown> | undefined
  } = {}
): TransformError => ({
  ...createError('TRANSFORM_ERROR', message, options.context || {}),
  code: 'TRANSFORM_ERROR',
  operation,
  field: options.field,
  sourceValue: options.sourceValue,
  targetField: options.targetField,
})

class TransformImpl<TSource, TTarget> implements Transform<TSource, TTarget> {
  public readonly name: string
  public readonly sourceSchema: Schema<TSource>
  public readonly targetSchema: Schema<TTarget>

  private fieldMappings: FieldMapping<TSource, TTarget>[] = []
  private computeMappings: ComputeMapping<TSource, TTarget>[] = []
  private filterPredicates: FilterPredicate<TSource>[] = []
  private validationSchema: Schema<TTarget> | undefined

  constructor(name: string, sourceSchema: Schema<TSource>, targetSchema: Schema<TTarget>) {
    this.name = name
    this.sourceSchema = sourceSchema
    this.targetSchema = targetSchema
  }

  map<K extends keyof TSource | string, V extends keyof TTarget | string>(
    sourceField: K,
    targetField: V,
    mapper?: FieldMapper<TSource>
  ): Transform<TSource, TTarget> {
    const newTransform = this.clone()
    newTransform.fieldMappings.push({
      sourceField: sourceField as string,
      targetField: targetField as string,
      mapper,
    })
    return newTransform
  }

  compute<V extends keyof TTarget | string>(
    targetField: V,
    computeFn: ComputeFunction<TSource>
  ): Transform<TSource, TTarget> {
    const newTransform = this.clone()
    newTransform.computeMappings.push({
      targetField: targetField as string,
      compute: computeFn,
    })
    return newTransform
  }

  filter(predicate: FilterPredicate<TSource>): Transform<TSource, TTarget> {
    const newTransform = this.clone()
    newTransform.filterPredicates.push(predicate)
    return newTransform
  }

  validate(rules?: Schema<TTarget>): Transform<TSource, TTarget> {
    const newTransform = this.clone()
    newTransform.validationSchema = rules || this.targetSchema
    return newTransform
  }

  execute(source: TSource, context?: TransformContext): Result<TransformError, TTarget> {
    try {
      // Apply filters first
      for (const predicate of this.filterPredicates) {
        try {
          if (!predicate(source, context)) {
            return Result.Err(
              createTransformError('filter', 'Source data filtered out by predicate', {
                sourceValue: source,
              })
            )
          }
        } catch (error) {
          return Result.Err(
            createTransformError('filter', 'Filter predicate failed', {
              sourceValue: source,
              context: { error },
            })
          )
        }
      }

      // Build target object
      const target: Partial<TTarget> = {}

      // Apply field mappings
      for (const mapping of this.fieldMappings) {
        try {
          const sourceValue = this.getNestedValue(source, mapping.sourceField as string)
          let targetValue: unknown

          if (mapping.mapper) {
            targetValue = mapping.mapper(source, context)
          } else {
            targetValue = sourceValue
          }

          this.setNestedValue(target, mapping.targetField as string, targetValue)
        } catch (error) {
          return Result.Err(
            createTransformError(
              'field-mapping',
              `Failed to map field ${String(mapping.sourceField)} to ${String(mapping.targetField)}`,
              {
                field: String(mapping.sourceField),
                targetField: String(mapping.targetField),
                sourceValue: this.getNestedValue(source, mapping.sourceField as string),
                context: { error },
              }
            )
          )
        }
      }

      // Apply computed fields
      for (const mapping of this.computeMappings) {
        try {
          const computedValue = mapping.compute(source, context)
          this.setNestedValue(target, mapping.targetField as string, computedValue)
        } catch (error) {
          return Result.Err(
            createTransformError(
              'compute',
              `Failed to compute field ${String(mapping.targetField)}`,
              {
                targetField: String(mapping.targetField),
                sourceValue: source,
                context: { error },
              }
            )
          )
        }
      }

      // Validate if schema provided
      if (this.validationSchema) {
        const validationResult = this.validationSchema.parse(target)
        if (validationResult.tag === 'Err') {
          return Result.Err(
            createTransformError('validation', 'Transformed data failed validation', {
              context: {
                validationError: validationResult.error,
                transformedData: target,
              },
            })
          )
        }
        return Result.Ok(validationResult.value)
      }

      return Result.Ok(target as TTarget)
    } catch (error) {
      return Result.Err(
        createTransformError('execution', 'Transform execution failed unexpectedly', {
          sourceValue: source,
          context: { error },
        })
      )
    }
  }

  executeMany(sources: TSource[], context?: TransformContext): Result<TransformError[], TTarget[]> {
    const results: TTarget[] = []
    const errors: TransformError[] = []

    for (const [index, source] of sources.entries()) {
      const result = this.execute(source, { ...context, index })
      if (result.tag === 'Ok') {
        results.push(result.value)
      } else {
        // Don't treat filter failures as errors - just skip the item
        if (result.error.operation === 'filter') {
          continue
        }
        errors.push({
          ...result.error,
          context: { ...result.error.context, index },
        })
      }
    }

    if (errors.length > 0) {
      return Result.Err(errors)
    }

    return Result.Ok(results)
  }

  pipe<TNext>(nextTransform: Transform<TTarget, TNext>): Transform<TSource, TNext> {
    return new PipeTransform(this, nextTransform)
  }

  private clone(): TransformImpl<TSource, TTarget> {
    const cloned = new TransformImpl(this.name, this.sourceSchema, this.targetSchema)
    cloned.fieldMappings = [...this.fieldMappings]
    cloned.computeMappings = [...this.computeMappings]
    cloned.filterPredicates = [...this.filterPredicates]
    cloned.validationSchema = this.validationSchema
    return cloned
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    if (!path.includes('.')) {
      return (obj as Record<string, unknown>)[path]
    }

    const keys = path.split('.')
    let current = obj

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined
      }
      current = (current as Record<string, unknown>)[key]
    }

    return current
  }

  private setNestedValue(obj: Partial<TTarget>, path: string, value: unknown): void {
    if (!path.includes('.')) {
      ;(obj as Record<string, unknown>)[path] = value
      return
    }

    const keys = path.split('.')
    const lastKey = keys.pop()!
    let current = obj as Record<string, unknown>

    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {}
      }
      current = current[key] as Record<string, unknown>
    }

    current[lastKey] = value
  }
}

class PipeTransform<TSource, TMiddle, TTarget> implements Transform<TSource, TTarget> {
  public readonly name: string
  public readonly sourceSchema: Schema<TSource>
  public readonly targetSchema: Schema<TTarget>

  constructor(
    private firstTransform: Transform<TSource, TMiddle>,
    private secondTransform: Transform<TMiddle, TTarget>
  ) {
    this.name = `${firstTransform.name} | ${secondTransform.name}`
    this.sourceSchema = firstTransform.sourceSchema
    this.targetSchema = secondTransform.targetSchema
  }

  map<K extends keyof TSource | string, V extends keyof TTarget | string>(
    _sourceField: K,
    _targetField: V,
    _mapper?: FieldMapper<TSource>
  ): Transform<TSource, TTarget> {
    // For pipe transforms, we can't add mappings directly
    throw new Error('Cannot add mappings to a pipe transform. Create a new transform instead.')
  }

  compute<V extends keyof TTarget | string>(
    _targetField: V,
    _computeFn: ComputeFunction<TSource>
  ): Transform<TSource, TTarget> {
    // For pipe transforms, we can't add compute mappings directly
    throw new Error(
      'Cannot add compute mappings to a pipe transform. Create a new transform instead.'
    )
  }

  filter(_predicate: FilterPredicate<TSource>): Transform<TSource, TTarget> {
    // For pipe transforms, we can't add filters directly
    throw new Error('Cannot add filters to a pipe transform. Create a new transform instead.')
  }

  validate(_rules?: Schema<TTarget>): Transform<TSource, TTarget> {
    // For pipe transforms, we can't add validation directly
    throw new Error('Cannot add validation to a pipe transform. Create a new transform instead.')
  }

  execute(source: TSource, context?: TransformContext): Result<TransformError, TTarget> {
    const firstResult = this.firstTransform.execute(source, context)
    if (firstResult.tag === 'Err') {
      return firstResult as Result<TransformError, TTarget>
    }

    return this.secondTransform.execute(firstResult.value, context)
  }

  executeMany(sources: TSource[], context?: TransformContext): Result<TransformError[], TTarget[]> {
    const results: TTarget[] = []
    const errors: TransformError[] = []

    for (const [index, source] of sources.entries()) {
      const result = this.execute(source, { ...context, index })
      if (result.tag === 'Ok') {
        results.push(result.value)
      } else {
        // Don't treat filter failures as errors - just skip the item
        if (result.error.operation === 'filter') {
          continue
        }
        errors.push({
          ...result.error,
          context: { ...result.error.context, index },
        })
      }
    }

    if (errors.length > 0) {
      return Result.Err(errors)
    }

    return Result.Ok(results)
  }

  pipe<TNext>(nextTransform: Transform<TTarget, TNext>): Transform<TSource, TNext> {
    return new PipeTransform(this, nextTransform)
  }
}

// ============================================================================
// Transform Builder Interface
// ============================================================================

export interface TransformBuilder<TSource> {
  to<TTarget>(targetSchema: Schema<TTarget>): Transform<TSource, TTarget>
}

class TransformBuilderImpl<TSource> implements TransformBuilder<TSource> {
  constructor(
    private name: string,
    private sourceSchema: Schema<TSource>
  ) {}

  to<TTarget>(targetSchema: Schema<TTarget>): Transform<TSource, TTarget> {
    return new TransformImpl(this.name, this.sourceSchema, targetSchema)
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export const transform = <TSource>(
  name: string,
  sourceSchema: Schema<TSource>
): TransformBuilder<TSource> => {
  return new TransformBuilderImpl(name, sourceSchema)
}

// Convenience function for direct transform creation
export const createTransform = <TSource, TTarget>(
  name: string,
  sourceSchema: Schema<TSource>,
  targetSchema: Schema<TTarget>
): Transform<TSource, TTarget> => {
  return new TransformImpl(name, sourceSchema, targetSchema)
}

// ============================================================================
// Common Transform Utilities
// ============================================================================

export const commonTransforms = {
  // String transformations
  toLowerCase: (value: unknown): string => String(value).toLowerCase(),
  toUpperCase: (value: unknown): string => String(value).toUpperCase(),
  trim: (value: unknown): string => String(value).trim(),

  // Date transformations
  toISOString: (value: unknown): string => {
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value).toISOString()
    }
    throw new Error(`Cannot convert ${typeof value} to ISO string`)
  },

  fromISOString: (value: unknown): Date => {
    if (value instanceof Date) return value
    if (typeof value === 'string') return new Date(value)
    throw new Error(`Cannot convert ${typeof value} to Date`)
  },

  // Number transformations
  toNumber: (value: unknown): number => {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const num = Number(value)
      if (isNaN(num)) throw new Error(`Cannot convert "${value}" to number`)
      return num
    }
    throw new Error(`Cannot convert ${typeof value} to number`)
  },

  toString: (value: unknown): string => String(value),

  // Array transformations
  flatten: <T>(value: T[][]): T[] => value.flat(),
  unique: <T>(value: T[]): T[] => [...new Set(value)],

  // Object transformations
  pick:
    <T extends object, K extends keyof T>(keys: K[]) =>
    (obj: T): Pick<T, K> => {
      const result = {} as Pick<T, K>
      for (const key of keys) {
        if (key in obj) {
          result[key] = obj[key]
        }
      }
      return result
    },

  omit:
    <T, K extends keyof T>(keys: K[]) =>
    (obj: T): Omit<T, K> => {
      const result = { ...obj } as Omit<T, K>
      for (const key of keys) {
        delete (result as unknown as T)[key]
      }
      return result
    },

  // Default value handling
  defaultValue:
    <T>(defaultVal: T) =>
    (value: unknown): T => {
      return value === null || value === undefined ? defaultVal : (value as T)
    },

  // Conditional transformations
  when:
    <T>(condition: (value: T) => boolean, transform: (value: T) => T) =>
    (value: T): T => {
      return condition(value) ? transform(value) : value
    },
}

// Export transform step for pipeline integration
export interface TransformStep<TSource, TTarget> {
  transform: Transform<TSource, TTarget>
  context?: TransformContext
}
