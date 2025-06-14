import { useEffect, useState } from 'react'
import type { Signal } from 'kairo'

/**
 * React hook to subscribe to a Kairo Signal
 * 
 * @param signal - The Kairo signal to subscribe to
 * @returns The current value of the signal
 */
export function useSignal<T>(signal: Signal<T>): T {
  const [value, setValue] = useState(() => signal.get())
  
  useEffect(() => {
    // Subscribe to signal changes
    const unsubscribe = signal.subscribe(setValue)
    
    // Clean up subscription on unmount
    return unsubscribe
  }, [signal])
  
  return value
}

/**
 * React hook to subscribe to multiple signals and get their values as a tuple
 * 
 * @param signals - Array of Kairo signals to subscribe to
 * @returns Array of current values in the same order as input signals
 */
export function useSignals<T extends readonly Signal<any>[]>(
  signals: T
): { [K in keyof T]: T[K] extends Signal<infer U> ? U : never } {
  const [values, setValues] = useState(() => 
    signals.map(signal => signal.get()) as any
  )
  
  useEffect(() => {
    const unsubscribers = signals.map((signal, index) => 
      signal.subscribe(value => {
        setValues(prev => {
          const next = [...prev]
          next[index] = value
          return next
        })
      })
    )
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, signals)
  
  return values
}