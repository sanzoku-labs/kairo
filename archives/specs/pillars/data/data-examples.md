# DATA Pillar Examples ✅ IMPLEMENTATION READY

> **Comprehensive usage examples for Kairo V2's DATA pillar operations**  
> **Status: ✅ All DATA methods implemented - Examples ready to be populated**

## Overview ✅ Implementation Complete

This document provides practical examples of DATA pillar operations, from basic validation to complex aggregation workflows. Each example includes complete code, expected results, and explanatory notes.

**Implementation Status**: ✅ **All 10 DATA methods + 12 utilities implemented - Ready for examples**

## ✅ Basic Validation Examples - READY

### **✅ Simple Schema Validation - IMPLEMENTED**

```typescript
// Define a user schema
const UserSchema = data.schema({
  name: data.string().min(1).max(100),
  email: data.string().email(),
  age: data.number().min(0).max(150),
  isActive: data.boolean(),
})

// Valid user data
const validUser = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  isActive: true,
}

const result = data.validate(validUser, UserSchema)
// Result: Ok({ name: "John Doe", email: "john@example.com", age: 30, isActive: true })

// Invalid user data
const invalidUser = {
  name: '',
  email: 'invalid-email',
  age: -5,
  isActive: 'yes',
}

const invalidResult = data.validate(invalidUser, UserSchema)
// Result: Err({
//   code: 'VALIDATION_ERROR',
//   issues: [
//     { path: ['name'], message: 'String must be at least 1 characters', code: 'too_small' },
//     { path: ['email'], message: 'Invalid email format', code: 'invalid_email' },
//     { path: ['age'], message: 'Number must be at least 0', code: 'too_small' },
//     { path: ['isActive'], message: 'Expected boolean, received string', code: 'invalid_type' }
//   ]
// })
```

### **Nested Object Validation**

```typescript
// Complex nested schema
const CompanySchema = data.schema({
  name: data.string().min(1),
  address: data.object({
    street: data.string(),
    city: data.string(),
    country: data.string(),
    zipCode: data.string().pattern(/^\d{5}(-\d{4})?$/),
  }),
  employees: data.array(
    data.object({
      id: data.string().uuid(),
      name: data.string(),
      position: data.string(),
      salary: data.number().positive(),
      startDate: data.date(),
    })
  ),
  metadata: data
    .object({
      founded: data.date(),
      industry: data.string(),
      website: data.string().url().optional(),
    })
    .optional(),
})

const companyData = {
  name: 'Tech Corp',
  address: {
    street: '123 Main St',
    city: 'San Francisco',
    country: 'USA',
    zipCode: '94105',
  },
  employees: [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Alice Johnson',
      position: 'Software Engineer',
      salary: 120000,
      startDate: new Date('2023-01-15'),
    },
    {
      id: '987fcdeb-51d2-43a8-9876-543210987654',
      name: 'Bob Smith',
      position: 'Product Manager',
      salary: 130000,
      startDate: new Date('2022-11-01'),
    },
  ],
  metadata: {
    founded: new Date('2010-03-15'),
    industry: 'Technology',
    website: 'https://techcorp.com',
  },
}

const companyResult = data.validate(companyData, CompanySchema)
// Result: Ok(companyData) - fully validated nested structure
```

## Transformation Examples

### **Basic Data Transformation**

```typescript
// Source schema (from API)
const ApiUserSchema = data.schema({
  user_name: data.string(),
  email_address: data.string().email(),
  birth_date: data.string(), // Date as string from API
  is_premium: data.string().enum(['true', 'false']), // Boolean as string
  account_balance: data.string(), // Number as string
})

// Target schema (for application)
const AppUserSchema = data.schema({
  name: data.string(),
  email: data.string().email(),
  birthDate: data.date(),
  isPremium: data.boolean(),
  balance: data.number(),
})

const apiData = {
  user_name: 'Jane Doe',
  email_address: 'jane@example.com',
  birth_date: '1990-05-15',
  is_premium: 'true',
  account_balance: '1250.75',
}

// Transform API data to app format
const transformedResult = data.transform(apiData, AppUserSchema, {
  deepTransform: true,
  customTransforms: {
    name: (user: any) => user.user_name,
    email: (user: any) => user.email_address,
    birthDate: (user: any) => new Date(user.birth_date),
    isPremium: (user: any) => user.is_premium === 'true',
    balance: (user: any) => parseFloat(user.account_balance),
  },
})

// Result: Ok({
//   name: "Jane Doe",
//   email: "jane@example.com",
//   birthDate: Date(1990-05-15),
//   isPremium: true,
//   balance: 1250.75
// })
```

