# Migrating from RxJS

A comprehensive guide to migrating from RxJS to Kairo's pipeline composition patterns.

## Why Migrate?

While RxJS is powerful for reactive programming, Kairo provides:

- **Simpler mental model** - No complex operators or subscription management
- **Result pattern integration** - Consistent error handling across all operations
- **Configuration objects** - Clear, declarative syntax instead of operator chains
- **TypeScript-first** - Better type safety and inference
- **Lighter weight** - Smaller bundle size without complex observables

## Key Differences

### RxJS vs Kairo Philosophy

```typescript
// RxJS - Reactive streams with operators
import { of, map, filter, catchError } from 'rxjs'

const stream$ = of(data).pipe(
  map(item => transform(item)),
  filter(item => item.active),
  catchError(err => of(fallback))
)

// Kairo - Functional pipelines with Result pattern
import { pipeline, Result } from 'kairo'

const process = pipeline.compose([
  data => pipeline.map(data, transform),
  data => pipeline.filter(data, item => item.active),
  data => Result.isErr(data) ? Result.Ok(fallback) : data
])
```

## Common Pattern Migrations

### Basic Transformations

```typescript
// RxJS
import { of, map, filter } from 'rxjs'

const processed$ = of(users).pipe(
  map(users => users.filter(user => user.active)),
  map(users => users.map(user => user.name))
)

// Kairo
import { pipeline } from 'kairo'

const processed = pipeline.compose([
  users => pipeline.filter(users, user => user.active),
  users => pipeline.map(users, user => user.name)
])(users)
```

### Async Operations

```typescript
// RxJS
import { from, mergeMap, map } from 'rxjs'

const fetchUsers$ = from(userIds).pipe(
  mergeMap(id => from(fetch(`/api/users/${id}`))),
  map(response => response.json())
)

// Kairo
import { pipeline, service } from 'kairo'

const fetchUsers = pipeline.compose([
  userIds => pipeline.asyncMap(userIds, id => 
    service.get(`/api/users/${id}`)
  ),
  results => pipeline.map(results, result => 
    Result.isOk(result) ? result.value : null
  )
])
```

### Error Handling

```typescript
// RxJS
import { of, map, catchError } from 'rxjs'

const safe$ = of(data).pipe(
  map(data => riskyOperation(data)),
  catchError(error => of(defaultValue))
)

// Kairo
import { pipeline, Result } from 'kairo'

const safe = pipeline.compose([
  data => pipeline.tryCatch(
    () => riskyOperation(data),
    error => new ProcessingError('OPERATION_FAILED', error.message)
  ),
  result => Result.isErr(result) ? Result.Ok(defaultValue) : result
])
```

## Operator Migrations

### Map

```typescript
// RxJS
import { of, map } from 'rxjs'

const doubled$ = of([1, 2, 3]).pipe(
  map(arr => arr.map(x => x * 2))
)

// Kairo
import { pipeline } from 'kairo'

const doubled = pipeline.map([1, 2, 3], x => x * 2)
```

### Filter

```typescript
// RxJS
import { of, map } from 'rxjs'

const evens$ = of([1, 2, 3, 4]).pipe(
  map(arr => arr.filter(x => x % 2 === 0))
)

// Kairo
import { pipeline } from 'kairo'

const evens = pipeline.filter([1, 2, 3, 4], x => x % 2 === 0)
```

### Reduce

```typescript
// RxJS
import { of, reduce } from 'rxjs'

const sum$ = of(1, 2, 3, 4).pipe(
  reduce((acc, val) => acc + val, 0)
)

// Kairo
import { pipeline } from 'kairo'

const sum = pipeline.reduce([1, 2, 3, 4], (acc, val) => acc + val, 0)
```

### FlatMap/MergeMap

```typescript
// RxJS
import { of, mergeMap } from 'rxjs'

const flattened$ = of([1, 2, 3]).pipe(
  mergeMap(arr => of(...arr))
)

// Kairo
import { pipeline } from 'kairo'

const flattened = pipeline.flatMap([1, 2, 3], x => [x])
```

### CombineLatest

```typescript
// RxJS
import { combineLatest, map } from 'rxjs'

const combined$ = combineLatest([stream1$, stream2$]).pipe(
  map(([a, b]) => ({ a, b }))
)

// Kairo
import { pipeline } from 'kairo'

const combined = pipeline.parallel([
  () => getStream1Data(),
  () => getStream2Data()
]).then(([a, b]) => ({ a, b }))
```

### Debounce/Throttle

```typescript
// RxJS
import { fromEvent, debounceTime, throttleTime } from 'rxjs'

const debounced$ = fromEvent(input, 'keyup').pipe(
  debounceTime(300)
)

const throttled$ = fromEvent(button, 'click').pipe(
  throttleTime(1000)
)

// Kairo
import { pipeline } from 'kairo'

const debouncedHandler = pipeline.debounce(handleInput, 300)
const throttledHandler = pipeline.throttle(handleClick, 1000)
```

