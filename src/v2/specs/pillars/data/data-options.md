# DATA Pillar Options

> **Comprehensive configuration options for Kairo V2's DATA pillar operations**

## Overview

The DATA pillar provides extensive configuration options for validation, transformation, aggregation, and analysis operations. This document details all available options, their behaviors, and usage patterns.

## Base Data Options

### **Core Configuration**
```typescript
interface DataOptions {
  // Execution control
  async?: boolean          // Force async execution for large datasets
  timeout?: number         // Operation timeout in milliseconds
  
  // Error handling
  fallback?: unknown       // Fallback value on validation error
  continueOnError?: boolean // Continue processing partial data
  
  // Performance
  chunk?: number           // Process in chunks (for large datasets)
  parallel?: boolean       // Enable parallel processing
  memory?: 'low' | 'normal' | 'high' // Memory usage strategy
  
  // Debugging
  debug?: boolean          // Enable debug mode
  trace?: string          // Tracing identifier
}
```

## Validation Options

### **ValidationOptions**
```typescript
interface ValidationOptions extends DataOptions {
  // Validation behavior
  strict?: boolean         // Strict validation mode (no extra properties)
  partial?: boolean        // Allow partial objects (missing required fields)
  coerce?: boolean        // Enable type coercion (string -> number, etc.)
  stripUnknown?: boolean  // Remove unknown properties
  abortEarly?: boolean    // Stop on first validation error
  
  // Field-specific behavior
  allowNull?: boolean     // Allow null values for optional fields
  allowUndefined?: boolean // Allow undefined values
  trimStrings?: boolean   // Trim whitespace from strings
  
  // Custom validation
  customValidators?: Record<string, (value: unknown) => boolean>
  
  // Error formatting
  includeValue?: boolean  // Include actual values in error messages
  maxErrors?: number      // Maximum number of errors to collect
}

// Usage examples
const validationExamples = {
  // Strict validation
  strict: () => data.validate(input, UserSchema, {
    strict: true,
    stripUnknown: true,
    abortEarly: true
  }),
  
  // Lenient validation with coercion
  lenient: () => data.validate(input, UserSchema, {
    strict: false,
    coerce: true,
    allowNull: true,
    trimStrings: true
  }),
  
  // Partial validation for updates
  partial: () => data.validate(updateData, UserSchema, {
    partial: true,
    stripUnknown: true,
    continueOnError: false
  })
}
```

### **Schema-Specific Options**
```typescript
interface SchemaOptions {
  // String validation
  string?: {
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    format?: 'email' | 'url' | 'uuid' | 'date' | 'phone'
    transform?: 'lowercase' | 'uppercase' | 'trim'
  }
  
  // Number validation
  number?: {
    min?: number
    max?: number
    integer?: boolean
    positive?: boolean
    negative?: boolean
    multipleOf?: number
  }
  
  // Array validation
  array?: {
    minItems?: number
    maxItems?: number
    uniqueItems?: boolean
    sorted?: boolean
    itemValidation?: 'all' | 'any' | 'first'
  }
  
  // Object validation
  object?: {
    additionalProperties?: boolean
    requiredProperties?: string[]
    dependentProperties?: Record<string, string[]>
  }
  
  // Date validation
  date?: {
    min?: Date
    max?: Date
    format?: string
    timezone?: string
  }
}
```

## Transformation Options

### **TransformOptions**
```typescript
interface TransformOptions extends DataOptions {
  // Transformation behavior
  preserveOriginal?: boolean // Keep original structure alongside transformed
  deepTransform?: boolean   // Transform nested objects recursively
  transformArrays?: boolean // Transform array items individually
  
  // Type transformations
  dateTransform?: {
    parseStrings?: boolean  // Parse date strings to Date objects
    format?: string        // Expected date format
    timezone?: string      // Source timezone
    outputTimezone?: string // Target timezone
  }
  
  numberTransform?: {
    parseStrings?: boolean // Parse numeric strings
    currency?: boolean     // Parse currency strings ($1,234.56)
    percentage?: boolean   // Parse percentage strings (50%)
  }
  
  stringTransform?: {
    trim?: boolean         // Trim whitespace
    normalize?: boolean    // Unicode normalization
    case?: 'lower' | 'upper' | 'title' | 'camel' | 'snake'
  }
  
  // Custom transformations
  customTransforms?: Record<string, (value: unknown, path: string[]) => unknown>
  
  // Error handling
  skipInvalidFields?: boolean // Skip fields that can't be transformed
  defaultValues?: Record<string, unknown> // Default values for failed transformations
}

// Usage examples
const transformExamples = {
  // Basic transformation
  basic: () => data.transform(rawData, TargetSchema, {
    dateTransform: { parseStrings: true },
    numberTransform: { parseStrings: true, currency: true },
    stringTransform: { trim: true, case: 'lower' }
  }),
  
  // Deep transformation with custom logic
  advanced: () => data.transform(complexData, ComplexSchema, {
    deepTransform: true,
    transformArrays: true,
    customTransforms: {
      fullName: (person) => `${person.firstName} ${person.lastName}`,
      ageGroup: (age) => age < 18 ? 'minor' : age < 65 ? 'adult' : 'senior'
    },
    defaultValues: {
      status: 'unknown',
      category: 'uncategorized'
    }
  })
}
```

