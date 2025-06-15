# Transform API

The Transform API is a powerful component of Kairo's **DATA Pillar** - providing declarative data mapping, conversion, and enrichment with built-in type safety and Result pattern integration.

## Overview

- **🔀 Declarative Mapping** - Field-to-field mapping with automatic type inference
- **🧮 Computed Fields** - Dynamic field generation from source data
- **🔍 Data Filtering** - Conditional data processing with predicates
- **🛡️ Type Safety** - Full TypeScript inference throughout transformations
- **🔄 Result Pattern** - Predictable error handling without exceptions
- **⚡ Pipeline Integration** - Seamless integration with Kairo's pipeline system

## Creating Transforms

### Basic Transform Definition

```typescript
import { transform, nativeSchema } from 'kairo'

// Define source and target schemas
const APIUserSchema = nativeSchema.object({
  user_id: nativeSchema.string().uuid(),
  user_name: nativeSchema.string().min(2).max(100),
  user_email: nativeSchema.string().email(),
  birth_date: nativeSchema.string().datetime(),
  is_active: nativeSchema.boolean(),
  profile_picture: nativeSchema.string().url().optional(),
  created_at: nativeSchema.string().datetime(),
  updated_at: nativeSchema.string().datetime().optional(),
})

const InternalUserSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(2).max(100),
  email: nativeSchema.string().email(),
  age: nativeSchema.number().min(0).max(150),
  active: nativeSchema.boolean(),
  avatar: nativeSchema.string().url().optional(),
  displayName: nativeSchema.string(),
  slug: nativeSchema.string(),
  createdAt: nativeSchema.string().datetime(),
  updatedAt: nativeSchema.string().datetime().optional(),
})

// Declarative transform definition
const userTransform = transform('user-normalization', APIUserSchema)
  .to(InternalUserSchema)
  .map('user_id', 'id')
  .map('user_name', 'name')
  .map('user_email', 'email')
  .map('birth_date', 'age', source => {
    const birthYear = new Date(source.birth_date).getFullYear()
    return new Date().getFullYear() - birthYear
  })
  .map('is_active', 'active')
  .map('profile_picture', 'avatar')
  .map('created_at', 'createdAt')
  .map('updated_at', 'updatedAt')
  .compute('displayName', source => `${source.user_name} <${source.user_email}>`)
  .compute('slug', source => slugify(source.user_name))
  .filter(source => source.is_active === true)
  .validate()
```

### Complex Nested Object Transformations