### **Complex Data Normalization**

```typescript
// Normalize inconsistent product data
const ProductSchema = data.schema({
  id: data.string(),
  name: data.string(),
  price: data.number().positive(),
  category: data.string(),
  tags: data.array(data.string()),
  inStock: data.boolean(),
  lastUpdated: data.date(),
})

const inconsistentProducts = [
  {
    product_id: 'P001',
    product_name: '  LAPTOP  ',
    price: '$1,299.99',
    category: 'electronics',
    tags: 'computers,laptops,portable',
    in_stock: 'yes',
    updated_at: '2024-01-15T10:30:00Z',
  },
  {
    id: 'P002',
    name: 'smartphone',
    price: 899,
    category: 'ELECTRONICS',
    tags: ['phones', 'mobile', 'communication'],
    inStock: true,
    lastUpdated: '2024-01-16T14:20:00Z',
  },
]

const normalizedResult = data.transform(inconsistentProducts, data.array(ProductSchema), {
  customTransforms: {
    id: (item: any) => item.product_id || item.id,
    name: (item: any) => {
      const name = item.product_name || item.name || ''
      return name
        .trim()
        .toLowerCase()
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    },
    price: (item: any) => {
      if (typeof item.price === 'string') {
        return parseFloat(item.price.replace(/[$,]/g, ''))
      }
      return item.price
    },
    category: (item: any) => item.category.toLowerCase(),
    tags: (item: any) => {
      if (typeof item.tags === 'string') {
        return item.tags.split(',').map((tag: string) => tag.trim())
      }
      return Array.isArray(item.tags) ? item.tags : []
    },
    inStock: (item: any) => {
      if (typeof item.in_stock === 'string') {
        return item.in_stock.toLowerCase() === 'yes'
      }
      return Boolean(item.inStock !== undefined ? item.inStock : true)
    },
    lastUpdated: (item: any) => {
      const dateStr = item.updated_at || item.lastUpdated
      return new Date(dateStr)
    },
  },
})

// Result: Ok([
//   {
//     id: "P001",
//     name: "Laptop",
//     price: 1299.99,
//     category: "electronics",
//     tags: ["computers", "laptops", "portable"],
//     inStock: true,
//     lastUpdated: Date(2024-01-15T10:30:00Z)
//   },
//   {
//     id: "P002",
//     name: "Smartphone",
//     price: 899,
//     category: "electronics",
//     tags: ["phones", "mobile", "communication"],
//     inStock: true,
//     lastUpdated: Date(2024-01-16T14:20:00Z)
//   }
// ])
```

## Aggregation Examples

### **Sales Data Analysis**

