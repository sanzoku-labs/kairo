# Signal

Signals provide lightweight reactive state management with immutable updates and functional transformations. They're framework-agnostic and work seamlessly with any TypeScript environment.

## Creating Signals

```typescript
import { signal, createSignal } from 'kairo'

// Create with initial value
const counter = signal(0)
const user = signal<User | null>(null)

// Alternative creation method
const settings = createSignal({ theme: 'light', language: 'en' })
```

## Core Operations

### `get()` - Read Current Value

```typescript
const count = counter.get()
console.log(count) // 0
```

### `set(value)` - Update Value

```typescript
const result = counter.set(5)
if (result.tag === 'Ok') {
  console.log('Updated successfully')
} else {
  console.error('Update failed:', result.error)
}
```

### `update(fn)` - Transform Value

```typescript
// Increment counter
counter.update(current => current + 1)

// Update user object
user.update(current => (current ? { ...current, name: 'Updated Name' } : null))
```

### `value` - Read-only Property

```typescript
// Convenient read-only access
console.log(counter.value) // Same as counter.get()
```

## Subscriptions

### `subscribe(callback)` - Listen to Changes

```typescript
const unsubscribe = counter.subscribe(value => {
  console.log('Counter changed:', value)
})

counter.set(10) // Logs: "Counter changed: 10"

// Clean up subscription
unsubscribe()
```

### Multiple Subscribers

```typescript
const signal1 = signal(0)

const sub1 = signal1.subscribe(value => console.log('Sub1:', value))
const sub2 = signal1.subscribe(value => console.log('Sub2:', value))

signal1.set(5)
// Logs: "Sub1: 5"
// Logs: "Sub2: 5"

// Clean up
sub1.unsubscribe()
sub2.unsubscribe()
```

## Transformations

### `map(fn)` - Transform Values

```typescript
const numbers = signal(5)
const doubled = numbers.map(n => n * 2)

console.log(doubled.get()) // 10

numbers.set(10)
console.log(doubled.get()) // 20
```

### `filter(predicate)` - Conditional Updates

```typescript
const numbers = signal(1)
const evenNumbers = numbers.filter(n => n % 2 === 0)

numbers.set(2) // evenNumbers updates to 2
numbers.set(3) // evenNumbers remains 2 (filtered out)
numbers.set(4) // evenNumbers updates to 4
```

### `pipe(fn)` - Custom Transformations

```typescript
const user = signal({ name: 'John', age: 30 })
const userName = user.pipe(u => u.name.toUpperCase())

console.log(userName.get()) // "JOHN"
```

## Utility Functions

### `combine()` - Merge Multiple Signals

```typescript
import { signalEffect } from 'kairo'

const firstName = signal('John')
const lastName = signal('Doe')

const fullName = signalEffect.combine([firstName, lastName], (first, last) => `${first} ${last}`)

console.log(fullName.get()) // "John Doe"

firstName.set('Jane')
console.log(fullName.get()) // "Jane Doe"
```

### `conditional()` - Conditional Signal Selection

```typescript
const isLoggedIn = signal(false)
const guestData = signal({ name: 'Guest' })
const userData = signal({ name: 'John', email: 'john@example.com' })

const currentUser = signalEffect.conditional(isLoggedIn, userData, guestData)

console.log(currentUser.get()) // { name: 'Guest' }

isLoggedIn.set(true)
console.log(currentUser.get()) // { name: 'John', email: 'john@example.com' }
```

### `validated()` - Schema Validation

```typescript
import { schema } from 'kairo'
import { z } from 'zod'

const UserSchema = schema(
  z.object({
    name: z.string(),
    age: z.number().min(0),
  })
)

const userInput = signal({ name: '', age: -1 })
const validUser = signalEffect.validated(userInput, UserSchema)

console.log(validUser.get()) // null (validation failed)

userInput.set({ name: 'John', age: 30 })
console.log(validUser.get()) // { name: 'John', age: 30 }
```

## Effects and Reactions

### `onChange()` - React to Changes

```typescript
const counter = signal(0)

const cleanup = signalEffect.onChange(counter, (newValue, oldValue) => {
  console.log(`Changed from ${oldValue} to ${newValue}`)
})

counter.set(5) // Logs: "Changed from 0 to 5"
cleanup()
```

### `onChangeOnly()` - React Only to Actual Changes