```typescript
const OrderAPISchema = nativeSchema.object({
  order_id: nativeSchema.string().uuid(),
  customer_info: nativeSchema.object({
    cust_id: nativeSchema.string().uuid(),
    first_name: nativeSchema.string(),
    last_name: nativeSchema.string(),
    email_address: nativeSchema.string().email(),
    contact: nativeSchema.object({
      phone_number: nativeSchema.string(),
      address: nativeSchema.object({
        street_address: nativeSchema.string(),
        city_name: nativeSchema.string(),
        state_code: nativeSchema.string(),
        postal_code: nativeSchema.string(),
        country_code: nativeSchema.string(),
      }),
    }),
  }),
  line_items: nativeSchema.array(
    nativeSchema.object({
      sku: nativeSchema.string(),
      product_name: nativeSchema.string(),
      quantity_ordered: nativeSchema.number().positive(),
      unit_price: nativeSchema.number().positive(),
      discount_percent: nativeSchema.number().min(0).max(100).optional(),
    })
  ),
  order_status: nativeSchema.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] as const),
  order_timestamp: nativeSchema.string().datetime(),
})

const InternalOrderSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  customer: nativeSchema.object({
    id: nativeSchema.string().uuid(),
    name: nativeSchema.string(),
    email: nativeSchema.string().email(),
    phone: nativeSchema.string(),
    address: nativeSchema.object({
      street: nativeSchema.string(),
      city: nativeSchema.string(),
      state: nativeSchema.string(),
      zipCode: nativeSchema.string(),
      country: nativeSchema.string(),
    }),
  }),
  items: nativeSchema.array(
    nativeSchema.object({
      productId: nativeSchema.string(),
      name: nativeSchema.string(),
      quantity: nativeSchema.number().positive(),
      unitPrice: nativeSchema.number().positive(),
      discount: nativeSchema.number().min(0).max(1).optional(),
      totalPrice: nativeSchema.number().positive(),
    })
  ),
  status: nativeSchema.enum(['pending', 'confirmed', 'shipped', 'delivered'] as const),
  subtotal: nativeSchema.number().positive(),
  totalDiscount: nativeSchema.number().min(0),
  finalTotal: nativeSchema.number().positive(),
  createdAt: nativeSchema.string().datetime(),
})

const orderTransform = transform('order-normalization', OrderAPISchema)
  .to(InternalOrderSchema)
  .map('order_id', 'id')
  .compute('customer', source => ({
    id: source.customer_info.cust_id,
    name: `${source.customer_info.first_name} ${source.customer_info.last_name}`,
    email: source.customer_info.email_address,
    phone: source.customer_info.contact.phone_number,
    address: {
      street: source.customer_info.contact.address.street_address,
      city: source.customer_info.contact.address.city_name,
      state: source.customer_info.contact.address.state_code,
      zipCode: source.customer_info.contact.address.postal_code,
      country: source.customer_info.contact.address.country_code,
    },
  }))
  .map('line_items', 'items', source =>
    source.line_items.map(item => ({
      productId: item.sku,
      name: item.product_name,
      quantity: item.quantity_ordered,
      unitPrice: item.unit_price,
      discount: item.discount_percent ? item.discount_percent / 100 : undefined,
      totalPrice:
        item.quantity_ordered * item.unit_price * (1 - (item.discount_percent || 0) / 100),
    }))
  )
  .map('order_status', 'status', source => source.order_status.toLowerCase() as any)
  .compute('subtotal', source =>
    source.line_items.reduce((sum, item) => sum + item.quantity_ordered * item.unit_price, 0)
  )
  .compute('totalDiscount', source =>
    source.line_items.reduce((sum, item) => {
      if (item.discount_percent) {
        return sum + (item.quantity_ordered * item.unit_price * item.discount_percent) / 100
      }
      return sum
    }, 0)
  )
  .compute('finalTotal', source => {
    const subtotal = source.line_items.reduce(
      (sum, item) => sum + item.quantity_ordered * item.unit_price,
      0
    )
    const discount = source.line_items.reduce((sum, item) => {
      if (item.discount_percent) {
        return sum + (item.quantity_ordered * item.unit_price * item.discount_percent) / 100
      }
      return sum
    }, 0)
    return subtotal - discount
  })
  .map('order_timestamp', 'createdAt')
  .filter(source => source.line_items.length > 0)
  .validate()
```

## Transform Operations and Methods

### Field Mapping Operations

```typescript
// Simple field mapping
.map('source_field', 'target_field')

// Field mapping with type conversion
.map('price_string', 'price', source => parseFloat(source.price_string))

// Nested field extraction
.map('user.profile.contact.email', 'email')

// Complex field transformation
.map('timestamp', 'formattedDate', source => {
  const date = new Date(source.timestamp)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

// Conditional field mapping
.map('status_code', 'status', source => {
  switch (source.status_code) {
    case 0: return 'inactive'
    case 1: return 'active'
    case 2: return 'pending'
    default: return 'unknown'
  }
})

// Array field transformation
.map('tag_list', 'tags', source =>
  source.tag_list.split(',').map(tag => tag.trim()).filter(Boolean)
)
```

### Computed Field Generation

```typescript
// Simple computed fields
.compute('fullName', source => `${source.firstName} ${source.lastName}`)
.compute('isAdult', source => source.age >= 18)
.compute('initials', source =>
  source.name.split(' ').map(part => part.charAt(0).toUpperCase()).join('')
)

// Complex computed fields with business logic
.compute('membershipTier', source => {
  const totalSpent = source.orders.reduce((sum, order) => sum + order.total, 0)
  if (totalSpent >= 10000) return 'platinum'
  if (totalSpent >= 5000) return 'gold'
  if (totalSpent >= 1000) return 'silver'
  return 'bronze'
})

// Computed fields with external data (async operations handled in pipeline)
.compute('creditScore', source => {
  // Note: Async operations should be handled in pipeline steps
  return source.creditScoreCache || 'pending'
})

// Computed fields with date/time calculations
.compute('daysSinceRegistration', source => {
  const registrationDate = new Date(source.registeredAt)
  const now = new Date()
  return Math.floor((now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24))
})

// Computed fields with aggregations
.compute('orderSummary', source => ({
  totalOrders: source.orders.length,
  totalSpent: source.orders.reduce((sum, order) => sum + order.total, 0),
  averageOrderValue: source.orders.length > 0
    ? source.orders.reduce((sum, order) => sum + order.total, 0) / source.orders.length
    : 0,
  lastOrderDate: source.orders.length > 0
    ? Math.max(...source.orders.map(order => new Date(order.createdAt).getTime()))
    : null,
}))
```

