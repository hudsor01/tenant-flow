/**
 * Lease Form Dialog - Refactored
 * 
 * Modern lease form dialog using FormDialogFactory for consistent UX.
 * Handles complex lease calculations, custom terms, and unit/tenant selection.
 * 
 * Features:
 * - FormDialogFactory integration
 * - Real-time lease calculations
 * - Dynamic unit/tenant selection
 * - Custom lease terms management
 * - Type-safe form handling with validation
 */

"use client"

import React, { useMemo } from 'react'
import type { Lease, CreateLeaseInput, UpdateLeaseInput } from '@repo/shared'
import { FileText } from 'lucide-react'
import { useCreateLease, useUpdateLease } from '@/hooks/api/use-leases'
import { useProperties } from '@/hooks/api/use-properties'
import { useTenants } from '@/hooks/api/use-tenants'
import { FormDialogFactory, commonValidations, type FormDialogConfig, type FormRenderParams } from './form-dialog-factory'
import { TextField, SelectField, TextAreaField } from './form-patterns'
import { FormSection } from './form-sections'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface LeaseFormData {
  unitId: string
  tenantId: string
  propertyId: string
  startDate: string
  endDate: string
  rentAmount: number
  securityDeposit: number
  lateFeeDays: number
  lateFeeAmount: number
  leaseTerms: string
  status?: string
}

interface LeaseFormDialogProps {
  isOpen: boolean
  onClose: () => void
  lease?: Lease
  mode?: 'create' | 'edit'
  preselectedUnitId?: string
  preselectedTenantId?: string
  onSuccess?: (lease: Lease) => void
}

interface UnitOption {
  value: string
  label: string
  propertyName: string
  unitNumber: string
  rent: number
}

interface TenantOption {
  value: string
  label: string
}

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

const transformInitialData = (lease: Lease): LeaseFormData => ({
  unitId: lease.unitId,
  tenantId: lease.tenantId,
  propertyId: '', // Will be derived from unit
  startDate: typeof lease.startDate === 'string' 
    ? lease.startDate.split('T')[0] 
    : lease.startDate.toISOString().split('T')[0],
  endDate: typeof lease.endDate === 'string' 
    ? lease.endDate.split('T')[0] 
    : lease.endDate.toISOString().split('T')[0],
  rentAmount: lease.rentAmount,
  securityDeposit: lease.securityDeposit || 0,
  lateFeeDays: 5, // Default value - not stored in Lease type
  lateFeeAmount: 50, // Default value - not stored in Lease type
  leaseTerms: lease.terms || '',
  status: lease.status || 'DRAFT'
})

const transformSubmitData = (formData: LeaseFormData): CreateLeaseInput | UpdateLeaseInput => ({
  unitId: formData.unitId,
  tenantId: formData.tenantId,
  propertyId: formData.propertyId,
  startDate: formData.startDate,
  endDate: formData.endDate,
  rentAmount: formData.rentAmount,
  securityDeposit: formData.securityDeposit,
  lateFeeDays: formData.lateFeeDays,
  lateFeeAmount: formData.lateFeeAmount,
  leaseTerms: formData.leaseTerms
})

// ============================================================================
// VALIDATION
// ============================================================================

const validateLeaseForm = (formData: LeaseFormData): Record<string, string> => {
  const errors: Record<string, string> = {}
  
  // Required fields
  if (!formData.unitId) errors.unitId = 'Unit is required'
  if (!formData.tenantId) errors.tenantId = 'Tenant is required'
  if (!formData.startDate) errors.startDate = 'Start date is required'
  if (!formData.endDate) errors.endDate = 'End date is required'
  
  // Rent amount validation
  if (!formData.rentAmount || formData.rentAmount <= 0) {
    errors.rentAmount = 'Rent amount must be greater than 0'
  }
  
  // Date validation
  if (formData.startDate && formData.endDate) {
    const dateError = commonValidations.dateAfter(formData.startDate, formData.endDate, 'End date')
    if (dateError) errors.endDate = dateError
  }
  
  // Late fee validation
  if (formData.lateFeeDays && formData.lateFeeDays < 1) {
    errors.lateFeeDays = 'Late fee days must be at least 1'
  }
  
  if (formData.lateFeeAmount && formData.lateFeeAmount < 0) {
    errors.lateFeeAmount = 'Late fee amount cannot be negative'
  }
  
  return errors
}

// ============================================================================
// LEASE CALCULATIONS HOOK
// ============================================================================

