# Kairo Full App Example

A complete login → dashboard application showcasing all of Kairo's features in a real-world scenario.

## 🎯 What This Demonstrates

This example showcases how to build a complete React application using Kairo's core primitives:

- **Authentication Flow** with Forms and Pipelines
- **Dashboard** with Resources, Signals, and Tasks
- **Error Handling** and Loading States
- **Reactive State Management** throughout the app
- **Type Safety** with Zod schemas and TypeScript

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🔐 Demo Accounts

**Regular User:**
- Email: `demo@kairo.dev`
- Password: `password`

**Admin User:**
- Email: `admin@kairo.dev`
- Password: `admin123`

## 🏗 Architecture Overview

### Authentication System

```typescript
// Schema-driven form validation
const LoginSchema = schema(z.object({
  email: z.string().email(),
  password: z.string().min(6)
}))

// Pipeline-based authentication
const loginPipeline = pipeline('auth-login')
  .input(LoginSchema)
  .map(async (credentials) => await mockApi.login(credentials))
  .validate(AuthResponseSchema)
  .trace('login-completed')

// Reactive auth state
const authState = signal({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false
})
```

### Dashboard Resources

```typescript
// Declarative API definitions
const DashboardResource = resource('dashboard', {
  getStats: {
    method: 'GET',
    path: '/api/dashboard/stats',
    response: StatsSchema,
    cache: { ttl: 60000 } // 1 minute cache
  },
  
  updateSettings: {
    method: 'PUT',
    path: '/api/user/settings',
    body: UpdateSettingsSchema,
    response: SettingsSchema
  }
})
```

### React Integration

```typescript
// Custom hooks for Kairo primitives
function useSignal<T>(signal: Signal<T>): T
function useTask<T>(task: Task<T>): TaskState<T>
function useForm<T>(form: Form<T>): FormState<T>

// Usage in components
function DashboardPage() {
  const user = useSignal(currentUser)
  const stats = useSignal(userStats)
  const { isSubmitting, handleSubmit } = useForm(settingsForm)
  
  // ...
}
```

## 📁 Project Structure

```
src/
├── shared/           # Kairo business logic
│   ├── auth.ts      # Authentication pipelines & state
│   └── dashboard.ts # Dashboard resources & state
├── hooks/           # React integration hooks
│   ├── useSignal.ts
│   ├── useTask.ts
│   └── useForm.ts
├── auth/            # Authentication UI
│   └── LoginPage.tsx
├── dashboard/       # Dashboard UI
│   ├── DashboardPage.tsx
│   ├── StatsCard.tsx
│   ├── ActivityFeed.tsx
│   └── SettingsPanel.tsx
└── App.tsx         # Main application
```

## 🔍 Key Features Demonstrated

### 1. Schema-First Development

All data structures are defined with Zod schemas, providing:
- Runtime validation
- Type inference
- Clear API contracts
- Consistent error messages

### 2. Pipeline Composition

Complex operations are built by composing simple pipeline steps:

```typescript
const getUserPipeline = pipeline('get-user')
  .input(UserIdSchema)           // Validate input
  .fetch('/api/users/:id')       // HTTP request
  .validate(UserSchema)          // Validate response
  .map(user => user.profile)     // Transform data
  .cache(300000)                 // Cache for 5 minutes
  .trace('user-loaded')          // Debug tracing
```

### 3. Reactive State Management

State updates flow reactively through the application:

```typescript
// Update auth state
authState.set({ user, token, isAuthenticated: true })

// Components automatically re-render
const user = useSignal(currentUser)
const isAuth = useSignal(isAuthenticated)
```

### 4. Error Handling

All operations use the Result pattern for predictable error flows:

```typescript
const result = await loginPipeline.run(credentials)

if (result.tag === 'Ok') {
  // Success - result.value is typed
  console.log('Logged in:', result.value.user.name)
} else {
  // Error - result.error has context
  console.error('Login failed:', result.error.message)
}
```

### 5. Caching Strategy

Different data has different caching needs:

- **User stats**: 1 minute (semi-static)
- **Activities**: 30 seconds (dynamic)
- **Settings**: 2 minutes (rarely changed)

### 6. Form State Management

Forms integrate validation, submission, and error handling:

```typescript
const {
  fields,
  errors,
  isValid,
  isSubmitting,
  setField,
  handleSubmit
} = useForm(loginForm)
```

## 🧪 What You'll Learn

### Kairo Patterns

1. **Pipeline Design** - How to structure data flows
2. **Signal Usage** - Reactive state management
3. **Form Integration** - Validation and submission
4. **Resource Definitions** - API endpoint management
5. **Error Handling** - Result-based error flows

### React Integration

1. **Custom Hooks** - Bridging Kairo and React
2. **State Synchronization** - Keeping UI in sync
3. **Loading States** - Handling async operations
4. **Form Controls** - Controlled inputs with validation

### Architecture Decisions

1. **Separation of Concerns** - Business logic vs UI logic
2. **Type Safety** - End-to-end type checking
3. **Performance** - Caching and optimization
4. **Developer Experience** - Debugging and tracing

## 🔧 Development Notes

### Mock API

This example uses a mock API to simulate real backend interactions:

- Login validation with demo accounts
- Simulated network delays
- Local storage for persistence
- Error scenarios for testing

### Debugging

The app includes extensive tracing and debugging features:

```typescript
// View pipeline traces
import { tracing } from 'kairo'
console.log(tracing.summary())

// Monitor signal changes
authState.subscribe(state => console.log('Auth state:', state))

// Track task execution
loginTask.signal().subscribe(state => console.log('Login task:', state))
```

### Performance

Key performance features demonstrated:

- **Lazy evaluation** - Pipelines only execute when needed
- **Caching** - Automatic HTTP response caching
- **Signal optimization** - Minimal re-renders
- **Parallel loading** - Dashboard data loads concurrently

## 🎓 Learning Path

1. **Start with auth.ts** - See how authentication is structured
2. **Check LoginPage.tsx** - Learn form integration
3. **Explore dashboard.ts** - Understand resource management
4. **Study the hooks** - See React integration patterns
5. **Run the app** - Experience the complete flow

## 💡 Next Steps

After exploring this example, you might want to:

1. **Add features** - Try implementing a profile page
2. **Integrate APIs** - Connect to a real backend
3. **Add routing** - Use React Router for navigation
4. **Optimize performance** - Add more sophisticated caching
5. **Add testing** - Write tests for pipelines and components

## 🐛 Common Issues

### Type Errors
- Make sure you're using the exact schema types
- Check that signal subscriptions are properly typed

### Missing Data
- Verify auth state is initialized before accessing user data
- Check pipeline traces for failed operations

### Performance
- Use React DevTools to check for unnecessary re-renders
- Monitor pipeline caches with tracing

## 📚 Related Documentation

- [Kairo Core Concepts](/guide/concepts)
- [Pipeline API](/api/pipeline)
- [Signals & Tasks](/api/signal)
- [Forms & Validation](/api/form)
- [Resource Management](/api/resource)

---

This example demonstrates how Kairo eliminates glue code and provides a consistent, type-safe way to build reactive applications. The patterns shown here scale to much larger applications while maintaining clarity and predictability.