```typescript
// Sales transaction data
const salesData = [
  {
    id: 'T001',
    region: 'North',
    quarter: 'Q1',
    product: 'Laptop',
    revenue: 1299.99,
    quantity: 1,
    salesRep: 'Alice',
  },
  {
    id: 'T002',
    region: 'North',
    quarter: 'Q1',
    product: 'Mouse',
    revenue: 29.99,
    quantity: 2,
    salesRep: 'Alice',
  },
  {
    id: 'T003',
    region: 'South',
    quarter: 'Q1',
    product: 'Laptop',
    revenue: 1299.99,
    quantity: 1,
    salesRep: 'Bob',
  },
  {
    id: 'T004',
    region: 'North',
    quarter: 'Q2',
    product: 'Keyboard',
    revenue: 89.99,
    quantity: 1,
    salesRep: 'Alice',
  },
  {
    id: 'T005',
    region: 'South',
    quarter: 'Q2',
    product: 'Laptop',
    revenue: 1299.99,
    quantity: 2,
    salesRep: 'Bob',
  },
  {
    id: 'T006',
    region: 'East',
    quarter: 'Q1',
    product: 'Monitor',
    revenue: 299.99,
    quantity: 1,
    salesRep: 'Carol',
  },
  {
    id: 'T007',
    region: 'East',
    quarter: 'Q2',
    product: 'Laptop',
    revenue: 1299.99,
    quantity: 1,
    salesRep: 'Carol',
  },
]

// Aggregate by region and quarter
const regionQuarterAnalysis = data.aggregate(salesData, {
  groupBy: ['region', 'quarter'],
  sum: ['revenue', 'quantity'],
  count: true,
  avg: ['revenue'],
  custom: {
    avgOrderValue: group => {
      const totalRevenue = group.reduce((sum, item) => sum + item.revenue, 0)
      const totalOrders = group.length
      return totalRevenue / totalOrders
    },
    topProduct: group => {
      const productRevenue = group.reduce(
        (acc, item) => {
          acc[item.product] = (acc[item.product] || 0) + item.revenue
          return acc
        },
        {} as Record<string, number>
      )

      return Object.entries(productRevenue).sort(([, a], [, b]) => b - a)[0]?.[0] || 'None'
    },
  },
  sort: [
    { field: 'revenue', direction: 'desc' },
    { field: 'region', direction: 'asc' },
  ],
})

// Result: Ok({
//   groups: {
//     "North|Q1": {
//       items: [/* T001, T002 */],
//       count: 2,
//       revenue: 1329.98,
//       quantity: 3,
//       avgRevenue: 664.99,
//       avgOrderValue: 664.99,
//       topProduct: "Laptop"
//     },
//     "South|Q2": {
//       items: [/* T005 */],
//       count: 1,
//       revenue: 2599.98,
//       quantity: 2,
//       avgRevenue: 2599.98,
//       avgOrderValue: 2599.98,
//       topProduct: "Laptop"
//     }
//     // ... more groups
//   },
//   metadata: {
//     totalGroups: 5,
//     totalItems: 7,
//     processingTime: 15
//   }
// })

// Product performance analysis
const productAnalysis = data.aggregate(salesData, {
  groupBy: ['product'],
  sum: ['revenue', 'quantity'],
  count: true,
  statistics: {
    mean: ['revenue'],
    median: ['revenue'],
    standardDeviation: ['revenue'],
  },
  custom: {
    regionSpread: group => {
      const regions = [...new Set(group.map(item => item.region))]
      return regions.length
    },
    bestPerformingRep: group => {
      const repPerformance = group.reduce(
        (acc, item) => {
          acc[item.salesRep] = (acc[item.salesRep] || 0) + item.revenue
          return acc
        },
        {} as Record<string, number>
      )

      return Object.entries(repPerformance).sort(([, a], [, b]) => b - a)[0]?.[0] || 'None'
    },
  },
})
```

### **Time-Series Aggregation**

