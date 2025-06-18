# DATA Pillar - Methods Specification

> **Pareto-optimized API for essential data operations (10 core methods)**

## Core Philosophy

The DATA pillar provides **essential data operations** following 80/20 Pareto principle:
- ✅ Schema validation (native, fast)
- ✅ Data transformation and mapping
- ✅ Aggregation and analytics (major V2 value proposition)
- ✅ Serialization for data exchange
- ✅ Pure data operations only

## V2.0 Scope: 10 Core Methods

**80% Use Cases Covered by Core Methods:**
- `data.schema()` - Schema creation
- `data.validate()` - Data validation
- `data.transform()` - Data transformation
- `data.aggregate()` - Statistical operations ⭐ Major V2 feature
- `data.groupBy()` - Data grouping
- `data.serialize()` - Data export
- `data.deserialize()` - Data import
- `data.convert()` - Schema migration
- `data.clone()` - Deep copying
- `data.merge()` - Object merging

**V2.1+ Features:** Advanced analytics (`analyze()`, `sample()`, `pivot()`), data quality (`normalize()`, `diff()`), specialized utilities (`partial()`)

## Method Signatures

All DATA methods follow this pattern:
```typescript
data.method<TInput, TOutput>(
  input: TInput,
  config: MethodConfig,
  options?: DataOptions
): Result<DataError, TOutput>
```

## Schema & Validation Methods

### **`data.schema()`**
**Signature**:
```typescript
data.schema<T>(
  definition: SchemaDefinition<T>,
  options?: SchemaOptions
): Schema<T>
```

**Purpose**: Create native schema for validation

**Examples**:
```typescript
// Simple schema
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 150 }
})

// Complex schema with relationships
const OrderSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  customer: { type: 'object', schema: CustomerSchema },
  items: { type: 'array', items: OrderItemSchema },
  total: { type: 'number', computed: true }
}, {
  strict: true,
  timestamps: true
})
```

### **`data.validate()`**
**Signature**:
```typescript
data.validate<T>(
  input: unknown,
  schema: Schema<T>,
  options?: ValidationOptions
): Result<ValidationError, T>
```

**Purpose**: Validate data against schema

**Examples**:
```typescript
// Simple validation
const result = data.validate(userData, UserSchema)

// Comprehensive validation
const result = data.validate(complexData, ComplexSchema, {
  strict: false,
  coerce: true,
  collectErrors: true,
  stripUnknown: true,
  context: { userId: '123' }
})
```


## Transformation Methods

### **`data.transform()`**
**Signature**:
```typescript
data.transform<TInput, TOutput>(
  input: TInput,
  mapping: TransformMapping<TInput, TOutput>,
  options?: TransformOptions
): Result<TransformError, TOutput>
```

**Purpose**: Transform data structure according to mapping

**Examples**:
```typescript
// Simple field mapping
const normalized = data.transform(apiResponse, {
  id: 'user_id',
  name: 'full_name',
  email: 'email_address',
  createdAt: (input) => new Date(input.created_timestamp)
})

// Complex transformation
const enriched = data.transform(rawData, userTransformMapping, {
  strict: false,
  defaults: true,
  computed: true,
  context: { timezone: 'UTC' }
})
```


### **`data.convert()`**
**Signature**:
```typescript
data.convert<TInput, TOutput>(
  input: TInput,
  fromSchema: Schema<TInput>,
  toSchema: Schema<TOutput>,
  options?: ConvertOptions
): Result<DataError, TOutput>
```

**Purpose**: Convert between different data schemas

**Examples**:
```typescript
// API version migration
const v2Data = data.convert(v1Data, ApiV1Schema, ApiV2Schema, {
  strict: false,
  fillDefaults: true,
  migration: v1ToV2Migration
})
```

## Aggregation Methods (Major V2 Addition)

### **`data.aggregate()`**
**Signature**:
```typescript
data.aggregate<T, R = AggregateResult>(
  input: T[],
  operations: AggregateOperations,
  options?: AggregateOptions
): Result<DataError, R>
```

**Purpose**: Perform statistical operations on data collections

**Examples**:
```typescript
// Sales analytics
const salesStats = data.aggregate(salesData, {
  groupBy: ['region', 'quarter'],
  sum: ['revenue', 'units'],
  avg: ['orderValue', 'discount'],
  count: '*',
  min: ['orderDate'],
  max: ['orderDate']
})

// Custom aggregations
const insights = data.aggregate(userActivity, {
  groupBy: ['cohort'],
  custom: {
    retention: (group) => calculateRetention(group),
    ltv: (group) => calculateLifetimeValue(group)
  }
}, {
  parallel: true,
  cache: true
})
```

