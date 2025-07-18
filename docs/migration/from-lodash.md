# Migrating from Lodash

A comprehensive guide to migrating from Lodash to Kairo's functional programming utilities and DATA pillar.

## Why Migrate?

While Lodash is excellent for utility functions, Kairo provides:

- **Result pattern integration** - Consistent error handling
- **Schema validation** - Type-safe data operations
- **Pipeline composition** - Functional programming patterns
- **TypeScript-first** - Better type safety and inference
- **Zero dependencies** - Lighter bundle size

## Quick Migration

### Before (Lodash)

```javascript
import _ from 'lodash'

const users = [
  { id: 1, name: 'John', department: 'Engineering' },
  { id: 2, name: 'Jane', department: 'Marketing' },
  { id: 3, name: 'Bob', department: 'Engineering' }
]

const engineeringUsers = _.filter(users, user => user.department === 'Engineering')
const names = _.map(engineeringUsers, 'name')
const grouped = _.groupBy(users, 'department')
```

### After (Kairo)

```typescript
import { data, pipeline, Result } from '@sanzoku-labs/kairo'

const users = [
  { id: 1, name: 'John', department: 'Engineering' },
  { id: 2, name: 'Jane', department: 'Marketing' },
  { id: 3, name: 'Bob', department: 'Engineering' }
]

const processUsers = pipeline.compose([
  users => pipeline.filter(users, user => user.department === 'Engineering'),
  users => pipeline.map(users, user => user.name)
])

const result = processUsers(users)
const grouped = data.aggregate(users, { groupBy: ['department'] })
```

## Array Operations

### Map

```typescript
// Lodash
const doubled = _.map([1, 2, 3], x => x * 2)
const names = _.map(users, 'name')

// Kairo
const doubled = pipeline.map([1, 2, 3], x => x * 2)
const names = pipeline.map(users, user => user.name)
```

### Filter

```typescript
// Lodash
const evens = _.filter([1, 2, 3, 4], x => x % 2 === 0)
const active = _.filter(users, 'active')

// Kairo
const evens = pipeline.filter([1, 2, 3, 4], x => x % 2 === 0)
const active = pipeline.filter(users, user => user.active)
```

### Reduce

```typescript
// Lodash
const sum = _.reduce([1, 2, 3, 4], (acc, x) => acc + x, 0)

// Kairo
const sum = pipeline.reduce([1, 2, 3, 4], (acc, x) => acc + x, 0)
```

### Find

```typescript
// Lodash
const user = _.find(users, { id: 1 })
const userByName = _.find(users, user => user.name === 'John')

// Kairo
const user = pipeline.find(users, user => user.id === 1)
const userByName = pipeline.find(users, user => user.name === 'John')
```

## Object Operations

### Pick

```typescript
// Lodash
const publicUser = _.pick(user, ['id', 'name', 'email'])

// Kairo
const publicUser = data.pick(user, ['id', 'name', 'email'])
```

### Omit

```typescript
// Lodash
const safeUser = _.omit(user, ['password', 'secret'])

// Kairo
const safeUser = data.omit(user, ['password', 'secret'])
```

### Merge

```typescript
// Lodash
const merged = _.merge(defaults, options)

// Kairo
const merged = data.merge(defaults, options)
```

### Deep Clone

```typescript
// Lodash
const cloned = _.cloneDeep(original)

// Kairo
const cloned = data.deepClone(original)
```

## Collection Operations

### GroupBy

```typescript
// Lodash
const grouped = _.groupBy(users, 'department')

// Kairo
const grouped = data.aggregate(users, {
  groupBy: ['department']
})
```

### Uniq

```typescript
// Lodash
const unique = _.uniq([1, 2, 2, 3, 3, 4])
const uniqueBy = _.uniqBy(users, 'email')

// Kairo
const unique = pipeline.uniq([1, 2, 2, 3, 3, 4])
const uniqueBy = pipeline.uniqBy(users, user => user.email)
```

### Sort