### Data Filtering

```typescript
// Simple boolean filters
.filter(source => source.isActive)
.filter(source => source.age >= 18)

// Complex conditional filters
.filter(source => {
  // Only process orders with valid items
  return source.items.length > 0 && source.items.every(item => item.price > 0)
})

// Date-based filters
.filter(source => {
  const createdDate = new Date(source.createdAt)
  const cutoffDate = new Date('2024-01-01')
  return createdDate >= cutoffDate
})

// String-based filters
.filter(source => {
  // Only process users with corporate email addresses
  return source.email.endsWith('@company.com') || source.email.endsWith('@enterprise.com')
})

// Multiple condition filters
.filter(source => {
  return source.status === 'active' &&
         source.verified === true &&
         source.orders.length > 0 &&
         source.lastLoginAt &&
         new Date(source.lastLoginAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
})

// Business rule filters
.filter(source => {
  // Only process high-value customers
  const totalValue = source.orders.reduce((sum, order) => sum + order.total, 0)
  return totalValue >= 1000 && source.memberSince &&
         new Date(source.memberSince) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Member for over a year
})
```

### Validation and Error Handling

```typescript
// Enable validation against target schema
.validate()

// Custom validation with detailed error messages
.validate({
  strict: true,
  errorMessage: 'Order validation failed',
  onError: (error, source) => {
    console.error(`Validation failed for order ${source.order_id}:`, error.message)
  },
})
```

## Transform Execution

### Single Item Transformation

```typescript
// Execute transform on single data item
const singleUserResult = await userTransform.execute(apiUserData)

singleUserResult.match({
  Ok: user => {
    // user is fully typed as InternalUser
    console.log('Transformed user:', user.displayName)
    console.log('Age:', user.age)
    console.log('Active:', user.active)
  },
  Err: error => {
    // Handle structured error information
    switch (error.code) {
      case 'VALIDATION_ERROR':
        console.log('Validation failed:', error.field, error.message)
        console.log('Expected:', error.expected)
        console.log('Received:', error.received)
        break
      case 'TRANSFORM_ERROR':
        console.log('Transform failed:', error.operation, error.message)
        console.log('Source value:', error.sourceValue)
        break
      case 'FILTER_ERROR':
        console.log('Filter rejected data:', error.message)
        break
      default:
        console.log('Unexpected error:', error.message)
    }
  },
})
```

### Batch Transformation

```typescript
// Execute transform on array of data items
const batchResult = await userTransform.executeMany(apiUsersArray)

batchResult.match({
  Ok: users => {
    console.log(`Successfully transformed ${users.length} users`)
    users.forEach(user => {
      console.log(`User: ${user.displayName} (${user.age} years old)`)
    })
  },
  Err: error => {
    console.error('Batch transform failed:', error.message)
    if (error.code === 'PARTIAL_FAILURE') {
      console.log(`Failed items: ${error.failedIndices.length}`)
      error.failures.forEach((failure, index) => {
        console.log(`Item ${error.failedIndices[index]}: ${failure.message}`)
      })
    }
  },
})

// Batch transform with error tolerance
const tolerantBatchResult = await userTransform.executeMany(apiUsersArray, {
  continueOnError: true,
  maxErrors: 10,
})

tolerantBatchResult.match({
  Ok: ({ successful, failed }) => {
    console.log(`Processed ${successful.length} items successfully`)
    console.log(`Failed to process ${failed.length} items`)

    failed.forEach(({ index, error }) => {
      console.log(`Item ${index} failed: ${error.message}`)
    })
  },
  Err: error => {
    console.error('Batch transform completely failed:', error.message)
  },
})
```

## Transform Composition and Chaining

### Pipeline Method Chaining

```typescript
// Chain multiple transforms together
const apiToInternalTransform = transform('api-to-internal', APIUserSchema)
  .to(InternalUserSchema)
  .map('user_id', 'id')
  .map('user_name', 'name')
  .validate()

const internalToDisplayTransform = transform('internal-to-display', InternalUserSchema)
  .to(DisplayUserSchema)
  .map('id', 'userId')
  .map('name', 'displayName')
  .compute('avatar', user => user.avatar || '/default-avatar.png')
  .validate()

// Compose transforms using pipe()
const fullTransform = apiToInternalTransform.pipe(internalToDisplayTransform)

// Execute composed transform
const result = await fullTransform.execute(apiUserData)
```

### Conditional Transform Chains

