# Foundation Learning Path

**Master the essential 5 functions and build your first Kairo application.**

## 🎯 Learning Goals

By completing this path, you will:
- ✅ Understand the Result pattern for safe error handling
- ✅ Create and use schemas for data validation
- ✅ Build data processing pipelines
- ✅ Transform data safely with functional patterns
- ✅ Handle success and error cases explicitly

**Time Investment**: 3-5 hours  
**Functions Learned**: 5 essential functions  
**Prerequisites**: Basic TypeScript/JavaScript knowledge

## 📚 The Foundation Functions

```typescript
import { Result, schema, pipeline, map, match } from 'kairo/beginner'
```

These 5 functions are the building blocks for everything in Kairo. Master them and you'll understand the core philosophy.

## 🚀 Learning Modules

### Module 1: Safe Error Handling (30 minutes)

#### 🎯 Learning Objective
Understand how to handle errors without exceptions using the Result pattern.

#### 📖 Core Concept: Result Pattern
```typescript
import { Result } from 'kairo/beginner'

// Results wrap success or failure - never throw exceptions
const success = Result.Ok("Hello World")
const failure = Result.Err(new Error("Something went wrong"))

// Check what type of result you have
if (Result.isOk(success)) {
  console.log(success.value) // "Hello World"
}

if (Result.isErr(failure)) {
  console.log(failure.error.message) // "Something went wrong"
}
```

#### 🧪 Exercise 1.1: Basic Result Usage
```typescript
// Create a function that might fail
const divideNumbers = (a: number, b: number): Result<Error, number> => {
  if (b === 0) {
    return Result.Err(new Error("Cannot divide by zero"))
  }
  return Result.Ok(a / b)
}

// Test it
const result1 = divideNumbers(10, 2)
const result2 = divideNumbers(10, 0)

console.log('Result 1:', result1) // Ok(5)
console.log('Result 2:', result2) // Err(Error: Cannot divide by zero)
```

#### ✅ Checkpoint 1
- [ ] I understand what Result.Ok and Result.Err represent
- [ ] I can check if a Result is success or failure
- [ ] I can create functions that return Results instead of throwing

#### 🧪 Exercise 1.2: Using match for Result Handling
```typescript
import { match } from 'kairo/beginner'

const handleDivision = (a: number, b: number) => {
  const result = divideNumbers(a, b)
  
  return match(result, {
    Ok: value => `Division result: ${value}`,
    Err: error => `Error: ${error.message}`
  })
}

console.log(handleDivision(10, 2)) // "Division result: 5"
console.log(handleDivision(10, 0)) // "Error: Cannot divide by zero"
```

#### ✅ Checkpoint 1.2
- [ ] I can use match to handle both success and error cases
- [ ] I understand why this is better than try/catch
- [ ] I'm comfortable with the basic Result pattern

---

### Module 2: Data Validation (45 minutes)

#### 🎯 Learning Objective
Learn to validate data structures safely using schemas.

#### 📖 Core Concept: Schemas
```typescript
import { schema } from 'kairo/beginner'

// Define what valid data looks like
const UserSchema = schema.object({
  name: schema.string(),
  email: schema.string().email(),
  age: schema.number()
})

// Validate data against the schema
const userData = {
  name: "John Doe",
  email: "john@example.com",
  age: 30
}

const result = UserSchema.parse(userData)
// Returns Result<ValidationError, User>
```

#### 🧪 Exercise 2.1: Creating Your First Schema
```typescript
// Create a schema for a blog post
const PostSchema = schema.object({
  title: schema.string(),
  content: schema.string(),
  tags: schema.array(schema.string()),
  published: schema.boolean(),
  publishedAt: schema.string().optional()
})

// Test with valid data
const validPost = {
  title: "My First Post",
  content: "This is the content",
  tags: ["tutorial", "kairo"],
  published: true,
  publishedAt: "2024-01-01"
}

const result1 = PostSchema.parse(validPost)
console.log('Valid post result:', result1)
```

#### 🧪 Exercise 2.2: Handling Invalid Data
```typescript
// Test with invalid data
const invalidPost = {
  title: "", // Empty string
  content: "Content",
  tags: ["tutorial"],
  published: "yes", // Should be boolean
  age: 25 // Extra field
}

const result2 = PostSchema.parse(invalidPost)

match(result2, {
  Ok: post => console.log('Post is valid:', post.title),
  Err: error => console.log('Validation failed:', error.message)
})
```

#### ✅ Checkpoint 2
- [ ] I can define schemas for complex data structures
- [ ] I understand how schemas provide type safety
- [ ] I can handle validation errors gracefully
- [ ] I know common schema types (string, number, boolean, array, object)

---

### Module 3: Data Transformation (60 minutes)

#### 🎯 Learning Objective
Learn to transform data safely using map and pipelines.

