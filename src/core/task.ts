import { Result } from './result'
import { type KairoError, createError } from './errors'
import { type Signal, createSignal } from './signal'
import { type Pipeline } from './pipeline'

export interface TaskError extends KairoError {
  code: 'TASK_ERROR'
  operation: string
}

export type TaskState = 'idle' | 'pending' | 'success' | 'error'

export interface TaskStateData<T> {
  state: TaskState
  data?: T | undefined
  error?: KairoError | undefined
  startTime?: number | undefined
  endTime?: number | undefined
  duration?: number | undefined
}

export interface Task<T> {
  readonly state: TaskState
  readonly data?: T | undefined
  readonly error?: KairoError | undefined
  readonly isIdle: boolean
  readonly isPending: boolean
  readonly isSuccess: boolean
  readonly isError: boolean
  run(input?: unknown): Promise<Result<TaskError, T>>
  reset(): Result<TaskError, void>
  signal(): Signal<TaskStateData<T>>
}

interface TaskCore<T> {
  pipeline: Pipeline<unknown, T>
  currentState: TaskStateData<T>
  stateSignal: Signal<TaskStateData<T>>
}

const createTaskError = (operation: string, message: string, context = {}): TaskError => ({
  ...createError('TASK_ERROR', message, context),
  code: 'TASK_ERROR',
  operation,
})

const createInitialState = <T>(): TaskStateData<T> => ({
  state: 'idle',
  data: undefined,
  error: undefined,
  startTime: undefined,
  endTime: undefined,
  duration: undefined,
})

const updateTaskState = <T>(
  core: TaskCore<T>,
  newState: Partial<TaskStateData<T>>
): TaskStateData<T> => {
  const updatedState = { ...core.currentState, ...newState }
  core.currentState = updatedState
  core.stateSignal.set(updatedState)
  return updatedState
}

class TaskImpl<T> implements Task<T> {
  constructor(private core: TaskCore<T>) {}

  get state(): TaskState {
    return this.core.currentState.state
  }

  get data(): T | undefined {
    return this.core.currentState.data
  }

  get error(): KairoError | undefined {
    return this.core.currentState.error
  }

  get isIdle(): boolean {
    return this.core.currentState.state === 'idle'
  }

  get isPending(): boolean {
    return this.core.currentState.state === 'pending'
  }

  get isSuccess(): boolean {
    return this.core.currentState.state === 'success'
  }

  get isError(): boolean {
    return this.core.currentState.state === 'error'
  }

  async run(input?: unknown): Promise<Result<TaskError, T>> {
    // Prevent concurrent runs
    if (this.core.currentState.state === 'pending') {
      const taskError = createTaskError('run', 'Task is already running', {
        currentState: this.core.currentState.state,
      })
      return Result.Err(taskError)
    }

    try {
      const startTime = performance.now()

      // Update state to pending
      updateTaskState(this.core, {
        state: 'pending',
        data: undefined,
        error: undefined,
        startTime,
        endTime: undefined,
        duration: undefined,
      })

      // Execute the pipeline
      const result = await this.core.pipeline.run(input)
      const endTime = performance.now()
      const duration = endTime - startTime

      if (Result.isOk(result)) {
        // Success state
        updateTaskState(this.core, {
          state: 'success',
          data: result.value,
          error: undefined,
          endTime,
          duration,
        })
        return Result.Ok(result.value)
      } else {
        // Error state
        updateTaskState(this.core, {
          state: 'error',
          data: undefined,
          error: result.error as KairoError,
          endTime,
          duration,
        })

        const taskError = createTaskError('run', 'Pipeline execution failed', {
          pipelineError: result.error,
          duration,
          input,
        })
        return Result.Err(taskError)
      }
    } catch (error) {
      const endTime = performance.now()
      const duration = this.core.currentState.startTime
        ? endTime - this.core.currentState.startTime
        : 0

      const taskError = createTaskError(
        'run',
        error instanceof Error ? error.message : 'Unknown task execution error',
        { error, duration, input }
      )

      updateTaskState(this.core, {
        state: 'error',
        data: undefined,
        error: taskError,
        endTime,
        duration,
      })

      return Result.Err(taskError)
    }
  }

  reset(): Result<TaskError, void> {
    try {
      // Only allow reset if not currently pending
      if (this.core.currentState.state === 'pending') {
        const taskError = createTaskError('reset', 'Cannot reset task while it is running', {
          currentState: this.core.currentState.state,
        })
        return Result.Err(taskError)
      }

      updateTaskState(this.core, createInitialState<T>())
      return Result.Ok(undefined)
    } catch (error) {
      const taskError = createTaskError(
        'reset',
        error instanceof Error ? error.message : 'Failed to reset task',
        { error }
      )
      return Result.Err(taskError)
    }
  }