```typescript
// Different transform paths based on data
const dynamicTransform = transform('dynamic-user', APIUserSchema)
  .to(InternalUserSchema)
  .map('user_id', 'id')
  .map('user_name', 'name')
  .branch({
    condition: source => source.account_type === 'premium',
    then: transform('premium-enrichment', InternalUserSchema)
      .to(PremiumUserSchema)
      .compute('premiumFeatures', user => loadPremiumFeatures(user.id))
      .compute('billingInfo', user => loadBillingInfo(user.id)),
    else: transform('standard-user', InternalUserSchema)
      .to(StandardUserSchema)
      .compute('upgradePrompt', () => 'Upgrade to Premium for more features!'),
  })
  .validate()
```

### Transform Composition with Error Recovery

```typescript
// Transform with fallback strategies
const resilientTransform = transform('resilient-data', APIDataSchema)
  .to(InternalDataSchema)
  .map('primary_value', 'value')
  .fallback(
    // Primary transform
    transform('primary', APIDataSchema)
      .to(InternalDataSchema)
      .map('primary_value', 'value', source => complexTransformation(source.primary_value)),

    // Fallback transform
    transform('fallback', APIDataSchema)
      .to(InternalDataSchema)
      .map('backup_value', 'value', source => simpleTransformation(source.backup_value)),

    // Last resort transform
    transform('default', APIDataSchema)
      .to(InternalDataSchema)
      .compute('value', () => 'default_value')
  )
  .validate()
```

## Pipeline Integration

### Transform Steps in Pipelines

```typescript
import { pipeline } from 'kairo'

// Simple transform integration
const processUser = pipeline('process-user')
  .input(APIUserSchema)
  .transform(userTransform)
  .pipeline(UserAPI.create)
  .trace('user-processed')

// Multiple transform steps
const processOrder = pipeline('process-order')
  .input(OrderAPISchema)
  .transform(orderTransform)
  .map(order => ({ ...order, processed: true }))
  .transform(orderEnrichmentTransform)
  .pipeline(OrderAPI.create)
  .parallel([EmailAPI.sendOrderConfirmation, InventoryAPI.updateStock, AnalyticsAPI.trackOrder])
  .trace('order-processed')

// Conditional transforms in pipelines
const flexibleProcessing = pipeline('flexible-processing')
  .input(RawDataSchema)
  .branch({
    condition: data => data.type === 'user',
    then: pipeline('user-branch').transform(userTransform),
    else: pipeline('order-branch').transform(orderTransform),
  })
  .map(result => ({ ...result, timestamp: new Date().toISOString() }))
  .trace('data-processed')
```

### Transform Error Handling in Pipelines

```typescript
// Pipeline with transform error recovery
const robustProcessing = pipeline('robust-processing')
  .input(APIDataSchema)
  .retry({ times: 3, delay: 1000 })
  .transform(primaryTransform)
  .fallback(
    pipeline('fallback-path').transform(backupTransform),
    pipeline('default-path').map(data => getDefaultData(data))
  )
  .validate(ProcessedDataSchema)
  .trace('processing-complete')

// Pipeline with transform validation
const validatedProcessing = pipeline('validated-processing')
  .input(RawDataSchema)
  .transform(dataTransform)
  .run(async transformed => {
    // Additional validation after transform
    const validationResult = await validateBusinessRules(transformed)
    if (!validationResult.valid) {
      throw new Error(`Business rule validation failed: ${validationResult.errors.join(', ')}`)
    }
    return transformed
  })
  .trace('validated-and-processed')
```

## Advanced Transform Patterns

### Dynamic Schema Transforms

```typescript
// Transform with dynamic target schema based on source data
const dynamicTransform = <T extends 'user' | 'admin'>(type: T) =>
  transform(`dynamic-${type}`, APIUserSchema)
    .to(type === 'admin' ? AdminUserSchema : RegularUserSchema)
    .map('user_id', 'id')
    .map('user_name', 'name')
    .compute('permissions', source =>
      type === 'admin' ? loadAdminPermissions(source.user_id) : loadUserPermissions(source.user_id)
    )
    .validate()

// Usage with type inference
const adminTransform = dynamicTransform('admin') // Returns AdminUser
const userTransform = dynamicTransform('user') // Returns RegularUser
```

### Async Transform Support

