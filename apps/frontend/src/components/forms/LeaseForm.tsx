import { useEffect, useMemo } from 'react'
import { FormProvider, useFieldArray } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { DollarSign, FileText, Loader2, Plus, Trash2, User } from 'lucide-react'
import { useLeaseForm } from '@/hooks/useSupabaseForm'
import { SupabaseFormField, LeaseStatusField } from './SupabaseFormField'
import { useLeaseStore } from '@/stores/lease-store'
import { usePropertyStore } from '@/stores/property-store'
import { useTenantStore } from '@/stores/tenant-store'
import { useAppStore } from '@/stores/app-store'
import { toast } from 'sonner'
import type { SupabaseTableData } from '@/hooks/use-infinite-query'

type LeaseData = SupabaseTableData<'Lease'>

interface LeaseFormProps {
  lease?: LeaseData | null
  preselectedUnitId?: string
  preselectedTenantId?: string
  onSuccess?: (lease: LeaseData) => void
  onCancel?: () => void
}

// Additional lease term interface for dynamic fields
interface LeaseTerm {
  id: string
  type: 'clause' | 'fee' | 'rule'
  title: string
  description: string
  amount?: number
}

export function LeaseForm({ 
  lease, 
  preselectedUnitId, 
  preselectedTenantId, 
  onSuccess, 
  onCancel 
}: LeaseFormProps) {
  // Use all the Zustand stores for state management
  const { createLease, updateLease } = useLeaseStore()
  const { properties } = usePropertyStore()
  const { tenants } = useTenantStore()
  const { closeModal } = useAppStore()
  
  // Get available units (not currently occupied)
  const availableUnits = useMemo(() => {
    return properties.flatMap(property => 
      property.units?.filter(unit => 
        unit.status === 'VACANT' || unit.id === lease?.unitId
      ).map(unit => ({
        value: unit.id,
        label: `${property.name} - Unit ${unit.unitNumber} ($${unit.rent}/month)`,
        propertyName: property.name,
        unitNumber: unit.unitNumber,
        rent: unit.rent
      })) || []
    )
  }, [properties, lease?.unitId])
  
  // Get available tenants
  const availableTenants = useMemo(() => {
    return tenants
      .filter(tenant => tenant.invitationStatus === 'ACCEPTED')
      .map(tenant => ({
        value: tenant.id,
        label: `${tenant.name} (${tenant.email})`
      }))
  }, [tenants])
  
  // Enhanced form with dynamic lease terms
  const form = useLeaseForm({
    defaultValues: lease || {
      unitId: preselectedUnitId || '',
      tenantId: preselectedTenantId || '',
      startDate: '',
      endDate: '',
      rentAmount: 0,
      securityDeposit: 0,
      status: 'DRAFT' as const
    },
    onSuccess: (data) => {
      toast.success('Lease saved successfully!')
      onSuccess?.(data)
      closeModal('leaseForm')
      closeModal('editLease')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })
  
  const { handleSubmit, control, watch, setValue, formState: { isSubmitting, errors } } = form
  
  // Dynamic lease terms using useFieldArray
  const { fields: leaseTerms, append: addTerm, remove: removeTerm } = useFieldArray({
    control,
    name: 'terms' as keyof LeaseData // Custom field not in base schema
  })
  
  // Watch form values for dynamic updates
  const watchedValues = watch()
  const selectedUnitId = watch('unitId')
  
  // Auto-fill rent amount when unit is selected
  useEffect(() => {
    if (selectedUnitId) {
      const selectedUnit = availableUnits.find(unit => unit.value === selectedUnitId)
      if (selectedUnit && !lease) {
        setValue('rentAmount', selectedUnit.rent)
        // Suggest security deposit (typically 1-2 months rent)
        setValue('securityDeposit', selectedUnit.rent * 1.5)
      }
    }
  }, [selectedUnitId, availableUnits, setValue, lease])
  
  // Calculate lease duration and total amount
  const leaseCalculations = useMemo(() => {
    const startDate = watchedValues.startDate ? new Date(watchedValues.startDate) : null
    const endDate = watchedValues.endDate ? new Date(watchedValues.endDate) : null
    const rentAmount = watchedValues.rentAmount || 0
    
    if (!startDate || !endDate) return null
    
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                   (endDate.getMonth() - startDate.getMonth())
    
    return {
      duration: months,
      totalRent: rentAmount * months,
      monthlyRent: rentAmount,
      isValidDuration: months > 0
    }
  }, [watchedValues.startDate, watchedValues.endDate, watchedValues.rentAmount])
  
  // Form submission using Zustand stores
  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      let leaseResult: LeaseData
      
      if (lease?.id) {
        // Update existing lease through both Supabase and Zustand store
        leaseResult = await form.updateInSupabase(lease.id, data)
        await updateLease(lease.id, leaseResult)
      } else {
        // Create new lease through both Supabase and Zustand store
        leaseResult = await form.submitToSupabase(data)
        await createLease(leaseResult)
      }
      
      if (onSuccess) {
        onSuccess(leaseResult)
      }
      
      if (onCancel) {
        onCancel()
      }
    } catch (error) {
      console.error('Lease form submission error:', error)
    }
  })
  
  // Add default lease terms
  const addDefaultTerms = () => {
    const defaultTerms: Omit<LeaseTerm, 'id'>[] = [
      {
        type: 'clause',
        title: 'Pet Policy',
        description: 'No pets allowed without written permission'
      },
      {
        type: 'fee',
        title: 'Late Fee',
        description: 'Late payment fee after 5 days',
        amount: 50
      },
      {
        type: 'rule',
        title: 'Noise Policy',
        description: 'Quiet hours from 10 PM to 8 AM'
      }
    ]
    
    defaultTerms.forEach(term => {
      addTerm({ ...term, id: crypto.randomUUID() })
    })
  }
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {lease ? 'Edit Lease Agreement' : 'Create New Lease'}
        </CardTitle>
        <CardDescription>
          {lease 
            ? 'Update lease terms and conditions' 
            : 'Create a comprehensive lease agreement for your tenant'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={(e) => { e.preventDefault(); void handleFormSubmit(e); }} className="space-y-8">
            
            {/* Basic Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <h3 className="text-lg font-semibold">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SupabaseFormField
                  name="unitId"
                  control={control}
                  type="select"
                  label="Select Unit"
                  placeholder="Choose a unit"
                  options={availableUnits}
                  required
                />
                
                <SupabaseFormField
                  name="tenantId"
                  control={control}
                  type="select"
                  label="Select Tenant"
                  placeholder="Choose a tenant"
                  options={availableTenants}
                  required
                />
                
                <SupabaseFormField
                  name="startDate"
                  control={control}
                  type="text" // In real implementation, use date picker
                  label="Lease Start Date"
                  placeholder="YYYY-MM-DD"
                  required
                />
                
                <SupabaseFormField
                  name="endDate"
                  control={control}
                  type="text" // In real implementation, use date picker
                  label="Lease End Date"
                  placeholder="YYYY-MM-DD"
                  required
                />
                
                <SupabaseFormField
                  name="rentAmount"
                  control={control}
                  type="number"
                  label="Monthly Rent"
                  placeholder="0"
                  min={0}
                  required
                />
                
                <SupabaseFormField
                  name="securityDeposit"
                  control={control}
                  type="number"
                  label="Security Deposit"
                  placeholder="0"
                  min={0}
                  required
                />
                
                <LeaseStatusField
                  name="status"
                  control={control}
                  label="Lease Status"
                  required
                />
              </div>
            </div>
            
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
                    <AlertDescription>
                      End date must be after start date
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            <Separator />
            
            {/* Dynamic Lease Terms */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <h3 className="text-lg font-semibold">Lease Terms & Conditions</h3>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDefaultTerms}
                    disabled={leaseTerms.length > 0}
                  >
                    Add Default Terms
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTerm({
                      id: crypto.randomUUID(),
                      type: 'clause',
                      title: '',
                      description: ''
                    })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Term
                  </Button>
                </div>
              </div>
              
              {leaseTerms.length === 0 && (
                <Alert>
                  <AlertDescription>
                    No lease terms added yet. Click "Add Default Terms" to get started.
                  </AlertDescription>
                </Alert>
              )}
              
              {leaseTerms.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SupabaseFormField
                          name={`terms.${index}.type` as keyof LeaseData}
                          control={control}
                          type="select"
                          label="Type"
                          options={[
                            { value: 'clause', label: 'Clause' },
                            { value: 'fee', label: 'Fee' },
                            { value: 'rule', label: 'Rule' }
                          ]}
                        />
                        
                        <SupabaseFormField
                          name={`terms.${index}.title` as keyof LeaseData}
                          control={control}
                          label="Title"
                          placeholder="Enter term title"
                        />
                      </div>
                      
                      <SupabaseFormField
                        name={`terms.${index}.description` as keyof LeaseData}
                        control={control}
                        label="Description"
                        placeholder="Describe this lease term"
                        multiline
                        rows={2}
                      />
                      
                      {watch(`terms.${index}.type`) === 'fee' && (
                        <SupabaseFormField
                          name={`terms.${index}.amount` as keyof LeaseData}
                          control={control}
                          type="number"
                          label="Amount"
                          placeholder="0"
                          min={0}
                        />
                      )}
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTerm(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            
            {/* Error Display */}
            {Object.keys(errors).length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  Please fix the errors above and try again.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Actions */}
            <div className="flex justify-end space-x-3">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={isSubmitting || !leaseCalculations?.isValidDuration}
                className="min-w-[120px]"
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {lease ? 'Update' : 'Create'} Lease
              </Button>
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  )
}