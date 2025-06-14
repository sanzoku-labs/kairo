# Form

Forms provide comprehensive state management for user input with validation, submission handling, and reactive updates. They integrate seamlessly with Kairo's Pipeline system for data processing.

## Creating Forms

```typescript
import { form, schema } from 'kairo'
import { z } from 'zod'

const LoginSchema = schema(
  z.object({
    email: z.string().email(),
    password: z.string().min(8),
  })
)

const loginForm = form({
  schema: LoginSchema,
  onSubmit: loginPipeline,
  validation: 'onBlur',
})
```

## Form Configuration

```typescript
interface FormConfig<T> {
  schema: Schema<T>
  onSubmit?: Pipeline<T, any>
  validation?: ValidationStrategy
  initialValues?: Partial<T>
  resetOnSubmit?: boolean
}

type ValidationStrategy = 'onChange' | 'onBlur' | 'onSubmit' | 'manual'
```

## Core Properties

### Reactive State Access

```typescript
const form = form({ schema: UserSchema })

// Reactive signals for form state
const fields = form.fields.get() // Current field values
const errors = form.errors.get() // Validation errors
const isValid = form.isValid.get() // Overall validity
const isSubmitting = form.isSubmitting.get() // Submission state
```

### Field Management

```typescript
// Set individual field values
form.setField('email', 'user@example.com')
form.setField('password', 'securepassword')

// Get specific field value
const email = form.getField('email')

// Check if field has errors
const emailErrors = form.getFieldErrors('email')
```

## Validation

### Validation Strategies

```typescript
// Validate on every change
const form1 = form({
  schema: UserSchema,
  validation: 'onChange',
})

// Validate when field loses focus
const form2 = form({
  schema: UserSchema,
  validation: 'onBlur',
})

// Validate only on submission
const form3 = form({
  schema: UserSchema,
  validation: 'onSubmit',
})

// Manual validation control
const form4 = form({
  schema: UserSchema,
  validation: 'manual',
})
```

### Manual Validation

```typescript
const form = form({
  schema: UserSchema,
  validation: 'manual',
})

// Validate specific field
const emailValidation = form.validateField('email')
if (emailValidation.tag === 'Err') {
  console.log('Email errors:', emailValidation.error)
}

// Validate entire form
const formValidation = form.validate()
if (formValidation.tag === 'Ok') {
  console.log('Form is valid')
}
```

## Submission

### Basic Submission

```typescript
const form = form({
  schema: LoginSchema,
  onSubmit: loginPipeline,
})

// Submit form
const result = await form.submit.run()

if (result.tag === 'Ok') {
  console.log('Login successful:', result.value)
} else {
  console.log('Login failed:', result.error)
}
```

### Submission State

```typescript
// Check submission state
console.log(form.submit.state) // 'idle' | 'pending' | 'success' | 'error'

// Subscribe to submission state changes
form.submit.signal().subscribe(state => {
  if (state.state === 'pending') {
    console.log('Submitting...')
  } else if (state.state === 'success') {
    console.log('Submitted successfully!')
  }
})
```

## Form Utilities

### `formUtils` - Utility Functions

```typescript
import { formUtils } from 'kairo'

// Create form with common patterns
const userForm = formUtils.create({
  schema: UserSchema,
  onSubmit: createUserPipeline,
  initialValues: { name: '', email: '' },
})

// Reset form to initial state
formUtils.reset(userForm)

// Set multiple fields at once
formUtils.setFields(userForm, {
  name: 'John Doe',
  email: 'john@example.com',
})

// Get all field values
const values = formUtils.getValues(userForm)

// Check if form has changes from initial values
const hasChanges = formUtils.hasChanges(userForm)
```

### `field()` - Individual Field Management

```typescript
import { field, schema } from 'kairo'

// Create standalone field
const emailField = field({
  schema: schema(z.string().email()),
  initialValue: '',
  validation: 'onBlur',
})

// Use field
emailField.setValue('user@example.com')
console.log(emailField.value.get()) // 'user@example.com'
console.log(emailField.isValid.get()) // true
console.log(emailField.errors.get()) // []
```

## Advanced Features

### Custom Validation

```typescript
const form = form({
  schema: UserSchema,
  customValidation: values => {
    const errors: Record<string, string[]> = {}

    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = ['Passwords do not match']
    }

    return errors
  },
})
```

### Conditional Fields

```typescript
const registrationForm = form({
  schema: RegistrationSchema,
  validation: 'onChange',
})

// Show/hide fields based on other field values
const showBusinessFields = registrationForm.fields.map(fields => fields.userType === 'business')

showBusinessFields.subscribe(shouldShow => {
  if (shouldShow) {
    // Show business-specific fields
  } else {
    // Hide business-specific fields
  }
})
```

### Form Arrays

```typescript
const ContactSchema = schema(
  z.object({
    contacts: z.array(
      z.object({
        name: z.string(),
        phone: z.string(),
      })
    ),
  })
)

const form = form({ schema: ContactSchema })

// Add new contact
form.setField('contacts', [...(form.getField('contacts') || []), { name: '', phone: '' }])

// Remove contact at index
const removeContact = (index: number) => {
  const contacts = form.getField('contacts') || []
  form.setField(
    'contacts',
    contacts.filter((_, i) => i !== index)
  )
}
```

