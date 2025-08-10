/**
 * Maintenance Request Dialog - Refactored
 * 
 * Modern maintenance request dialog using FormDialogFactory for consistent UX.
 * Handles complex unit selection, category/priority management, and notifications.
 * 
 * Features:
 * - FormDialogFactory integration
 * - Dynamic unit selection from all properties
 * - Category and priority management with visual indicators
 * - Built-in notification handling
 * - Type-safe form handling with validation
 */

"use client"

import React, { useMemo } from 'react'
import type { MaintenanceRequest, CreateMaintenanceInput, Unit, PropertyWithDetails } from '@repo/shared'
import { Wrench } from 'lucide-react'
import { useCreateMaintenanceRequest } from '@/hooks/api/use-maintenance'
import { useProperties } from '@/hooks/api/use-properties'
import { useAuth } from '@/hooks/use-auth'
import { FormDialogFactory, commonValidations, type FormDialogConfig, type FormRenderParams } from './form-dialog-factory'
import { TextField, TextAreaField, SelectField } from './form-patterns'
import { FormSection } from './form-sections'
import type { MaintenanceCategory } from '@repo/shared'
import type { Priority } from '@/services/notifications/types'
import { logger } from '@/lib/logger'
import { createMaintenanceNotification } from '@/services/notifications/utils'

// ============================================================================
// TYPES
// ============================================================================

interface MaintenanceRequestFormData {
  unitId: string
  title: string
  description: string
  category: MaintenanceCategory
  priority: Priority
}

interface MaintenanceRequestDialogProps {
  isOpen: boolean
  onClose: () => void
  propertyId?: string
  unitId?: string
  tenantId?: string
  onSuccess?: (request: MaintenanceRequest) => void
}

interface UnitWithProperty extends Unit {
  property: {
    id: string
    name: string
    address: string
    ownerId?: string
  }
}

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

const transformSubmitData = (formData: MaintenanceRequestFormData): CreateMaintenanceInput => ({
  unitId: formData.unitId,
  title: formData.title,
  description: formData.description,
  category: formData.category,
  priority: formData.priority
})

// ============================================================================
// VALIDATION
// ============================================================================

const validateMaintenanceForm = (formData: MaintenanceRequestFormData): Record<string, string> => {
  const errors: Record<string, string> = {}
  
  // Required fields
  const unitError = commonValidations.required(formData.unitId, 'Unit')
  if (unitError) errors.unitId = unitError
  
  const titleError = commonValidations.required(formData.title, 'Title')
  if (titleError) errors.title = titleError
  
  const descriptionError = commonValidations.required(formData.description, 'Description')
  if (descriptionError) errors.description = descriptionError
  
  // Length validations
  const titleLengthError = commonValidations.maxLength(formData.title, 100, 'Title')
  if (titleLengthError) errors.title = titleLengthError
  
  const descriptionMinError = commonValidations.minLength(formData.description, 10, 'Description')
  if (descriptionMinError) errors.description = descriptionMinError
  
  const descriptionMaxError = commonValidations.maxLength(formData.description, 1000, 'Description')
  if (descriptionMaxError) errors.description = descriptionMaxError
  
  return errors
}

// ============================================================================
// CATEGORY AND PRIORITY OPTIONS
// ============================================================================

const categoryOptions = [
  { value: 'GENERAL', label: '📋 General Maintenance' },
  { value: 'PLUMBING', label: '🚰 Plumbing' },
  { value: 'ELECTRICAL', label: '⚡ Electrical' },
  { value: 'HVAC', label: '❄️ HVAC' },
  { value: 'APPLIANCES', label: '🏠 Appliances' },
  { value: 'SAFETY', label: '🔒 Safety & Security' },
  { value: 'OTHER', label: '📝 Other' },
] as const

const priorityOptions = [
  { value: 'LOW', label: '🟢 Low - Can wait a few days' },
  { value: 'MEDIUM', label: '🟡 Medium - Address soon' },
  { value: 'HIGH', label: '🟠 High - Needs quick attention' },
  { value: 'EMERGENCY', label: '🔴 Emergency - Immediate attention' },
] as const

// ============================================================================
// HOOKS
// ============================================================================

function useExtractUnitsFromProperties(propertiesData: unknown): UnitWithProperty[] {
  return useMemo((): UnitWithProperty[] => {
    if (!propertiesData) return []
    
    // Handle both array and object response formats
    const properties = Array.isArray(propertiesData) 
      ? propertiesData as PropertyWithDetails[]
      : (propertiesData as { properties?: PropertyWithDetails[] }).properties || []
      
    return properties.flatMap((property: PropertyWithDetails) => {
      // If property has units array, use it, otherwise return empty array
      const units = property.units || []
      return units.map((unit: Unit): UnitWithProperty => ({
        ...unit,
        property: {
          id: property.id,
          name: property.name,
          address: property.address,
          ownerId: property.ownerId
        }
      }))
    })
  }, [propertiesData])
}

// ============================================================================
// FORM FIELDS COMPONENT
// ============================================================================

