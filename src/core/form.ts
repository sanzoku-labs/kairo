import { Result } from './result'
import { type KairoError, createError } from './errors'
import { type Signal, createSignal } from './signal'
import { type Task, createTask } from './task'
import { type Schema } from './schema'
import { type Pipeline } from './pipeline'

export interface FormError extends KairoError {
  code: 'FORM_ERROR'
  operation: string
}

export type ValidationStrategy = 'onChange' | 'onBlur' | 'onSubmit'

export interface FieldSchema<T> {
  schema: Schema<T>
  required?: boolean
  defaultValue?: T | undefined
}

export type FieldSchemas<T> = {
  [K in keyof T]: FieldSchema<T[K]> | Schema<T[K]>
}

export type FieldValues<T> = Partial<T>
export type FieldErrors<T> = Partial<Record<keyof T, string[]>>

export interface FormState<T> {
  fields: FieldValues<T>
  errors: FieldErrors<T>
  isValid: boolean
  isSubmitting: boolean
  isDirty: boolean
  touchedFields: Set<keyof T>
}

export interface Form<T> {
  readonly name: string
  readonly fields: Signal<FieldValues<T>>
  readonly errors: Signal<FieldErrors<T>>
  readonly isValid: Signal<boolean>
  readonly isSubmitting: Signal<boolean>
  readonly isDirty: Signal<boolean>
  readonly touchedFields: Signal<Set<keyof T>>
  readonly submitTask: Task<unknown>

  setField<K extends keyof T>(field: K, value: T[K]): Result<FormError, void>
  getField<K extends keyof T>(field: K): T[K] | undefined
  touchField<K extends keyof T>(field: K): Result<FormError, void>
  validateField<K extends keyof T>(field: K): Result<FormError, void>
  validateForm(): Result<FormError, void>
  reset(): Result<FormError, void>
  submit(data?: FieldValues<T>): Promise<Result<FormError, unknown>>
  getState(): FormState<T>
}

export interface FormConfig<T> {
  name: string
  fieldSchemas: FieldSchemas<T>
  submitHandler?: (data: T) => Promise<Result<unknown, unknown>>
  validationStrategy: ValidationStrategy
  onSuccess?: (result: unknown) => void
  onError?: (error: KairoError) => void
  onFieldChange?: <K extends keyof T>(field: K, value: T[K]) => void
  onSubmit?: (data: T) => void
}

// Type helpers for field schema inference
type InferFieldType<F> = F extends FieldSchema<infer T> ? T : F extends Schema<infer T> ? T : never

type InferFormType<F> = {
  [K in keyof F]: InferFieldType<F[K]>
}

const createFormError = (operation: string, message: string, context = {}): FormError => ({
  ...createError('FORM_ERROR', message, context),
  code: 'FORM_ERROR',
  operation,
})

const normalizeFieldSchema = <T>(fieldSchema: FieldSchema<T> | Schema<T>): FieldSchema<T> => {
  if ('schema' in fieldSchema) {
    return fieldSchema
  }
  return {
    schema: fieldSchema,
    required: false,
  }
}

const createInitialState = <T>(fieldSchemas: FieldSchemas<T>): FormState<T> => {
  const fields: FieldValues<T> = {}

  // Set default values from field schemas
  for (const [fieldName, fieldSchema] of Object.entries(fieldSchemas)) {
    const normalizedSchema = normalizeFieldSchema(
      fieldSchema as FieldSchema<unknown> | Schema<unknown>
    )
    if (normalizedSchema.defaultValue !== undefined) {
      fields[fieldName as keyof T] = normalizedSchema.defaultValue as T[keyof T]
    }
  }

  return {
    fields,
    errors: {},
    isValid: false,
    isSubmitting: false,
    isDirty: false,
    touchedFields: new Set(),
  }
}

interface FormCore<T> {
  config: FormConfig<T>
  state: FormState<T>
  fieldsSignal: Signal<FieldValues<T>>
  errorsSignal: Signal<FieldErrors<T>>
  isValidSignal: Signal<boolean>
  isSubmittingSignal: Signal<boolean>
  isDirtySignal: Signal<boolean>
  touchedFieldsSignal: Signal<Set<keyof T>>
  submitTask: Task<unknown>
}

