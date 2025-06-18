# Enhanced Error Messages & Development Mode

**Smart error messages that teach while they inform.**

## 🎯 Error Message Enhancement Strategy

### Before: Standard Error Messages
```
Error: Validation failed
```

### After: Enhanced Learning-Oriented Messages
```
Error: Validation failed for UserSchema

What went wrong:
- Field 'email' failed validation: Invalid email format
- Field 'age' failed validation: Expected number, received string

Quick fix:
Ensure your data matches the schema:
{
  email: 'user@example.com',  // Must be valid email
  age: 25                     // Must be a number
}

Learn more: https://kairo.dev/docs/schema-validation
Try: Run with KAIRO_DEV=true for detailed validation info
```

## 🔧 Implementation Examples

### Enhanced Result Error Messages

```typescript
// utils/enhanced-errors.ts
import { Result, KairoError } from 'kairo'

export class EnhancedError extends KairoError {
  constructor(
    message: string,
    public quickFix?: string,
    public learnMoreUrl?: string,
    public debugHint?: string
  ) {
    super(message)
  }

  toString() {
    let output = `Error: ${this.message}\n`
    
    if (this.quickFix) {
      output += `\nQuick fix:\n${this.quickFix}\n`
    }
    
    if (this.learnMoreUrl) {
      output += `\nLearn more: ${this.learnMoreUrl}\n`
    }
    
    if (process.env.KAIRO_DEV === 'true' && this.debugHint) {
      output += `\nDebug hint: ${this.debugHint}\n`
    }
    
    return output
  }
}

// Helper to create enhanced errors
export const createLearningError = (
  code: string,
  message: string,
  context?: any
) => {
  const errorMap = {
    'VALIDATION_FAILED': {
      quickFix: 'Check that your data matches the expected schema shape',
      learnMoreUrl: 'https://kairo.dev/docs/schema-validation',
      debugHint: `Schema expected: ${JSON.stringify(context?.schema, null, 2)}`
    },
    'PIPELINE_INPUT_INVALID': {
      quickFix: 'Ensure pipeline.run() receives data matching the input schema',
      learnMoreUrl: 'https://kairo.dev/docs/pipeline-patterns',
      debugHint: `Input received: ${JSON.stringify(context?.input, null, 2)}`
    },
    'RESOURCE_NOT_FOUND': {
      quickFix: 'Check that the resource method exists and is properly defined',
      learnMoreUrl: 'https://kairo.dev/docs/api-resources',
      debugHint: `Available methods: ${context?.availableMethods?.join(', ')}`
    },
    'RULE_VALIDATION_FAILED': {
      quickFix: 'Review the business rule requirements and ensure data compliance',
      learnMoreUrl: 'https://kairo.dev/docs/business-rules',
      debugHint: `Failed rules: ${context?.failedRules?.join(', ')}`
    }
  }
  
  const errorInfo = errorMap[code] || {}
  
  return new EnhancedError(
    message,
    errorInfo.quickFix,
    errorInfo.learnMoreUrl,
    errorInfo.debugHint
  )
}
```

### Enhanced Pipeline with Learning Hints

