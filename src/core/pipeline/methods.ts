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

import { Result, Schema } from '../foundation'
import { PipelineError, createPipelineError } from '../errors'
import { mergeOptions } from '../config'
import {
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
  PipelineContext,
  ComposedPipeline
} from './types'
import {
  createContext,
  addTrace,
  trap,
  toResult,
  toAsyncResult,
  combineResults,
  extractSuccessful,
  extractErrors,
  allSuccessful
} from './utils'

/**
 * Transform each item in a collection
 */
export const map = async <TInput, TOutput>(
  data: TInput[],
  transform: TransformFunction<TInput, TOutput>,
  options: MapOptions = {}
): Promise<PipelineResult<TOutput[]>> => {
  const opts = mergeOptions({
    async: false,
    parallel: false,
    batchSize: 10,
    keepErrors: false
  }, options)
  
  const context = createContext('map', { inputLength: data.length })
  
  try {
    if (!Array.isArray(data)) {
      return Result.error(createPipelineError(
        'map',
        'Input must be an array',
        { data, context }
      ))
    }
    
    if (data.length === 0) {
      return Result.ok([])
    }
    
    // Sequential processing
    if (!opts.parallel) {
      const results: TOutput[] = []
      
      for (let i = 0; i < data.length; i++) {
        try {
          const item = data[i]
          let result: TOutput
          
          if (opts.async) {
            result = await transform(item, i, data)
          } else {
            result = transform(item, i, data) as TOutput
          }
          
          results.push(result)
        } catch (error) {
          if (opts.fallback) {
            const fallbackResult = opts.fallback(error, data[i], i)
            results.push(fallbackResult)
          } else if (opts.keepErrors) {
            // Skip errors and continue
            continue
          } else {
            return Result.error(createPipelineError(
              'map',
              `Transform failed at index ${i}: ${error}`,
              { error, item: data[i], index: i, context }
            ))
          }
        }
      }
      
      return Result.ok(results)
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
            return opts.fallback(error, item, globalIndex)
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
        return Result.error(createPipelineError(
          'map',
          `Parallel processing failed: ${error}`,
          { error, context }
        ))
      }
    }
    
    return Result.ok(allResults)
    
  } catch (error: any) {
    return Result.error(createPipelineError(
      'map',
      `Map operation failed: ${error.message}`,
      { error, data, context }
    ))
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
  const opts = mergeOptions({
    async: false,
    keepErrors: false
  }, options)
  
  const context = createContext('filter', { inputLength: data.length })
  
  try {
    if (!Array.isArray(data)) {
      return Result.error(createPipelineError(
        'filter',
        'Input must be an array',
        { data, context }
      ))
    }
    
    const results: T[] = []
    
    for (let i = 0; i < data.length; i++) {
      try {
        const item = data[i]
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
          opts.onError(error, data[i], i)
        }
        
        if (!opts.keepErrors) {
          return Result.error(createPipelineError(
            'filter',
            `Predicate failed at index ${i}: ${error}`,
            { error, item: data[i], index: i, context }
          ))
        }
        // Skip errors and continue
      }
    }
    
    return Result.ok(results)
    
  } catch (error: any) {
    return Result.error(createPipelineError(
      'filter',
      `Filter operation failed: ${error.message}`,
      { error, data, context }
    ))
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
  const opts = mergeOptions({
    async: false,
    parallel: false, // Reduce is inherently sequential
    checkpoints: false
  }, options)
  
  const context = createContext('reduce', { inputLength: data.length })
  
  try {
    if (!Array.isArray(data)) {
      return Result.error(createPipelineError(
        'reduce',
        'Input must be an array',
        { data, context }
      ))
    }
    
    let accumulator = initialValue
    const checkpoints: any[] = []
    
    for (let i = 0; i < data.length; i++) {
      try {
        const item = data[i]
        
        if (opts.async) {
          accumulator = await reducer(accumulator, item, i, data)
        } else {
          accumulator = reducer(accumulator, item, i, data) as TOutput
        }
        
        // Store checkpoints if enabled
        if (opts.checkpoints && opts.checkpointInterval && (i + 1) % opts.checkpointInterval === 0) {
          checkpoints.push({
            index: i,
            value: accumulator,
            timestamp: Date.now()
          })
        }
      } catch (error) {
        return Result.error(createPipelineError(
          'reduce',
          `Reducer failed at index ${i}: ${error}`,
          { error, item: data[i], index: i, accumulator, checkpoints, context }
        ))
      }
    }
    
    return Result.ok(accumulator)
    
  } catch (error: any) {
    return Result.error(createPipelineError(
      'reduce',
      `Reduce operation failed: ${error.message}`,
      { error, data, context }
    ))
  }
}