const updateFormState = <T>(core: FormCore<T>, updates: Partial<FormState<T>>): FormState<T> => {
  const newState = { ...core.state, ...updates }
  core.state = newState

  // Update all signals
  if (updates.fields !== undefined) {
    core.fieldsSignal.set(newState.fields)
  }
  if (updates.errors !== undefined) {
    core.errorsSignal.set(newState.errors)
  }
  if (updates.isValid !== undefined) {
    core.isValidSignal.set(newState.isValid)
  }
  if (updates.isSubmitting !== undefined) {
    core.isSubmittingSignal.set(newState.isSubmitting)
  }
  if (updates.isDirty !== undefined) {
    core.isDirtySignal.set(newState.isDirty)
  }
  if (updates.touchedFields !== undefined) {
    core.touchedFieldsSignal.set(newState.touchedFields)
  }

  return newState
}

const validateSingleField = <T, K extends keyof T>(
  fieldName: K,
  value: T[K],
  fieldSchemas: FieldSchemas<T>
): string[] => {
  const fieldSchema = normalizeFieldSchema(fieldSchemas[fieldName])
  const errors: string[] = []

  // Check required validation
  if (fieldSchema.required && (value === undefined || value === null || value === '')) {
    errors.push(`${String(fieldName)} is required`)
  }

  // Run schema validation if value is present
  if (value !== undefined && value !== null && value !== '') {
    const validationResult = fieldSchema.schema.parse(value)
    if (Result.isErr(validationResult)) {
      errors.push(...validationResult.error.issues.map(issue => issue.message))
    }
  }

  return errors
}

const validateAllFields = <T>(
  fields: FieldValues<T>,
  fieldSchemas: FieldSchemas<T>
): FieldErrors<T> => {
  const errors: FieldErrors<T> = {}

  for (const fieldName of Object.keys(fieldSchemas)) {
    const fieldKey = fieldName as keyof T
    const fieldErrors = validateSingleField(fieldKey, fields[fieldKey] as T[keyof T], fieldSchemas)
    if (fieldErrors.length > 0) {
      errors[fieldKey] = fieldErrors
    }
  }

  return errors
}

const isFormValid = <T>(errors: FieldErrors<T>): boolean => {
  return Object.keys(errors).length === 0
}

class FormImpl<T> implements Form<T> {
  constructor(private core: FormCore<T>) {}

  get name(): string {
    return this.core.config.name
  }

  get fields(): Signal<FieldValues<T>> {
    return this.core.fieldsSignal
  }

  get errors(): Signal<FieldErrors<T>> {
    return this.core.errorsSignal
  }

  get isValid(): Signal<boolean> {
    return this.core.isValidSignal
  }

  get isSubmitting(): Signal<boolean> {
    return this.core.isSubmittingSignal
  }

  get isDirty(): Signal<boolean> {
    return this.core.isDirtySignal
  }

  get touchedFields(): Signal<Set<keyof T>> {
    return this.core.touchedFieldsSignal
  }

  get submitTask(): Task<unknown> {
    return this.core.submitTask
  }

  setField<K extends keyof T>(field: K, value: T[K]): Result<FormError, void> {
    try {
      const newFields = { ...this.core.state.fields, [field]: value }
      const newTouchedFields = new Set(this.core.state.touchedFields)
      newTouchedFields.add(field)

      updateFormState(this.core, {
        fields: newFields,
        isDirty: true,
        touchedFields: newTouchedFields,
      })

      // Trigger field change effect
      this.core.config.onFieldChange?.(field, value)

      // Validate field based on strategy
      if (this.core.config.validationStrategy === 'onChange') {
        this.validateField(field)
      }

      return Result.Ok(undefined)
    } catch (error) {
      const formError = createFormError(
        'setField',
        error instanceof Error ? error.message : 'Failed to set field value',
        { field, value }
      )
      return Result.Err(formError)
    }
  }

  getField<K extends keyof T>(field: K): T[K] | undefined {
    return this.core.state.fields[field]
  }

  touchField<K extends keyof T>(field: K): Result<FormError, void> {
    try {
      const newTouchedFields = new Set(this.core.state.touchedFields)
      newTouchedFields.add(field)

      updateFormState(this.core, {
        touchedFields: newTouchedFields,
      })

      // Validate field on blur if strategy is onBlur
      if (this.core.config.validationStrategy === 'onBlur') {
        this.validateField(field)
      }

      return Result.Ok(undefined)
    } catch (error) {
      const formError = createFormError(
        'touchField',
        error instanceof Error ? error.message : 'Failed to touch field',
        { field }
      )
      return Result.Err(formError)
    }
  }

