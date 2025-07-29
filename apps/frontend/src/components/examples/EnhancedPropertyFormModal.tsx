import { useEffect } from 'react'
import { Building2 } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { BaseFormModal } from '@/components/modals/BaseFormModal'
import type { Property } from '@tenantflow/shared/types/properties'
import type { PropertyFormData } from '@tenantflow/shared/types/api-inputs'
import { UpgradePromptModal } from '../modals/UpgradePromptModal'
import { usePropertyFormData } from '../../hooks/usePropertyFormData'
import { usePropertyForm } from '../../hooks/usePropertyForm'
import { PropertyBasicInfoSection } from '../properties/sections/PropertyBasicInfoSection'
import { PropertyLocationSection } from '../properties/sections/PropertyLocationSection'
import { PropertyFeaturesSection } from '../properties/sections/PropertyFeaturesSection'
import { PropertyMediaSection } from '../properties/sections/PropertyMediaSection'

// Enhanced imports for new state management
import { useAppStore } from '@/stores/app-store'
import { usePropertyFormDraft, useFormStateManager } from '@/stores/form-store'
import { usePropertySelection } from '@/stores/selection-store'
import { useCacheManagement } from '@/lib/query/query-utils'

interface EnhancedPropertyFormModalProps {
  property?: Property
  mode?: 'create' | 'edit'
}

/**
 * Enhanced PropertyFormModal demonstrating integration with new Zustand stores
 * Shows how to use:
 * - Centralized modal state management
 * - Form draft persistence
 * - Selection state integration
 * - Optimized cache management
 */
