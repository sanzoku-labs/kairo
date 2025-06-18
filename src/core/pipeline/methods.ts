/**
 * PIPELINE Pillar Core Methods
 *
 * Implements the 8 core PIPELINE methods according to V2 specifications:
 * - map() - Transform collections
 * - filter() - Filter collections
 * - reduce() - Aggregate data
 * - compose() - Function composition
 * - chain() - Data pipeline chaining
 * - branch() - Conditional execution
 * - parallel() - Parallel processing
 * - validate() - Data validation
 */

import { Result } from '../shared'
import type { Schema } from '../shared'
import { createPipelineError } from '../shared'
import { mergeOptions } from '../shared/config'
import type {
  MapOptions,
  FilterOptions,
  ReduceOptions,
  ComposeOptions,
  ChainOptions,
  BranchOptions,
  ParallelOptions,
  ValidateOptions,
  PipelineResult,
  PipelineOperation,
  TransformFunction,
  PredicateFunction,
  ReducerFunction,
  BranchCondition,
  BranchMap,
  ChainOperation,
  ParallelOperation,
  ValidationRule,
  ComposedPipeline,
} from './types'
import { createContext, addTrace } from './utils'

/**
 * Transform each item in a collection
 */
export const map = async <TInput, TOutput>(
  data: TInput[],
  transform: TransformFunction<TInput, TOutput>,
  options: MapOptions = {}
): Promise<PipelineResult<TOutput[]>> => {
  const opts = mergeOptions(
    {
      async: false,
      parallel: false,
      batchSize: 10,
      keepErrors: false,
    } as MapOptions,
    options
  )

  const context = createContext('map', { inputLength: data.length })

  try {
    if (!Array.isArray(data)) {
      return Result.Err(createPipelineError('map', 'Input must be an array', { data, context }))
    }

    if (data.length === 0) {
      return Result.Ok([])
    }

    // Sequential processing
    if (!opts.parallel) {
      const results: TOutput[] = []

      for (let i = 0; i < data.length; i++) {
        try {
          const item = data[i]
          if (item === undefined) continue

          let result: TOutput

          if (opts.async) {
            result = await transform(item, i, data)
          } else {
            result = transform(item, i, data) as TOutput
          }

          results.push(result)
        } catch (error) {
          if (opts.fallback) {
            const safeError = error instanceof Error ? error : new Error('Unknown error')
            const fallbackResult = opts.fallback(safeError, data[i], i)
            results.push(fallbackResult as TOutput)
          } else if (opts.keepErrors) {
            // Skip errors and continue
            continue
          } else {
            return Result.Err(
              createPipelineError(
                'map',
                `Transform failed at index ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { error, item: data[i], index: i, context }
              )
            )
          }
        }
      }

      return Result.Ok(results)
    }

    // Parallel processing
    const batchSize = opts.batchSize || 10
    const batches: TInput[][] = []

    // Create batches
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize))
    }

    const allResults: TOutput[] = []

    // Process batches in parallel
    for (const batch of batches) {
      const batchPromises = batch.map(async (item, localIndex) => {
        const globalIndex = allResults.length + localIndex
        try {
          return await transform(item, globalIndex, data)
        } catch (error) {
          if (opts.fallback) {
            const safeError = error instanceof Error ? error : new Error('Unknown error')
            return opts.fallback(safeError, item, globalIndex) as TOutput
          } else if (!opts.keepErrors) {
            throw error
          }
          return null // Will be filtered out
        }
      })

      try {
        const batchResults = await Promise.all(batchPromises)
        allResults.push(...batchResults.filter(result => result !== null))
      } catch (error) {
        return Result.Err(
          createPipelineError(
            'map',
            `Parallel processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { error, context }
          )
        )
      }
    }

    return Result.Ok(allResults)
  } catch (error: unknown) {
    return Result.Err(
      createPipelineError(
        'map',
        `Map operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, data, context }
      )
    )
  }
}

/**
 * Filter collection based on predicate
 */
export const filter = async <T>(
  data: T[],
  predicate: PredicateFunction<T>,
  options: FilterOptions = {}
): Promise<PipelineResult<T[]>> => {
  const opts = mergeOptions(
    {
      async: false,
      keepErrors: false,
    } as FilterOptions,
    options
  )

  const context = createContext('filter', { inputLength: data.length })

  try {
    if (!Array.isArray(data)) {
      return Result.Err(createPipelineError('filter', 'Input must be an array', { data, context }))
    }

    const results: T[] = []

    for (let i = 0; i < data.length; i++) {
      try {
        const item = data[i]
        if (item === undefined) continue

        let shouldInclude: boolean

        if (opts.async) {
          shouldInclude = await predicate(item, i, data)
        } else {
          shouldInclude = predicate(item, i, data) as boolean
        }

        if (shouldInclude) {
          results.push(item)
        }
      } catch (error) {
        if (opts.onError) {
          const safeError = error instanceof Error ? error : new Error('Unknown error')
          opts.onError(safeError, data[i], i)
        }

        if (!opts.keepErrors) {
          return Result.Err(
            createPipelineError(
              'filter',
              `Predicate failed at index ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              { error, item: data[i], index: i, context }
            )
          )
        }
        // Skip errors and continue
      }
    }

    return Result.Ok(results)
  } catch (error: unknown) {
    return Result.Err(
      createPipelineError(
        'filter',
        `Filter operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, data, context }
      )
    )
  }
}

/**
 * Reduce collection to single value
 */
export const reduce = async <TInput, TOutput>(
  data: TInput[],
  reducer: ReducerFunction<TInput, TOutput>,
  initialValue: TOutput,
  options: ReduceOptions = {}
): Promise<PipelineResult<TOutput>> => {
  const opts = mergeOptions(
    {
      async: false,
      parallel: false, // Reduce is inherently sequential
      checkpoints: false,
    } as ReduceOptions,
    options
  )

  const context = createContext('reduce', { inputLength: data.length })

  try {
    if (!Array.isArray(data)) {
      return Result.Err(createPipelineError('reduce', 'Input must be an array', { data, context }))
    }

    let accumulator = initialValue
    const checkpoints: unknown[] = []

    for (let i = 0; i < data.length; i++) {
      try {
        const item = data[i]
        if (item === undefined) continue

        if (opts.async) {
          accumulator = await reducer(accumulator, item, i, data)
        } else {
          accumulator = reducer(accumulator, item, i, data) as TOutput
        }

        // Store checkpoints if enabled
        if (
          opts.checkpoints &&
          opts.checkpointInterval &&
          (i + 1) % opts.checkpointInterval === 0
        ) {
          checkpoints.push({
            index: i,
            value: accumulator,
            timestamp: Date.now(),
          })
        }
      } catch (error) {
        return Result.Err(
          createPipelineError(
            'reduce',
            `Reducer failed at index ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { error, item: data[i], index: i, accumulator, checkpoints, context }
          )
        )
      }
    }

    return Result.Ok(accumulator)
  } catch (error: unknown) {
    return Result.Err(
      createPipelineError(
        'reduce',
        `Reduce operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, data, context }
      )
    )
  }
}

/**
 * Compose multiple operations into single pipeline
 */
export const compose = <TInput, TOutput>(
  operations: PipelineOperation<unknown, unknown>[],
  options: ComposeOptions = {}
): ComposedPipeline<TInput, TOutput> => {
  const opts = mergeOptions(
    {
      stopOnError: true,
      rollback: false,
      optimize: false,
      memoize: false,
    } as ComposeOptions,
    options
  )

  return async (data: TInput): Promise<PipelineResult<TOutput>> => {
    const context = createContext('compose', { operationCount: operations.length })
    let currentData: unknown = data
    const intermediateResults: unknown[] = []

    try {
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i]
        if (!operation) continue

        const stepContext = addTrace(context, `step-${i}`)

        try {
          // Execute operation
          let result: unknown

          if (
            operation.constructor.name === 'AsyncFunction' ||
            (typeof operation === 'function' && operation.toString().includes('async'))
          ) {
            result = await operation(currentData)
          } else {
            result = operation(currentData)
          }

          // Handle Result type
          if (result && typeof result === 'object' && 'tag' in result) {
            const resultObj = result as { tag: string; value?: unknown; error?: unknown }
            if (resultObj.tag === 'Err') {
              if (opts.stopOnError) {
                return Result.Err(
                  createPipelineError('compose', `Operation ${i} failed`, {
                    error: resultObj.error,
                    operationIndex: i,
                    context,
                  })
                )
              } else {
                // Continue with previous data
                continue
              }
            } else if (resultObj.tag === 'Ok') {
              currentData = resultObj.value
            }
          } else {
            currentData = result
          }

          // Store intermediate result for potential rollback
          if (opts.rollback) {
            intermediateResults.push(currentData)
          }
        } catch (error) {
          if (opts.stopOnError) {
            return Result.Err(
              createPipelineError(
                'compose',
                `Operation ${i} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { error, operationIndex: i, intermediateResults, context: stepContext }
              )
            )
          }
          // Continue with previous data if not stopping on error
        }
      }

      return Result.Ok(currentData as TOutput)
    } catch (error: unknown) {
      return Result.Err(
        createPipelineError(
          'compose',
          `Composition failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { error, intermediateResults, context }
        )
      )
    }
  }
}

/**
 * Chain operations with data flowing through
 */
export const chain = async <TInput, TOutput>(
  data: TInput,
  operations: ChainOperation<unknown, unknown>[],
  options: ChainOptions = {}
): Promise<PipelineResult<TOutput>> => {
  const opts = mergeOptions(
    {
      stopOnError: true,
      collectResults: false,
    } as ChainOptions,
    options
  )

  const context = createContext('chain', { operationCount: operations.length })
  let currentData: unknown = data
  const results: unknown[] = []

  try {
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i]
      if (!operation) continue

      const stepContext = addTrace(context, `chain-${i}`)

      try {
        let result: unknown

        // Execute operation
        if (
          operation.constructor.name === 'AsyncFunction' ||
          (typeof operation === 'function' && operation.toString().includes('async'))
        ) {
          result = await operation(currentData)
        } else {
          result = operation(currentData)
        }

        // Handle Result type
        if (result && typeof result === 'object' && 'tag' in result) {
          const resultObj = result as { tag: string; value?: unknown; error?: unknown }
          if (resultObj.tag === 'Err') {
            if (opts.stopOnError) {
              return Result.Err(
                createPipelineError('chain', `Chain operation ${i} failed`, {
                  error: resultObj.error,
                  operationIndex: i,
                  results,
                  context,
                })
              )
            } else {
              // Continue with previous data
              continue
            }
          } else if (resultObj.tag === 'Ok') {
            currentData = resultObj.value
          }
        } else {
          currentData = result
        }

        // Collect results if requested
        if (opts.collectResults) {
          results.push(currentData)
        }
      } catch (error) {
        if (opts.stopOnError) {
          return Result.Err(
            createPipelineError(
              'chain',
              `Chain operation ${i} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              { error, operationIndex: i, results, context: stepContext }
            )
          )
        }
        // Continue with previous data if not stopping on error
      }
    }

    return Result.Ok(currentData as TOutput)
  } catch (error: unknown) {
    return Result.Err(
      createPipelineError(
        'chain',
        `Chain operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, results, context }
      )
    )
  }
}

/**
 * Conditional execution based on data
 */
export const branch = async <TInput, TOutput>(
  data: TInput,
  condition: BranchCondition<TInput>,
  branches: BranchMap<TInput, TOutput>,
  options: BranchOptions = {}
): Promise<PipelineResult<TOutput>> => {
  const opts = mergeOptions(
    {
      cache: false,
      cacheConditions: false,
    } as BranchOptions,
    options
  )

  const context = createContext('branch', { branchCount: Object.keys(branches).length })

  try {
    // Evaluate condition
    let conditionResult: boolean | string

    if (
      condition.constructor.name === 'AsyncFunction' ||
      (typeof condition === 'function' && condition.toString().includes('async'))
    ) {
      conditionResult = await condition(data)
    } else {
      conditionResult = condition(data) as boolean | string
    }

    // Determine branch key
    let branchKey: string

    if (typeof conditionResult === 'boolean') {
      branchKey = conditionResult.toString()
    } else {
      branchKey = conditionResult
    }

    // Find operation to execute
    let operation = branches[branchKey]

    if (!operation) {
      // Try default branch
      operation = branches['default'] || branches['false']

      if (!operation && opts.fallback) {
        operation = opts.fallback as PipelineOperation<TInput, TOutput>
      }

      if (!operation) {
        return Result.Err(
          createPipelineError('branch', `No branch found for condition result: ${branchKey}`, {
            conditionResult,
            availableBranches: Object.keys(branches),
            data,
            context,
          })
        )
      }
    }

    // Execute selected operation
    try {
      let result: unknown

      if (
        operation.constructor.name === 'AsyncFunction' ||
        (typeof operation === 'function' && operation.toString().includes('async'))
      ) {
        result = await operation(data)
      } else {
        result = operation(data)
      }

      // Handle Result type
      if (result && typeof result === 'object' && 'tag' in result) {
        const resultObj = result as { tag: string; value?: unknown; error?: unknown }
        if (resultObj.tag === 'Err') {
          return Result.Err(
            createPipelineError('branch', `Branch operation failed`, {
              error: resultObj.error,
              branchKey,
              data,
              context,
            })
          )
        } else if (resultObj.tag === 'Ok') {
          return Result.Ok(resultObj.value as TOutput)
        }
      }

      return Result.Ok(result as TOutput)
    } catch (error) {
      return Result.Err(
        createPipelineError(
          'branch',
          `Branch operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { error, branchKey, data, context }
        )
      )
    }
  } catch (error: unknown) {
    return Result.Err(
      createPipelineError(
        'branch',
        `Branch evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, data, context }
      )
    )
  }
}

/**
 * Execute operations in parallel and combine results
 */
export const parallel = async <TInput, TOutput>(
  data: TInput,
  operations: ParallelOperation<TInput, unknown>[],
  options: ParallelOptions = {}
): Promise<PipelineResult<TOutput>> => {
  const opts = mergeOptions(
    {
      maxConcurrency: operations.length,
      failFast: false,
      preserveOrder: true,
    } as ParallelOptions,
    options
  )

  const context = createContext('parallel', { operationCount: operations.length })

  try {
    // Create promises for all operations
    const promises = operations.map(async (operation, index) => {
      try {
        // const stepContext = addTrace(context, `parallel-${index}`) // Unused for now

        let result: unknown

        if (
          operation.constructor.name === 'AsyncFunction' ||
          (typeof operation === 'function' && operation.toString().includes('async'))
        ) {
          result = await operation(data)
        } else {
          result = operation(data)
        }

        return { index, result, error: null }
      } catch (error) {
        return {
          index,
          result: null,
          error: error instanceof Error ? error : new Error('Unknown error'),
        }
      }
    })

    // Execute with concurrency control
    let results: Array<{ index: number; result: unknown; error: Error | null }>

    if (opts.maxConcurrency && opts.maxConcurrency > 0 && opts.maxConcurrency < operations.length) {
      // Batch execution with concurrency limit
      const batches: Array<Promise<{ index: number; result: unknown; error: Error | null }>[]> = []
      for (let i = 0; i < promises.length; i += opts.maxConcurrency || 10) {
        batches.push(promises.slice(i, i + (opts.maxConcurrency || 10)))
      }

      const batchResults: Array<{ index: number; result: unknown; error: Error | null }> = []
      for (const batch of batches) {
        const batchResult = await Promise.all(batch)
        batchResults.push(...batchResult)
      }
      results = batchResults
    } else {
      // Execute all at once
      results = await Promise.all(promises)
    }

    // Check for errors
    const errors = results.filter(r => r.error !== null)

    if (errors.length > 0 && opts.failFast) {
      return Result.Err(
        createPipelineError('parallel', `${errors.length} parallel operation(s) failed`, {
          errors: errors.map(e => e.error),
          context,
        })
      )
    }

    // Extract successful results
    const successfulResults = results.filter(r => r.error === null).map(r => r.result)

    // Combine results
    let finalResult: TOutput

    if (opts.combiner) {
      finalResult = opts.combiner(data, successfulResults) as TOutput
    } else {
      // Default behavior: return array of results
      finalResult = successfulResults as TOutput
    }

    return Result.Ok(finalResult)
  } catch (error: unknown) {
    return Result.Err(
      createPipelineError(
        'parallel',
        `Parallel execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, data, context }
      )
    )
  }
}

