# Functional Programming Utilities

Functional programming utilities for composing and transforming data.

## Core Composition

### pipe()

Compose functions from left to right:

```typescript
const processData = pipe(
  data => validate(data),
  data => transform(data),
  data => format(data)
)
```

### compose()

Compose functions from right to left:

```typescript
const processData = compose(
  format,
  transform,
  validate
)
```

### identity()

Return the input unchanged:

```typescript
const result = identity(data) // Returns data as-is
```

## Array Operations

### map()

Transform array elements:

```typescript
const numbers = [1, 2, 3, 4, 5]
const doubled = map(numbers, x => x * 2)
// Result: [2, 4, 6, 8, 10]
```

### filter()

Filter array elements:

```typescript
const numbers = [1, 2, 3, 4, 5]
const evens = filter(numbers, x => x % 2 === 0)
// Result: [2, 4]
```

### reduce()

Reduce array to single value:

```typescript
const numbers = [1, 2, 3, 4, 5]
const sum = reduce(numbers, (acc, x) => acc + x, 0)
// Result: 15
```

## Async Operations

### asyncPipe()

Async version of pipe:

```typescript
const processData = asyncPipe(
  async data => await validate(data),
  async data => await transform(data),
  async data => await save(data)
)
```

### asyncMap()

Async array mapping:

```typescript
const urls = ['/api/users', '/api/orders', '/api/products']
const results = await asyncMap(urls, async url => await fetch(url))
```

## Error Handling

### tryCatch()

Safe function execution:

```typescript
const safeParseJson = tryCatch(
  () => JSON.parse(data),
  error => new DataError('PARSE_ERROR', error.message)
)
```

### recover()

Recover from errors:

```typescript
const result = recover(
  riskOperation,
  error => fallbackValue
)
```

## Object Utilities

### pick()

Select object properties:

```typescript
const user = { id: 1, name: 'John', email: 'john@example.com', password: 'secret' }
const publicUser = pick(user, ['id', 'name', 'email'])
// Result: { id: 1, name: 'John', email: 'john@example.com' }
```

### omit()

Exclude object properties:

```typescript
const user = { id: 1, name: 'John', email: 'john@example.com', password: 'secret' }
const publicUser = omit(user, ['password'])
// Result: { id: 1, name: 'John', email: 'john@example.com' }
```

### merge()

Merge objects:

```typescript
const defaults = { timeout: 5000, retries: 3 }
const options = { timeout: 10000 }
const config = merge(defaults, options)
// Result: { timeout: 10000, retries: 3 }
```

## Logic Utilities

### when()

Conditional execution:

```typescript
const processUser = when(
  user => user.active,
  user => activateUser(user)
)
```

### unless()

Inverse conditional execution:

```typescript
const processUser = unless(
  user => user.deleted,
  user => processActiveUser(user)
)
```

### cond()

Multi-condition branching:

```typescript
const processUser = cond([
  [user => user.type === 'admin', processAdmin],
  [user => user.type === 'user', processUser],
  [user => user.type === 'guest', processGuest]
])
```

## Usage Examples

### Data Processing Pipeline

```typescript
import { pipe, map, filter, reduce } from 'kairo/fp-utils'

const processUsers = pipe(
  users => filter(users, user => user.active),
  users => map(users, user => ({
    ...user,
    displayName: user.name.toUpperCase()
  })),
  users => reduce(users, (acc, user) => {
    acc[user.department] = acc[user.department] || []
    acc[user.department].push(user)
    return acc
  }, {} as Record<string, User[]>)
)

const groupedUsers = processUsers(allUsers)
```

### Async Data Fetching

```typescript
import { asyncPipe, asyncMap, tryCatch } from 'kairo/fp-utils'

const fetchUserData = asyncPipe(
  async (userId: string) => await service.get(`/api/users/${userId}`),
  async (userResult) => {
    if (Result.isOk(userResult)) {
      return service.get(`/api/users/${userResult.value.id}/profile`)
    }
    return userResult
  },
  async (profileResult) => {
    if (Result.isOk(profileResult)) {
      return service.get(`/api/users/${profileResult.value.userId}/permissions`)
    }
    return profileResult
  }
)

const userData = await fetchUserData('user-123')
```

### Error Recovery

```typescript
import { tryCatch, recover } from 'kairo/fp-utils'

const safeApiCall = recover(
  () => tryCatch(
    () => service.get('/api/data'),
    error => new ServiceError('API_ERROR', error.message)
  ),
  error => Result.Ok({ data: [], cached: true })
)

const result = await safeApiCall()
```

## Next Steps

- [Type Utilities](/api/type-utils)
- [Examples](/examples/)
- [Architecture Guide](/guide/architecture)