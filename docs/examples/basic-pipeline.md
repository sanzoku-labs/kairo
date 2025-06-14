# Basic Pipeline

Learn the fundamentals of creating and using Kairo pipelines with practical examples.

## Simple Data Processing

```typescript
import { pipeline, schema } from 'kairo'
import { z } from 'zod'

// Define a schema for input validation
const NumberSchema = schema(z.number().positive())

// Create a simple pipeline
const doublePipeline = pipeline('double-number')
  .input(NumberSchema)
  .map(x => x * 2)
  .map(x => ({ original: x / 2, doubled: x }))

// Execute the pipeline
const result = await doublePipeline.run(5)

if (result.tag === 'Ok') {
  console.log(result.value) // { original: 5, doubled: 10 }
} else {
  console.error('Error:', result.error.message)
}
```

## String Processing Pipeline

```typescript
const TextSchema = schema(z.string().min(1))

const processTextPipeline = pipeline('process-text')
  .input(TextSchema)
  .map(text => text.trim())
  .map(text => text.toLowerCase())
  .map(text => text.split(' '))
  .map(words => words.filter(word => word.length > 2))
  .map(words => ({ 
    wordCount: words.length,
    words: words,
    joinedText: words.join('-')
  }))

// Usage
const result = await processTextPipeline.run('  Hello World Programming  ')

if (result.tag === 'Ok') {
  console.log(result.value)
  // {
  //   wordCount: 3,
  //   words: ['hello', 'world', 'programming'],
  //   joinedText: 'hello-world-programming'
  // }
}
```

## Validation Pipeline

```typescript
const UserInputSchema = schema(z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  age: z.number().min(18, 'Must be at least 18 years old')
}))

const validateUserPipeline = pipeline('validate-user')
  .input(UserInputSchema)
  .map(user => ({
    ...user,
    displayName: user.name.toUpperCase(),
    emailDomain: user.email.split('@')[1],
    isAdult: user.age >= 18
  }))

// Valid input
const validResult = await validateUserPipeline.run({
  name: 'John Doe',
  email: 'john@example.com',
  age: 25
})

// Invalid input
const invalidResult = await validateUserPipeline.run({
  name: 'A',
  email: 'not-an-email',
  age: 16
})

if (invalidResult.tag === 'Err') {
  console.log('Validation errors:', invalidResult.error.issues)
}
```

## Conditional Processing

```typescript
const NumberProcessingSchema = schema(z.number())

const conditionalPipeline = pipeline('conditional-processing')
  .input(NumberProcessingSchema)
  .map(num => {
    if (num < 0) {
      return { value: Math.abs(num), operation: 'made positive' }
    } else if (num === 0) {
      return { value: 1, operation: 'converted zero to one' }
    } else if (num > 100) {
      return { value: num / 100, operation: 'scaled down' }
    } else {
      return { value: num, operation: 'no change' }
    }
  })

// Test different inputs
const results = await Promise.all([
  conditionalPipeline.run(-5),   // { value: 5, operation: 'made positive' }
  conditionalPipeline.run(0),    // { value: 1, operation: 'converted zero to one' }
  conditionalPipeline.run(200),  // { value: 2, operation: 'scaled down' }
  conditionalPipeline.run(50)    // { value: 50, operation: 'no change' }
])
```

## Error Handling

```typescript
const safeDividePipeline = pipeline('safe-divide')
  .input(schema(z.object({
    numerator: z.number(),
    denominator: z.number()
  })))
  .map(({ numerator, denominator }) => {
    if (denominator === 0) {
      // This will create an error result
      throw new Error('Division by zero is not allowed')
    }
    return {
      numerator,
      denominator,
      result: numerator / denominator,
      remainder: numerator % denominator
    }
  })

// Success case
const successResult = await safeDividePipeline.run({
  numerator: 10,
  denominator: 3
})

// Error case
const errorResult = await safeDividePipeline.run({
  numerator: 10,
  denominator: 0
})

if (errorResult.tag === 'Err') {
  console.log('Division error:', errorResult.error.message)
}
```

## Composing Multiple Pipelines