#### 📖 Core Concept: Map Function
```typescript
import { map } from 'kairo/beginner'

// Transform data inside a Result
const result = Result.Ok(5)
const doubled = map(result, x => x * 2)
console.log(doubled) // Ok(10)

// If Result is an error, transformation is skipped
const errorResult = Result.Err(new Error("Failed"))
const attempted = map(errorResult, x => x * 2)
console.log(attempted) // Still Err(Error: Failed)
```

#### 🧪 Exercise 3.1: Basic Data Transformation
```typescript
// Transform user data
const transformUser = (user: any) => {
  return map(UserSchema.parse(user), validUser => ({
    ...validUser,
    displayName: validUser.name.toUpperCase(),
    isAdult: validUser.age >= 18,
    initials: validUser.name.split(' ').map(n => n[0]).join('')
  }))
}

// Test it
const userData = {
  name: "Jane Smith",
  email: "jane@example.com",
  age: 25
}

const result = transformUser(userData)
match(result, {
  Ok: user => {
    console.log('Display name:', user.displayName) // "JANE SMITH"
    console.log('Is adult:', user.isAdult) // true
    console.log('Initials:', user.initials) // "JS"
  },
  Err: error => console.log('Transformation failed:', error.message)
})
```

#### 📖 Core Concept: Pipelines
```typescript
import { pipeline } from 'kairo/beginner'

// Pipelines compose multiple transformations safely
const processUser = pipeline('process-user')
  .input(UserSchema) // Validate input first
  .map(user => ({     // Transform the data
    ...user,
    displayName: user.name.toUpperCase(),
    isAdult: user.age >= 18
  }))

// If input validation fails, map is skipped
const result = await processUser.run(userData)
```

#### 🧪 Exercise 3.2: Building Your First Pipeline
```typescript
// Create a user registration pipeline
const registerUser = pipeline('register-user')
  .input(schema.object({
    name: schema.string().min(2),
    email: schema.string().email(),
    age: schema.number().min(13)
  }))
  .map(user => ({
    ...user,
    id: Math.floor(Math.random() * 1000000), // Generate ID
    email: user.email.toLowerCase(),          // Normalize email
    name: user.name.trim(),                   // Clean name
    createdAt: new Date().toISOString()       // Add timestamp
  }))
  .map(user => ({
    ...user,
    displayName: user.name.toUpperCase(),
    isAdult: user.age >= 18,
    canVote: user.age >= 18 // In most countries
  }))

// Test the pipeline
const newUser = {
  name: "  Bob Johnson  ",
  email: "BOB@EXAMPLE.COM",
  age: 22
}

const result = await registerUser.run(newUser)
match(result, {
  Ok: user => {
    console.log('User registered:')
    console.log('- ID:', user.id)
    console.log('- Email:', user.email)       // "bob@example.com"
    console.log('- Display name:', user.displayName) // "BOB JOHNSON"
    console.log('- Can vote:', user.canVote)   // true
  },
  Err: error => console.log('Registration failed:', error.message)
})
```

#### ✅ Checkpoint 3
- [ ] I can use map to transform data inside Results
- [ ] I understand that transformations are skipped on errors
- [ ] I can build pipelines that compose multiple transformations
- [ ] I can validate input and transform output in one flow

---

### Module 4: Practical Application (90 minutes)

#### 🎯 Learning Objective
Build a complete mini-application using all 5 foundation functions.

#### 🧪 Project: User Profile Processor

Let's build a user profile processor that validates, transforms, and enriches user data.

