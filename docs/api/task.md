# Task

Tasks provide async state management with automatic lifecycle tracking. They represent async operations with states like idle, pending, success, and error, making it easy to build reactive UIs around async operations.

## Creating Tasks

```typescript
import { task, createTask } from 'kairo'

// Create from a pipeline
const userTask = userPipeline.asTask()

// Create directly with async function
const fetchTask = task(async (userId: number) => {
  const response = await fetch(`/api/users/${userId}`)
  return response.json()
})

// Alternative creation method
const uploadTask = createTask(uploadPipeline)
```

## Task States

Tasks have four possible states:

```typescript
type TaskState = 'idle' | 'pending' | 'success' | 'error'

interface TaskStateData<T> {
  state: TaskState
  data?: T
  error?: KairoError
  startTime?: number
  endTime?: number
  duration?: number
}
```

## Core Operations

### `run(input)` - Execute Task

```typescript
const userTask = userPipeline.asTask()

// Execute with input
await userTask.run({ id: 123 })

console.log(userTask.state) // 'success' | 'error'
console.log(userTask.data) // User data if successful
console.log(userTask.error) // Error if failed
```

### `reset()` - Reset to Idle State

```typescript
userTask.reset()
console.log(userTask.state) // 'idle'
console.log(userTask.data) // undefined
console.log(userTask.error) // undefined
```

### State Properties

```typescript
// Check current state
console.log(userTask.state) // 'idle' | 'pending' | 'success' | 'error'

// Access data (only available in success state)
if (userTask.state === 'success') {
  console.log(userTask.data) // Typed data
}

// Access error (only available in error state)
if (userTask.state === 'error') {
  console.log(userTask.error.message)
}
```

## Reactive Signal Integration

### `signal()` - Get Reactive State

```typescript
const userTask = userPipeline.asTask()
const stateSignal = userTask.signal()

// Subscribe to state changes
stateSignal.subscribe(taskState => {
  console.log('Task state:', taskState.state)

  if (taskState.state === 'success') {
    console.log('Data:', taskState.data)
  }
})

await userTask.run({ id: 123 })
// Subscription fires with new state
```

## Utility Functions

### `parallel()` - Execute Tasks in Parallel

```typescript
import { taskEffect } from 'kairo'

const userTask = userPipeline.asTask()
const postsTask = postsPipeline.asTask()
const settingsTask = settingsPipeline.asTask()

const results = await taskEffect.parallel(
  [userTask, postsTask, settingsTask],
  [{ id: 123 }, { userId: 123 }, { userId: 123 }]
)

console.log(results) // Array of results
```

### `sequence()` - Execute Tasks Sequentially

```typescript
const tasks = [userTask, postsTask, settingsTask]
const inputs = [{ id: 123 }, { userId: 123 }, { userId: 123 }]

const results = await taskEffect.sequence(tasks, inputs)
// Each task waits for previous to complete
```

### `groupByState()` - Group Tasks by State

```typescript
const tasks = [userTask, postsTask, settingsTask]
const grouped = taskEffect.groupByState(tasks)

console.log(grouped)
// {
//   idle: [userTask],
//   pending: [postsTask],
//   success: [settingsTask],
//   error: []
// }
```

### `resetAll()` - Reset Multiple Tasks

```typescript
const tasks = [userTask, postsTask, settingsTask]
taskEffect.resetAll(tasks)

// All tasks are now in 'idle' state
```

## Effects and Lifecycle Hooks

### `onStateChange()` - React to State Changes

```typescript
const cleanup = taskEffect.onStateChange(userTask, (newState, oldState) => {
  console.log(`Task changed from ${oldState} to ${newState}`)
})

await userTask.run({ id: 123 })
// Logs state transitions: 'idle' -> 'pending' -> 'success'
```

### `onSuccess()` - React to Success

```typescript
const cleanup = taskEffect.onSuccess(userTask, (data, duration) => {
  console.log('Task succeeded with data:', data)
  console.log('Execution time:', duration, 'ms')
})
```

### `onError()` - React to Errors

```typescript
const cleanup = taskEffect.onError(userTask, (error, duration) => {
  console.error('Task failed:', error.message)
  console.log('Failed after:', duration, 'ms')
})
```

### `onComplete()` - React to Completion (Success or Error)

```typescript
const cleanup = taskEffect.onComplete(userTask, (result, duration) => {
  if (result.tag === 'Ok') {
    console.log('Task completed successfully')
  } else {
    console.log('Task completed with error')
  }
  console.log('Total duration:', duration, 'ms')
})
```

### `onStart()` - React to Task Start

