# Troubleshooting Guide

**Quick solutions to common Kairo development issues with learning hints.**

## 🚨 Error Messages with Learning Context

### Common Error Patterns

#### 🔴 "Cannot read property 'value' of undefined"

**What happened**: You tried to access `.value` on a Result without checking if it's Ok first.

**Quick fix**:
```typescript
// ❌ Wrong
const result = await someOperation()
console.log(result.value) // Dangerous!

// ✅ Correct
const result = await someOperation()
if (Result.isOk(result)) {
  console.log(result.value) // Safe!
}

// ✅ Better - use match
match(result, {
  Ok: value => console.log(value),
  Err: error => console.error(error)
})
```

**Learn more**: [Result Pattern Guide](../getting-started/your-first-app.md#module-1-safe-error-handling)

---

#### 🔴 "Schema validation failed"

**What happened**: Your data doesn't match the expected schema shape.

**Quick fix**:
```typescript
// Check what the schema expects
console.log('Schema expects:', UserSchema.shape)

// Check what you're providing
console.log('You provided:', userData)

// Common issues:
// - Missing required fields
// - Wrong data types (string vs number)
// - Invalid formats (email, URL)
```

**Learn more**: [Schema Validation Guide](../getting-started/your-first-app.md#module-2-data-validation)

---

#### 🔴 "Pipeline input validation failed"

**What happened**: The data passed to pipeline.run() doesn't match the input schema.

**Quick fix**:
```typescript
const pipeline = pipeline('my-pipeline')
  .input(UserSchema) // Pipeline expects UserSchema shape
  
// ❌ Wrong - passing wrong shape
pipeline.run({ wrongField: 'value' })

// ✅ Correct - match the schema
pipeline.run({ 
  name: 'John',
  email: 'john@example.com',
  age: 25
})
```

**Learn more**: [Pipeline Patterns](../getting-started/processing-data.md)

---

#### 🔴 "Resource method not found"

**What happened**: You're trying to call a method that wasn't defined on the resource.

**Quick fix**:
```typescript
const UserAPI = resource('users', {
  get: { /* ... */ },
  create: { /* ... */ }
  // Note: no 'update' method defined
})

// ❌ Wrong
UserAPI.update.run() // update doesn't exist!

// ✅ Correct - use defined methods
UserAPI.get.run()
UserAPI.create.run()
```

**Learn more**: [API Resource Guide](../getting-started/building-apis.md)

---

## 🔍 Debugging Strategies

### 1. Pipeline Debugging

**Problem**: "My pipeline fails but I don't know which step"

**Solution**: Add logging between steps
```typescript
const debugPipeline = pipeline('debug-example')
  .input(schema.any())
  .map(data => {
    console.log('Step 1 input:', data)
    return transform1(data)
  })
  .map(data => {
    console.log('Step 2 input:', data)
    return transform2(data)
  })
  .run(async data => {
    console.log('Step 3 input:', data)
    return await asyncOperation(data)
  })
```

**Pro tip**: Use the `tap` function for debugging without changing data:
```typescript
import { tap } from 'kairo/tier1'

const pipeline = pipeline('example')
  .input(schema.any())
  .map(transform1)
  .map(tap(data => console.log('After transform1:', data)))
  .map(transform2)
```

---

### 2. Schema Validation Debugging

**Problem**: "My schema validation fails with unclear errors"

**Solution**: Use verbose validation
```typescript
const result = UserSchema.parse(data)

if (Result.isErr(result)) {
  // Get detailed error information
  const error = result.error
  console.log('Validation errors:', error.errors)
  
  // Show field-specific errors
  error.errors.forEach(err => {
    console.log(`Field: ${err.path.join('.')}, Issue: ${err.message}`)
  })
}
```

---

### 3. Async Operation Debugging

**Problem**: "My async operations fail silently"

**Solution**: Always handle Result properly
```typescript
// Add explicit error handling
const processAsync = pipeline('async-process')
  .input(schema.any())
  .run(async (data) => {
    try {
      const result = await someAsyncOperation(data)
      console.log('Async operation succeeded:', result)
      return result
    } catch (error) {
      console.error('Async operation failed:', error)
      throw error // Re-throw to propagate to Result.Err
    }
  })
```

---

## 💡 Development Mode Helpers

### Enable Verbose Logging

```typescript
// development-helpers.ts
import { pipeline } from 'kairo/tier1'

export const createDevPipeline = (name: string) => {
  return pipeline(name)
    .beforeEach((step, data) => {
      console.log(`[${name}] Before ${step}:`, data)
    })
    .afterEach((step, data) => {
      console.log(`[${name}] After ${step}:`, data)
    })
}

// Usage
const myPipeline = createDevPipeline('user-processing')
  .input(UserSchema)
  .map(transformUser)
```

### Type Hints Helper

```typescript
// Get type hints for complex operations
import type { InferSchema } from 'kairo'

// Infer types from schemas
type User = InferSchema<typeof UserSchema>

// Now you get full IDE support
const processUser = (user: User) => {
  // TypeScript knows all properties of user
  console.log(user.name) // Auto-complete works!
}
```

---

## 🚑 Quick Fixes

### "I need to..." Quick Reference

| I need to... | Use this pattern | Learn more |
|-------------|------------------|------------|
| Handle errors without crashing | Result pattern with match | [Error Handling](../getting-started/your-first-app.md#module-1-safe-error-handling) |
| Validate API responses | schema.parse() | [Schema Guide](../examples/common-patterns.md#api-integration-patterns) |
| Transform data safely | pipeline with map | [Pipeline Guide](../getting-started/processing-data.md) |
| Call external APIs | resource | [API Guide](../getting-started/building-apis.md) |
| Store related data | repository with relationships | [Data Guide](../getting-started/managing-data.md) |
| Implement business rules | rules and rule | [Rules Guide](../getting-started/processing-data.md#business-rule-validation) |
| Cache expensive operations | pipeline.cache() | [Performance Guide](../examples/common-patterns.md#performance-patterns) |
| Compose functions | pipe | [FP Guide](../getting-started/processing-data.md#function-composition-with-pipe) |

---

## 🎓 Learning from Errors

### Error Pattern Recognition

When you encounter an error, ask yourself:

1. **Is this a validation error?** → Check your schemas
2. **Is this a type error?** → Check your TypeScript types
3. **Is this a runtime error?** → Check your Result handling
4. **Is this an async error?** → Check your promises and error propagation

### Building Error Intuition

**Beginner mistakes** (we all make them!):
- Forgetting to check Result.isOk before accessing .value
- Not handling all cases in match
- Missing required fields in schemas
- Forgetting async/await with pipeline.run()

**Intermediate challenges**:
- Complex schema validation with nested objects
- Async validation in rules
- Error recovery in pipelines
- Proper error propagation

**Advanced patterns**:
- Custom error types with context
- Error aggregation across operations
- Partial success handling
- Graceful degradation strategies

---

## 📚 Additional Resources

### Debugging Tools
- [TypeScript Playground](https://www.typescriptlang.org/play) - Test code snippets
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/) - Debug in browser
- [VS Code Debugger](https://code.visualstudio.com/docs/editor/debugging) - Step through code

### Community Help
- **Discord**: Real-time help from community
- **GitHub Issues**: Report bugs or unclear errors
- **Stack Overflow**: Tagged questions with `kairo`

### Learning Resources
- [Foundation Path](../learning-paths/foundation-path.md) - Master basics
- [Common Patterns](../examples/common-patterns.md) - See solutions
- [Interactive Exercises](../learning-paths/interactive-exercises.md) - Practice debugging

---

## 🆘 Still Stuck?

If you've tried the solutions above and still need help:

1. **Isolate the problem**: Create minimal reproduction
2. **Check prerequisites**: Ensure you understand required concepts
3. **Search existing issues**: Someone may have solved it
4. **Ask for help**: Include:
   - Error message (full text)
   - Code that causes the error
   - What you expected to happen
   - What you've already tried

Remember: Every error is a learning opportunity. The more errors you encounter and solve, the better developer you become! 🚀