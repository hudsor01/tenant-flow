/**
 * Pure React 19 + Zustand Property Form Modal Example
 * This demonstrates the complete migration from useState patterns to pure React 19 + Zustand
 */
import { Building2 } from 'lucide-react'
import { 
  use, 
  useTransition, 
  useDeferredValue, 
  Suspense, 
  startTransition,
  useOptimistic,
  type FormEvent
} from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SuspenseBoundary, FormBoundary } from '@/components/boundaries/SuspenseBoundary'
import { useModal, useNotifications } from '@/stores/global-state'
import { useActiveWorkflow, useWorkflowActions } from '@/stores/workflow-state'
import { useFormAction, createPropertyAction } from '@/lib/actions/form-actions'
import { useConcurrentUtils } from '@/lib/concurrent/concurrent-utils'
import type { PropertyFormData } from '@tenantflow/shared/types/api-inputs'
import type { Property } from '@tenantflow/shared/types/properties'

// =====================================================
// 1. PURE ZUSTAND STATE (No useState!)
// =====================================================

// Modal state is managed by Zustand global store
// Form workflow is managed by Zustand workflow store
// No local useState - everything is in stores where it belongs

// =====================================================
// 2. REACT 19 FORM ACTIONS
// =====================================================

interface PropertyFormProps {
  initialData?: Partial<PropertyFormData>
  mode: 'create' | 'edit'
  onSuccess?: (property: Property) => void
}