```typescript
// Transform with async field computations (in pipeline context)
const enrichUserPipeline = pipeline('enrich-user')
  .input(APIUserSchema)
  .transform(basicUserTransform)
  .run(async user => {
    // Fetch additional data asynchronously
    const [profile, preferences, activity] = await Promise.all([
      ProfileAPI.get.run({ userId: user.id }),
      PreferencesAPI.get.run({ userId: user.id }),
      ActivityAPI.getRecent.run({ userId: user.id }),
    ])

    return {
      ...user,
      profile: profile.match({ Ok: p => p, Err: () => null }),
      preferences: preferences.match({ Ok: p => p, Err: () => defaultPreferences }),
      recentActivity: activity.match({ Ok: a => a, Err: () => [] }),
    }
  })
  .validate(EnrichedUserSchema)
  .trace('user-enriched')
```

### Transform Performance Optimization

```typescript
// Optimized transform for large datasets
const optimizedTransform = transform('optimized-user', APIUserSchema)
  .to(InternalUserSchema)
  .map('user_id', 'id')
  .map('user_name', 'name')
  .map('user_email', 'email')
  // Cache expensive computations
  .compute('displayName', source => {
    return memoize(
      `displayName:${source.user_id}`,
      () => `${source.user_name} <${source.user_email}>`
    )
  })
  // Efficient filtering
  .filter(source => {
    // Use early returns for performance
    if (!source.is_active) return false
    if (!source.user_email.includes('@')) return false
    return true
  })
  .validate()

// Streaming transform for very large datasets
const streamingTransform = createStreamingTransform(userTransform, {
  batchSize: 1000,
  concurrency: 4,
  onProgress: (processed, total) => {
    console.log(`Processed ${processed}/${total} items`)
  },
  onError: (error, item, index) => {
    console.error(`Error processing item ${index}:`, error.message)
  },
})
```

## Testing Transforms

### Unit Testing with Known Data

```typescript
import { describe, it, expect } from 'vitest'
import { transformTesting } from 'kairo/testing'

describe('User Transform', () => {
  const tester = transformTesting.createTester(userTransform)

  it('should transform API user to internal user correctly', async () => {
    const apiUser = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      user_name: 'John Doe',
      user_email: 'john@example.com',
      birth_date: '1990-01-15T00:00:00Z',
      is_active: true,
      profile_picture: 'https://example.com/avatar.jpg',
      created_at: '2024-01-01T00:00:00Z',
    }

    const result = await userTransform.execute(apiUser)

    expect(result.tag).toBe('Ok')
    if (result.tag === 'Ok') {
      expect(result.value).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'john@example.com',
        age: 34, // Calculated from birth_date
        active: true,
        avatar: 'https://example.com/avatar.jpg',
        displayName: 'John Doe <john@example.com>',
        slug: 'john-doe',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: undefined,
      })
    }
  })

  it('should filter out inactive users', async () => {
    const inactiveUser = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      user_name: 'Inactive User',
      user_email: 'inactive@example.com',
      birth_date: '1990-01-15T00:00:00Z',
      is_active: false,
      created_at: '2024-01-01T00:00:00Z',
    }

    const result = await userTransform.execute(inactiveUser)

    expect(result.tag).toBe('Err')
    if (result.tag === 'Err') {
      expect(result.error.code).toBe('FILTER_ERROR')
    }
  })
})
```

### Property-Based Testing

```typescript
describe('User Transform Property Tests', () => {
  it('should handle all valid API user variations', async () => {
    const tester = transformTesting.createTester(userTransform)

    const results = await tester.propertyTest(
      () => ({
        user_id: transformTesting.generators.uuid(),
        user_name: transformTesting.generators.randomString(10),
        user_email: `${transformTesting.generators.randomString(5)}@example.com`,
        birth_date: transformTesting.generators
          .randomDate(new Date('1950-01-01'), new Date('2000-12-31'))
          .toISOString(),
        is_active: true, // Only test with active users for this test
        created_at: transformTesting.generators
          .randomDate(new Date('2020-01-01'), new Date())
          .toISOString(),
      }),
      1000 // Generate 1000 test cases
    )

    expect(results.passed).toBeGreaterThan(950) // Allow for some edge cases
    expect(results.failed).toBeLessThan(50)
  })
})
```

### Field Mapping Validation