```typescript
import { Result, schema, pipeline, map, match } from 'kairo/beginner'

// 1. Define the input schema
const UserInputSchema = schema.object({
  firstName: schema.string().min(1),
  lastName: schema.string().min(1),
  email: schema.string().email(),
  age: schema.number().min(0).max(150),
  country: schema.string().min(2)
})

// 2. Define what we want the output to look like
interface ProcessedUser {
  id: number
  fullName: string
  displayName: string
  email: string
  age: number
  isAdult: boolean
  canDrink: boolean // US: 21, elsewhere: 18
  initials: string
  country: string
  timezone: string
  createdAt: string
}

// 3. Create the processing pipeline
const processUserProfile = pipeline('process-user-profile')
  .input(UserInputSchema)
  .map(user => ({
    // Generate basic fields
    id: Math.floor(Math.random() * 1000000),
    fullName: `${user.firstName} ${user.lastName}`,
    displayName: `${user.firstName} ${user.lastName}`.toUpperCase(),
    email: user.email.toLowerCase(),
    age: user.age,
    country: user.country.toUpperCase(),
    createdAt: new Date().toISOString(),
    
    // Keep original data for next transformation
    firstName: user.firstName,
    lastName: user.lastName
  }))
  .map(user => ({
    // Add computed fields
    ...user,
    isAdult: user.age >= 18,
    canDrink: user.country === 'US' ? user.age >= 21 : user.age >= 18,
    initials: `${user.firstName[0]}${user.lastName[0]}`.toUpperCase(),
    timezone: getTimezoneForCountry(user.country)
  }))

// 4. Helper function for timezone (would be more complex in real app)
function getTimezoneForCountry(country: string): string {
  const timezones: { [key: string]: string } = {
    'US': 'America/New_York',
    'UK': 'Europe/London',
    'DE': 'Europe/Berlin',
    'JP': 'Asia/Tokyo',
    'AU': 'Australia/Sydney'
  }
  return timezones[country] || 'UTC'
}

// 5. Function to process multiple users
const processUserBatch = async (users: any[]): Promise<{
  successful: ProcessedUser[]
  failed: { user: any, error: string }[]
}> => {
  const successful: ProcessedUser[] = []
  const failed: { user: any, error: string }[] = []
  
  for (const user of users) {
    const result = await processUserProfile.run(user)
    
    match(result, {
      Ok: processedUser => {
        successful.push(processedUser)
      },
      Err: error => {
        failed.push({ user, error: error.message })
      }
    })
  }
  
  return { successful, failed }
}

// 6. Test the complete system
const testUsers = [
  {
    firstName: "Alice",
    lastName: "Johnson",
    email: "ALICE@EXAMPLE.COM",
    age: 25,
    country: "us"
  },
  {
    firstName: "Bob",
    lastName: "Smith",
    email: "bob@test.com",
    age: 17,
    country: "uk"
  },
  {
    firstName: "", // Invalid - empty first name
    lastName: "Invalid",
    email: "not-an-email",
    age: -5,
    country: "zz"
  },
  {
    firstName: "Carol",
    lastName: "Williams",
    email: "carol@example.com",
    age: 30,
    country: "de"
  }
]

// 7. Run the batch processing
const runTest = async () => {
  console.log('Processing user batch...')
  
  const results = await processUserBatch(testUsers)
  
  console.log(`\n✅ Successfully processed ${results.successful.length} users:`)
  results.successful.forEach(user => {
    console.log(`- ${user.displayName} (${user.email})`)
    console.log(`  Age: ${user.age}, Adult: ${user.isAdult}, Can drink: ${user.canDrink}`)
    console.log(`  Country: ${user.country}, Timezone: ${user.timezone}`)
    console.log(`  Initials: ${user.initials}, ID: ${user.id}`)
    console.log()
  })
  
  console.log(`❌ Failed to process ${results.failed.length} users:`)
  results.failed.forEach(({ user, error }) => {
    console.log(`- ${user.firstName || 'Unknown'} ${user.lastName || 'Unknown'}: ${error}`)
  })
}

// Run the test
runTest()
```

#### ✅ Final Project Checkpoint
- [ ] I can combine all 5 functions to build a complete application
- [ ] I can handle both successful and failed processing gracefully
- [ ] I can process multiple items and collect results
- [ ] I understand how validation, transformation, and error handling work together

---

## 🎓 Foundation Mastery Assessment

### Knowledge Check

Answer these questions to assess your understanding:

1. **Result Pattern**: What are the two types of Results and when would you use each?

2. **Schema Validation**: How does schema validation help prevent runtime errors?

3. **Pipeline Composition**: What happens if the input validation fails in a pipeline?

4. **Error Handling**: Why is `match` better than try/catch for handling Results?

5. **Data Transformation**: What's the difference between `map` and direct function calls?

### Practical Challenge

Build a **Product Catalog Processor** that:

1. Validates product data (name, price, category, inStock)
2. Transforms prices to include tax calculations
3. Adds computed fields (discountPrice, displayName, priceCategory)
4. Handles multiple products and reports success/failure stats

```typescript
// Your challenge starts here - use the 5 foundation functions
const ProductSchema = schema.object({
  name: schema.string().min(1),
  price: schema.number().min(0),
  category: schema.enum(['electronics', 'clothing', 'books', 'home']),
  inStock: schema.boolean()
})

// Create your processing pipeline here...
```

### Success Criteria

You've mastered the Foundation Path when you can:

- ✅ **Safely handle errors** without exceptions using Result pattern
- ✅ **Validate complex data** using schemas with proper error messages
- ✅ **Transform data** using pipelines and map functions
- ✅ **Compose operations** that build on each other safely
- ✅ **Build complete mini-applications** using just these 5 functions

## 🚀 Next Steps

Congratulations! You've mastered the foundation of Kairo. You're ready to:

### Continue Learning
👉 **[Application Path](./application-path)** - Build real applications with APIs and data storage

### Build Something Real
👉 **[Building APIs Guide](../getting-started/building-apis)** - Add external service integration

### Explore Examples
👉 **[Common Patterns](../examples/common-patterns)** - See these functions in action

### Join the Community
- Share your first Kairo application
- Ask questions and get help
- Connect with other learners

---

**Well done!** You now understand the core philosophy of Kairo. These 5 functions are the building blocks for everything else. Take your time to practice and build confidence before moving to the next tier. 🎉