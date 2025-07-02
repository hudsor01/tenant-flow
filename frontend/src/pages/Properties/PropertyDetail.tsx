import React from 'react';
import { useParams } from 'react-router-dom';
import { usePropertyDetailData } from '@/hooks/usePropertyDetailData';
import { usePropertyActions } from '@/hooks/usePropertyActions';
import PropertyHeaderSection from '@/components/properties/PropertyHeaderSection';
import PropertyStatsSection from '@/components/properties/PropertyStatsSection';
import PropertyTabsSection from '@/components/properties/PropertyTabsSection';
import PropertyLoadingState from '@/components/properties/PropertyLoadingState';
import PropertyErrorState from '@/components/properties/PropertyErrorState';
import PropertyFormModal from '@/components/properties/PropertyFormModal';
import UnitFormModal from '@/components/units/UnitFormModal';
import InviteTenantModal from '@/components/tenants/InviteTenantModal';
import LeaseFormModal from '@/components/leases/LeaseFormModal';

/**
 * Property detail page component
 * Displays comprehensive property information with units, tenants, and payments
 */
export default function PropertyDetail() {
  const { propertyId } = useParams<{ propertyId: string }>();
  
  // Get property data and statistics
  const { property, isLoading, error, stats, fadeInUp } = usePropertyDetailData({ propertyId });
  
  // Get all action handlers and modal states
  const {
    isEditModalOpen,
    isUnitModalOpen,
    isInviteModalOpen,
    isLeaseModalOpen,
    editingUnit,
    selectedUnitForLease,
    handleAddUnit,
    handleEditUnit,
    handleCreateLease,
    handleBackToProperties,
    handleEditProperty,
    handleInviteTenant,
    handleDelete,
    closeEditModal,
    closeUnitModal,
    closeInviteModal,
    closeLeaseModal,
    isDeleting,
  } = usePropertyActions({
    propertyId: propertyId!,
    propertyName: property?.name || '',
  });

  // Loading state
  if (isLoading) {
    return <PropertyLoadingState />;
  }

  // Error state
  if (error || !property) {
    return <PropertyErrorState onBackToProperties={handleBackToProperties} />;
  }

  return (
    <div className="space-y-6">
      <PropertyHeaderSection
        property={property}
        fadeInUp={fadeInUp}
        onBackToProperties={handleBackToProperties}
        onEditProperty={handleEditProperty}
        onInviteTenant={handleInviteTenant}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />

      <PropertyStatsSection
        stats={stats}
        fadeInUp={fadeInUp}
      />

      <PropertyTabsSection
        property={property}
        totalUnits={stats.totalUnits}
        fadeInUp={fadeInUp}
        onAddUnit={handleAddUnit}
        onEditUnit={handleEditUnit}
        onCreateLease={handleCreateLease}
        onInviteTenant={handleInviteTenant}
      />

      {/* Modals */}
      <PropertyFormModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        property={property}
        mode="edit"
      />

      <UnitFormModal
        isOpen={isUnitModalOpen}
        onClose={closeUnitModal}
        propertyId={propertyId!}
        unit={editingUnit}
      />

      <InviteTenantModal
        isOpen={isInviteModalOpen}
        onClose={closeInviteModal}
        propertyId={propertyId}
      />

      <LeaseFormModal
        isOpen={isLeaseModalOpen}
        onClose={closeLeaseModal}
        unitId={selectedUnitForLease}
      />
    </div>
  );
}