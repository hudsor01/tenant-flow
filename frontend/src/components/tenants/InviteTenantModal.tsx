import React, { useEffect } from 'react'
import { UserPlus } from 'lucide-react'
import { BaseFormModal } from '@/components/common/BaseFormModal'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import TenantAlreadyAcceptedModal from './TenantAlreadyAcceptedModal'
import { UpgradePromptModal } from '../billing/UpgradePromptModal'
import { useInviteTenantData } from '../../hooks/useInviteTenantData'
import { useInviteTenantForm } from '../../hooks/useInviteTenantForm'
import { TenantInfoSection } from './sections/TenantInfoSection'
import { PropertyAssignmentSection } from './sections/PropertyAssignmentSection'
import { ErrorHandlingSection } from './sections/ErrorHandlingSection'

interface InviteTenantModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPropertyId?: string
}

export default function InviteTenantModal({ 
  isOpen, 
  onClose, 
  selectedPropertyId 
}: InviteTenantModalProps) {
  // Extract all data and state management
  const {
    selectedProperty,
    showUpgradeModal,
    setShowUpgradeModal,
    pendingInvitationError,
    setPendingInvitationError,
    alreadyAcceptedTenant,
    setAlreadyAcceptedTenant,
    properties,
    propertiesLoading,
    propertiesError,
    units,
    unitsLoading,
    userPlan,
    inviteTenant,
    isInviting,
    resendInvitation,
    isResending,
    deletePendingInvitation,
    isDeleting,
    canAddTenant,
    getUpgradeReason,
    resetStates,
    updateSelectedProperty,
    initializeProperty,
  } = useInviteTenantData(selectedPropertyId);

  // Extract all form logic
  const { form, handleSubmit } = useInviteTenantForm({
    selectedPropertyId,
    canAddTenant,
    setShowUpgradeModal,
    setPendingInvitationError,
    setAlreadyAcceptedTenant,
    inviteTenant,
    onClose: handleClose,
  });

  const { watch, setValue, reset } = form;
  const watchedPropertyId = watch('propertyId');

  // Update selected property when form value changes
  useEffect(() => {
    updateSelectedProperty(watchedPropertyId, setValue);
  }, [watchedPropertyId, updateSelectedProperty, setValue]);

  // Initialize property when modal opens
  initializeProperty(isOpen, setValue);

  function handleClose() {
    resetStates();
    reset();
    onClose();
  }

  const handleResendInvitation = async () => {
    if (!pendingInvitationError?.tenantId) return
    
    try {
      await resendInvitation(pendingInvitationError.tenantId)
      toast.success('Invitation resent successfully!')
      handleClose()
    } catch (error) {
      logger.error('Failed to resend invitation', error as Error, { tenantId: pendingInvitationError.tenantId })
      toast.error(error instanceof Error ? error.message : 'Failed to resend invitation')
    }
  }

  const handleDeletePendingInvitation = async () => {
    if (!pendingInvitationError?.tenantId) return
    
    try {
      await deletePendingInvitation(pendingInvitationError.tenantId)
      toast.success('Pending invitation deleted successfully!')
      setPendingInvitationError(null)
      // Don't close modal, let user try again with same form data
    } catch (error) {
      logger.error('Failed to delete pending invitation', error as Error, { tenantId: pendingInvitationError.tenantId })
      toast.error(error instanceof Error ? error.message : 'Failed to delete pending invitation')
    }
  }

  return (
    <>
    <BaseFormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite New Tenant"
      description="Send an invitation to a new tenant to join your property"
      icon={UserPlus}
      iconBgColor="bg-green-100"
      iconColor="text-green-600"
      maxWidth="lg"
      onSubmit={form.handleSubmit(handleSubmit)}
      submitLabel="Send Invitation"
      cancelLabel="Cancel"
      isSubmitting={isInviting}
      submitDisabled={!form.formState.isValid}
    >
      {/* Tenant Information Section */}
      <TenantInfoSection form={form} />

      {/* Property Assignment Section */}
      <PropertyAssignmentSection
        form={form}
        properties={properties}
        propertiesLoading={propertiesLoading}
        propertiesError={propertiesError}
        selectedPropertyId={selectedPropertyId}
        selectedProperty={selectedProperty}
        units={units}
        unitsLoading={unitsLoading}
        onClose={onClose}
      />

      {/* Error Handling Section */}
      <ErrorHandlingSection
        pendingInvitationError={pendingInvitationError}
        isResending={isResending}
        isDeleting={isDeleting}
        onResendInvitation={handleResendInvitation}
        onDeletePendingInvitation={handleDeletePendingInvitation}
      />
    </BaseFormModal>

    {/* Tenant Already Accepted Modal */}
    <TenantAlreadyAcceptedModal
      isOpen={!!alreadyAcceptedTenant}
      onClose={() => setAlreadyAcceptedTenant(null)}
      tenantName={alreadyAcceptedTenant?.name || ''}
      tenantEmail={alreadyAcceptedTenant?.email || ''}
    />

    {/* Upgrade Prompt Modal */}
    <UpgradePromptModal
      isOpen={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      action="Invite New Tenant"
      reason={getUpgradeReason('tenant')}
      currentPlan={userPlan?.id || 'free'}
      suggestedPlan="starter"
    />
  </>
  )
}