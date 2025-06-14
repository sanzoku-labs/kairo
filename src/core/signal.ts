import { Result } from './result'
import { type KairoError, createError } from './errors'
import {} from '../utils/fp'
import { effect, conditionalEffect } from '../utils/fp/effects'
import { resolve } from '../utils/fp/function'

export interface SignalError extends KairoError {
  code: 'SIGNAL_ERROR'
  operation: string
}

export interface SignalSubscription {
  unsubscribe(): void
}

export interface Signal<T> {
  get(): T
  set(value: T): Result<SignalError, void>
  update(fn: (prev: T) => T): Result<SignalError, void>
  subscribe(fn: (value: T) => void): SignalSubscription
  pipe<U>(fn: (value: T) => U): Signal<U>
  map<U>(fn: (value: T) => U): Signal<U>
  filter(predicate: (value: T) => boolean): Signal<T>
  readonly value: T
}

interface SignalSubscriber<T> {
  id: string
  callback: (value: T) => void
  active: boolean
}

interface SignalCore<T> {
  currentValue: T
  subscribers: Map<string, SignalSubscriber<T>>
  subscriptionCounter: number
}

const createSignalError = (operation: string, message: string, context = {}): SignalError => ({
  ...createError('SIGNAL_ERROR', message, context),
  code: 'SIGNAL_ERROR',
  operation,
})

const generateSubscriptionId = (counter: number): string => `signal_sub_${counter}_${Date.now()}`

const notifySubscribers = <T>(core: SignalCore<T>, value: T): void => {
  core.subscribers.forEach(subscriber => {
    if (subscriber.active) {
      try {
        subscriber.callback(value)
      } catch (error) {
        console.error('Signal subscription error:', error)
      }
    }
  })
}

class SignalImpl<T> implements Signal<T> {
  constructor(private core: SignalCore<T>) {}

  get(): T {
    return this.core.currentValue
  }

  get value(): T {
    return this.core.currentValue
  }

  set(value: T): Result<SignalError, void> {
    try {
      const resolvedValue = resolve(value)(this.core.currentValue)
      this.core.currentValue = resolvedValue
      notifySubscribers(this.core, resolvedValue)
      return Result.Ok(undefined)
    } catch (error) {
      const signalError = createSignalError(
        'set',
        error instanceof Error ? error.message : 'Failed to set signal value',
        { value, previousValue: this.core.currentValue }
      )
      return Result.Err(signalError)
    }
  }

  update(fn: (prev: T) => T): Result<SignalError, void> {
    try {
      const newValue = fn(this.core.currentValue)
      return this.set(newValue)
    } catch (error) {
      const signalError = createSignalError(
        'update',
        error instanceof Error ? error.message : 'Failed to update signal value',
        { updateFunction: fn.toString(), currentValue: this.core.currentValue }
      )
      return Result.Err(signalError)
    }
  }

  subscribe(fn: (value: T) => void): SignalSubscription {
    const subscriptionId = generateSubscriptionId(++this.core.subscriptionCounter)

    const subscriber: SignalSubscriber<T> = {
      id: subscriptionId,
      callback: fn,
      active: true,
    }

    this.core.subscribers.set(subscriptionId, subscriber)

    // Immediately call the subscriber with current value
    try {
      effect(() => fn(this.core.currentValue))(this.core.currentValue)
    } catch (error) {
      console.error('Signal subscription error:', error)
    }

    return {
      unsubscribe: () => {
        const existingSubscriber = this.core.subscribers.get(subscriptionId)
        if (existingSubscriber) {
          existingSubscriber.active = false
          this.core.subscribers.delete(subscriptionId)
        }
      },
    }
  }

  pipe<U>(fn: (value: T) => U): Signal<U> {
    return this.map(fn)
  }

