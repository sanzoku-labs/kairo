import { useCallback } from 'react'
import type { Form } from 'kairo'
import { useSignal } from './useSignal'
import { useTask } from './useTask'

/**
 * React hook to use a Kairo Form with reactive state
 * 
 * @param form - The Kairo form to use
 * @returns Object with form state and control methods
 */
export function useForm<T extends Record<string, any>>(form: Form<T>) {
  const fields = useSignal(form.fields)
  const errors = useSignal(form.errors)
  const isValid = useSignal(form.isValid)
  const submitTask = useTask(form.submit)
  
  const setField = useCallback(<K extends keyof T>(
    field: K,
    value: T[K]
  ) => {
    form.setField(field, value)
  }, [form])
  
  const getField = useCallback(<K extends keyof T>(field: K): T[K] | undefined => {
    return form.getField(field)
  }, [form])
  
  const getFieldErrors = useCallback(<K extends keyof T>(field: K): string[] => {
    return form.getFieldErrors(field)
  }, [form])
  
  const validateField = useCallback(<K extends keyof T>(field: K) => {
    return form.validateField(field)
  }, [form])
  
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    return await form.submit.run()
  }, [form])
  
  const reset = useCallback(() => {
    form.reset()
  }, [form])
  
  return {
    // State
    fields,
    errors,
    isValid,
    isSubmitting: submitTask.isPending,
    submitError: submitTask.error,
    submitData: submitTask.data,
    
    // Field methods
    setField,
    getField,
    getFieldErrors,
    validateField,
    
    // Form methods
    handleSubmit,
    reset,
    
    // Submit task state
    submitTask: {
      state: submitTask.state,
      isPending: submitTask.isPending,
      isSuccess: submitTask.isSuccess,
      isError: submitTask.isError,
      data: submitTask.data,
      error: submitTask.error
    }
  }
}

/**
 * Helper hook for creating controlled input props
 */
export function useFormField<T extends Record<string, any>, K extends keyof T>(
  form: Form<T>,
  fieldName: K
) {
  const { fields, errors, setField, validateField } = useForm(form)
  
  const value = fields[fieldName] ?? ''
  const fieldErrors = errors[fieldName] ?? []
  const hasError = fieldErrors.length > 0
  
  return {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setField(fieldName, e.target.value as T[K])
    },
    onBlur: () => {
      validateField(fieldName)
    },
    error: hasError,
    errorMessage: fieldErrors[0],
    name: String(fieldName)
  }
}