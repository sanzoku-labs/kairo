/**
 * PIPELINE Pillar Core Methods
 *
 * Implements the 8 core PIPELINE methods:
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
import type { Schema, PipelineError } from '../shared'
import { createPipelineError } from '../shared'
import { mergeOptions } from '../shared/config'
import { asyncMap } from '../../fp-utils/async'
// Functional programming enhancements applied
// Enhanced async operations with fp-utils
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
  ChainOperation,
  ParallelOperation,
  ValidationRule,
  ComposedPipeline,
} from './types'
import { createContext, addTrace } from './utils'

/**
 * Transform each item in a collection
 */
export const map = <TInput, TOutput>(
  data: TInput[],
  transform: TransformFunction<TInput, TOutput>,
  options: MapOptions = {}
): PipelineResult<TOutput[]> | Promise<PipelineResult<TOutput[]>> => {
  const opts = mergeOptions(
    {
      async: false,
      parallel: false,
      batchSize: 10,
      continueOnError: false,
    } as MapOptions,
    options
  )

  const context = createContext('map', { inputLength: data?.length ?? 0 })

  try {
    if (data === null || data === undefined) {
      return Result.Err(
        createPipelineError('map', 'Input cannot be null or undefined', { data, context })
      )
    }

    if (!Array.isArray(data)) {
      return Result.Err(createPipelineError('map', 'Input must be an array', { data, context }))
    }

    if (data.length === 0) {
      return Result.Ok([])
    }

    // Determine if we need async processing
    const needsAsync = opts.async || opts.parallel

    if (!needsAsync) {
      // Synchronous processing with functional patterns
      const results: TOutput[] = []

      for (let i = 0; i < data.length; i++) {
        try {
          const item = data[i]
          if (item === undefined) continue

          const result = transform(item, i, data) as TOutput
          results.push(result)
        } catch (error) {
          if (opts.continueOnError && opts.errorValue !== undefined) {
            results.push(opts.errorValue as TOutput)
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

    // Asynchronous processing
    return (async (): Promise<Result<PipelineError, TOutput[]>> => {
      const results: TOutput[] = []

      if (!opts.parallel) {
        // Sequential async processing
        for (let i = 0; i < data.length; i++) {
          try {
            const item = data[i]
            if (item === undefined) continue

            const result = await transform(item, i, data)
            results.push(result as TOutput)
          } catch (error) {
            if (opts.continueOnError && opts.errorValue !== undefined) {
              results.push(opts.errorValue as TOutput)
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

      // Enhanced parallel async processing with fp-utils asyncMap
      try {
        const safeTransform = async (item: TInput, index: number): Promise<TOutput> => {
          try {
            return await transform(item, index, data)
          } catch (error) {
            if (opts.continueOnError && opts.errorValue !== undefined) {
              return opts.errorValue as TOutput
            }
            throw error
          }
        }

        // Use fp-utils asyncMap for better async handling
        const indexedData = data.map((item, index) => ({ item, index }))
        const asyncTransformWithIndex = asyncMap(async ({ item, index }: { item: TInput; index: number }) => 
          safeTransform(item, index)
        )
        const allResults = await asyncTransformWithIndex(indexedData)
        return Result.Ok(allResults)
      } catch (error) {
        return Result.Err(
          createPipelineError(
            'map',
            `Parallel processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { error, context }
          )
        )
      }
    })()
  } catch (error: unknown) {
    return Result.Err(
      createPipelineError(
        'map',
        `Map operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, context }
      )
    )
  }
}

/**
 * Filter collection based on predicate
 */
export const filter = <T>(
  data: T[],
  predicate: PredicateFunction<T>,
  options: FilterOptions = {}
): PipelineResult<T[]> | Promise<PipelineResult<T[]>> => {
  const opts = mergeOptions(
    {
      async: false,
      keepErrors: false,
    } as FilterOptions,
    options
  )

  const context = createContext('filter', { inputLength: data?.length ?? 0 })

  try {
    if (data === null || data === undefined) {
      return Result.Err(
        createPipelineError('filter', 'Input cannot be null or undefined', { data, context })
      )
    }

    if (!Array.isArray(data)) {
      return Result.Err(createPipelineError('filter', 'Input must be an array', { data, context }))
    }

    // Determine if we need async processing
    const needsAsync = opts.async

    if (!needsAsync) {
      // Synchronous processing with functional error handling
      const safePredicate = (item: T, index: number): boolean => {
        try {
          return predicate(item, index, data) as boolean
        } catch (error) {
          if (opts.continueOnError) {
            return false // Exclude items that cause errors
          }
          throw error
        }
      }

      try {
        const results = data.filter((item, index) => {
          if (item === undefined) return false
          return safePredicate(item, index)
        })
        return Result.Ok(results)
      } catch (error) {
        return Result.Err(
          createPipelineError(
            'filter',
            `Filter operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { error, context }
          )
        )
      }
    }

    // Asynchronous processing
    return (async (): Promise<Result<PipelineError, T[]>> => {
      const results: T[] = []

      for (let i = 0; i < data.length; i++) {
        try {
          const item = data[i]
          if (item === undefined) continue

          const shouldInclude = await predicate(item, i, data)

          if (shouldInclude) {
            results.push(item)
          }
        } catch (error) {
          if (opts.continueOnError) {
            continue
          }
          return Result.Err(
            createPipelineError(
              'filter',
              `Predicate failed at index ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              { error, item: data[i], index: i, context }
            )
          )
        }
      }

      return Result.Ok(results)
    })()
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
export const reduce = <TInput, TOutput>(
  data: TInput[],
  reducer: ReducerFunction<TInput, TOutput>,
  initialValue: TOutput,
  options: ReduceOptions = {}
): PipelineResult<TOutput> | Promise<PipelineResult<TOutput>> => {
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

    // Determine if we need async processing
    const needsAsync = opts.async

    if (!needsAsync) {
      // Synchronous processing
      let accumulator = initialValue

      for (let i = 0; i < data.length; i++) {
        try {
          const item = data[i]
          if (item === undefined) continue

          accumulator = reducer(accumulator, item, i, data) as TOutput
        } catch (error) {
          return Result.Err(
            createPipelineError(
              'reduce',
              `Reducer failed at index ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              { error, item: data[i], index: i, accumulator, context }
            )
          )
        }
      }

      return Result.Ok(accumulator)
    }

    // Asynchronous processing
    return (async (): Promise<Result<PipelineError, TOutput>> => {
      let accumulator = initialValue

      for (let i = 0; i < data.length; i++) {
        try {
          const item = data[i]
          if (item === undefined) continue

          accumulator = await reducer(accumulator, item, i, data)
        } catch (error) {
          return Result.Err(
            createPipelineError(
              'reduce',
              `Reducer failed at index ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              { error, item: data[i], index: i, accumulator, context }
            )
          )
        }
      }

      return Result.Ok(accumulator)
    })()
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

  return (data: TInput): PipelineResult<TOutput> | Promise<PipelineResult<TOutput>> => {
    const context = createContext('compose', { operationCount: operations.length })
    let currentData: unknown = data
    const intermediateResults: unknown[] = []

    const executeSync = (): PipelineResult<TOutput> => {
      try {
        for (let i = 0; i < operations.length; i++) {
          const operation = operations[i]
          if (!operation) continue

          try {
            // Execute operation synchronously
            const result = operation(currentData)

            // Handle Result type
            if (result && typeof result === 'object' && 'tag' in result) {
              const resultObj = result as { tag: string; value?: unknown; error?: unknown }
              if (resultObj.tag === 'Err') {
                if (opts.stopOnError) {
                  let errorMessage = `Operation ${i} failed`
                  if (resultObj.error instanceof Error) {
                    errorMessage = resultObj.error.message
                  } else if (
                    resultObj.error &&
                    typeof resultObj.error === 'object' &&
                    'message' in resultObj.error
                  ) {
                    errorMessage = String((resultObj.error as { message: unknown }).message)
                  }
                  return Result.Err(
                    createPipelineError('compose', errorMessage, {
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
                  error instanceof Error ? error.message : `Operation ${i} failed`,
                  { error, operationIndex: i, intermediateResults, context }
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

    const executeAsync = async (): Promise<PipelineResult<TOutput>> => {
      try {
        for (let i = 0; i < operations.length; i++) {
          const operation = operations[i]
          if (!operation) continue

          try {
            // Execute operation
            let result: unknown

            // Execute the operation
            result = operation(currentData)

            // Check if the result is a Promise and await it
            if (
              result &&
              typeof result === 'object' &&
              'then' in result &&
              typeof result.then === 'function'
            ) {
              result = await (result as Promise<unknown>)
            }

            // Handle Result type
            if (result && typeof result === 'object' && 'tag' in result) {
              const resultObj = result as { tag: string; value?: unknown; error?: unknown }
              if (resultObj.tag === 'Err') {
                if (opts.stopOnError) {
                  let errorMessage = `Operation ${i} failed`
                  if (resultObj.error instanceof Error) {
                    errorMessage = resultObj.error.message
                  } else if (
                    resultObj.error &&
                    typeof resultObj.error === 'object' &&
                    'message' in resultObj.error
                  ) {
                    errorMessage = String((resultObj.error as { message: unknown }).message)
                  }
                  return Result.Err(
                    createPipelineError('compose', errorMessage, {
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
                  error instanceof Error ? error.message : `Operation ${i} failed`,
                  { error, operationIndex: i, intermediateResults, context }
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

    // Check if any operation is async using functional pattern
    const isAsyncOperation = (op: PipelineOperation<unknown, unknown> | null): boolean =>
      op?.constructor.name === 'AsyncFunction' ||
      (typeof op === 'function' && op.toString().includes('async'))

    const hasAsyncOperation = opts.async || operations.some(isAsyncOperation)

    if (hasAsyncOperation) {
      return executeAsync()
    } else {
      return executeSync()
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

        // Execute operation using pattern to determine async execution
        const shouldExecuteAsync = 
          operation.constructor.name === 'AsyncFunction' ||
          (typeof operation === 'function' && operation.toString().includes('async'))

        if (shouldExecuteAsync) {
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
 * Conditional execution based on data - routes data into multiple branches based on conditions
 */
export const branch = <TInput, TOutput = Record<string, TInput[]>>(
  data: TInput | TInput[],
  conditions: Record<string, (item: TInput) => boolean | Promise<boolean>>,
  options: BranchOptions & { async?: boolean; exclusive?: boolean; includeDefault?: boolean } = {}
): PipelineResult<TOutput> | Promise<PipelineResult<TOutput>> => {
  const opts = mergeOptions(
    {
      cache: false,
      cacheConditions: false,
      async: false,
      exclusive: false,
      includeDefault: false,
    },
    options
  )

  if (!conditions || typeof conditions !== 'object') {
    return Result.Err(
      createPipelineError('branch', 'Conditions must be an object with predicate functions', {
        conditions,
        data,
      })
    )
  }

  const context = createContext('branch', { branchCount: Object.keys(conditions).length })

  // Normalize data to array
  const items = Array.isArray(data) ? data : [data]
  const conditionEntries = Object.entries(conditions)

  const executeBranching = (): PipelineResult<TOutput> => {
    try {
      const branches: Record<string, TInput[]> = {}
      const defaultBranch: TInput[] = []

      // Initialize branches using functional approach
      for (const [key] of conditionEntries) {
        branches[key] = []
      }

      // Process each item
      for (const item of items) {
        let matched = false

        for (const [key, condition] of conditionEntries) {
          try {
            const result = condition(item) as boolean

            if (result) {
              branches[key]!.push(item)
              matched = true

              if (opts.exclusive) {
                break // Only match first condition in exclusive mode
              }
            }
          } catch (error) {
            return Result.Err(
              createPipelineError(
                'branch',
                `Condition '${key}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { error, item, condition: key, context }
              )
            )
          }
        }

        // Add to default branch if no matches and includeDefault is true
        if (!matched && opts.includeDefault) {
          defaultBranch.push(item)
        }
      }

      // Add default branch if it has items
      if (defaultBranch.length > 0) {
        branches['default'] = defaultBranch
      }

      return Result.Ok(branches as TOutput)
    } catch (error: unknown) {
      return Result.Err(
        createPipelineError(
          'branch',
          `Branch operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { error, data, context }
        )
      )
    }
  }

  const executeBranchingAsync = async (): Promise<PipelineResult<TOutput>> => {
    try {
      const branches: Record<string, TInput[]> = {}
      const defaultBranch: TInput[] = []

      // Initialize branches
      for (const [key] of conditionEntries) {
        branches[key] = []
      }

      // Process each item
      for (const item of items) {
        let matched = false

        for (const [key, condition] of conditionEntries) {
          try {
            const result = await condition(item)

            if (result) {
              branches[key]!.push(item)
              matched = true

              if (opts.exclusive) {
                break // Only match first condition in exclusive mode
              }
            }
          } catch (error) {
            return Result.Err(
              createPipelineError(
                'branch',
                `Condition '${key}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { error, item, condition: key, context }
              )
            )
          }
        }

        // Add to default branch if no matches and includeDefault is true
        if (!matched && opts.includeDefault) {
          defaultBranch.push(item)
        }
      }

      // Add default branch if it has items
      if (defaultBranch.length > 0) {
        branches['default'] = defaultBranch
      }

      return Result.Ok(branches as TOutput)
    } catch (error: unknown) {
      return Result.Err(
        createPipelineError(
          'branch',
          `Branch operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { error, data, context }
        )
      )
    }
  }

  // Check if we need async processing using functional patterns
  const isAsyncCondition = ([, condition]: [string, (item: TInput) => boolean | Promise<boolean>]): boolean =>
    condition.constructor.name === 'AsyncFunction' ||
    (typeof condition === 'function' && condition.toString().includes('async'))

  const needsAsync = opts.async || conditionEntries.some(isAsyncCondition)

  if (needsAsync) {
    return executeBranchingAsync()
  } else {
    return executeBranching()
  }
}

/**
 * Execute operations in parallel and combine results
 */
export const parallel = async <TInput, TOutput>(
  operations: ParallelOperation<TInput, unknown>[],
  options: ParallelOptions = {}
): Promise<PipelineResult<TOutput>> => {
  if (!Array.isArray(operations)) {
    return Result.Err(
      createPipelineError('parallel', 'Operations must be an array', { operations })
    )
  }

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

        // Execute the operation
        result = (operation as () => unknown)()

        // Check if the result is a Promise and await it
        if (
          result &&
          typeof result === 'object' &&
          'then' in result &&
          typeof result.then === 'function'
        ) {
          result = await (result as Promise<unknown>)
        }

        // Check if the result is a Result.Err and treat it as an error
        if (result && typeof result === 'object' && 'tag' in result) {
          const resultObj = result as { tag: string; error?: unknown }
          if (resultObj.tag === 'Err') {
            const errorMessage =
              resultObj.error instanceof Error ? resultObj.error.message : 'Operation failed'
            return {
              index,
              result: null,
              error: new Error(errorMessage),
            }
          }
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

    // Execute with enhanced async utilities
    let results: Array<{ index: number; result: unknown; error: Error | null }>

    if (opts.maxConcurrency && opts.maxConcurrency > 0 && opts.maxConcurrency < operations.length) {
      // Use fp-utils for controlled concurrency batching
      const batches: Promise<{ index: number; result: unknown; error: Error | null }>[][] = []
      for (let i = 0; i < promises.length; i += opts.maxConcurrency || 10) {
        batches.push(promises.slice(i, i + (opts.maxConcurrency || 10)))
      }

      // Process batches sequentially with asyncMap for each batch
      const batchResults: Array<{ index: number; result: unknown; error: Error | null }> = []
      for (const batch of batches) {
        const batchResult = await Promise.all(batch)
        batchResults.push(...batchResult)
      }
      results = batchResults
    } else {
      // Execute all at once with Promise.all (already optimal for full parallel)
      results = await Promise.all(promises)
    }

    // Check for errors
    const errors = results.filter(r => r.error !== null)

    if (errors.length > 0) {
      if (opts.failFast) {
        const firstError = errors[0]?.error
        const errorMessage = firstError instanceof Error ? firstError.message : String(firstError)

        return Result.Err(
          createPipelineError(
            'parallel',
            `${errors.length} parallel operation(s) failed: ${errorMessage}`,
            {
              errors: errors.map(e => e.error),
              context,
            }
          )
        )
      } else if (errors.length === operations.length) {
        // All operations failed
        const firstError = errors[0]?.error
        const errorMessage = firstError instanceof Error ? firstError.message : String(firstError)

        return Result.Err(
          createPipelineError('parallel', `All parallel operations failed: ${errorMessage}`, {
            errors: errors.map(e => e.error),
            context,
          })
        )
      }
    }

    // Extract results based on collectErrors option
    let finalResults: unknown[]

    if (opts.collectErrors) {
      // Include both successful results and errors/nulls for failed operations
      finalResults = results.map(r => (r.error === null ? r.result : null))
    } else {
      // Only include successful results
      finalResults = results.filter(r => r.error === null).map(r => r.result)
    }

    // Combine results
    let finalResult: TOutput

    if (opts.combiner) {
      finalResult = opts.combiner(null, finalResults) as TOutput
    } else {
      // Default behavior: return array of results
      finalResult = finalResults as TOutput
    }

    return Result.Ok(finalResult)
  } catch (error: unknown) {
    return Result.Err(
      createPipelineError(
        'parallel',
        `Parallel execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, context }
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
          // Use pattern for async detection
          const shouldExecuteAsync = 
            rule.validate.constructor.name === 'AsyncFunction' ||
            rule.validate.toString().includes('async')

          const isValid: boolean = shouldExecuteAsync
            ? await rule.validate(data)
            : rule.validate(data) as boolean

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
