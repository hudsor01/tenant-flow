/**
 * Tenant Form Fields Component
 * 
 * Server component that renders all form fields for tenant creation/editing.
 * Uses consistent form patterns and field validation.
 */

import React from 'react'
import type { CreateTenantInput, UpdateTenantInput } from '@repo/shared'
import { FormField } from './form-fields'
import { FormSection } from '@/components/common/ui-patterns'

// ============================================================================
// FORM FIELDS COMPONENT
// ============================================================================

interface TenantFormFieldsProps {
  formData: CreateTenantInput | UpdateTenantInput
  errors: Record<string, string>
  isEditing: boolean
  onChange: (field: string, value: string) => void
}

export function TenantFormFields({ 
  formData, 
  errors, 
  isEditing,
  onChange 
}: TenantFormFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Basic Information Section */}
      <FormSection 
        title="Basic Information" 
        description="Primary tenant details and contact information"
      >
        <div className="space-y-4">
          <InputField
            name="name"
            label="Full Name"
            value={formData.name || ''}
            onChange={(value) => onChange('name', value)}
            error={errors.name}
            placeholder="Enter tenant's full name"
            required
          />

          <InputField
            name="email"
            label="Email Address"
            type="email"
            value={formData.email || ''}
            onChange={(value) => onChange('email', value)}
            error={errors.email}
            placeholder="tenant@example.com"
            required
            hint="Used for notifications and portal access"
          />

          <InputField
            name="phone"
            label="Phone Number"
            type="tel"
            value={formData.phone || ''}
            onChange={(value) => onChange('phone', value)}
            error={errors.phone}
            placeholder="(555) 123-4567"
          />
        </div>
      </FormSection>

      {/* Emergency Contact Section */}
      <FormSection 
        title="Emergency Contact" 
        description="Emergency contact information for urgent situations"
      >
        <div className="space-y-4">
          <InputField
            name="emergencyContact"
            label="Emergency Contact Name"
            value={formData.emergencyContact || ''}
            onChange={(value) => onChange('emergencyContact', value)}
            error={errors.emergencyContact}
            placeholder="Contact person's full name"
          />

          <InputField
            name="emergencyPhone"
            label="Emergency Phone Number"
            type="tel"
            value={formData.emergencyPhone || ''}
            onChange={(value) => onChange('emergencyPhone', value)}
            error={errors.emergencyPhone}
            placeholder="(555) 987-6543"
          />
        </div>
      </FormSection>

      {/* Lease Dates Section */}
      <FormSection 
        title="Lease Timeline" 
        description="Important dates for tenancy"
      >
        <div className="space-y-4">
          <DateField
            name="moveInDate"
            label="Move-in Date"
            value={formData.moveInDate || ''}
            onChange={(value) => onChange('moveInDate', value)}
            error={errors.moveInDate}
              />

          {isEditing && (
            <DateField
              name="moveOutDate"
              label="Move-out Date"
              value={(formData as UpdateTenantInput).moveOutDate || ''}
              onChange={(value) => onChange('moveOutDate', value)}
              error={errors.moveOutDate}
                    hint="Leave empty if tenant is still active"
            />
          )}
        </div>
      </FormSection>

      {/* Additional Notes Section */}
      <FormSection 
        title="Additional Information" 
        description="Any additional notes about the tenant"
      >
        <TextareaField
          name="notes"
          label="Notes"
          value={formData.notes || ''}
          onChange={(value) => onChange('notes', value)}
          error={errors.notes}
          placeholder="Any additional information about the tenant..."
          rows={4}
          hint="Optional: Special requirements, preferences, or important notes"
        />
      </FormSection>
    </div>
  )
}

// ============================================================================
// SPECIALIZED FORM FIELDS
// ============================================================================

interface InputFieldProps {
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  required?: boolean
  type?: string
  icon?: React.ReactNode
  hint?: string
}

function InputField({
  name,
  label,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  type = "text",
  icon,
  hint
}: InputFieldProps) {
  return (
    <FormField
      label={label}
      name={name}
      required={required}
      error={error}
      hint={hint}
    >
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            icon ? 'pl-10' : ''
          } ${error ? 'border-red-500' : ''}`}
        />
      </div>
    </FormField>
  )
}

interface TextareaFieldProps {
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  required?: boolean
  rows?: number
  hint?: string
}

function TextareaField({
  name,
  label,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  rows = 3,
  hint
}: TextareaFieldProps) {
  return (
    <FormField
      label={label}
      name={name}
      required={required}
      error={error}
      hint={hint}
    >
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical ${
          error ? 'border-red-500' : ''
        }`}
      />
    </FormField>
  )
}

interface DateFieldProps {
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  icon?: React.ReactNode
  hint?: string
}

function DateField({
  name,
  label,
  value,
  onChange,
  error,
  required = false,
  icon,
  hint
}: DateFieldProps) {
  return (
    <FormField
      label={label}
      name={name}
      required={required}
      error={error}
      hint={hint}
    >
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          type="date"
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            icon ? 'pl-10' : ''
          } ${error ? 'border-red-500' : ''}`}
        />
      </div>
    </FormField>
  )
}