```typescript
// utils/enhanced-pipeline.ts
import { pipeline as basePipeline } from 'kairo/tier1'

export const pipeline = (name: string) => {
  const enhancedPipeline = basePipeline(name)
  
  // Override run method to add enhanced errors
  const originalRun = enhancedPipeline.run
  enhancedPipeline.run = async (input: any) => {
    try {
      const result = await originalRun.call(enhancedPipeline, input)
      
      if (Result.isErr(result) && process.env.KAIRO_DEV === 'true') {
        // Enhance error with learning context
        const error = result.error
        console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pipeline '${name}' failed at step ${error.step || 'unknown'}

Input that caused failure:
${JSON.stringify(input, null, 2)}

Common causes:
1. Input doesn't match schema
2. Async operation failed
3. Business rule validation failed

Debug steps:
1. Check input against schema
2. Add logging to identify failing step
3. Verify all async operations handle errors

Learn more about pipeline debugging:
https://kairo.dev/docs/troubleshooting/pipelines
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `)
      }
      
      return result
    } catch (error) {
      // Unhandled error - provide maximum context
      if (process.env.KAIRO_DEV === 'true') {
        console.error(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNEXPECTED ERROR in pipeline '${name}'

This error was not properly handled. In Kairo, all errors
should be wrapped in Result.Err for safe handling.

Error details:
${error.message}
${error.stack}

How to fix:
1. Wrap throwing operations in try/catch
2. Return Result.Err instead of throwing
3. Use Result.fromTry for unsafe operations

Example fix:
.run(async (data) => {
  try {
    const result = await riskyOperation(data)
    return result
  } catch (error) {
    return Result.Err(new Error(error.message))
  }
})

Learn more: https://kairo.dev/docs/error-handling
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `)
      }
      throw error
    }
  }
  
  return enhancedPipeline
}
```

### Enhanced Schema Validation Messages

```typescript
// utils/enhanced-schema.ts
import { schema as baseSchema } from 'kairo'

export const enhanceSchemaError = (error: any, schemaName?: string) => {
  if (process.env.KAIRO_DEV !== 'true') {
    return error
  }
  
  const issues = error.errors || []
  const enhancedMessage = `
Schema Validation Failed${schemaName ? ` for ${schemaName}` : ''}

Issues found:
${issues.map((issue: any, index: number) => `
  ${index + 1}. Field: ${issue.path.join('.')}
     Problem: ${issue.message}
     Expected: ${issue.expected || 'valid value'}
     Received: ${JSON.stringify(issue.received)}
`).join('')}

Quick fixes:
${issues.map((issue: any) => {
  const field = issue.path.join('.')
  const fixes = {
    'email': '- Ensure email is in format: user@example.com',
    'age': '- Age must be a positive number',
    'required': `- Field '${field}' is required and cannot be empty`,
    'type': `- Field '${field}' has wrong type, check the schema`
  }
  
  return fixes[issue.type] || fixes[field] || `- Check field '${field}'`
}).join('\n')}

Learn more about schema validation:
https://kairo.dev/docs/data-validation

Pro tip: Use TypeScript to catch these errors at compile time:
import type { InferSchema } from 'kairo'
type MyType = InferSchema<typeof MySchema>
`
  
  error.enhancedMessage = enhancedMessage
  return error
}

// Wrap schema creation to add enhanced errors
export const schema = {
  ...baseSchema,
  object: (shape: any) => {
    const originalSchema = baseSchema.object(shape)
    
    return {
      ...originalSchema,
      parse: (data: any) => {
        const result = originalSchema.parse(data)
        if (Result.isErr(result)) {
          result.error = enhanceSchemaError(result.error, 'ObjectSchema')
        }
        return result
      }
    }
  }
}
```

## 🚀 Development Mode Features

### Enable Development Mode

```typescript
// In your app initialization
process.env.KAIRO_DEV = 'true' // Enable enhanced errors

// Or via command line
// KAIRO_DEV=true npm run dev
```

### Development Mode Helper

```typescript
// utils/dev-mode.ts
export const devMode = {
  isEnabled: () => process.env.KAIRO_DEV === 'true',
  
  log: (message: string, data?: any) => {
    if (devMode.isEnabled()) {
      console.log(`[KAIRO DEV] ${message}`, data || '')
    }
  },
  
  trace: (operation: string) => {
    if (devMode.isEnabled()) {
      const start = Date.now()
      return {
        end: (result?: any) => {
          const duration = Date.now() - start
          console.log(`[KAIRO TRACE] ${operation} took ${duration}ms`, result)
        }
      }
    }
    return { end: () => {} }
  },
  
  suggest: (context: string, suggestion: string) => {
    if (devMode.isEnabled()) {
      console.log(`
💡 KAIRO SUGGESTION for ${context}:
${suggestion}
      `)
    }
  },
  
  warn: (message: string, fix?: string) => {
    if (devMode.isEnabled()) {
      console.warn(`
⚠️  KAIRO WARNING: ${message}
${fix ? `Fix: ${fix}` : ''}
      `)
    }
  }
}
```

### Smart Suggestions System

```typescript
// utils/smart-suggestions.ts
export const smartSuggestions = {
  // Suggest better patterns based on usage
  analyzePipeline: (pipeline: any) => {
    if (pipeline.steps.length > 10) {
      devMode.suggest('pipeline-complexity', `
This pipeline has ${pipeline.steps.length} steps. Consider:
1. Breaking into smaller pipelines
2. Extracting common patterns into functions
3. Using pipe() for simple transformations

Example refactor:
const step1to5 = pipe(transform1, transform2, transform3, transform4, transform5)
const step6to10 = pipe(transform6, transform7, transform8, transform9, transform10)

const simplifiedPipeline = pipeline('simple')
  .input(schema)
  .map(step1to5)
  .map(step6to10)
      `)
    }
  },
  
  // Suggest schema improvements
  analyzeSchema: (schema: any, data: any) => {
    const keys = Object.keys(data)
    const schemaKeys = Object.keys(schema.shape || {})
    
    const extraKeys = keys.filter(k => !schemaKeys.includes(k))
    if (extraKeys.length > 0) {
      devMode.suggest('schema-mismatch', `
Data contains fields not in schema: ${extraKeys.join(', ')}

Options:
1. Add fields to schema if they're needed
2. Use .passthrough() to allow extra fields
3. Use .strict() to explicitly reject extra fields

Example:
const FlexibleSchema = schema.object({
  ...existingFields
}).passthrough() // Allows extra fields
      `)
    }
  },
  
  // Suggest error handling improvements
  analyzeErrorHandling: (code: string) => {
    if (code.includes('.value') && !code.includes('isOk')) {
      devMode.warn(
        'Accessing .value without checking Result.isOk',
        'Always check Result.isOk(result) before accessing result.value'
      )
    }
    
    if (code.includes('try {') && code.includes('pipeline')) {
      devMode.suggest('error-handling', `
Instead of try/catch with pipelines, use Result pattern:

// Instead of:
try {
  const result = await pipeline.run(data)
} catch (error) {
  // handle error
}

// Use:
const result = await pipeline.run(data)
match(result, {
  Ok: value => // handle success,
  Err: error => // handle error
})
      `)
    }
  }
}
```

## 📊 Development Dashboard

```typescript
// utils/dev-dashboard.ts
export class DevDashboard {
  private stats = {
    pipelinesRun: 0,
    pipelinesFailed: 0,
    schemasValidated: 0,
    schemasFailed: 0,
    apiCalls: 0,
    apiCallsFailed: 0
  }
  
  trackPipeline(name: string, success: boolean) {
    this.stats.pipelinesRun++
    if (!success) this.stats.pipelinesFailed++
    
    if (this.stats.pipelinesRun % 10 === 0) {
      this.showStats()
    }
  }
  
  showStats() {
    if (!devMode.isEnabled()) return
    
    console.log(`
╔════════════════════════════════════════════════════╗
║               KAIRO DEV DASHBOARD                  ║
╠════════════════════════════════════════════════════╣
║ Pipelines:                                         ║
║   Total: ${this.stats.pipelinesRun.toString().padEnd(10)} Success Rate: ${this.getSuccessRate('pipelines')}% ║
║                                                    ║
║ Schemas:                                           ║
║   Total: ${this.stats.schemasValidated.toString().padEnd(10)} Success Rate: ${this.getSuccessRate('schemas')}% ║
║                                                    ║
║ API Calls:                                         ║
║   Total: ${this.stats.apiCalls.toString().padEnd(10)} Success Rate: ${this.getSuccessRate('api')}% ║
╠════════════════════════════════════════════════════╣
║ Top Issues:                                        ║
║ 1. Schema validation failures (${this.stats.schemasFailed})                 ║
║ 2. Pipeline errors (${this.stats.pipelinesFailed})                        ║
║ 3. API failures (${this.stats.apiCallsFailed})                            ║
╚════════════════════════════════════════════════════╝

💡 Tips based on your usage:
${this.generateTips()}
    `)
  }
  
  private getSuccessRate(type: string): number {
    switch(type) {
      case 'pipelines':
        return Math.round((1 - this.stats.pipelinesFailed / this.stats.pipelinesRun) * 100)
      case 'schemas':
        return Math.round((1 - this.stats.schemasFailed / this.stats.schemasValidated) * 100)
      case 'api':
        return Math.round((1 - this.stats.apiCallsFailed / this.stats.apiCalls) * 100)
      default:
        return 0
    }
  }
  
  private generateTips(): string {
    const tips = []
    
    if (this.stats.schemasFailed > this.stats.schemasValidated * 0.3) {
      tips.push('- High schema failure rate. Consider reviewing your data structures.')
    }
    
    if (this.stats.pipelinesFailed > this.stats.pipelinesRun * 0.2) {
      tips.push('- Pipeline errors are common. Add more intermediate validation.')
    }
    
    if (this.stats.apiCallsFailed > this.stats.apiCalls * 0.1) {
      tips.push('- API calls failing frequently. Consider adding retry logic.')
    }
    
    return tips.join('\n') || '- Your code is running smoothly! 🎉'
  }
}

// Global dashboard instance
export const devDashboard = new DevDashboard()
```

## 🎯 Usage Examples

### Before Enhancement
```typescript
// Standard error - not very helpful
const result = UserSchema.parse(invalidData)
// Error: Validation failed
```

### After Enhancement
```typescript
// Enhanced error with learning context
const result = UserSchema.parse(invalidData)
// Error: Schema Validation Failed for UserSchema
// 
// Issues found:
//   1. Field: email
//      Problem: Invalid email format
//      Expected: valid email
//      Received: "not-an-email"
//
// Quick fixes:
// - Ensure email is in format: user@example.com
//
// Learn more about schema validation:
// https://kairo.dev/docs/data-validation
```

### Development Mode in Action
```typescript
// Enable dev mode
process.env.KAIRO_DEV = 'true'

// Now you get helpful suggestions
const longPipeline = pipeline('complex')
  .input(schema.any())
  .map(step1).map(step2).map(step3)
  .map(step4).map(step5).map(step6)
  .map(step7).map(step8).map(step9)
  .map(step10).map(step11).map(step12)

// 💡 KAIRO SUGGESTION for pipeline-complexity:
// This pipeline has 12 steps. Consider:
// 1. Breaking into smaller pipelines
// 2. Extracting common patterns into functions
// ...
```

## 🚀 Next Steps

1. **Enable development mode** in your project
2. **Import enhanced utilities** instead of base functions
3. **Watch for suggestions** and learn from them
4. **Share feedback** on helpful error messages

The enhanced error system turns every error into a learning opportunity! 🎓