## Aggregation Options

### **AggregationOptions**
```typescript
interface AggregationOptions extends DataOptions {
  // Grouping configuration
  groupBy?: string[] | ((item: any) => string)
  
  // Aggregation operations
  sum?: string[]           // Fields to sum
  avg?: string[]           // Fields to average
  min?: string[]           // Fields to find minimum
  max?: string[]           // Fields to find maximum
  count?: string[] | boolean // Fields to count (true for record count)
  distinct?: string[]      // Count distinct values
  
  // Statistical operations
  statistics?: {
    mean?: string[]
    median?: string[]
    mode?: string[]
    standardDeviation?: string[]
    variance?: string[]
    percentiles?: { field: string; percentiles: number[] }[]
  }
  
  // Custom aggregations
  custom?: Record<string, (group: any[]) => any>
  
  // Output formatting
  format?: {
    numbers?: {
      decimals?: number
      currency?: boolean
      percentage?: boolean
    }
    dates?: {
      format?: string
      timezone?: string
    }
    strings?: {
      case?: 'lower' | 'upper' | 'title'
      maxLength?: number
    }
  }
  
  // Filtering and sorting
  having?: (group: any) => boolean  // Filter groups after aggregation
  sort?: Array<{
    field: string
    direction: 'asc' | 'desc'
    type?: 'string' | 'number' | 'date'
  }>
  limit?: number           // Limit number of groups
  offset?: number          // Skip number of groups
  
  // Performance optimization
  lazy?: boolean           // Lazy evaluation for large datasets
  streaming?: boolean      // Stream results for very large datasets
}

// Usage examples
const aggregationExamples = {
  // Sales analysis
  salesAnalysis: () => data.aggregate(salesData, {
    groupBy: ['region', 'quarter'],
    sum: ['revenue', 'profit'],
    avg: ['orderValue', 'margin'],
    count: true,
    distinct: ['customerId'],
    custom: {
      conversionRate: (group) => 
        group.reduce((sum, item) => sum + item.conversions, 0) / 
        group.reduce((sum, item) => sum + item.visits, 0)
    },
    sort: [
      { field: 'revenue', direction: 'desc' },
      { field: 'region', direction: 'asc' }
    ],
    limit: 100
  }),
  
  // Statistical analysis
  statistics: () => data.aggregate(userData, {
    groupBy: ['department'],
    statistics: {
      mean: ['salary', 'experience'],
      median: ['salary'],
      standardDeviation: ['salary'],
      percentiles: [
        { field: 'salary', percentiles: [25, 50, 75, 90, 95] }
      ]
    },
    format: {
      numbers: { decimals: 2, currency: true }
    }
  })
}
```

### **PivotOptions**
```typescript
interface PivotOptions extends DataOptions {
  // Pivot configuration
  rows: string[]           // Row dimension fields
  columns: string[]        // Column dimension fields
  values: string[]         // Value fields to aggregate
  
  // Aggregation functions for values
  aggregationFunction?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last'
  
  // Output formatting
  fillValue?: any          // Value for empty cells
  includeSubtotals?: boolean // Include subtotal rows/columns
  includeGrandTotal?: boolean // Include grand total
  
  // Sorting
  sortRows?: boolean | 'asc' | 'desc'
  sortColumns?: boolean | 'asc' | 'desc'
  
  // Filtering
  rowFilter?: (rowData: any) => boolean
  columnFilter?: (columnData: any) => boolean
  
  // Advanced options
  maxRows?: number         // Limit number of rows
  maxColumns?: number      // Limit number of columns
  sparse?: boolean         // Use sparse representation for large tables
}
```

