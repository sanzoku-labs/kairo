<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Result](#result)
  - [Functions](#functions)
    - [Ok()](#ok)
    - [Err()](#err)
    - [isOk()](#isok)
    - [isErr()](#iserr)
    - [map()](#map)
    - [flatMap()](#flatmap)
    - [mapError()](#maperror)
    - [match()](#match)
    - [unwrap()](#unwrap)
    - [unwrapOr()](#unwrapor)
    - [unwrapOrElse()](#unwraporelse)
    - [fromPromise()](#frompromise)
    - [fromTry()](#fromtry)
- [schema](#schema)
  - [Example](#example)
  - [Functions](#functions-1)
    - [string()](#string)
    - [number()](#number)
    - [boolean()](#boolean)
    - [object()](#object)
    - [array()](#array)
- [@sanzoku-labs/kairo](#sanzoku-labskairo)
  - [Namespaces](#namespaces)
  - [Interfaces](#interfaces)
    - [DataBaseOptions](#databaseoptions)
    - [SchemaOptions](#schemaoptions)
    - [DataValidationOptions](#datavalidationoptions)
    - [DataTransformOptions](#datatransformoptions)
    - [ConvertOptions](#convertoptions)
    - [AggregateOptions](#aggregateoptions)
    - [GroupByOptions](#groupbyoptions)
    - [SerializeOptions](#serializeoptions)
    - [DeserializeOptions](#deserializeoptions)
    - [CloneOptions](#cloneoptions)
    - [MergeOptions](#mergeoptions)
    - [AggregateOperations](#aggregateoperations)
    - [PipelineBaseOptions](#pipelinebaseoptions)
    - [MapOptions](#mapoptions)
    - [FilterOptions](#filteroptions)
    - [ReduceOptions](#reduceoptions)
    - [ComposeOptions](#composeoptions)
    - [ChainOptions](#chainoptions)
    - [BranchOptions](#branchoptions)
    - [ParallelOptions](#paralleloptions)
    - [ValidateOptions](#validateoptions)
    - [ValidationRule\<T\>](#validationrule%5Ct%5C)
    - [GetOptions](#getoptions)
    - [PostOptions](#postoptions)
    - [PutOptions](#putoptions)
    - [PatchOptions](#patchoptions)
    - [DeleteOptions](#deleteoptions)
    - [BaseOptions](#baseoptions)
    - [ValidationOptions](#validationoptions)
    - [CacheOptions](#cacheoptions)
    - [RetryOptions](#retryoptions)
    - [TransformOptions](#transformoptions)
    - [ServiceError\<TCode\>](#serviceerror%5Ctcode%5C)
    - [ServiceHttpError](#servicehttperror)
    - [ServiceNetworkError](#servicenetworkerror)
    - [DataError\<TCode\>](#dataerror%5Ctcode%5C)
    - [PipelineError\<TCode\>](#pipelineerror%5Ctcode%5C)
    - [ValidationError](#validationerror)
    - [Schema\<T\>](#schema%5Ct%5C)
  - [Type Aliases](#type-aliases)
    - [DataResult\<T\>](#dataresult%5Ct%5C)
    - [DataType](#datatype)
    - [SerializationFormat](#serializationformat)
    - [PipelineResult\<T\>](#pipelineresult%5Ct%5C)
    - [PipelineOperation\<TInput, TOutput\>](#pipelineoperation%5Ctinput-toutput%5C)
    - [TransformFunction()\<TInput, TOutput\>](#transformfunction%5Ctinput-toutput%5C)
    - [PredicateFunction()\<T\>](#predicatefunction%5Ct%5C)
    - [ReducerFunction()\<TInput, TOutput\>](#reducerfunction%5Ctinput-toutput%5C)
    - [ComposedPipeline()\<TInput, TOutput\>](#composedpipeline%5Ctinput-toutput%5C)
    - [ServiceResult\<T\>](#serviceresult%5Ct%5C)
    - [AllKairoErrors](#allkairoerrors)
    - [Result\<E, T\>](#result%5Ce-t%5C)
    - [OkResult\<T\>](#okresult%5Ct%5C)
    - [ErrResult\<E\>](#errresult%5Ce%5C)
  - [Variables](#variables)
    - [data](#data)
    - [pipeline](#pipeline)
    - [service](#service)
    - [STATUS](#status)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


<a name="namespaceresultmd"></a>

[**@sanzoku-labs/kairo**](#readmemd)

***

# Result

Kairo - Core API

Three-pillar TypeScript library with focused functionality and predictable patterns.
Built for universal compatibility across all TypeScript environments.

Architecture:
- SERVICE: HTTP-only API integration (5 methods + 4 utilities)
- DATA: Data operations + aggregation (10 methods + 6 utilities)
- PIPELINE: Logic composition (8 methods + 5 utilities)

## Functions

### Ok()

```ts
function Ok<T>(value): OkResult<T>;
```

Creates a successful Result containing a value.

#### Type Parameters

##### T

`T`

Type of the success value

#### Parameters

##### value

`T`

The success value to wrap

#### Returns

[`OkResult`](#okresult)\<`T`\>

OkResult containing the value

#### Example

```typescript
const user = { id: 1, name: 'John' }
const result = Result.Ok(user)
// result: { tag: 'Ok', value: { id: 1, name: 'John' } }
```

***

### Err()

```ts
function Err<E>(error): ErrResult<E>;
```

Creates a failed Result containing an error.

#### Type Parameters

##### E

`E`

Type of the error

#### Parameters

##### error

`E`

The error to wrap

#### Returns

[`ErrResult`](#errresult)\<`E`\>

ErrResult containing the error

#### Example

```typescript
const validationError = { code: 'INVALID_EMAIL', message: 'Invalid email format' }
const result = Result.Err(validationError)
// result: { tag: 'Err', error: { code: 'INVALID_EMAIL', ... } }
```

***

### isOk()

```ts
function isOk<E, T>(result): result is OkResult<T>;
```

Type guard to check if a Result is successful.
Narrows the type to OkResult for safe value access.

#### Type Parameters

##### E

`E`

Error type

##### T

`T`

Success value type

#### Parameters

##### result

[`Result`](#result)\<`E`, `T`\>

Result to check

#### Returns

`result is OkResult<T>`

True if Result is Ok, with type narrowing

#### Example

```typescript
if (Result.isOk(result)) {
  // TypeScript knows result.value is safe to access
  console.log(result.value)
}
```

***

### isErr()

```ts
function isErr<E, T>(result): result is ErrResult<E>;
```

Type guard to check if a Result is an error.
Narrows the type to ErrResult for safe error access.

#### Type Parameters

##### E

`E`

Error type

##### T

`T`

Success value type

#### Parameters

##### result

[`Result`](#result)\<`E`, `T`\>

Result to check

#### Returns

`result is ErrResult<E>`

True if Result is Err, with type narrowing

#### Example

```typescript
if (Result.isErr(result)) {
  // TypeScript knows result.error is safe to access
  console.error(result.error)
}
```

***

### map()

```ts
function map<E, T, U>(result, fn): Result<E, U>;
```

Transforms the value inside an Ok Result, leaving Err Results unchanged.
This is the functor map operation for Results.

#### Type Parameters

##### E

`E`

Error type

##### T

`T`

Input value type

##### U

`U`

Output value type

#### Parameters

##### result

[`Result`](#result)\<`E`, `T`\>

Result to transform

##### fn

(`value`) => `U`

Pure function to apply to the value

#### Returns

[`Result`](#result)\<`E`, `U`\>

New Result with transformed value or original error

#### Example

```typescript
const result = Result.Ok(5)
const doubled = Result.map(result, x => x * 2) // Result.Ok(10)

const error = Result.Err('failed')
const stillError = Result.map(error, x => x * 2) // Result.Err('failed')
```

***

### flatMap()

```ts
function flatMap<E, T, U>(result, fn): Result<E, U>;
```

Chains Result-returning operations, flattening nested Results.
Also known as bind or chain in functional programming.

#### Type Parameters

##### E

`E`

Error type

##### T

`T`

Input value type

##### U

`U`

Output value type

#### Parameters

##### result

[`Result`](#result)\<`E`, `T`\>

Result to chain from

##### fn

(`value`) => [`Result`](#result)\<`E`, `U`\>

Function that returns a new Result

#### Returns

[`Result`](#result)\<`E`, `U`\>

Flattened Result or original error

#### Example

```typescript
const validateUser = (data: unknown): Result<string, User> => { ... }
const saveUser = (user: User): Result<string, User> => { ... }

const result = Result.flatMap(
  validateUser(inputData),
  user => saveUser(user)
)
// Avoids Result<string, Result<string, User>>
```

***

### mapError()

```ts
function mapError<E, F, T>(result, fn): Result<F, T>;
```

Transforms the error inside an Err Result, leaving Ok Results unchanged.
Useful for error transformation and enrichment.

#### Type Parameters

##### E

`E`

Input error type

##### F

`F`

Output error type

##### T

`T`

Value type

#### Parameters

##### result

[`Result`](#result)\<`E`, `T`\>

Result to transform

##### fn

(`error`) => `F`

Function to transform the error

#### Returns

[`Result`](#result)\<`F`, `T`\>

Result with transformed error or original value

#### Example

```typescript
const result = Result.Err('validation failed')
const enriched = Result.mapError(result, msg => ({
  code: 'VALIDATION_ERROR',
  message: msg,
  timestamp: Date.now()
}))
```

***

### match()

```ts
function match<E, T, U>(result, handlers): U;
```

Pattern matching for Results - handles both success and error cases.
Provides exhaustive case handling with guaranteed return value.

#### Type Parameters

##### E

`E`

Error type

##### T

`T`

Value type

##### U

`U`

Return type

#### Parameters

##### result

[`Result`](#result)\<`E`, `T`\>

Result to match against

##### handlers

Object with Ok and Err handlers

###### Ok

(`value`) => `U`

###### Err

(`error`) => `U`

#### Returns

`U`

Value from appropriate handler

#### Example

```typescript
const message = Result.match(apiResult, {
  Ok: user => `Welcome, ${user.name}!`,
  Err: error => `Login failed: ${error.message}`
})

// Always returns a string, no null/undefined
console.log(message)
```

***

### unwrap()

```ts
function unwrap<E, T>(result): T;
```

Extracts the value from an Ok Result or throws an error.
Use with caution - prefer pattern matching or isOk checks.

#### Type Parameters

##### E

`E`

Error type

##### T

`T`

Value type

#### Parameters

##### result

[`Result`](#result)\<`E`, `T`\>

Result to unwrap

#### Returns

`T`

The value if Ok

#### Throws

Error if the Result is Err

#### Example

```typescript
const result = Result.Ok(42)
const value = Result.unwrap(result) // 42

const error = Result.Err('failed')
const value2 = Result.unwrap(error) // Throws!

// Prefer safe alternatives:
if (Result.isOk(result)) {
  const value = result.value // Safe
}
```

***

### unwrapOr()

```ts
function unwrapOr<E, T>(result, defaultValue): T;
```

Extracts the value from a Result or returns a default value.
Safe alternative to unwrap() that never throws.

#### Type Parameters

##### E

`E`

Error type

##### T

`T`

Value type

#### Parameters

##### result

[`Result`](#result)\<`E`, `T`\>

Result to unwrap

##### defaultValue

`T`

Value to return if Result is Err

#### Returns

`T`

The value if Ok, otherwise the default value

#### Example

```typescript
const success = Result.Ok(42)
const value1 = Result.unwrapOr(success, 0) // 42

const failure = Result.Err('failed')
const value2 = Result.unwrapOr(failure, 0) // 0
```

***

### unwrapOrElse()

```ts
function unwrapOrElse<E, T>(result, fn): T;
```

Extracts the value from a Result or computes a value from the error.
Provides error-specific recovery logic.

#### Type Parameters

##### E

`E`

Error type

##### T

`T`

Value type

#### Parameters

##### result

[`Result`](#result)\<`E`, `T`\>

Result to unwrap

##### fn

(`error`) => `T`

Function to compute fallback value from error

#### Returns

`T`

The value if Ok, otherwise computed fallback

#### Example

```typescript
const result = Result.Err({ code: 'NOT_FOUND', message: 'User not found' })
const user = Result.unwrapOrElse(result, error => ({
  id: 'unknown',
  name: 'Anonymous',
  error: error.code
}))
```

***

### fromPromise()

```ts
function fromPromise<T>(promise): Promise<Result<unknown, T>>;
```

Converts a Promise to a Result, catching any rejections as errors.
Essential for safe async operation handling in pipelines.

#### Type Parameters

##### T

`T`

Promise value type

#### Parameters

##### promise

`Promise`\<`T`\>

Promise to convert

#### Returns

`Promise`\<[`Result`](#result)\<`unknown`, `T`\>\>

Promise resolving to Result

#### Example

```typescript
const fetchUser = async (id: string) => {
  const result = await Result.fromPromise(
    fetch(`/api/users/${id}`).then(r => r.json())
  )

  return Result.match(result, {
    Ok: user => console.log('User:', user),
    Err: error => console.error('Fetch failed:', error)
  })
}
```

***

### fromTry()

```ts
function fromTry<T>(fn): Result<unknown, T>;
```

Executes a function and captures any thrown errors as Result.
Converts exception-based code to Result-based code.

#### Type Parameters

##### T

`T`

Function return type

#### Parameters

##### fn

() => `T`

Function that might throw

#### Returns

[`Result`](#result)\<`unknown`, `T`\>

Result with value or caught error

#### Example

```typescript
const parseJson = (text: string) => Result.fromTry(() => JSON.parse(text))

const result1 = parseJson('{"name": "John"}') // Result.Ok({name: "John"})
const result2 = parseJson('invalid json')     // Result.Err(SyntaxError)

// Safe division
const divide = (a: number, b: number) => Result.fromTry(() => {
  if (b === 0) throw new Error('Division by zero')
  return a / b
})
```


<a name="namespaceschemamd"></a>

[**@sanzoku-labs/kairo**](#readmemd)

***

# schema

Native Kairo schema factory for the DATA pillar.

High-performance, dependency-free schema validation system with 100% API
compatibility with existing Zod-based schemas. Provides 2-3x faster validation,
50% smaller bundle size, and perfect integration with Result types.

All schemas return Result types for safe error handling and compose naturally
with Pipeline operations in the PROCESS pillar.

 nativeSchema

## Example

```typescript
// Basic schema creation
const UserSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(2).max(50),
  email: nativeSchema.string().email(),
  age: nativeSchema.number().min(0).max(150),
  isActive: nativeSchema.boolean().default(true),
  tags: nativeSchema.array(nativeSchema.string()).optional(),
  metadata: nativeSchema.record(nativeSchema.string())
})

// Validation with Result types
const result = UserSchema.parse(userData)
if (Result.isOk(result)) {
  console.log('Valid user:', result.value)
} else {
  console.error('Validation errors:', result.error.issues)
}

// Schema composition
const CreateUserSchema = UserSchema.omit(['id'])
const PartialUserSchema = UserSchema.partial()

// Integration with pipelines
const userPipeline = pipeline('user-processing')
  .input(CreateUserSchema)
  .map(user => ({ ...user, id: generateId() }))
  .validate(UserSchema)

// Performance monitoring
const result2 = UserSchema.parse(userData) // 2-3x faster than Zod
```

## Functions

### string()

```ts
function string(): StringSchema;
```

Creates a string schema with validation methods.

#### Returns

`StringSchema`

StringSchema for string validation and transformation

#### Example

```typescript
const NameSchema = nativeSchema.string()
  .min(2, 'Name too short')
  .max(50, 'Name too long')
  .trim()

const EmailSchema = nativeSchema.string()
  .email('Invalid email format')
  .lowercase()

const PasswordSchema = nativeSchema.string()
  .min(8, 'Password too short')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password complexity requirements not met')
```

***

### number()

```ts
function number(): NumberSchema;
```

Creates a number schema with numeric validation methods.

#### Returns

`NumberSchema`

NumberSchema for number validation

#### Example

```typescript
const AgeSchema = nativeSchema.number()
  .min(0, 'Age cannot be negative')
  .max(150, 'Age seems unrealistic')
  .integer('Age must be whole number')

const PriceSchema = nativeSchema.number()
  .positive('Price must be positive')
  .finite('Price must be finite')

const ScoreSchema = nativeSchema.number()
  .min(0)
  .max(100)
```

***

### boolean()

```ts
function boolean(): BooleanSchema;
```

Creates a boolean schema for true/false validation.

#### Returns

`BooleanSchema`

BooleanSchema for boolean validation

#### Example

```typescript
const AcceptTermsSchema = nativeSchema.boolean()
  .refine(value => value === true, 'Must accept terms')

const OptionalFlagSchema = nativeSchema.boolean().optional()

const DefaultEnabledSchema = nativeSchema.boolean().default(true)
```

***

### object()

```ts
function object<T>(shape): ObjectSchema<T>;
```

Creates an object schema with nested property validation.

#### Type Parameters

##### T

`T`

The object type to validate

#### Parameters

##### shape

`SchemaShape`\<`T`\>

Object defining the schema for each property

#### Returns

`ObjectSchema`\<`T`\>

ObjectSchema for complex object validation

#### Example

```typescript
const UserSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(2),
  email: nativeSchema.string().email(),
  profile: nativeSchema.object({
    bio: nativeSchema.string().optional(),
    avatar: nativeSchema.string().url().optional()
  })
})

// Shape manipulation
const PublicUserSchema = UserSchema.pick(['id', 'name'])
const CreateUserSchema = UserSchema.omit(['id'])
```

***

### array()

```ts
function array<T>(itemSchema): ArraySchema<T>;
```

Creates an array schema with element type validation.

#### Type Parameters

##### T

`T`

The type of elements in the array

#### Parameters

##### itemSchema

[`Schema`](#schema-1)\<`T`\>

Schema for validating each array element

#### Returns

`ArraySchema`\<`T`\>

ArraySchema for array validation

#### Example

```typescript
const StringArraySchema = nativeSchema.array(nativeSchema.string())
  .min(1, 'At least one item required')
  .max(10, 'Too many items')

const UserArraySchema = nativeSchema.array(UserSchema)

const TagsSchema = nativeSchema.array(
  nativeSchema.string().min(1)
).optional()
```


<a name="readmemd"></a>

**@sanzoku-labs/kairo**

***

# @sanzoku-labs/kairo

## Namespaces

- [Result](#namespaceresultmd)
- [schema](#namespaceschemamd)

## Interfaces

### DataBaseOptions

Base options for all DATA methods

#### Extends

- [`BaseOptions`](#baseoptions)

#### Extended by

- [`SchemaOptions`](#schemaoptions)
- [`DataValidationOptions`](#datavalidationoptions)
- [`DataTransformOptions`](#datatransformoptions)
- [`ConvertOptions`](#convertoptions)
- [`AggregateOptions`](#aggregateoptions)
- [`GroupByOptions`](#groupbyoptions)
- [`SerializeOptions`](#serializeoptions)
- [`DeserializeOptions`](#deserializeoptions)
- [`CloneOptions`](#cloneoptions)
- [`MergeOptions`](#mergeoptions)

***

### SchemaOptions

Schema creation options

#### Extends

- [`DataBaseOptions`](#databaseoptions)

***

### DataValidationOptions

Validation options

#### Extends

- [`DataBaseOptions`](#databaseoptions).[`ValidationOptions`](#validationoptions)

***

### DataTransformOptions

Transform options

#### Extends

- [`DataBaseOptions`](#databaseoptions).[`TransformOptions`](#transformoptions)

***

### ConvertOptions

Convert options for schema migration

#### Extends

- [`DataBaseOptions`](#databaseoptions)

***

### AggregateOptions

Aggregate options

#### Extends

- [`DataBaseOptions`](#databaseoptions)

***

### GroupByOptions

GroupBy options

#### Extends

- [`DataBaseOptions`](#databaseoptions)

***

### SerializeOptions

Serialization options

#### Extends

- [`DataBaseOptions`](#databaseoptions)

***

### DeserializeOptions

Deserialization options

#### Extends

- [`DataBaseOptions`](#databaseoptions)

***

### CloneOptions

Clone options

#### Extends

- [`DataBaseOptions`](#databaseoptions)

***

### MergeOptions

Merge options

#### Extends

- [`DataBaseOptions`](#databaseoptions)

***

### AggregateOperations

Aggregation types

***

### PipelineBaseOptions

Base options for all PIPELINE methods

#### Extends

- [`BaseOptions`](#baseoptions)

#### Extended by

- [`MapOptions`](#mapoptions)
- [`ReduceOptions`](#reduceoptions)
- [`ComposeOptions`](#composeoptions)
- [`ChainOptions`](#chainoptions)
- [`BranchOptions`](#branchoptions)
- [`ParallelOptions`](#paralleloptions)
- [`ValidateOptions`](#validateoptions)

***

### MapOptions

Map operation options

#### Extends

- [`PipelineBaseOptions`](#pipelinebaseoptions)

***

### FilterOptions

Filter operation options

#### Extends

- [`BaseOptions`](#baseoptions)

***

### ReduceOptions

Reduce operation options

#### Extends

- [`PipelineBaseOptions`](#pipelinebaseoptions)

***

### ComposeOptions

Compose operation options

#### Extends

- [`PipelineBaseOptions`](#pipelinebaseoptions)

***

### ChainOptions

Chain operation options

#### Extends

- [`PipelineBaseOptions`](#pipelinebaseoptions)

***

### BranchOptions

Branch operation options

#### Extends

- [`PipelineBaseOptions`](#pipelinebaseoptions)

***

### ParallelOptions

Parallel operation options

#### Extends

- [`PipelineBaseOptions`](#pipelinebaseoptions)

***

### ValidateOptions

Validation options

#### Extends

- [`PipelineBaseOptions`](#pipelinebaseoptions)

***

### ValidationRule\<T\>

Validation rule type

#### Type Parameters

##### T

`T`

***

### GetOptions

GET method specific options

#### Extends

- `ServiceBaseOptions`

***

### PostOptions

POST method specific options

#### Extends

- `ServiceBaseOptions`

***

### PutOptions

PUT method specific options

#### Extends

- `ServiceBaseOptions`

***

### PatchOptions

PATCH method specific options

#### Extends

- `ServiceBaseOptions`

***

### DeleteOptions

DELETE method specific options

#### Extends

- `ServiceBaseOptions`

***

### BaseOptions

Base configuration options shared across all Kairo methods

#### Extended by

- [`DataBaseOptions`](#databaseoptions)
- [`PipelineBaseOptions`](#pipelinebaseoptions)
- [`FilterOptions`](#filteroptions)
- [`ValidationOptions`](#validationoptions)
- [`TransformOptions`](#transformoptions)

***

### ValidationOptions

Validation configuration options

#### Extends

- [`BaseOptions`](#baseoptions)

#### Extended by

- [`DataValidationOptions`](#datavalidationoptions)

***

### CacheOptions

Caching configuration options

***

### RetryOptions

Retry configuration options

***

### TransformOptions

Transform configuration options

#### Extends

- [`BaseOptions`](#baseoptions)

#### Extended by

- [`DataTransformOptions`](#datatransformoptions)

***

### ServiceError\<TCode\>

Base error type for SERVICE pillar operations

#### Extends

- `KairoError`

#### Extended by

- [`ServiceHttpError`](#servicehttperror)
- [`ServiceNetworkError`](#servicenetworkerror)

#### Type Parameters

##### TCode

`TCode` *extends* `string` = `"SERVICE_ERROR"`

***

### ServiceHttpError

HTTP-specific error for SERVICE pillar

#### Extends

- [`ServiceError`](#serviceerror)\<`"SERVICE_HTTP_ERROR"`\>

***

### ServiceNetworkError

Network-specific error for SERVICE pillar

#### Extends

- [`ServiceError`](#serviceerror)\<`"SERVICE_NETWORK_ERROR"`\>

***

### DataError\<TCode\>

Base error type for DATA pillar operations

#### Extends

- `KairoError`

#### Type Parameters

##### TCode

`TCode` *extends* `string` = `"DATA_ERROR"`

***

### PipelineError\<TCode\>

Base error type for PIPELINE pillar operations

#### Extends

- `KairoError`

#### Type Parameters

##### TCode

`TCode` *extends* `string` = `"PIPELINE_ERROR"`

***

### ValidationError

Detailed validation error with field paths and multiple issues.
Part of the DATA pillar's comprehensive error handling system.

 ValidationError

#### Example

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
  }]
}
```

#### Extends

- `KairoError`

#### Properties

##### code

```ts
code: "VALIDATION_ERROR";
```

Always 'VALIDATION_ERROR' for schema validation errors

###### Overrides

```ts
KairoError.code
```

##### field?

```ts
optional field: string;
```

Name of the field that failed validation

##### expected?

```ts
optional expected: string;
```

Expected value or type description

##### actual?

```ts
optional actual: unknown;
```

The actual value that failed validation

##### fieldPath

```ts
fieldPath: string[];
```

Path to the field in nested objects

##### issues

```ts
issues: object[];
```

Detailed list of all validation issues

###### path

```ts
path: (string | number)[];
```

Path to the specific field that failed

###### message

```ts
message: string;
```

Human-readable error message

###### code

```ts
code: string;
```

Error code for programmatic handling

###### expected?

```ts
optional expected: string;
```

Expected value or type

###### received?

```ts
optional received: string;
```

Received value type

***

### Schema\<T\>

Core schema interface for the DATA pillar's type-safe validation system.

Provides declarative data validation with Result types, composition methods,
and transformation capabilities. All schemas implement this interface for
consistent behavior across the system.

#### Example

```typescript
// Basic usage
const UserSchema: Schema<User> = schema.object({
  name: schema.string().min(2),
  email: schema.string().email(),
  age: schema.number().min(0).max(150)
})

// Validation with Result types
const result = UserSchema.parse(userData)
if (Result.isOk(result)) {
  console.log('Valid user:', result.value)
} else {
  console.error('Validation failed:', result.error.issues)
}

// Safe parsing
const safeResult = UserSchema.safeParse(userData)
if (safeResult.success) {
  console.log('User:', safeResult.data)
}

// Composition
const OptionalUserSchema = UserSchema.optional()
const UserWithDefaultsSchema = UserSchema.default({
  name: 'Anonymous',
  email: 'anonymous@example.com',
  age: 0
})
```

#### Type Parameters

##### T

`T`

The type this schema validates

 Schema

#### Properties

##### type

```ts
readonly type: string;
```

Type identifier for runtime introspection

##### isOptional

```ts
readonly isOptional: boolean;
```

Whether this schema accepts undefined values

##### defaultValue?

```ts
readonly optional defaultValue: T;
```

Default value if provided

#### Methods

##### parse()

```ts
parse(input): Result<ValidationError, T>;
```

Parse and validate input, returning Result with typed output or validation error

###### Parameters

###### input

`unknown`

###### Returns

[`Result`](#result)\<[`ValidationError`](#validationerror), `T`\>

##### safeParse()

```ts
safeParse(input): object;
```

Safe parsing that returns success/failure object instead of Result

###### Parameters

###### input

`unknown`

###### Returns

`object`

###### success

```ts
success: boolean;
```

###### data?

```ts
optional data: T;
```

###### error?

```ts
optional error: ValidationError;
```

##### optional()

```ts
optional(): Schema<undefined | T>;
```

Make this schema optional (allows undefined)

###### Returns

[`Schema`](#schema-1)\<`undefined` \| `T`\>

##### nullable()

```ts
nullable(): Schema<null | T>;
```

Make this schema nullable (allows null)

###### Returns

[`Schema`](#schema-1)\<`null` \| `T`\>

##### default()

```ts
default(value): Schema<T>;
```

Provide a default value for missing/undefined input

###### Parameters

###### value

`T`

###### Returns

[`Schema`](#schema-1)\<`T`\>

##### transform()

```ts
transform<U>(fn): Schema<U>;
```

Transform validated value to a different type

###### Type Parameters

###### U

`U`

###### Parameters

###### fn

(`value`) => `U`

###### Returns

[`Schema`](#schema-1)\<`U`\>

##### refine()

```ts
refine(predicate, message?): Schema<T>;
```

Add custom validation predicate with error message

###### Parameters

###### predicate

(`value`) => `boolean`

###### message?

`string`

###### Returns

[`Schema`](#schema-1)\<`T`\>

## Type Aliases

### DataResult\<T\>

```ts
type DataResult<T> = Result<DataError, T>;
```

DATA method result types

#### Type Parameters

##### T

`T`

***

### DataType

```ts
type DataType = 
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "date"
  | "null"
  | "undefined";
```

Data types for schema inference

***

### SerializationFormat

```ts
type SerializationFormat = "json" | "csv" | "xml" | "yaml" | "protobuf" | "msgpack";
```

Serialization format types

***

### PipelineResult\<T\>

```ts
type PipelineResult<T> = Result<PipelineError, T>;
```

PIPELINE method result types

#### Type Parameters

##### T

`T`

***

### PipelineOperation\<TInput, TOutput\>

```ts
type PipelineOperation<TInput, TOutput> = 
  | (data) => TOutput
  | (data) => Promise<TOutput>
  | (data) => PipelineResult<TOutput>
| (data) => Promise<PipelineResult<TOutput>>;
```

Pipeline operation function type

#### Type Parameters

##### TInput

`TInput`

##### TOutput

`TOutput` = `TInput`

***

### TransformFunction()\<TInput, TOutput\>

```ts
type TransformFunction<TInput, TOutput> = (item, index, array) => TOutput | Promise<TOutput>;
```

Transform function for map operations

#### Type Parameters

##### TInput

`TInput`

##### TOutput

`TOutput`

#### Parameters

##### item

`TInput`

##### index

`number`

##### array

`TInput`[]

#### Returns

`TOutput` \| `Promise`\<`TOutput`\>

***

### PredicateFunction()\<T\>

```ts
type PredicateFunction<T> = (item, index, array) => boolean | Promise<boolean>;
```

Predicate function for filter operations

#### Type Parameters

##### T

`T`

#### Parameters

##### item

`T`

##### index

`number`

##### array

`T`[]

#### Returns

`boolean` \| `Promise`\<`boolean`\>

***

### ReducerFunction()\<TInput, TOutput\>

```ts
type ReducerFunction<TInput, TOutput> = (accumulator, item, index, array) => TOutput | Promise<TOutput>;
```

Reducer function for reduce operations

#### Type Parameters

##### TInput

`TInput`

##### TOutput

`TOutput`

#### Parameters

##### accumulator

`TOutput`

##### item

`TInput`

##### index

`number`

##### array

`TInput`[]

#### Returns

`TOutput` \| `Promise`\<`TOutput`\>

***

### ComposedPipeline()\<TInput, TOutput\>

```ts
type ComposedPipeline<TInput, TOutput> = (data) => 
  | PipelineResult<TOutput>
| Promise<PipelineResult<TOutput>>;
```

Composed pipeline function type

#### Type Parameters

##### TInput

`TInput`

##### TOutput

`TOutput`

#### Parameters

##### data

`TInput`

#### Returns

  \| [`PipelineResult`](#pipelineresult)\<`TOutput`\>
  \| `Promise`\<[`PipelineResult`](#pipelineresult)\<`TOutput`\>\>

***

### ServiceResult\<T\>

```ts
type ServiceResult<T> = Result<
  | ServiceError
  | ServiceHttpError
| ServiceNetworkError, T>;
```

SERVICE method result types

#### Type Parameters

##### T

`T`

***

### AllKairoErrors

```ts
type AllKairoErrors = 
  | ServiceError
  | ServiceHttpError
  | ServiceNetworkError
  | DataError
  | DataValidationError
  | DataTransformError
  | DataAggregateError
  | PipelineError
  | PipelineCompositionError
  | PipelineValidationError;
```

Union type of all Kairo pillar errors

***

### Result\<E, T\>

```ts
type Result<E, T> = 
  | {
  tag: "Ok";
  value: T;
}
  | {
  tag: "Err";
  error: E;
};
```

Core Result type for safe error handling across all Kairo pillars.

Represents either a successful value (Ok) or an error (Err). This type is used
throughout Kairo to eliminate throwing exceptions and provide explicit,
type-safe error handling. Integrates seamlessly with functional programming
patterns and pipeline composition.

#### Type Parameters

##### E

`E`

The error type

##### T

`T`

The success value type

#### Example

```typescript
// Function that returns a Result
function divide(a: number, b: number): Result<string, number> {
  if (b === 0) {
    return Result.Err('Division by zero')
  }
  return Result.Ok(a / b)
}

// Using Results
const result = divide(10, 2)
if (Result.isOk(result)) {
  console.log('Success:', result.value) // 5
} else {
  console.error('Error:', result.error)
}

// Pipeline integration
const mathPipeline = pipeline('math')
  .input(schema.object({ a: schema.number(), b: schema.number() }))
  .map(({ a, b }) => divide(a, b))
  .flatMap(result => result) // Unwrap nested Result
```

***

### OkResult\<T\>

```ts
type OkResult<T> = object;
```

Success variant of Result containing a value.

#### Type Parameters

##### T

`T`

The success value type

***

### ErrResult\<E\>

```ts
type ErrResult<E> = object;
```

Error variant of Result containing an error.

#### Type Parameters

##### E

`E`

The error type

## Variables

### data

```ts
const data: object;
```

DATA Pillar API

All DATA methods follow the same pattern:
data.method(input, config, options?) -> Result<DataError, T>

#### Type declaration

##### schema()

```ts
schema: <T>(definition, options) => Schema<T>;
```

Create native schema for validation

###### Type Parameters

###### T

`T`

###### Parameters

###### definition

`SchemaDefinition`\<`T`\>

###### options

[`SchemaOptions`](#schemaoptions) = `{}`

###### Returns

[`Schema`](#schema-1)\<`T`\>

##### validate()

```ts
validate: <T>(input, schema, options) => DataResult<T>;
```

Validate data against schema

###### Type Parameters

###### T

`T`

###### Parameters

###### input

`unknown`

###### schema

[`Schema`](#schema-1)\<`T`\>

###### options

[`DataValidationOptions`](#datavalidationoptions) = `{}`

###### Returns

[`DataResult`](#dataresult)\<`T`\>

##### transform()

```ts
transform: <TInput, TOutput>(input, mapping, options) => DataResult<TOutput>;
```

Transform data structure according to mapping

###### Type Parameters

###### TInput

`TInput`

###### TOutput

`TOutput`

###### Parameters

###### input

`TInput`

###### mapping

`TransformMapping`\<`TInput`, `TOutput`\>

###### options

[`DataTransformOptions`](#datatransformoptions) = `{}`

###### Returns

[`DataResult`](#dataresult)\<`TOutput`\>

##### convert()

```ts
convert: <TInput, TOutput>(input, fromSchema, toSchema, mapping, options) => DataResult<TOutput>;
```

Convert between different data schemas

###### Type Parameters

###### TInput

`TInput`

###### TOutput

`TOutput`

###### Parameters

###### input

`TInput`

###### fromSchema

[`Schema`](#schema-1)\<`TInput`\>

###### toSchema

[`Schema`](#schema-1)\<`TOutput`\>

###### mapping

`Record`\<`string`, `string` \| (`data`) => `unknown`\>

###### options

[`ConvertOptions`](#convertoptions) = `{}`

###### Returns

[`DataResult`](#dataresult)\<`TOutput`\>

##### aggregate()

```ts
aggregate: <T, R>(input, operations, _options) => DataResult<R>;
```

Perform statistical operations on data collections

###### Type Parameters

###### T

`T`

###### R

`R` = `AggregateResult`

###### Parameters

###### input

`T`[]

###### operations

[`AggregateOperations`](#aggregateoperations)

###### \_options

[`AggregateOptions`](#aggregateoptions) = `{}`

###### Returns

[`DataResult`](#dataresult)\<`R`\>

##### groupBy()

```ts
groupBy: <T, K>(input, keys, options) => DataResult<Record<string, T[]>>;
```

Group data by specified criteria

###### Type Parameters

###### T

`T`

###### K

`K` *extends* `string` \| `number` \| `symbol`

###### Parameters

###### input

`T`[]

###### keys

`K` | `GroupByKeyFunction`\<`T`\> | `K`[]

###### options

[`GroupByOptions`](#groupbyoptions) = `{}`

###### Returns

[`DataResult`](#dataresult)\<`Record`\<`string`, `T`[]\>\>

##### serialize()

```ts
serialize: <T>(input, format, options) => DataResult<string | Buffer<ArrayBufferLike>>;
```

Serialize data to various formats

###### Type Parameters

###### T

`T`

###### Parameters

###### input

`T`

###### format

[`SerializationFormat`](#serializationformat)

###### options

[`SerializeOptions`](#serializeoptions) = `{}`

###### Returns

[`DataResult`](#dataresult)\<`string` \| `Buffer`\<`ArrayBufferLike`\>\>

##### deserialize()

```ts
deserialize: <T>(input, format, schema?, options) => DataResult<T>;
```

Deserialize data from various formats

###### Type Parameters

###### T

`T`

###### Parameters

###### input

`string` | `Buffer`\<`ArrayBufferLike`\>

###### format

[`SerializationFormat`](#serializationformat)

###### schema?

[`Schema`](#schema-1)\<`T`\>

###### options?

[`DeserializeOptions`](#deserializeoptions) = `{}`

###### Returns

[`DataResult`](#dataresult)\<`T`\>

##### clone()

```ts
clone: <T>(input, options) => DataResult<T>;
```

Deep clone data structures

###### Type Parameters

###### T

`T`

###### Parameters

###### input

`T`

###### options

[`CloneOptions`](#cloneoptions) = `{}`

###### Returns

[`DataResult`](#dataresult)\<`T`\>

##### merge()

```ts
merge: <T>(target, sources, options) => DataResult<T>;
```

Merge multiple objects into a single object with configurable strategies

###### Type Parameters

###### T

`T` *extends* `Record`\<`string`, `unknown`\>

###### Parameters

###### target

`T`

Base object to merge into

###### sources

`Partial`\<`T`\>[]

Objects to merge from

###### options

[`MergeOptions`](#mergeoptions) = `{}`

Merge configuration options

###### Returns

[`DataResult`](#dataresult)\<`T`\>

Result with merged object or error

###### Example

```typescript
const base = { a: 1, b: { x: 1 } }
const update = { b: { y: 2 }, c: 3 }

const result = merge(base, [update], {
  deep: true,
  strategy: 'source-wins'
})

if (Result.isOk(result)) {
  // result.value: { a: 1, b: { x: 1, y: 2 }, c: 3 }
}
```

##### get()

```ts
get: <T>(obj, path) => undefined | T;
```

Safely access nested object properties

###### Type Parameters

###### T

`T` = `unknown`

###### Parameters

###### obj

`Record`\<`string`, `unknown`\>

Object to access

###### path

`PropertyPath`

Property path (string or array)

###### Returns

`undefined` \| `T`

Property value or undefined

##### set()

```ts
set: <T>(obj, path, value) => Record<string, unknown>;
```

Safely set nested object properties (immutable)

###### Type Parameters

###### T

`T` = `unknown`

###### Parameters

###### obj

`Record`\<`string`, `unknown`\>

Object to update

###### path

`PropertyPath`

Property path

###### value

`T`

Value to set

###### Returns

`Record`\<`string`, `unknown`\>

New object with updated property

##### has()

```ts
has: (obj, path) => boolean;
```

Check if nested property exists

###### Parameters

###### obj

`Record`\<`string`, `unknown`\>

Object to check

###### path

`PropertyPath`

Property path

###### Returns

`boolean`

True if property exists

##### inferType()

```ts
inferType: (value) => DataType;
```

Infer data type for schema generation

###### Parameters

###### value

`unknown`

Value to analyze

###### Returns

[`DataType`](#datatype)

Inferred data type

##### isValid()

```ts
isValid: <T>(value, schema) => boolean;
```

Quick validation check without full Result

###### Type Parameters

###### T

`T`

###### Parameters

###### value

`unknown`

Value to validate

###### schema

[`Schema`](#schema-1)\<`T`\>

Schema to validate against

###### Returns

`boolean`

True if value is valid

##### unique()

```ts
unique: <T>(array, keyFn?) => T[];
```

Remove duplicates from arrays

###### Type Parameters

###### T

`T`

###### Parameters

###### array

`T`[]

Array to deduplicate

###### keyFn?

`UniqueKeyFunction`\<`T`\>

Optional function to extract comparison key

###### Returns

`T`[]

Array with duplicates removed

##### flatten()

```ts
flatten: <T>(array, depth) => T[];
```

Flatten nested arrays

###### Type Parameters

###### T

`T`

###### Parameters

###### array

(`T` \| `T`[])[]

Array to flatten

###### depth

`number` = `1`

Maximum depth to flatten (default: 1)

###### Returns

`T`[]

Flattened array

##### deepClone()

```ts
deepClone: <T>(value, options) => T;
```

Deep clone objects and arrays

###### Type Parameters

###### T

`T`

###### Parameters

###### value

`T`

Value to clone

###### options

Clone options

###### preservePrototype?

`boolean`

###### handleCircular?

`boolean`

###### Returns

`T`

Deep cloned value

##### pick()

```ts
pick: (obj, paths) => Record<string, unknown>;
```

Extract multiple properties from an object

###### Parameters

###### obj

`Record`\<`string`, `unknown`\>

Source object

###### paths

`PropertyPath`[]

Array of property paths to extract

###### Returns

`Record`\<`string`, `unknown`\>

Object with extracted properties

##### omit()

```ts
omit: (obj, paths) => Record<string, unknown>;
```

Omit properties from an object

###### Parameters

###### obj

`Record`\<`string`, `unknown`\>

Source object

###### paths

`PropertyPath`[]

Array of property paths to omit

###### Returns

`Record`\<`string`, `unknown`\>

Object with omitted properties

##### isPlainObject()

```ts
isPlainObject: (value) => value is Record<string, unknown>;
```

Check if a value is a plain object (not array, date, etc.)

###### Parameters

###### value

`unknown`

Value to check

###### Returns

`value is Record<string, unknown>`

True if value is a plain object

##### isEmpty()

```ts
isEmpty: (value) => boolean;
```

Check if a value is empty (null, undefined, empty string, empty array, empty object)

###### Parameters

###### value

`unknown`

Value to check

###### Returns

`boolean`

True if value is empty

##### stringify()

```ts
stringify: (value, options) => string;
```

Convert any value to a string representation

###### Parameters

###### value

`unknown`

Value to stringify

###### options

Stringify options

###### pretty?

`boolean`

###### maxDepth?

`number`

###### replacer?

(`key`, `value`) => `unknown`

###### Returns

`string`

String representation

##### isError()

```ts
readonly isError: (error) => error is DataError<"DATA_ERROR"> = isDataError;
```

Type guard for data errors

###### Parameters

###### error

`unknown`

Error to check

###### Returns

`error is DataError<"DATA_ERROR">`

True if error is a DataError

#### Example

```typescript
// Schema creation and validation
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 150 }
})

const result = data.validate(userData, UserSchema)

// Data transformation
const normalized = data.transform(apiResponse, {
  id: 'user_id',
  name: 'full_name',
  email: 'email_address',
  createdAt: (input) => new Date(input.created_timestamp)
})

// Data aggregation
const salesStats = data.aggregate(salesData, {
  groupBy: ['region', 'quarter'],
  sum: ['revenue', 'units'],
  avg: ['orderValue', 'discount'],
  count: '*'
})

// Safe property access
const email = data.get(userData, 'contact.email')
const updated = data.set(userData, 'lastLogin', new Date())

// Error handling
if (Result.isErr(result)) {
  if (data.isError(result.error)) {
    // Handle error appropriately
  }
}
```

***

### pipeline

```ts
const pipeline: object;
```

PIPELINE Pillar API

All PIPELINE methods follow the same pattern:
pipeline.method(data, operation, options?) -> Result<PipelineError, T>

#### Type declaration

##### map()

```ts
map: <TInput, TOutput>(data, transform, options) => 
  | PipelineResult<TOutput[]>
| Promise<PipelineResult<TOutput[]>>;
```

Transform each item in a collection

###### Type Parameters

###### TInput

`TInput`

###### TOutput

`TOutput`

###### Parameters

###### data

`TInput`[]

###### transform

[`TransformFunction`](#transformfunction)\<`TInput`, `TOutput`\>

###### options

[`MapOptions`](#mapoptions) = `{}`

###### Returns

  \| [`PipelineResult`](#pipelineresult)\<`TOutput`[]\>
  \| `Promise`\<[`PipelineResult`](#pipelineresult)\<`TOutput`[]\>\>

##### filter()

```ts
filter: <T>(data, predicate, options) => 
  | PipelineResult<T[]>
| Promise<PipelineResult<T[]>>;
```

Filter collection based on predicate

###### Type Parameters

###### T

`T`

###### Parameters

###### data

`T`[]

###### predicate

[`PredicateFunction`](#predicatefunction)\<`T`\>

###### options

[`FilterOptions`](#filteroptions) = `{}`

###### Returns

  \| [`PipelineResult`](#pipelineresult)\<`T`[]\>
  \| `Promise`\<[`PipelineResult`](#pipelineresult)\<`T`[]\>\>

##### reduce()

```ts
reduce: <TInput, TOutput>(data, reducer, initialValue, options) => 
  | PipelineResult<TOutput>
| Promise<PipelineResult<TOutput>>;
```

Reduce collection to single value

###### Type Parameters

###### TInput

`TInput`

###### TOutput

`TOutput`

###### Parameters

###### data

`TInput`[]

###### reducer

[`ReducerFunction`](#reducerfunction)\<`TInput`, `TOutput`\>

###### initialValue

`TOutput`

###### options

[`ReduceOptions`](#reduceoptions) = `{}`

###### Returns

  \| [`PipelineResult`](#pipelineresult)\<`TOutput`\>
  \| `Promise`\<[`PipelineResult`](#pipelineresult)\<`TOutput`\>\>

##### compose()

```ts
compose: <TInput, TOutput>(operations, options) => ComposedPipeline<TInput, TOutput>;
```

Compose multiple operations into single pipeline

###### Type Parameters

###### TInput

`TInput`

###### TOutput

`TOutput`

###### Parameters

###### operations

[`PipelineOperation`](#pipelineoperation)\<`unknown`, `unknown`\>[]

###### options

[`ComposeOptions`](#composeoptions) = `{}`

###### Returns

[`ComposedPipeline`](#composedpipeline)\<`TInput`, `TOutput`\>

##### chain()

```ts
chain: <TInput, TOutput>(data, operations, options) => Promise<PipelineResult<TOutput>>;
```

Chain operations with data flowing through

###### Type Parameters

###### TInput

`TInput`

###### TOutput

`TOutput`

###### Parameters

###### data

`TInput`

###### operations

`ChainOperation`\<`unknown`, `unknown`\>[]

###### options

[`ChainOptions`](#chainoptions) = `{}`

###### Returns

`Promise`\<[`PipelineResult`](#pipelineresult)\<`TOutput`\>\>

##### branch()

```ts
branch: <TInput, TOutput>(data, conditions, options) => 
  | PipelineResult<TOutput>
| Promise<PipelineResult<TOutput>>;
```

Conditional execution based on data - routes data into multiple branches based on conditions

###### Type Parameters

###### TInput

`TInput`

###### TOutput

`TOutput` = `Record`\<`string`, `TInput`[]\>

###### Parameters

###### data

`TInput` | `TInput`[]

###### conditions

`Record`\<`string`, (`item`) => `boolean` \| `Promise`\<`boolean`\>\>

###### options

[`BranchOptions`](#branchoptions) & `object` = `{}`

###### Returns

  \| [`PipelineResult`](#pipelineresult)\<`TOutput`\>
  \| `Promise`\<[`PipelineResult`](#pipelineresult)\<`TOutput`\>\>

##### parallel()

```ts
parallel: <TInput, TOutput>(operations, options) => Promise<PipelineResult<TOutput>>;
```

Execute operations in parallel and combine results

###### Type Parameters

###### TInput

`TInput`

###### TOutput

`TOutput`

###### Parameters

###### operations

`ParallelOperation`\<`TInput`, `unknown`\>[]

###### options

[`ParallelOptions`](#paralleloptions) = `{}`

###### Returns

`Promise`\<[`PipelineResult`](#pipelineresult)\<`TOutput`\>\>

##### validate()

```ts
validate: <T>(data, schema, options) => Promise<PipelineResult<T>>;
```

Validate data against schema or rules

###### Type Parameters

###### T

`T`

###### Parameters

###### data

`T`

###### schema

[`Schema`](#schema-1)\<`T`\> | [`ValidationRule`](#validationrule)\<`T`\>[]

###### options

[`ValidateOptions`](#validateoptions) = `{}`

###### Returns

`Promise`\<[`PipelineResult`](#pipelineresult)\<`T`\>\>

##### curry()

```ts
curry: <TArgs, TReturn>(fn) => CurriedFunction<TArgs, TReturn>;
```

Create curried versions of functions for composition

###### Type Parameters

###### TArgs

`TArgs` *extends* `unknown`[]

###### TReturn

`TReturn`

###### Parameters

###### fn

(...`args`) => `TReturn`

Function to curry

###### Returns

`CurriedFunction`\<`TArgs`, `TReturn`\>

Curried function

##### partial()

```ts
partial: <TArgs, TReturn>(fn, ...partialArgs) => (...remainingArgs) => TReturn;
```

Create partially applied functions

###### Type Parameters

###### TArgs

`TArgs` *extends* `unknown`[]

###### TReturn

`TReturn`

###### Parameters

###### fn

(...`args`) => `TReturn`

Function to partially apply

###### partialArgs

...`unknown`[]

Arguments to pre-fill

###### Returns

Partially applied function

```ts
(...remainingArgs): TReturn;
```

###### Parameters

###### remainingArgs

...`unknown`[]

###### Returns

`TReturn`

##### when()

```ts
when: <T>(condition, thenFn, elseFn?) => (data) => T;
```

Conditional execution function

###### Type Parameters

###### T

`T`

###### Parameters

###### condition

(`data`) => `boolean`

Condition to check

###### thenFn

(`data`) => `T`

Function to execute if condition is true

###### elseFn?

(`data`) => `T`

Function to execute if condition is false

###### Returns

Conditional function

```ts
(data): T;
```

###### Parameters

###### data

`T`

###### Returns

`T`

##### unless()

```ts
unless: <T>(condition, fn) => (data) => T;
```

Execute function unless condition is true

###### Type Parameters

###### T

`T`

###### Parameters

###### condition

(`data`) => `boolean`

Condition to check

###### fn

(`data`) => `T`

Function to execute if condition is false

###### Returns

Guard function

```ts
(data): T;
```

###### Parameters

###### data

`T`

###### Returns

`T`

##### sequence()

```ts
sequence: <T>(operations) => (data) => Promise<T>;
```

Execute async operations in sequence

###### Type Parameters

###### T

`T`

###### Parameters

###### operations

(`data`) => `Promise`\<`T`\>[]

Array of async operations

###### Returns

Composed sequential function

```ts
(data): Promise<T>;
```

###### Parameters

###### data

`T`

###### Returns

`Promise`\<`T`\>

##### trap()

```ts
trap: <T, E>(fn, handler?) => (data) => PipelineResult<T>;
```

Wrap functions to catch errors and return Results

###### Type Parameters

###### T

`T`

###### E

`E` = `Error`

###### Parameters

###### fn

(`data`) => `T`

Function to wrap

###### handler?

(`error`, `data`) => `T`

Optional error handler

###### Returns

Safe function that returns Result

```ts
(data): PipelineResult<T>;
```

###### Parameters

###### data

`T`

###### Returns

[`PipelineResult`](#pipelineresult)\<`T`\>

##### retry()

```ts
retry: <T>(fn, options) => Promise<PipelineResult<T>>;
```

Execute function with retry logic

###### Type Parameters

###### T

`T`

###### Parameters

###### fn

() => `T` \| `Promise`\<`T`\>

Function to execute

###### options

Retry options

###### maxAttempts?

`number`

###### delay?

`number`

###### backoff?

`"linear"` \| `"exponential"`

###### retryOn?

`string`[]

###### Returns

`Promise`\<[`PipelineResult`](#pipelineresult)\<`T`\>\>

Promise with retry logic

##### delay()

```ts
delay: <T>(fn, delayMs) => (data) => Promise<T>;
```

Add delay to function execution

###### Type Parameters

###### T

`T`

###### Parameters

###### fn

(`data`) => `T` \| `Promise`\<`T`\>

Function to delay

###### delayMs

`number`

Delay in milliseconds

###### Returns

Delayed function

```ts
(data): Promise<T>;
```

###### Parameters

###### data

`T`

###### Returns

`Promise`\<`T`\>

##### timeout()

```ts
timeout: <T>(fn, timeoutMs) => (data) => Promise<PipelineResult<T>>;
```

Execute function with timeout

###### Type Parameters

###### T

`T`

###### Parameters

###### fn

(`data`) => `T` \| `Promise`\<`T`\>

Function to execute

###### timeoutMs

`number`

Timeout in milliseconds

###### Returns

Function with timeout

```ts
(data): Promise<PipelineResult<T>>;
```

###### Parameters

###### data

`T`

###### Returns

`Promise`\<[`PipelineResult`](#pipelineresult)\<`T`\>\>

##### tap()

```ts
tap: <T>(fn) => (data) => Promise<T>;
```

Tap into pipeline for side effects without modifying data

###### Type Parameters

###### T

`T`

###### Parameters

###### fn

(`data`) => `void` \| `Promise`\<`void`\>

Side effect function

###### Returns

Tap function that returns original data

```ts
(data): Promise<T>;
```

###### Parameters

###### data

`T`

###### Returns

`Promise`\<`T`\>

##### memoize()

```ts
memoize: <T, R>(fn, keyFn?) => (data) => R;
```

Memoize function results

###### Type Parameters

###### T

`T`

###### R

`R`

###### Parameters

###### fn

(`data`) => `R`

Function to memoize

###### keyFn?

(`data`) => `string`

Function to generate cache key

###### Returns

Memoized function

```ts
(data): R;
```

###### Parameters

###### data

`T`

###### Returns

`R`

##### debounce()

```ts
debounce: <T>(fn, wait) => (data) => void;
```

Debounce function execution

###### Type Parameters

###### T

`T`

###### Parameters

###### fn

(`data`) => `void` \| `Promise`\<`void`\>

Function to debounce

###### wait

`number`

Wait time in milliseconds

###### Returns

Debounced function

```ts
(data): void;
```

###### Parameters

###### data

`T`

###### Returns

`void`

##### throttle()

```ts
throttle: <T>(fn, limit) => (data) => void;
```

Throttle function execution

###### Type Parameters

###### T

`T`

###### Parameters

###### fn

(`data`) => `void` \| `Promise`\<`void`\>

Function to throttle

###### limit

`number`

Time limit in milliseconds

###### Returns

Throttled function

```ts
(data): void;
```

###### Parameters

###### data

`T`

###### Returns

`void`

##### guard()

```ts
guard: <T>(predicate, errorMessage) => (data) => PipelineResult<T>;
```

Create a guard function that validates input

###### Type Parameters

###### T

`T`

###### Parameters

###### predicate

(`data`) => `boolean`

Validation predicate

###### errorMessage

`string` = `'Guard condition failed'`

Error message if validation fails

###### Returns

Guard function

```ts
(data): PipelineResult<T>;
```

###### Parameters

###### data

`T`

###### Returns

[`PipelineResult`](#pipelineresult)\<`T`\>

##### createContext()

```ts
createContext: (operationName, metadata?) => PipelineContext;
```

Create execution context for pipeline operations

###### Parameters

###### operationName

`string`

Name of the operation

###### metadata?

`Record`\<`string`, `unknown`\>

Additional metadata

###### Returns

`PipelineContext`

Pipeline context

##### addTrace()

```ts
addTrace: (context, operation) => PipelineContext;
```

Add trace information to context

###### Parameters

###### context

`PipelineContext`

Pipeline context

###### operation

`string`

Operation name

###### Returns

`PipelineContext`

Updated context

##### isError()

```ts
readonly isError: (error) => error is PipelineError<"PIPELINE_ERROR"> = isPipelineError;
```

Check if a value is a pipeline error

###### Parameters

###### error

`unknown`

Error to check

###### Returns

`error is PipelineError<"PIPELINE_ERROR">`

True if error is a PipelineError

##### extractSuccessful()

```ts
extractSuccessful: <T>(results) => T[];
```

Extract results from an array of Results, filtering out errors

###### Type Parameters

###### T

`T`

###### Parameters

###### results

[`PipelineResult`](#pipelineresult)\<`T`\>[]

Array of Results

###### Returns

`T`[]

Array of successful values

##### extractErrors()

```ts
extractErrors: <T>(results) => PipelineError<"PIPELINE_ERROR">[];
```

Extract errors from an array of Results

###### Type Parameters

###### T

`T`

###### Parameters

###### results

[`PipelineResult`](#pipelineresult)\<`T`\>[]

Array of Results

###### Returns

[`PipelineError`](#pipelineerror)\<`"PIPELINE_ERROR"`\>[]

Array of errors

##### combineResults()

```ts
combineResults: <T>(results) => PipelineResult<T[]>;
```

Combine multiple Results into a single Result

###### Type Parameters

###### T

`T`

###### Parameters

###### results

[`PipelineResult`](#pipelineresult)\<`T`\>[]

Array of Results

###### Returns

[`PipelineResult`](#pipelineresult)\<`T`[]\>

Combined Result

##### allSuccessful()

```ts
allSuccessful: <T>(results) => boolean;
```

Check if all Results are successful

###### Type Parameters

###### T

`T`

###### Parameters

###### results

[`PipelineResult`](#pipelineresult)\<`T`\>[]

Array of Results

###### Returns

`boolean`

True if all Results are Ok

##### anySuccessful()

```ts
anySuccessful: <T>(results) => boolean;
```

Check if any Results are successful

###### Type Parameters

###### T

`T`

###### Parameters

###### results

[`PipelineResult`](#pipelineresult)\<`T`\>[]

Array of Results

###### Returns

`boolean`

True if any Result is Ok

##### toResult()

```ts
toResult: <TInput, TOutput>(fn) => (data) => PipelineResult<TOutput>;
```

Convert a regular function to return a Result

###### Type Parameters

###### TInput

`TInput`

###### TOutput

`TOutput`

###### Parameters

###### fn

(`data`) => `TOutput`

Function to convert

###### Returns

Function that returns Result

```ts
(data): PipelineResult<TOutput>;
```

###### Parameters

###### data

`TInput`

###### Returns

[`PipelineResult`](#pipelineresult)\<`TOutput`\>

##### toAsyncResult()

```ts
toAsyncResult: <TInput, TOutput>(fn) => (data) => Promise<PipelineResult<TOutput>>;
```

Convert an async function to return a Result

###### Type Parameters

###### TInput

`TInput`

###### TOutput

`TOutput`

###### Parameters

###### fn

(`data`) => `Promise`\<`TOutput`\>

Async function to convert

###### Returns

Async function that returns Result

```ts
(data): Promise<PipelineResult<TOutput>>;
```

###### Parameters

###### data

`TInput`

###### Returns

`Promise`\<[`PipelineResult`](#pipelineresult)\<`TOutput`\>\>

#### Example

```typescript
// Data transformation
const doubled = await pipeline.map([1, 2, 3], x => x * 2)
const adults = await pipeline.filter(users, user => user.age >= 18)
const total = await pipeline.reduce(orders, (sum, order) => sum + order.total, 0)

// Function composition
const processUser = pipeline.compose([
  user => pipeline.validate(user, UserSchema),
  user => data.transform(user, normalizeUser),
  user => enrichWithBusinessData(user)
])

// Conditional execution
const result = await pipeline.branch(user,
  user => user.type,
  {
    'admin': processAdmin,
    'user': processUser,
    'guest': processGuest
  }
)

// Parallel processing
const enriched = await pipeline.parallel(user, [
  user => service.get(`/profile/${user.id}`),
  user => service.get(`/preferences/${user.id}`),
  user => service.get(`/activity/${user.id}`)
], {
  combiner: (user, [profile, prefs, activity]) => ({
    ...user, profile, preferences: prefs, recentActivity: activity
  })
})

// Functional utilities
const multiply = pipeline.curry((factor: number, value: number) => value * factor)
const double = multiply(2)

const safeProcess = pipeline.trap(riskyOperation, (error, data) => defaultValue)

// Error handling
if (Result.isErr(result)) {
  if (pipeline.isError(result.error)) {
    // Handle error appropriately
  }
}
```

***

### service

```ts
const service: object;
```

SERVICE Pillar API

All SERVICE methods follow the same pattern:
service.method(url, data?, options?) -> Promise<Result<ServiceError, T>>

#### Type declaration

##### get()

```ts
get: <T>(url, options) => Promise<ServiceResult<T>>;
```

GET method - Fetch data from HTTP endpoints with intelligent caching

###### Type Parameters

###### T

`T` = `unknown`

###### Parameters

###### url

`string`

###### options

[`GetOptions`](#getoptions) = `{}`

###### Returns

`Promise`\<[`ServiceResult`](#serviceresult)\<`T`\>\>

##### post()

```ts
post: <TData, TResponse>(url, data?, options) => Promise<ServiceResult<TResponse>>;
```

POST method - Create resources with proper content handling

###### Type Parameters

###### TData

`TData` = `unknown`

###### TResponse

`TResponse` = `unknown`

###### Parameters

###### url

`string`

###### data?

`TData`

###### options?

[`PostOptions`](#postoptions) = `{}`

###### Returns

`Promise`\<[`ServiceResult`](#serviceresult)\<`TResponse`\>\>

##### put()

```ts
put: <TData, TResponse>(url, data, options) => Promise<ServiceResult<TResponse>>;
```

PUT method - Update/replace resources with concurrency support

###### Type Parameters

###### TData

`TData` = `unknown`

###### TResponse

`TResponse` = `unknown`

###### Parameters

###### url

`string`

###### data

`TData`

###### options

[`PutOptions`](#putoptions) = `{}`

###### Returns

`Promise`\<[`ServiceResult`](#serviceresult)\<`TResponse`\>\>

##### patch()

```ts
patch: <TData, TResponse>(url, data, options) => Promise<ServiceResult<TResponse>>;
```

PATCH method - Partial updates with format flexibility

###### Type Parameters

###### TData

`TData` = `unknown`

###### TResponse

`TResponse` = `unknown`

###### Parameters

###### url

`string`

###### data

`TData`

###### options

[`PatchOptions`](#patchoptions) = `{}`

###### Returns

`Promise`\<[`ServiceResult`](#serviceresult)\<`TResponse`\>\>

##### delete()

```ts
readonly delete: <TResponse>(url, options) => Promise<ServiceResult<TResponse>> = deleteMethod;
```

DELETE method - Remove resources with comprehensive options

###### Type Parameters

###### TResponse

`TResponse` = `unknown`

###### Parameters

###### url

`string`

###### options

[`DeleteOptions`](#deleteoptions) = `{}`

###### Returns

`Promise`\<[`ServiceResult`](#serviceresult)\<`TResponse`\>\>

##### buildURL()

```ts
buildURL: (base, path?, params?) => string;
```

Builds URLs with query parameters

###### Parameters

###### base

`string`

Base URL

###### path?

`string`

Optional path to append

###### params?

`Record`\<`string`, `unknown`\>

Optional query parameters

###### Returns

`string`

Complete URL with parameters

##### parseURL()

```ts
parseURL: (url) => Result<ServiceError<"SERVICE_ERROR">, {
  base: string;
  path: string;
  params: Record<string, string>;
  hash?: string;
}>;
```

Parses URLs into components

###### Parameters

###### url

`string`

URL to parse

###### Returns

[`Result`](#result)\<[`ServiceError`](#serviceerror)\<`"SERVICE_ERROR"`\>, \{
  `base`: `string`;
  `path`: `string`;
  `params`: `Record`\<`string`, `string`\>;
  `hash?`: `string`;
\}\>

Result with URL components or error

##### isError()

```ts
readonly isError: (error) => error is ServiceError<"SERVICE_ERROR"> = isServiceError;
```

Type guard for service errors

###### Parameters

###### error

`unknown`

Error to check

###### Returns

`error is ServiceError<"SERVICE_ERROR">`

True if error is a ServiceError

##### isRetryable()

```ts
isRetryable: (error) => boolean;
```

Determines if an error should trigger retry

###### Parameters

###### error

Error to check

[`ServiceHttpError`](#servicehttperror) | [`ServiceNetworkError`](#servicenetworkerror) | [`ServiceError`](#serviceerror)\<`"SERVICE_ERROR"`\>

###### Returns

`boolean`

True if error is retryable

#### Example

```typescript
// Simple usage (smart defaults)
const users = await service.get('/users')

// With configuration
const users = await service.get('/users', {
  params: { page: 1, limit: 10 },
  cache: true,
  retry: { attempts: 3 },
  timeout: 5000
})

// Error handling
if (Result.isErr(users)) {
  if (service.isRetryable(users.error)) {
    // Handle retryable error
  }
}
```

***

### STATUS

```ts
const STATUS: object;
```

Implementation status and version information for the Kairo library

#### Type declaration

##### version

```ts
readonly version: "1.0.0" = '1.0.0';
```

##### pillars

```ts
readonly pillars: object;
```

###### pillars.SERVICE

```ts
readonly SERVICE: "IMPLEMENTED" = 'IMPLEMENTED';
```

###### pillars.DATA

```ts
readonly DATA: "IMPLEMENTED" = 'IMPLEMENTED';
```

###### pillars.PIPELINE

```ts
readonly PIPELINE: "IMPLEMENTED" = 'IMPLEMENTED';
```

##### foundation

```ts
readonly foundation: "COMPLETE" = 'COMPLETE';
```

##### architecture

```ts
readonly architecture: "COMPLETE" = 'COMPLETE';
```

#### Description

Provides runtime information about the library's implementation status and version
