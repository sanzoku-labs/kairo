import { Result } from './result'
import { type KairoError, createError } from './errors'
import { type Pipeline } from './pipeline'
import { type ResourceMethod } from './resource'

export interface WorkflowError extends KairoError {
  code: 'WORKFLOW_ERROR'
  stepName: string
  originalError: unknown
  context: WorkflowContext
  rollbackAttempted: boolean
}

export interface WorkflowContext {
  stepResults: Record<string, unknown>
  currentStep: string
  executionId: string
  startTime: Date
  metadata: Record<string, unknown>
  [key: string]: unknown
}

export interface WorkflowStep {
  name: string
  executor:
    | Pipeline<unknown, unknown>
    | ResourceMethod
    | ((input: unknown, context: WorkflowContext) => Promise<Result<unknown, unknown>>)
}

export type FlowStep =
  | string // Sequential step
  | { parallel: string[] } // Parallel execution
  | { if: Condition; then: string; else?: string } // Conditional step
  | { loop: LoopCondition; do: string[] } // Loop execution

export type FlowDefinition = FlowStep[]

export type Condition = (context: WorkflowContext) => boolean | Promise<boolean>
export interface LoopCondition {
  while?: (context: WorkflowContext) => boolean | Promise<boolean>
  times?: number
  maxIterations?: number
}

export type ErrorHandler =
  | string // Retry step name
  | ((error: unknown, context: WorkflowContext) => Promise<void>) // Custom handler

export interface ErrorHandlers {
  [stepName: string]: ErrorHandler
}

export type RollbackHandler = (context: WorkflowContext) => Promise<void>

export interface RollbackHandlers {
  [stepName: string]: RollbackHandler
}

export interface MetricsConfig {
  enabled: boolean
  metrics: string[]
}

export interface StepMocks {
  [stepName: string]: {
    success?: unknown
    failure?: KairoError
    delay?: number
    probability?: number
  }
}

export interface WorkflowOptions {
  timeout?: number
  retries?: number
  onError?: ErrorHandlers
  rollback?: RollbackHandlers
  metrics?: MetricsConfig
}

export interface Workflow<TInput, TOutput> {
  readonly name: string
  readonly steps: Record<string, WorkflowStep>
  readonly flow: FlowDefinition
  readonly options: WorkflowOptions

  execute(input: TInput): Promise<Result<WorkflowError, TOutput>>
  mock(stepMocks: StepMocks): MockedWorkflow<TInput, TOutput>
  visualize(): WorkflowDiagram
}

export interface MockedWorkflow<TInput, TOutput> extends Workflow<TInput, TOutput> {
  execute(input: TInput): Promise<Result<WorkflowError, TOutput>>
}

export interface WorkflowDiagram {
  name: string
  steps: Array<{
    name: string
    type: 'sequential' | 'parallel' | 'conditional' | 'loop'
    dependencies: string[]
    outputs: string[]
  }>
  flow: string
}

const createWorkflowError = (
  stepName: string,
  message: string,
  originalError: unknown,
  context: WorkflowContext,
  rollbackAttempted: boolean = false
): WorkflowError => ({
  ...createError('WORKFLOW_ERROR', message, { stepName, originalError, rollbackAttempted }),
  code: 'WORKFLOW_ERROR',
  stepName,
  originalError,
  context,
  rollbackAttempted,
})

