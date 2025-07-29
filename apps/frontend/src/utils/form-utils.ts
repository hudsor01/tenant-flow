import { z } from 'zod'
import type { FieldErrors, UseFormWatch, Control } from 'react-hook-form'
import { toast } from 'sonner'

// Advanced validation schemas
export const emailValidation = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')

export const phoneValidation = z
  .string()
  .optional()
  .refine((val) => {
    if (!val) return true // Optional field
    const phoneRegex = /^\+?[\d\s-()]+$/
    return phoneRegex.test(val) && val.replace(/\D/g, '').length >= 10
  }, 'Please enter a valid phone number')

export const currencyValidation = z
  .number()
  .min(0, 'Amount must be positive')
  .max(1000000, 'Amount too large')

export const dateValidation = z
  .string()
  .min(1, 'Date is required')
  .refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime())
  }, 'Please enter a valid date')

export const futureeDateValidation = z
  .string()
  .min(1, 'Date is required')
  .refine((date) => {
    const parsed = new Date(date)
    return parsed > new Date()
  }, 'Date must be in the future')

// Complex validation patterns
export const createLeaseValidationSchema = z.object({
  unitId: z.string().min(1, 'Unit selection is required'),
  tenantId: z.string().min(1, 'Tenant selection is required'),
  startDate: dateValidation,
  endDate: dateValidation,
  rentAmount: currencyValidation,
  securityDeposit: currencyValidation,
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'])
}).refine((data) => {
  // Cross-field validation: end date must be after start date
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  return end > start
}, {
  message: 'End date must be after start date',
  path: ['endDate']
}).refine((data) => {
  // Business rule: lease must be at least 30 days
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  const diffInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  return diffInDays >= 30
}, {
  message: 'Lease must be at least 30 days long',
  path: ['endDate']
})

// Conditional validation based on other fields
export const createMaintenanceRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'EMERGENCY']),
  unitId: z.string().min(1, 'Unit selection is required'),
  estimatedCost: z.number().optional(),
  requiresContractor: z.boolean().default(false),
  contractorInfo: z.string().optional()
}).refine((data) => {
  // If requires contractor is true, contractor info is required
  if (data.requiresContractor && !data.contractorInfo) {
    return false
  }
  return true
}, {
  message: 'Contractor information is required when contractor is needed',
  path: ['contractorInfo']
}).refine((data) => {
  // Emergency and urgent requests should have estimated costs
  if (['URGENT', 'EMERGENCY'].includes(data.priority) && !data.estimatedCost) {
    return false
  }
  return true
}, {
  message: 'Estimated cost is required for urgent/emergency requests',
  path: ['estimatedCost']
})

// Form state utilities
export function getFieldError(errors: FieldErrors, fieldName: string): string | undefined {
  const error = errors[fieldName]
  if (typeof error?.message === 'string') {
    return error.message
  }
  return undefined
}

export function hasAnyErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function getErrorCount(errors: FieldErrors): number {
  return Object.keys(errors).length
}

// Form watching utilities
export function createFormWatcher<T extends Record<string, any>>(watch: UseFormWatch<T>) {
  return {
    // Watch specific field with callback
    watchField: <K extends keyof T>(
      field: K, 
      callback: (value: T[K]) => void
    ) => {
      return watch(field as any, callback as any)
    },
    
    // Watch multiple fields
    watchFields: <K extends keyof T>(
      fields: K[], 
      callback: (values: Pick<T, K>) => void
    ) => {
      return watch(fields as any, callback as any)
    },
    
    // Watch with conditions
    watchConditionally: <K extends keyof T>(
      field: K,
      condition: (value: T[K]) => boolean,
      callback: (value: T[K]) => void
    ) => {
      return watch(field as any, (value) => {
        if (condition(value)) {
          callback(value)
        }
      })
    }
  }
}

// Auto-save functionality
export function createAutoSave<T extends Record<string, any>>(
  watch: UseFormWatch<T>,
  saveFunction: (data: Partial<T>) => Promise<void>,
  options: {
    delay?: number
    fields?: (keyof T)[]
    enabled?: boolean
  } = {}
) {
  const { delay = 2000, fields, enabled = true } = options
  
  if (!enabled) return () => {}
  
  let timeoutId: NodeJS.Timeout
  
  const subscription = watch((data, { name, type }) => {
    if (type === 'change' && name) {
      // If specific fields are specified, only auto-save those
      if (fields && !fields.includes(name as keyof T)) {
        return
      }
      
      clearTimeout(timeoutId)
      timeoutId = setTimeout(async () => {
        try {
          await saveFunction({ [name]: data[name] } as Partial<T>)
          toast.success('Changes saved automatically', { duration: 1000 })
        } catch (error) {
          console.error('Auto-save failed:', error)
        }
      }, delay)
    }
  })
  
  return () => {
    clearTimeout(timeoutId)
    subscription.unsubscribe()
  }
}

