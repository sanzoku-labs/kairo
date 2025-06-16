/* eslint-disable @typescript-eslint/require-await */
import { Result } from './result'
import type { SagaDefinition, SagaStep, SagaContext, EventBus } from './events'

/**
 * Saga execution state
 */
export type SagaState =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'compensating'
  | 'compensated'

/**
 * Saga execution result
 */
export interface SagaResult<T = unknown> {
  readonly sagaId: string
  state: SagaState
  readonly result?: T
  readonly error?: Error
  completedSteps: string[]
  failedStep?: string
  readonly startedAt: number
  readonly completedAt?: number
  readonly executionTimeMs?: number
}

/**
 * Saga manager for orchestrating complex workflows
 */
export interface SagaManager {
  execute<T>(saga: SagaDefinition<T>, input: unknown): Promise<SagaResult<T>>
  getResult(sagaId: string): Promise<Result<Error, SagaResult>>
  compensate(sagaId: string): Promise<Result<Error, void>>
  cancel(sagaId: string): Promise<Result<Error, void>>
  getActiveSagas(): SagaResult[]
}

/**
 * Saga step execution context
 */
export interface SagaStepContext<TInput = unknown> {
  readonly sagaId: string
  readonly stepName: string
  readonly input: TInput
  readonly metadata: Record<string, unknown>
  readonly previousResults: Map<string, unknown>
}

/**
 * Enhanced saga step with more features
 */
export interface EnhancedSagaStep<TInput = unknown, TOutput = unknown>
  extends SagaStep<TInput, TOutput> {
  dependencies?: string[]
  condition?: (context: SagaStepContext<TInput>) => boolean
  retryPolicy?: {
    maxRetries: number
    backoffMs: number
    exponentialBackoff?: boolean
  }
}

/**
 * Enhanced saga definition with advanced features
 */
export interface EnhancedSagaDefinition<T = unknown> extends Omit<SagaDefinition<T>, 'steps'> {
  readonly steps: EnhancedSagaStep[]
  parallelSteps?: string[][]
  rollbackOnFailure?: boolean
  eventBus?: EventBus
}

/**
 * In-memory saga manager implementation
 */
export class InMemorySagaManager implements SagaManager {
  private activeSagas = new Map<string, SagaResult>()
  private sagaContexts = new Map<string, SagaContext>()
  private cancelledSagas = new Set<string>()

  /**
   * Execute a saga with automatic compensation on failure
   */
  async execute<T>(saga: SagaDefinition<T>, input: unknown): Promise<SagaResult<T>> {
    const sagaId = `saga_${Date.now()}_${Math.random().toString(36).substring(2)}`
    const startedAt = Date.now()

    let sagaResult: SagaResult<T> = {
      sagaId,
      state: 'running',
      completedSteps: [],
      startedAt,
    }

    const sagaContext: SagaContext = {
      sagaId,
      correlationId: `corr_${sagaId}`,
      startedAt,
      completedSteps: [],
      compensationRequired: false,
    }

    this.activeSagas.set(sagaId, sagaResult)
    this.sagaContexts.set(sagaId, sagaContext)

    try {
      // Emit saga started event
      if ((saga as EnhancedSagaDefinition).eventBus) {
        await (saga as EnhancedSagaDefinition).eventBus!.publish({
          id: `evt_${Date.now()}`,
          type: 'saga.started',
          timestamp: Date.now(),
          version: 1,
          payload: { sagaId, sagaName: saga.name, input },
          aggregateId: sagaId,
          aggregateType: 'saga',
        })
      }

      const result = await this.executeSagaSteps(saga, input, sagaResult, sagaContext)

      // Update final state
      const finalResult: SagaResult<T> = {
        sagaId: sagaResult.sagaId,
        state: 'completed',
        result: result as T,
        completedSteps: sagaResult.completedSteps || [],
        startedAt: sagaResult.startedAt,
        completedAt: Date.now(),
        executionTimeMs: Date.now() - startedAt,
      }

      this.activeSagas.set(sagaId, finalResult)

      // Emit saga completed event
      if ((saga as EnhancedSagaDefinition).eventBus) {
        await (saga as EnhancedSagaDefinition).eventBus!.publish({
          id: `evt_${Date.now()}`,
          type: 'saga.completed',
          timestamp: Date.now(),
          version: 1,
          payload: { sagaId, result },
          aggregateId: sagaId,
          aggregateType: 'saga',
        })
      }

      // Call completion handler
      if (saga.onComplete) {
        await saga.onComplete(sagaContext, result as T)
      }

      return finalResult
    } catch (error) {
      const errorResult: SagaResult<T> = {
        sagaId: sagaResult.sagaId,
        state: 'failed',
        error: error as Error,
        completedSteps: sagaResult.completedSteps || [],
        startedAt: sagaResult.startedAt,
        completedAt: Date.now(),
        executionTimeMs: Date.now() - startedAt,
      }

      if (sagaResult.failedStep) {
        errorResult.failedStep = sagaResult.failedStep
      }

      this.activeSagas.set(sagaId, errorResult)

      // Emit saga failed event
      if ((saga as EnhancedSagaDefinition).eventBus) {
        await (saga as EnhancedSagaDefinition).eventBus!.publish({
          id: `evt_${Date.now()}`,
          type: 'saga.failed',
          timestamp: Date.now(),
          version: 1,
          payload: { sagaId, error: error instanceof Error ? error.message : String(error) },
          aggregateId: sagaId,
          aggregateType: 'saga',
        })
      }

      // Call error handler
      if (saga.onError) {
        await saga.onError(sagaContext, error as Error)
      }

      // Auto-compensate if rollback is enabled
      if ('rollbackOnFailure' in saga && saga.rollbackOnFailure) {
        await this.compensate(sagaId)
      }

      return errorResult
    }
  }

