/**
 * Enhanced Form Components
 * Form fields with real-time validation, auto-save, and improved UX
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebounce } from '@/hooks/use-debounce'

// Validation status indicator
function ValidationIndicator({ 
  status, 
  message 
}: { 
  status: 'idle' | 'validating' | 'valid' | 'invalid'
  message?: string 
}) {
  const icons = {
    idle: null,
    validating: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
    valid: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    invalid: <XCircle className="h-4 w-4 text-destructive" />
  }
  
  return (
    <AnimatePresence mode="wait">
      {status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2 mt-1"
        >
          {icons[status]}
          {message && (
            <span className={cn(
              "text-xs",
              status === 'valid' && "text-green-600",
              status === 'invalid' && "text-destructive",
              status === 'validating' && "text-muted-foreground"
            )}>
              {message}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Enhanced input with real-time validation
export function ValidatedInput({
  label,
  value,
  onChange,
  validate,
  placeholder,
  type = 'text',
  required = false,
  className,
  ...props
}: {
  label: string
  value: string
  onChange: (value: string) => void
  validate?: (value: string) => Promise<{ valid: boolean; message?: string }>
  placeholder?: string
  type?: string
  required?: boolean
  className?: string
}) {
  const [status, setStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const [message, setMessage] = useState<string>()
  const [touched, setTouched] = useState(false)
  const debouncedValue = useDebounce(value, 500)
  
  useEffect(() => {
    if (!validate || !touched || !debouncedValue) return
    
    setStatus('validating')
    validate(debouncedValue).then(result => {
      setStatus(result.valid ? 'valid' : 'invalid')
      setMessage(result.message)
    }).catch(() => {
      setStatus('invalid')
      setMessage('Validation error')
    })
  }, [debouncedValue, validate, touched])
  
  return (
    <div className={className}>
      <Label htmlFor={label}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <motion.div
        animate={{
          x: status === 'invalid' ? [0, -5, 5, -5, 5, 0] : 0
        }}
        transition={{ duration: 0.3 }}
      >
        <Input
          id={label}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          className={cn(
            "transition-colors",
            status === 'valid' && "border-green-500 focus:ring-green-500",
            status === 'invalid' && "border-destructive focus:ring-destructive"
          )}
          {...props}
        />
      </motion.div>
      <ValidationIndicator status={status} message={message} />
    </div>
  )
}

// Password input with strength indicator
export function PasswordInput({
  label,
  value,
  onChange,
  placeholder = "Enter password",
  showStrength = true,
  className
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  showStrength?: boolean
  className?: string
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [strength, setStrength] = useState(0)
  
  useEffect(() => {
    if (!value) {
      setStrength(0)
      return
    }
    
    let score = 0
    if (value.length >= 8) score++
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++
    if (/\d/.test(value)) score++
    if (/[^a-zA-Z0-9]/.test(value)) score++
    
    setStrength(score)
  }, [value])
  
  const strengthColors = ['bg-gray-300', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  
  return (
    <div className={className}>
      <Label htmlFor={label}>{label}</Label>
      <div className="relative">
        <Input
          id={label}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
      
      {showStrength && value && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 space-y-1"
        >
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  level <= strength ? strengthColors[strength] : "bg-gray-200"
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {strengthLabels[strength]}
          </p>
        </motion.div>
      )}
    </div>
  )
}

// Auto-save form wrapper
type FormData = Record<string, unknown>;

export function AutoSaveForm({
  children,
  onSave,
  saveDelay = 2000,
  className
}: {
  children: React.ReactNode | ((props: { updateFormData: (field: string, value: unknown) => void; formData: FormData }) => React.ReactNode)
  onSave: (data: FormData) => Promise<void>
  saveDelay?: number
  className?: string
}) {
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [formData, setFormData] = useState<FormData>({})
  const debouncedData = useDebounce(formData, saveDelay)
  const isFirstRender = useRef(true)
  
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    
    if (!debouncedData || Object.keys(debouncedData).length === 0) return
    
    setSaving(true)
    onSave(debouncedData)
      .then(() => {
        setLastSaved(new Date())
        setSaving(false)
      })
      .catch(() => {
        setSaving(false)
      })
  }, [debouncedData, onSave])
  
  const updateFormData = useCallback((field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])
  
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <AnimatePresence mode="wait">
          {saving && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </motion.div>
          )}
          {!saving && lastSaved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-green-600"
            >
              <CheckCircle2 className="h-4 w-4" />
              Saved {lastSaved.toLocaleTimeString()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="space-y-4">
        {typeof children === 'function' 
          ? children({ updateFormData, formData })
          : children
        }
      </div>
    </div>
  )
}

// Progress indicator for multi-step forms
export function FormProgress({ 
  steps, 
  currentStep 
}: { 
  steps: string[]
  currentStep: number 
}) {
  const progress = ((currentStep + 1) / steps.length) * 100
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Step {currentStep + 1} of {steps.length}</span>
        <span>{steps[currentStep]}</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <motion.div
            key={step}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium",
              index < currentStep && "bg-primary text-primary-foreground",
              index === currentStep && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
              index > currentStep && "bg-secondary text-secondary-foreground"
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            {index < currentStep ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              index + 1
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Field error message with animation
export function FieldError({ 
  message 
}: { 
  message?: string 
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -5, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -5, height: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1 mt-1"
        >
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-xs text-destructive">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}