# Kairo API Reference for Claude Code

> Concise API surface for @sanzoku-labs/kairo v1.0.1

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
<!-- END doctoc generated TOC please keep comment here to allow auto update -->
<a name="namespaceresultmd"></a>
Kairo - Core API
Three-pillar TypeScript library with focused functionality and predictable patterns.
Built for universal compatibility across all TypeScript environments.
Architecture:

## Ok()
```ts
function Ok<T>(value): OkResult<T>;
```

Creates a successful Result containing a value.
`T`
Type of the success value
`T`
The success value to wrap
OkResult containing the value
```typescript
const user = { id: 1, name: 'John' }
// result: { tag: 'Ok', value: { id: 1, name: 'John' } }
```


## Err()
```ts
function Err<E>(error): ErrResult<E>;
```

Creates a failed Result containing an error.
`E`
Type of the error
`E`
The error to wrap
ErrResult containing the error
```typescript
const validationError = { code: 'INVALID_EMAIL', message: 'Invalid email format' }
// result: { tag: 'Err', error: { code: 'INVALID_EMAIL', ... } }
```


## isOk()
```ts
function isOk<E, T>(result): result is OkResult<T>;
```

Type guard to check if a Result is successful.
Narrows the type to OkResult for safe value access.
`E`
Error type
`T`
Success value type
Result to check
`result is OkResult<T>`
True if Result is Ok, with type narrowing
```typescript
```


## isErr()
```ts
function isErr<E, T>(result): result is ErrResult<E>;
```

Type guard to check if a Result is an error.
Narrows the type to ErrResult for safe error access.
`E`
Error type
`T`
Success value type
Result to check
`result is ErrResult<E>`
True if Result is Err, with type narrowing
```typescript
```


## map()
```ts
function map<E, T, U>(result, fn): Result<E, U>;
```

Transforms the value inside an Ok Result, leaving Err Results unchanged.
This is the functor map operation for Results.
`E`
Error type
`T`
Input value type
`U`
Output value type
Result to transform
(`value`) => `U`
Pure function to apply to the value
New Result with transformed value or original error
```typescript
const doubled = Result.map(result, x => x * 2) // Result.Ok(10)
const stillError = Result.map(error, x => x * 2) // Result.Err('failed')
```


## flatMap()
```ts
function flatMap<E, T, U>(result, fn): Result<E, U>;
```