```typescript
// Create smaller, focused pipelines
const validateEmailPipeline = pipeline('validate-email')
  .input(schema(z.string().email()))
  .map(email => ({ email, domain: email.split('@')[1] }))

const validateNamePipeline = pipeline('validate-name')
  .input(schema(z.string().min(2)))
  .map(name => ({
    name,
    firstName: name.split(' ')[0],
    lastName: name.split(' ').slice(1).join(' ')
  }))

// Compose them in a larger pipeline
const createUserPipeline = pipeline('create-user')
  .input(schema(z.object({
    name: z.string(),
    email: z.string()
  })))
  .map(async (input) => {
    // Run sub-pipelines
    const [nameResult, emailResult] = await Promise.all([
      validateNamePipeline.run(input.name),
      validateEmailPipeline.run(input.email)
    ])

    // Handle results
    if (nameResult.tag === 'Err') throw nameResult.error
    if (emailResult.tag === 'Err') throw emailResult.error

    return {
      ...nameResult.value,
      ...emailResult.value,
      createdAt: new Date().toISOString()
    }
  })

const userResult = await createUserPipeline.run({
  name: 'John Doe',
  email: 'john@example.com'
})
```

## Working with Arrays

```typescript
const NumberListSchema = schema(z.array(z.number()))

const processNumbersPipeline = pipeline('process-numbers')
  .input(NumberListSchema)
  .map(numbers => numbers.filter(n => n > 0)) // Remove negative numbers
  .map(numbers => numbers.map(n => n * 2))    // Double each number
  .map(numbers => ({
    numbers,
    sum: numbers.reduce((a, b) => a + b, 0),
    average: numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0,
    max: Math.max(...numbers),
    min: Math.min(...numbers)
  }))

const result = await processNumbersPipeline.run([1, -2, 3, 4, -5, 6])

if (result.tag === 'Ok') {
  console.log(result.value)
  // {
  //   numbers: [2, 6, 8, 12],
  //   sum: 28,
  //   average: 7,
  //   max: 12,
  //   min: 2
  // }
}
```

## Pipeline with Side Effects

```typescript
const LoggingSchema = schema(z.object({
  userId: z.string(),
  action: z.string(),
  data: z.record(z.unknown())
}))

const auditLogPipeline = pipeline('audit-log')
  .input(LoggingSchema)
  .map(input => ({
    ...input,
    timestamp: new Date().toISOString(),
    id: crypto.randomUUID()
  }))
  .map(logEntry => {
    // Side effect: log to console
    console.log(`[AUDIT] ${logEntry.timestamp}: User ${logEntry.userId} performed ${logEntry.action}`)
    
    // Side effect: could send to external service
    // await sendToAuditService(logEntry)
    
    return logEntry
  })

await auditLogPipeline.run({
  userId: 'user-123',
  action: 'login',
  data: { ip: '192.168.1.1', userAgent: 'Chrome/91.0' }
})
```

## Best Practices

### 1. Keep Pipelines Focused

```typescript
// ✅ Good - focused on single responsibility
const validateEmailPipeline = pipeline('validate-email')
  .input(schema(z.string().email()))
  .map(email => ({ email, isValid: true }))

// ❌ Bad - doing too much
const processEverythingPipeline = pipeline('process-everything')
  .input(schema(z.object({ email: z.string(), name: z.string(), age: z.number() })))
  .map(input => { /* validate email, process name, check age, send notifications, etc. */ })
```

### 2. Use Descriptive Names

```typescript
// ✅ Good - clear what the pipeline does
const calculateTaxAmountPipeline = pipeline('calculate-tax-amount')

// ❌ Bad - unclear purpose
const processPipeline = pipeline('process')
```

### 3. Handle Errors Explicitly

```typescript
// ✅ Good - explicit error handling
const result = await pipeline.run(input)

if (result.tag === 'Ok') {
  // Handle success
  console.log('Success:', result.value)
} else {
  // Handle error
  console.error('Error:', result.error.message)
}
```

### 4. Use Type-Safe Schemas

```typescript
// ✅ Good - specific validation
const UserSchema = schema(z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(150)
}))

// ❌ Bad - too permissive
const UserSchema = schema(z.record(z.unknown()))
```

Basic pipelines provide the foundation for all data processing in Kairo. Start with simple transformations and build up to more complex workflows as needed.