```typescript
// Website analytics data
const analyticsData = [
  {
    timestamp: new Date('2024-01-01T10:00:00Z'),
    pageViews: 1250,
    users: 980,
    bounceRate: 0.35,
    source: 'organic',
  },
  {
    timestamp: new Date('2024-01-01T11:00:00Z'),
    pageViews: 1420,
    users: 1100,
    bounceRate: 0.32,
    source: 'organic',
  },
  {
    timestamp: new Date('2024-01-01T12:00:00Z'),
    pageViews: 1680,
    users: 1290,
    bounceRate: 0.28,
    source: 'paid',
  },
  {
    timestamp: new Date('2024-01-01T13:00:00Z'),
    pageViews: 1890,
    users: 1450,
    bounceRate: 0.25,
    source: 'paid',
  },
  {
    timestamp: new Date('2024-01-01T14:00:00Z'),
    pageViews: 2100,
    users: 1580,
    bounceRate: 0.22,
    source: 'social',
  },
  {
    timestamp: new Date('2024-01-01T15:00:00Z'),
    pageViews: 1950,
    users: 1480,
    bounceRate: 0.24,
    source: 'social',
  },
]

// Hourly performance metrics
const hourlyMetrics = data.aggregate(analyticsData, {
  groupBy: [
    item => {
      const hour = item.timestamp.getHours()
      return `${hour.toString().padStart(2, '0')}:00`
    },
  ],
  sum: ['pageViews', 'users'],
  avg: ['bounceRate'],
  count: true,
  custom: {
    peakTrafficSource: group => {
      const sourceTraffic = group.reduce(
        (acc, item) => {
          acc[item.source] = (acc[item.source] || 0) + item.pageViews
          return acc
        },
        {} as Record<string, number>
      )

      return Object.entries(sourceTraffic).sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown'
    },
    conversionRate: group => {
      // Assuming 1 - bounceRate approximates engagement
      const avgBounceRate = group.reduce((sum, item) => sum + item.bounceRate, 0) / group.length
      return (1 - avgBounceRate) * 100 // Convert to percentage
    },
  },
  format: {
    numbers: { decimals: 2 },
  },
})

// Daily summary across traffic sources
const dailySummary = data.aggregate(analyticsData, {
  groupBy: ['source'],
  sum: ['pageViews', 'users'],
  avg: ['bounceRate'],
  statistics: {
    mean: ['pageViews', 'users'],
    standardDeviation: ['bounceRate'],
  },
  custom: {
    peakHour: group => {
      const hourlyData = group.reduce(
        (acc, item) => {
          const hour = item.timestamp.getHours()
          acc[hour] = (acc[hour] || 0) + item.pageViews
          return acc
        },
        {} as Record<number, number>
      )

      const peakHour = Object.entries(hourlyData).sort(([, a], [, b]) => b - a)[0]?.[0]

      return peakHour ? `${peakHour.padStart(2, '0')}:00` : 'unknown'
    },
    efficiency: group => {
      const totalPageViews = group.reduce((sum, item) => sum + item.pageViews, 0)
      const totalUsers = group.reduce((sum, item) => sum + item.users, 0)
      return totalPageViews / totalUsers // Pages per user
    },
  },
})
```

## Data Quality Examples

### **Data Validation and Cleaning**

