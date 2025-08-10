/**
 * Unit Form Dialog - Refactored
 * 
 * Modern unit form dialog using FormDialogFactory for consistent UX.
 * Handles unit creation and editing with property association.
 * 
 * Features:
 * - FormDialogFactory integration
 * - Type-safe form handling
 * - Built-in validation and error handling
 * - Property association handling
 * - Unit status management
 */

"use client"

import React from 'react'
import type { Unit, CreateUnitInput, UpdateUnitInput } from '@repo/shared'
import { Building2 } from 'lucide-react'
import { useCreateUnit, useUpdateUnit } from '@/hooks/api/use-units'
import { FormDialogFactory, commonValidations, type FormDialogConfig, type FormRenderParams } from './form-dialog-factory'
import { TextField, SelectField } from './form-patterns'
import { FormSection } from './form-sections'

// ============================================================================
// TYPES
// ============================================================================

interface UnitFormData {
  unitNumber: string
  propertyId: string
  bedrooms: number
  bathrooms: number
  squareFeet?: number
  rent: number
  monthlyRent: number
  status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
}

interface UnitFormDialogProps {
  isOpen: boolean
  onClose: () => void
  unit?: Unit
  mode?: 'create' | 'edit'
  propertyId: string
  onSuccess?: (unit: Unit) => void
}

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

const transformInitialData = (unit: Unit, propertyId: string): UnitFormData => ({
  unitNumber: unit.unitNumber || '',
  propertyId: propertyId,
  bedrooms: unit.bedrooms || 1,
  bathrooms: unit.bathrooms || 1,
  squareFeet: unit.squareFeet || undefined,
  rent: unit.rent || unit.monthlyRent || 1000,
  monthlyRent: unit.monthlyRent || unit.rent || 1000,
  status: (unit.status as UnitFormData['status']) || 'VACANT'
})