## Analysis Options

### **AnalysisOptions**
```typescript
interface AnalysisOptions extends DataOptions {
  // Analysis types
  schema?: boolean         // Infer schema from data
  statistics?: boolean     // Calculate statistical measures
  quality?: boolean        // Data quality assessment
  patterns?: boolean       // Pattern detection
  relationships?: boolean  // Relationship analysis
  
  // Schema inference
  schemaInference?: {
    sampleSize?: number    // Number of records to sample
    confidence?: number    // Confidence threshold (0-1)
    strictTypes?: boolean  // Strict type inference
    includeOptional?: boolean // Mark optional fields
  }
  
  // Statistical analysis
  statisticalAnalysis?: {
    distribution?: boolean // Distribution analysis
    correlation?: boolean  // Correlation matrix
    outliers?: boolean     // Outlier detection
    trends?: boolean       // Trend analysis
  }
  
  // Quality assessment
  qualityAssessment?: {
    completeness?: boolean // Missing value analysis
    uniqueness?: boolean   // Duplicate detection
    validity?: boolean     // Format validation
    consistency?: boolean  // Consistency checks
  }
  
  // Pattern detection
  patternDetection?: {
    commonValues?: boolean // Most common values
    valueDistribution?: boolean // Value distribution
    formatPatterns?: boolean // Format patterns
    temporalPatterns?: boolean // Time-based patterns
  }
  
  // Output control
  includeExamples?: boolean // Include example values
  maxExamples?: number     // Maximum examples per field
  includeHistograms?: boolean // Include value histograms
}

// Usage examples
const analysisExamples = {
  // Full analysis
  comprehensive: () => data.analyze(dataset, {
    schema: true,
    statistics: true,
    quality: true,
    patterns: true,
    schemaInference: {
      sampleSize: 10000,
      confidence: 0.95,
      strictTypes: true
    },
    qualityAssessment: {
      completeness: true,
      uniqueness: true,
      validity: true
    },
    includeExamples: true,
    maxExamples: 5
  }),
  
  // Quick schema inference
  quickSchema: () => data.analyze(dataset, {
    schema: true,
    schemaInference: {
      sampleSize: 1000,
      confidence: 0.8
    }
  }),
  
  // Data quality focus
  qualityFocus: () => data.analyze(dataset, {
    quality: true,
    qualityAssessment: {
      completeness: true,
      uniqueness: true,
      validity: true,
      consistency: true
    }
  })
}
```

## Serialization Options

### **SerializationOptions**
```typescript
interface SerializationOptions extends DataOptions {
  // Format-specific options
  json?: {
    pretty?: boolean       // Pretty-print JSON
    indent?: number        // Indentation size
    replacer?: (key: string, value: any) => any
  }
  
  csv?: {
    delimiter?: string     // Field delimiter (default: ',')
    quote?: string         // Quote character (default: '"')
    escape?: string        // Escape character
    header?: boolean       // Include header row
    encoding?: string      // File encoding
  }
  
  xml?: {
    rootElement?: string   // Root element name
    itemElement?: string   // Array item element name
    attributes?: boolean   // Use attributes vs elements
    pretty?: boolean       // Pretty-print XML
    declaration?: boolean  // Include XML declaration
  }
  
  // Data transformation before serialization
  transform?: {
    dates?: 'iso' | 'unix' | 'local' | ((date: Date) => string)
    numbers?: 'string' | 'float' | 'int'
    booleans?: 'string' | 'number' | 'boolean'
    nulls?: 'null' | 'empty' | 'skip'
  }
  
  // Field control
  include?: string[]       // Only include these fields
  exclude?: string[]       // Exclude these fields
  rename?: Record<string, string> // Rename fields
}

// Usage examples
const serializationExamples = {
  // JSON with formatting
  prettyJson: () => data.serialize(userData, 'json', {
    json: {
      pretty: true,
      indent: 2,
      replacer: (key, value) => key === 'password' ? '[HIDDEN]' : value
    },
    exclude: ['internalId', 'metadata']
  }),
  
  // CSV for Excel
  excelCsv: () => data.serialize(reportData, 'csv', {
    csv: {
      delimiter: ',',
      header: true,
      encoding: 'utf-8-bom'
    },
    transform: {
      dates: 'local',
      numbers: 'string'
    }
  }),
  
  // XML with attributes
  xmlWithAttributes: () => data.serialize(configData, 'xml', {
    xml: {
      rootElement: 'configuration',
      itemElement: 'item',
      attributes: true,
      pretty: true
    }
  })
}
```