/**
 * Compose multiple operations into single pipeline
 */
export const compose = <TInput, TOutput>(
  operations: PipelineOperation<any, any>[],
  options: ComposeOptions = {}
): ComposedPipeline<TInput, TOutput> => {
  const opts = mergeOptions({
    stopOnError: true,
    rollback: false,
    optimize: false,
    memoize: false
  }, options)
  
  return async (data: TInput): Promise<PipelineResult<TOutput>> => {
    const context = createContext('compose', { operationCount: operations.length })
    let currentData: any = data
    const intermediateResults: any[] = []
    
    try {
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i]
        const stepContext = addTrace(context, `step-${i}`)
        
        try {
          // Execute operation
          let result: any
          
          if (operation.constructor.name === 'AsyncFunction' || 
              (typeof operation === 'function' && operation.toString().includes('async'))) {
            result = await operation(currentData)
          } else {
            result = operation(currentData)
          }
          
          // Handle Result type
          if (result && typeof result === 'object' && 'isOk' in result) {
            if (Result.isError(result)) {
              if (opts.stopOnError) {
                return result
              } else {
                // Continue with previous data
                continue
              }
            } else {
              currentData = result.value
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
            return Result.error(createPipelineError(
              'compose',
              `Operation ${i} failed: ${error}`,
              { error, operationIndex: i, intermediateResults, context: stepContext }
            ))
          }
          // Continue with previous data if not stopping on error
        }
      }
      
      return Result.ok(currentData)
      
    } catch (error: any) {
      return Result.error(createPipelineError(
        'compose',
        `Composition failed: ${error.message}`,
        { error, intermediateResults, context }
      ))
    }
  }
}

/**
 * Chain operations with data flowing through
 */
export const chain = async <TInput, TOutput>(
  data: TInput,
  operations: ChainOperation<any, any>[],
  options: ChainOptions = {}
): Promise<PipelineResult<TOutput>> => {
  const opts = mergeOptions({
    stopOnError: true,
    collectResults: false
  }, options)
  
  const context = createContext('chain', { operationCount: operations.length })
  let currentData: any = data
  const results: any[] = []
  
  try {
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i]
      const stepContext = addTrace(context, `chain-${i}`)
      
      try {
        let result: any
        
        // Execute operation
        if (operation.constructor.name === 'AsyncFunction' || 
            (typeof operation === 'function' && operation.toString().includes('async'))) {
          result = await operation(currentData)
        } else {
          result = operation(currentData)
        }
        
        // Handle Result type
        if (result && typeof result === 'object' && 'isOk' in result) {
          if (Result.isError(result)) {
            if (opts.stopOnError) {
              return result
            } else {
              // Continue with previous data
              continue
            }
          } else {
            currentData = result.value
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
          return Result.error(createPipelineError(
            'chain',
            `Chain operation ${i} failed: ${error}`,
            { error, operationIndex: i, results, context: stepContext }
          ))
        }
        // Continue with previous data if not stopping on error
      }
    }
    
    return Result.ok(currentData)
    
  } catch (error: any) {
    return Result.error(createPipelineError(
      'chain',
      `Chain operation failed: ${error.message}`,
      { error, results, context }
    ))
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
  const opts = mergeOptions({
    cache: false,
    cacheConditions: false
  }, options)
  
  const context = createContext('branch', { branchCount: Object.keys(branches).length })
  
  try {
    // Evaluate condition
    let conditionResult: boolean | string
    
    if (condition.constructor.name === 'AsyncFunction' || 
        (typeof condition === 'function' && condition.toString().includes('async'))) {
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
        operation = opts.fallback
      }
      
      if (!operation) {
        return Result.error(createPipelineError(
          'branch',
          `No branch found for condition result: ${branchKey}`,
          { conditionResult, availableBranches: Object.keys(branches), data, context }
        ))
      }
    }
    
    // Execute selected operation
    try {
      let result: any
      
      if (operation.constructor.name === 'AsyncFunction' || 
          (typeof operation === 'function' && operation.toString().includes('async'))) {
        result = await operation(data)
      } else {
        result = operation(data)
      }
      
      // Handle Result type
      if (result && typeof result === 'object' && 'isOk' in result) {
        return result
      } else {
        return Result.ok(result)
      }
      
    } catch (error) {
      return Result.error(createPipelineError(
        'branch',
        `Branch operation failed: ${error}`,
        { error, branchKey, data, context }
      ))
    }
    
  } catch (error: any) {
    return Result.error(createPipelineError(
      'branch',
      `Branch evaluation failed: ${error.message}`,
      { error, data, context }
    ))
  }
}