```typescript
describe('Transform Field Mappings', () => {
  it('should validate all field mappings', async () => {
    const tester = transformTesting.createTester(userTransform)

    const mappingTests = [
      transformTesting.fieldMappingTest(
        'user_id',
        'id',
        '123e4567-e89b-12d3-a456-426614174000',
        '123e4567-e89b-12d3-a456-426614174000'
      ),
      transformTesting.fieldMappingTest('user_name', 'name', 'John Doe', 'John Doe'),
      transformTesting.fieldMappingTest(
        'user_email',
        'email',
        'john@example.com',
        'john@example.com'
      ),
      transformTesting.fieldMappingTest(
        'birth_date',
        'age',
        '1990-01-15T00:00:00Z',
        34 // Expected age calculation
      ),
    ]

    const results = await tester.testFieldMappings(mappingTests)

    expect(results.passed).toBe(mappingTests.length)
    expect(results.failed).toBe(0)
  })
})
```

### Batch Processing Tests

```typescript
describe('Transform Batch Processing', () => {
  it('should handle batch transformations efficiently', async () => {
    const tester = transformTesting.createTester(userTransform)

    const batchData = Array.from({ length: 1000 }, (_, index) => ({
      user_id: `user-${index}`,
      user_name: `User ${index}`,
      user_email: `user${index}@example.com`,
      birth_date: '1990-01-15T00:00:00Z',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    }))

    const startTime = Date.now()
    const result = await userTransform.executeMany(batchData)
    const duration = Date.now() - startTime

    expect(result.tag).toBe('Ok')
    if (result.tag === 'Ok') {
      expect(result.value).toHaveLength(1000)
      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
    }
  })
})
```

## Error Handling and Debugging

### Comprehensive Error Types

```typescript
const result = await userTransform.execute(apiUserData)

result.match({
  Ok: user => {
    console.log('Transform successful:', user)
  },
  Err: error => {
    // Structured error handling
    switch (error.code) {
      case 'VALIDATION_ERROR':
        console.log('Schema validation failed:')
        console.log('Field:', error.field)
        console.log('Message:', error.message)
        console.log('Expected:', error.expected)
        console.log('Received:', error.received)
        console.log('Path:', error.path)
        break

      case 'TRANSFORM_ERROR':
        console.log('Field transformation failed:')
        console.log('Operation:', error.operation)
        console.log('Source field:', error.sourceField)
        console.log('Target field:', error.targetField)
        console.log('Source value:', error.sourceValue)
        console.log('Error message:', error.message)
        break

      case 'FILTER_ERROR':
        console.log('Data filtered out:')
        console.log('Filter condition failed:', error.condition)
        console.log('Source data:', error.sourceData)
        break

      case 'COMPUTE_ERROR':
        console.log('Computed field generation failed:')
        console.log('Field:', error.field)
        console.log('Computer function:', error.computer)
        console.log('Source data:', error.sourceData)
        console.log('Error:', error.message)
        break

      default:
        console.log('Unknown transform error:', error.message)
    }
  },
})
```

### Transform Debugging and Tracing

```typescript
// Enable detailed transform tracing
const debugTransform = transform('debug-user', APIUserSchema)
  .to(InternalUserSchema)
  .map('user_id', 'id')
  .trace('mapped-id')
  .map('user_name', 'name')
  .trace('mapped-name')
  .compute('displayName', source => `${source.user_name} <${source.user_email}>`)
  .trace('computed-display-name')
  .filter(source => source.is_active)
  .trace('filtered-active')
  .validate()
  .trace('validated')

// Transform with custom debugging
const instrumentedTransform = transform('instrumented', APIUserSchema)
  .to(InternalUserSchema)
  .map('user_id', 'id')
  .debug(({ source, target, step }) => {
    console.log(`Step ${step}: Mapped ${source.user_id} -> ${target.id}`)
  })
  .compute('displayName', source => `${source.user_name} <${source.user_email}>`)
  .debug(({ target, step }) => {
    console.log(`Step ${step}: Computed displayName: ${target.displayName}`)
  })
  .validate()
```

## Real-World Examples

### E-commerce Product Transformation