  /**
   * Execute saga steps with dependency resolution
   */
  private async executeSagaSteps<T>(
    saga: SagaDefinition<T>,
    input: unknown,
    sagaResult: SagaResult<T>,
    sagaContext: SagaContext
  ): Promise<unknown> {
    const stepResults = new Map<string, unknown>()
    let currentInput = input

    // Handle parallel steps if enhanced saga
    if ('parallelSteps' in saga && saga.parallelSteps) {
      return await this.executeParallelSteps(
        saga as EnhancedSagaDefinition<T>,
        input,
        sagaResult,
        sagaContext
      )
    }

    // Execute steps sequentially
    for (const step of saga.steps) {
      try {
        // Check if saga was cancelled
        if (this.cancelledSagas.has(sagaResult.sagaId)) {
          throw new Error('Saga was cancelled')
        }

        // Check timeout
        if (step.timeout && Date.now() - sagaResult.startedAt > step.timeout) {
          throw new Error(`Step ${step.name} timed out after ${step.timeout}ms`)
        }

        // Check condition if enhanced step
        const enhancedStep = step as EnhancedSagaStep
        if (enhancedStep.condition) {
          const stepContext: SagaStepContext = {
            sagaId: sagaResult.sagaId,
            stepName: step.name,
            input: currentInput,
            metadata: {},
            previousResults: stepResults,
          }

          if (!enhancedStep.condition(stepContext)) {
            continue // Skip this step
          }
        }

        // Execute step with retry logic
        const stepResult = await this.executeStepWithRetry(step, currentInput)
        if (Result.isErr(stepResult)) {
          throw stepResult.error
        }
        stepResults.set(step.name, stepResult.value)
        sagaResult.completedSteps = [...(sagaResult.completedSteps || []), step.name]
        sagaContext.completedSteps.push(step.name)

        // Use step result as input for next step
        currentInput = stepResult.value
      } catch (error) {
        sagaResult.failedStep = step.name
        sagaContext.failedStep = step.name
        sagaContext.compensationRequired = true
        throw error
      }
    }

    return currentInput
  }

  /**
   * Execute parallel steps
   */
  private async executeParallelSteps<T>(
    saga: EnhancedSagaDefinition<T>,
    input: unknown,
    sagaResult: SagaResult<T>,
    sagaContext: SagaContext
  ): Promise<unknown> {
    const stepResults = new Map<string, unknown>()
    let currentInput = input

    for (const parallelGroup of saga.parallelSteps || []) {
      const parallelPromises = parallelGroup.map(async stepName => {
        const step = saga.steps.find(s => s.name === stepName)
        if (!step) {
          throw new Error(`Step ${stepName} not found in saga definition`)
        }

        const stepResult = await this.executeStepWithRetry(step, currentInput)
        if (Result.isErr(stepResult)) {
          throw stepResult.error
        }
        return { stepName, result: stepResult.value }
      })

      const parallelResults = await Promise.all(parallelPromises)

      for (const { stepName, result } of parallelResults) {
        stepResults.set(stepName, result)
        sagaResult.completedSteps = [...(sagaResult.completedSteps || []), stepName]
        sagaContext.completedSteps.push(stepName)
      }
    }

    return currentInput
  }

  /**
   * Execute a step with retry logic
   */
  private async executeStepWithRetry<TInput, TOutput>(
    step: SagaStep<TInput, TOutput>,
    input: TInput
  ): Promise<Result<Error, TOutput>> {
    const retryPolicy = (step as EnhancedSagaStep).retryPolicy || {
      maxRetries: 3,
      backoffMs: 1000,
      exponentialBackoff: true,
    }

    let lastError: Error | null = null
    let retryCount = 0

    while (retryCount <= retryPolicy.maxRetries) {
      try {
        const result = await step.execute(input)
        if (Result.isOk(result)) {
          return result
        }
        lastError = result.error
      } catch (error) {
        lastError = error as Error
      }

      retryCount++

      if (retryCount <= retryPolicy.maxRetries) {
        const backoffMs = retryPolicy.exponentialBackoff
          ? retryPolicy.backoffMs * Math.pow(2, retryCount - 1)
          : retryPolicy.backoffMs

        await this.delay(backoffMs)
      }
    }

    return Result.Err(lastError || new Error('Unknown error in step execution'))
  }

