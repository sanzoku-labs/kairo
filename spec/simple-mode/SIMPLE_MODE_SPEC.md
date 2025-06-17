# Simple Mode Specification

**Document**: Simple Mode Implementation  
**Version**: 1.0  
**Phase**: Stream 0 (Simple Mode Development)  
**Priority**: High

---

## 🎯 Objective

Create an ultra-simple API that allows developers to build applications with minimal Kairo concepts while maintaining a clear path to more advanced features.

### Success Criteria
- **Learning Time**: < 10 minutes to understand and use
- **Time to First App**: < 5 minutes for basic CRUD
- **Code Reduction**: 50% less code than standard Kairo patterns
- **Migration Path**: Smooth progression to standard/advanced modes
- **Performance**: Minimal overhead compared to standard mode

---

## 📋 API Specification

### **Core Simple API**

#### **1. Simple Resource**
```typescript
// Basic usage - infers common REST patterns
const todos = simpleResource('https://api.example.com/todos')

// With schema validation
const todos = simpleResource('https://api.example.com/todos', {
  schema: {
    id: 'number',
    title: 'string', 
    completed: 'boolean'
  }
})

// With base configuration
const todos = simpleResource('/todos', {
  baseURL: 'https://api.example.com',
  timeout: 5000,
  retries: 3,
  cache: true
})
```

#### **Auto-Generated Methods**
```typescript
interface SimpleResource<T> {
  // Automatically available methods
  list(): Promise<T[]>                    // GET /todos
  get(id: string | number): Promise<T>    // GET /todos/:id
  create(data: Partial<T>): Promise<T>    // POST /todos
  update(id: string | number, data: Partial<T>): Promise<T>  // PUT /todos/:id
  delete(id: string | number): Promise<void>  // DELETE /todos/:id
  
  // Advanced usage when needed
  custom(method: string, path: string, data?: any): Promise<any>
  withAuth(token: string): SimpleResource<T>
  withHeaders(headers: Record<string, string>): SimpleResource<T>
  
  // Progressive enhancement hooks
  enhance(): ResourceBuilder<T>  // Converts to standard Kairo resource
}
```

#### **2. Simple Pipeline**
```typescript
// Basic validation and processing
const createTodo = simplePipeline()
  .validate(todo => todo.title.length > 0)
  .validate(todo => todo.title.length < 100)
  .call(todos.create)
  .done()

// With transformation
const processUser = simplePipeline()
  .validate(userSchema)
  .transform(user => ({ ...user, createdAt: new Date() }))
  .call(users.create)
  .notify(sendWelcomeEmail)
  .done()
```

#### **Simple Pipeline Interface**
```typescript
interface SimplePipeline<TInput = any, TOutput = any> {
  // Validation
  validate(predicate: (input: TInput) => boolean): SimplePipeline<TInput, TOutput>
  validate(schema: SimpleSchema): SimplePipeline<TInput, TOutput>
  
  // Transformation
  transform<TNew>(fn: (input: TInput) => TNew): SimplePipeline<TNew, TOutput>
  
  // External calls
  call<TResult>(fn: (input: TInput) => Promise<TResult>): SimplePipeline<TInput, TResult>
  
  // Side effects
  notify(fn: (input: TInput) => Promise<void>): SimplePipeline<TInput, TOutput>
  log(message?: string): SimplePipeline<TInput, TOutput>
  
  // Completion
  done(): (input: TInput) => Promise<TOutput>
  
  // Progressive enhancement
  enhance(): PipelineBuilder<TInput, TOutput>
}
```

### **3. Simple Schema**
```typescript
// String-based schema for basic validation
const userSchema = {
  name: 'string',
  email: 'email',
  age: 'number',
  active: 'boolean',
  tags: 'string[]',
  profile: {
    bio: 'string?',  // Optional
    avatar: 'url'
  }
}

// Runtime validation
const result = validateSimple(userSchema, userData)
if (result.valid) {
  // Data is valid
} else {
  console.log(result.errors)
}
```

---

## 🏗️ Implementation Details

### **1. Simple Resource Implementation**

