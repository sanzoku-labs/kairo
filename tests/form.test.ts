import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Result } from '../src/core/result'
import { pipeline } from '../src/core/pipeline'
import { schema } from '../src/core/schema'
import { form, formUtils, field, type FieldValues } from '../src/core/form'
import { z } from 'zod'

// Test schemas

type LoginData = { email: string; password: string }

// Mock HTTP client for testing
const mockHttpClient = {
  fetch: vi.fn(),
}

describe('Form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('form builder API', () => {
    it('should create a form with fluent builder pattern', () => {
      const loginForm = form('login')
        .fields({
          email: schema.string(),
          password: schema.string(),
        })
        .build()

      expect(loginForm.name).toBe('login')
      expect(loginForm.fields.get()).toEqual({})
      expect(loginForm.errors.get()).toEqual({})
      expect(loginForm.isValid.get()).toBe(false)
      expect(loginForm.isSubmitting.get()).toBe(false)
      expect(loginForm.isDirty.get()).toBe(false)
    })

    it('should create form with field schemas and validation', () => {
      const contactForm = form('contact')
        .fields({
          name: field.required(schema.string()),
          email: field.required(schema.string()),
          message: field.optional(schema.string()),
          newsletter: field.optional(schema.boolean(), false),
        })
        .validation('onChange')
        .build()

      expect(contactForm.name).toBe('contact')
      expect(contactForm.fields.get().newsletter).toBe(false) // Default value
    })

    it('should create form with submit handler', async () => {
      let submittedData: { email: string; password: string } | undefined

      const loginForm = form('login')
        .fields({
          email: schema.from(z.string().email()),
          password: schema.from(z.string().min(6)),
        })
        .submit((data: { email: string; password: string }) => {
          submittedData = data
          return Promise.resolve(Result.Ok({ token: 'fake-token', user: data }))
        })
        .build()

      // Set valid data
      loginForm.setField('email', 'test@example.com')
      loginForm.setField('password', 'password123')

      // Validate form
      loginForm.validateForm()

      const result = await loginForm.submit()

      expect(Result.isOk(result)).toBe(true)
      expect(submittedData).toEqual({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('should handle success and error callbacks', async () => {
      let successResult: unknown
      let errorResult: unknown

      const testForm = form('test')
        .fields({
          email: schema.from(z.string().email()),
        })
        .submit((data: { email: string }) => {
          if (data.email === 'fail@example.com') {
            return Promise.resolve(
              Result.Err({ code: 'AUTH_ERROR', message: 'Invalid credentials' })
            )
          }
          return Promise.resolve(Result.Ok({ success: true }))
        })
        .onSuccess(result => {
          successResult = result
        })
        .onError(error => {
          errorResult = error
        })
        .build()

      // Test success case
      testForm.setField('email', 'success@example.com')
      testForm.validateForm()
      await testForm.submit()

      expect(successResult).toEqual({ success: true })

      // Test error case
      testForm.setField('email', 'fail@example.com')
      testForm.validateForm()
      await testForm.submit()

      expect(errorResult).toBeDefined()
    })

    it('should integrate with pipeline for submission', async () => {
      mockHttpClient.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: 'auth-token', user: { id: 1 } }),
      } as Response)

      const loginForm = form('pipeline-login')
        .fields({
          email: schema.from(z.string().email()),
          password: schema.from(z.string().min(6)),
        })
        .submit(async (data: { email: string; password: string }) => {
          return pipeline('login', { httpClient: mockHttpClient })
            .fetch('/api/login', { method: 'POST' })
            .validate(
              schema.from(z.object({ token: z.string(), user: z.object({ id: z.number() }) }))
            )
            .run(data)
        })
        .build()

      loginForm.setField('email', 'user@example.com')
      loginForm.setField('password', 'secure123')
      loginForm.validateForm()

      const result = await loginForm.submit()

      expect(Result.isOk(result)).toBe(true)
      expect(mockHttpClient.fetch).toHaveBeenCalledWith('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'secure123',
        }),
      })
    })
  })

  describe('form state management', () => {
    it('should update field values reactively', () => {
      const stateUpdates: FieldValues<LoginData>[] = []

      const loginForm = form('reactive-test')
        .fields({
          email: schema.from(z.string().email()),
          password: schema.from(z.string().min(6)),
        })
        .build()

      loginForm.fields.subscribe(fields => {
        stateUpdates.push({ ...fields })
      })

      loginForm.setField('email', 'test@example.com')
      loginForm.setField('password', 'password123')

      expect(stateUpdates).toHaveLength(3) // initial, email, password
      expect(stateUpdates[1]?.email).toBe('test@example.com')
      expect(stateUpdates[2]?.password).toBe('password123')
    })

    it('should track form dirty state', () => {
      const loginForm = form('dirty-test')
        .fields({
          email: schema.from(z.string().email()),
          password: schema.from(z.string().min(6)),
        })
        .build()

      expect(loginForm.isDirty.get()).toBe(false)

      loginForm.setField('email', 'test@example.com')
      expect(loginForm.isDirty.get()).toBe(true)

      loginForm.reset()
      expect(loginForm.isDirty.get()).toBe(false)
    })

    it('should track touched fields', () => {
      const loginForm = form('touched-test')
        .fields({
          email: schema.from(z.string().email()),
          password: schema.from(z.string().min(6)),
        })
        .build()

      expect(loginForm.touchedFields.get().size).toBe(0)

      loginForm.setField('email', 'test@example.com')
      expect(loginForm.touchedFields.get().has('email')).toBe(true)
      expect(loginForm.touchedFields.get().has('password')).toBe(false)

      loginForm.touchField('password')
      expect(loginForm.touchedFields.get().has('password')).toBe(true)
      expect(loginForm.touchedFields.get().size).toBe(2)
    })

    it('should reset form to initial state', () => {
      const contactForm = form('reset-test')
        .fields({
          name: field.required(schema.string()),
          email: field.required(schema.string()),
          newsletter: field.optional(schema.boolean(), true),
        })
        .build()

      // Initial state should have default values
      expect(contactForm.fields.get().newsletter).toBe(true)

      // Modify form
      contactForm.setField('name', 'John Doe')
      contactForm.setField('email', 'john@example.com')
      contactForm.setField('newsletter', false)

      expect(contactForm.isDirty.get()).toBe(true)
      expect(contactForm.touchedFields.get().size).toBe(3)

      // Reset form
      const resetResult = contactForm.reset()
      expect(Result.isOk(resetResult)).toBe(true)

      expect(contactForm.fields.get()).toEqual({ newsletter: true })
      expect(contactForm.isDirty.get()).toBe(false)
      expect(contactForm.touchedFields.get().size).toBe(0)
    })

    it('should provide form state snapshot', () => {
      const loginForm = form('state-test')
        .fields({
          email: schema.from(z.string().email()),
          password: schema.from(z.string().min(6)),
        })
        .build()

      loginForm.setField('email', 'user@example.com')
      loginForm.touchField('password')

      const state = loginForm.getState()

      expect(state).toEqual({
        fields: { email: 'user@example.com' },
        errors: {},
        isValid: true, // Form is valid because email field is valid and no validation errors
        isSubmitting: false,
        isDirty: true,
        touchedFields: new Set(['email', 'password']),
      })
    })
  })

  describe('field validation', () => {
    it('should validate fields on change when strategy is onChange', () => {
      const contactForm = form('validation-onChange')
        .fields({
          email: field.required(schema.from(z.string().email())),
          name: field.required(schema.from(z.string().min(2))),
        })
        .validation('onChange')
        .build()

      // Invalid email should trigger validation error
      contactForm.setField('email', 'invalid-email')

      const errors = contactForm.errors.get()
      expect(errors.email).toContain('Invalid email')

      // Valid email should clear error
      contactForm.setField('email', 'valid@example.com')

      const clearedErrors = contactForm.errors.get()
      expect(clearedErrors.email).toBeUndefined()
    })

    it('should validate fields on blur when strategy is onBlur', () => {
      const contactForm = form('validation-onBlur')
        .fields({
          email: field.required(schema.from(z.string().email())),
          name: field.required(schema.from(z.string().min(2))),
        })
        .validation('onBlur')
        .build()

      // Setting field should not trigger validation
      contactForm.setField('email', 'invalid-email')
      expect(contactForm.errors.get().email).toBeUndefined()

      // Touching field should trigger validation
      contactForm.touchField('email')
      expect(contactForm.errors.get().email).toContain('Invalid email')
    })

    it('should validate entire form on submit when strategy is onSubmit', async () => {
      const contactForm = form('validation-onSubmit')
        .fields({
          email: field.required(schema.from(z.string().email())),
          name: field.required(schema.from(z.string().min(2))),
        })
        .validation('onSubmit')
        .submit((data: { email: string; name: string }) => Promise.resolve(Result.Ok(data)))
        .build()

      // Set invalid data
      contactForm.setField('email', 'invalid-email')
      contactForm.setField('name', 'A') // Too short

      // Errors should not be present yet
      expect(Object.keys(contactForm.errors.get())).toHaveLength(0)

      // Submit should trigger validation
      const result = await contactForm.submit()

      expect(Result.isErr(result)).toBe(true)
      expect(Object.keys(contactForm.errors.get()).length).toBeGreaterThan(0)
    })

    it('should validate required fields', () => {
      const testForm = form('required-test')
        .fields({
          requiredField: field.required(schema.string()),
          optionalField: field.optional(schema.string()),
        })
        .build()

      testForm.validateForm()

      const errors = testForm.errors.get()
      expect(errors.requiredField).toContain('requiredField is required')
      expect(errors.optionalField).toBeUndefined()
    })

    it('should validate field schemas', () => {
      const testForm = form('schema-validation')
        .fields({
          email: field.required(schema.from(z.string().email())),
          age: field.required(schema.from(z.number().min(18))),
        })
        .build()

      testForm.setField('email', 'invalid-email')
      testForm.setField('age', 15)
      testForm.validateForm()

      const errors = testForm.errors.get()
      expect(errors.email).toContain('Invalid email')
      expect(errors.age).toContain('Number must be greater than or equal to 18')
    })

    it('should update form validity based on errors', () => {
      const testForm = form('validity-test')
        .fields({
          email: field.required(schema.from(z.string().email())),
        })
        .build()

      expect(testForm.isValid.get()).toBe(false) // Empty required field

      testForm.setField('email', 'invalid')
      testForm.validateField('email')
      expect(testForm.isValid.get()).toBe(false) // Invalid email

      testForm.setField('email', 'valid@example.com')
      testForm.validateField('email')
      expect(testForm.isValid.get()).toBe(true) // Valid email
    })
  })

  describe('form submission', () => {
    it('should track submission state via task integration', async () => {
      let resolveSubmit: ((value: unknown) => void) | undefined

      const testForm = form('submission-state')
        .fields({
          email: field.required(schema.from(z.string().email())),
        })
        .submit(async (data: { email: string }) => {
          return new Promise(resolve => {
            resolveSubmit = resolve
          }).then(() => Result.Ok({ success: true, data }))
        })
        .build()

      testForm.setField('email', 'test@example.com')
      testForm.validateForm()

      // Start submission
      const submitPromise = testForm.submit()
      expect(testForm.isSubmitting.get()).toBe(true)

      // Complete submission
      resolveSubmit?.({ success: true })
      await submitPromise

      expect(testForm.isSubmitting.get()).toBe(false)
    })

    it('should prevent submission of invalid form', async () => {
      const testForm = form('invalid-submission')
        .fields({
          email: field.required(schema.from(z.string().email())),
        })
        .submit((data: { email: string }) => Promise.resolve(Result.Ok(data)))
        .build()

      // Don't set required field
      const result = await testForm.submit()

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toContain('validation failed')
      }
    })

    it('should handle submission errors', async () => {
      const testForm = form('submission-error')
        .fields({
          email: field.required(schema.from(z.string().email())),
        })
        .submit((_data: { email: string }) => {
          return Promise.resolve(Result.Err({ code: 'SERVER_ERROR', message: 'Server is down' }))
        })
        .build()

      testForm.setField('email', 'test@example.com')
      testForm.validateForm()

      const result = await testForm.submit()

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toContain('submission failed')
      }
    })

    it('should allow submission with custom data', async () => {
      let submittedData: unknown

      const testForm = form('custom-data')
        .fields({
          email: field.required(schema.from(z.string().email())),
        })
        .validation('onSubmit') // Use onSubmit validation to validate custom data
        .submit((data: { email: string }) => {
          submittedData = data
          return Promise.resolve(Result.Ok(data))
        })
        .build()

      // Submit with custom data instead of form state
      const customData = { email: 'custom@example.com' }

      // Set form state to valid first so validation passes
      testForm.setField('email', 'form@example.com')
      testForm.validateForm()

      const result = await testForm.submit(customData)

      expect(Result.isOk(result)).toBe(true)
      expect(submittedData).toEqual(customData)
    })
  })

  describe('effect handlers', () => {
    it('should trigger field change effects', () => {
      let changedField: string | undefined
      let changedValue: unknown

      const testForm = form('field-change-effect')
        .fields({
          name: schema.string(),
          email: schema.string(),
        })
        .onFieldChange((field, value) => {
          changedField = String(field)
          changedValue = value
        })
        .build()

      testForm.setField('name', 'John Doe')

      expect(changedField).toBe('name')
      expect(changedValue).toBe('John Doe')
    })

    it('should trigger submit effects', async () => {
      let submitData: unknown

      const testForm = form('submit-effect')
        .fields({
          email: field.required(schema.from(z.string().email())),
        })
        .submit((data: { email: string }) => Promise.resolve(Result.Ok(data)))
        .onSubmit(data => {
          submitData = data
        })
        .build()

      testForm.setField('email', 'test@example.com')
      testForm.validateForm()
      await testForm.submit()

      expect(submitData).toEqual({ email: 'test@example.com' })
    })
  })

  describe('form utilities', () => {
    it('should validate single field with formUtils', () => {
      const emailSchema = schema.from(z.string().email())

      const validErrors = formUtils.validateField('test@example.com', emailSchema)
      expect(validErrors).toHaveLength(0)

      const invalidErrors = formUtils.validateField('invalid-email', emailSchema)
      expect(invalidErrors.length).toBeGreaterThan(0)
    })

    it('should check form completeness', () => {
      const fieldSchemas = {
        name: field.required(schema.string()),
        email: field.required(schema.string()),
        phone: field.optional(schema.string()),
      }

      const incompleteData = { name: 'John' } // Missing required email
      const completeData = { name: 'John', email: 'john@example.com' }

      expect(formUtils.isComplete(incompleteData, fieldSchemas)).toBe(false)
      expect(formUtils.isComplete(completeData, fieldSchemas)).toBe(true)
    })

    it('should get field names from schema', () => {
      const fieldSchemas = {
        name: field.required(schema.string()),
        email: field.required(schema.string()),
        age: field.optional(schema.number()),
      }

      const fieldNames = formUtils.getFieldNames(fieldSchemas)
      expect(fieldNames).toEqual(['name', 'email', 'age'])
    })

    it('should create form with direct config using formUtils', () => {
      const testForm = formUtils.create({
        name: 'direct-config',
        fieldSchemas: {
          email: field.required(schema.from(z.string().email())),
        },
        validationStrategy: 'onChange',
      })

      expect(testForm.name).toBe('direct-config')
      expect(testForm.fields.get()).toEqual({})
    })
  })

  describe('field helpers', () => {
    it('should create required field schema', () => {
      const requiredEmail = field.required(schema.from(z.string().email()), 'default@example.com')

      expect(requiredEmail.required).toBe(true)
      expect(requiredEmail.defaultValue).toBe('default@example.com')
      expect(requiredEmail.schema).toBeDefined()
    })

    it('should create optional field schema', () => {
      const optionalPhone = field.optional(schema.string(), '')

      expect(optionalPhone.required).toBe(false)
      expect(optionalPhone.defaultValue).toBe('')
      expect(optionalPhone.schema).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should handle field setting errors gracefully', () => {
      const testForm = form('error-handling')
        .fields({
          email: schema.string(),
        })
        .build()

      // This should work normally
      const result = testForm.setField('email', 'test@example.com')
      expect(Result.isOk(result)).toBe(true)
    })

    it('should handle validation errors gracefully', () => {
      const testForm = form('validation-errors')
        .fields({
          email: field.required(schema.from(z.string().email())),
        })
        .build()

      const result = testForm.validateField('email')
      expect(Result.isOk(result)).toBe(true)

      // Field should have validation error
      expect(testForm.errors.get().email).toContain('email is required')
    })

    it('should handle form reset errors gracefully', () => {
      const testForm = form('reset-errors')
        .fields({
          name: schema.string(),
        })
        .build()

      const result = testForm.reset()
      expect(Result.isOk(result)).toBe(true)
    })
  })

  describe('complex form scenarios', () => {
    it('should handle multi-step form workflow', () => {
      const step1Form = form('registration-step1')
        .fields({
          email: field.required(schema.from(z.string().email())),
          password: field.required(schema.from(z.string().min(8))),
        })
        .validation('onBlur')
        .build()

      const step2Form = form('registration-step2')
        .fields({
          firstName: field.required(schema.from(z.string().min(2))),
          lastName: field.required(schema.from(z.string().min(2))),
        })
        .validation('onBlur')
        .build()

      // Step 1
      step1Form.setField('email', 'user@example.com')
      step1Form.setField('password', 'securepassword')
      step1Form.validateForm()
      expect(step1Form.isValid.get()).toBe(true)

      // Step 2
      step2Form.setField('firstName', 'John')
      step2Form.setField('lastName', 'Doe')
      step2Form.validateForm()
      expect(step2Form.isValid.get()).toBe(true)

      // Combined data would be used for final submission
      const combinedData = {
        ...step1Form.fields.get(),
        ...step2Form.fields.get(),
      }

      expect(combinedData).toEqual({
        email: 'user@example.com',
        password: 'securepassword',
        firstName: 'John',
        lastName: 'Doe',
      })
    })

    it('should handle conditional fields based on other field values', () => {
      const conditionalForm = form('conditional')
        .fields({
          accountType: field.required(schema.from(z.enum(['personal', 'business']))),
          companyName: field.optional(schema.string()),
          taxId: field.optional(schema.string()),
        })
        .onFieldChange((field, value) => {
          if (field === 'accountType') {
            if (value === 'business') {
              // In a real app, you might update field requirements dynamically
              console.log('Business account selected - companyName and taxId become required')
            } else {
              console.log('Personal account selected - companyName and taxId are optional')
            }
          }
        })
        .build()

      conditionalForm.setField('accountType', 'business')
      conditionalForm.setField('companyName', 'Acme Corp')
      conditionalForm.setField('taxId', '123-456-789')

      expect(conditionalForm.fields.get()).toEqual({
        accountType: 'business',
        companyName: 'Acme Corp',
        taxId: '123-456-789',
      })
    })
  })
})