// Form field dependencies
export function createFieldDependency<T extends Record<string, any>>(
  control: Control<T>,
  dependencies: {
    source: keyof T
    target: keyof T
    transform: (sourceValue: any) => any
    condition?: (sourceValue: any) => boolean
  }[]
) {
  return dependencies.map(({ source, target, transform, condition }) => {
    // This would be implemented with useController and useEffect
    // to automatically update target field when source changes
    return {
      source,
      target,
      transform,
      condition
    }
  })
}

// Form validation helpers
export function validateStep<T>(
  data: Partial<T>,
  schema: z.ZodSchema<any>,
  step: string
): { isValid: boolean; errors: Record<string, string> } {
  try {
    schema.parse(data)
    return { isValid: true, errors: {} }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.errors.forEach((err) => {
        const path = err.path.join('.')
        errors[path] = err.message
      })
      
      toast.error(`Please complete ${step} before continuing`)
      return { isValid: false, errors }
    }
    
    return { isValid: false, errors: { general: 'Validation failed' } }
  }
}

// Multi-step form utilities
export interface FormStep {
  id: string
  title: string
  description?: string
  fields: string[]
  optional?: boolean
}

export function createMultiStepForm<T extends Record<string, any>>(steps: FormStep[]) {
  return {
    steps,
    
    validateStep: (stepId: string, data: Partial<T>, schema: z.ZodSchema<any>) => {
      const step = steps.find(s => s.id === stepId)
      if (!step) return { isValid: false, errors: {} }
      
      // Extract only the fields for this step
      const stepData = Object.keys(data)
        .filter(key => step.fields.includes(key))
        .reduce((obj, key) => {
          obj[key] = data[key]
          return obj
        }, {} as any)
      
      return validateStep(stepData, schema, step.title)
    },
    
    getProgress: (currentStepId: string) => {
      const currentIndex = steps.findIndex(s => s.id === currentStepId)
      return {
        current: currentIndex + 1,
        total: steps.length,
        percentage: Math.round(((currentIndex + 1) / steps.length) * 100)
      }
    },
    
    getNextStep: (currentStepId: string) => {
      const currentIndex = steps.findIndex(s => s.id === currentStepId)
      return steps[currentIndex + 1] || null
    },
    
    getPreviousStep: (currentStepId: string) => {
      const currentIndex = steps.findIndex(s => s.id === currentStepId)
      return steps[currentIndex - 1] || null
    }
  }
}

// Form performance optimizations
export function optimizeFormRenders<T extends Record<string, any>>(
  control: Control<T>
) {
  return {
    // Memoized field component
    MemoizedField: React.memo(({ name, render }: { 
      name: keyof T
      render: (props: any) => React.ReactElement 
    }) => {
      // Would use useController with proper memoization
      return render({ name, control })
    }),
    
    // Debounced validation
    createDebouncedValidator: (validator: (value: any) => boolean, delay = 300) => {
      let timeoutId: NodeJS.Timeout
      
      return (value: any) => {
        return new Promise((resolve) => {
          clearTimeout(timeoutId)
          timeoutId = setTimeout(() => {
            resolve(validator(value))
          }, delay)
        })
      }
    }
  }
}

// Export commonly used patterns
export const commonFormPatterns = {
  // Required field with custom message
  required: (fieldName: string) => ({
    required: `${fieldName} is required`
  }),
  
  // Email field pattern
  email: {
    pattern: {
      value: /^\S+@\S+$/i,
      message: 'Please enter a valid email address'
    }
  },
  
  // Phone number pattern
  phone: {
    pattern: {
      value: /^\+?[\d\s-()]+$/,
      message: 'Please enter a valid phone number'
    }
  },
  
  // Currency pattern
  currency: {
    min: { value: 0, message: 'Amount must be positive' },
    max: { value: 1000000, message: 'Amount too large' }
  }
}