## Complex Pattern Migrations

### HTTP Requests with Retry

```typescript
// RxJS
import { ajax } from 'rxjs/ajax'
import { retry, catchError, map } from 'rxjs'

const apiCall$ = ajax.getJSON('/api/data').pipe(
  retry(3),
  map(response => response.data),
  catchError(error => of({ error: true, message: error.message }))
)

// Kairo
import { service, Result } from 'kairo'

const apiCall = async () => {
  const result = await service.get('/api/data', {
    retry: { attempts: 3 }
  })
  
  return Result.match(result, {
    Ok: response => response.data,
    Err: error => ({ error: true, message: error.message })
  })
}
```

### Data Transformation Pipeline

```typescript
// RxJS
import { of, map, filter, scan } from 'rxjs'

const pipeline$ = of(rawData).pipe(
  map(data => validateData(data)),
  filter(data => data.valid),
  map(data => normalizeData(data)),
  scan((acc, item) => [...acc, item], [])
)

// Kairo
import { pipeline, data } from 'kairo'

const processPipeline = pipeline.compose([
  data => data.validate(data, DataSchema),
  result => Result.isOk(result) ? result.value : [],
  data => pipeline.map(data, item => normalizeData(item)),
  data => pipeline.reduce(data, (acc, item) => [...acc, item], [])
])
```

### Conditional Processing

```typescript
// RxJS
import { of, map, switchMap } from 'rxjs'

const conditional$ = of(user).pipe(
  switchMap(user => 
    user.isAdmin 
      ? of(user).pipe(map(u => processAdmin(u)))
      : of(user).pipe(map(u => processUser(u)))
  )
)

// Kairo
import { pipeline } from 'kairo'

const conditional = pipeline.branch(user, [
  {
    condition: user => user.isAdmin,
    pipeline: user => processAdmin(user)
  },
  {
    condition: user => !user.isAdmin,
    pipeline: user => processUser(user)
  }
])
```

## Subject Alternatives

### BehaviorSubject → State Management

```typescript
// RxJS
import { BehaviorSubject } from 'rxjs'

class UserStore {
  private userSubject = new BehaviorSubject<User | null>(null)
  public user$ = this.userSubject.asObservable()
  
  setUser(user: User) {
    this.userSubject.next(user)
  }
  
  getUser() {
    return this.userSubject.value
  }
}

// Kairo (simple state management)
import { Result } from 'kairo'

class UserStore {
  private user: User | null = null
  private listeners: ((user: User | null) => void)[] = []
  
  setUser(user: User) {
    this.user = user
    this.listeners.forEach(listener => listener(user))
  }
  
  getUser(): User | null {
    return this.user
  }
  
  subscribe(listener: (user: User | null) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }
}
```

### ReplaySubject → Event History

```typescript
// RxJS
import { ReplaySubject } from 'rxjs'

const events$ = new ReplaySubject<Event>(10)

// Kairo (simple event history)
class EventHistory {
  private events: Event[] = []
  private maxSize = 10
  
  add(event: Event) {
    this.events.push(event)
    if (this.events.length > this.maxSize) {
      this.events.shift()
    }
  }
  
  getEvents(): Event[] {
    return [...this.events]
  }
  
  getLast(count: number): Event[] {
    return this.events.slice(-count)
  }
}
```

## Real-World Migration Example

### Before: RxJS-based Data Service

```typescript
import { Observable, of, from, combineLatest } from 'rxjs'
import { map, mergeMap, catchError, retry, debounceTime } from 'rxjs/operators'

class DataService {
  private searchSubject = new Subject<string>()
  
  search$ = this.searchSubject.pipe(
    debounceTime(300),
    mergeMap(query => 
      from(fetch(`/api/search?q=${query}`)).pipe(
        mergeMap(response => from(response.json())),
        retry(3),
        catchError(error => of({ error: true, results: [] }))
      )
    )
  )
  
  getUserData(userId: string): Observable<UserData> {
    return combineLatest([
      this.getUser(userId),
      this.getUserPosts(userId),
      this.getUserSettings(userId)
    ]).pipe(
      map(([user, posts, settings]) => ({
        user,
        posts,
        settings,
        lastUpdated: new Date()
      })),
      catchError(error => of({
        error: true,
        message: error.message
      }))
    )
  }
  
  private getUser(id: string): Observable<User> {
    return from(fetch(`/api/users/${id}`)).pipe(
      mergeMap(response => from(response.json())),
      retry(2)
    )
  }
  
  private getUserPosts(userId: string): Observable<Post[]> {
    return from(fetch(`/api/users/${userId}/posts`)).pipe(
      mergeMap(response => from(response.json())),
      retry(2)
    )
  }
  
  private getUserSettings(userId: string): Observable<Settings> {
    return from(fetch(`/api/users/${userId}/settings`)).pipe(
      mergeMap(response => from(response.json())),
      retry(2)
    )
  }
  
  search(query: string) {
    this.searchSubject.next(query)
  }
}
```