```typescript
const ProductAPISchema = nativeSchema.object({
  product_id: nativeSchema.string(),
  product_name: nativeSchema.string(),
  description_html: nativeSchema.string(),
  base_price: nativeSchema.number(),
  sale_price: nativeSchema.number().optional(),
  inventory_count: nativeSchema.number(),
  category_ids: nativeSchema.array(nativeSchema.string()),
  tag_list: nativeSchema.string(),
  image_urls: nativeSchema.array(nativeSchema.string().url()),
  vendor_info: nativeSchema.object({
    vendor_id: nativeSchema.string(),
    vendor_name: nativeSchema.string(),
    contact_email: nativeSchema.string().email(),
  }),
  seo_data: nativeSchema.object({
    meta_title: nativeSchema.string(),
    meta_description: nativeSchema.string(),
    url_slug: nativeSchema.string(),
  }),
  status: nativeSchema.enum(['ACTIVE', 'INACTIVE', 'DRAFT'] as const),
  created_timestamp: nativeSchema.string(),
  updated_timestamp: nativeSchema.string().optional(),
})

const InternalProductSchema = nativeSchema.object({
  id: nativeSchema.string(),
  name: nativeSchema.string(),
  description: nativeSchema.string(),
  pricing: nativeSchema.object({
    basePrice: nativeSchema.number(),
    salePrice: nativeSchema.number().optional(),
    discount: nativeSchema.number().optional(),
    displayPrice: nativeSchema.number(),
  }),
  inventory: nativeSchema.object({
    count: nativeSchema.number(),
    inStock: nativeSchema.boolean(),
    lowStock: nativeSchema.boolean(),
  }),
  categories: nativeSchema.array(nativeSchema.string()),
  tags: nativeSchema.array(nativeSchema.string()),
  images: nativeSchema.array(
    nativeSchema.object({
      url: nativeSchema.string().url(),
      alt: nativeSchema.string(),
      order: nativeSchema.number(),
    })
  ),
  vendor: nativeSchema.object({
    id: nativeSchema.string(),
    name: nativeSchema.string(),
    email: nativeSchema.string().email(),
  }),
  seo: nativeSchema.object({
    title: nativeSchema.string(),
    description: nativeSchema.string(),
    slug: nativeSchema.string(),
  }),
  status: nativeSchema.enum(['active', 'inactive', 'draft'] as const),
  createdAt: nativeSchema.string(),
  updatedAt: nativeSchema.string().optional(),
})

const productTransform = transform('product-normalization', ProductAPISchema)
  .to(InternalProductSchema)
  .map('product_id', 'id')
  .map('product_name', 'name')
  .map('description_html', 'description', source => stripHtml(source.description_html))
  .compute('pricing', source => ({
    basePrice: source.base_price,
    salePrice: source.sale_price,
    discount: source.sale_price
      ? Math.round(((source.base_price - source.sale_price) / source.base_price) * 100)
      : undefined,
    displayPrice: source.sale_price || source.base_price,
  }))
  .compute('inventory', source => ({
    count: source.inventory_count,
    inStock: source.inventory_count > 0,
    lowStock: source.inventory_count > 0 && source.inventory_count <= 10,
  }))
  .map('category_ids', 'categories')
  .map('tag_list', 'tags', source =>
    source.tag_list
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)
  )
  .map('image_urls', 'images', source =>
    source.image_urls.map((url, index) => ({
      url,
      alt: `${source.product_name} - Image ${index + 1}`,
      order: index,
    }))
  )
  .map('vendor_info', 'vendor', source => ({
    id: source.vendor_info.vendor_id,
    name: source.vendor_info.vendor_name,
    email: source.vendor_info.contact_email,
  }))
  .map('seo_data', 'seo', source => ({
    title: source.seo_data.meta_title,
    description: source.seo_data.meta_description,
    slug: source.seo_data.url_slug,
  }))
  .map('status', 'status', source => source.status.toLowerCase() as any)
  .map('created_timestamp', 'createdAt', source => new Date(source.created_timestamp).toISOString())
  .map('updated_timestamp', 'updatedAt', source =>
    source.updated_timestamp ? new Date(source.updated_timestamp).toISOString() : undefined
  )
  .filter(source => source.status === 'ACTIVE')
  .validate()
```

### Financial Data Transformation