  validateField<K extends keyof T>(field: K): Result<FormError, void> {
    try {
      const fieldValue = this.core.state.fields[field]
      const fieldErrors = validateSingleField(
        field,
        fieldValue as T[K],
        this.core.config.fieldSchemas
      )

      const newErrors = { ...this.core.state.errors }
      if (fieldErrors.length > 0) {
        newErrors[field] = fieldErrors
      } else {
        delete newErrors[field]
      }

      updateFormState(this.core, {
        errors: newErrors,
        isValid: isFormValid(newErrors),
      })

      return Result.Ok(undefined)
    } catch (error) {
      const formError = createFormError(
        'validateField',
        error instanceof Error ? error.message : 'Failed to validate field',
        { field }
      )
      return Result.Err(formError)
    }
  }

  validateForm(): Result<FormError, void> {
    try {
      const allErrors = validateAllFields(this.core.state.fields, this.core.config.fieldSchemas)

      updateFormState(this.core, {
        errors: allErrors,
        isValid: isFormValid(allErrors),
      })

      return Result.Ok(undefined)
    } catch (error) {
      const formError = createFormError(
        'validateForm',
        error instanceof Error ? error.message : 'Failed to validate form',
        {}
      )
      return Result.Err(formError)
    }
  }

  reset(): Result<FormError, void> {
    try {
      const initialState = createInitialState(this.core.config.fieldSchemas)
      updateFormState(this.core, initialState)

      // Reset submit task
      this.core.submitTask.reset()

      return Result.Ok(undefined)
    } catch (error) {
      const formError = createFormError(
        'reset',
        error instanceof Error ? error.message : 'Failed to reset form',
        {}
      )
      return Result.Err(formError)
    }
  }

  async submit(data?: FieldValues<T>): Promise<Result<FormError, unknown>> {
    try {
      // Use provided data or current form state
      const submitData = data || this.core.state.fields

      // Validate form before submission if strategy is onSubmit
      if (this.core.config.validationStrategy === 'onSubmit') {
        const validationResult = this.validateForm()
        if (Result.isErr(validationResult)) {
          return Result.Err(validationResult.error)
        }
      }

      // Check if form is valid
      if (!this.core.state.isValid) {
        const formError = createFormError('submit', 'Form validation failed', {
          errors: this.core.state.errors,
        })
        return Result.Err(formError)
      }

      // Trigger onSubmit effect
      this.core.config.onSubmit?.(submitData as T)

      // Execute submit handler if provided
      if (this.core.config.submitHandler) {
        const result = await this.core.submitTask.run(submitData)

        if (Result.isOk(result)) {
          this.core.config.onSuccess?.(result.value)
          return Result.Ok(result.value)
        } else {
          this.core.config.onError?.(result.error)
          const formError = createFormError('submit', 'Form submission failed', {
            submitError: result.error,
          })
          return Result.Err(formError)
        }
      }

      return Result.Ok(submitData)
    } catch (error) {
      const formError = createFormError(
        'submit',
        error instanceof Error ? error.message : 'Form submission failed',
        { error }
      )
      this.core.config.onError?.(formError)
      return Result.Err(formError)
    }
  }

  getState(): FormState<T> {
    return { ...this.core.state }
  }
}

const createForm = <T>(config: FormConfig<T>): Form<T> => {
  const initialState = createInitialState(config.fieldSchemas)

  // Create a simple pipeline for submit task
  const createSubmitPipeline = (handler?: (data: T) => Promise<Result<unknown, unknown>>) => {
    if (handler) {
      return {
        run: (data: unknown) => handler(data as T),
        name: `${config.name}-submit`,
      } as unknown as Pipeline<unknown, unknown>
    }

    return {
      run: (data: unknown) => Promise.resolve(Result.Ok(data)),
      name: `${config.name}-submit`,
    } as unknown as Pipeline<unknown, unknown>
  }

  const submitTask = createTask(createSubmitPipeline(config.submitHandler))

  const core: FormCore<T> = {
    config,
    state: initialState,
    fieldsSignal: createSignal(initialState.fields),
    errorsSignal: createSignal(initialState.errors),
    isValidSignal: createSignal(initialState.isValid),
    isSubmittingSignal: createSignal(initialState.isSubmitting),
    isDirtySignal: createSignal(initialState.isDirty),
    touchedFieldsSignal: createSignal(initialState.touchedFields),
    submitTask,
  }

  // Subscribe to submit task state changes
  submitTask.signal().subscribe(taskState => {
    updateFormState(core, {
      isSubmitting: taskState.state === 'pending',
    })
  })

  return new FormImpl(core)
}

