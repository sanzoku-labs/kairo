# Reactive State

Learn how to use Signals and Tasks for building reactive applications with Kairo.

## Basic Signal Usage

```typescript
import { signal, signalEffect } from 'kairo'

// Create signals for application state
const counter = signal(0)
const user = signal<User | null>(null)
const theme = signal<'light' | 'dark'>('light')

// Subscribe to changes
const unsubscribe = counter.subscribe(value => {
  console.log('Counter updated:', value)
})

// Update signal values
counter.set(5) // Logs: "Counter updated: 5"
counter.update(n => n + 1) // Logs: "Counter updated: 6"

// Clean up when done
unsubscribe()
```

## Computed Signals

```typescript
const firstName = signal('John')
const lastName = signal('Doe')

// Computed signal that reacts to changes
const fullName = signalEffect.combine([firstName, lastName], (first, last) => `${first} ${last}`)

console.log(fullName.get()) // "John Doe"

firstName.set('Jane')
console.log(fullName.get()) // "Jane Doe"

// Subscribe to computed signal
fullName.subscribe(name => {
  console.log('Full name changed:', name)
})

lastName.set('Smith') // Logs: "Full name changed: Jane Smith"
```

## Signal Transformations

```typescript
const numbers = signal([1, 2, 3, 4, 5])

// Transform with map
const doubled = numbers.map(nums => nums.map(n => n * 2))
const sum = numbers.map(nums => nums.reduce((a, b) => a + b, 0))

// Filter signal updates
const evenSum = numbers
  .map(nums => nums.filter(n => n % 2 === 0))
  .map(evens => evens.reduce((a, b) => a + b, 0))

console.log(doubled.get()) // [2, 4, 6, 8, 10]
console.log(sum.get()) // 15
console.log(evenSum.get()) // 6

// Update source signal
numbers.set([2, 4, 6, 8])
console.log(doubled.get()) // [4, 8, 12, 16]
console.log(sum.get()) // 20
console.log(evenSum.get()) // 20
```

## Form State with Signals

```typescript
interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

const formData = signal<LoginForm>({
  email: '',
  password: '',
  rememberMe: false,
})

// Derived validation signals
const isEmailValid = formData.map(data => data.email.includes('@') && data.email.length > 3)

const isPasswordValid = formData.map(data => data.password.length >= 8)

const isFormValid = signalEffect.combine(
  [isEmailValid, isPasswordValid],
  (emailValid, passwordValid) => emailValid && passwordValid
)

// Update form fields
const updateField = <K extends keyof LoginForm>(field: K, value: LoginForm[K]) => {
  formData.update(current => ({
    ...current,
    [field]: value,
  }))
}

// Usage
updateField('email', 'user@example.com')
updateField('password', 'securepassword123')

console.log(isFormValid.get()) // true

// React to form validation
isFormValid.subscribe(valid => {
  const submitButton = document.getElementById('submit-btn')
  if (submitButton) {
    submitButton.disabled = !valid
  }
})
```

## Task State Management

```typescript
import { task, taskEffect } from 'kairo'

// Create task from pipeline
const fetchUserTask = userPipeline.asTask()

// React to task state changes
taskEffect.onStateChange(fetchUserTask, (newState, oldState) => {
  console.log(`Task changed from ${oldState} to ${newState}`)
})

taskEffect.onStart(fetchUserTask, () => {
  console.log('Loading started...')
  // Show loading spinner
})

taskEffect.onSuccess(fetchUserTask, (user, duration) => {
  console.log('User loaded successfully:', user)
  console.log('Took', duration, 'ms')
  // Hide loading spinner, show user data
})

taskEffect.onError(fetchUserTask, (error, duration) => {
  console.error('Failed to load user:', error.message)
  console.log('Failed after', duration, 'ms')
  // Hide loading spinner, show error message
})

// Execute the task
await fetchUserTask.run({ userId: '123' })

console.log(fetchUserTask.state) // 'success' | 'error'
console.log(fetchUserTask.data) // User data if successful
```

## Shopping Cart Example

```typescript
interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

// Cart state
const cartItems = signal<CartItem[]>([])
const discountCode = signal<string | null>(null)
const isLoading = signal(false)

// Computed values
const itemCount = cartItems.map(items => items.reduce((total, item) => total + item.quantity, 0))

const subtotal = cartItems.map(items =>
  items.reduce((total, item) => total + item.price * item.quantity, 0)
)

const discount = signalEffect.combine([discountCode, subtotal], (code, subtotal) => {
  if (code === 'SAVE10') return subtotal * 0.1
  if (code === 'SAVE20') return subtotal * 0.2
  return 0
})

const total = signalEffect.combine(
  [subtotal, discount],
  (subtotal, discount) => subtotal - discount
)

// Cart actions
const addItem = (item: Omit<CartItem, 'quantity'>) => {
  cartItems.update(items => {
    const existing = items.find(i => i.id === item.id)

    if (existing) {
      return items.map(i => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
    }

    return [...items, { ...item, quantity: 1 }]
  })
}

const removeItem = (itemId: string) => {
  cartItems.update(items => items.filter(i => i.id !== itemId))
}

const updateQuantity = (itemId: string, quantity: number) => {
  if (quantity <= 0) {
    removeItem(itemId)
    return
  }

  cartItems.update(items => items.map(i => (i.id === itemId ? { ...i, quantity } : i)))
}

// Subscribe to changes
itemCount.subscribe(count => {
  const badge = document.getElementById('cart-badge')
  if (badge) badge.textContent = count.toString()
})

total.subscribe(amount => {
  const totalEl = document.getElementById('cart-total')
  if (totalEl) totalEl.textContent = `$${amount.toFixed(2)}`
})

// Usage
addItem({ id: '1', name: 'Widget', price: 19.99 })
addItem({ id: '2', name: 'Gadget', price: 29.99 })
discountCode.set('SAVE10')

console.log('Total items:', itemCount.get()) // 2
console.log('Total price:', total.get()) // ~45.00 with discount
```