function useLeaseCalculations(formData: LeaseFormData) {
  return useMemo(() => {
    const startDate = formData.startDate ? new Date(formData.startDate) : null
    const endDate = formData.endDate ? new Date(formData.endDate) : null
    const rentAmount = formData.rentAmount || 0
    
    if (!startDate || !endDate) return null
    
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                   (endDate.getMonth() - startDate.getMonth())
    
    return {
      duration: months,
      totalRent: rentAmount * months,
      monthlyRent: rentAmount,
      isValidDuration: months > 0
    }
  }, [formData.startDate, formData.endDate, formData.rentAmount])
}

// ============================================================================
// FORM FIELDS COMPONENT
// ============================================================================

function LeaseFormFields({ 
  formData, 
  errors, 
  isSubmitting, 
  onChange,
  availableUnits,
  availableTenants,
  onUnitChange
}: FormRenderParams<LeaseFormData> & {
  availableUnits: UnitOption[]
  availableTenants: TenantOption[]
  onUnitChange: (unitId: string) => void
}) {
  const calculations = useLeaseCalculations(formData)

  const handleUnitChange = (unitId: string) => {
    onChange('unitId', unitId)
    onUnitChange(unitId)
  }

  return (
    <div className="space-y-6">
      {/* Property and Tenant Selection */}
      <FormSection title="Lease Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label="Unit"
            name="unitId"
            required
            value={formData.unitId}
            onValueChange={handleUnitChange}
            error={errors.unitId}
            placeholder="Select a unit"
            options={availableUnits.map(unit => ({
              value: unit.value,
              label: unit.label
            }))}
          />
          
          <SelectField
            label="Tenant"
            name="tenantId"
            required
            value={formData.tenantId}
            onValueChange={(value) => onChange('tenantId', value)}
            error={errors.tenantId}
            placeholder="Select a tenant"
            options={availableTenants}
          />
        </div>
      </FormSection>
      
      {/* Lease Terms */}
      <FormSection title="Lease Terms">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Start Date"
            name="startDate"
            type="date"
            required
            value={formData.startDate}
            onChange={(e) => onChange('startDate', e.target.value)}
            error={errors.startDate}
            disabled={isSubmitting}
          />
          
          <TextField
            label="End Date"
            name="endDate"
            type="date"
            required
            value={formData.endDate}
            onChange={(e) => onChange('endDate', e.target.value)}
            error={errors.endDate}
            disabled={isSubmitting}
          />
          
          <TextField
            label="Monthly Rent"
            name="rentAmount"
            type="number"
            step="0.01"
            required
            value={formData.rentAmount?.toString() || ''}
            onChange={(e) => onChange('rentAmount', parseFloat(e.target.value) || 0)}
            error={errors.rentAmount}
            disabled={isSubmitting}
            placeholder="0.00"
          />
          
          <TextField
            label="Security Deposit"
            name="securityDeposit"
            type="number"
            step="0.01"
            value={formData.securityDeposit?.toString() || ''}
            onChange={(e) => onChange('securityDeposit', parseFloat(e.target.value) || 0)}
            error={errors.securityDeposit}
            disabled={isSubmitting}
            placeholder="0.00"
            hint="Usually 1-2 months rent"
          />
          
          <TextField
            label="Late Fee Days"
            name="lateFeeDays"
            type="number"
            value={formData.lateFeeDays?.toString() || ''}
            onChange={(e) => onChange('lateFeeDays', parseInt(e.target.value) || 0)}
            error={errors.lateFeeDays}
            disabled={isSubmitting}
            placeholder="5"
            hint="Grace period before late fees apply"
          />
          
          <TextField
            label="Late Fee Amount"
            name="lateFeeAmount"
            type="number"
            step="0.01"
            value={formData.lateFeeAmount?.toString() || ''}
            onChange={(e) => onChange('lateFeeAmount', parseFloat(e.target.value) || 0)}
            error={errors.lateFeeAmount}
            disabled={isSubmitting}
            placeholder="50.00"
          />
        </div>
        
        <TextAreaField
          label="Lease Terms & Conditions"
          name="leaseTerms"
          value={formData.leaseTerms}
          onChange={(e) => onChange('leaseTerms', e.target.value)}
          error={errors.leaseTerms}
          disabled={isSubmitting}
          rows={4}
          placeholder="Additional lease terms and conditions..."
          hint="Include any special terms, rules, or conditions"
        />
      </FormSection>
      
      {/* Lease Summary */}
      {calculations && (
        <FormSection title="Lease Summary">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <Badge variant="outline">
                  {calculations.duration} months
                </Badge>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Monthly Rent</span>
                <Badge variant="default">
                  ${calculations.monthlyRent.toLocaleString()}
                </Badge>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Rent</span>
                <Badge variant="secondary">
                  ${calculations.totalRent.toLocaleString()}
                </Badge>
              </div>
            </Card>
          </div>
          
          {!calculations.isValidDuration && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                End date must be after start date
              </AlertDescription>
            </Alert>
          )}
        </FormSection>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LeaseFormDialog({
  isOpen,
  onClose,
  lease,
  mode = 'create',
  preselectedUnitId,
  preselectedTenantId,
  onSuccess
}: LeaseFormDialogProps) {
  const createMutation = useCreateLease()
  const updateMutation = useUpdateLease()
  const { data: properties = [] } = useProperties()
  const { data: tenants = [] } = useTenants()
  
  const isEditing = mode === 'edit' && Boolean(lease)
  
  // Available units and tenants
  const availableUnits = useMemo(() => {
    return properties.flatMap(property => 
      property.units?.filter(unit => 
        unit.status === 'VACANT' || unit.id === lease?.unitId
      ).map(unit => ({
        value: unit.id,
        label: `${property.name} - Unit ${unit.unitNumber} ($${unit.rent ?? unit.monthlyRent ?? 0}/month)`,
        propertyName: property.name,
        unitNumber: unit.unitNumber,
        rent: unit.rent ?? unit.monthlyRent ?? 0
      })) || []
    )
  }, [properties, lease?.unitId])
  
  const availableTenants = useMemo(() => {
    return tenants
      .filter(tenant => tenant.invitationStatus === 'ACCEPTED')
      .map(tenant => ({
        value: tenant.id,
        label: `${tenant.name} (${tenant.email})`
      }))
  }, [tenants])
  
  const handleSubmit = async (formData: LeaseFormData): Promise<Lease> => {
    const submitData = transformSubmitData(formData)
    
    if (isEditing && lease) {
      return await updateMutation.mutateAsync({
        id: lease.id,
        data: submitData as UpdateLeaseInput
      })
    } else {
      return await createMutation.mutateAsync(submitData as CreateLeaseInput)
    }
  }
  
  const config: FormDialogConfig<Lease, LeaseFormData> = {
    title: isEditing ? 'Edit Lease Agreement' : 'Create New Lease',
    description: isEditing 
      ? 'Update lease terms and conditions'
      : 'Create a comprehensive lease agreement for your tenant',
    icon: FileText,
    iconBgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    maxWidth: 'xl',
    mode,
    initialData: lease,
    submitLabel: isEditing ? 'Update Lease' : 'Create Lease',
    onSubmit: handleSubmit,
    onSuccess,
    validate: validateLeaseForm,
    transformInitialData,
    trackingConfig: {
      formType: 'lease',
      additionalProperties: {
        lease_id: lease?.id,
        preselected_unit: preselectedUnitId,
        preselected_tenant: preselectedTenantId,
      },
    },
  }
  
  const [_formData, _setFormData] = React.useState<LeaseFormData>(() => {
    if (isEditing && lease) {
      return transformInitialData(lease)
    }
    return {
      unitId: preselectedUnitId || '',
      tenantId: preselectedTenantId || '',
      propertyId: '',
      startDate: '',
      endDate: '',
      rentAmount: 0,
      securityDeposit: 0,
      lateFeeDays: 5,
      lateFeeAmount: 50,
      leaseTerms: ''
    }
  })
  
  const handleUnitChange = (unitId: string) => {
    const selectedUnit = availableUnits.find(unit => unit.value === unitId)
    if (selectedUnit) {
      const property = properties.find(p => 
        p.units?.some(u => u.id === unitId)
      )
      
      _setFormData((prev: LeaseFormData) => ({
        ...prev,
        propertyId: property?.id || '',
        ...(!isEditing && selectedUnit.rent && {
          rentAmount: selectedUnit.rent,
          securityDeposit: selectedUnit.rent * 1.5
        })
      }))
    }
  }
  
  return (
    <FormDialogFactory
      isOpen={isOpen}
      onClose={onClose}
      {...config}
    >
      {(renderParams) => (
        <LeaseFormFields 
          {...renderParams}
          availableUnits={availableUnits}
          availableTenants={availableTenants}
          onUnitChange={handleUnitChange}
        />
      )}
    </FormDialogFactory>
  )
}

// ============================================================================
// CONVENIENCE EXPORT
// ============================================================================

export default LeaseFormDialog