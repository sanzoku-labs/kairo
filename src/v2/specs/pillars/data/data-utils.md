# DATA Pillar - Function Utils Specification

> **Utility functions for DATA pillar method composition and data operations**

## Overview

DATA function utils provide convenience functions for data manipulation, validation, and transformation that can be used within DATA methods or independently. These utilities follow the four-layer architecture:

1. **Core Methods** (10) - Schema, validation, transformation, aggregation, serialization, utilities
2. **Configuration Objects** - Rich options for all data operations
3. **Public Utilities** (6) - Exposed helper functions for common data tasks
4. **Internal Utilities** - Private functions used by methods

## Public Utilities

### **Data Access & Manipulation**

#### **`data.get()`**
```typescript
data.get<T>(
  obj: Record<string, unknown>,
  path: string | string[]
): T | undefined
```

**Purpose**: Safely access nested object properties
**Usage**: Within data methods and user code

```typescript
// Used within data.transform()
const value = data.get(input, 'user.profile.email')

// User code
const email = data.get(userData, ['contact', 'email'])
const nested = data.get(response, 'data.items.0.name')
```

#### **`data.set()`**
```typescript
data.set<T>(
  obj: Record<string, unknown>,
  path: string | string[],
  value: T
): Record<string, unknown>
```

**Purpose**: Safely set nested object properties
**Usage**: Data transformation and manipulation

```typescript
// Used within data.transform()
const updated = data.set(target, 'user.lastLogin', new Date())

// User code - immutable updates
const newData = data.set(originalData, ['settings', 'theme'], 'dark')
```

#### **`data.has()`**
```typescript
data.has(
  obj: Record<string, unknown>,
  path: string | string[]
): boolean
```

**Purpose**: Check if nested property exists
**Usage**: Conditional data processing

```typescript
// Used within data.validate()
if (data.has(input, 'user.preferences.notifications')) {
  // Process notifications setting
}

// Guard clauses in transformations
const transform = (item) => ({
  id: data.get(item, 'id'),
  name: data.get(item, 'name'),
  email: data.has(item, 'contact.email') 
    ? data.get(item, 'contact.email')
    : null
})
```

### **Type & Schema Operations**

#### **`data.inferType()`**
```typescript
data.inferType(value: unknown): DataType
```

**Purpose**: Infer data type for schema generation
**Usage**: Schema inference and validation

```typescript
// Used within data.schema() for auto-inference
const type = data.inferType(sampleValue)
// Returns: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'null'

// User code - runtime type checking
const validateField = (value: unknown, expectedType: DataType) => {
  return data.inferType(value) === expectedType
}
```

#### **`data.isValid()`**
```typescript
data.isValid<T>(
  value: unknown,
  schema: Schema<T>
): boolean
```

**Purpose**: Quick validation check without full Result
**Usage**: Fast validation in conditionals

```typescript
// Used within data methods for quick checks
if (data.isValid(input, UserSchema)) {
  // Process valid data
}

// User code - filtering
const validItems = items.filter(item => data.isValid(item, ItemSchema))
```

### **Collection Operations**

#### **`data.flatten()`**
```typescript
data.flatten<T>(
  array: (T | T[])[],
  depth?: number
): T[]
```

**Purpose**: Flatten nested arrays
**Usage**: Data processing and transformation

```typescript
// Used within data.aggregate() for grouping
const allValues = data.flatten(groupedData.map(group => group.values))

// User code
const allTags = data.flatten(posts.map(post => post.tags))
const deeply = data.flatten(nestedArray, 2) // Flatten 2 levels deep
```

#### **`data.unique()`**
```typescript
data.unique<T>(
  array: T[],
  keyFn?: (item: T) => unknown
): T[]
```

**Purpose**: Remove duplicates from arrays
**Usage**: Data deduplication

```typescript
// Used within data.aggregate() for distinct counts
const uniqueUsers = data.unique(records, record => record.userId)

// User code
const uniqueEmails = data.unique(users.map(u => u.email))
const uniqueObjects = data.unique(items, item => item.id)
```

## Internal Utilities

These functions are used internally by DATA methods but not exposed to users:

### **Schema Processing**

#### **`normalizeSchema()`**
```typescript
normalizeSchema<T>(definition: SchemaDefinition<T>): NormalizedSchema<T>
```

**Purpose**: Convert user schema definitions to internal format
**Usage**: Schema compilation

#### **`compileValidator()`**
```typescript
compileValidator<T>(schema: NormalizedSchema<T>): ValidatorFunction<T>
```

**Purpose**: Compile schema into optimized validation function
**Usage**: Performance optimization

#### **`createTypeGuard()`**
```typescript
createTypeGuard<T>(schema: Schema<T>): (value: unknown) => value is T
```

**Purpose**: Generate TypeScript type guards from schemas
**Usage**: Type safety

### **Transformation Engine**

#### **`mapObject()`**
```typescript
mapObject<TInput, TOutput>(
  obj: TInput,
  mapping: TransformMapping<TInput, TOutput>,
  context: TransformContext
): TOutput
```

**Purpose**: Apply transformation mapping to objects
**Usage**: Core transformation logic

#### **`resolveTransform()`**
```typescript
resolveTransform(
  transform: TransformFunction | string,
  context: TransformContext
): TransformFunction
```

**Purpose**: Resolve transform definitions to executable functions
**Usage**: Transform compilation

### **Aggregation Engine**