## Real-time Data Updates

```typescript
// WebSocket connection signal
const wsConnection = signal<WebSocket | null>(null)
const connectionStatus = signal<'connecting' | 'connected' | 'disconnected'>('disconnected')
const messages = signal<Array<{ id: string; text: string; timestamp: Date }>>([])

// Connect to WebSocket
const connect = () => {
  connectionStatus.set('connecting')

  const ws = new WebSocket('wss://api.example.com/ws')

  ws.onopen = () => {
    wsConnection.set(ws)
    connectionStatus.set('connected')
  }

  ws.onmessage = event => {
    const message = JSON.parse(event.data)
    messages.update(current => [
      ...current,
      {
        id: message.id,
        text: message.text,
        timestamp: new Date(message.timestamp),
      },
    ])
  }

  ws.onclose = () => {
    wsConnection.set(null)
    connectionStatus.set('disconnected')
  }

  ws.onerror = error => {
    console.error('WebSocket error:', error)
    connectionStatus.set('disconnected')
  }
}

// Auto-reconnection logic
connectionStatus.subscribe(status => {
  if (status === 'disconnected') {
    setTimeout(() => {
      if (connectionStatus.get() === 'disconnected') {
        connect()
      }
    }, 5000) // Retry after 5 seconds
  }
})

// React to new messages
messages.subscribe(msgs => {
  const latestMessage = msgs[msgs.length - 1]
  if (latestMessage) {
    // Show notification for new message
    showNotification(`New message: ${latestMessage.text}`)
  }
})

// Start connection
connect()
```

## Search with Debouncing

```typescript
const searchQuery = signal('')
const searchResults = signal<Array<{ id: string; title: string }>>([])
const isSearching = signal(false)

// Search task
const searchTask = pipeline('search')
  .input(schema(z.object({ query: z.string() })))
  .fetch('/api/search?q=:query')
  .validate(
    schema(
      z.object({
        results: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
          })
        ),
      })
    )
  )
  .map(response => response.results)
  .asTask()

// Debounced search effect
let searchTimeout: NodeJS.Timeout | null = null

signalEffect.onChange(searchQuery, newQuery => {
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  // Set new timeout
  searchTimeout = setTimeout(async () => {
    if (newQuery.trim().length > 0) {
      isSearching.set(true)
      await searchTask.run({ query: newQuery })

      if (searchTask.state === 'success') {
        searchResults.set(searchTask.data || [])
      } else {
        searchResults.set([])
      }

      isSearching.set(false)
    } else {
      searchResults.set([])
    }
  }, 300) // 300ms debounce
})

// Usage
const searchInput = document.getElementById('search') as HTMLInputElement
searchInput?.addEventListener('input', e => {
  searchQuery.set((e.target as HTMLInputElement).value)
})

// Display results
searchResults.subscribe(results => {
  const resultsEl = document.getElementById('search-results')
  if (resultsEl) {
    resultsEl.innerHTML = results.map(r => `<div class="result">${r.title}</div>`).join('')
  }
})

isSearching.subscribe(searching => {
  const loader = document.getElementById('search-loader')
  if (loader) {
    loader.style.display = searching ? 'block' : 'none'
  }
})
```

## Multi-step Wizard State