### **`data.groupBy()`**
**Signature**:
```typescript
data.groupBy<T, K extends keyof T>(
  input: T[],
  keys: K | K[] | ((item: T) => string),
  options?: GroupByOptions
): Result<DataError, Record<string, T[]>>
```

**Purpose**: Group data by specified criteria

**Examples**:
```typescript
// Simple grouping
const byStatus = data.groupBy(orders, 'status')

// Complex grouping
const grouped = data.groupBy(data, 
  (item) => `${item.category}-${item.region}`,
  {
    preserveOrder: true,
    includeEmpty: false
  }
)
```


## Serialization Methods

### **`data.serialize()`**
**Signature**:
```typescript
data.serialize<T>(
  input: T,
  format: SerializationFormat,
  options?: SerializeOptions
): Result<DataError, string | Buffer>
```

**Purpose**: Serialize data to various formats

**Examples**:
```typescript
// JSON serialization
const json = data.serialize(complexObject, 'json', {
  pretty: true,
  dateFormat: 'iso',
  excludePrivate: true
})

// CSV export
const csv = data.serialize(dataArray, 'csv', {
  headers: true,
  delimiter: ',',
  encoding: 'utf8'
})

// Binary formats
const protobuf = data.serialize(data, 'protobuf', { schema: ProtoSchema })
```

### **`data.deserialize()`**
**Signature**:
```typescript
data.deserialize<T>(
  input: string | Buffer,
  format: SerializationFormat,
  schema: Schema<T>,
  options?: DeserializeOptions
): Result<DataError, T>
```

**Purpose**: Deserialize data from various formats

**Examples**:
```typescript
// Parse and validate JSON
const parsed = data.deserialize(jsonString, 'json', UserSchema, {
  strict: true,
  coerce: false
})

// Import CSV
const imported = data.deserialize(csvData, 'csv', {
  headers: true,
  schema: RecordSchema,
  skipErrors: false
})
```


## Utility Methods

### **`data.clone()`**
**Signature**:
```typescript
data.clone<T>(
  input: T,
  options?: CloneOptions
): Result<DataError, T>
```

**Purpose**: Deep clone data structures

**Examples**:
```typescript
// Deep clone
const cloned = data.clone(complexObject, {
  deep: true,
  preservePrototype: false,
  handleCircular: true
})
```

### **`data.merge()`**
**Signature**:
```typescript
data.merge<T, U>(
  target: T,
  source: U,
  options?: MergeOptions
): Result<DataError, T & U>
```

**Purpose**: Merge multiple data objects

**Examples**:
```typescript
// Simple merge
const merged = data.merge(userBase, userExtended)

// Deep merge with conflict resolution
const combined = data.merge(config1, config2, {
  deep: true,
  strategy: 'source-wins',
  arrays: 'concat'
})
const changes = data.diff(originalUser, updatedUser, {
  deep: true,
  includeArrayIndices: true,
  ignoreOrder: false
})
```

### **`data.merge()`**
**Signature**:
```typescript
data.merge<T>(...inputs: T[], options?: MergeOptions): Result<DataError, T>
```

**Purpose**: Merge multiple data structures

**Examples**:
```typescript
// Deep merge
const merged = data.merge(baseConfig, userConfig, envConfig, {
  deep: true,
  arrayStrategy: 'concat',
  conflictResolver: 'lastWins'
})
```

## Method Categories

### **Schema & Validation (2 methods)**
- `schema()` - Create schemas
- `validate()` - Data validation

### **Transformation (2 methods)**
- `transform()` - Structure mapping
- `convert()` - Schema migration

### **Aggregation (2 methods)** ⭐ New in V2
- `aggregate()` - Statistical operations
- `groupBy()` - Data grouping

### **Serialization (2 methods)**
- `serialize()` - Export data
- `deserialize()` - Import data

### **Utilities (2 methods)**
- `clone()` - Deep copying
- `merge()` - Data merging

**Total: 10 methods** (Pareto-optimized data operations)

## Implementation Priorities

### **Phase 1 - Foundation (4 methods)**
- `schema()`, `validate()`, `transform()`, `convert()`
- Core data operations

### **Phase 2 - Aggregation (2 methods)** ⭐ Major V2 Feature
- `aggregate()`, `groupBy()`
- Analytics capabilities

### **Phase 3 - Serialization (2 methods)**
- `serialize()`, `deserialize()`
- Import/export functionality

### **Phase 4 - Utilities (2 methods)**
- `clone()`, `merge()`
- Essential utilities

---

**Next**: [Data Options](./data-options.md) - Configuration options for all methods