## Framework Integration

### React Integration

```typescript
import { useSignal } from './hooks' // Custom hook from Signal docs

function LoginForm() {
  const form = form({
    schema: LoginSchema,
    onSubmit: loginPipeline,
    validation: 'onBlur'
  })

  const fields = useSignal(form.fields)
  const errors = useSignal(form.errors)
  const isSubmitting = useSignal(form.isSubmitting)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await form.submit.run()
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={fields.email || ''}
        onChange={e => form.setField('email', e.target.value)}
        onBlur={() => form.validateField('email')}
      />
      {errors.email && <span>{errors.email[0]}</span>}

      <input
        type="password"
        value={fields.password || ''}
        onChange={e => form.setField('password', e.target.value)}
        onBlur={() => form.validateField('password')}
      />
      {errors.password && <span>{errors.password[0]}</span>}

      <button
        type="submit"
        disabled={isSubmitting || !form.isValid.get()}
      >
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}
```

### Vue Integration

```typescript
import { ref, computed } from 'vue'

export default {
  setup() {
    const form = form({
      schema: LoginSchema,
      onSubmit: loginPipeline,
      validation: 'onBlur',
    })

    const fields = ref(form.fields.get())
    const errors = ref(form.errors.get())
    const isSubmitting = ref(form.isSubmitting.get())

    // Subscribe to form state changes
    form.fields.subscribe(newFields => (fields.value = newFields))
    form.errors.subscribe(newErrors => (errors.value = newErrors))
    form.isSubmitting.subscribe(submitting => (isSubmitting.value = submitting))

    const handleSubmit = async () => {
      await form.submit.run()
    }

    return {
      fields,
      errors,
      isSubmitting,
      setField: form.setField.bind(form),
      handleSubmit,
    }
  },
}
```

## Validation Messages

### Custom Error Messages

```typescript
const UserSchema = schema(
  z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
  })
)

const form = form({ schema: UserSchema })
```

### Internationalization

```typescript
const getErrorMessage = (error: ValidationError, locale: string) => {
  const messages = {
    en: {
      'email.invalid': 'Please enter a valid email address',
      'password.too_short': 'Password must be at least 8 characters',
    },
    es: {
      'email.invalid': 'Ingrese una dirección de correo válida',
      'password.too_short': 'La contraseña debe tener al menos 8 caracteres',
    },
  }

  return messages[locale]?.[error.code] || error.message
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest'
import { form, schema } from 'kairo'

describe('User Form', () => {
  const UserSchema = schema(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
    })
  )

  it('should validate fields correctly', () => {
    const userForm = form({ schema: UserSchema })

    userForm.setField('email', 'invalid-email')
    const validation = userForm.validateField('email')

    expect(validation.tag).toBe('Err')
  })

  it('should submit valid form', async () => {
    const mockSubmit = vi.fn().mockResolvedValue({ tag: 'Ok', value: 'success' })
    const submitPipeline = { run: mockSubmit }

    const userForm = form({
      schema: UserSchema,
      onSubmit: submitPipeline,
    })

    userForm.setField('name', 'John Doe')
    userForm.setField('email', 'john@example.com')

    const result = await userForm.submit.run()

    expect(result.tag).toBe('Ok')
    expect(mockSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
    })
  })
})
```

## Best Practices

1. **Define clear schemas** with appropriate validation rules
2. **Use appropriate validation strategy** for your use case
3. **Handle submission states** in your UI
4. **Provide clear error messages** for better UX
5. **Reset forms** after successful submission when appropriate
6. **Use field-level validation** for complex forms
7. **Test form behavior** including validation and submission
8. **Consider accessibility** when building form UI

## Common Patterns

### Multi-step Forms

```typescript
const steps = ['personal', 'address', 'payment']
const currentStep = signal(0)

const personalForm = form({ schema: PersonalSchema })
const addressForm = form({ schema: AddressSchema })
const paymentForm = form({ schema: PaymentSchema })

const nextStep = () => {
  const current = currentStep.get()
  if (current < steps.length - 1) {
    currentStep.set(current + 1)
  }
}
```

### Dynamic Validation

```typescript
const form = form({
  schema: UserSchema,
  validation: 'onChange',
})

// Change validation based on field values
form.fields.subscribe(fields => {
  if (fields.userType === 'business') {
    // Apply business-specific validation
  } else {
    // Apply individual user validation
  }
})
```

### Auto-save Forms

```typescript
const form = form({
  schema: DocumentSchema,
  validation: 'onChange',
})

// Auto-save on field changes
form.fields.subscribe(
  debounce(async fields => {
    if (form.isValid.get()) {
      await autoSavePipeline.run(fields)
    }
  }, 1000)
)
```

Forms provide a complete solution for handling user input with validation, state management, and seamless integration with Kairo's reactive primitives.