#### **`createAggregator()`**
```typescript
createAggregator(operation: AggregateOperation): AggregatorFunction
```

**Purpose**: Create aggregation functions from operation definitions
**Usage**: Aggregation processing

#### **`groupByKey()`**
```typescript
groupByKey<T>(
  items: T[],
  keyFn: (item: T) => string,
  options: GroupOptions
): Record<string, T[]>
```

**Purpose**: Group data by computed keys
**Usage**: Internal grouping logic

### **Serialization Support**

#### **`detectFormat()`**
```typescript
detectFormat(input: string | Buffer): SerializationFormat
```

**Purpose**: Auto-detect serialization format
**Usage**: Smart deserialization

#### **`createSerializer()`**
```typescript
createSerializer(format: SerializationFormat): SerializerFunction
```

**Purpose**: Create format-specific serialization functions
**Usage**: Serialization processing

## Function Utils Usage Patterns

### **Within Data Methods**

```typescript
// Example: data.transform() implementation using utils
function transform<TInput, TOutput>(
  input: TInput,
  mapping: TransformMapping<TInput, TOutput>,
  options: TransformOptions = {}
): Result<TransformError, TOutput> {
  try {
    // Use internal utils
    const normalizedMapping = normalizeMapping(mapping)
    const context = createTransformContext(options)
    
    if (Array.isArray(input)) {
      return Result.ok(input.map(item => 
        // Use internal mapObject util
        mapObject(item, normalizedMapping, context)
      ))
    }
    
    // Use public utils for property access
    const result = Object.keys(normalizedMapping).reduce((acc, key) => {
      const transform = normalizedMapping[key]
      const sourceValue = data.get(input, transform.source || key)
      
      // Apply transformation
      const transformedValue = resolveTransform(transform.fn, context)(sourceValue)
      
      // Use data.set for nested properties
      return data.set(acc, key, transformedValue)
    }, {})
    
    return Result.ok(result as TOutput)
  } catch (error) {
    return Result.error(new TransformError(error.message))
  }
}
```

### **User Code Composition**

```typescript
// User leverages public utils for custom data processing
const processUserData = (users: User[]) => {
  // Use data utils for safe property access
  const activeUsers = users.filter(user => 
    data.has(user, 'profile.isActive') && 
    data.get(user, 'profile.isActive') === true
  )
  
  // Use unique() for deduplication
  const uniqueEmails = data.unique(
    activeUsers.map(user => data.get(user, 'contact.email')),
    email => email?.toLowerCase()
  )
  
  // Use flatten() for nested data
  const allPermissions = data.flatten(
    activeUsers.map(user => data.get(user, 'permissions') || [])
  )
  
  return {
    activeUsers,
    uniqueEmails,
    allPermissions: data.unique(allPermissions)
  }
}
```

### **Schema Building Patterns**

```typescript
// Dynamic schema creation using utils
const createDynamicSchema = (sampleData: unknown[]) => {
  const fields = {}
  
  // Sample first few items
  const sample = sampleData.slice(0, 100)
  
  // Infer field types
  const allKeys = data.unique(
    data.flatten(sample.map(item => Object.keys(item as any)))
  )
  
  allKeys.forEach(key => {
    const values = sample
      .map(item => data.get(item as any, key))
      .filter(val => val !== undefined)
    
    if (values.length > 0) {
      const type = data.inferType(values[0])
      const isRequired = values.length === sample.length
      
      fields[key] = {
        type,
        required: isRequired,
        nullable: values.some(v => v === null)
      }
    }
  })
  
  return data.schema(fields)
}
```

### **Transformation Helpers**

```typescript
// Common transformation utilities using data utils
const transformHelpers = {
  // Safely extract nested data
  extractNested: (source: unknown, paths: string[]) => {
    return paths.reduce((acc, path) => {
      const value = data.get(source as any, path)
      if (value !== undefined) {
        acc[path.split('.').pop()!] = value
      }
      return acc
    }, {} as any)
  },
  
  // Merge objects with conflict resolution
  mergeWithDefaults: (target: any, defaults: any) => {
    const result = { ...defaults }
    
    Object.keys(target).forEach(key => {
      if (data.has(target, key)) {
        result[key] = data.get(target, key)
      }
    })
    
    return result
  },
  
  // Validate and transform arrays
  processArray: <T>(items: unknown[], schema: Schema<T>) => {
    return items
      .filter(item => data.isValid(item, schema))
      .map(item => data.validate(item, schema))
      .filter(result => Result.isOk(result))
      .map(result => result.value)
  }
}
```

## Benefits

### **For METHOD Implementation**
- Consistent property access patterns
- Reusable type inference logic
- Safe data manipulation utilities
- Shared transformation helpers

### **For USER Code**
- Safe nested property access
- Reliable type checking utilities
- Collection manipulation helpers
- Schema building tools

### **For FRAMEWORK Design**
- Composable data operations
- Testable utility functions
- Performance optimizations
- Type-safe operations

## Implementation Priority

### **Phase 1: Core Utils**
- `get()`, `set()`, `has()`, `isValid()`
- Essential for safe data access

### **Phase 2: Collection Utils**
- `flatten()`, `unique()`, `inferType()`
- Enhanced data processing

### **Phase 3: Internal Utils**
- All internal utilities for method implementation
- Performance and optimization features

---

**Next**: [Pipeline Utils](../pipeline/pipeline-utils.md) - PIPELINE pillar function utilities