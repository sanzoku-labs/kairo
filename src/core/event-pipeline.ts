import { Result } from './result'
import type { DomainEvent, EventBus } from './events'
import { createEventBus, createEvent } from './event-bus'

/**
 * Event-enhanced pipeline context
 */
export interface EventPipelineContext {
  readonly pipelineId: string
  readonly name: string
  readonly correlationId: string
  readonly eventBus: EventBus
  readonly metadata: Record<string, unknown>
}

/**
 * Pipeline step that can emit events
 */
export interface EventAwareStep<TInput = unknown, TOutput = unknown> {
  readonly name: string
  execute(input: TInput, context: EventPipelineContext): Promise<Result<Error, TOutput>>
  onSuccess?: (output: TOutput, context: EventPipelineContext) => Promise<void>
  onError?: (error: Error, context: EventPipelineContext) => Promise<void>
}

/**
 * Event-driven pipeline configuration
 */
export interface EventPipelineConfig {
  readonly name: string
  readonly eventBus?: EventBus
  readonly emitStepEvents?: boolean
  readonly emitPipelineEvents?: boolean
  readonly timeout?: number
  readonly metadata?: Record<string, unknown>
}

/**
 * Pipeline events
 */
export interface PipelineStartedEvent {
  pipelineId: string
  pipelineName: string
  input: unknown
  timestamp: number
}

export interface PipelineCompletedEvent {
  pipelineId: string
  pipelineName: string
  input: unknown
  output: unknown
  duration: number
  timestamp: number
}

export interface PipelineFailedEvent {
  pipelineId: string
  pipelineName: string
  input: unknown
  error: string
  failedStep: string
  duration: number
  timestamp: number
}

export interface StepStartedEvent {
  pipelineId: string
  pipelineName: string
  stepName: string
  input: unknown
  timestamp: number
}

export interface StepCompletedEvent {
  pipelineId: string
  pipelineName: string
  stepName: string
  input: unknown
  output: unknown
  duration: number
  timestamp: number
}

export interface StepFailedEvent {
  pipelineId: string
  pipelineName: string
  stepName: string
  input: unknown
  error: string
  duration: number
  timestamp: number
}

/**
 * Event-driven pipeline implementation
 */
export class EventPipeline<TInput = unknown, TOutput = unknown> {
  private steps: EventAwareStep[] = []
  private readonly pipelineId: string
  private readonly eventBus: EventBus

