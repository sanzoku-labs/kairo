# Transform API

The Transform API provides declarative data mapping and conversion capabilities as part of Kairo's DATA pillar.

## Overview

Transforms enable you to convert data from one schema to another using a declarative API. They support field mapping, computed fields, filtering, and validation.

## Basic Usage

```typescript
import { transform, nativeSchema } from 'kairo'

const APIUserSchema = nativeSchema.object({
  user_id: nativeSchema.string(),
  user_name: nativeSchema.string(),
  user_email: nativeSchema.string(),
  created_at: nativeSchema.string(),
  is_active: nativeSchema.boolean(),
})

const InternalUserSchema = nativeSchema.object({
  id: nativeSchema.string(),
  name: nativeSchema.string(),
  email: nativeSchema.string(),
  createdAt: nativeSchema.string(),
  displayName: nativeSchema.string(),
})

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
const result = await userTransform.execute(apiUserData)
result.match({
  Ok: user => console.log('Transformed user:', user),
  Err: error => console.error('Transform error:', error),
})
```

## API Reference

### `transform(name, sourceSchema)`

Creates a new transform builder.

**Parameters:**

- `name: string` - Unique identifier for the transform
- `sourceSchema: Schema<T>` - Source data schema

**Returns:** `TransformBuilder<T>`

### Transform Builder Methods

#### `.to(targetSchema)`

Specifies the target schema for the transformation.

```typescript
const transform = transform('example', SourceSchema).to(TargetSchema)
```

#### `.map(sourceField, targetField, transformer?)`

Maps a field from source to target, optionally applying a transformation function.

```typescript
// Simple field mapping
.map('user_name', 'name')

// Field mapping with transformation
.map('created_at', 'createdAt', source => new Date(source.created_at))

// Nested field mapping
.map('profile.contact.email', 'email')
```

**Parameters:**

- `sourceField: string` - Source field path (supports dot notation)
- `targetField: string` - Target field name
- `transformer?: (source: SourceType) => any` - Optional transformation function

#### `.compute(targetField, computer)`

Computes a new field based on the source data.

```typescript
.compute('displayName', source => `${source.firstName} ${source.lastName}`)
.compute('age', source => calculateAge(source.birthDate))
```

**Parameters:**

- `targetField: string` - Target field name
- `computer: (source: SourceType) => any` - Computation function

#### `.filter(predicate)`

Filters source data based on a predicate function.

```typescript
.filter(user => user.isActive)
.filter(order => order.status === 'confirmed')
```

**Parameters:**

- `predicate: (source: SourceType) => boolean` - Filter function

#### `.validate()`

Enables validation of the transformed data against the target schema.

```typescript
.validate()
```

#### `.pipe(otherTransform)`

Chains multiple transforms together.

```typescript
const fullTransform = apiToInternal.pipe(internalToDisplay)
```

**Parameters:**

- `otherTransform: Transform<T, U>` - Transform to chain

### Transform Instance Methods

#### `.execute(data)`

Executes the transform on a single data item.

```typescript
const result = await transform.execute(sourceData)
```

**Parameters:**

- `data: SourceType` - Source data to transform

**Returns:** `Promise<Result<TransformError, TargetType>>`

#### `.executeMany(dataArray)`

Executes the transform on an array of data items.

```typescript
const results = await transform.executeMany(sourceDataArray)
```

**Parameters:**

- `dataArray: SourceType[]` - Array of source data to transform

**Returns:** `Promise<Result<TransformError, TargetType[]>>`

## Pipeline Integration

Transforms integrate seamlessly with pipelines:

```typescript
const processUser = pipeline('process-user')
  .input(APIUserSchema)
  .transform(userTransform)
  .pipeline(UserAPI.create)
  .trace('user-processing')
```

## Common Transformations

### String Operations

```typescript
import { commonTransforms } from 'kairo'

.map('text', 'upperText', () => commonTransforms.toUpperCase(source.text))
.map('text', 'trimmedText', () => commonTransforms.trim(source.text))
.map('name', 'slug', () => commonTransforms.slugify(source.name))
```

### Date Operations

```typescript
.map('timestamp', 'date', source => new Date(source.timestamp))
.map('dateString', 'isoDate', source => new Date(source.dateString).toISOString())
```

### Nested Object Mapping

```typescript
// Extract nested values
.map('profile.contact.email', 'email')
.map('address.coordinates.lat', 'latitude')

// Map entire nested objects
.compute('contact', source => ({
  email: source.profile.email,
  phone: source.profile.phone,
}))
```

## Error Handling

Transform errors provide detailed context:

```typescript
const result = await transform.execute(data)
if (Result.isErr(result)) {
  console.error('Transform failed:', {
    code: result.error.code,
    message: result.error.message,
    field: result.error.context.field,
    value: result.error.context.value,
  })
}
```

## Type Safety

Transforms maintain full type safety throughout the transformation process:

```typescript
// TypeScript will infer the correct types
const userTransform = transform('user', APIUserSchema)
  .to(InternalUserSchema)
  .map('user_name', 'name') // ✅ Type-safe field mapping
  .compute('displayName', source => {
    // source is typed as APIUser
    return `${source.user_name} <${source.user_email}>`
  })

// Result is typed as Result<TransformError, InternalUser>
const result = await userTransform.execute(apiUser)
```
