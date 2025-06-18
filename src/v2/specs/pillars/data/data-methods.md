# DATA Pillar - Methods Specification

> **Complete API for data validation, transformation, and processing**

## Core Philosophy

The DATA pillar provides **comprehensive data operations** for the complete data lifecycle:
- ✅ Schema validation (native, fast)
- ✅ Data transformation and mapping
- ✅ Aggregation and analytics (major gap in V1)
- ✅ Serialization and normalization
- ✅ Pure data operations only

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

### **`data.partial()`**
**Signature**:
```typescript
data.partial<T>(
  input: Partial<T>,
  schema: Schema<T>,
  options?: PartialValidationOptions
): Result<ValidationError, Partial<T>>
```

**Purpose**: Validate partial data (for updates)

**Examples**:
```typescript
// Partial validation for updates
const updateResult = data.partial(
  { email: 'new@email.com' },
  UserSchema,
  { allowEmpty: false }
)
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

### **`data.normalize()`**
**Signature**:
```typescript
data.normalize<T>(
  input: T,
  strategy: NormalizationStrategy,
  options?: NormalizeOptions
): Result<DataError, T>
```

**Purpose**: Normalize data format and structure

**Examples**:
```typescript
// Standard normalization
const clean = data.normalize(messyData, 'standard', {
  trimStrings: true,
  removeNulls: true,
  convertDates: true,
  camelCase: true
})

// Custom normalization
const normalized = data.normalize(data, {
  fields: {
    email: 'lowercase',
    phone: 'removeSpaces',
    name: 'titleCase'
  },
  removeEmpty: true,
  sortKeys: true
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

### **`data.pivot()`**
**Signature**:
```typescript
data.pivot<T>(
  input: T[],
  config: PivotConfig<T>,
  options?: PivotOptions
): Result<DataError, PivotResult>
```

**Purpose**: Create pivot tables from data

**Examples**:
```typescript
// Sales pivot table
const pivoted = data.pivot(salesData, {
  rows: ['region', 'salesperson'],
  columns: ['quarter'],
  values: 'revenue',
  aggregation: 'sum'
})
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

## Analysis Methods

### **`data.analyze()`**
**Signature**:
```typescript
data.analyze<T>(
  input: T[],
  fields?: (keyof T)[],
  options?: AnalyzeOptions
): Result<DataError, DataAnalysis<T>>
```

**Purpose**: Analyze data structure and quality

**Examples**:
```typescript
// Data profiling
const analysis = data.analyze(dataset, ['age', 'income', 'region'], {
  includeDistribution: true,
  detectOutliers: true,
  calculateCorrelations: true
})

// Result includes:
// - Field types and formats
// - Null/empty counts
// - Value distributions
// - Statistical summaries
// - Data quality metrics
```

### **`data.sample()`**
**Signature**:
```typescript
data.sample<T>(
  input: T[],
  config: SampleConfig,
  options?: SampleOptions
): Result<DataError, T[]>
```

**Purpose**: Extract representative data samples

**Examples**:
```typescript
// Random sampling
const sample = data.sample(largeDataset, {
  size: 1000,
  method: 'random',
  seed: 42
})

// Stratified sampling
const stratified = data.sample(dataset, {
  size: 500,
  method: 'stratified',
  stratifyBy: 'category',
  proportional: true
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

### **`data.diff()`**
**Signature**:
```typescript
data.diff<T>(
  original: T,
  modified: T,
  options?: DiffOptions
): Result<DataError, DataDiff<T>>
```

**Purpose**: Compare data structures and find differences

**Examples**:
```typescript
// Data comparison
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

### **Schema & Validation (3 methods)**
- `schema()` - Create schemas
- `validate()` - Full validation
- `partial()` - Partial validation

### **Transformation (3 methods)**
- `transform()` - Structure mapping
- `normalize()` - Data cleanup
- `convert()` - Schema migration

### **Aggregation (3 methods)** ⭐ New in V2
- `aggregate()` - Statistical operations
- `groupBy()` - Data grouping
- `pivot()` - Pivot tables

### **Serialization (2 methods)**
- `serialize()` - Export data
- `deserialize()` - Import data

### **Analysis (2 methods)** ⭐ New in V2
- `analyze()` - Data profiling
- `sample()` - Data sampling

### **Utilities (3 methods)**
- `clone()` - Deep copying
- `diff()` - Change detection
- `merge()` - Data merging

**Total: 16 methods** (comprehensive data operations)

## Implementation Priorities

### **Phase 1 - Foundation (6 methods)**
- `schema()`, `validate()`, `partial()`
- `transform()`, `normalize()`, `convert()`
- Core data operations

### **Phase 2 - Aggregation (3 methods)** ⭐ Major V2 Feature
- `aggregate()`, `groupBy()`, `pivot()`
- Analytics and reporting capabilities

### **Phase 3 - Serialization (2 methods)**
- `serialize()`, `deserialize()`
- Import/export functionality

### **Phase 4 - Advanced (5 methods)**
- `analyze()`, `sample()`, `clone()`, `diff()`, `merge()`
- Advanced data operations

---

**Next**: [Data Options](./data-options.md) - Configuration options for all methods