const transformSubmitData = (formData: UnitFormData, mode: 'create' | 'edit'): CreateUnitInput | UpdateUnitInput => {
  const base = {
    unitNumber: formData.unitNumber,
    bedrooms: formData.bedrooms,
    bathrooms: formData.bathrooms,
    squareFeet: formData.squareFeet,
    monthlyRent: formData.monthlyRent,
  }

  if (mode === 'create') {
    return {
      ...base,
      propertyId: formData.propertyId,
    } as CreateUnitInput
  } else {
    return base as UpdateUnitInput
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

const validateUnitForm = (formData: UnitFormData): Record<string, string> => {
  const errors: Record<string, string> = {}
  
  // Required fields
  const unitNumberError = commonValidations.required(formData.unitNumber, 'Unit number')
  if (unitNumberError) errors.unitNumber = unitNumberError
  
  const propertyIdError = commonValidations.required(formData.propertyId, 'Property')
  if (propertyIdError) errors.propertyId = propertyIdError
  
  // Numeric validations
  if (formData.bedrooms < 0) {
    errors.bedrooms = 'Bedrooms must be 0 or more'
  }
  
  if (formData.bathrooms < 0) {
    errors.bathrooms = 'Bathrooms must be 0 or more'
  }
  
  if (formData.squareFeet && formData.squareFeet < 0) {
    errors.squareFeet = 'Square feet must be positive'
  }
  
  if (!formData.monthlyRent || formData.monthlyRent <= 0) {
    errors.monthlyRent = 'Monthly rent must be greater than 0'
  }
  
  return errors
}

// ============================================================================
// STATUS OPTIONS
// ============================================================================

const statusOptions = [
  { value: 'VACANT', label: 'Vacant - Ready to rent' },
  { value: 'OCCUPIED', label: 'Occupied - Currently rented' },
  { value: 'MAINTENANCE', label: 'Under Maintenance' },
  { value: 'RESERVED', label: 'Reserved' },
] as const

// ============================================================================
// FORM FIELDS COMPONENT
// ============================================================================

function UnitFormFields({ formData, errors, isSubmitting, onChange }: FormRenderParams<UnitFormData>) {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <FormSection title="Unit Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Unit Number"
            name="unitNumber"
            required
            value={formData.unitNumber}
            onChange={(e) => onChange('unitNumber', e.target.value)}
            error={errors.unitNumber}
            disabled={isSubmitting}
            placeholder="e.g., 101, A, 2B"
            hint="The unique identifier for this unit"
          />
          
          <SelectField
            label="Status"
            name="status"
            value={formData.status}
            onValueChange={(value) => onChange('status', value as UnitFormData['status'])}
            error={errors.status}
            options={statusOptions.map(option => ({ value: option.value, label: option.label }))}
            placeholder="Select status"
          />
          
          <TextField
            label="Bedrooms"
            name="bedrooms"
            type="number"
            value={formData.bedrooms.toString()}
            onChange={(e) => onChange('bedrooms', parseInt(e.target.value) || 0)}
            error={errors.bedrooms}
            disabled={isSubmitting}
            min="0"
            step="1"
          />
          
          <TextField
            label="Bathrooms"
            name="bathrooms"
            type="number"
            value={formData.bathrooms.toString()}
            onChange={(e) => onChange('bathrooms', parseFloat(e.target.value) || 0)}
            error={errors.bathrooms}
            disabled={isSubmitting}
            min="0"
            step="0.5"
          />
          
          <TextField
            label="Square Feet"
            name="squareFeet"
            type="number"
            value={formData.squareFeet?.toString() || ''}
            onChange={(e) => onChange('squareFeet', parseInt(e.target.value) || undefined)}
            error={errors.squareFeet}
            disabled={isSubmitting}
            min="0"
            step="1"
            placeholder="750"
            hint="Optional - total living space"
          />
          
          <TextField
            label="Monthly Rent"
            name="monthlyRent"
            type="number"
            required
            value={formData.monthlyRent.toString()}
            onChange={(e) => onChange('monthlyRent', parseFloat(e.target.value) || 0)}
            error={errors.monthlyRent}
            disabled={isSubmitting}
            min="0"
            step="0.01"
            placeholder="1000.00"
            hint="The monthly rental amount"
          />
        </div>
      </FormSection>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UnitFormDialog({
  isOpen,
  onClose,
  unit,
  mode = 'create',
  propertyId,
  onSuccess
}: UnitFormDialogProps) {
  const createMutation = useCreateUnit()
  const updateMutation = useUpdateUnit()
  
  const isEditing = mode === 'edit' && Boolean(unit)
  
  const handleSubmit = async (formData: UnitFormData): Promise<Unit> => {
    const submitData = transformSubmitData(formData, mode)
    
    if (isEditing && unit) {
      return await updateMutation.mutateAsync({
        id: unit.id,
        data: submitData as UpdateUnitInput
      })
    } else {
      return await createMutation.mutateAsync(submitData as CreateUnitInput)
    }
  }
  
  
  const config: FormDialogConfig<Unit, UnitFormData> = {
    title: isEditing ? 'Edit Unit' : 'Add New Unit',
    description: isEditing 
      ? 'Update the details of this unit'
      : 'Add a new rental unit to your property',
    icon: Building2,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    maxWidth: 'lg',
    mode,
    initialData: unit,
    submitLabel: isEditing ? 'Update Unit' : 'Add Unit',
    onSubmit: handleSubmit,
    onSuccess,
    validate: validateUnitForm,
    transformInitialData: (unit: Unit) => transformInitialData(unit, propertyId),
    trackingConfig: {
      formType: 'unit',
      additionalProperties: {
        unit_id: unit?.id,
        property_id: propertyId,
      },
    },
  }
  
  return (
    <FormDialogFactory
      isOpen={isOpen}
      onClose={onClose}
      {...config}
    >
      {(renderParams) => <UnitFormFields {...renderParams} />}
    </FormDialogFactory>
  )
}

// ============================================================================
// CONVENIENCE EXPORT
// ============================================================================

export default UnitFormDialog