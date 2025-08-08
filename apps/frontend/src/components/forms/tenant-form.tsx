/**
 * Tenant Form Component
 * 
 * Optimized React 19 + Next.js 15 form component for creating and updating tenants.
 * Uses React Query hooks with built-in optimistic updates and error handling.
 * 
 * Architecture:
 * - TenantForm: Lightweight server component (form structure)
 * - TenantFormClient: Client component (form logic and interactions)
 * - TenantFormFields: Server component (form field rendering)
 */

import React from 'react'
import { type CreateTenantInput, type UpdateTenantInput, type Tenant } from '@repo/shared'
import { TenantFormClient } from './tenant-form-client'

// ============================================================================
// MAIN TENANT FORM (SERVER COMPONENT)
// ============================================================================

interface TenantFormProps {
  tenant?: Tenant
  mode?: 'create' | 'edit'
  onSuccess?: (tenant: Tenant) => void
  onClose?: () => void
  className?: string
}

/**
 * Main tenant form server component
 * Handles form structure and composition
 */
export function TenantForm({
  tenant,
  mode = 'create',
  onSuccess,
  onClose,
  className
}: TenantFormProps) {
  const isEditing = mode === 'edit' && Boolean(tenant)
  const title = isEditing ? 'Edit Tenant' : 'Add New Tenant'
  const description = isEditing 
    ? 'Update tenant information and contact details'
    : 'Add a new tenant to your property management system'

  return (
    <TenantFormClient
      tenant={tenant}
      mode={mode}
      title={title}
      description={description}
      onSuccess={onSuccess}
      onClose={onClose}
      className={className}
    />
  )
}

// TenantFormFields is defined in ./tenant-form-fields.tsx

// Export types for client component
export type { TenantFormProps, CreateTenantInput, UpdateTenantInput }