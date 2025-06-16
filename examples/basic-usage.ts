import { pipeline, schema, Result } from '../src'

// Example 1: Simple data transformation pipeline
const calculateDiscount = pipeline<number>('calculate-discount')
  .map(price => price * 0.9) // 10% discount
  .map(price => Math.round(price * 100) / 100) // Round to 2 decimals
  .trace('final price')

// Example 2: Login flow with validation and API call
const loginSchema = schema.object({
  email: schema.string().email(),
  password: schema.string().min(8),
})

const userResponseSchema = schema.object({
  id: schema.number(),
  name: schema.string(),
  email: schema.string().email(),
  role: schema.enum(['admin', 'user']),
  token: schema.string(),
})

export const login = pipeline('user-login')
  .input(loginSchema)
  .fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  .validate(userResponseSchema)
  .map(response => ({
    user: {
      id: response.id,
      name: response.name,
      role: response.role,
    },
    token: response.token,
    isAdmin: response.role === 'admin',
  }))

// Example 3: Data processing with error handling
export const processUserData = pipeline<{ userId: number }>('process-user')
  .fetch(input => `/api/users/${input.userId}`)
  .validate(
    schema.object({
      id: schema.number(),
      name: schema.string(),
      email: schema.string().email(),
      age: schema.number().positive(),
    })
  )
  .map(user => ({
    ...user,
    isAdult: user.age >= 18,
    displayName: user.name.toUpperCase(),
  }))
  .mapError(error => ({
    type: 'USER_PROCESSING_ERROR',
    message: 'Failed to process user data',
    details: error,
  }))

// Example 4: Using Result type directly
function divide(a: number, b: number): Result<string, number> {
  if (b === 0) {
    return Result.Err('Division by zero')
  }
  return Result.Ok(a / b)
}

// Composing Results
let calculation: Result<string, number> = Result.Ok(20)
calculation = Result.flatMap(calculation, n => divide(n, 2))
calculation = Result.flatMap(calculation, n => divide(n, 5))
calculation = Result.map(calculation, n => Math.round(n))

// Pattern matching
const message = Result.match(calculation, {
  Ok: value => `Result is ${value}`,
  Err: error => `Error: ${String(error)}`,
})

// Example 5: Complex pipeline with multiple steps
const createUserSchema = schema.object({
  name: schema.string().min(2),
  email: schema.string().email(),
  age: schema.number().positive(),
  preferences: schema
    .object({
      newsletter: schema.boolean(),
      theme: schema.enum(['light', 'dark']),
    })
    .optional(),
})

export const createUser = pipeline('create-user')
  .input(createUserSchema)
  .map(data => ({
    ...data,
    createdAt: new Date().toISOString(),
    preferences: data.preferences || { newsletter: false, theme: 'light' },
  }))
  .fetch('/api/users', { method: 'POST' })
  .validate(
    schema.object({
      id: schema.number(),
      name: schema.string(),
      email: schema.string(),
      createdAt: schema.string(),
    })
  )
  .map(user => ({
    success: true,
    userId: user.id,
    message: `User ${user.name} created successfully!`,
  }))

// Usage examples
async function runExamples() {
  // Example 1: Simple calculation
  const discountResult = await calculateDiscount.run(100)
  console.log('Discount result:', discountResult)

  // Example 2: Login (with mock HTTP client for demo)
  const mockResponse: Response = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new globalThis.Headers(),
    type: 'basic',
    url: '',
    redirected: false,
    clone: function () {
      return this
    },
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new globalThis.Blob([])),
    formData: () => Promise.resolve(new globalThis.FormData()),
    text: () => Promise.resolve(''),
    json: () =>
      Promise.resolve({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        token: 'jwt-token-123',
      }),
  } as Response

  const mockHttpClient = {
    fetch: (_url: string) => Promise.resolve(mockResponse),
  }

  const loginPipeline = pipeline('user-login', { httpClient: mockHttpClient })
    .input(loginSchema)
    .fetch('/api/login')
    .validate(userResponseSchema)
    .map(response => ({
      user: {
        id: response.id,
        name: response.name,
        role: response.role,
      },
      token: response.token,
      isAdmin: response.role === 'admin',
    }))

  const loginResult = await loginPipeline.run({
    email: 'john@example.com',
    password: 'securepass123',
  })

  Result.match(loginResult, {
    Ok: data => console.log('Login successful:', data),
    Err: error => console.error('Login failed:', error),
  })

  // Example 3: Result type usage
  console.log('Division result:', message)
}

// Run examples if this file is executed directly
// Run examples if this file is executed directly in Node.js
// eslint-disable-next-line no-undef
if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error)
}
