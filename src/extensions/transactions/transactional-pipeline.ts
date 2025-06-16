import { Result } from '../../core/result'
import type { Pipeline } from '../../core/pipeline'
import type {
  TransactionContext,
  TransactionManager,
  TransactionDefinition,
  TransactionStep,
  CompensationFunction,
  TransactionIsolation,
} from './transactions'
import { transactionStep, transaction } from './transaction-manager'

/**
 * Transactional pipeline configuration
 */
export interface TransactionalPipelineConfig {
  readonly autoCommit?: boolean | undefined
  readonly rollbackOnError?: boolean | undefined
  readonly timeout?: number | undefined
  readonly isolation?: TransactionIsolation | undefined
}

/**
 * Transactional pipeline step with compensation
 */
export interface TransactionalPipelineStep<TInput, TOutput> {
  readonly name: string
  readonly execute: (input: TInput, context?: TransactionContext) => Promise<Result<Error, TOutput>>
  readonly compensate?: CompensationFunction | undefined
  readonly timeout?: number | undefined
  readonly dependencies?: string[] | undefined
}

/**
 * Transaction-aware pipeline implementation
 */
export class TransactionalPipeline<TInput, TOutput> {
  private steps: TransactionalPipelineStep<unknown, unknown>[] = []
  private readonly config: TransactionalPipelineConfig

  constructor(
    private readonly name: string,
    private readonly transactionManager: TransactionManager,
    config: TransactionalPipelineConfig = {}
  ) {
    this.config = {
      autoCommit: true,
      rollbackOnError: true,
      timeout: 30000,
      isolation: 'read-committed',
      ...config,
    }
  }

  /**
   * Add a step to the pipeline
   */
  step<TStepOutput>(
    name: string,
    fn: (input: TOutput, context?: TransactionContext) => Promise<Result<Error, TStepOutput>>,
    options: {
      compensate?: CompensationFunction | undefined
      timeout?: number | undefined
      dependencies?: string[] | undefined
    } = {}
  ): TransactionalPipeline<TInput, TStepOutput> {
    const step: TransactionalPipelineStep<TOutput, TStepOutput> = {
      name,
      execute: fn,
      compensate: options.compensate,
      timeout: options.timeout,
      dependencies: options.dependencies,
    }

    const newPipeline = new TransactionalPipeline<TInput, TStepOutput>(
      this.name,
      this.transactionManager,
      this.config
    )
    newPipeline.steps = [...this.steps, step as TransactionalPipelineStep<unknown, unknown>]
    return newPipeline
  }

  /**
   * Add a map transformation step
   */
  map<TStepOutput>(
    fn: (input: TOutput, context?: TransactionContext) => TStepOutput | Promise<TStepOutput>,
    options: {
      name?: string | undefined
      compensate?: CompensationFunction | undefined
      timeout?: number | undefined
    } = {}
  ): TransactionalPipeline<TInput, Awaited<TStepOutput>> {
    return this.step(
      options.name || `map-${this.steps.length + 1}`,
      async (input, context) => {
        try {
          const result = await fn(input, context)
          return Result.Ok(result)
        } catch (error) {
          return Result.Err(error as Error)
        }
      },
      options
    )
  }

  /**
   * Add a filter step
   */
  filter(
    predicate: (input: TOutput, context?: TransactionContext) => boolean | Promise<boolean>,
    options: {
      name?: string | undefined
      compensate?: CompensationFunction | undefined
    } = {}
  ): TransactionalPipeline<TInput, TOutput> {
    return this.step(
      options.name || `filter-${this.steps.length + 1}`,
      async (input, context) => {
        try {
          const shouldPass = await predicate(input, context)
          if (shouldPass) {
            return Result.Ok(input)
          } else {
            return Result.Err(new Error('Filter condition not met'))
          }
        } catch (error) {
          return Result.Err(error as Error)
        }
      },
      options
    )
  }

  /**
   * Add a pipeline step that calls another pipeline
   */
  pipeline<TStepOutput>(
    subPipeline: Pipeline<TOutput, TStepOutput> | TransactionalPipeline<TOutput, TStepOutput>,
    options: {
      name?: string | undefined
      compensate?: CompensationFunction | undefined
      timeout?: number | undefined
    } = {}
  ): TransactionalPipeline<TInput, TStepOutput> {
    return this.step(
      options.name || `pipeline-${this.steps.length + 1}`,
      async (input, context) => {
        if (subPipeline instanceof TransactionalPipeline) {
          return await subPipeline.executeInTransaction(input, context)
        } else {
          const result = await subPipeline.run(input)
          if (Result.isErr(result)) {
            return Result.Err(
              result.error instanceof Error ? result.error : new Error(String(result.error))
            )
          }
          return Result.Ok(result.value)
        }
      },
      options
    )
  }

