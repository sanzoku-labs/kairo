# Interactive Exercises & Challenges

**Hands-on practice with immediate feedback to reinforce your Kairo learning.**

## 🎯 How to Use These Exercises

Each exercise includes:
- 🎪 **Interactive Code** - Copy-paste and run immediately
- 🎯 **Learning Objective** - What you'll master  
- ✅ **Success Criteria** - How to know you succeeded
- 🔧 **Modifications** - Ways to extend and experiment
- 💡 **Solutions** - Complete implementations to check your work

## 🌱 Foundation Tier Exercises

### Exercise F1: Result Pattern Mastery

#### 🎯 Objective
Master the Result pattern for safe error handling without exceptions.

#### 🎪 Interactive Challenge
```typescript
import { Result, match } from 'kairo/beginner'

// Your task: Implement a safe calculator that never throws exceptions
class SafeCalculator {
  // Implement these methods using Result pattern
  divide(a: number, b: number): Result<Error, number> {
    // TODO: Return Result.Err if b is 0, Result.Ok otherwise
  }
  
  sqrt(x: number): Result<Error, number> {
    // TODO: Return Result.Err if x is negative, Result.Ok otherwise
  }
  
  // Chain operations safely
  divideAndSqrt(a: number, b: number): Result<Error, number> {
    // TODO: Divide a by b, then take square root of result
    // If either operation fails, return the error
  }
}

// Test your implementation
const calc = new SafeCalculator()

// Test cases - should all work without throwing
console.log('=== Testing SafeCalculator ===')

const test1 = calc.divide(10, 2)
match(test1, {
  Ok: result => console.log('✅ 10/2 =', result),
  Err: error => console.log('❌ Error:', error.message)
})

const test2 = calc.divide(10, 0)
match(test2, {
  Ok: result => console.log('✅ 10/0 =', result),
  Err: error => console.log('❌ Error:', error.message)
})

const test3 = calc.sqrt(9)
match(test3, {
  Ok: result => console.log('✅ sqrt(9) =', result),
  Err: error => console.log('❌ Error:', error.message)
})

const test4 = calc.sqrt(-1)
match(test4, {
  Ok: result => console.log('✅ sqrt(-1) =', result),
  Err: error => console.log('❌ Error:', error.message)
})

const test5 = calc.divideAndSqrt(100, 4) // Should be sqrt(25) = 5
match(test5, {
  Ok: result => console.log('✅ divideAndSqrt(100, 4) =', result),
  Err: error => console.log('❌ Error:', error.message)
})

const test6 = calc.divideAndSqrt(100, 0) // Should fail at division
match(test6, {
  Ok: result => console.log('✅ divideAndSqrt(100, 0) =', result),
  Err: error => console.log('❌ Error:', error.message)
})
```