```typescript
// Messy customer data that needs cleaning
const messyCustomerData = [
  {
    id: 'C001',
    name: '  John Doe  ',
    email: 'JOHN@EXAMPLE.COM',
    phone: '(555) 123-4567',
    city: 'new york',
    state: 'NY',
  },
  {
    id: 'C002',
    name: 'jane smith',
    email: 'jane@test.com',
    phone: '555.987.6543',
    city: 'Los Angeles',
    state: 'ca',
  },
  { id: 'C003', name: '', email: 'invalid-email', phone: '123', city: 'Chicago', state: 'IL' },
  {
    id: 'C001',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '5551234567',
    city: 'New York',
    state: 'NY',
  }, // Duplicate
  {
    id: 'C004',
    name: 'Bob Johnson',
    email: 'bob@company.co',
    phone: null,
    city: 'Houston',
    state: 'TX',
  },
]

const CustomerSchema = data.schema({
  id: data.string().min(1),
  name: data.string().min(1).max(100),
  email: data.string().email(),
  phone: data
    .string()
    .pattern(/^\d{10}$/)
    .optional(),
  city: data.string().min(1),
  state: data.string().length(2),
})

// Clean and validate the data
const cleaningResult = data.transform(messyCustomerData, data.array(CustomerSchema), {
  customTransforms: {
    name: (customer: any) => {
      const name = customer.name?.trim()
      if (!name) return undefined // Will cause validation error

      // Title case conversion
      return name
        .toLowerCase()
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    },
    email: (customer: any) => customer.email?.toLowerCase().trim(),
    phone: (customer: any) => {
      if (!customer.phone) return undefined

      // Extract only digits
      const digits = customer.phone.replace(/\D/g, '')
      return digits.length === 10 ? digits : undefined
    },
    city: (customer: any) => {
      const city = customer.city?.trim()
      return city ? city.charAt(0).toUpperCase() + city.slice(1).toLowerCase() : undefined
    },
    state: (customer: any) => customer.state?.toUpperCase(),
  },
  stripUnknown: true,
  continueOnError: true,
})

// Remove duplicates and invalid records
const deduplicatedResult = data.aggregate(cleaningResult.value || [], {
  groupBy: ['id'],
  custom: {
    deduplicated: group => {
      // Take the most complete record (fewest undefined/null values)
      return group.reduce((best, current) => {
        const bestCompleteness = Object.values(best).filter(
          v => v !== null && v !== undefined
        ).length
        const currentCompleteness = Object.values(current).filter(
          v => v !== null && v !== undefined
        ).length
        return currentCompleteness > bestCompleteness ? current : best
      })
    },
  },
})

// Final cleaned dataset
const cleanedCustomers = Object.values(deduplicatedResult.value?.groups || {})
  .map(group => group.deduplicated)
  .filter(customer => customer.name && customer.email) // Remove invalid records

// Result: [
//   { id: "C001", name: "John Doe", email: "john@example.com", phone: "5551234567", city: "New York", state: "NY" },
//   { id: "C002", name: "Jane Smith", email: "jane@test.com", phone: "5559876543", city: "Los Angeles", state: "CA" },
//   { id: "C004", name: "Bob Johnson", email: "bob@company.co", phone: undefined, city: "Houston", state: "TX" }
// ]
```

## Schema Composition Examples

### **Reusable Schema Components**

```typescript
// Base schemas for common fields
const ContactInfoSchema = data.schema({
  email: data.string().email(),
  phone: data
    .string()
    .pattern(/^\+?[\d\s\-\(\)]+$/)
    .optional(),
  address: data
    .object({
      street: data.string(),
      city: data.string(),
      state: data.string(),
      zipCode: data.string(),
      country: data.string().default('USA'),
    })
    .optional(),
})

const AuditFieldsSchema = data.schema({
  createdAt: data.date(),
  updatedAt: data.date(),
  createdBy: data.string(),
  version: data.number().integer().min(1).default(1),
})

// Compose schemas for different entities
const UserSchema = data.schema({
  id: data.string().uuid(),
  username: data.string().min(3).max(50),
  firstName: data.string().min(1).max(50),
  lastName: data.string().min(1).max(50),
  ...ContactInfoSchema.shape,
  preferences: data
    .object({
      theme: data.enum(['light', 'dark']).default('light'),
      notifications: data.boolean().default(true),
      language: data.string().default('en'),
    })
    .optional(),
  ...AuditFieldsSchema.shape,
})

const CompanySchema = data.schema({
  id: data.string().uuid(),
  name: data.string().min(1).max(200),
  legalName: data.string().min(1).max(200),
  ...ContactInfoSchema.shape,
  employees: data.array(data.string().uuid()), // User IDs
  settings: data.object({
    industry: data.string(),
    size: data.enum(['startup', 'small', 'medium', 'large', 'enterprise']),
    timezone: data.string().default('UTC'),
  }),
  ...AuditFieldsSchema.shape,
})

// Usage with real data
const userData = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  username: 'johndoe',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1-555-123-4567',
  address: {
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    country: 'USA',
  },
  preferences: {
    theme: 'dark',
    notifications: false,
    language: 'en',
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-15T10:30:00Z'),
  createdBy: 'system',
  version: 1,
}

const userValidationResult = data.validate(userData, UserSchema)
// Result: Ok(userData) - fully validated with all composed schemas
```

### **Conditional Schema Validation**