```typescript
const FinancialAPISchema = nativeSchema.object({
  transaction_id: nativeSchema.string(),
  account_number: nativeSchema.string(),
  transaction_type: nativeSchema.enum(['CREDIT', 'DEBIT'] as const),
  amount_cents: nativeSchema.number(),
  currency_code: nativeSchema.string().length(3),
  merchant_data: nativeSchema.object({
    merchant_id: nativeSchema.string(),
    merchant_name: nativeSchema.string(),
    merchant_category: nativeSchema.string(),
    location: nativeSchema.object({
      address: nativeSchema.string(),
      city: nativeSchema.string(),
      country: nativeSchema.string(),
    }),
  }),
  transaction_timestamp: nativeSchema.string(),
  processing_status: nativeSchema.enum(['PENDING', 'COMPLETED', 'FAILED'] as const),
  fraud_score: nativeSchema.number().min(0).max(100),
})

const InternalTransactionSchema = nativeSchema.object({
  id: nativeSchema.string(),
  accountId: nativeSchema.string(),
  type: nativeSchema.enum(['credit', 'debit'] as const),
  amount: nativeSchema.object({
    value: nativeSchema.number(),
    currency: nativeSchema.string(),
    formatted: nativeSchema.string(),
  }),
  merchant: nativeSchema.object({
    id: nativeSchema.string(),
    name: nativeSchema.string(),
    category: nativeSchema.string(),
    location: nativeSchema.string(),
  }),
  timestamp: nativeSchema.string(),
  status: nativeSchema.enum(['pending', 'completed', 'failed'] as const),
  riskAssessment: nativeSchema.object({
    score: nativeSchema.number(),
    level: nativeSchema.enum(['low', 'medium', 'high'] as const),
    requiresReview: nativeSchema.boolean(),
  }),
})

const financialTransform = transform('financial-normalization', FinancialAPISchema)
  .to(InternalTransactionSchema)
  .map('transaction_id', 'id')
  .map('account_number', 'accountId')
  .map('transaction_type', 'type', source => source.transaction_type.toLowerCase() as any)
  .compute('amount', source => {
    const value = source.amount_cents / 100
    return {
      value,
      currency: source.currency_code,
      formatted: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: source.currency_code,
      }).format(value),
    }
  })
  .compute('merchant', source => ({
    id: source.merchant_data.merchant_id,
    name: source.merchant_data.merchant_name,
    category: source.merchant_data.merchant_category,
    location: `${source.merchant_data.location.city}, ${source.merchant_data.location.country}`,
  }))
  .map('transaction_timestamp', 'timestamp', source =>
    new Date(source.transaction_timestamp).toISOString()
  )
  .map('processing_status', 'status', source => source.processing_status.toLowerCase() as any)
  .compute('riskAssessment', source => {
    const score = source.fraud_score
    return {
      score,
      level: score >= 70 ? 'high' : score >= 30 ? 'medium' : 'low',
      requiresReview: score >= 50,
    }
  })
  .filter(source => source.processing_status !== 'FAILED')
  .validate()
```

## Best Practices

### Transform Design Principles

```typescript
// ✅ Good: Descriptive transform names
const userNormalizationTransform = transform('user-normalization', APIUserSchema)
const orderEnrichmentTransform = transform('order-enrichment', OrderSchema)

// ❌ Avoid: Generic names
const transform1 = transform('transform1', Schema)
const dataTransform = transform('data', Schema)
  // ✅ Good: Clear field mappings
  .map('user_id', 'id')
  .map('user_name', 'name')
  .map('email_address', 'email')

  // ❌ Avoid: Confusing mappings
  .map('x', 'y')
  .map('field1', 'field2')

  // ✅ Good: Meaningful computed fields
  .compute('displayName', source => `${source.firstName} ${source.lastName}`)
  .compute('isAdult', source => source.age >= 18)

  // ❌ Avoid: Unclear computations
  .compute('value', source => someComplexFunction(source))
```

### Error Handling Best Practices

```typescript
// ✅ Good: Comprehensive error handling
const result = await transform.execute(data)
result.match({
  Ok: transformedData => {
    // Handle success case
    processTransformedData(transformedData)
  },
  Err: error => {
    // Handle specific error types
    switch (error.code) {
      case 'VALIDATION_ERROR':
        logValidationError(error)
        notifyDataQualityTeam(error)
        break
      case 'TRANSFORM_ERROR':
        logTransformError(error)
        alertDevelopmentTeam(error)
        break
      default:
        logUnknownError(error)
    }
  },
})

// ❌ Avoid: Ignoring errors
const result = await transform.execute(data)
if (result.tag === 'Ok') {
  processData(result.value) // What if transformation fails?
}
```

### Performance Optimization

```typescript
// ✅ Good: Efficient filtering
.filter(source => {
  // Early returns for performance
  if (!source.isActive) return false
  if (source.type !== 'premium') return false
  return source.lastAccess > cutoffDate
})

// ❌ Avoid: Inefficient operations
.filter(source => expensiveOperation(source))

// ✅ Good: Batch processing for large datasets
const results = await transform.executeMany(largeDataset, {
  batchSize: 1000,
  concurrency: 4,
})

// ✅ Good: Memoization for expensive computations
.compute('expensiveValue', source => {
  return memoize(`expensive:${source.id}`, () => expensiveCalculation(source))
})
```

The Transform API provides powerful declarative data transformation capabilities that integrate seamlessly with Kairo's Three-Pillar Architecture, enabling you to build maintainable, type-safe data processing workflows with predictable error handling and excellent performance.