```typescript
// Lodash
const sorted = _.sortBy(users, 'name')
const sortedDesc = _.orderBy(users, ['name'], ['desc'])

// Kairo
const sorted = pipeline.sort(users, (a, b) => a.name.localeCompare(b.name))
const sortedDesc = pipeline.sort(users, (a, b) => b.name.localeCompare(a.name))
```

### Chunk

```typescript
// Lodash
const chunked = _.chunk([1, 2, 3, 4, 5], 2)

// Kairo
const chunked = pipeline.chunk([1, 2, 3, 4, 5], 2)
```

## String Operations

### Template

```typescript
// Lodash
const template = _.template('Hello, <%= name %>!')
const result = template({ name: 'John' })

// Kairo (using data transformation)
const template = data.template('Hello, {name}!')
const result = data.interpolate(template, { name: 'John' })
```

### Capitalize

```typescript
// Lodash
const capitalized = _.capitalize('hello world')

// Kairo
const capitalized = data.transform('hello world', {
  case: 'capitalize'
})
```

### Snake Case / Camel Case

```typescript
// Lodash
const snake = _.snakeCase('helloWorld')
const camel = _.camelCase('hello_world')

// Kairo
const snake = data.transform('helloWorld', { case: 'snake' })
const camel = data.transform('hello_world', { case: 'camel' })
```

## Utility Functions

### Debounce

```typescript
// Lodash
const debouncedSearch = _.debounce(search, 300)

// Kairo
const debouncedSearch = pipeline.debounce(search, 300)
```

### Throttle

```typescript
// Lodash
const throttledScroll = _.throttle(onScroll, 100)

// Kairo
const throttledScroll = pipeline.throttle(onScroll, 100)
```

### IsEmpty

```typescript
// Lodash
const isEmpty = _.isEmpty(value)

// Kairo
const isEmpty = data.isEmpty(value)
```

### Get/Set

```typescript
// Lodash
const value = _.get(object, 'user.profile.name', 'default')
_.set(object, 'user.profile.name', 'John')

// Kairo
const value = data.get(object, 'user.profile.name', 'default')
const updated = data.set(object, 'user.profile.name', 'John')
```

## Advanced Patterns

### Chaining vs Composition

```typescript
// Lodash (chaining)
const result = _(users)
  .filter(user => user.active)
  .map(user => user.name)
  .uniq()
  .sort()
  .value()

// Kairo (composition)
const processUsers = pipeline.compose([
  users => pipeline.filter(users, user => user.active),
  users => pipeline.map(users, user => user.name),
  users => pipeline.uniq(users),
  users => pipeline.sort(users)
])

const result = processUsers(users)
```

### Flow vs Pipe

```typescript
// Lodash
const processData = _.flow([
  data => _.filter(data, 'active'),
  data => _.map(data, 'name'),
  data => _.uniq(data)
])

// Kairo
const processData = pipeline.pipe(
  data => pipeline.filter(data, item => item.active),
  data => pipeline.map(data, item => item.name),
  data => pipeline.uniq(data)
)
```

## Data Validation Migration

### Manual Validation (Lodash)

```javascript
const validateUser = (user) => {
  if (!_.isString(user.name) || _.isEmpty(user.name)) {
    throw new Error('Name is required')
  }
  if (!_.isString(user.email) || !_.includes(user.email, '@')) {
    throw new Error('Valid email is required')
  }
  if (!_.isNumber(user.age) || user.age < 0) {
    throw new Error('Age must be a positive number')
  }
  return user
}
```

### Schema Validation (Kairo)

```typescript
const UserSchema = data.schema({
  name: { type: 'string', min: 1 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0 }
})

const validateUser = (user: unknown) => {
  return data.validate(user, UserSchema)
}

// Usage
const result = validateUser(userData)
Result.match(result, {
  Ok: user => console.log('Valid user:', user),
  Err: error => console.error('Validation error:', error.message)
})
```

## Performance Considerations

### Lodash Bundle Size

```javascript
// Full lodash (large bundle)
import _ from 'lodash'

// Cherry-picked functions (smaller bundle)
import map from 'lodash/map'
import filter from 'lodash/filter'
import groupBy from 'lodash/groupBy'
```