### After: Kairo-based Data Service

```typescript
import { service, pipeline, Result } from 'kairo'

class DataService {
  private searchHandler = pipeline.debounce(
    (query: string) => this.performSearch(query),
    300
  )
  
  async search(query: string): Promise<Result<ServiceError, SearchResults>> {
    return this.searchHandler(query)
  }
  
  private async performSearch(query: string): Promise<Result<ServiceError, SearchResults>> {
    return service.get(`/api/search`, {
      params: { q: query },
      retry: { attempts: 3 },
      timeout: 5000
    })
  }
  
  async getUserData(userId: string): Promise<Result<ServiceError, UserData>> {
    const fetchPipeline = pipeline.compose([
      // Fetch all data in parallel
      (id: string) => pipeline.parallel([
        () => this.getUser(id),
        () => this.getUserPosts(id),
        () => this.getUserSettings(id)
      ]),
      
      // Combine results
      (results: [Result<ServiceError, User>, Result<ServiceError, Post[]>, Result<ServiceError, Settings>]) => {
        const [userResult, postsResult, settingsResult] = results
        
        // Check if all requests succeeded
        if (Result.isOk(userResult) && Result.isOk(postsResult) && Result.isOk(settingsResult)) {
          return Result.Ok({
            user: userResult.value,
            posts: postsResult.value,
            settings: settingsResult.value,
            lastUpdated: new Date()
          })
        }
        
        // Return first error found
        const error = Result.isErr(userResult) ? userResult.error :
                     Result.isErr(postsResult) ? postsResult.error :
                     settingsResult.error
        return Result.Err(error)
      }
    ])
    
    return fetchPipeline(userId)
  }
  
  private async getUser(id: string): Promise<Result<ServiceError, User>> {
    return service.get(`/api/users/${id}`, {
      retry: { attempts: 2 },
      timeout: 3000
    })
  }
  
  private async getUserPosts(userId: string): Promise<Result<ServiceError, Post[]>> {
    return service.get(`/api/users/${userId}/posts`, {
      retry: { attempts: 2 },
      timeout: 3000
    })
  }
  
  private async getUserSettings(userId: string): Promise<Result<ServiceError, Settings>> {
    return service.get(`/api/users/${userId}/settings`, {
      retry: { attempts: 2 },
      timeout: 3000
    })
  }
}

// Usage
const dataService = new DataService()

// Search
const searchResult = await dataService.search('user query')
Result.match(searchResult, {
  Ok: results => console.log('Search results:', results),
  Err: error => console.error('Search failed:', error.message)
})

// Get user data
const userDataResult = await dataService.getUserData('user-123')
Result.match(userDataResult, {
  Ok: userData => console.log('User data:', userData),
  Err: error => console.error('Failed to get user data:', error.message)
})
```

## Migration Benefits

### Bundle Size Reduction

```typescript
// RxJS bundle impact
import { Observable, of, from, combineLatest } from 'rxjs'
import { map, mergeMap, catchError, retry, debounceTime } from 'rxjs/operators'
// ~30kb+ when tree-shaken

// Kairo bundle impact
import { service, pipeline, Result } from 'kairo'
// ~5kb when tree-shaken
```

### Simpler Error Handling

```typescript
// RxJS - Multiple error handling patterns
observable$.pipe(
  catchError(error => of(fallback)),
  finalize(() => cleanup())
).subscribe({
  next: value => handle(value),
  error: error => handleError(error)
})

// Kairo - Consistent Result pattern
const result = await operation()
Result.match(result, {
  Ok: value => handle(value),
  Err: error => handleError(error)
})
```

### Better TypeScript Support

```typescript
// RxJS - Complex type inference
const stream$: Observable<ProcessedData> = source$.pipe(
  map((data: RawData) => process(data)),
  filter((data: ProcessedData) => data.valid)
)

// Kairo - Clear type inference
const process = pipeline.compose([
  (data: RawData) => pipeline.map(data, item => processItem(item)),
  (data: ProcessedData[]) => pipeline.filter(data, item => item.valid)
])
```

## Migration Checklist

- [ ] Identify reactive patterns in your RxJS code
- [ ] Replace observables with async functions and Result pattern
- [ ] Convert operators to pipeline functions
- [ ] Replace subjects with simple state management
- [ ] Update error handling to use Result pattern
- [ ] Replace subscription management with async/await
- [ ] Test for performance improvements
- [ ] Remove RxJS dependency

## Migration Strategy

1. **Start with simple operations** - Map, filter, reduce
2. **Replace HTTP calls** - Convert to service calls with Result pattern
3. **Simplify error handling** - Use Result pattern throughout
4. **Remove complex operators** - Replace with pipeline composition
5. **Update state management** - Use simple patterns instead of subjects
6. **Test thoroughly** - Ensure all async operations work correctly

## Next Steps

- [Pipeline Composition](/api/pipeline/compose)
- [Service Layer](/api/service/)
- [Async Patterns](/examples/workflows)