```typescript
const cleanup = taskEffect.onStart(userTask, () => {
  console.log('Task started')
  // Show loading spinner, disable buttons, etc.
})
```

## Advanced Features

### Concurrent Execution Prevention

Tasks automatically prevent concurrent execution:

```typescript
const task = userPipeline.asTask()

// Start first execution
const promise1 = task.run({ id: 123 })

// This will be ignored (task is already pending)
const promise2 = task.run({ id: 456 })

console.log(promise1 === promise2) // true
```

### Timing and Performance

Tasks automatically track execution timing:

```typescript
await userTask.run({ id: 123 })

console.log(userTask.startTime) // Timestamp when task started
console.log(userTask.endTime) // Timestamp when task completed
console.log(userTask.duration) // Duration in milliseconds
```

### Error Context

Tasks preserve error context and tracing:

```typescript
await userTask.run({ id: 123 })

if (userTask.state === 'error') {
  console.log(userTask.error.code) // Error code
  console.log(userTask.error.message) // Error message
  console.log(userTask.error.context) // Additional context
}
```

## Framework Integration

### React Integration

```typescript
import { useEffect, useState } from 'react'

function useTask<T>(task: Task<T>) {
  const [state, setState] = useState(task.state)
  const [data, setData] = useState(task.data)
  const [error, setError] = useState(task.error)

  useEffect(() => {
    const cleanup = taskEffect.onStateChange(task, () => {
      setState(task.state)
      setData(task.data)
      setError(task.error)
    })

    return cleanup
  }, [task])

  return { state, data, error, run: task.run.bind(task), reset: task.reset.bind(task) }
}

// Usage in component
function UserProfile({ userId }: { userId: number }) {
  const userTask = userPipeline.asTask()
  const { state, data, error, run } = useTask(userTask)

  useEffect(() => {
    run({ id: userId })
  }, [userId])

  if (state === 'pending') return <div>Loading...</div>
  if (state === 'error') return <div>Error: {error?.message}</div>
  if (state === 'success') return <div>Hello, {data.name}</div>

  return null
}
```

### Vue Integration

```typescript
import { ref, computed, onMounted } from 'vue'

function useTask<T>(task: Task<T>) {
  const state = ref(task.state)
  const data = ref(task.data)
  const error = ref(task.error)

  const cleanup = taskEffect.onStateChange(task, () => {
    state.value = task.state
    data.value = task.data
    error.value = task.error
  })

  onMounted(() => {
    return cleanup
  })

  return {
    state: computed(() => state.value),
    data: computed(() => data.value),
    error: computed(() => error.value),
    run: task.run.bind(task),
    reset: task.reset.bind(task),
  }
}
```

## Error Handling

Tasks integrate with Kairo's error system:

```typescript
const task = pipeline('example').input(schema).fetch('/api/data').validate(responseSchema).asTask()

await task.run(input)

if (task.state === 'error') {
  // Handle specific error types
  if (task.error.code === 'NETWORK_ERROR') {
    console.log('Network issue')
  } else if (task.error.code === 'VALIDATION_ERROR') {
    console.log('Data validation failed')
  }
}
```

## Best Practices

1. **Use descriptive task names** for better debugging
2. **Handle all states** in your UI (idle, pending, success, error)
3. **Reset tasks** when appropriate to avoid stale state
4. **Use effects** for side effects like notifications or logging
5. **Combine with signals** for reactive programming
6. **Leverage timing data** for performance monitoring
7. **Clean up subscriptions** to prevent memory leaks

## Common Patterns

### Loading States in UI

```typescript
const fetchTask = dataPipeline.asTask()

// In your component
const isLoading = fetchTask.state === 'pending'
const hasError = fetchTask.state === 'error'
const hasData = fetchTask.state === 'success'
```

### Retry Logic

```typescript
const fetchTask = dataPipeline.asTask()

const retryWithDelay = async (retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    await fetchTask.run(input)

    if (fetchTask.state === 'success') {
      break
    }

    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, delay))
      fetchTask.reset()
    }
  }
}
```

### Dependent Tasks

```typescript
const userTask = userPipeline.asTask()
const postsTask = postsPipeline.asTask()

// Wait for user, then fetch posts
await userTask.run({ id: userId })

if (userTask.state === 'success') {
  await postsTask.run({ userId: userTask.data.id })
}
```

### Progress Tracking

```typescript
const tasks = [task1, task2, task3, task4]
const totalTasks = tasks.length

const completedTasks = tasks.filter(
  task => task.state === 'success' || task.state === 'error'
).length

const progress = (completedTasks / totalTasks) * 100
```

Tasks provide a powerful abstraction for managing async operations with built-in state management, timing, and error handling.