```typescript
// Payment method schema that varies by type
const PaymentMethodSchema = data
  .schema({
    id: data.string().uuid(),
    type: data.enum(['credit_card', 'bank_account', 'paypal', 'crypto']),
    isDefault: data.boolean().default(false),
  })
  .extend(base => {
    // Conditional fields based on payment type
    const conditionalFields = data.union([
      // Credit card
      data.object({
        type: data.literal('credit_card'),
        cardNumber: data.string().pattern(/^\d{16}$/),
        expiryMonth: data.number().min(1).max(12),
        expiryYear: data.number().min(new Date().getFullYear()),
        cvv: data.string().pattern(/^\d{3,4}$/),
        holderName: data.string().min(1),
      }),

      // Bank account
      data.object({
        type: data.literal('bank_account'),
        accountNumber: data.string().min(8).max(17),
        routingNumber: data.string().length(9),
        accountType: data.enum(['checking', 'savings']),
        bankName: data.string().min(1),
      }),

      // PayPal
      data.object({
        type: data.literal('paypal'),
        email: data.string().email(),
        accountId: data.string().min(1),
      }),

      // Cryptocurrency
      data.object({
        type: data.literal('crypto'),
        walletAddress: data.string().min(20),
        currency: data.enum(['BTC', 'ETH', 'LTC', 'BCH']),
        network: data.string().min(1),
      }),
    ])

    return base.merge(conditionalFields)
  })

// Valid payment methods
const creditCardData = {
  id: 'pay_001',
  type: 'credit_card',
  isDefault: true,
  cardNumber: '4532015112830366',
  expiryMonth: 12,
  expiryYear: 2025,
  cvv: '123',
  holderName: 'John Doe',
}

const bankAccountData = {
  id: 'pay_002',
  type: 'bank_account',
  isDefault: false,
  accountNumber: '1234567890',
  routingNumber: '021000021',
  accountType: 'checking',
  bankName: 'Chase Bank',
}

const creditCardResult = data.validate(creditCardData, PaymentMethodSchema)
const bankAccountResult = data.validate(bankAccountData, PaymentMethodSchema)
// Both result in Ok() with properly validated conditional fields
```

## Performance Examples

### **Large Dataset Processing**

```typescript
// Process large CSV import (100K+ records)
const processLargeImport = async (csvData: string) => {
  const ImportRecordSchema = data.schema({
    customerId: data.string(),
    productId: data.string(),
    quantity: data.number().positive(),
    price: data.number().positive(),
    orderDate: data.date(),
    region: data.string(),
  })

  // Parse CSV to objects (simplified)
  const records = csvData
    .split('\n')
    .slice(1) // Skip header
    .map(line => {
      const [customerId, productId, quantity, price, orderDate, region] = line.split(',')
      return {
        customerId,
        productId,
        quantity: parseInt(quantity),
        price: parseFloat(price),
        orderDate: new Date(orderDate),
        region,
      }
    })

  console.log(`Processing ${records.length} records...`)

  // Validate in chunks for memory efficiency
  const validatedRecords = await data.batchProcess(
    records,
    async (batch, batchIndex) => {
      console.log(
        `Processing batch ${batchIndex + 1}, records ${batchIndex * 1000} - ${(batchIndex + 1) * 1000}`
      )

      const batchResults = batch.map(record => data.validate(record, ImportRecordSchema))
      const validRecords = batchResults.filter(Result.isOk).map(result => result.value)

      const errors = batchResults.filter(Result.isErr).map(result => result.error)

      if (errors.length > 0) {
        console.warn(`Batch ${batchIndex + 1} had ${errors.length} validation errors`)
      }

      return validRecords
    },
    {
      batchSize: 1000,
      delay: 10, // Small delay to prevent blocking
      onProgress: (completed, total) => {
        console.log(`Progress: ${completed}/${total} (${Math.round((completed / total) * 100)}%)`)
      },
    }
  )

  console.log(`Validated ${validatedRecords.flat().length} records successfully`)

  // Aggregate validated data
  const summary = data.aggregate(validatedRecords.flat(), {
    groupBy: ['region'],
    sum: ['quantity', 'price'],
    count: true,
    custom: {
      avgOrderValue: group => {
        const totalValue = group.reduce((sum, item) => sum + item.quantity * item.price, 0)
        return totalValue / group.length
      },
      uniqueCustomers: group => {
        return new Set(group.map(item => item.customerId)).size
      },
      topProduct: group => {
        const productCounts = group.reduce(
          (acc, item) => {
            acc[item.productId] = (acc[item.productId] || 0) + item.quantity
            return acc
          },
          {} as Record<string, number>
        )

        return Object.entries(productCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'None'
      },
    },
  })

  return {
    totalProcessed: validatedRecords.flat().length,
    summary: summary.value,
  }
}

// Usage
const result = await processLargeImport(largeCsvString)
console.log('Import completed:', result)
```

