# Data Transformations

Learn how to use Kairo's declarative data transformation system to map and convert data between different schemas.

## Basic Field Mapping

```typescript
import { transform, nativeSchema } from 'kairo'

// Source API schema
const APIUserSchema = nativeSchema.object({
  user_id: nativeSchema.string(),
  user_name: nativeSchema.string(),
  user_email: nativeSchema.string(),
  created_at: nativeSchema.string(),
  is_active: nativeSchema.boolean(),
})

// Target internal schema
const InternalUserSchema = nativeSchema.object({
  id: nativeSchema.string(),
  name: nativeSchema.string(),
  email: nativeSchema.string(),
  createdAt: nativeSchema.string(),
  displayName: nativeSchema.string(),
})

// Define transformation
const userTransform = transform('user-normalization', APIUserSchema)
  .to(InternalUserSchema)
  .map('user_id', 'id')
  .map('user_name', 'name')
  .map('user_email', 'email')
  .map('created_at', 'createdAt', source => new Date(source.created_at).toISOString())
  .compute('displayName', source => `${source.user_name} <${source.user_email}>`)
  .filter(user => user.is_active === true)
  .validate()

// Execute transformation
const apiUserData = {
  user_id: '123',
  user_name: 'John Doe',
  user_email: 'john@example.com',
  created_at: '2023-12-01T10:00:00Z',
  is_active: true,
}

const result = await userTransform.execute(apiUserData)
result.match({
  Ok: user => {
    console.log('Transformed user:', user)
    // Output: {
    //   id: '123',
    //   name: 'John Doe',
    //   email: 'john@example.com',
    //   createdAt: '2023-12-01T10:00:00.000Z',
    //   displayName: 'John Doe <john@example.com>'
    // }
  },
  Err: error => console.error('Transform error:', error),
})
```

## Complex Nested Transformations

```typescript
// Source schema with nested data
const APIOrderSchema = nativeSchema.object({
  order_id: nativeSchema.string(),
  customer: nativeSchema.object({
    customer_id: nativeSchema.string(),
    customer_name: nativeSchema.string(),
    contact: nativeSchema.object({
      email: nativeSchema.string(),
      phone: nativeSchema.string(),
    }),
  }),
  items: nativeSchema.array(
    nativeSchema.object({
      product_id: nativeSchema.string(),
      product_name: nativeSchema.string(),
      quantity: nativeSchema.number(),
      unit_price: nativeSchema.number(),
    })
  ),
  order_date: nativeSchema.string(),
  status: nativeSchema.string(),
})

// Target flattened schema
const OrderSchema = nativeSchema.object({
  id: nativeSchema.string(),
  customerId: nativeSchema.string(),
  customerName: nativeSchema.string(),
  customerEmail: nativeSchema.string(),
  customerPhone: nativeSchema.string(),
  items: nativeSchema.array(
    nativeSchema.object({
      productId: nativeSchema.string(),
      name: nativeSchema.string(),
      quantity: nativeSchema.number(),
      price: nativeSchema.number(),
      total: nativeSchema.number(),
    })
  ),
  orderDate: nativeSchema.string(),
  status: nativeSchema.string(),
  totalAmount: nativeSchema.number(),
})

const orderTransform = transform('order-normalization', APIOrderSchema)
  .to(OrderSchema)
  .map('order_id', 'id')
  .map('customer.customer_id', 'customerId')
  .map('customer.customer_name', 'customerName')
  .map('customer.contact.email', 'customerEmail')
  .map('customer.contact.phone', 'customerPhone')
  .map('order_date', 'orderDate', source => new Date(source.order_date).toISOString())
  .map('status', 'status')
  .compute('items', source =>
    source.items.map(item => ({
      productId: item.product_id,
      name: item.product_name,
      quantity: item.quantity,
      price: item.unit_price,
      total: item.quantity * item.unit_price,
    }))
  )
  .compute('totalAmount', source =>
    source.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  )
  .filter(order => order.status !== 'cancelled')
  .validate()
```

## Transform Composition

```typescript
// First transformation: API to Internal format
const apiToInternalTransform = transform('api-to-internal', APIUserSchema)
  .to(InternalUserSchema)
  .map('user_id', 'id')
  .map('user_name', 'name')
  .map('user_email', 'email')
  .compute('displayName', source => `${source.user_name}`)
  .validate()

// Second transformation: Internal to Display format
const DisplayUserSchema = nativeSchema.object({
  id: nativeSchema.string(),
  displayName: nativeSchema.string(),
  email: nativeSchema.string(),
  initials: nativeSchema.string(),
  avatar: nativeSchema.string(),
})

const internalToDisplayTransform = transform('internal-to-display', InternalUserSchema)
  .to(DisplayUserSchema)
  .map('id', 'id')
  .map('displayName', 'displayName')
  .map('email', 'email')
  .compute('initials', source =>
    source.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
  )
  .compute('avatar', source => `https://api.dicebear.com/7.x/initials/svg?seed=${source.name}`)
  .validate()