```typescript
const data = signal({ count: 0 })

const cleanup = signalEffect.onChangeOnly(data, newValue => {
  console.log('Data actually changed:', newValue)
})

data.set({ count: 0 }) // No log (same value)
data.set({ count: 1 }) // Logs: "Data actually changed: { count: 1 }"
```

### `onTrue()` - React When Condition Becomes True

```typescript
const isReady = signal(false)

const cleanup = signalEffect.onTrue(isReady, () => {
  console.log('System is ready!')
})

isReady.set(true) // Logs: "System is ready!"
isReady.set(false) // No log
isReady.set(true) // Logs: "System is ready!" (triggers again)
```

### `batch()` - Batch Multiple Updates

```typescript
const name = signal('John')
const age = signal(30)

signalEffect.batch(() => {
  name.set('Jane')
  age.set(25)
}) // Subscribers only notified once after all updates
```

## Pipeline Integration

### Convert Pipeline to Signal

```typescript
import { pipeline, schema } from 'kairo'

const userPipeline = pipeline('get-user')
  .input(schema(z.object({ id: z.number() })))
  .fetch('/api/users/:id')
  .validate(UserSchema)

const userSignal = userPipeline.asSignal()

// Execute pipeline and update signal
await userSignal.run({ id: 123 })
console.log(userSignal.get()) // User data or null
```

## Framework Integration

### React Integration

```typescript
import { signal } from 'kairo'
import { useEffect, useState } from 'react'

function useSignal<T>(signal: Signal<T>): T {
  const [value, setValue] = useState(signal.get())

  useEffect(() => {
    const unsubscribe = signal.subscribe(setValue)
    return unsubscribe
  }, [signal])

  return value
}

// Usage in component
function Counter() {
  const counter = signal(0)
  const count = useSignal(counter)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => counter.update(c => c + 1)}>
        Increment
      </button>
    </div>
  )
}
```

### Vue Integration

```typescript
import { ref, watchEffect } from 'vue'

function useSignal<T>(signal: Signal<T>) {
  const value = ref(signal.get())

  watchEffect(() => {
    const unsubscribe = signal.subscribe(newValue => {
      value.value = newValue
    })

    return unsubscribe
  })

  return value
}
```

## Performance Considerations

- **Lazy evaluation**: Transformations only execute when subscribers need values
- **Efficient updates**: Only subscribers of changed signals are notified
- **Memory management**: Automatic cleanup of unused derived signals
- **Batching**: Multiple updates can be batched to reduce notification overhead

## Error Handling

Signals use the Result pattern for error handling:

```typescript
const result = counter.set(newValue)

if (result.tag === 'Err') {
  console.error('Update failed:', result.error.message)
  // Signal value remains unchanged
}
```

## Type Safety

Signals maintain full type safety:

```typescript
const userSignal = signal<User | null>(null)

// TypeScript knows this is User | null
const currentUser = userSignal.get()

// Derived signals maintain type relationships
const userName = userSignal.map(user => user?.name ?? 'Unknown')
// userName is Signal<string>
```

## Best Practices

1. **Use descriptive names** for signals to improve debugging
2. **Keep signals focused** on single pieces of state
3. **Compose with transformations** rather than complex logic in subscribers
4. **Clean up subscriptions** to prevent memory leaks
5. **Use batch operations** for multiple related updates
6. **Leverage type safety** with proper TypeScript types
7. **Consider performance** when creating many derived signals

## Common Patterns

### Loading States

```typescript
const isLoading = signal(false)
const data = signal(null)
const error = signal(null)

const fetchData = async () => {
  isLoading.set(true)
  error.set(null)

  try {
    const result = await api.getData()
    data.set(result)
  } catch (err) {
    error.set(err)
  } finally {
    isLoading.set(false)
  }
}
```

### Computed Properties

```typescript
const items = signal([])
const filter = signal('')

const filteredItems = signalEffect.combine([items, filter], (allItems, filterText) =>
  allItems.filter(item => item.name.toLowerCase().includes(filterText.toLowerCase()))
)
```

### Settings Management

```typescript
const settings = signal({
  theme: 'light',
  language: 'en',
  notifications: true,
})

const theme = settings.map(s => s.theme)
const language = settings.map(s => s.language)

// Update specific setting
const updateTheme = (newTheme: string) => {
  settings.update(current => ({
    ...current,
    theme: newTheme,
  }))
}
```

Signals provide a powerful foundation for reactive programming while maintaining simplicity and type safety.