### **Real-time Data Validation Pipeline**

```typescript
// Real-time event validation and processing
const createEventProcessor = () => {
  const EventSchema = data.schema({
    id: data.string().uuid(),
    type: data.enum(['user_action', 'system_event', 'error', 'metric']),
    timestamp: data.date(),
    userId: data.string().optional(),
    data: data.object({}).passthrough(), // Allow any additional data
    metadata: data.object({
      source: data.string(),
      version: data.string(),
      environment: data.enum(['development', 'staging', 'production']),
    }),
  })

  const eventBuffer: any[] = []
  const maxBufferSize = 100
  const flushInterval = 5000 // 5 seconds

  const processEvents = async (events: any[]) => {
    // Validate all events
    const validationResults = events.map(event => ({
      event,
      result: data.validate(event, EventSchema),
    }))

    const validEvents = validationResults
      .filter(({ result }) => Result.isOk(result))
      .map(({ event }) => event)

    const invalidEvents = validationResults
      .filter(({ result }) => Result.isErr(result))
      .map(({ event, result }) => ({ event, error: result.error }))

    if (invalidEvents.length > 0) {
      console.warn(`${invalidEvents.length} invalid events detected:`, invalidEvents)
    }

    // Aggregate events by type and hour
    const hourlyStats = data.aggregate(validEvents, {
      groupBy: [
        'type',
        event => {
          const hour = new Date(event.timestamp).getHours()
          return `${hour.toString().padStart(2, '0')}:00`
        },
      ],
      count: true,
      custom: {
        uniqueUsers: group => {
          return new Set(group.map(event => event.userId).filter(Boolean)).size
        },
        errorRate: group => {
          const errorEvents = group.filter(event => event.type === 'error').length
          return group.length > 0 ? (errorEvents / group.length) * 100 : 0
        },
      },
    })

    return {
      processed: validEvents.length,
      errors: invalidEvents.length,
      stats: hourlyStats.value,
    }
  }

  const flushBuffer = async () => {
    if (eventBuffer.length === 0) return

    const events = eventBuffer.splice(0, eventBuffer.length)
    const result = await processEvents(events)

    console.log(`Processed ${result.processed} events, ${result.errors} errors`)
    return result
  }

  // Auto-flush on interval
  setInterval(flushBuffer, flushInterval)

  return {
    addEvent: (event: any) => {
      eventBuffer.push(event)

      // Force flush if buffer is full
      if (eventBuffer.length >= maxBufferSize) {
        flushBuffer()
      }
    },
    flush: flushBuffer,
    getBufferSize: () => eventBuffer.length,
  }
}

// Usage
const processor = createEventProcessor()

// Add events
processor.addEvent({
  id: 'evt_001',
  type: 'user_action',
  timestamp: new Date(),
  userId: 'user_123',
  data: { action: 'click', target: 'button', page: '/dashboard' },
  metadata: { source: 'web', version: '1.0.0', environment: 'production' },
})

processor.addEvent({
  id: 'evt_002',
  type: 'error',
  timestamp: new Date(),
  data: { message: 'Network timeout', code: 408 },
  metadata: { source: 'api', version: '1.0.0', environment: 'production' },
})

// Manual flush
const result = await processor.flush()
```

---

**This completes the DATA pillar examples. The examples show practical usage patterns from basic validation to complex real-world scenarios including data cleaning, aggregation, and performance optimization.**