```typescript
// File: src/simple/resource.ts
import { resource, schema } from '../index'

export function simpleResource<T = any>(
  endpoint: string, 
  options: SimpleResourceOptions = {}
): SimpleResource<T> {
  const config = buildResourceConfig(endpoint, options)
  const kairoResource = resource(extractResourceName(endpoint), config)
  
  return {
    async list() {
      const result = await kairoResource.list.run({})
      return unwrapResult(result)
    },
    
    async get(id: string | number) {
      const result = await kairoResource.get.run({ params: { id } })
      return unwrapResult(result)
    },
    
    async create(data: Partial<T>) {
      const result = await kairoResource.create.run({ body: data })
      return unwrapResult(result)
    },
    
    async update(id: string | number, data: Partial<T>) {
      const result = await kairoResource.update.run({ 
        params: { id }, 
        body: data 
      })
      return unwrapResult(result)
    },
    
    async delete(id: string | number) {
      const result = await kairoResource.delete.run({ params: { id } })
      return unwrapResult(result)
    },
    
    enhance() {
      return new ResourceBuilder(kairoResource)
    }
  }
}

function buildResourceConfig(endpoint: string, options: SimpleResourceOptions) {
  const baseURL = options.baseURL || extractBaseURL(endpoint)
  const resourcePath = options.baseURL ? endpoint : extractPath(endpoint)
  
  return {
    list: {
      path: resourcePath,
      method: 'GET' as const,
      response: options.schema ? simpleSchemaToKairo(options.schema, true) : schema.unknown()
    },
    get: {
      path: `${resourcePath}/:id`,
      method: 'GET' as const,
      params: schema.object({ id: schema.string() }),
      response: options.schema ? simpleSchemaToKairo(options.schema) : schema.unknown()
    },
    create: {
      path: resourcePath,
      method: 'POST' as const,
      body: options.schema ? simpleSchemaToKairo(options.schema) : schema.unknown(),
      response: options.schema ? simpleSchemaToKairo(options.schema) : schema.unknown()
    },
    update: {
      path: `${resourcePath}/:id`,
      method: 'PUT' as const,
      params: schema.object({ id: schema.string() }),
      body: options.schema ? simpleSchemaToKairo(options.schema) : schema.unknown(),
      response: options.schema ? simpleSchemaToKairo(options.schema) : schema.unknown()
    },
    delete: {
      path: `${resourcePath}/:id`,
      method: 'DELETE' as const,
      params: schema.object({ id: schema.string() }),
      response: schema.void()
    }
  }
}
```

### **2. Simple Pipeline Implementation**

```typescript
// File: src/simple/pipeline.ts
import { pipeline } from '../index'

export function simplePipeline<TInput = any>(): SimplePipeline<TInput, TInput> {
  const steps: PipelineStep[] = []
  
  return {
    validate(predicateOrSchema) {
      if (typeof predicateOrSchema === 'function') {
        steps.push(createValidationStep(predicateOrSchema))
      } else {
        steps.push(createSchemaValidationStep(predicateOrSchema))
      }
      return this
    },
    
    transform(fn) {
      steps.push(createTransformStep(fn))
      return this as any
    },
    
    call(fn) {
      steps.push(createCallStep(fn))
      return this as any
    },
    
    notify(fn) {
      steps.push(createNotifyStep(fn))
      return this
    },
    
    log(message) {
      steps.push(createLogStep(message))
      return this
    },
    
    done() {
      const kairoePipeline = buildKairoPipeline(steps)
      return async (input: TInput) => {
        const result = await kairoePipeline.run(input)
        return unwrapResult(result)
      }
    },
    
    enhance() {
      return new PipelineBuilder(buildKairoPipeline(steps))
    }
  }
}

function createValidationStep(predicate: (input: any) => boolean): PipelineStep {
  return {
    type: 'validation',
    handler: async (input) => {
      if (!predicate(input)) {
        throw new Error('Validation failed')
      }
      return input
    }
  }
}

function buildKairoPipeline(steps: PipelineStep[]) {
  let kairoaPipeline = pipeline('simple-pipeline')
  
  for (const step of steps) {
    switch (step.type) {
      case 'validation':
        kairoaPipeline = kairoaPipeline.map(step.handler)
        break
      case 'transform':
        kairoaPipeline = kairoaPipeline.map(step.handler)
        break
      case 'call':
        kairoaPipeline = kairoaPipeline.map(step.handler)
        break
      case 'notify':
        kairoaPipeline = kairoaPipeline.tap(step.handler)
        break
    }
  }
  
  return kairoaPipeline
}
```

### **3. Simple Schema Implementation**

