/**
 * Lease Form Client Component
 * 
 * Client-side form logic with React Query integration.
 * Handles form state, validation, and mutations with optimistic updates.
 */

"use client"

import React, { useState, useTransition, useEffect, useMemo } from 'react'
import { motion } from '@/lib/framer-motion'
import type { CreateLeaseInput, UpdateLeaseInput, Lease } from '@repo/shared'
import { useCreateLease, useUpdateLease } from '@/hooks/api/use-leases'
import { useProperties } from '@/hooks/use-properties'
import { useTenants } from '@/hooks/use-tenants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Save, X, FileText, DollarSign, AlertCircle, Loader2 } from 'lucide-react'
import { LeaseFormFields } from './lease-form-fields'
import { LeaseTermsSection } from './lease-terms-section'
import { toast } from 'sonner'

// ============================================================================
// INTERFACES
// ============================================================================

interface LeaseFormClientProps {
  lease?: Lease | null
  mode: 'create' | 'edit'
  title: string
  description: string
  preselectedUnitId?: string
  preselectedTenantId?: string
  onSuccess?: (lease: Lease) => void
  onCancel?: () => void
  className?: string
}

// Extended form data type for custom terms
export interface LeaseTerm {
  id: string
  type: 'clause' | 'fee' | 'rule'
  title: string
  description: string
  amount?: number
}

export interface LeaseFormData extends CreateLeaseInput {
  customTerms?: LeaseTerm[]
  status?: string
}

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

export function LeaseFormClient({
  lease,
  mode,
  title,
  description,
  preselectedUnitId,
  preselectedTenantId,
  onSuccess,
  onCancel,
  className
}: LeaseFormClientProps) {
  const [isPending, startTransition] = useTransition()
  const isEditing = mode === 'edit' && Boolean(lease)

  // Data hooks
  const { properties } = useProperties()
  const { tenants } = useTenants()

  // React Query mutations with optimistic updates
  const createMutation = useCreateLease()
  const updateMutation = useUpdateLease()

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

  // Form state
  const [formData, setFormData] = useState<LeaseFormData>(() => {
    if (isEditing && lease) {
      return {
        unitId: lease.unitId,
        tenantId: lease.tenantId,
        propertyId: '', // Not available in Lease type, will be derived from unit
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
        status: lease.status || 'DRAFT',
        customTerms: []
      }
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
      leaseTerms: '',
      customTerms: []
    }
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Auto-fill rent amount and derive propertyId when unit is selected
  useEffect(() => {
    if (formData.unitId) {
      const selectedUnit = availableUnits.find(unit => unit.value === formData.unitId)
      if (selectedUnit) {
        const property = properties.find(p => 
          p.units?.some(u => u.id === formData.unitId)
        )
        
        setFormData(prev => ({
          ...prev,
          propertyId: property?.id || '',
          ...(!isEditing && selectedUnit.rent && {
            rentAmount: selectedUnit.rent,
            securityDeposit: selectedUnit.rent * 1.5
          })
        }))
      }
    }
  }, [formData.unitId, availableUnits, properties, isEditing])

  // Calculate lease duration and totals
  const leaseCalculations = useMemo(() => {
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

  // Form handlers
  const handleFieldChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleCustomTermsChange = (terms: LeaseTerm[]) => {
    setFormData(prev => ({ ...prev, customTerms: terms }))
  }

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.unitId) newErrors.unitId = 'Unit is required'
    if (!formData.tenantId) newErrors.tenantId = 'Tenant is required'
    if (!formData.startDate) newErrors.startDate = 'Start date is required'
    if (!formData.endDate) newErrors.endDate = 'End date is required'
    if (!formData.rentAmount || formData.rentAmount <= 0) {
      newErrors.rentAmount = 'Rent amount must be greater than 0'
    }

    // Date validation
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      if (end <= start) {
        newErrors.endDate = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting')
      return
    }

    startTransition(() => {
      if (isEditing && lease) {
        const updateData: UpdateLeaseInput = {
          startDate: formData.startDate,
          endDate: formData.endDate,
          rentAmount: formData.rentAmount,
          securityDeposit: formData.securityDeposit,
          lateFeeDays: formData.lateFeeDays,
          lateFeeAmount: formData.lateFeeAmount,
          leaseTerms: formData.leaseTerms,
          status: formData.status
        }

        updateMutation.mutate(
          { id: lease.id, data: updateData },
          {
            onSuccess: (updatedLease) => {
              onSuccess?.(updatedLease)
            }
          }
        )
      } else {
        const createData: CreateLeaseInput = {
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
        }

        createMutation.mutate(createData, {
          onSuccess: (newLease) => {
            onSuccess?.(newLease)
          }
        })
      }
    })
  }

  const isSubmitting = isPending || createMutation.isPending || updateMutation.isPending
  const submitError = createMutation.error || updateMutation.error

  return (
    <Card className={cn("w-full max-w-4xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <motion.form 
          onSubmit={handleSubmit}
          className="space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Basic Information */}
          <LeaseFormFields
            formData={formData}
            errors={errors}
            availableUnits={availableUnits}
            availableTenants={availableTenants}
            onChange={handleFieldChange}
          />
          
          <Separator />
          
          {/* Lease Calculations */}
          {leaseCalculations && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <h3 className="text-lg font-semibold">Lease Summary</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <Badge variant="outline">
                      {leaseCalculations.duration} months
                    </Badge>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Monthly Rent</span>
                    <Badge variant="default">
                      ${leaseCalculations.monthlyRent.toLocaleString()}
                    </Badge>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Rent</span>
                    <Badge variant="secondary">
                      ${leaseCalculations.totalRent.toLocaleString()}
                    </Badge>
                  </div>
                </Card>
              </div>
              
              {!leaseCalculations.isValidDuration && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    End date must be after start date
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          <Separator />
          
          {/* Custom Lease Terms */}
          <LeaseTermsSection
            terms={formData.customTerms || []}
            onChange={handleCustomTermsChange}
          />
          
          {/* Submit Error */}
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {submitError instanceof Error 
                  ? submitError.message 
                  : 'An error occurred while saving the lease'
                }
              </AlertDescription>
            </Alert>
          )}
          
          {/* Form Errors */}
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please fix the errors above and try again.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Actions */}
          <div className="flex justify-end space-x-3">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
            
            <Button 
              type="submit" 
              disabled={isSubmitting || !leaseCalculations?.isValidDuration}
              className="min-w-[120px]"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Update' : 'Create'} Lease
            </Button>
          </div>
        </motion.form>
      </CardContent>
    </Card>
  )
}