  /**
   * Execute pipeline within an existing transaction context
   */
  async executeInTransaction(
    input: TInput,
    context?: TransactionContext
  ): Promise<Result<Error, TOutput>> {
    try {
      let currentInput: unknown = input

      for (const step of this.steps) {
        // Add operation to transaction if context exists
        if (context) {
          const addOpResult = this.transactionManager.addOperation(context.transactionId, {
            type: 'custom',
            resource: `pipeline:${this.name}:${step.name}`,
            data: currentInput,
            compensationData: step.compensate ? { step: step.name } : undefined,
          })

          if (Result.isErr(addOpResult)) {
            return Result.Err(addOpResult.error)
          }
        }

        // Execute step
        const stepResult = await step.execute(currentInput, context)

        if (Result.isErr(stepResult)) {
          return Result.Err(stepResult.error)
        }

        currentInput = stepResult.value
      }

      return Result.Ok(currentInput as TOutput)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Execute pipeline with automatic transaction management
   */
  async execute(input: TInput): Promise<Result<Error, TOutput>> {
    if (this.config.autoCommit) {
      // Create and manage transaction automatically
      const transactionDef = this.toTransactionDefinition()
      return await this.executeAsTransaction(transactionDef, input)
    } else {
      // Execute without transaction (for compatibility)
      return await this.executeInTransaction(input)
    }
  }

  /**
   * Convert pipeline to transaction definition
   */
  private toTransactionDefinition(): TransactionDefinition<TOutput> {
    const transactionSteps: TransactionStep<unknown, unknown>[] = this.steps.map(step =>
      transactionStep(
        step.name,
        async (input: unknown, context: TransactionContext) => {
          return await step.execute(input, context)
        },
        {
          ...(step.compensate !== undefined && { compensate: step.compensate }),
          ...(step.timeout !== undefined && { timeout: step.timeout }),
        }
      )
    )

    return transaction(this.name, transactionSteps, {
      ...(this.config.isolation !== undefined && { isolation: this.config.isolation }),
      ...(this.config.timeout !== undefined && { timeout: this.config.timeout }),
    })
  }

  /**
   * Execute as transaction
   */
  private async executeAsTransaction<T>(
    definition: TransactionDefinition<T>,
    input: unknown
  ): Promise<Result<Error, T>> {
    const result = await this.transactionManager.execute(definition, input)

    if (Result.isErr(result)) {
      return Result.Err(result.error)
    }

    const transactionResult = result.value

    if (transactionResult.status === 'committed' && transactionResult.result !== undefined) {
      return Result.Ok(transactionResult.result)
    } else if (transactionResult.error) {
      return Result.Err(transactionResult.error)
    } else {
      return Result.Err(new Error(`Transaction failed with status: ${transactionResult.status}`))
    }
  }

  /**
   * Run pipeline (for backward compatibility)
   */
  async run(input: TInput): Promise<Result<Error, TOutput>> {
    return await this.execute(input)
  }

  /**
   * Get pipeline name
   */
  getName(): string {
    return this.name
  }

  /**
   * Get step count
   */
  getStepCount(): number {
    return this.steps.length
  }

  /**
   * Get step names
   */
  getStepNames(): string[] {
    return this.steps.map(step => step.name)
  }
}

/**
 * Create a new transactional pipeline
 */
export function transactionalPipeline<TInput>(
  name: string,
  transactionManager: TransactionManager,
  config?: TransactionalPipelineConfig
): TransactionalPipeline<TInput, TInput> {
  return new TransactionalPipeline(name, transactionManager, config)
}

/**
 * Convert regular pipeline to transactional pipeline
 */
export function makeTransactional<TInput, TOutput>(
  regularPipeline: Pipeline<TInput, TOutput>,
  transactionManager: TransactionManager,
  config?: TransactionalPipelineConfig
): TransactionalPipeline<TInput, TOutput> {
  const txPipeline = new TransactionalPipeline<TInput, TOutput>(
    'converted-pipeline',
    transactionManager,
    config
  )

  // Add a single step that executes the regular pipeline
  return txPipeline.step('execute-pipeline', async (input, _context) => {
    const result = await regularPipeline.run(input as unknown as TInput)
    if (Result.isErr(result)) {
      return Result.Err(
        result.error instanceof Error ? result.error : new Error(String(result.error))
      )
    }
    return Result.Ok(result.value)
  })
}

/**
 * Parallel transactional execution
 */
export async function parallelTransaction<T>(
  pipelines: TransactionalPipeline<T, unknown>[],
  transactionManager: TransactionManager,
  input: T[],
  options: {
    name?: string
    isolation?: TransactionIsolation
    timeout?: number
  } = {}
): Promise<Result<Error, unknown[]>> {
  const transactionSteps: TransactionStep<unknown, unknown>[] = pipelines.map((pipeline, index) =>
    transactionStep(
      `parallel-${pipeline.getName()}-${index}`,
      async (input: unknown, context: TransactionContext) => {
        const inputArray = input as T[]
        const pipelineInput = inputArray[index]
        if (pipelineInput === undefined) {
          return Result.Err(new Error(`No input provided for pipeline ${index}`))
        }
        return await pipeline.executeInTransaction(pipelineInput, context)
      }
    )
  )

  const transactionDef = transaction(options.name || 'parallel-transaction', transactionSteps, {
    ...(options.isolation !== undefined && { isolation: options.isolation }),
    ...(options.timeout !== undefined && { timeout: options.timeout }),
  })

  const result = await transactionManager.execute(transactionDef, input)

  if (Result.isErr(result)) {
    return Result.Err(result.error)
  }

  const transactionResult = result.value

  if (transactionResult.status === 'committed' && transactionResult.result !== undefined) {
    return Result.Ok(transactionResult.result as unknown[])
  } else if (transactionResult.error) {
    return Result.Err(transactionResult.error)
  } else {
    return Result.Err(
      new Error(`Parallel transaction failed with status: ${transactionResult.status}`)
    )
  }
}