```typescript
interface WizardStep {
  id: string
  title: string
  isValid: boolean
  isComplete: boolean
}

const currentStep = signal(0)
const wizardData = signal<Record<string, any>>({})
const steps = signal<WizardStep[]>([
  { id: 'personal', title: 'Personal Info', isValid: false, isComplete: false },
  { id: 'address', title: 'Address', isValid: false, isComplete: false },
  { id: 'payment', title: 'Payment', isValid: false, isComplete: false },
  { id: 'review', title: 'Review', isValid: false, isComplete: false },
])

// Computed properties
const currentStepData = signalEffect.combine(
  [steps, currentStep],
  (steps, current) => steps[current]
)

const canGoNext = signalEffect.combine(
  [currentStepData, currentStep, steps],
  (stepData, current, allSteps) => stepData.isValid && current < allSteps.length - 1
)

const canGoPrevious = currentStep.map(current => current > 0)

const progress = signalEffect.combine(
  [steps, currentStep],
  (steps, current) => ((current + 1) / steps.length) * 100
)

// Actions
const goNext = () => {
  if (canGoNext.get()) {
    // Mark current step as complete
    const current = currentStep.get()
    steps.update(steps =>
      steps.map((step, index) => (index === current ? { ...step, isComplete: true } : step))
    )

    currentStep.update(current => current + 1)
  }
}

const goPrevious = () => {
  if (canGoPrevious.get()) {
    currentStep.update(current => current - 1)
  }
}

const updateStepData = (stepId: string, data: any) => {
  wizardData.update(current => ({
    ...current,
    [stepId]: { ...current[stepId], ...data },
  }))
}

const validateStep = (stepId: string, isValid: boolean) => {
  steps.update(steps => steps.map(step => (step.id === stepId ? { ...step, isValid } : step)))
}

// React to wizard changes
currentStepData.subscribe(stepData => {
  console.log('Current step:', stepData.title)

  // Update UI to show current step
  const stepElements = document.querySelectorAll('.wizard-step')
  stepElements.forEach((el, index) => {
    el.classList.toggle('active', index === currentStep.get())
  })
})

progress.subscribe(percentage => {
  const progressBar = document.getElementById('progress-bar')
  if (progressBar) {
    progressBar.style.width = `${percentage}%`
  }
})

// Usage
updateStepData('personal', { firstName: 'John', lastName: 'Doe' })
validateStep('personal', true)
goNext()
```

## Global Application State

```typescript
// Global app state
interface AppState {
  user: User | null
  theme: 'light' | 'dark'
  language: 'en' | 'es' | 'fr'
  notifications: Notification[]
  isOnline: boolean
}

const appState = signal<AppState>({
  user: null,
  theme: 'light',
  language: 'en',
  notifications: [],
  isOnline: navigator.onLine,
})

// Selectors (derived signals)
const currentUser = appState.map(state => state.user)
const unreadNotifications = appState.map(state => state.notifications.filter(n => !n.read))
const isDarkTheme = appState.map(state => state.theme === 'dark')

// Actions
const setUser = (user: User | null) => {
  appState.update(state => ({ ...state, user }))
}

const setTheme = (theme: 'light' | 'dark') => {
  appState.update(state => ({ ...state, theme }))

  // Apply theme to document
  document.documentElement.setAttribute('data-theme', theme)

  // Save to localStorage
  localStorage.setItem('theme', theme)
}

const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
  const newNotification = {
    ...notification,
    id: crypto.randomUUID(),
    timestamp: new Date(),
    read: false,
  }

  appState.update(state => ({
    ...state,
    notifications: [...state.notifications, newNotification],
  }))
}

const markNotificationRead = (id: string) => {
  appState.update(state => ({
    ...state,
    notifications: state.notifications.map(n => (n.id === id ? { ...n, read: true } : n)),
  }))
}

// Initialize from localStorage
const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
if (savedTheme) {
  setTheme(savedTheme)
}

// Listen to online/offline events
window.addEventListener('online', () => {
  appState.update(state => ({ ...state, isOnline: true }))
})

window.addEventListener('offline', () => {
  appState.update(state => ({ ...state, isOnline: false }))
})

// React to state changes
currentUser.subscribe(user => {
  if (user) {
    console.log('User logged in:', user.name)
    // Fetch user-specific data
  } else {
    console.log('User logged out')
    // Clear user-specific data
  }
})

unreadNotifications.subscribe(notifications => {
  // Update notification badge
  const badge = document.getElementById('notification-badge')
  if (badge) {
    badge.textContent = notifications.length.toString()
    badge.style.display = notifications.length > 0 ? 'block' : 'none'
  }
})
```

## Best Practices

### 1. Keep Signals Focused

```typescript
// ✅ Good - focused signals
const userName = signal('')
const userEmail = signal('')
const userAge = signal(0)

// ❌ Bad - overly broad signal
const everything = signal({
  user: {},
  cart: {},
  ui: {},
  api: {},
})
```

### 2. Use Computed Signals for Derived State

```typescript
// ✅ Good - computed from source signals
const fullName = signalEffect.combine([firstName, lastName], (first, last) => `${first} ${last}`)

// ❌ Bad - manually updating derived state
const fullName = signal('')
firstName.subscribe(first => {
  fullName.set(`${first} ${lastName.get()}`)
})
```

### 3. Clean Up Subscriptions

```typescript
// ✅ Good - clean up subscriptions
const unsubscribe = signal.subscribe(callback)
// Later...
unsubscribe()

// ❌ Bad - memory leak
signal.subscribe(callback) // Never cleaned up
```

### 4. Use Tasks for Async Operations

```typescript
// ✅ Good - task manages async state
const fetchTask = dataPipeline.asTask()
await fetchTask.run(input)

// ❌ Bad - manually managing async state
const isLoading = signal(false)
const data = signal(null)
const error = signal(null)

isLoading.set(true)
try {
  const result = await fetch('/api/data')
  data.set(result)
} catch (err) {
  error.set(err)
} finally {
  isLoading.set(false)
}
```

Reactive state management with Signals and Tasks provides a powerful foundation for building responsive, maintainable applications.
