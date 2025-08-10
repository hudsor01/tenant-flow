/**
 * Tenant Form Dialog - Refactored
 * 
 * Modern tenant form dialog using FormDialogFactory for consistent UX.
 * Eliminates duplication and provides standardized form handling.
 * 
 * Features:
 * - FormDialogFactory integration
 * - Type-safe form handling
 * - Built-in validation and error handling
 * - Optimistic updates via React Query
 * - Analytics tracking
 */

"use client"

import React from 'react'
import type { Tenant, CreateTenantInput, UpdateTenantInput } from '@repo/shared'
import { User } from 'lucide-react'
import { useCreateTenant, useUpdateTenant } from '@/hooks/api/use-tenants'
import { FormDialogFactory, commonValidations, type FormDialogConfig, type FormRenderParams } from './form-dialog-factory'
import { TextField, TextAreaField } from './form-patterns'
import { FormSection } from './form-sections'

// ============================================================================
// TYPES
// ============================================================================

interface TenantFormData {
  name: string
  email: string
  phone: string
  emergencyContact: string
  emergencyPhone: string
  moveInDate: string
  moveOutDate?: string
  notes: string
}

interface TenantFormDialogProps {
  isOpen: boolean
  onClose: () => void
  tenant?: Tenant
  mode?: 'create' | 'edit'
  onSuccess?: (tenant: Tenant) => void
}

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

const transformInitialData = (tenant: Tenant): TenantFormData => ({
  name: tenant.name || '',
  email: tenant.email || '',
  phone: tenant.phone || '',
  emergencyContact: tenant.emergencyContact || '',
  emergencyPhone: '',
  moveInDate: '',
  moveOutDate: '',
  notes: ''
})

const transformSubmitData = (formData: TenantFormData) => ({
  name: formData.name,
  email: formData.email,
  phone: formData.phone,
  emergencyContact: formData.emergencyContact,
  emergencyPhone: formData.emergencyPhone,
  moveInDate: formData.moveInDate,
  ...(formData.moveOutDate && { moveOutDate: formData.moveOutDate }),
  notes: formData.notes
})

// ============================================================================
// VALIDATION
// ============================================================================

const validateTenantForm = (formData: TenantFormData): Record<string, string> => {
  const errors: Record<string, string> = {}
  
  // Required fields
  const nameError = commonValidations.required(formData.name, 'Name')
  if (nameError) errors.name = nameError
  
  const emailError = commonValidations.required(formData.email, 'Email')
  if (emailError) errors.email = emailError
  
  // Email format validation
  const emailFormatError = commonValidations.email(formData.email)
  if (emailFormatError) errors.email = emailFormatError
  
  // Phone validation (optional)
  if (formData.phone) {
    const phoneError = commonValidations.phone(formData.phone)
    if (phoneError) errors.phone = phoneError
  }
  
  // Emergency phone validation (optional)
  if (formData.emergencyPhone) {
    const emergencyPhoneError = commonValidations.phone(formData.emergencyPhone)
    if (emergencyPhoneError) errors.emergencyPhone = emergencyPhoneError
  }
  
  // Date validation
  if (formData.moveInDate && formData.moveOutDate) {
    const dateError = commonValidations.dateAfter(formData.moveInDate, formData.moveOutDate, 'Move-out date')
    if (dateError) errors.moveOutDate = dateError
  }
  
  return errors
}

// ============================================================================
// FORM FIELDS COMPONENT
// ============================================================================

function TenantFormFields({ formData, errors, isSubmitting, onChange }: FormRenderParams<TenantFormData>) {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <FormSection title="Basic Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Full Name"
            name="name"
            required
            value={formData.name}
            onChange={(e) => onChange('name', e.target.value)}
            error={errors.name}
            disabled={isSubmitting}
            placeholder="Enter tenant's full name"
          />
          
          <TextField
            label="Email Address"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
            error={errors.email}
            disabled={isSubmitting}
            placeholder="tenant@example.com"
          />
          
          <TextField
            label="Phone Number"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            error={errors.phone}
            disabled={isSubmitting}
            placeholder="(555) 123-4567"
            hint="Optional - primary contact number"
          />
          
          <TextField
            label="Move-in Date"
            name="moveInDate"
            type="date"
            value={formData.moveInDate}
            onChange={(e) => onChange('moveInDate', e.target.value)}
            error={errors.moveInDate}
            disabled={isSubmitting}
          />
        </div>
      </FormSection>
      
      {/* Emergency Contact */}
      <FormSection title="Emergency Contact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Emergency Contact Name"
            name="emergencyContact"
            value={formData.emergencyContact}
            onChange={(e) => onChange('emergencyContact', e.target.value)}
            error={errors.emergencyContact}
            disabled={isSubmitting}
            placeholder="Emergency contact person"
            hint="Optional - person to contact in case of emergency"
          />
          
          <TextField
            label="Emergency Phone"
            name="emergencyPhone"
            type="tel"
            value={formData.emergencyPhone}
            onChange={(e) => onChange('emergencyPhone', e.target.value)}
            error={errors.emergencyPhone}
            disabled={isSubmitting}
            placeholder="(555) 987-6543"
            hint="Optional - emergency contact number"
          />
        </div>
      </FormSection>
      
      {/* Additional Information */}
      <FormSection title="Additional Information">
        <div className="space-y-4">
          {formData.moveOutDate !== undefined && (
            <TextField
              label="Move-out Date"
              name="moveOutDate"
              type="date"
              value={formData.moveOutDate || ''}
              onChange={(e) => onChange('moveOutDate', e.target.value)}
              error={errors.moveOutDate}
              disabled={isSubmitting}
              hint="Optional - only for editing existing tenants"
            />
          )}
          
          <TextAreaField
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            error={errors.notes}
            disabled={isSubmitting}
            placeholder="Any additional notes about this tenant..."
            rows={3}
            hint="Optional - any special notes or requirements"
          />
        </div>
      </FormSection>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TenantFormDialog({
  isOpen,
  onClose,
  tenant,
  mode = 'create',
  onSuccess
}: TenantFormDialogProps) {
  const createMutation = useCreateTenant()
  const updateMutation = useUpdateTenant()
  
  const isEditing = mode === 'edit' && Boolean(tenant)
  
  const handleSubmit = async (formData: TenantFormData): Promise<Tenant> => {
    const submitData = transformSubmitData(formData)
    
    if (isEditing && tenant) {
      return await updateMutation.mutateAsync({
        id: tenant.id,
        data: submitData as UpdateTenantInput
      })
    } else {
      return await createMutation.mutateAsync(submitData as CreateTenantInput)
    }
  }
  
  const config: FormDialogConfig<Tenant, TenantFormData> = {
    title: isEditing ? 'Edit Tenant' : 'Add New Tenant',
    description: isEditing 
      ? 'Update tenant information and contact details'
      : 'Add a new tenant to your property management system',
    icon: User,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    maxWidth: 'xl',
    mode,
    initialData: tenant,
    submitLabel: isEditing ? 'Update Tenant' : 'Create Tenant',
    onSubmit: handleSubmit,
    onSuccess,
    validate: validateTenantForm,
    transformInitialData,
    trackingConfig: {
      formType: 'tenant',
      additionalProperties: {
        tenant_id: tenant?.id,
      },
    },
  }
  
  return (
    <FormDialogFactory
      isOpen={isOpen}
      onClose={onClose}
      {...config}
    >
      {(renderParams) => <TenantFormFields {...renderParams} />}
    </FormDialogFactory>
  )
}

// ============================================================================
// CONVENIENCE EXPORT
// ============================================================================

export default TenantFormDialog