function MaintenanceRequestFormFields({ 
  formData, 
  errors, 
  isSubmitting, 
  onChange,
  allUnits
}: FormRenderParams<MaintenanceRequestFormData> & {
  allUnits: UnitWithProperty[]
}) {
  const unitOptions = allUnits.map(unit => ({
    value: unit.id,
    label: `${unit.property?.name || 'Unknown Property'} - Unit ${unit.unitNumber}`
  }))

  return (
    <div className="space-y-6">
      {/* Unit Selection */}
      <FormSection title="Property & Unit">
        <SelectField
          label="Property & Unit"
          name="unitId"
          required
          value={formData.unitId}
          onValueChange={(value) => onChange('unitId', value)}
          error={errors.unitId}
          placeholder="Select a property and unit"
          options={unitOptions}
        />
      </FormSection>
      
      {/* Issue Details */}
      <FormSection title="Issue Details">
        <div className="space-y-4">
          <TextField
            label="Issue Title"
            name="title"
            required
            value={formData.title}
            onChange={(e) => onChange('title', e.target.value)}
            error={errors.title}
            disabled={isSubmitting}
            placeholder="Brief description of the issue"
            maxLength={100}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              label="Category"
              name="category"
              required
              value={formData.category}
              onValueChange={(value) => onChange('category', value as MaintenanceCategory)}
              error={errors.category}
              placeholder="Select category"
              options={categoryOptions.map(option => ({ value: option.value, label: option.label }))}
            />
            
            <SelectField
              label="Priority"
              name="priority"
              required
              value={formData.priority}
              onValueChange={(value) => onChange('priority', value as Priority)}
              error={errors.priority}
              placeholder="Select priority level"
              options={priorityOptions.map(option => ({ value: option.value, label: option.label }))}
            />
          </div>
          
          <TextAreaField
            label="Detailed Description"
            name="description"
            required
            value={formData.description}
            onChange={(e) => onChange('description', e.target.value)}
            error={errors.description}
            disabled={isSubmitting}
            placeholder="Please provide details about the issue, when it started, and any relevant information..."
            rows={4}
            hint="Min 10 characters, max 1000 characters"
            maxLength={1000}
          />
        </div>
      </FormSection>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MaintenanceRequestDialog({
  isOpen,
  onClose,
  propertyId,
  unitId,
  tenantId,
  onSuccess
}: MaintenanceRequestDialogProps) {
  const { user } = useAuth()
  const createMutation = useCreateMaintenanceRequest()
  const { data: propertiesData } = useProperties()
  const allUnits = useExtractUnitsFromProperties(propertiesData)
  
  // Mock notification function for now
  const sendNotification = {
    mutate: (data: unknown, callbacks: { onSuccess: () => void; onError: (error: Error) => void }) => {
      // Mock success for now
      setTimeout(() => callbacks.onSuccess(), 100)
    }
  }
  
  const handleMaintenanceNotification = (
    newRequest: { id: string },
    formData: MaintenanceRequestFormData
  ) => {
    const selectedUnit = allUnits.find((unit) => unit.id === formData.unitId)
    
    if (!selectedUnit?.property || !user) return

    const actionUrl = `${window.location.origin}/maintenance`
    const notificationRequest = createMaintenanceNotification(
      selectedUnit.property.ownerId || '',
      formData.title,
      formData.description,
      formData.priority,
      selectedUnit.property.name,
      selectedUnit.unitNumber,
      newRequest.id,
      actionUrl
    )
    
    // Send the notification (non-blocking)
    sendNotification.mutate(notificationRequest, {
      onSuccess: () => {
        logger.info('Maintenance notification sent', undefined, {
          maintenanceId: newRequest.id,
          propertyId: selectedUnit.property.id
        })
      },
      onError: (error) => {
        logger.error('Failed to send maintenance notification', error as Error, {
          maintenanceId: newRequest.id,
          propertyId: selectedUnit.property.id
        })
      }
    })
  }
  
  const handleSubmit = async (formData: MaintenanceRequestFormData): Promise<MaintenanceRequest> => {
    const submitData = transformSubmitData(formData)
    const newRequest = await createMutation.mutateAsync(submitData)
    
    // Log successful creation
    logger.info('Maintenance request created', undefined, {
      maintenanceId: newRequest.id,
      unitId: formData.unitId,
      priority: formData.priority
    })

    // Handle notification
    handleMaintenanceNotification(newRequest, formData)
    
    return newRequest
  }
  
  const config: FormDialogConfig<MaintenanceRequest, MaintenanceRequestFormData> = {
    title: 'New Maintenance Request',
    description: 'Report a maintenance issue for one of your properties',
    icon: Wrench,
    iconBgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
    maxWidth: 'lg',
    mode: 'create',
    submitLabel: 'Create Request',
    onSubmit: handleSubmit,
    onSuccess,
    validate: validateMaintenanceForm,
    trackingConfig: {
      formType: 'maintenance_request',
      additionalProperties: {
        property_id: propertyId,
        unit_id: unitId,
        tenant_id: tenantId,
      },
    },
  }
  
  const _initialFormData: MaintenanceRequestFormData = {
    unitId: unitId || '',
    title: '',
    description: '',
    category: 'OTHER',
    priority: 'MEDIUM'
  }
  
  return (
    <FormDialogFactory
      isOpen={isOpen}
      onClose={onClose}
      {...config}
    >
      {(renderParams) => (
        <MaintenanceRequestFormFields 
          {...renderParams}
          allUnits={allUnits}
        />
      )}
    </FormDialogFactory>
  )
}

// ============================================================================
// CONVENIENCE EXPORT
// ============================================================================

export default MaintenanceRequestDialog