/**
 * Lease Form Component
 *
 * Optimized React 19 + Next.js 15 form component for creating and updating leases.
 * Uses React Query hooks with built-in optimistic updates and error handling.
 *
 * Architecture:
 * - LeaseForm: Lightweight server component (form structure and calculations)
 * - LeaseFormClient: Client component (form logic and interactions)
 * - LeaseFormFields: Server component (form field rendering)
 */

import React from 'react'
import { LeaseFormClient } from './lease-form-client'
import type { LeaseFormProps as BaseLeaseFormProps } from '@/types/components/forms'

// ============================================================================
// MAIN LEASE FORM (SERVER COMPONENT)
// ============================================================================

// Extend base props to add component-specific props
interface LeaseFormProps extends Omit<BaseLeaseFormProps, 'tenantId' | 'unitId'> {
	preselectedUnitId?: string
	preselectedTenantId?: string
}

/**
 * Main lease form server component
 * Handles form structure and composition
 */
export function LeaseForm({
	lease,
	preselectedUnitId,
	preselectedTenantId,
	onSuccess,
	onCancel,
	className
}: LeaseFormProps) {
	const isEditing = Boolean(lease)
	const title = isEditing ? 'Edit Lease Agreement' : 'Create New Lease'
	const description = isEditing
		? 'Update lease terms and conditions'
		: 'Create a comprehensive lease agreement for your tenant'

	return (
		<LeaseFormClient
			lease={lease}
			mode={isEditing ? 'edit' : 'create'}
			title={title}
			description={description}
			preselectedUnitId={preselectedUnitId}
			preselectedTenantId={preselectedTenantId}
			onSuccess={onSuccess}
			onCancel={onCancel}
			className={className}
		/>
	)
}
