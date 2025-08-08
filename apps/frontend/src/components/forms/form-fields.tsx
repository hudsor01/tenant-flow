/**
 * Form Field Components - Server Components
 * 
 * Reusable form field patterns with consistent styling
 * Server components for optimal performance
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ============================================================================
// BASE FORM FIELD
// ============================================================================

interface FormFieldProps {
  label: string
  name: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}

export function FormField({
  label,
  name,
  required = false,
  error,
  hint,
  className,
  children
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}

// ============================================================================
// TEXT FIELD
// ============================================================================

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  required?: boolean
  error?: string
  hint?: string
}

export function TextField({
  label,
  name,
  required = false,
  error,
  hint,
  className,
  ...props
}: TextFieldProps) {
  return (
    <FormField
      label={label}
      name={name}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <Input
        id={name}
        name={name}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        {...props}
      />
    </FormField>
  )
}

// ============================================================================
// TEXTAREA FIELD
// ============================================================================

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  name: string
  required?: boolean
  error?: string
  hint?: string
}

export function TextareaField({
  label,
  name,
  required = false,
  error,
  hint,
  className,
  ...props
}: TextareaFieldProps) {
  return (
    <FormField
      label={label}
      name={name}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <Textarea
        id={name}
        name={name}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        {...props}
      />
    </FormField>
  )
}

// ============================================================================
// SELECT FIELD
// ============================================================================

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectFieldProps {
  label: string
  name: string
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  value?: string
  onValueChange?: (value: string) => void
}

export function SelectField({
  label,
  name,
  options,
  placeholder = "Select an option",
  required = false,
  error,
  hint,
  className,
  value,
  onValueChange
}: SelectFieldProps) {
  return (
    <FormField
      label={label}
      name={name}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <Select value={value} onValueChange={onValueChange} name={name}>
        <SelectTrigger
          id={name}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}