// Compose transformations
const fullTransform = apiToInternalTransform.pipe(internalToDisplayTransform)

// Execute composed transformation
const result = await fullTransform.execute(apiUserData)
```

## Batch Processing

```typescript
// Transform multiple records
const userArrayTransform = transform('user-array', nativeSchema.array(APIUserSchema))
  .to(nativeSchema.array(InternalUserSchema))
  .map('items', 'items', source => source.map(user => userTransform.execute(user)))
  .validate()

// Process array of users
const apiUsers = [
  {
    user_id: '1',
    user_name: 'John',
    user_email: 'john@example.com',
    created_at: '2023-01-01',
    is_active: true,
  },
  {
    user_id: '2',
    user_name: 'Jane',
    user_email: 'jane@example.com',
    created_at: '2023-01-02',
    is_active: true,
  },
]

const results = await userTransform.executeMany(apiUsers)
results.match({
  Ok: users => console.log('All users transformed:', users),
  Err: error => console.error('Batch transform failed:', error),
})
```

## Common Transformation Patterns

### String Transformations

```typescript
import { commonTransforms } from 'kairo'

const stringTransform = transform('string-operations', SourceSchema)
  .to(TargetSchema)
  .map('name', 'upperName', source => commonTransforms.toUpperCase(source.name))
  .map('description', 'trimmedDesc', source => commonTransforms.trim(source.description))
  .map('title', 'slug', source => commonTransforms.slugify(source.title))
  .compute('cleanedText', source => commonTransforms.removeSpecialChars(source.rawText))
```

### Date Transformations

```typescript
const dateTransform = transform('date-operations', SourceSchema)
  .to(TargetSchema)
  .map('created_at', 'createdAt', source => new Date(source.created_at))
  .map('updated_at', 'updatedAt', source => new Date(source.updated_at).toISOString())
  .compute('age', source => {
    const birthDate = new Date(source.birth_date)
    const today = new Date()
    return today.getFullYear() - birthDate.getFullYear()
  })
  .compute('timeAgo', source => {
    const date = new Date(source.created_at)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    return `${diffInDays} days ago`
  })
```

### Number Transformations

```typescript
const numberTransform = transform('number-operations', SourceSchema)
  .to(TargetSchema)
  .map('price', 'roundedPrice', source => Math.round(source.price * 100) / 100)
  .map('weight', 'weightInKg', source => source.weight / 1000) // grams to kg
  .compute('total', source => source.quantity * source.unitPrice)
  .compute('discount', source => {
    const discount = source.total * (source.discountPercent / 100)
    return Math.min(discount, source.maxDiscount || Infinity)
  })
```

## Pipeline Integration

```typescript
import { pipeline } from 'kairo'

// Transform data within a pipeline
const processUserPipeline = pipeline('process-user')
  .input(APIUserSchema)
  .transform(userTransform)
  .run(async user => {
    // Process transformed user
    console.log('Processing user:', user.displayName)
    return user
  })
  .trace('user-processing')

// Execute pipeline with transformation
const result = await processUserPipeline.run(apiUserData)
```

## Error Handling

```typescript
// Handle transformation errors
const result = await userTransform.execute(invalidData)

if (Result.isErr(result)) {
  const error = result.error

  console.error('Transform failed:', {
    code: error.code,
    message: error.message,
    field: error.context.field,
    value: error.context.value,
  })

  // Handle specific error types
  switch (error.code) {
    case 'VALIDATION_ERROR':
      console.error('Data validation failed')
      break
    case 'TRANSFORM_ERROR':
      console.error('Transformation logic failed')
      break
    default:
      console.error('Unknown transform error')
  }
}
```

## Advanced Features

### Conditional Transformations

```typescript
const conditionalTransform = transform('conditional', SourceSchema)
  .to(TargetSchema)
  .map('value', 'processedValue', source => {
    if (source.type === 'percentage') {
      return source.value / 100
    } else if (source.type === 'currency') {
      return source.value * 0.01
    }
    return source.value
  })
  .compute('category', source => {
    if (source.age < 18) return 'minor'
    if (source.age < 65) return 'adult'
    return 'senior'
  })
```

### Custom Validators

```typescript
const validatedTransform = transform('validated', SourceSchema)
  .to(TargetSchema)
  .map('email', 'email', source => source.email.toLowerCase())
  .filter(user => {
    // Custom validation logic
    const emailDomain = user.email.split('@')[1]
    const allowedDomains = ['company.com', 'partner.com']
    return allowedDomains.includes(emailDomain)
  })
  .validate()
```

### Performance Optimization

```typescript
// Optimize for large datasets
const optimizedTransform = transform('optimized', SourceSchema)
  .to(TargetSchema)
  .map('id', 'id') // Direct mapping (fastest)
  .compute('computed', source => {
    // Cache expensive computations
    return expensiveComputation(source.data)
  })
// Skip validation for performance if data is trusted
// .validate() // Uncomment for safety
```

Data transformations provide a powerful way to declaratively convert data between different formats while maintaining type safety and performance. They integrate seamlessly with Kairo's pipeline system and native schema validation.
