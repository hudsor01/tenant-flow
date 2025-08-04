import { useEffect, useMemo } from 'react'
import { FormProvider, useFieldArray } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { DollarSign, FileText, Loader2, Plus, Trash2, User } from 'lucide-react'
import { useLeaseForm } from '@/hooks/useLeaseForm'
import { SupabaseFormField, LeaseStatusField } from './SupabaseFormField'
import { usePropertyStore } from '@/stores/property-store'
import { useTenantStore } from '@/stores/tenant-store'
import { useAppStore } from '@/stores/app-store'
import { toast } from 'sonner'
import type { Lease } from '@tenantflow/shared'

type LeaseData = Lease

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

// Extended form data to include custom terms
interface LeaseFormDataWithTerms extends Partial<LeaseData> {
  customTerms?: LeaseTerm[]
}

export function LeaseForm({ 
  lease, 
  preselectedUnitId, 
  preselectedTenantId, 
  onSuccess, 
  onCancel 
}: LeaseFormProps) {
  // Use the Zustand stores for data access
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
  const {
    form,
    handleSubmit: submitForm,
    isPending
  } = useLeaseForm({
    lease: lease || undefined,
    mode: lease ? 'edit' : 'create',
    propertyId: preselectedUnitId ? properties.find(p => 
      p.units?.some(u => u.id === preselectedUnitId)
    )?.id : undefined,
    unitId: preselectedUnitId,
    tenantId: preselectedTenantId,
    onSuccess: () => {
      toast.success('Lease saved successfully!')
      if (lease) {
        onSuccess?.(lease)
      }
      closeModal('leaseForm')
      closeModal('editLease')
    },
    onClose: onCancel
  })
  
  // Early return if form is not initialized
  if (!form) {
    return null
  }
  
  const { control, watch, setValue, formState: { errors } } = form
  
  // Dynamic lease terms using useFieldArray - stored separately from the main lease data
  const { fields: leaseTerms, append: addTerm, remove: removeTerm } = useFieldArray<LeaseFormDataWithTerms, 'customTerms'>({
    control: control as any,
    name: 'customTerms'
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
  
  // Form submission is handled by the hook
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (submitForm) {
      void submitForm(form?.getValues() || {})
    }
  }
  
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
          <form onSubmit={handleFormSubmit} className="space-y-8">
            
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
                          name={`customTerms.${index}.type` as any}
                          control={control as any}
                          type="select"
                          label="Type"
                          options={[
                            { value: 'clause', label: 'Clause' },
                            { value: 'fee', label: 'Fee' },
                            { value: 'rule', label: 'Rule' }
                          ]}
                        />
                        
                        <SupabaseFormField
                          name={`customTerms.${index}.title` as any}
                          control={control as any}
                          label="Title"
                          placeholder="Enter term title"
                        />
                      </div>
                      
                      <SupabaseFormField
                        name={`customTerms.${index}.description` as any}
                        control={control as any}
                        label="Description"
                        placeholder="Describe this lease term"
                        multiline
                        rows={2}
                      />
                      
                      {(watch as any)(`customTerms.${index}.type`) === 'fee' && (
                        <SupabaseFormField
                          name={`customTerms.${index}.amount` as any}
                          control={control as any}
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
                disabled={isPending || !leaseCalculations?.isValidDuration}
                className="min-w-[120px]"
              >
                {isPending && (
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