// FormBuilder for fluent API
export interface FormBuilder<T = Record<string, unknown>> {
  fields<F extends Record<string, FieldSchema<unknown> | Schema<unknown>>>(
    fieldSchemas: F
  ): FormBuilder<InferFormType<F>>

  submit<R>(handler: (data: T) => Promise<Result<unknown, R>>): FormBuilder<T>

  validation(strategy: ValidationStrategy): FormBuilder<T>

  onSuccess<R>(handler: (result: R) => void): FormBuilder<T>

  onError(handler: (error: KairoError) => void): FormBuilder<T>

  onFieldChange(
    handler: <F extends keyof T>(field: F, value: T[F]) => void
  ): FormBuilder<T>

  onSubmit(handler: (data: T) => void): FormBuilder<T>

  build(): Form<T>
}

class FormBuilderImpl<T> implements FormBuilder<T> {
  public config: Partial<FormConfig<T>> = {
    validationStrategy: 'onBlur', // Default validation strategy
  }

  constructor(private formName: string) {
    this.config.name = formName
  }

  fields<F extends Record<string, FieldSchema<unknown> | Schema<unknown>>>(
    fieldSchemas: F
  ): FormBuilder<InferFormType<F>> {
    const newBuilder = new FormBuilderImpl<InferFormType<F>>(this.formName)
    newBuilder.config = {
      ...this.config,
      fieldSchemas: fieldSchemas as FieldSchemas<InferFormType<F>>,
    } as Partial<FormConfig<InferFormType<F>>>
    return newBuilder
  }

  submit<R>(handler: (data: T) => Promise<Result<unknown, R>>): FormBuilder<T> {
    this.config.submitHandler = handler as (data: T) => Promise<Result<unknown, unknown>>
    return this
  }

  validation(strategy: ValidationStrategy): FormBuilder<T> {
    this.config.validationStrategy = strategy
    return this
  }

  onSuccess<R>(handler: (result: R) => void): FormBuilder<T> {
    this.config.onSuccess = handler as (result: unknown) => void
    return this
  }

  onError(handler: (error: KairoError) => void): FormBuilder<T> {
    this.config.onError = handler
    return this
  }

  onFieldChange(handler: <F extends keyof T>(field: F, value: T[F]) => void): FormBuilder<T> {
    this.config.onFieldChange = handler
    return this
  }

  onSubmit(handler: (data: T) => void): FormBuilder<T> {
    this.config.onSubmit = handler
    return this
  }

  build(): Form<T> {
    const completeConfig = this.config as FormConfig<T>

    if (!completeConfig.fieldSchemas) {
      throw new Error('Form fields must be defined before building')
    }

    return createForm(completeConfig)
  }

}

export const form = (name: string): FormBuilder => {
  return new FormBuilderImpl(name)
}

// Utility functions for working with forms
export const formUtils = {
  // Create a form with direct config
  create: <T>(config: FormConfig<T>): Form<T> => createForm(config),

  // Validate a single field value against schema
  validateField: <T>(value: T, schema: Schema<T>): string[] => {
    const result = schema.parse(value)
    if (Result.isErr(result)) {
      return result.error.issues.map(issue => issue.message)
    }
    return []
  },

  // Check if form data matches required fields
  isComplete: <T>(data: FieldValues<T>, fieldSchemas: FieldSchemas<T>): boolean => {
    for (const [fieldName, fieldSchema] of Object.entries(fieldSchemas)) {
      const normalizedSchema = normalizeFieldSchema(
        fieldSchema as FieldSchema<unknown> | Schema<unknown>
      )
      if (normalizedSchema.required && !data[fieldName as keyof T]) {
        return false
      }
    }
    return true
  },

  // Get all field names from schema
  getFieldNames: <T>(fieldSchemas: FieldSchemas<T>): (keyof T)[] => {
    return Object.keys(fieldSchemas) as (keyof T)[]
  },
}

// Helper for creating field schemas with options
export const field = {
  required: <T>(schema: Schema<T>, defaultValue?: T): FieldSchema<T> => ({
    schema,
    required: true,
    defaultValue,
  }),

  optional: <T>(schema: Schema<T>, defaultValue?: T): FieldSchema<T> => ({
    schema,
    required: false,
    defaultValue,
  }),
}