  constructor(private readonly config: EventPipelineConfig) {
    this.pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substring(2)}`
    this.eventBus = config.eventBus || createEventBus()
  }

  /**
   * Add a step to the pipeline
   */
  step<TStepOutput>(
    step: EventAwareStep<TOutput, TStepOutput>
  ): EventPipeline<TInput, TStepOutput> {
    this.steps.push(step as EventAwareStep)
    return this as unknown as EventPipeline<TInput, TStepOutput>
  }

  /**
   * Add a map transformation step
   */
  map<TStepOutput>(
    name: string,
    fn: (input: TOutput) => TStepOutput | Promise<TStepOutput>
  ): EventPipeline<TInput, TStepOutput> {
    const mapStep: EventAwareStep<TOutput, TStepOutput> = {
      name,
      execute: async (input: TOutput) => {
        try {
          const result = await fn(input)
          return Result.Ok(result)
        } catch (error) {
          return Result.Err(error as Error)
        }
      },
    }

    return this.step(mapStep)
  }

  /**
   * Add a filter step
   */
  filter(
    name: string,
    predicate: (input: TOutput) => boolean | Promise<boolean>
  ): EventPipeline<TInput, TOutput> {
    const filterStep: EventAwareStep<TOutput, TOutput> = {
      name,
      execute: async (input: TOutput) => {
        try {
          const shouldPass = await predicate(input)
          if (shouldPass) {
            return Result.Ok(input)
          } else {
            return Result.Err(new Error(`Filter ${name} rejected input`))
          }
        } catch (error) {
          return Result.Err(error as Error)
        }
      },
    }

    return this.step(filterStep)
  }

  /**
   * Add an event emission step
   */
  emit<T>(eventType: string, payloadFn?: (input: TOutput) => T): EventPipeline<TInput, TOutput> {
    const emitStep: EventAwareStep<TOutput, TOutput> = {
      name: `emit_${eventType}`,
      execute: async (input: TOutput, context: EventPipelineContext) => {
        try {
          const payload = payloadFn ? payloadFn(input) : input
          const event = createEvent(eventType, payload, {
            aggregateId: context.pipelineId,
            aggregateType: 'pipeline',
            metadata: {
              correlationId: context.correlationId,
              pipelineName: context.name,
              ...context.metadata,
            },
          })

          await this.eventBus.publish(event)
          return Result.Ok(input)
        } catch (error) {
          return Result.Err(error as Error)
        }
      },
    }

    return this.step(emitStep)
  }

  /**
   * Subscribe to events and trigger pipeline
   */
  onEvent<T>(
    eventType: string,
    handler?: (event: DomainEvent<T>, input: TOutput) => TOutput | Promise<TOutput>
  ): EventPipeline<TInput, TOutput> {
    // Subscribe to events that can trigger this pipeline step
    this.eventBus.subscribe({
      eventType,
      handler: async (event: DomainEvent<T>) => {
        try {
          if (handler) {
            // Custom handler provided
            await handler(event, undefined as unknown as TOutput)
            return Result.Ok(undefined)
          } else {
            // Default behavior: log the event
            console.log(`Pipeline ${this.config.name} received event: ${eventType}`, event)
            return Result.Ok(undefined)
          }
        } catch (error) {
          return Result.Err(error as Error)
        }
      },
    })

    return this
  }

  /**
   * Execute the pipeline with event emission
   */
  async execute(input: TInput): Promise<Result<Error, TOutput>> {
    const startTime = Date.now()
    const correlationId = `corr_${this.pipelineId}_${Date.now()}`

    const context: EventPipelineContext = {
      pipelineId: this.pipelineId,
      name: this.config.name,
      correlationId,
      eventBus: this.eventBus,
      metadata: this.config.metadata || {},
    }

    try {
      // Emit pipeline started event
      if (this.config.emitPipelineEvents !== false) {
        await this.eventBus.publish(
          createEvent<PipelineStartedEvent>(
            'pipeline.started',
            {
              pipelineId: this.pipelineId,
              pipelineName: this.config.name,
              input,
              timestamp: startTime,
            },
            {
              aggregateId: this.pipelineId,
              aggregateType: 'pipeline',
              metadata: { correlationId },
            }
          )
        )
      }

      let currentInput: unknown = input

      // Execute steps sequentially
      for (const step of this.steps) {
        const stepStartTime = Date.now()

        try {
          // Emit step started event
          if (this.config.emitStepEvents !== false) {
            await this.eventBus.publish(
              createEvent<StepStartedEvent>(
                'step.started',
                {
                  pipelineId: this.pipelineId,
                  pipelineName: this.config.name,
                  stepName: step.name,
                  input: currentInput,
                  timestamp: stepStartTime,
                },
                {
                  aggregateId: this.pipelineId,
                  aggregateType: 'pipeline',
                  metadata: { correlationId, stepName: step.name },
                }
              )
            )
          }

          const result = await step.execute(currentInput, context)

          if (Result.isErr(result)) {
            const stepDuration = Date.now() - stepStartTime

            // Emit step failed event
            if (this.config.emitStepEvents !== false) {
              await this.eventBus.publish(
                createEvent<StepFailedEvent>(
                  'step.failed',
                  {
                    pipelineId: this.pipelineId,
                    pipelineName: this.config.name,
                    stepName: step.name,
                    input: currentInput,
                    error: result.error.message,
                    duration: stepDuration,
                    timestamp: Date.now(),
                  },
                  {
                    aggregateId: this.pipelineId,
                    aggregateType: 'pipeline',
                    metadata: { correlationId, stepName: step.name },
                  }
                )
              )
            }

            // Call step error handler
            if (step.onError) {
              await step.onError(result.error, context)
            }

            throw result.error
          }

          const stepDuration = Date.now() - stepStartTime
          currentInput = result.value

          // Emit step completed event
          if (this.config.emitStepEvents !== false) {
            await this.eventBus.publish(
              createEvent<StepCompletedEvent>(
                'step.completed',
                {
                  pipelineId: this.pipelineId,
                  pipelineName: this.config.name,
                  stepName: step.name,
                  input: currentInput,
                  output: result.value,
                  duration: stepDuration,
                  timestamp: Date.now(),
                },
                {
                  aggregateId: this.pipelineId,
                  aggregateType: 'pipeline',
                  metadata: { correlationId, stepName: step.name },
                }
              )
            )
          }

          // Call step success handler
          if (step.onSuccess) {
            await step.onSuccess(result.value, context)
          }
        } catch (error) {
          const stepDuration = Date.now() - stepStartTime

          // Emit step failed event if not already emitted
          if (this.config.emitStepEvents !== false) {
            await this.eventBus.publish(
              createEvent<StepFailedEvent>(
                'step.failed',
                {
                  pipelineId: this.pipelineId,
                  pipelineName: this.config.name,
                  stepName: step.name,
                  input: currentInput,
                  error: error instanceof Error ? error.message : String(error),
                  duration: stepDuration,
                  timestamp: Date.now(),
                },
                {
                  aggregateId: this.pipelineId,
                  aggregateType: 'pipeline',
                  metadata: { correlationId, stepName: step.name },
                }
              )
            )
          }

          throw error
        }
      }

      const duration = Date.now() - startTime

      // Emit pipeline completed event
      if (this.config.emitPipelineEvents !== false) {
        await this.eventBus.publish(
          createEvent<PipelineCompletedEvent>(
            'pipeline.completed',
            {
              pipelineId: this.pipelineId,
              pipelineName: this.config.name,
              input,
              output: currentInput,
              duration,
              timestamp: Date.now(),
            },
            {
              aggregateId: this.pipelineId,
              aggregateType: 'pipeline',
              metadata: { correlationId },
            }
          )
        )
      }

      return Result.Ok(currentInput as TOutput)
    } catch (error) {
      const duration = Date.now() - startTime

      // Emit pipeline failed event
      if (this.config.emitPipelineEvents !== false) {
        await this.eventBus.publish(
          createEvent<PipelineFailedEvent>(
            'pipeline.failed',
            {
              pipelineId: this.pipelineId,
              pipelineName: this.config.name,
              input,
              error: error instanceof Error ? error.message : String(error),
              failedStep: this.steps[this.steps.length - 1]?.name || 'unknown',
              duration,
              timestamp: Date.now(),
            },
            {
              aggregateId: this.pipelineId,
              aggregateType: 'pipeline',
              metadata: { correlationId },
            }
          )
        )
      }

      return Result.Err(error as Error)
    }
  }

  /**
   * Get the event bus for external subscriptions
   */
  getEventBus(): EventBus {
    return this.eventBus
  }

  /**
   * Get pipeline configuration
   */
  getConfig(): EventPipelineConfig {
    return this.config
  }

  /**
   * Get pipeline ID
   */
  getId(): string {
    return this.pipelineId
  }
}

/**
 * Create a new event-driven pipeline
 */
export function eventPipeline<TInput>(
  name: string,
  config: Omit<EventPipelineConfig, 'name'> = {}
): EventPipeline<TInput, TInput> {
  return new EventPipeline<TInput, TInput>({ ...config, name })
}

/**
 * Helper to create event-aware steps
 */
export function eventStep<TInput, TOutput>(
  name: string,
  execute: (input: TInput, context: EventPipelineContext) => Promise<Result<Error, TOutput>>,
  options: {
    onSuccess?: (output: TOutput, context: EventPipelineContext) => Promise<void>
    onError?: (error: Error, context: EventPipelineContext) => Promise<void>
  } = {}
): EventAwareStep<TInput, TOutput> {
  const step: EventAwareStep<TInput, TOutput> = {
    name,
    execute,
  }

  if (options.onSuccess) {
    step.onSuccess = options.onSuccess
  }

  if (options.onError) {
    step.onError = options.onError
  }

  return step
}