/**
 * Validate data against schema or rules
 */
export const validate = async <T>(
  data: T,
  schema: Schema<T> | ValidationRule<T>[],
  options: ValidateOptions = {}
): Promise<PipelineResult<T>> => {
  const opts = mergeOptions(
    {
      stopOnFirst: false,
      collectErrors: true,
      strict: true,
      coerce: false,
    } as ValidateOptions,
    options
  )

  const context = createContext('validate', { dataType: typeof data })

  try {
    // Schema validation
    if ('parse' in schema && typeof schema.parse === 'function') {
      try {
        const result = schema.parse(data)

        if (Result.isErr(result)) {
          return Result.Err(
            createPipelineError('validate', 'Schema validation failed', {
              validationError: result.error,
              data,
              context,
            })
          )
        }

        return Result.Ok(result.value)
      } catch (error) {
        return Result.Err(
          createPipelineError(
            'validate',
            `Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { error, data, context }
          )
        )
      }
    }

    // Rule-based validation
    if (Array.isArray(schema)) {
      const rules = schema
      const errors: Array<{ rule: string; message: string; error?: unknown; data: T }> = []

      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i]
        if (!rule) continue

        try {
          let isValid: boolean

          if (
            rule.validate.constructor.name === 'AsyncFunction' ||
            rule.validate.toString().includes('async')
          ) {
            isValid = await rule.validate(data)
          } else {
            isValid = rule.validate(data) as boolean
          }

          if (!isValid) {
            const errorMessage =
              typeof rule.message === 'function'
                ? rule.message(data)
                : rule.message || `Rule '${rule.name}' failed`

            errors.push({
              rule: rule.name,
              message: errorMessage,
              data,
            })

            if (opts.stopOnFirst) {
              break
            }
          }
        } catch (error) {
          errors.push({
            rule: rule.name,
            message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error,
            data,
          })

          if (opts.stopOnFirst) {
            break
          }
        }
      }

      if (errors.length > 0) {
        return Result.Err(
          createPipelineError('validate', `${errors.length} validation rule(s) failed`, {
            validationErrors: errors,
            data,
            context,
          })
        )
      }

      return Result.Ok(data)
    }

    // Invalid schema type
    return Result.Err(
      createPipelineError(
        'validate',
        'Invalid schema type: must be Schema or ValidationRule array',
        { schema, data, context }
      )
    )
  } catch (error: unknown) {
    return Result.Err(
      createPipelineError(
        'validate',
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, data, context }
      )
    )
  }
}
