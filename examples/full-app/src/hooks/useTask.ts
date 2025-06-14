import { useEffect, useState } from 'react'
import type { Task } from 'kairo'

/**
 * React hook to use a Kairo Task with reactive state updates
 * 
 * @param task - The Kairo task to use
 * @returns Object with task state and control methods
 */
export function useTask<T>(task: Task<T>) {
  const [state, setState] = useState(() => ({
    state: task.state,
    data: task.data,
    error: task.error,
    startTime: task.startTime,
    endTime: task.endTime,
    duration: task.duration
  }))
  
  useEffect(() => {
    // Subscribe to task state changes
    const unsubscribe = task.signal().subscribe(taskState => {
      setState({
        state: taskState.state,
        data: taskState.data,
        error: taskState.error,
        startTime: task.startTime,
        endTime: task.endTime,
        duration: task.duration
      })
    })
    
    return unsubscribe
  }, [task])
  
  return {
    // State
    ...state,
    
    // Computed state
    isIdle: state.state === 'idle',
    isPending: state.state === 'pending',
    isSuccess: state.state === 'success',
    isError: state.state === 'error',
    isComplete: state.state === 'success' || state.state === 'error',
    
    // Methods
    run: task.run.bind(task),
    reset: task.reset.bind(task)
  }
}

/**
 * Hook for creating a simple loading state based on task status
 * 
 * @param task - The task to track
 * @returns Simple loading state object
 */
export function useTaskLoading<T>(task: Task<T>) {
  const { isPending, isError, error } = useTask(task)
  
  return {
    loading: isPending,
    error: isError ? error : null,
    run: task.run.bind(task)
  }
}