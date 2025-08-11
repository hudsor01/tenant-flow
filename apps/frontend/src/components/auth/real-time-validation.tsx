"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { Check, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ValidationState {
  isValid: boolean | null
  message: string
  isValidating: boolean
}

interface RealTimeValidationProps {
  id: string
  name: string
  label: string
  type?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  validator: (value: string) => Promise<{ isValid: boolean; message: string }>
  debounceMs?: number
  required?: boolean
  disabled?: boolean
  className?: string
  icon?: React.ComponentType<{ className?: string }>
}

export function RealTimeValidation({
  id,
  name,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  validator,
  debounceMs = 500,
  required = false,
  disabled = false,
  className,
  icon: Icon
}: RealTimeValidationProps) {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: null,
    message: '',
    isValidating: false
  })

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const validateValue = useCallback(async (inputValue: string) => {
    if (!inputValue.trim() && !required) {
      setValidationState({ isValid: null, message: '', isValidating: false })
      return
    }

    setValidationState(prev => ({ ...prev, isValidating: true }))

    try {
      const result = await validator(inputValue)
      setValidationState({
        isValid: result.isValid,
        message: result.message,
        isValidating: false
      })
    } catch {
      setValidationState({
        isValid: false,
        message: 'Validation failed. Please try again.',
        isValidating: false
      })
    }
  }, [validator, required])

  const handleChange = (newValue: string) => {
    console.log(`🔄 RealTimeValidation handleChange for ${name}:`, newValue)
    onChange(newValue)

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Set new timer for validation
    const timer = setTimeout(() => {
      if (newValue.trim() || required) {
        validateValue(newValue)
      } else {
        setValidationState({ isValid: null, message: '', isValidating: false })
      }
    }, debounceMs)

    setDebounceTimer(timer)
  }

  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  const getValidationIcon = () => {
    if (validationState.isValidating) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    }
    if (validationState.isValid === true) {
      return <Check className="h-4 w-4 text-green-500" />
    }
    if (validationState.isValid === false) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    return null
  }

  const getBorderColor = () => {
    if (validationState.isValid === true) return 'border-green-400 focus:border-green-500 focus:ring-green-500/30'
    if (validationState.isValid === false) return 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
    return 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/30'
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors duration-200" />
        )}
        <Input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          required={required}
          disabled={disabled}
          className={cn(
            "h-12 text-base transition-all duration-300 ease-in-out border-2",
            Icon && "pl-10",
            "pr-10", // Always add right padding for validation icon
            getBorderColor(),
            disabled && "opacity-60 cursor-not-allowed",
            className
          )}
          aria-invalid={validationState.isValid === false}
          aria-describedby={validationState.message ? `${id}-message` : undefined}
        />
        
        {/* Validation icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {getValidationIcon()}
        </div>
      </div>
      
      {/* Validation message with animation */}
      {validationState.message && (
        <div 
          className={cn(
            "animate-in fade-in-50 slide-in-from-top-1 duration-200",
            "flex items-start gap-2 text-sm p-2 rounded-md border",
            validationState.isValid === false && "text-red-700 bg-red-50 border-red-200",
            validationState.isValid === true && "text-green-700 bg-green-50 border-green-200"
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {validationState.isValid === false ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Check className="h-4 w-4 text-green-500" />
            )}
          </div>
          <span id={`${id}-message`} className="font-medium">
            {validationState.message}
          </span>
        </div>
      )}
    </div>
  )
}