const generateExecutionId = (): string => {
  return `workflow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export class WorkflowExecutor<TInput, TOutput> {
  constructor(private workflow: WorkflowImpl<TInput, TOutput>) {}

  async execute(input: TInput): Promise<Result<WorkflowError, TOutput>> {
    const context: WorkflowContext = {
      stepResults: {},
      currentStep: '',
      executionId: generateExecutionId(),
      startTime: new Date(),
      metadata: {},
    }

    const timeout = this.workflow.options.timeout
    if (timeout) {
      return this.executeWithTimeout(input, context, timeout)
    }

    return this.executeFlow(input, context)
  }

  private async executeWithTimeout(
    input: TInput,
    context: WorkflowContext,
    timeoutMs: number
  ): Promise<Result<WorkflowError, TOutput>> {
    const timeoutPromise = new Promise<Result<WorkflowError, TOutput>>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Workflow timeout after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    try {
      return await Promise.race([this.executeFlow(input, context), timeoutPromise])
    } catch (error) {
      return Result.Err(
        createWorkflowError(
          context.currentStep || 'workflow',
          `Workflow timed out after ${timeoutMs}ms`,
          error,
          context
        )
      )
    }
  }

  private async executeFlow(
    input: TInput,
    context: WorkflowContext
  ): Promise<Result<WorkflowError, TOutput>> {
    let currentInput: unknown = input

    for (const flowStep of this.workflow.flow) {
      const result = await this.executeFlowStep(flowStep, currentInput, context)

      if (Result.isErr(result)) {
        // Handle error with potential rollback
        const errorResult = await this.handleStepError(result.error, context)
        if (Result.isErr(errorResult)) {
          return errorResult
        }
        // If error was handled successfully, continue with the error handler result
        currentInput = errorResult.value
      } else {
        currentInput = result.value
      }
    }

    return Result.Ok(currentInput as TOutput)
  }

  private async executeFlowStep(
    flowStep: FlowStep,
    input: unknown,
    context: WorkflowContext
  ): Promise<Result<WorkflowError, unknown>> {
    if (typeof flowStep === 'string') {
      return this.executeStep(flowStep, input, context)
    }

    if ('parallel' in flowStep) {
      return this.executeParallel(flowStep.parallel, input, context)
    }

    if ('if' in flowStep) {
      return this.executeConditional(flowStep, input, context)
    }

    if ('loop' in flowStep) {
      return this.executeLoop(flowStep, input, context)
    }

    return Result.Err(
      createWorkflowError(
        'flow-parser',
        `Unknown flow step type: ${JSON.stringify(flowStep)}`,
        null,
        context
      )
    )
  }

  async executeStep(
    stepName: string,
    input: unknown,
    context: WorkflowContext
  ): Promise<Result<WorkflowError, unknown>> {
    context.currentStep = stepName

    const step = this.workflow.steps[stepName]
    if (!step) {
      return Result.Err(
        createWorkflowError(stepName, `Step '${stepName}' not found`, null, context)
      )
    }

    try {
      let result: Result<unknown, unknown>

      if (typeof step.executor === 'function') {
        // Custom function executor
        result = await step.executor(input, context)
      } else if ('run' in step.executor) {
        // Pipeline executor
        result = await step.executor.run(input)
      } else {
        // ResourceMethod executor - this would need to be handled differently
        // For now, treat as unsupported
        return Result.Err(
          createWorkflowError(
            stepName,
            `ResourceMethod execution not yet implemented for step '${stepName}'`,
            null,
            context
          )
        )
      }

      if (Result.isOk(result)) {
        context.stepResults[stepName] = result.value
        return Result.Ok(result.value)
      } else {
        return Result.Err(
          createWorkflowError(stepName, `Step '${stepName}' failed`, result.error, context)
        )
      }
    } catch (error) {
      return Result.Err(
        createWorkflowError(stepName, `Step '${stepName}' threw an exception`, error, context)
      )
    }
  }

  async executeParallel(
    stepNames: string[],
    input: unknown,
    context: WorkflowContext
  ): Promise<Result<WorkflowError, unknown[]>> {
    try {
      const results = await Promise.all(
        stepNames.map(stepName => this.executeStep(stepName, input, context))
      )

      const errors: WorkflowError[] = []
      const values: unknown[] = []

      for (const result of results) {
        if (Result.isErr(result)) {
          errors.push(result.error)
        } else {
          values.push(result.value)
        }
      }

      if (errors.length > 0) {
        return Result.Err(
          createWorkflowError(
            'parallel',
            `${errors.length} out of ${stepNames.length} parallel steps failed`,
            errors,
            context
          )
        )
      }

      return Result.Ok(values)
    } catch (error) {
      return Result.Err(
        createWorkflowError('parallel', 'Parallel execution failed', error, context)
      )
    }
  }

  private async executeConditional(
    conditionalStep: { if: Condition; then: string; else?: string },
    input: unknown,
    context: WorkflowContext
  ): Promise<Result<WorkflowError, unknown>> {
    try {
      const conditionResult = await Promise.resolve(conditionalStep.if(context))

      if (conditionResult) {
        return this.executeStep(conditionalStep.then, input, context)
      } else if (conditionalStep.else) {
        return this.executeStep(conditionalStep.else, input, context)
      } else {
        // No else branch, pass through input unchanged
        return Result.Ok(input)
      }
    } catch (error) {
      return Result.Err(
        createWorkflowError('conditional', 'Conditional execution failed', error, context)
      )
    }
  }

  private async executeLoop(
    loopStep: { loop: LoopCondition; do: string[] },
    input: unknown,
    context: WorkflowContext
  ): Promise<Result<WorkflowError, unknown>> {
    let currentInput = input
    let iterations = 0
    const maxIterations = loopStep.loop.maxIterations || 100 // Safety limit
    const times = loopStep.loop.times

    try {
      while (iterations < maxIterations) {
        // Check loop condition
        if (times !== undefined) {
          if (iterations >= times) break
        } else if (loopStep.loop.while) {
          const shouldContinue = await Promise.resolve(loopStep.loop.while(context))
          if (!shouldContinue) break
        } else {
          // No condition provided, execute once
          if (iterations > 0) break
        }

        // Execute all steps in the loop
        for (const stepName of loopStep.do) {
          const result = await this.executeStep(stepName, currentInput, context)
          if (Result.isErr(result)) {
            return result
          }
          currentInput = result.value
        }

        iterations++
      }

      if (iterations >= maxIterations) {
        return Result.Err(
          createWorkflowError(
            'loop',
            `Loop exceeded maximum iterations (${maxIterations})`,
            null,
            context
          )
        )
      }

      return Result.Ok(currentInput)
    } catch (error) {
      return Result.Err(createWorkflowError('loop', 'Loop execution failed', error, context))
    }
  }

  private async handleStepError(
    error: WorkflowError,
    context: WorkflowContext
  ): Promise<Result<WorkflowError, unknown>> {
    const errorHandler = this.workflow.options.onError?.[error.stepName]

    if (!errorHandler) {
      // No error handler, attempt rollback if configured
      await this.attemptRollback(context, error.stepName)
      return Result.Err({
        ...error,
        rollbackAttempted: true,
      })
    }

    try {
      if (typeof errorHandler === 'string') {
        // Retry with different step
        return this.executeStep(errorHandler, context.stepResults[error.stepName], context)
      } else {
        // Custom error handler
        await errorHandler(error.originalError, context)
        // If custom handler succeeds, continue with last successful result
        return Result.Ok(context.stepResults[error.stepName] || null)
      }
    } catch (handlerError) {
      await this.attemptRollback(context, error.stepName)
      return Result.Err(
        createWorkflowError(error.stepName, 'Error handler failed', handlerError, context, true)
      )
    }
  }

  private async attemptRollback(context: WorkflowContext, failedStep: string): Promise<void> {
    const rollbackHandler = this.workflow.options.rollback?.[failedStep]
    if (rollbackHandler) {
      try {
        await rollbackHandler(context)
      } catch (rollbackError) {
        // Log rollback failure but don't throw - we're already in an error state
        console.error(`Rollback failed for step ${failedStep}:`, rollbackError)
      }
    }
  }
}

class MockedWorkflowImpl<TInput, TOutput> implements MockedWorkflow<TInput, TOutput> {
  constructor(
    private workflow: WorkflowImpl<TInput, TOutput>,
    private mocks: StepMocks
  ) {}

  get name(): string {
    return this.workflow.name
  }

  get steps(): Record<string, WorkflowStep> {
    return this.workflow.steps
  }

  get flow(): FlowDefinition {
    return this.workflow.flow
  }

  get options(): WorkflowOptions {
    return this.workflow.options
  }

  mock(stepMocks: StepMocks): MockedWorkflow<TInput, TOutput> {
    return new MockedWorkflowImpl(this.workflow, { ...this.mocks, ...stepMocks })
  }

  visualize(): WorkflowDiagram {
    return this.workflow.visualize()
  }

  async execute(input: TInput): Promise<Result<WorkflowError, TOutput>> {
    const context: WorkflowContext = {
      stepResults: {},
      currentStep: '',
      executionId: generateExecutionId(),
      startTime: new Date(),
      metadata: { mocked: true },
    }

    let currentInput: unknown = input

    for (const flowStep of this.workflow.flow) {
      const result = await this.executeMockedFlowStep(flowStep, currentInput, context)

      if (Result.isErr(result)) {
        return result
      }

      currentInput = result.value
    }

    return Result.Ok(currentInput as TOutput)
  }

  private async executeMockedFlowStep(
    flowStep: FlowStep,
    input: unknown,
    context: WorkflowContext
  ): Promise<Result<WorkflowError, unknown>> {
    if (typeof flowStep === 'string') {
      return this.executeMockedStep(flowStep, input, context)
    }

    if ('parallel' in flowStep) {
      const results = await Promise.all(
        flowStep.parallel.map(stepName => this.executeMockedStep(stepName, input, context))
      )

      const errors: WorkflowError[] = []
      const values: unknown[] = []

      for (const result of results) {
        if (Result.isErr(result)) {
          errors.push(result.error)
        } else {
          values.push(result.value)
        }
      }

      if (errors.length > 0) {
        return Result.Err(
          createWorkflowError(
            'parallel',
            `${errors.length} out of ${flowStep.parallel.length} parallel steps failed`,
            errors,
            context
          )
        )
      }

      return Result.Ok(values)
    }

    // For other flow types, execute normally for now
    return Result.Ok(input)
  }

  private async executeMockedStep(
    stepName: string,
    input: unknown,
    context: WorkflowContext
  ): Promise<Result<WorkflowError, unknown>> {
    context.currentStep = stepName

    const mock = this.mocks[stepName]
    if (!mock) {
      // No mock defined, return input unchanged
      context.stepResults[stepName] = input
      return Result.Ok(input)
    }

    // Simulate delay if specified
    if (mock.delay) {
      await new Promise(resolve => setTimeout(resolve, mock.delay))
    }

    // Determine success/failure based on probability
    const probability = mock.probability ?? 1.0
    const shouldSucceed = Math.random() < probability

    if (shouldSucceed && mock.success !== undefined) {
      context.stepResults[stepName] = mock.success
      return Result.Ok(mock.success)
    } else if (!shouldSucceed && mock.failure) {
      return Result.Err(
        createWorkflowError(
          stepName,
          `Mocked failure for step '${stepName}'`,
          mock.failure,
          context
        )
      )
    }

    // Default success case
    context.stepResults[stepName] = input
    return Result.Ok(input)
  }
}

class WorkflowImpl<TInput, TOutput> implements Workflow<TInput, TOutput> {
  constructor(
    public readonly name: string,
    public readonly steps: Record<string, WorkflowStep>,
    public readonly flow: FlowDefinition,
    public readonly options: WorkflowOptions = {}
  ) {}

  async execute(input: TInput): Promise<Result<WorkflowError, TOutput>> {
    const executor = new WorkflowExecutor(this)
    return executor.execute(input)
  }

  mock(stepMocks: StepMocks): MockedWorkflow<TInput, TOutput> {
    return new MockedWorkflowImpl(this, stepMocks)
  }

  visualize(): WorkflowDiagram {
    const stepDependencies = this.calculateStepDependencies()

    return {
      name: this.name,
      steps: Object.keys(this.steps).map(stepName => ({
        name: stepName,
        type: this.getStepType(stepName),
        dependencies: stepDependencies[stepName] || [],
        outputs: this.getStepOutputs(stepName),
      })),
      flow: this.generateFlowDescription(),
    }
  }

  private calculateStepDependencies(): Record<string, string[]> {
    const dependencies: Record<string, string[]> = {}

    // Simple dependency analysis based on flow order
    const allSteps = new Set<string>()
    this.collectStepsFromFlow(this.flow, allSteps)

    const stepArray = Array.from(allSteps)
    stepArray.forEach((step, index) => {
      dependencies[step] = stepArray.slice(0, index)
    })

    return dependencies
  }

  private collectStepsFromFlow(flow: FlowDefinition, steps: Set<string>): void {
    flow.forEach(flowStep => {
      if (typeof flowStep === 'string') {
        steps.add(flowStep)
      } else if ('parallel' in flowStep) {
        flowStep.parallel.forEach(step => steps.add(step))
      } else if ('if' in flowStep) {
        steps.add(flowStep.then)
        if (flowStep.else) {
          steps.add(flowStep.else)
        }
      } else if ('loop' in flowStep) {
        flowStep.do.forEach((step: string) => steps.add(step))
      }
    })
  }

  private getStepType(stepName: string): 'sequential' | 'parallel' | 'conditional' | 'loop' {
    // Analyze how the step is used in the flow
    for (const flowStep of this.flow) {
      if (typeof flowStep === 'string' && flowStep === stepName) {
        return 'sequential'
      } else if (
        typeof flowStep === 'object' &&
        'parallel' in flowStep &&
        flowStep.parallel.includes(stepName)
      ) {
        return 'parallel'
      } else if (
        typeof flowStep === 'object' &&
        'if' in flowStep &&
        (flowStep.then === stepName || flowStep.else === stepName)
      ) {
        return 'conditional'
      } else if (
        typeof flowStep === 'object' &&
        'loop' in flowStep &&
        flowStep.do.includes(stepName)
      ) {
        return 'loop'
      }
    }
    return 'sequential'
  }

  private getStepOutputs(_stepName: string): string[] {
    // For now, return empty array - could be enhanced to analyze step connections
    return []
  }

  private generateFlowDescription(): string {
    return this.flow
      .map(flowStep => {
        if (typeof flowStep === 'string') {
          return flowStep
        } else if (typeof flowStep === 'object' && 'parallel' in flowStep) {
          return `parallel(${flowStep.parallel.join(', ')})`
        } else if (typeof flowStep === 'object' && 'if' in flowStep) {
          return `if(condition) then ${flowStep.then}${flowStep.else ? ` else ${flowStep.else}` : ''}`
        } else if (typeof flowStep === 'object' && 'loop' in flowStep) {
          return `loop(${flowStep.do.join(', ')})`
        }
        return 'unknown'
      })
      .join(' → ')
  }
}

// Factory function for creating workflows
export const workflow = <TInput, TOutput>(
  name: string,
  config: {
    steps: Record<string, WorkflowStep>
    flow: FlowDefinition
    options?: WorkflowOptions
  }
): Workflow<TInput, TOutput> => {
  return new WorkflowImpl(name, config.steps, config.flow, config.options || {})
}

// Utility functions for creating workflow steps
export const workflowUtils = {
  step: (
    name: string,
    executor:
      | Pipeline<unknown, unknown>
      | ResourceMethod
      | ((input: unknown, context: WorkflowContext) => Promise<Result<unknown, unknown>>)
  ): WorkflowStep => ({
    name,
    executor,
  }),

  condition: (fn: (context: WorkflowContext) => boolean | Promise<boolean>): Condition => fn,

  loopWhile: (
    condition: (context: WorkflowContext) => boolean | Promise<boolean>,
    stepNames: string[],
    maxIterations = 100
  ): { loop: LoopCondition; do: string[] } => ({
    loop: {
      while: condition,
      maxIterations,
    },
    do: stepNames,
  }),

  loopTimes: (times: number, stepNames: string[]): { loop: LoopCondition; do: string[] } => ({
    loop: {
      times,
    },
    do: stepNames,
  }),

  retry: (stepName: string): ErrorHandler => stepName,

  customErrorHandler: (
    handler: (error: unknown, context: WorkflowContext) => Promise<void>
  ): ErrorHandler => handler,

  rollback: (handler: (context: WorkflowContext) => Promise<void>): RollbackHandler => handler,
}
