"use client"

import React from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordStrengthIndicatorProps {
  password: string
  className?: string
}

interface PasswordCriteria {
  label: string
  test: (password: string) => boolean
  weight: number
}

const PASSWORD_CRITERIA: PasswordCriteria[] = [
  {
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
    weight: 25
  },
  {
    label: 'One uppercase letter',
    test: (password) => /[A-Z]/.test(password),
    weight: 25
  },
  {
    label: 'One lowercase letter',
    test: (password) => /[a-z]/.test(password),
    weight: 25
  },
  {
    label: 'One number',
    test: (password) => /\d/.test(password),
    weight: 25
  }
]

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  if (!password) return null

  const passedCriteria = PASSWORD_CRITERIA.filter(criteria => criteria.test(password))
  const strength = passedCriteria.reduce((acc, criteria) => acc + criteria.weight, 0)
  
  const getStrengthColor = (strength: number) => {
    if (strength < 50) return 'bg-red-500'
    if (strength < 75) return 'bg-yellow-500'
    if (strength < 100) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getStrengthLabel = (strength: number) => {
    if (strength < 50) return 'Weak'
    if (strength < 75) return 'Fair'
    if (strength < 100) return 'Good'
    return 'Strong'
  }

  const getStrengthTextColor = (strength: number) => {
    if (strength < 50) return 'text-red-600'
    if (strength < 75) return 'text-yellow-600'
    if (strength < 100) return 'text-blue-600'
    return 'text-green-600'
  }

  return (
    <div className={cn("space-y-3 animate-in fade-in-50 duration-300", className)}>
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Password strength
          </span>
          <span className={cn(
            "text-xs font-semibold transition-colors duration-300",
            getStrengthTextColor(strength)
          )}>
            {getStrengthLabel(strength)}
          </span>
        </div>
        
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 ease-out rounded-full",
              getStrengthColor(strength)
            )}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>

      {/* Criteria List with enhanced animations */}
      <div className="space-y-1.5">
        {PASSWORD_CRITERIA.map((criteria, index) => {
          const passed = criteria.test(password)
          return (
            <div
              key={index}
              className={cn(
                "flex items-center gap-2 text-xs transition-all duration-300 ease-out",
                passed ? "text-green-600 scale-100" : "text-muted-foreground scale-95"
              )}
              style={{ 
                transitionDelay: `${index * 50}ms` 
              }}
            >
              <div className={cn(
                "flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                passed 
                  ? "bg-green-500 border-green-500 text-white scale-110" 
                  : "border-gray-300 text-transparent hover:border-gray-400"
              )}>
                {passed ? (
                  <Check className="w-2.5 h-2.5" />
                ) : (
                  <X className="w-2.5 h-2.5 text-gray-400" />
                )}
              </div>
              <span className={cn(
                "transition-all duration-300",
                passed ? "font-medium" : "font-normal"
              )}>
                {criteria.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Security tips for weak passwords */}
      {strength < 75 && (
        <div className="text-xs text-muted-foreground bg-gray-50 border border-gray-200 rounded-md p-2 animate-in slide-in-from-top-1 duration-300">
          💡 <strong>Tip:</strong> Use a mix of letters, numbers, and symbols for better security
        </div>
      )}
    </div>
  )
}