## Performance Options

### **PerformanceOptions**
```typescript
interface PerformanceOptions {
  // Memory management
  memory?: {
    strategy: 'low' | 'normal' | 'high'
    maxHeapUsage?: number  // Maximum heap usage in MB
    gcThreshold?: number   // GC threshold
  }
  
  // Processing strategy
  processing?: {
    batch?: {
      size: number         // Items per batch
      delay?: number       // Delay between batches (ms)
    }
    streaming?: {
      enabled: boolean
      highWaterMark?: number
      objectMode?: boolean
    }
    parallel?: {
      enabled: boolean
      maxWorkers?: number
      chunkSize?: number
    }
  }
  
  // Caching
  cache?: {
    enabled: boolean
    ttl?: number          // Cache TTL in milliseconds
    maxSize?: number      // Maximum cache entries
    strategy?: 'lru' | 'fifo' | 'lfu'
  }
  
  // Optimization hints
  optimization?: {
    assumeValid?: boolean  // Skip validation for known-good data
    reuseObjects?: boolean // Reuse object instances
    lazyEvaluation?: boolean // Lazy evaluation where possible
  }
}
```

## Option Composition and Inheritance

### **Option Merging**
```typescript
// Base configuration for all data operations
const baseDataConfig: Partial<DataOptions> = {
  debug: process.env.NODE_ENV === 'development',
  timeout: 30000,
  memory: 'normal'
}

// Specific configurations
const validationConfig: Partial<ValidationOptions> = {
  ...baseDataConfig,
  strict: true,
  stripUnknown: true,
  coerce: false
}

const transformConfig: Partial<TransformOptions> = {
  ...baseDataConfig,
  deepTransform: true,
  dateTransform: { parseStrings: true },
  stringTransform: { trim: true }
}

// Usage with merged configurations
const result = data.validate(input, schema, {
  ...validationConfig,
  partial: true  // Override specific option
})
```

### **Environment-Based Configuration**
```typescript
// Different configurations for different environments
const getDataOptions = (env: 'development' | 'staging' | 'production'): DataOptions => {
  const base = {
    timeout: 30000,
    continueOnError: false
  }
  
  switch (env) {
    case 'development':
      return {
        ...base,
        debug: true,
        trace: 'dev-trace',
        memory: 'normal',
        includeValue: true
      }
      
    case 'staging':
      return {
        ...base,
        debug: false,
        memory: 'normal',
        maxErrors: 10
      }
      
    case 'production':
      return {
        ...base,
        debug: false,
        memory: 'high',
        maxErrors: 1,
        abortEarly: true
      }
  }
}
```

## Best Practices

### **1. Progressive Enhancement**
```typescript
// ✅ Good: Start simple, add options as needed
const basic = data.validate(input, schema)

const withOptions = data.validate(input, schema, {
  strict: true,
  coerce: false
})

const advanced = data.validate(input, schema, {
  strict: true,
  coerce: false,
  customValidators: {
    businessRule: validateBusinessRule
  },
  timeout: 10000
})
```

### **2. Environment-Appropriate Configuration**
```typescript
// ✅ Good: Adjust options based on environment
const options = {
  debug: process.env.NODE_ENV === 'development',
  memory: process.env.NODE_ENV === 'production' ? 'high' : 'normal',
  timeout: process.env.NODE_ENV === 'test' ? 1000 : 30000
}
```

### **3. Option Validation**
```typescript
// ✅ Good: Validate option combinations
const validateOptions = (options: DataOptions): void => {
  if (options.parallel && options.chunk && options.chunk < 100) {
    console.warn('Small chunk size with parallel processing may reduce performance')
  }
  
  if (options.memory === 'low' && options.parallel) {
    console.warn('Parallel processing with low memory strategy may cause issues')
  }
}
```

---

**Next**: See [DATA Utilities](./data-utilities.md) for helper functions and advanced data operations.