```typescript
// File: src/simple/schema.ts
export function simpleSchemaToKairo(simpleSchema: SimpleSchema): KairoSchema {
  if (typeof simpleSchema === 'string') {
    return convertSimpleType(simpleSchema)
  }
  
  if (Array.isArray(simpleSchema)) {
    return schema.array(simpleSchemaToKairo(simpleSchema[0]))
  }
  
  if (typeof simpleSchema === 'object') {
    const properties: Record<string, KairoSchema> = {}
    
    for (const [key, value] of Object.entries(simpleSchema)) {
      properties[key] = simpleSchemaToKairo(value as SimpleSchema)
    }
    
    return schema.object(properties)
  }
  
  return schema.unknown()
}

function convertSimpleType(type: string): KairoSchema {
  const isOptional = type.endsWith('?')
  const isArray = type.endsWith('[]')
  const baseType = type.replace(/[?[\]]/g, '')
  
  let kairoaSchema: KairoSchema
  
  switch (baseType) {
    case 'string':
      kairoaSchema = schema.string()
      break
    case 'number':
      kairoaSchema = schema.number()
      break
    case 'boolean':
      kairoaSchema = schema.boolean()
      break
    case 'email':
      kairoaSchema = schema.string().email()
      break
    case 'url':
      kairoaSchema = schema.string().url()
      break
    default:
      kairoaSchema = schema.unknown()
  }
  
  if (isArray) {
    kairoaSchema = schema.array(kairoaSchema)
  }
  
  if (isOptional) {
    kairoaSchema = kairoaSchema.optional()
  }
  
  return kairoaSchema
}

export function validateSimple(simpleSchema: SimpleSchema, data: any): ValidationResult {
  const kairoaSchema = simpleSchemaToKairo(simpleSchema)
  const result = kairoaSchema.safeParse(data)
  
  return {
    valid: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? [] : formatErrors(result.error)
  }
}
```

---

## 🎓 Progressive Enhancement

### **Enhancement Patterns**

#### **1. Simple → Standard Resource**
```typescript
// Start simple
const todos = simpleResource('/todos')

// Enhance when needed
const TodoAPI = todos.enhance()
  .addMethod('search', {
    path: '/todos/search',
    query: schema.object({ q: schema.string() })
  })
  .addValidation(todoRules)
  .addCache({ ttl: 60000 })
  .build()
```

#### **2. Simple → Standard Pipeline**
```typescript
// Start simple
const process = simplePipeline()
  .validate(userSchema)
  .call(users.create)
  .done()

// Enhance when needed
const processPipeline = process.enhance()
  .addBusinessRules(userRules)
  .addErrorHandling()
  .addTracing()
  .build()
```

### **Enhancement Triggers**

#### **IDE Hints**
```typescript
const todos = simpleResource('/todos')
// 💡 Hover hint: "Add caching with .enhance().addCache()"
// 💡 Hover hint: "Add validation with schema option"

todos.create({ title: 'Invalid data that fails' })
// 💡 Error hint: "Consider adding validation to prevent this error"
// 💡 Quick fix: "Add schema validation"
```

#### **Runtime Suggestions**
```typescript
// Development mode warnings
console.warn('💡 Kairo Suggestion: This resource is called frequently. Consider adding caching.')
console.warn('💡 Kairo Suggestion: Add validation to prevent runtime errors.')
```

---

## 📚 Usage Examples

### **Complete Todo App (5 lines)**
```typescript
const todos = simpleResource('/todos', {
  schema: { id: 'number', title: 'string', completed: 'boolean' }
})

app.get('/todos', () => todos.list())
app.post('/todos', (req) => todos.create(req.body))
app.put('/todos/:id', (req) => todos.update(req.params.id, req.body))
```

### **With Business Logic (15 lines)**
```typescript
const createTodo = simplePipeline()
  .validate(todo => todo.title.length > 0)
  .transform(todo => ({ ...todo, createdAt: new Date(), completed: false }))
  .call(todos.create)
  .notify(sendNotification)
  .done()

app.post('/todos', async (req, res) => {
  try {
    const todo = await createTodo(req.body)
    res.json(todo)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})
```

---

## 🧪 Testing Requirements

### **Unit Tests**
- Simple resource method generation
- Pipeline step composition
- Schema validation conversion
- Enhancement utilities

### **Integration Tests**
- Complete simple app workflows
- Enhancement transitions
- Error handling scenarios
- Performance comparisons

### **User Experience Tests**
- Time to first working app
- Learning curve measurement
- Enhancement discovery
- Error message clarity

---

## 📊 Success Metrics

### **Developer Experience**
- Time to first app: < 5 minutes
- Lines of code reduction: 50%
- Learning time: < 10 minutes
- Enhancement adoption: 40% graduate to standard mode

### **Technical Quality**
- Performance overhead: < 5%
- API coverage: 80% of common patterns
- Error handling: Clear, actionable messages
- Type safety: Full TypeScript support

---

## ✅ Acceptance Criteria

- [ ] Simple resource supports CRUD operations automatically
- [ ] Simple pipeline handles common processing patterns
- [ ] Simple schema provides basic validation
- [ ] Enhancement path to standard Kairo is smooth
- [ ] Performance is within 5% of standard mode
- [ ] Documentation covers all simple mode features
- [ ] Examples demonstrate real-world usage
- [ ] IDE support provides helpful hints

---

**Next Document**: [Progressive Enhancement Specification](./PROGRESSIVE_ENHANCEMENT_SPEC.md)