  map<U>(fn: (value: T) => U): Signal<U> {
    const derivedSignal = createSignal(fn(this.core.currentValue))

    // Subscribe to changes in the source signal
    this.subscribe(value => {
      try {
        const transformedValue = fn(value)
        derivedSignal.set(transformedValue)
      } catch (error) {
        console.error('Signal map transformation error:', error)
      }
    })

    return derivedSignal
  }

  filter(predicate: (value: T) => boolean): Signal<T> {
    const filteredSignal = createSignal(this.core.currentValue)

    this.subscribe(value => {
      try {
        if (predicate(value)) {
          filteredSignal.set(value)
        }
      } catch (error) {
        console.error('Signal filter predicate error:', error)
      }
    })

    return filteredSignal
  }
}

export const createSignal = <T>(initialValue: T): Signal<T> => {
  const core: SignalCore<T> = {
    currentValue: initialValue,
    subscribers: new Map(),
    subscriptionCounter: 0,
  }

  return new SignalImpl(core)
}

// Functional utilities for working with signals
export const signal = {
  // Create a signal from a value
  of: <T>(value: T): Signal<T> => createSignal(value),

  // Create a computed signal from multiple signals
  combine: <T extends readonly unknown[], U>(
    signals: { [K in keyof T]: Signal<T[K]> },
    combiner: (...values: T) => U
  ): Signal<U> => {
    const initialValues = signals.map(s => s.get()) as unknown as T
    const combinedSignal = createSignal(combiner(...initialValues))

    // Subscribe to all source signals
    signals.forEach(sourceSignal => {
      sourceSignal.subscribe(() => {
        try {
          const currentValues = signals.map(s => s.get()) as unknown as T
          const newValue = combiner(...currentValues)
          combinedSignal.set(newValue)
        } catch (error) {
          console.error('Signal combine error:', error)
        }
      })
    })

    return combinedSignal
  },

  // Create a signal that updates conditionally
  conditional: <T>(sourceSignal: Signal<T>, condition: (value: T) => boolean): Signal<T> => {
    const conditionalSignal = createSignal(sourceSignal.get())

    sourceSignal.subscribe(
      conditionalEffect(condition, value => {
        conditionalSignal.set(value)
      })
    )

    return conditionalSignal
  },

  // Create a signal with validation
  validated: <T>(initialValue: T, validator: (value: T) => boolean): Signal<T> => {
    const validatedSignal = createSignal(initialValue)

    // Override set method to include validation
    const originalSet = validatedSignal.set.bind(validatedSignal)
    validatedSignal.set = (value: T) => {
      try {
        if (!validator(value)) {
          const signalError = createSignalError('validated_set', 'Value failed validation', {
            value,
            validator: validator.toString(),
          })
          return Result.Err(signalError)
        }
        return originalSet(value)
      } catch (error) {
        const signalError = createSignalError(
          'validated_set',
          error instanceof Error ? error.message : 'Validation error',
          { value }
        )
        return Result.Err(signalError)
      }
    }

    return validatedSignal
  },
}

// Effect utilities for signals
export const signalEffect = {
  // Run an effect when signal changes
  onChange: <T>(signalInstance: Signal<T>, effectFn: (value: T) => void): SignalSubscription => {
    return signalInstance.subscribe(effectFn)
  },

  // Run an effect when signal changes, but skip initial value
  onChangeOnly: <T>(
    signalInstance: Signal<T>,
    effectFn: (value: T) => void
  ): SignalSubscription => {
    let isFirst = true
    return signalInstance.subscribe(value => {
      if (isFirst) {
        isFirst = false
        return
      }
      effectFn(value)
    })
  },

  // Run an effect when signal becomes truthy
  onTrue: <T>(signalInstance: Signal<T>, effectFn: (value: T) => void): SignalSubscription => {
    return signalInstance.subscribe(conditionalEffect(value => Boolean(value), effectFn))
  },

  // Batch multiple signal effects
  batch: (effects: (() => void)[]): void => {
    effects.forEach(effect => effect())
  },
}