### Kairo Tree Shaking

```typescript
// Kairo (tree-shakable by default)
import { data, pipeline } from '@sanzoku-labs/kairo'

// Or import specific functions
import { map, filter } from 'kairo/pipeline'
import { aggregate } from 'kairo/data'
```

## Complete Migration Example

### Before: Lodash-based Data Processing

```javascript
import _ from 'lodash'

class DataProcessor {
  processUsers(users) {
    try {
      // Validate users
      if (!_.isArray(users)) {
        throw new Error('Users must be an array')
      }

      // Filter active users
      const activeUsers = _.filter(users, 'active')

      // Transform data
      const transformed = _.map(activeUsers, user => ({
        ...user,
        fullName: `${user.firstName} ${user.lastName}`,
        displayName: _.startCase(user.name)
      }))

      // Group by department
      const grouped = _.groupBy(transformed, 'department')

      // Calculate statistics
      const stats = _.mapValues(grouped, group => ({
        count: group.length,
        avgAge: _.meanBy(group, 'age'),
        names: _.map(group, 'fullName')
      }))

      return stats
    } catch (error) {
      throw new Error(`Data processing failed: ${error.message}`)
    }
  }
}
```

### After: Kairo-based Data Processing

```typescript
import { data, pipeline, Result } from '@sanzoku-labs/kairo'

const UserSchema = data.schema({
  id: { type: 'string' },
  firstName: { type: 'string' },
  lastName: { type: 'string' },
  name: { type: 'string' },
  age: { type: 'number', min: 0 },
  department: { type: 'string' },
  active: { type: 'boolean' }
})

class DataProcessor {
  processUsers(users: unknown): Result<ProcessingError, UserStats> {
    // Validate input
    const validationResult = data.validate(users, data.schema({
      users: { type: 'array', items: UserSchema }
    }))

    if (Result.isErr(validationResult)) {
      return validationResult
    }

    // Create processing pipeline
    const processingPipeline = pipeline.compose([
      // Filter active users
      users => pipeline.filter(users, user => user.active),
      
      // Transform data
      users => pipeline.map(users, user => ({
        ...user,
        fullName: `${user.firstName} ${user.lastName}`,
        displayName: this.startCase(user.name)
      })),
      
      // Group and aggregate
      users => data.aggregate(users, {
        groupBy: ['department'],
        count: ['total'],
        avg: ['age'],
        collect: ['fullName']
      })
    ])

    return processingPipeline(validationResult.value)
  }

  private startCase(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
}

// Usage
const processor = new DataProcessor()
const result = processor.processUsers(userData)

Result.match(result, {
  Ok: stats => console.log('Processing complete:', stats),
  Err: error => console.error('Processing failed:', error.message)
})
```

## Migration Checklist

- [ ] Replace lodash imports with kairo imports
- [ ] Update array operations to use pipeline functions
- [ ] Replace manual validation with schema validation
- [ ] Update object operations to use data functions
- [ ] Replace chaining with composition
- [ ] Add Result pattern for error handling
- [ ] Update TypeScript types
- [ ] Test for performance improvements
- [ ] Remove lodash dependency

## Common Migration Patterns

### 1. Data Transformation Pipeline

```typescript
// Replace lodash chain
const processData = pipeline.compose([
  data => data.filter(item => item.active),
  data => data.map(item => transform(item)),
  data => data.groupBy(item => item.category)
])
```

### 2. Validation with Schema

```typescript
// Replace manual validation
const validateAndProcess = (input: unknown) => {
  const validated = data.validate(input, schema)
  if (Result.isErr(validated)) return validated
  
  return pipeline.process(validated.value)
}
```

### 3. Error-Safe Operations

```typescript
// Replace try/catch with Result
const safeOperation = (data: unknown) => {
  return pipeline.tryCatch(
    () => processData(data),
    error => new ProcessingError('OPERATION_FAILED', error.message)
  )
}
```

## Next Steps

- [Data Processing Examples](/examples/data-processing)
- [Pipeline Composition](/api/pipeline/compose)
- [Schema Validation](/api/data/schema)