  signal(): Signal<TaskStateData<T>> {
    return this.core.stateSignal
  }
}

export const createTask = <I, O>(pipeline: Pipeline<I, O>): Task<O> => {
  const initialState = createInitialState<O>()
  const stateSignal = createSignal<TaskStateData<O>>(initialState)

  const core: TaskCore<O> = {
    pipeline: pipeline as Pipeline<unknown, O>,
    currentState: initialState,
    stateSignal,
  }

  return new TaskImpl(core)
}

// Utility functions for working with tasks
export const task = {
  // Create a task from a pipeline
  from: <I, O>(pipeline: Pipeline<I, O>): Task<O> => createTask(pipeline),

  // Create multiple tasks and run them concurrently
  parallel: async <T>(tasks: Task<T>[], input?: unknown): Promise<Result<TaskError, T[]>> => {
    try {
      const results = await Promise.all(tasks.map(t => t.run(input)))

      const errors: TaskError[] = []
      const values: T[] = []

      for (const result of results) {
        if (Result.isErr(result)) {
          errors.push(result.error)
        } else {
          values.push(result.value)
        }
      }

      if (errors.length > 0) {
        const parallelError = createTaskError(
          'parallel',
          `${errors.length} out of ${tasks.length} tasks failed`,
          { errors, successCount: values.length }
        )
        return Result.Err(parallelError)
      }

      return Result.Ok(values)
    } catch (error) {
      const parallelError = createTaskError(
        'parallel',
        error instanceof Error ? error.message : 'Unknown parallel task error',
        { taskCount: tasks.length }
      )
      return Result.Err(parallelError)
    }
  },

  // Create a task that runs tasks in sequence
  sequence: async <T>(tasks: Task<T>[], input?: unknown): Promise<Result<TaskError, T[]>> => {
    try {
      const results: T[] = []

      for (const taskInstance of tasks) {
        const result = await taskInstance.run(input)
        if (Result.isErr(result)) {
          const sequenceError = createTaskError('sequence', 'Task sequence failed', {
            error: result.error,
            completedTasks: results.length,
            totalTasks: tasks.length,
          })
          return Result.Err(sequenceError)
        }
        results.push(result.value)
      }

      return Result.Ok(results)
    } catch (error) {
      const sequenceError = createTaskError(
        'sequence',
        error instanceof Error ? error.message : 'Unknown sequence task error',
        { taskCount: tasks.length }
      )
      return Result.Err(sequenceError)
    }
  },

  // Utility to check if all tasks are in a specific state
  allInState: <T>(tasks: Task<T>[], state: TaskState): boolean => {
    return tasks.every(t => t.state === state)
  },

  // Utility to get tasks grouped by state
  groupByState: <T>(tasks: Task<T>[]): Record<TaskState, Task<T>[]> => {
    return tasks.reduce(
      (acc, taskInstance) => {
        if (!acc[taskInstance.state]) {
          acc[taskInstance.state] = []
        }
        acc[taskInstance.state].push(taskInstance)
        return acc
      },
      {} as Record<TaskState, Task<T>[]>
    )
  },

  // Utility to reset all tasks
  resetAll: <T>(tasks: Task<T>[]): Result<TaskError, void>[] => {
    return tasks.map(t => t.reset())
  },
}

// Effect utilities for tasks
export const taskEffect = {
  // Run an effect when task state changes
  onStateChange: <T>(taskInstance: Task<T>, effectFn: (state: TaskStateData<T>) => void) => {
    return taskInstance.signal().subscribe(effectFn)
  },

  // Run an effect when task completes (success or error)
  onComplete: <T>(taskInstance: Task<T>, effectFn: (state: TaskStateData<T>) => void) => {
    return taskInstance.signal().subscribe(state => {
      if (state.state === 'success' || state.state === 'error') {
        effectFn(state)
      }
    })
  },

  // Run an effect when task succeeds
  onSuccess: <T>(taskInstance: Task<T>, effectFn: (data: T, state: TaskStateData<T>) => void) => {
    return taskInstance.signal().subscribe(state => {
      if (state.state === 'success' && state.data !== undefined) {
        effectFn(state.data, state)
      }
    })
  },

  // Run an effect when task fails
  onError: <T>(
    taskInstance: Task<T>,
    effectFn: (error: KairoError, state: TaskStateData<T>) => void
  ) => {
    return taskInstance.signal().subscribe(state => {
      if (state.state === 'error' && state.error) {
        effectFn(state.error, state)
      }
    })
  },

  // Run an effect when task starts
  onStart: <T>(taskInstance: Task<T>, effectFn: (state: TaskStateData<T>) => void) => {
    return taskInstance.signal().subscribe(state => {
      if (state.state === 'pending') {
        effectFn(state)
      }
    })
  },
}