Chains Result-returning operations, flattening nested Results.
Also known as bind or chain in functional programming.
`E`
Error type
`T`
Input value type
`U`
Output value type
Result to chain from
(`value`) => [`Result`](#result)\<`E`, `U`\>
Function that returns a new Result
Flattened Result or original error
```typescript
const validateUser = (data: unknown): Result<string, User> => { ... }
const saveUser = (user: User): Result<string, User> => { ... }
  user => saveUser(user)
```


## mapError()
```ts
function mapError<E, F, T>(result, fn): Result<F, T>;
```

Transforms the error inside an Err Result, leaving Ok Results unchanged.
Useful for error transformation and enrichment.
`E`
Input error type
`F`
Output error type
`T`
Value type
Result to transform
(`error`) => `F`
Function to transform the error
Result with transformed error or original value
```typescript
const enriched = Result.mapError(result, msg => ({
  code: 'VALIDATION_ERROR',
  message: msg,
  timestamp: Date.now()
```


## match()
```ts
function match<E, T, U>(result, handlers): U;
```

Pattern matching for Results - handles both success and error cases.
Provides exhaustive case handling with guaranteed return value.
`E`
Error type
`T`
Value type
`U`
Return type
Result to match against
Object with Ok and Err handlers
(`value`) => `U`
(`error`) => `U`
`U`
Value from appropriate handler
```typescript
  Ok: user => `Welcome, ${user.name}!`,
  Err: error => `Login failed: ${error.message}`
```


## unwrap()
```ts
function unwrap<E, T>(result): T;
```

Extracts the value from an Ok Result or throws an error.
Use with caution - prefer pattern matching or isOk checks.
`E`
Error type
`T`
Value type
Result to unwrap
`T`
The value if Ok
Error if the Result is Err
```typescript
// Prefer safe alternatives:
```


## unwrapOr()
```ts
function unwrapOr<E, T>(result, defaultValue): T;
```

Extracts the value from a Result or returns a default value.
Safe alternative to unwrap() that never throws.
`E`
Error type
`T`
Value type
Result to unwrap
`T`
Value to return if Result is Err
`T`
The value if Ok, otherwise the default value
```typescript
```


## unwrapOrElse()
```ts
function unwrapOrElse<E, T>(result, fn): T;
```

Extracts the value from a Result or computes a value from the error.
Provides error-specific recovery logic.
`E`
Error type
`T`
Value type
Result to unwrap
(`error`) => `T`
Function to compute fallback value from error
`T`
The value if Ok, otherwise computed fallback
```typescript
const result = Result.Err({ code: 'NOT_FOUND', message: 'User not found' })
const user = Result.unwrapOrElse(result, error => ({
  id: 'unknown',
  name: 'Anonymous',
  error: error.code
```


## fromPromise()
```ts
function fromPromise<T>(promise): Promise<Result<unknown, T>>;
```

Converts a Promise to a Result, catching any rejections as errors.
Essential for safe async operation handling in pipelines.
`T`
Promise value type
`Promise`\<`T`\>
Promise to convert
`Promise`\<[`Result`](#result)\<`unknown`, `T`\>\>
Promise resolving to Result
```typescript
const fetchUser = async (id: string) => {
    fetch(`/api/users/${id}`).then(r => r.json())
    Ok: user => console.log('User:', user),
    Err: error => console.error('Fetch failed:', error)
```


## fromTry()
```ts
function fromTry<T>(fn): Result<unknown, T>;
```

Executes a function and captures any thrown errors as Result.
Converts exception-based code to Result-based code.
`T`
Function return type
() => `T`
Function that might throw
Result with value or caught error
```typescript
const parseJson = (text: string) => Result.fromTry(() => JSON.parse(text))
const result1 = parseJson('{"name": "John"}') // Result.Ok({name: "John"})
const divide = (a: number, b: number) => Result.fromTry(() => {
```

<a name="namespaceschemamd"></a>
Native Kairo schema factory for the DATA pillar.
High-performance, dependency-free schema validation system with 100% API
compatibility with existing Zod-based schemas. Provides 2-3x faster validation,
50% smaller bundle size, and perfect integration with Result types.
All schemas return Result types for safe error handling and compose naturally
with Pipeline operations in the PROCESS pillar.
```typescript
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(2).max(50),
  email: nativeSchema.string().email(),
  age: nativeSchema.number().min(0).max(150),
  isActive: nativeSchema.boolean().default(true),
  tags: nativeSchema.array(nativeSchema.string()).optional(),
  metadata: nativeSchema.record(nativeSchema.string())
  console.log('Valid user:', result.value)
  console.error('Validation errors:', result.error.issues)
  .map(user => ({ ...user, id: generateId() }))
```


## string()
```ts
function string(): StringSchema;
```

Creates a string schema with validation methods.
`StringSchema`
StringSchema for string validation and transformation
```typescript
```


## number()
```ts
function number(): NumberSchema;
```

Creates a number schema with numeric validation methods.
`NumberSchema`
NumberSchema for number validation
```typescript
```


## boolean()
```ts
function boolean(): BooleanSchema;
```

Creates a boolean schema for true/false validation.
`BooleanSchema`
BooleanSchema for boolean validation
```typescript
  .refine(value => value === true, 'Must accept terms')
```


## object()
```ts
function object<T>(shape): ObjectSchema<T>;
```

Creates an object schema with nested property validation.
`T`
The object type to validate
`SchemaShape`\<`T`\>
Object defining the schema for each property
`ObjectSchema`\<`T`\>
ObjectSchema for complex object validation
```typescript
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(2),
  email: nativeSchema.string().email(),
  profile: nativeSchema.object({
    bio: nativeSchema.string().optional(),
    avatar: nativeSchema.string().url().optional()
```


## array()
```ts
function array<T>(itemSchema): ArraySchema<T>;
```

Creates an array schema with element type validation.
`T`
The type of elements in the array
Schema for validating each array element
`ArraySchema`\<`T`\>
ArraySchema for array validation
```typescript
```

<a name="readmemd"></a>

## DataBaseOptions
Base options for all DATA methods

## SchemaOptions
Schema creation options

## DataValidationOptions
Validation options

## DataTransformOptions
Transform options

## ConvertOptions
Convert options for schema migration

## AggregateOptions
Aggregate options

## GroupByOptions
GroupBy options

## SerializeOptions
Serialization options

## DeserializeOptions
Deserialization options

## CloneOptions
Clone options

## MergeOptions
Merge options

## AggregateOperations
Aggregation types

## PipelineBaseOptions
Base options for all PIPELINE methods

## MapOptions
Map operation options

## FilterOptions
Filter operation options

## ReduceOptions
Reduce operation options

## ComposeOptions
Compose operation options

## ChainOptions
Chain operation options

## BranchOptions
Branch operation options

## ParallelOptions
Parallel operation options

## ValidateOptions
Validation options

## ValidationRule\<T\>
Validation rule type
`T`

## GetOptions
GET method specific options

## PostOptions
POST method specific options

## PutOptions
PUT method specific options

## PatchOptions
PATCH method specific options

## DeleteOptions
DELETE method specific options

## BaseOptions
Base configuration options shared across all Kairo methods

## ValidationOptions
Validation configuration options

## CacheOptions
Caching configuration options

## RetryOptions
Retry configuration options

## TransformOptions
Transform configuration options

## ServiceError\<TCode\>
Base error type for SERVICE pillar operations
`TCode` *extends* `string` = `"SERVICE_ERROR"`

## ServiceHttpError
HTTP-specific error for SERVICE pillar

## ServiceNetworkError
Network-specific error for SERVICE pillar

## DataError\<TCode\>
Base error type for DATA pillar operations
`TCode` *extends* `string` = `"DATA_ERROR"`

## PipelineError\<TCode\>
Base error type for PIPELINE pillar operations
`TCode` *extends* `string` = `"PIPELINE_ERROR"`

## ValidationError
Detailed validation error with field paths and multiple issues.
Part of the DATA pillar's comprehensive error handling system.
```typescript
const error: ValidationError = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  field: 'email',
  expected: 'valid email',
  actual: 'invalid-email',
  fieldPath: ['user', 'email'],
  issues: [{
    path: ['user', 'email'],
    message: 'Invalid email format',
    code: 'invalid_email',
    expected: 'email',
    received: 'string'
```

```ts
code: "VALIDATION_ERROR";
```

Always 'VALIDATION_ERROR' for schema validation errors
```ts
```

```ts
optional field: string;
```

Name of the field that failed validation
```ts
optional expected: string;
```

Expected value or type description
```ts
optional actual: unknown;
```

The actual value that failed validation
```ts
fieldPath: string[];
```

Path to the field in nested objects
```ts
issues: object[];
```

Detailed list of all validation issues
```ts
path: (string | number)[];
```

Path to the specific field that failed
```ts
message: string;
```

Human-readable error message
```ts
code: string;
```

Error code for programmatic handling
```ts
optional expected: string;
```

Expected value or type
```ts
optional received: string;
```

Received value type

## Schema\<T\>
Core schema interface for the DATA pillar's type-safe validation system.
Provides declarative data validation with Result types, composition methods,
and transformation capabilities. All schemas implement this interface for
consistent behavior across the system.
```typescript
const UserSchema: Schema<User> = schema.object({
  name: schema.string().min(2),
  email: schema.string().email(),
  age: schema.number().min(0).max(150)
  console.log('Valid user:', result.value)
  console.error('Validation failed:', result.error.issues)
  console.log('User:', safeResult.data)
  name: 'Anonymous',
  email: 'anonymous@example.com',
  age: 0
```

`T`
The type this schema validates
```ts
readonly type: string;
```

Type identifier for runtime introspection
```ts
readonly isOptional: boolean;
```

Whether this schema accepts undefined values
```ts
readonly optional defaultValue: T;
```

Default value if provided
```ts
parse(input): Result<ValidationError, T>;
```

Parse and validate input, returning Result with typed output or validation error
`unknown`
```ts
safeParse(input): object;
```

Safe parsing that returns success/failure object instead of Result
`unknown`
`object`
```ts
success: boolean;
```

```ts
optional data: T;
```

```ts
optional error: ValidationError;
```

```ts
optional(): Schema<undefined | T>;
```

Make this schema optional (allows undefined)
```ts
nullable(): Schema<null | T>;
```

Make this schema nullable (allows null)
```ts
default(value): Schema<T>;
```

Provide a default value for missing/undefined input
`T`
```ts
transform<U>(fn): Schema<U>;
```

Transform validated value to a different type
`U`
(`value`) => `U`
```ts
refine(predicate, message?): Schema<T>;
```

Add custom validation predicate with error message
(`value`) => `boolean`
`string`

## DataResult\<T\>
```ts
```

DATA method result types
`T`

## DataType
```ts
```

Data types for schema inference

## SerializationFormat
```ts
```

Serialization format types

## PipelineResult\<T\>
```ts
```

PIPELINE method result types
`T`

## PipelineOperation\<TInput, TOutput\>
```ts
  | (data) => TOutput
  | (data) => Promise<TOutput>
  | (data) => PipelineResult<TOutput>
| (data) => Promise<PipelineResult<TOutput>>;
```

Pipeline operation function type
`TInput`
`TOutput` = `TInput`

## TransformFunction()\<TInput, TOutput\>
```ts
type TransformFunction<TInput, TOutput> = (item, index, array) => TOutput | Promise<TOutput>;
```

Transform function for map operations
`TInput`
`TOutput`
`TInput`
`number`
`TInput`[]
`TOutput` \| `Promise`\<`TOutput`\>

## PredicateFunction()\<T\>
```ts
type PredicateFunction<T> = (item, index, array) => boolean | Promise<boolean>;
```

Predicate function for filter operations
`T`
`T`
`number`
`T`[]
`boolean` \| `Promise`\<`boolean`\>

## ReducerFunction()\<TInput, TOutput\>
```ts
type ReducerFunction<TInput, TOutput> = (accumulator, item, index, array) => TOutput | Promise<TOutput>;
```

Reducer function for reduce operations
`TInput`
`TOutput`
`TOutput`
`TInput`
`number`
`TInput`[]
`TOutput` \| `Promise`\<`TOutput`\>

## ComposedPipeline()\<TInput, TOutput\>
```ts
type ComposedPipeline<TInput, TOutput> = (data) => 
```

Composed pipeline function type
`TInput`
`TOutput`
`TInput`

## ServiceResult\<T\>
```ts
```

SERVICE method result types
`T`

## AllKairoErrors
```ts
```

Union type of all Kairo pillar errors

## Result\<E, T\>
```ts
  tag: "Ok";
  value: T;
  tag: "Err";
  error: E;
```

Core Result type for safe error handling across all Kairo pillars.
Represents either a successful value (Ok) or an error (Err). This type is used
throughout Kairo to eliminate throwing exceptions and provide explicit,
type-safe error handling. Integrates seamlessly with functional programming
patterns and pipeline composition.
`E`
The error type
`T`
The success value type
```typescript
function divide(a: number, b: number): Result<string, number> {
  console.log('Success:', result.value) // 5
  console.error('Error:', result.error)
  .input(schema.object({ a: schema.number(), b: schema.number() }))
  .map(({ a, b }) => divide(a, b))
  .flatMap(result => result) // Unwrap nested Result
```


## OkResult\<T\>
```ts
```

Success variant of Result containing a value.
`T`
The success value type

## ErrResult\<E\>
```ts
```

Error variant of Result containing an error.
`E`
The error type

## data
```ts
const data: object;
```

DATA Pillar API
All DATA methods follow the same pattern:
data.method(input, config, options?) -> Result<DataError, T>
```ts
schema: <T>(definition, options) => Schema<T>;
```

Create native schema for validation
`T`
`SchemaDefinition`\<`T`\>
```ts
validate: <T>(input, schema, options) => DataResult<T>;
```

Validate data against schema
`T`
`unknown`
```ts
transform: <TInput, TOutput>(input, mapping, options) => DataResult<TOutput>;
```

Transform data structure according to mapping
`TInput`
`TOutput`
`TInput`
`TransformMapping`\<`TInput`, `TOutput`\>
```ts
convert: <TInput, TOutput>(input, fromSchema, toSchema, mapping, options) => DataResult<TOutput>;
```

Convert between different data schemas
`TInput`
`TOutput`
`TInput`
`Record`\<`string`, `string` \| (`data`) => `unknown`\>
```ts
aggregate: <T, R>(input, operations, _options) => DataResult<R>;
```

Perform statistical operations on data collections
`T`
`R` = `AggregateResult`
`T`[]
```ts
groupBy: <T, K>(input, keys, options) => DataResult<Record<string, T[]>>;
```

Group data by specified criteria
`T`
`K` *extends* `string` \| `number` \| `symbol`
`T`[]
`K` | `GroupByKeyFunction`\<`T`\> | `K`[]
```ts
serialize: <T>(input, format, options) => DataResult<string | Buffer<ArrayBufferLike>>;
```

Serialize data to various formats
`T`
`T`
```ts
deserialize: <T>(input, format, schema?, options) => DataResult<T>;
```

Deserialize data from various formats
`T`
`string` | `Buffer`\<`ArrayBufferLike`\>
```ts
clone: <T>(input, options) => DataResult<T>;
```

Deep clone data structures
`T`
`T`
```ts
merge: <T>(target, sources, options) => DataResult<T>;
```

Merge multiple objects into a single object with configurable strategies
`T` *extends* `Record`\<`string`, `unknown`\>
`T`
Base object to merge into
`Partial`\<`T`\>[]
Objects to merge from
Merge configuration options
Result with merged object or error
```typescript
const base = { a: 1, b: { x: 1 } }
const update = { b: { y: 2 }, c: 3 }
  deep: true,
  strategy: 'source-wins'
  // result.value: { a: 1, b: { x: 1, y: 2 }, c: 3 }
```

```ts
get: <T>(obj, path) => undefined | T;
```

Safely access nested object properties
`T` = `unknown`
`Record`\<`string`, `unknown`\>
Object to access
`PropertyPath`
Property path (string or array)
`undefined` \| `T`
Property value or undefined
```ts
set: <T>(obj, path, value) => Record<string, unknown>;
```

Safely set nested object properties (immutable)
`T` = `unknown`
`Record`\<`string`, `unknown`\>
Object to update
`PropertyPath`
Property path
`T`
Value to set
`Record`\<`string`, `unknown`\>
New object with updated property
```ts
has: (obj, path) => boolean;
```

Check if nested property exists
`Record`\<`string`, `unknown`\>
Object to check
`PropertyPath`
Property path
`boolean`
True if property exists
```ts
inferType: (value) => DataType;
```

Infer data type for schema generation
`unknown`
Value to analyze
Inferred data type
```ts
isValid: <T>(value, schema) => boolean;
```

Quick validation check without full Result
`T`
`unknown`
Value to validate
Schema to validate against
`boolean`
True if value is valid
```ts
unique: <T>(array, keyFn?) => T[];
```

Remove duplicates from arrays
`T`
`T`[]
Array to deduplicate
`UniqueKeyFunction`\<`T`\>
Optional function to extract comparison key
`T`[]
Array with duplicates removed
```ts
flatten: <T>(array, depth) => T[];
```

Flatten nested arrays
`T`
(`T` \| `T`[])[]
Array to flatten
`number` = `1`
Maximum depth to flatten (default: 1)
`T`[]
Flattened array
```ts
deepClone: <T>(value, options) => T;
```

Deep clone objects and arrays
`T`
`T`
Value to clone
Clone options
`boolean`
`boolean`
`T`
Deep cloned value
```ts
pick: (obj, paths) => Record<string, unknown>;
```

Extract multiple properties from an object
`Record`\<`string`, `unknown`\>
Source object
`PropertyPath`[]
Array of property paths to extract
`Record`\<`string`, `unknown`\>
Object with extracted properties
```ts
omit: (obj, paths) => Record<string, unknown>;
```

Omit properties from an object
`Record`\<`string`, `unknown`\>
Source object
`PropertyPath`[]
Array of property paths to omit
`Record`\<`string`, `unknown`\>
Object with omitted properties
```ts
isPlainObject: (value) => value is Record<string, unknown>;
```

Check if a value is a plain object (not array, date, etc.)
`unknown`
Value to check
`value is Record<string, unknown>`
True if value is a plain object
```ts
isEmpty: (value) => boolean;
```

Check if a value is empty (null, undefined, empty string, empty array, empty object)
`unknown`
Value to check
`boolean`
True if value is empty
```ts
stringify: (value, options) => string;
```

Convert any value to a string representation
`unknown`
Value to stringify
Stringify options
`boolean`
`number`
(`key`, `value`) => `unknown`
`string`
String representation
```ts
readonly isError: (error) => error is DataError<"DATA_ERROR"> = isDataError;
```

Type guard for data errors
`unknown`
Error to check
`error is DataError<"DATA_ERROR">`
True if error is a DataError
```typescript
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 150 }
  id: 'user_id',
  name: 'full_name',
  email: 'email_address',
  createdAt: (input) => new Date(input.created_timestamp)
  groupBy: ['region', 'quarter'],
  sum: ['revenue', 'units'],
  avg: ['orderValue', 'discount'],
  count: '*'
```


## pipeline
```ts
const pipeline: object;
```

PIPELINE Pillar API
All PIPELINE methods follow the same pattern:
pipeline.method(data, operation, options?) -> Result<PipelineError, T>
```ts
map: <TInput, TOutput>(data, transform, options) => 
```

Transform each item in a collection
`TInput`
`TOutput`
`TInput`[]
```ts
filter: <T>(data, predicate, options) => 
```

Filter collection based on predicate
`T`
`T`[]
```ts
reduce: <TInput, TOutput>(data, reducer, initialValue, options) => 
```

Reduce collection to single value
`TInput`
`TOutput`
`TInput`[]
`TOutput`
```ts
compose: <TInput, TOutput>(operations, options) => ComposedPipeline<TInput, TOutput>;
```

Compose multiple operations into single pipeline
`TInput`
`TOutput`
```ts
chain: <TInput, TOutput>(data, operations, options) => Promise<PipelineResult<TOutput>>;
```

Chain operations with data flowing through
`TInput`
`TOutput`
`TInput`
`ChainOperation`\<`unknown`, `unknown`\>[]
`Promise`\<[`PipelineResult`](#pipelineresult)\<`TOutput`\>\>
```ts
branch: <TInput, TOutput>(data, conditions, options) => 
```

Conditional execution based on data - routes data into multiple branches based on conditions
`TInput`
`TOutput` = `Record`\<`string`, `TInput`[]\>
`TInput` | `TInput`[]
`Record`\<`string`, (`item`) => `boolean` \| `Promise`\<`boolean`\>\>
```ts
parallel: <TInput, TOutput>(operations, options) => Promise<PipelineResult<TOutput>>;
```

Execute operations in parallel and combine results
`TInput`
`TOutput`
`ParallelOperation`\<`TInput`, `unknown`\>[]
`Promise`\<[`PipelineResult`](#pipelineresult)\<`TOutput`\>\>
```ts
validate: <T>(data, schema, options) => Promise<PipelineResult<T>>;
```

Validate data against schema or rules
`T`
`T`
`Promise`\<[`PipelineResult`](#pipelineresult)\<`T`\>\>
```ts
curry: <TArgs, TReturn>(fn) => CurriedFunction<TArgs, TReturn>;
```

Create curried versions of functions for composition
`TArgs` *extends* `unknown`[]
`TReturn`
(...`args`) => `TReturn`
Function to curry
`CurriedFunction`\<`TArgs`, `TReturn`\>
Curried function
```ts
partial: <TArgs, TReturn>(fn, ...partialArgs) => (...remainingArgs) => TReturn;
```

Create partially applied functions
`TArgs` *extends* `unknown`[]
`TReturn`
(...`args`) => `TReturn`
Function to partially apply
...`unknown`[]
Arguments to pre-fill
Partially applied function
```ts
(...remainingArgs): TReturn;
```

...`unknown`[]
`TReturn`
```ts
when: <T>(condition, thenFn, elseFn?) => (data) => T;
```

Conditional execution function
`T`
(`data`) => `boolean`
Condition to check
(`data`) => `T`
Function to execute if condition is true
(`data`) => `T`
Function to execute if condition is false
Conditional function
```ts
(data): T;
```

`T`
`T`
```ts
unless: <T>(condition, fn) => (data) => T;
```

Execute function unless condition is true
`T`
(`data`) => `boolean`
Condition to check
(`data`) => `T`
Function to execute if condition is false
Guard function
```ts
(data): T;
```

`T`
`T`
```ts
sequence: <T>(operations) => (data) => Promise<T>;
```

Execute async operations in sequence
`T`
(`data`) => `Promise`\<`T`\>[]
Array of async operations
Composed sequential function
```ts
(data): Promise<T>;
```

`T`
`Promise`\<`T`\>
```ts
trap: <T, E>(fn, handler?) => (data) => PipelineResult<T>;
```

Wrap functions to catch errors and return Results
`T`
`E` = `Error`
(`data`) => `T`
Function to wrap
(`error`, `data`) => `T`
Optional error handler
Safe function that returns Result
```ts
(data): PipelineResult<T>;
```

`T`
```ts
retry: <T>(fn, options) => Promise<PipelineResult<T>>;
```

Execute function with retry logic
`T`
() => `T` \| `Promise`\<`T`\>
Function to execute
Retry options
`number`
`number`
`"linear"` \| `"exponential"`
`string`[]
`Promise`\<[`PipelineResult`](#pipelineresult)\<`T`\>\>
Promise with retry logic
```ts
delay: <T>(fn, delayMs) => (data) => Promise<T>;
```

Add delay to function execution
`T`
(`data`) => `T` \| `Promise`\<`T`\>
Function to delay
`number`
Delay in milliseconds
Delayed function
```ts
(data): Promise<T>;
```

`T`
`Promise`\<`T`\>
```ts
timeout: <T>(fn, timeoutMs) => (data) => Promise<PipelineResult<T>>;
```

Execute function with timeout
`T`
(`data`) => `T` \| `Promise`\<`T`\>
Function to execute
`number`
Timeout in milliseconds
Function with timeout
```ts
(data): Promise<PipelineResult<T>>;
```

`T`
`Promise`\<[`PipelineResult`](#pipelineresult)\<`T`\>\>
```ts
tap: <T>(fn) => (data) => Promise<T>;
```

Tap into pipeline for side effects without modifying data
`T`
(`data`) => `void` \| `Promise`\<`void`\>
Side effect function
Tap function that returns original data
```ts
(data): Promise<T>;
```

`T`
`Promise`\<`T`\>
```ts
memoize: <T, R>(fn, keyFn?) => (data) => R;
```

Memoize function results
`T`
`R`
(`data`) => `R`
Function to memoize
(`data`) => `string`
Function to generate cache key
Memoized function
```ts
(data): R;
```

`T`
`R`
```ts
debounce: <T>(fn, wait) => (data) => void;
```

Debounce function execution
`T`
(`data`) => `void` \| `Promise`\<`void`\>
Function to debounce
`number`
Wait time in milliseconds
Debounced function
```ts
(data): void;
```

`T`
`void`
```ts
throttle: <T>(fn, limit) => (data) => void;
```

Throttle function execution
`T`
(`data`) => `void` \| `Promise`\<`void`\>
Function to throttle
`number`
Time limit in milliseconds
Throttled function
```ts
(data): void;
```

`T`
`void`
```ts
guard: <T>(predicate, errorMessage) => (data) => PipelineResult<T>;
```

Create a guard function that validates input
`T`
(`data`) => `boolean`
Validation predicate
`string` = `'Guard condition failed'`
Error message if validation fails
Guard function
```ts
(data): PipelineResult<T>;
```

`T`
```ts
createContext: (operationName, metadata?) => PipelineContext;
```

Create execution context for pipeline operations
`string`
Name of the operation
`Record`\<`string`, `unknown`\>
Additional metadata
`PipelineContext`
Pipeline context
```ts
addTrace: (context, operation) => PipelineContext;
```

Add trace information to context
`PipelineContext`
Pipeline context
`string`
Operation name
`PipelineContext`
Updated context
```ts
readonly isError: (error) => error is PipelineError<"PIPELINE_ERROR"> = isPipelineError;
```

Check if a value is a pipeline error
`unknown`
Error to check
`error is PipelineError<"PIPELINE_ERROR">`
True if error is a PipelineError
```ts
extractSuccessful: <T>(results) => T[];
```

Extract results from an array of Results, filtering out errors
`T`
Array of Results
`T`[]
Array of successful values
```ts
extractErrors: <T>(results) => PipelineError<"PIPELINE_ERROR">[];
```

Extract errors from an array of Results
`T`
Array of Results
Array of errors
```ts
combineResults: <T>(results) => PipelineResult<T[]>;
```

Combine multiple Results into a single Result
`T`
Array of Results
Combined Result
```ts
allSuccessful: <T>(results) => boolean;
```

Check if all Results are successful
`T`
Array of Results
`boolean`
True if all Results are Ok
```ts
anySuccessful: <T>(results) => boolean;
```

Check if any Results are successful
`T`
Array of Results
`boolean`
True if any Result is Ok
```ts
toResult: <TInput, TOutput>(fn) => (data) => PipelineResult<TOutput>;
```

Convert a regular function to return a Result
`TInput`
`TOutput`
(`data`) => `TOutput`
Function to convert
Function that returns Result
```ts
(data): PipelineResult<TOutput>;
```

`TInput`
```ts
toAsyncResult: <TInput, TOutput>(fn) => (data) => Promise<PipelineResult<TOutput>>;
```

Convert an async function to return a Result
`TInput`
`TOutput`
(`data`) => `Promise`\<`TOutput`\>
Async function to convert
Async function that returns Result
```ts
(data): Promise<PipelineResult<TOutput>>;
```

`TInput`
`Promise`\<[`PipelineResult`](#pipelineresult)\<`TOutput`\>\>
```typescript
const doubled = await pipeline.map([1, 2, 3], x => x * 2)
const adults = await pipeline.filter(users, user => user.age >= 18)
const total = await pipeline.reduce(orders, (sum, order) => sum + order.total, 0)
  user => pipeline.validate(user, UserSchema),
  user => data.transform(user, normalizeUser),
  user => enrichWithBusinessData(user)
  user => user.type,
    'admin': processAdmin,
    'user': processUser,
    'guest': processGuest
  user => service.get(`/profile/${user.id}`),
  user => service.get(`/preferences/${user.id}`),
  user => service.get(`/activity/${user.id}`)
  combiner: (user, [profile, prefs, activity]) => ({
    ...user, profile, preferences: prefs, recentActivity: activity
const multiply = pipeline.curry((factor: number, value: number) => value * factor)
const safeProcess = pipeline.trap(riskyOperation, (error, data) => defaultValue)
```


## service
```ts
const service: object;
```

SERVICE Pillar API
All SERVICE methods follow the same pattern:
service.method(url, data?, options?) -> Promise<Result<ServiceError, T>>
```ts
get: <T>(url, options) => Promise<ServiceResult<T>>;
```

GET method - Fetch data from HTTP endpoints with intelligent caching
`T` = `unknown`
`string`
`Promise`\<[`ServiceResult`](#serviceresult)\<`T`\>\>
```ts
post: <TData, TResponse>(url, data?, options) => Promise<ServiceResult<TResponse>>;
```

POST method - Create resources with proper content handling
`TData` = `unknown`
`TResponse` = `unknown`
`string`
`TData`
`Promise`\<[`ServiceResult`](#serviceresult)\<`TResponse`\>\>
```ts
put: <TData, TResponse>(url, data, options) => Promise<ServiceResult<TResponse>>;
```

PUT method - Update/replace resources with concurrency support
`TData` = `unknown`
`TResponse` = `unknown`
`string`
`TData`
`Promise`\<[`ServiceResult`](#serviceresult)\<`TResponse`\>\>
```ts
patch: <TData, TResponse>(url, data, options) => Promise<ServiceResult<TResponse>>;
```

PATCH method - Partial updates with format flexibility
`TData` = `unknown`
`TResponse` = `unknown`
`string`
`TData`
`Promise`\<[`ServiceResult`](#serviceresult)\<`TResponse`\>\>
```ts
readonly delete: <TResponse>(url, options) => Promise<ServiceResult<TResponse>> = deleteMethod;
```

DELETE method - Remove resources with comprehensive options
`TResponse` = `unknown`
`string`
`Promise`\<[`ServiceResult`](#serviceresult)\<`TResponse`\>\>
```ts
buildURL: (base, path?, params?) => string;
```

Builds URLs with query parameters
`string`
Base URL
`string`
Optional path to append
`Record`\<`string`, `unknown`\>
Optional query parameters
`string`
Complete URL with parameters
```ts
parseURL: (url) => Result<ServiceError<"SERVICE_ERROR">, {
  base: string;
  path: string;
  params: Record<string, string>;
  hash?: string;
```

Parses URLs into components
`string`
URL to parse
\}\>
Result with URL components or error
```ts
readonly isError: (error) => error is ServiceError<"SERVICE_ERROR"> = isServiceError;
```

Type guard for service errors
`unknown`
Error to check
`error is ServiceError<"SERVICE_ERROR">`
True if error is a ServiceError
```ts
isRetryable: (error) => boolean;
```

Determines if an error should trigger retry
Error to check
`boolean`
True if error is retryable
```typescript
  params: { page: 1, limit: 10 },
  cache: true,
  retry: { attempts: 3 },
  timeout: 5000
```


## STATUS
```ts
const STATUS: object;
```

Implementation status and version information for the Kairo library
```ts
readonly version: "1.0.0" = '1.0.0';
```

```ts
readonly pillars: object;
```

```ts
readonly SERVICE: "IMPLEMENTED" = 'IMPLEMENTED';
```

```ts
readonly DATA: "IMPLEMENTED" = 'IMPLEMENTED';
```

```ts
readonly PIPELINE: "IMPLEMENTED" = 'IMPLEMENTED';
```

```ts
readonly foundation: "COMPLETE" = 'COMPLETE';
```

```ts
readonly architecture: "COMPLETE" = 'COMPLETE';
```

Provides runtime information about the library's implementation status and version

---

## Quick Reference

### SERVICE Pillar
- `service.get(url, options)` - HTTP GET requests
- `service.post(url, options)` - HTTP POST requests
- `service.put(url, options)` - HTTP PUT requests
- `service.patch(url, options)` - HTTP PATCH requests
- `service.delete(url, options)` - HTTP DELETE requests

### DATA Pillar
- `data.schema(definition)` - Create validation schemas
- `data.validate(data, schema)` - Validate against schema
- `data.transform(data, options)` - Transform data structures
- `data.aggregate(data, options)` - Aggregate data with grouping
- `data.serialize(data, options)` - Serialize to various formats
- `data.deserialize(data, options)` - Deserialize from formats

### PIPELINE Pillar
- `pipeline.map(items, fn, options)` - Transform items
- `pipeline.filter(items, predicate, options)` - Filter items
- `pipeline.reduce(items, fn, initial, options)` - Reduce items
- `pipeline.compose(functions)` - Compose functions
- `pipeline.chain(operations)` - Chain operations
- `pipeline.branch(data, branches, options)` - Conditional execution

### RESULT Pattern
- `Result.Ok(value)` - Success result
- `Result.Err(error)` - Error result
- `Result.isOk(result)` - Check if success
- `Result.isErr(result)` - Check if error
- `Result.match(result, {Ok: fn, Err: fn})` - Pattern matching

### Key Patterns
- All methods return `Result<Error, Data>`
- All methods use configuration objects (no method chaining)
- Replace `fetch/axios` → `service` methods
- Replace `try/catch` → `Result` pattern
- Replace `zod/joi` → `data.schema/validate`
- Replace `lodash` → `pipeline` utilities