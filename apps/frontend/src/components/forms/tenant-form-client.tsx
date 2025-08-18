/**
 * Tenant Form Client Component
 *
 * Client-side form logic with React Query integration.
 * Handles form state, validation, and mutations with optimistic updates.
 */

'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { motion } from '@/lib/framer-motion'
import { useRouter } from 'next/navigation'
import type { CreateTenantInput, UpdateTenantInput, Tenant } from '@repo/shared'
import { useCreateTenant, useUpdateTenant } from '@/hooks/api/use-tenants'
import { usePostHog } from '@/hooks/use-posthog'
import {
	useBusinessEvents,
	useInteractionTracking
} from '@/lib/analytics/business-events'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/primitives'
import { Save, X, User, AlertCircle } from 'lucide-react'
import { TenantFormFields } from './tenant-form-fields'

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

interface TenantFormClientProps {
	tenant?: Tenant
	mode: 'create' | 'edit'
	title: string
	description: string
	onSuccess?: (tenant: Tenant) => void
	onClose?: (event: React.MouseEvent) => void
	className?: string
}

export function TenantFormClient({
	tenant,
	mode,
	title,
	description,
	onSuccess,
	onClose,
	className
}: TenantFormClientProps) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const isEditing = mode === 'edit' && Boolean(tenant)
	const { trackEvent } = usePostHog()
	const { trackTenantCreated, trackUserError } = useBusinessEvents()
	const { trackFormSubmission } = useInteractionTracking()

	// React Query mutations with optimistic updates
	const createMutation = useCreateTenant()
	const updateMutation = useUpdateTenant()

	useEffect(() => {
		// Track form view
		trackEvent('form_viewed', {
			form_type: 'tenant',
			form_mode: mode,
			has_existing_data: !!tenant
		})
	}, [trackEvent, mode, tenant])

	// Form state
	const [formData, setFormData] = useState<
		CreateTenantInput | UpdateTenantInput
	>(() => {
		if (isEditing && tenant) {
			return {
				name: tenant.name || '',
				email: tenant.email || '',
				phone: tenant.phone || '',
				emergencyContact: tenant.emergencyContact || '',
				emergencyPhone: '', // Not in Tenant interface, will be part of input only
				moveInDate: '', // Not in Tenant interface, will be part of input only
				moveOutDate: isEditing ? '' : undefined, // Only for editing
				notes: '' // Not in Tenant interface, will be part of input only
			}
		}
		return {
			name: '',
			email: '',
			phone: '',
			emergencyContact: '',
			emergencyPhone: '',
			moveInDate: '',
			notes: ''
		}
	})

	const [errors, setErrors] = useState<Record<string, string>>({})

	// Form handlers
	const handleFieldChange = (field: string, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }))

		// Clear error when user starts typing
		if (errors[field]) {
			setErrors(prev => {
				const newErrors = { ...prev }
				delete newErrors[field]
				return newErrors
			})
		}
	}

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {}

		// Required fields validation
		if (!formData.name?.trim()) {
			newErrors.name = 'Name is required'
		}

		if (!formData.email?.trim()) {
			newErrors.email = 'Email is required'
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = 'Please enter a valid email address'
		}

		// Date validation
		if (
			formData.moveInDate &&
			typeof (formData as UpdateTenantInput).moveOutDate === 'string' &&
			(formData as UpdateTenantInput).moveOutDate
		) {
			const moveIn = new Date(formData.moveInDate)
			const moveOutDateString = (formData as UpdateTenantInput).moveOutDate
			
			// Ensure we have a valid string before creating Date
			if (moveOutDateString && typeof moveOutDateString === 'string') {
				const moveOut = new Date(moveOutDateString)
				
				// Check if the date is valid
				if (!isNaN(moveOut.getTime()) && !isNaN(moveIn.getTime())) {
					if (moveOut <= moveIn) {
						newErrors.moveOutDate =
							'Move-out date must be after move-in date'
					}
				} else {
					newErrors.moveOutDate = 'Please enter a valid move-out date'
				}
			}
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!validateForm()) {
			// Track form validation failure
			trackEvent('form_validation_failed', {
				form_type: 'tenant',
				form_mode: mode,
				errors: Object.keys(errors),
				error_count: Object.keys(errors).length
			})
			return
		}

		// Track form submission attempt
		trackEvent('form_submitted', {
			form_type: 'tenant',
			form_mode: mode,
			has_existing_data: !!tenant,
			tenant_id: tenant?.id
		})

		startTransition(async () => {
			try {
				if (isEditing && tenant) {
					// Update existing tenant
					const updatedTenant = await updateMutation.mutateAsync({
						id: tenant.id,
						data: formData as UpdateTenantInput
					})

					// Track successful update
					trackEvent('tenant_updated', {
						tenant_id: updatedTenant.id,
						form_type: 'tenant'
					})

					onSuccess?.(updatedTenant)
				} else {
					// Create new tenant
					const newTenant = await createMutation.mutateAsync(
						formData as CreateTenantInput
					)

					// Track successful creation
					trackEvent('tenant_created', {
						tenant_id: newTenant.id,
						form_type: 'tenant'
					})

					// Track enhanced business event
					trackTenantCreated({
						tenant_id: newTenant.id
						// Add more rich data if available in the response
					})

					trackFormSubmission('tenant_form', true)

					onSuccess?.(newTenant)
				}

				// Reset form for create mode
				if (!isEditing) {
					setFormData({
						name: '',
						email: '',
						phone: '',
						emergencyContact: '',
						emergencyPhone: '',
						moveInDate: '',
						notes: ''
					})
				}
			} catch (error) {
				logger.error(
					'Form submission error:',
					error instanceof Error ? error : new Error(String(error)),
					{ component: 'tenantformclient' }
				)

				// Track form submission error
				trackEvent('form_submission_failed', {
					form_type: 'tenant',
					form_mode: mode,
					error_message:
						error instanceof Error
							? error.message
							: 'Unknown error',
					tenant_id: tenant?.id
				})

				// Track enhanced error event
				trackFormSubmission('tenant_form', false, [
					error instanceof Error ? error.message : 'Unknown error'
				])
				trackUserError({
					error_type: 'tenant_form_submission_failed',
					error_message:
						error instanceof Error
							? error.message
							: 'Unknown error',
					page_url: window.location.href,
					user_action:
						mode === 'edit' ? 'update_tenant' : 'create_tenant'
				})

				// Error handling is done by React Query hooks
			}
		})
	}

	const handleCancel = (event?: React.MouseEvent) => {
		if (onClose && event) {
			onClose(event)
		} else {
			router.back()
		}
	}

	const isLoading =
		createMutation.isPending || updateMutation.isPending || isPending
	const mutation = isEditing ? updateMutation : createMutation

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className={cn('mx-auto w-full max-w-2xl', className)}
		>
			<Card>
				<CardContent className="p-6">
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Form Header */}
						<div>
							<div className="mb-2 flex items-center gap-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
									<User className="text-primary h-4 w-4 dark:text-blue-400" />
								</div>
								<div>
									<h2 className="text-xl font-semibold">
										{title}
									</h2>
									<p className="text-muted-foreground text-sm">
										{description}
									</p>
								</div>
							</div>
						</div>

						{/* Global Error */}
						{mutation.error && (
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
							>
								<AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
								<p className="text-sm text-red-700 dark:text-red-300">
									{mutation.error.message ||
										'An error occurred. Please try again.'}
								</p>
							</motion.div>
						)}

						{/* Form Fields */}
						<TenantFormFields
							formData={formData}
							errors={errors}
							isEditing={isEditing}
							onChange={handleFieldChange}
						/>

						{/* Form Actions */}
						<div className="flex items-center justify-end gap-3 border-t pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={handleCancel}
								disabled={isLoading}
							>
								<X className="mr-2 h-4 w-4" />
								Cancel
							</Button>

							<Button
								type="submit"
								disabled={isLoading}
								className="min-w-[120px]"
							>
								{isLoading ? (
									<div className="flex items-center gap-2">
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
										{isEditing
											? 'Updating...'
											: 'Creating...'}
									</div>
								) : (
									<div className="flex items-center gap-2">
										<Save className="h-4 w-4" />
										{isEditing
											? 'Update Tenant'
											: 'Create Tenant'}
									</div>
								)}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</motion.div>
	)
}