function PropertyForm({ initialData, mode, onSuccess }: PropertyFormProps) {
  // React 19 concurrent features
  const { isPending, startTransition } = useConcurrentUtils()
  
  // Zustand state (no useState!)
  const { close: closeModal } = useModal()
  const { add: addNotification } = useNotifications()
  const activeWorkflow = useActiveWorkflow()
  const { completeStep, updateStepData } = useWorkflowActions()
  
  // React 19 form action
  const { action: submitAction, isLoading } = useFormAction(createPropertyAction)
  
  // Optimistic updates for immediate UI feedback
  const [optimisticData, addOptimistic] = useOptimistic(
    initialData || {},
    (state, optimisticUpdate: Partial<PropertyFormData>) => ({
      ...state,
      ...optimisticUpdate
    })
  )
  
  // Deferred values for better performance
  const deferredOptimisticData = useDeferredValue(optimisticData)
  
  // React 19 form action handler
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    const formData = new FormData(event.currentTarget)
    
    // Optimistic update for immediate feedback
    const optimisticUpdate: Partial<PropertyFormData> = {
      name: formData.get('name') as string,
      type: formData.get('type') as any,
      address: formData.get('address') as string,
    }
    
    startTransition(() => {
      addOptimistic(optimisticUpdate)
    })
    
    try {
      // Use React 19 form action
      const result = await submitAction(formData)
      
      if (result.success) {
        // Update workflow if active
        if (activeWorkflow?.type === 'property-creation') {
          completeStep(activeWorkflow.id, 'basic-info', result.data)
        }
        
        // Success notification via Zustand
        addNotification({
          type: 'success',
          message: `Property ${mode === 'create' ? 'created' : 'updated'} successfully!`,
        })
        
        // Close modal via Zustand
        closeModal()
        
        // Callback
        if (onSuccess && result.data) {
          onSuccess(result.data)
        }
      }
    } catch (error) {
      // Error notification via Zustand
      addNotification({
        type: 'error',
        message: 'Failed to save property. Please try again.',
      })
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Property Name *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={deferredOptimisticData.name}
              placeholder="Enter property name"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Property Type *</Label>
            <Select name="type" required defaultValue={deferredOptimisticData.type}>
              <SelectTrigger disabled={isLoading}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SINGLE_FAMILY">Single Family</SelectItem>
                <SelectItem value="MULTI_FAMILY">Multi Family</SelectItem>
                <SelectItem value="APARTMENT">Apartment</SelectItem>
                <SelectItem value="CONDO">Condo</SelectItem>
                <SelectItem value="TOWNHOUSE">Townhouse</SelectItem>
                <SelectItem value="COMMERCIAL">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address">Address *</Label>
          <Input
            id="address"
            name="address"
            required
            defaultValue={deferredOptimisticData.address}
            placeholder="Enter full address"
            disabled={isLoading}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              name="city"
              required
              defaultValue={deferredOptimisticData.city}
              placeholder="City"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              name="state"
              required
              defaultValue={deferredOptimisticData.state}
              placeholder="State"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="zipCode">ZIP Code *</Label>
            <Input
              id="zipCode"
              name="zipCode"
              required
              defaultValue={deferredOptimisticData.zipCode}
              placeholder="ZIP Code"
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={deferredOptimisticData.description}
            placeholder="Property description (optional)"
            disabled={isLoading}
            rows={3}
          />
        </div>
      </div>
      
      {/* Submit Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => closeModal()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="min-w-24"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              {mode === 'create' ? 'Creating...' : 'Updating...'}
            </div>
          ) : (
            mode === 'create' ? 'Create Property' : 'Update Property'
          )}
        </Button>
      </div>
      
      {/* Loading indicator for optimistic updates */}
      {isPending && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="bg-background border rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              Processing...
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

// =====================================================
// 3. PURE MODAL COMPONENT (React 19 + Zustand)
// =====================================================

export function PurePropertyFormModal() {
  // Pure Zustand state - no useState!
  const { activeModal, modalData, close } = useModal()
  const isOpen = activeModal === 'property-form'
  
  // Extract modal data
  const property = modalData?.property as Property | undefined
  const mode = (modalData?.mode as 'create' | 'edit') || 'create'
  
  // Success handler
  const handleSuccess = (newProperty: Property) => {
    // Additional success logic can go here
    console.log('Property saved:', newProperty)
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            {mode === 'edit' ? 'Edit Property' : 'Add New Property'}
          </DialogTitle>
        </DialogHeader>
        
        {/* React 19 Suspense Boundary */}
        <FormBoundary>
          <PropertyForm
            initialData={property}
            mode={mode}
            onSuccess={handleSuccess}
          />
        </FormBoundary>
      </DialogContent>
    </Dialog>
  )
}

// =====================================================
// 4. USAGE EXAMPLES
// =====================================================

// Component that triggers the modal
export function PropertyListActions() {
  const { open: openModal } = useModal()
  const { start: startWorkflow } = useWorkflowActions()
  const [isPending, startTransition] = useTransition()
  
  const handleCreateProperty = () => {
    startTransition(() => {
      // Start workflow
      const workflowId = startWorkflow('property-creation')
      
      // Open modal with workflow context
      openModal('property-form', {
        mode: 'create',
        workflowId,
      })
    })
  }
  
  const handleEditProperty = (property: Property) => {
    startTransition(() => {
      openModal('property-form', {
        mode: 'edit',
        property,
      })
    })
  }
  
  return (
    <div className="flex gap-2">
      <Button 
        onClick={handleCreateProperty}
        disabled={isPending}
      >
        Add Property
      </Button>
    </div>
  )
}

// =====================================================
// 5. MIGRATION COMPARISON
// =====================================================

/*
BEFORE (useState patterns):
- const [isOpen, setIsOpen] = useState(false)
- const [formData, setFormData] = useState({})
- const [isLoading, setIsLoading] = useState(false)
- const [errors, setErrors] = useState({})
- Complex prop drilling
- Manual loading state management
- Form state lost on unmount

AFTER (Pure React 19 + Zustand):
- Modal state in Zustand global store
- Form actions with React 19 useActionState
- Optimistic updates with useOptimistic
- Concurrent features with useTransition
- Workflow state in dedicated Zustand store
- Form state persisted in workflow context
- Clean separation of concerns
- No prop drilling
- Better performance with selective subscriptions
- Automatic error boundaries with Suspense
*/