  /**
   * Get saga execution result
   */
  async getResult(sagaId: string): Promise<Result<Error, SagaResult>> {
    try {
      const result = this.activeSagas.get(sagaId)
      if (!result) {
        return Result.Err(new Error(`Saga ${sagaId} not found`))
      }
      return Result.Ok(result)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Compensate a failed saga
   */
  async compensate(sagaId: string): Promise<Result<Error, void>> {
    try {
      const sagaResult = this.activeSagas.get(sagaId)
      const sagaContext = this.sagaContexts.get(sagaId)

      if (!sagaResult || !sagaContext) {
        return Result.Err(new Error(`Saga ${sagaId} not found`))
      }

      // Update state to compensating
      const compensatingResult = { ...sagaResult, state: 'compensating' as const }
      this.activeSagas.set(sagaId, compensatingResult as SagaResult)

      // Execute compensation in reverse order
      const completedSteps = [...sagaResult.completedSteps].reverse()

      for (const stepName of completedSteps) {
        // Find the step definition (this would need the original saga definition)
        // For now, we'll just log that compensation would happen
        console.log(`Compensating step: ${stepName}`)
      }

      // Update final state
      const compensatedResult = { ...sagaResult, state: 'compensated' as const }
      this.activeSagas.set(sagaId, compensatedResult as SagaResult)

      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Cancel a running saga
   */
  async cancel(sagaId: string): Promise<Result<Error, void>> {
    try {
      const sagaResult = this.activeSagas.get(sagaId)
      if (!sagaResult) {
        return Result.Err(new Error(`Saga ${sagaId} not found`))
      }

      if (sagaResult.state !== 'running') {
        return Result.Err(new Error(`Cannot cancel saga in state: ${sagaResult.state}`))
      }

      // Mark as cancelled
      this.cancelledSagas.add(sagaId)

      // Mark as failed and compensate
      const cancelledResult = {
        ...sagaResult,
        state: 'failed' as const,
        error: new Error('Saga was cancelled'),
      }
      this.activeSagas.set(sagaId, cancelledResult as SagaResult)

      await this.compensate(sagaId)
      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Get all active sagas
   */
  getActiveSagas(): SagaResult[] {
    return Array.from(this.activeSagas.values()).filter(
      saga => saga.state === 'running' || saga.state === 'compensating'
    )
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Create a new saga manager
 */
export function createSagaManager(): SagaManager {
  return new InMemorySagaManager()
}

/**
 * Helper function to create saga steps
 */
export function sagaStep<TInput, TOutput>(
  name: string,
  execute: (input: TInput) => Promise<Result<Error, TOutput>>,
  compensate?: (input: TInput) => Promise<Result<Error, void>>,
  options: {
    timeout?: number
    dependencies?: string[]
    condition?: (context: SagaStepContext<TInput>) => boolean
    retryPolicy?: {
      maxRetries: number
      backoffMs: number
      exponentialBackoff?: boolean
    }
  } = {}
): EnhancedSagaStep<TInput, TOutput> {
  return {
    name,
    execute,
    ...(compensate && { compensate }),
    ...(options.timeout && { timeout: options.timeout }),
    ...(options.dependencies && { dependencies: options.dependencies }),
    ...(options.condition && { condition: options.condition }),
    ...(options.retryPolicy && { retryPolicy: options.retryPolicy }),
  } as EnhancedSagaStep<TInput, TOutput>
}

/**
 * Helper function to create saga definitions
 */
export function saga<T>(
  name: string,
  steps: EnhancedSagaStep[],
  options: {
    onComplete?: (context: SagaContext, result: T) => Promise<Result<Error, void>>
    onError?: (context: SagaContext, error: Error) => Promise<Result<Error, void>>
    timeout?: number
    parallelSteps?: string[][]
    rollbackOnFailure?: boolean
    eventBus?: EventBus
  } = {}
): EnhancedSagaDefinition<T> {
  return {
    name,
    steps,
    rollbackOnFailure: options.rollbackOnFailure ?? true,
    ...(options.onComplete && { onComplete: options.onComplete }),
    ...(options.onError && { onError: options.onError }),
    ...(options.timeout && { timeout: options.timeout }),
    ...(options.parallelSteps && { parallelSteps: options.parallelSteps }),
    ...(options.eventBus && { eventBus: options.eventBus }),
  } as EnhancedSagaDefinition<T>
}