#### ✅ Success Criteria
- [ ] All divide operations work correctly
- [ ] Division by zero returns error (doesn't throw)
- [ ] Square root of negative returns error (doesn't throw)
- [ ] Chain operations properly propagate errors
- [ ] No exceptions are thrown, ever

#### 🔧 Extend the Challenge
Add these methods to practice more:
- `power(base, exponent)` - Handle negative exponents
- `log(x)` - Handle zero and negative inputs
- `factorial(n)` - Handle negative and non-integer inputs

#### 💡 Solution
<details>
<summary>Click to see solution</summary>

```typescript
class SafeCalculator {
  divide(a: number, b: number): Result<Error, number> {
    if (b === 0) {
      return Result.Err(new Error('Division by zero'))
    }
    return Result.Ok(a / b)
  }
  
  sqrt(x: number): Result<Error, number> {
    if (x < 0) {
      return Result.Err(new Error('Square root of negative number'))
    }
    return Result.Ok(Math.sqrt(x))
  }
  
  divideAndSqrt(a: number, b: number): Result<Error, number> {
    const divideResult = this.divide(a, b)
    
    if (Result.isErr(divideResult)) {
      return divideResult // Propagate the division error
    }
    
    return this.sqrt(divideResult.value)
  }
}
```
</details>

---

### Exercise F2: Schema Validation Challenge

#### 🎯 Objective
Build complex schemas with nested validation and custom rules.

#### 🎪 Interactive Challenge
```typescript
import { Result, schema, match } from 'kairo/beginner'

// Your task: Create a comprehensive user registration schema
const UserRegistrationSchema = schema.object({
  // TODO: Add validation rules for:
  // - username: 3-20 chars, alphanumeric + underscore only
  // - email: valid email format
  // - password: min 8 chars, must contain uppercase, lowercase, number, special char
  // - confirmPassword: must match password
  // - age: 13-120 years old
  // - termsAccepted: must be true
  // - interests: array of strings, min 1, max 5 interests
  // - address: optional object with street, city, country
})

// Test data sets
const validUser = {
  username: 'alice_dev',
  email: 'alice@example.com',
  password: 'SecurePass123!',
  confirmPassword: 'SecurePass123!',
  age: 25,
  termsAccepted: true,
  interests: ['programming', 'reading'],
  address: {
    street: '123 Main St',
    city: 'Anytown',
    country: 'USA'
  }
}

const invalidUsers = [
  {
    username: 'ab', // Too short
    email: 'not-an-email',
    password: 'weak',
    confirmPassword: 'different',
    age: 12, // Too young
    termsAccepted: false,
    interests: [], // Empty array
  },
  {
    username: 'valid_user',
    email: 'user@example.com',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    age: 25,
    termsAccepted: true,
    interests: ['a', 'b', 'c', 'd', 'e', 'f'], // Too many interests
  }
]

// Test your schema
console.log('=== Testing User Registration Schema ===')

console.log('\n--- Valid User ---')
const validResult = UserRegistrationSchema.parse(validUser)
match(validResult, {
  Ok: user => console.log('✅ Valid user:', user.username),
  Err: error => console.log('❌ Validation failed:', error.message)
})

console.log('\n--- Invalid Users ---')
invalidUsers.forEach((user, index) => {
  console.log(`\nInvalid User ${index + 1}:`)
  const result = UserRegistrationSchema.parse(user)
  match(result, {
    Ok: user => console.log('✅ Unexpectedly valid:', user.username),
    Err: error => console.log('❌ Expected validation error:', error.message)
  })
})
```

#### ✅ Success Criteria
- [ ] Valid user passes all validation
- [ ] Invalid users fail with specific error messages
- [ ] Password complexity is enforced
- [ ] Age restrictions are applied
- [ ] Array length limits work correctly
- [ ] Optional nested objects validate properly

#### 🔧 Extend the Challenge
Add validation for:
- Phone number format (various country formats)
- Profile picture URL (valid URL format)
- Timezone selection from predefined list
- Custom username availability check (async)

#### 💡 Solution
<details>
<summary>Click to see solution</summary>

```typescript
const UserRegistrationSchema = schema.object({
  username: schema.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  
  email: schema.string().email('Please enter a valid email address'),
  
  password: schema.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number, and special character'),
  
  confirmPassword: schema.string(),
  
  age: schema.number()
    .min(13, 'Must be at least 13 years old')
    .max(120, 'Age must be realistic'),
  
  termsAccepted: schema.boolean()
    .refine(val => val === true, 'You must accept the terms and conditions'),
  
  interests: schema.array(schema.string())
    .min(1, 'Please select at least one interest')
    .max(5, 'Please select at most 5 interests'),
  
  address: schema.object({
    street: schema.string(),
    city: schema.string(),
    country: schema.string()
  }).optional()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword']
})
```
</details>

---

### Exercise F3: Pipeline Building Challenge

#### 🎯 Objective
Build complex data processing pipelines with error handling and transformation.

#### 🎪 Interactive Challenge
```typescript
import { Result, schema, pipeline, map, match } from 'kairo/beginner'

// Your task: Build a blog post processing pipeline
const BlogPostSchema = schema.object({
  title: schema.string(),
  content: schema.string(),
  tags: schema.array(schema.string()),
  authorEmail: schema.string().email()
})

const processBlogPost = pipeline('process-blog-post')
  .input(BlogPostSchema)
  // TODO: Add pipeline steps to:
  // 1. Clean and normalize data (trim strings, lowercase email)
  // 2. Generate slug from title (lowercase, replace spaces with hyphens)
  // 3. Calculate reading time (assume 200 words per minute)
  // 4. Add metadata (word count, character count, created timestamp)
  // 5. Validate final result has all required fields

// Test data
const testPosts = [
  {
    title: '  Getting Started with Kairo  ',
    content: 'Kairo is a functional TypeScript library that makes building applications easier. It provides a set of composable functions that help you handle data validation, API calls, and business logic in a predictable way. The Result pattern ensures your applications never crash from unexpected errors.',
    tags: ['kairo', 'typescript', 'functional-programming'],
    authorEmail: 'ALICE@EXAMPLE.COM'
  },
  {
    title: 'Advanced Pipeline Patterns',
    content: 'Once you understand the basics of Kairo pipelines, you can build sophisticated data processing workflows. This post covers advanced patterns like error recovery, conditional processing, and performance optimization.',
    tags: ['advanced', 'patterns'],
    authorEmail: 'bob@example.com'
  },
  {
    // Invalid data - missing content
    title: 'Incomplete Post',
    tags: ['test'],
    authorEmail: 'invalid-email'
  }
]

// Test your pipeline
console.log('=== Testing Blog Post Pipeline ===')

const processAllPosts = async () => {
  for (let i = 0; i < testPosts.length; i++) {
    console.log(`\n--- Processing Post ${i + 1} ---`)
    
    const result = await processBlogPost.run(testPosts[i])
    
    match(result, {
      Ok: post => {
        console.log('✅ Post processed successfully:')
        console.log('  Title:', post.title)
        console.log('  Slug:', post.slug)
        console.log('  Author:', post.authorEmail)
        console.log('  Reading time:', post.readingTime, 'minutes')
        console.log('  Word count:', post.wordCount)
        console.log('  Tags:', post.tags.join(', '))
      },
      Err: error => {
        console.log('❌ Processing failed:', error.message)
      }
    })
  }
}

processAllPosts()
```

#### ✅ Success Criteria
- [ ] Valid posts are processed with all transformations applied
- [ ] Invalid posts fail validation with clear error messages
- [ ] Slug generation works correctly (spaces → hyphens, lowercase)
- [ ] Reading time calculation is accurate
- [ ] Metadata fields are added correctly
- [ ] Data normalization (trimming, case conversion) works

#### 🔧 Extend the Challenge
Add pipeline steps for:
- SEO meta description generation (first 160 chars of content)
- Category assignment based on tags
- Image extraction from content (find image URLs)
- Social media snippet generation

#### 💡 Solution
<details>
<summary>Click to see solution</summary>

```typescript
const processBlogPost = pipeline('process-blog-post')
  .input(BlogPostSchema)
  .map(post => ({
    // Step 1: Clean and normalize
    title: post.title.trim(),
    content: post.content.trim(),
    tags: post.tags.map(tag => tag.trim().toLowerCase()),
    authorEmail: post.authorEmail.toLowerCase().trim()
  }))
  .map(post => ({
    // Step 2: Generate slug
    ...post,
    slug: post.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  }))
  .map(post => {
    // Step 3: Calculate reading time and metadata
    const words = post.content.split(/\s+/).filter(word => word.length > 0)
    const wordCount = words.length
    const readingTime = Math.max(1, Math.ceil(wordCount / 200)) // Min 1 minute
    
    return {
      ...post,
      wordCount,
      characterCount: post.content.length,
      readingTime,
      createdAt: new Date().toISOString()
    }
  })
  .map(post => {
    // Step 4: Validate final result
    const requiredFields = ['title', 'content', 'slug', 'authorEmail', 'tags', 'wordCount', 'readingTime']
    const missingFields = requiredFields.filter(field => !post[field])
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
    }
    
    return post
  })
```
</details>

---

## ⚡ Application Tier Exercises

### Exercise A1: API Integration Challenge

#### 🎯 Objective
Build a robust API client with error handling and data transformation.

#### 🎪 Interactive Challenge
```typescript
import { resource, schema, pipeline, Result } from 'kairo/essential'

// Your task: Build a weather API client with fallback and caching

// 1. Define schemas for different weather services
const WeatherDataSchema = schema.object({
  // TODO: Define common weather data structure
})

// 2. Create API resources for multiple weather services
const OpenWeatherAPI = resource('openweather', {
  // TODO: Define getCurrentWeather method
})

const WeatherAPIFallback = resource('weatherapi', {
  // TODO: Define fallback service
})

// 3. Build a resilient weather service with fallbacks
const getWeatherWithFallback = pipeline('weather-with-fallback')
  .input(schema.object({ city: schema.string() }))
  // TODO: Try primary API, fallback to secondary if it fails
  // TODO: Transform different API responses to common format
  // TODO: Add caching to avoid repeated API calls

// Test your implementation
const testWeatherService = async () => {
  const cities = ['London', 'New York', 'Tokyo', 'InvalidCity']
  
  for (const city of cities) {
    console.log(`\n--- Weather for ${city} ---`)
    
    const result = await getWeatherWithFallback.run({ city })
    
    match(result, {
      Ok: weather => {
        console.log('✅ Weather data:')
        console.log('  Temperature:', weather.temperature, '°C')
        console.log('  Humidity:', weather.humidity, '%')
        console.log('  Description:', weather.description)
        console.log('  Source:', weather.source)
      },
      Err: error => {
        console.log('❌ Weather fetch failed:', error.message)
      }
    })
  }
}

testWeatherService()
```

#### ✅ Success Criteria
- [ ] Primary API is called first
- [ ] Fallback API is used when primary fails
- [ ] Different API response formats are normalized
- [ ] Invalid cities return meaningful errors
- [ ] Responses are cached appropriately
- [ ] No unhandled exceptions occur

---

### Exercise A2: Data Relationships Challenge

#### 🎯 Objective
Model complex data relationships and perform efficient queries.

#### 🎪 Interactive Challenge
```typescript
import { repository, schema, hasMany, hasOne, belongsTo } from 'kairo/tier1'

// Your task: Build a university course management system

// TODO: Define schemas for:
// - Student (id, name, email, enrollmentDate)
// - Course (id, name, credits, department)
// - Enrollment (id, studentId, courseId, grade, enrollmentDate)
// - Department (id, name, head)

// TODO: Create repositories with relationships:
// - Student hasMany Enrollments
// - Course hasMany Enrollments, belongsTo Department
// - Enrollment belongsTo Student and Course
// - Department hasMany Courses

// TODO: Implement these operations:
const enrollStudent = async (studentId: number, courseId: number) => {
  // Check if student and course exist
  // Check if student is already enrolled
  // Create enrollment record
}

const getStudentTranscript = async (studentId: number) => {
  // Get student with all enrollments and course details
  // Calculate GPA
  // Format transcript
}

const getCourseRoster = async (courseId: number) => {
  // Get course with all enrolled students
  // Calculate course statistics
}

const getDepartmentReport = async (departmentId: number) => {
  // Get department with all courses and enrollment stats
  // Calculate department-wide statistics
}

// Test your implementation
const testUniversitySystem = async () => {
  // TODO: Create test data and run operations
}
```

---

### Exercise A3: Business Rules Challenge

#### 🎯 Objective
Implement complex business validation with async rules and error recovery.

#### 🎪 Interactive Challenge
```typescript
import { rule, rules, pipeline } from 'kairo/tier1'

// Your task: Build a loan approval system

// TODO: Create business rules for loan approval:
// - Credit score validation (async check with credit bureau)
// - Income verification (must be 3x loan amount)
// - Employment verification (async check with employer)
// - Debt-to-income ratio calculation
// - Property value validation (for mortgages)

const LoanApplicationRules = rules('loan-application', {
  // TODO: Define all validation rules
})

const processLoanApplication = pipeline('process-loan')
  .input(LoanApplicationSchema)
  .validateAllRules(LoanApplicationRules)
  // TODO: Add risk scoring
  // TODO: Determine approval/rejection
  // TODO: Calculate terms (interest rate, payment amount)

// Test with various loan applications
const testLoanSystem = async () => {
  const applications = [
    {
      applicantId: 1,
      loanAmount: 250000,
      purpose: 'home-purchase',
      income: 75000,
      creditScore: 750,
      employmentYears: 5,
      existingDebt: 15000
    },
    // Add more test cases including edge cases
  ]
  
  // TODO: Process each application and show results
}
```

---

## 🎮 Gamified Challenges

### Challenge: Build a Complete Application

Pick one of these comprehensive challenges that combine all learned concepts:

#### 🏪 E-commerce Platform
Build a complete e-commerce system with:
- Product catalog with categories and search
- User authentication and profiles
- Shopping cart and checkout process
- Order management and tracking
- Admin dashboard with analytics

#### 📚 Learning Management System
Build an LMS with:
- Course creation and management
- Student enrollment and progress tracking
- Assignment submission and grading
- Discussion forums and messaging
- Reporting and analytics

#### 🏥 Healthcare Management
Build a healthcare system with:
- Patient records and medical history
- Appointment scheduling and management
- Prescription and medication tracking
- Insurance and billing integration
- Compliance and audit trails

### Scoring System

Each challenge is scored based on:
- **Functionality** (40%) - Features work correctly
- **Code Quality** (25%) - Clean, readable, maintainable code
- **Error Handling** (20%) - Graceful error recovery
- **Performance** (10%) - Efficient operations and caching
- **Testing** (5%) - Comprehensive test coverage

### Achievement Badges

Earn badges for specific accomplishments:
- 🏆 **Foundation Master** - Complete all Foundation exercises
- ⚡ **API Wizard** - Build complex API integrations
- 🔗 **Data Architect** - Master complex relationships
- ✅ **Validation Expert** - Implement sophisticated business rules
- 🚀 **Performance Pro** - Optimize for speed and efficiency
- 🔧 **Problem Solver** - Complete all challenge applications

---

## 🎯 Progress Tracking

### Exercise Completion Checklist

#### Foundation Exercises
- [ ] F1: Result Pattern Mastery
- [ ] F2: Schema Validation Challenge  
- [ ] F3: Pipeline Building Challenge

#### Application Exercises
- [ ] A1: API Integration Challenge
- [ ] A2: Data Relationships Challenge
- [ ] A3: Business Rules Challenge

#### Comprehensive Challenges
- [ ] Complete Application Challenge (choose one)
- [ ] Earn 3+ achievement badges
- [ ] Score 80%+ on chosen challenge

### Next Steps
When you've completed the exercises for your tier:
1. Review your solutions against provided answers
2. Identify areas for improvement
3. Try the "Extend the Challenge" suggestions
4. Move on to advancement assessment
5. Begin next tier when ready

---

**Keep practicing!** These exercises build muscle memory and confidence. The more you practice, the more natural Kairo patterns become. 🎯