/**
 * Execute operations in parallel and combine results
 */
export const parallel = async <TInput, TOutput>(
  data: TInput,
  operations: ParallelOperation<TInput, any>[],
  options: ParallelOptions = {}
): Promise<PipelineResult<TOutput>> => {
  const opts = mergeOptions({
    maxConcurrency: operations.length,
    failFast: false,
    preserveOrder: true
  }, options)
  
  const context = createContext('parallel', { operationCount: operations.length })
  
  try {
    // Create promises for all operations
    const promises = operations.map(async (operation, index) => {
      try {
        const stepContext = addTrace(context, `parallel-${index}`)
        
        let result: any
        
        if (operation.constructor.name === 'AsyncFunction' || 
            (typeof operation === 'function' && operation.toString().includes('async'))) {
          result = await operation(data)
        } else {
          result = operation(data)
        }
        
        return { index, result, error: null }
      } catch (error) {
        return { index, result: null, error }
      }
    })
    
    // Execute with concurrency control
    let results: any[]
    
    if (opts.maxConcurrency && opts.maxConcurrency < operations.length) {
      // Batch execution with concurrency limit
      const batches: Promise<any>[][] = []
      for (let i = 0; i < promises.length; i += opts.maxConcurrency) {
        batches.push(promises.slice(i, i + opts.maxConcurrency))
      }
      
      const batchResults: any[] = []
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
      return Result.error(createPipelineError(
        'parallel',
        `${errors.length} parallel operation(s) failed`,
        { errors: errors.map(e => e.error), context }
      ))
    }
    
    // Extract successful results
    const successfulResults = results
      .filter(r => r.error === null)
      .map(r => r.result)
    
    // Combine results
    let finalResult: TOutput
    
    if (opts.combiner) {
      finalResult = opts.combiner(data, successfulResults)
    } else {
      // Default behavior: return array of results
      finalResult = successfulResults as TOutput
    }
    
    return Result.ok(finalResult)
    
  } catch (error: any) {
    return Result.error(createPipelineError(
      'parallel',
      `Parallel execution failed: ${error.message}`,
      { error, data, context }
    ))
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
  const opts = mergeOptions({
    stopOnFirst: false,
    collectErrors: true,
    strict: true,
    coerce: false
  }, options)
  
  const context = createContext('validate', { dataType: typeof data })
  
  try {
    // Schema validation
    if ('validate' in schema && typeof schema.validate === 'function') {
      try {
        const result = (schema as Schema<T>).validate(data)
        
        if (Result.isError(result)) {
          return Result.error(createPipelineError(
            'validate',
            'Schema validation failed',
            { validationError: result.error, data, context }
          ))
        }
        
        return Result.ok(result.value)
      } catch (error) {
        return Result.error(createPipelineError(
          'validate',
          `Schema validation error: ${error}`,
          { error, data, context }
        ))
      }
    }
    
    // Rule-based validation
    if (Array.isArray(schema)) {
      const rules = schema as ValidationRule<T>[]
      const errors: any[] = []
      
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i]
        
        try {
          let isValid: boolean
          
          if (rule.validate.constructor.name === 'AsyncFunction' || 
              rule.validate.toString().includes('async')) {
            isValid = await rule.validate(data)
          } else {
            isValid = rule.validate(data) as boolean
          }
          
          if (!isValid) {
            const errorMessage = typeof rule.message === 'function' 
              ? rule.message(data)
              : rule.message || `Rule '${rule.name}' failed`
              
            errors.push({
              rule: rule.name,
              message: errorMessage,
              data
            })
            
            if (opts.stopOnFirst) {
              break
            }
          }
        } catch (error) {
          errors.push({
            rule: rule.name,
            message: `Rule execution failed: ${error}`,
            error,
            data
          })
          
          if (opts.stopOnFirst) {
            break
          }
        }
      }
      
      if (errors.length > 0) {
        return Result.error(createPipelineError(
          'validate',
          `${errors.length} validation rule(s) failed`,
          { validationErrors: errors, data, context }
        ))
      }
      
      return Result.ok(data)
    }
    
    // Invalid schema type
    return Result.error(createPipelineError(
      'validate',
      'Invalid schema type: must be Schema or ValidationRule array',
      { schema, data, context }
    ))
    
  } catch (error: any) {
    return Result.error(createPipelineError(
      'validate',
      `Validation failed: ${error.message}`,
      { error, data, context }
    ))
  }
}