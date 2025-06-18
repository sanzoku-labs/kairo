# Your First Kairo App

**Goal**: Build a working application in 30 minutes using just 5 essential functions.  
**Perfect for**: Complete beginners to Kairo or functional programming.

## 🎯 What You'll Build

A simple user profile validator that:
- ✅ Validates user input safely (no exceptions!)
- ✅ Transforms data declaratively  
- ✅ Handles errors gracefully
- ✅ Processes data step-by-step

**Result**: A solid foundation for understanding Kairo's core patterns.

## 🚀 Quick Start

### Step 1: Install and Import
```bash
npm install kairo
```

```typescript
// Start with just 5 functions - that's it!
import { Result, schema, pipeline, map, match } from 'kairo/beginner'
```

**Why these 5?** They're the building blocks for everything else in Kairo.

### Step 2: Define Your Data Structure
```typescript
// Define what valid user data looks like
const UserSchema = schema.object({
  name: schema.string(),
  email: schema.string().email(),
  age: schema.number()
})

// Kairo will validate data against this structure
```

**🎓 Learning**: Schemas define your data contracts. No more guessing what data shape you'll receive!

### Step 3: Create a Data Processing Pipeline
```typescript
// Define step-by-step data processing
const processUser = pipeline('process-user')
  .input(UserSchema)  // 1. Validate input first
  .map(user => ({     // 2. Transform the data
    ...user,
    displayName: user.name.toUpperCase(),
    isAdult: user.age >= 18
  }))

// Pipeline won't run if input is invalid!
```

**🎓 Learning**: Pipelines let you compose data transformations safely. Each step only runs if the previous step succeeded.

### Step 4: Handle Input Safely
```typescript
// Process user data (this might fail!)
const userData = {
  name: "John Doe",
  email: "john@example.com", 
  age: 25
}

const result = await processUser.run(userData)
```

**🎓 Learning**: The `run` method returns a `Result` - it never throws exceptions. Your app won't crash!

### Step 5: Handle Success and Errors
```typescript
// Handle both success and failure cases
match(result, {
  Ok: processedUser => {
    console.log('✅ Success!')
    console.log('Display name:', processedUser.displayName)
    console.log('Is adult:', processedUser.isAdult)
  },
  Err: error => {
    console.error('❌ Validation failed:', error.message)
    // Your app keeps running - no crashes!
  }
})
```

**🎓 Learning**: `match` forces you to handle both success and error cases. No forgotten error handling!

## 🔍 Complete Example

Here's everything together:

```typescript
import { Result, schema, pipeline, map, match } from 'kairo/beginner'

// 1. Define data structure
const UserSchema = schema.object({
  name: schema.string(),
  email: schema.string().email(),
  age: schema.number()
})

// 2. Create processing pipeline
const processUser = pipeline('process-user')
  .input(UserSchema)
  .map(user => ({
    ...user,
    displayName: user.name.toUpperCase(),
    isAdult: user.age >= 18,
    initials: user.name.split(' ').map(n => n[0]).join('')
  }))

// 3. Test with valid data
const validUser = {
  name: "Jane Smith",
  email: "jane@example.com",
  age: 28
}

const result = await processUser.run(validUser)

match(result, {
  Ok: user => {
    console.log('✅ User processed successfully!')
    console.log('Display name:', user.displayName)  // "JANE SMITH"
    console.log('Is adult:', user.isAdult)          // true
    console.log('Initials:', user.initials)         // "JS"
  },
  Err: error => {
    console.error('❌ Processing failed:', error.message)
  }
})

// 4. Test with invalid data
const invalidUser = {
  name: "A",                    // Too short
  email: "not-an-email",        // Invalid format
  age: -5                       // Invalid age
}

const invalidResult = await processUser.run(invalidUser)

match(invalidResult, {
  Ok: user => {
    // This won't run - validation will fail first
    console.log('User processed:', user)
  },
  Err: error => {
    console.error('❌ Validation failed:', error.message)
    // Error message tells you exactly what's wrong!
  }
})
```

## 🎓 What You Just Learned

### Core Concepts Mastered ✅

1. **Safe Error Handling**: No exceptions, no crashes
   - `Result` wraps success/error cases
   - `match` forces you to handle both cases

2. **Data Validation**: Type-safe data processing
   - `schema` defines data contracts
   - Validation happens automatically

3. **Declarative Processing**: Step-by-step transformations
   - `pipeline` composes transformations
   - Each step is clear and testable

4. **Functional Patterns**: Immutable data transformations
   - `map` transforms data without mutation
   - Original data is never changed

### Why This Matters 🌟

- **No Runtime Errors**: Your apps won't crash from bad data
- **Clear Data Flow**: Easy to understand what happens to your data
- **Easy Testing**: Each step can be tested independently
- **Maintainable Code**: Changes are safe and predictable

## 🚀 What's Next?

You've mastered the foundation! Choose your next step:

### Continue Building (Recommended)
👉 **[Building APIs](./building-apis)** - Learn to integrate with external services  
*Adds: `resource`, `repository` for real applications*

### Go Deeper with Core Concepts
👉 **[Managing Data](./managing-data)** - Advanced data modeling and persistence  
*Adds: relationships, data storage, complex validation*

### Add More Functions Gradually
👉 **[Processing Data](./processing-data)** - Advanced data processing patterns  
*Adds: business rules, error recovery, composition*

## 🆘 Troubleshooting

### Common Questions

**Q: "Can I use this with my existing codebase?"**  
A: Absolutely! Start small - wrap one function or API call with these patterns.

**Q: "What about async operations?"**  
A: All Kairo functions work with async naturally. Pipelines handle promises automatically.

**Q: "Is this functional programming?"**  
A: Yes, but approachable! You get the benefits (safety, predictability) without the complexity.

**Q: "What if I need more features?"**  
A: Kairo grows with you. Add more functions from `kairo/essential` or `kairo/tier1` as needed.

### Still Stuck?

- 📚 **Review**: Re-read the examples above
- 🔍 **Explore**: Try changing the examples to see what happens
- 📖 **Learn More**: Check out [Essential patterns](./building-apis)
- 💬 **Get Help**: Join our community Discord

## 🎉 Congratulations!

You've built your first Kairo application! You now understand:
- ✅ Safe error handling with Result
- ✅ Data validation with schemas  
- ✅ Data processing with pipelines
- ✅ Functional transformation with map
- ✅ Explicit error handling with match

These 5 functions are the foundation for everything else in Kairo. Master them, and you're ready to build amazing applications! 🚀

**Ready for more?** → [Building APIs](./building-apis)