export default function EnhancedPropertyFormModal({
  property,
  mode = 'create'
}: EnhancedPropertyFormModalProps) {
  // Get modal state from centralized store instead of props
  const isOpen = useAppStore(state => state.modals.propertyForm)
  const { closeModal } = useAppStore()
  
  // Form draft management for better UX
  const { draft, saveDraft, clearDraft, hasUnsavedChanges } = usePropertyFormDraft()
  const { formState, setFormState } = useFormStateManager('property-form')
  
  // Selection state integration
  const { selectedProperty, setSelectedProperty } = usePropertySelection()
  
  // Cache management for optimistic updates
  const { invalidateProperty } = useCacheManagement()
  
  // Extract all data and state management
  const {
    showUpgradeModal,
    setShowUpgradeModal,
    userPlan,
    createProperty,
    updateProperty,
    getUpgradeReason,
    checkCanCreateProperty,
    getDefaultValues
  } = usePropertyFormData({ property, mode, isOpen })

  // Enhanced form with draft integration
  const getFormDefaultValues = (): PropertyFormData => {
    // Priority: draft > property data > defaults
    if (mode === 'create' && Object.keys(draft).length > 0) {
      return { ...getDefaultValues(), ...draft }
    }
    if (mode === 'edit' && property) {
      return {
        name: property.name,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        imageUrl: property.imageUrl || '',
        description: property.description || '',
        propertyType: property.propertyType as PropertyFormData['propertyType'],
        hasGarage: false,
        hasPool: false,
        numberOfUnits: undefined,
        createUnitsNow: false,
        ...draft // Apply any draft changes on top
      }
    }
    return getDefaultValues()
  }

  // Wrap mutations with enhanced error handling and cache management
  const wrappedCreateProperty = {
    mutateAsync: async (data: PropertyFormData) => {
      setFormState({ isSubmitting: true })
      try {
        const result = await createProperty.mutateAsync(data)
        
        // Clear draft on successful creation
        clearDraft()
        setFormState({ isDirty: false, lastSaved: new Date() })
        
        // Set the newly created property as selected
        if (result && typeof result === 'object' && 'id' in result) {
          setSelectedProperty(result as Property)
        }
        
        return result
      } catch (error) {
        setFormState({ hasErrors: true })
        throw error
      } finally {
        setFormState({ isSubmitting: false })
      }
    },
    isPending: createProperty.isPending || formState.isSubmitting
  }

  const wrappedUpdateProperty = {
    mutateAsync: async (data: { id: string; updates: Partial<PropertyFormData> }) => {
      setFormState({ isSubmitting: true })
      try {
        const result = await updateProperty.mutateAsync(data)
        
        // Clear draft on successful update
        clearDraft()
        setFormState({ isDirty: false, lastSaved: new Date() })
        
        // Invalidate related cache entries
        await invalidateProperty(data.id)
        
        return result
      } catch (error) {
        setFormState({ hasErrors: true })
        throw error
      } finally {
        setFormState({ isSubmitting: false })
      }
    },
    isPending: updateProperty.isPending || formState.isSubmitting
  }

  // Extract all form logic with draft integration
  const { form, propertyType, numberOfUnits, handleSubmit } = usePropertyForm({
    mode,
    property,
    defaultValues: getFormDefaultValues(),
    checkCanCreateProperty,
    createProperty: wrappedCreateProperty,
    updateProperty: wrappedUpdateProperty,
    onClose: () => closeModal('propertyForm')
  })

  // Auto-save draft as user types
  useEffect(() => {
    if (!isOpen) return

    const subscription = form.watch((data) => {
      // Only save draft if there are actual changes
      const hasChanges = Object.keys(data).some(key => {
        const value = data[key as keyof typeof data]
        return value !== undefined && value !== '' && value !== null
      })

      if (hasChanges && mode === 'create') {
        saveDraft(data as Partial<PropertyFormData>)
        setFormState({ isDirty: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [form, isOpen, mode, saveDraft, setFormState])

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultValues = getFormDefaultValues()
      form.reset(defaultValues)
      
      // Reset form state
      setFormState({
        isDirty: false,
        hasErrors: false,
        isSubmitting: false,
      })
    }
  }, [isOpen, form, setFormState])

  const handleClose = () => {
    // Warn user about unsaved changes
    if (hasUnsavedChanges && formState.isDirty) {
      const shouldClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      )
      if (!shouldClose) return
    }

    form.reset()
    clearDraft()
    setFormState({ isDirty: false, hasErrors: false })
    closeModal('propertyForm')
  }

  return (
    <>
      <BaseFormModal
        isOpen={isOpen}
        onClose={handleClose}
        title={mode === 'edit' ? 'Edit Property' : 'Add New Property'}
        description={
          mode === 'edit'
            ? 'Update the essential property information below'
            : 'Add the essential details to quickly create a new property'
        }
        icon={Building2}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
        maxWidth="2xl"
        onSubmit={form.handleSubmit(handleSubmit)}
        submitLabel={
          mode === 'edit' ? 'Update Property' : 'Create Property'
        }
        cancelLabel="Cancel"
        isSubmitting={form.isSubmitting || formState.isSubmitting}
        submitDisabled={form.isSubmitting || formState.isSubmitting}
      >
        {/* Show draft status indicator */}
        {hasUnsavedChanges && (
          <div className="mb-4 rounded-md bg-amber-50 p-3 border border-amber-200">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Draft saved
                </h3>
                <p className="mt-1 text-sm text-amber-700">
                  Your changes are automatically saved as you type.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show form state indicators */}
        {formState.hasErrors && (
          <div className="mb-4 rounded-md bg-red-50 p-3 border border-red-200">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error occurred
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  There was an error saving your changes. Please try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Property Basic Information Section */}
        <PropertyBasicInfoSection
          form={form as unknown as UseFormReturn<PropertyFormData>}
          propertyType={propertyType as string}
          numberOfUnits={numberOfUnits}
          mode={mode}
        />

        {/* Property Location Section */}
        <PropertyLocationSection
          form={form as unknown as UseFormReturn<PropertyFormData>}
        />

        {/* Property Features Section - Only in edit mode */}
        {mode === 'edit' && (
          <PropertyFeaturesSection
            form={form as unknown as UseFormReturn<PropertyFormData>}
          />
        )}

        {/* Property Media Section */}
        <PropertyMediaSection
          form={form as unknown as UseFormReturn<PropertyFormData>}
        />
      </BaseFormModal>

      {/* Upgrade Prompt Modal */}
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        action="Add New Property"
        reason={getUpgradeReason('property')}
        currentPlan={userPlan?.id || 'FREE'}
        suggestedPlan="BASIC"
      />
    </>
  )
}