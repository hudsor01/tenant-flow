/**
 * Tenant Form Component
 *
 * Consolidated React 19 form component using React Hook Form directly.
 * Removed unnecessary abstractions and component splits.
 */

'use client'

import React, { useTransition, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import { useForm, useController } from 'react-hook-form'
import type { CreateTenantInput, UpdateTenantInput } from '@repo/shared'
import type { TenantFormProps } from '@/types'
import { useCreateTenant, useUpdateTenant } from '@/hooks/api/use-tenants'
import { usePostHog } from '@/hooks/use-posthog'
import {
	useBusinessEvents,
	useInteractionTracking
} from '@/lib/analytics/business-events'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/primitives'
import { Save, X, User, AlertCircle } from 'lucide-react'

// Form Field Component using direct RHF
function FormField({ 
	name, 
	control, 
	label, 
	type = 'text', 
	placeholder, 
	required = false, 
	multiline = false, 
	rows = 3,
	description 
}: {
	name: string
	control: unknown
	label: string
	type?: string
	placeholder?: string
	required?: boolean
	multiline?: boolean
	rows?: number
	description?: string
}) {
	const {
		field,
		fieldState: { error }
	} = useController({
		name,
		control,
		rules: { required: required ? `${label} is required` : false }
	})

	const fieldId = `field-${name}`

	return (
		<div className="space-y-2">
			<Label htmlFor={fieldId}>
				{label}
				{required && <span className="text-destructive ml-1">*</span>}
			</Label>
			{multiline ? (
				<Textarea
					{...field}
					id={fieldId}
					placeholder={placeholder}
					rows={rows}
					value={field.value || ''}
					className={cn(
						error && 'border-destructive focus-visible:ring-destructive'
					)}
				/>
			) : (
				<Input
					{...field}
					id={fieldId}
					type={type}
					placeholder={placeholder}
					value={field.value || ''}
					className={cn(
						error && 'border-destructive focus-visible:ring-destructive'
					)}
				/>
			)}
			{description && (
				<p className="text-muted-foreground text-sm">{description}</p>
			)}
			{error && (
				<p className="text-destructive text-sm">{error.message}</p>
			)}
		</div>
	)
}

// Section Component
function FormSection({ title, description, children }: {
	title: string
	description: string
	children: React.ReactNode
}) {
	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-medium">{title}</h3>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
			{children}
		</div>
	)
}

export function TenantForm({
	tenant,
	mode = 'create',
	onSuccess,
	onClose,
	className
}: TenantFormProps) {
	const _router = useRouter()
	const [isPending, startTransition] = useTransition()
	const isEditing = mode === 'edit' && Boolean(tenant)
	const { trackEvent } = usePostHog()
	const { trackTenantCreated, trackUserError } = useBusinessEvents()
	const { trackFormSubmission } = useInteractionTracking()

	const title = isEditing ? 'Edit Tenant' : 'Add New Tenant'
	const description = isEditing
		? 'Update tenant information and contact details'
		: 'Add a new tenant to your property management system'

	// React Query mutations with optimistic updates
	const createMutation = useCreateTenant()
	const updateMutation = useUpdateTenant()

	// React Hook Form setup - simplified to match API interface
	const form = useForm({
		defaultValues: isEditing && tenant
			? {
				name: tenant.name || '',
				email: tenant.email || '',
				phone: tenant.phone || '',
				emergencyContact: tenant.emergencyContact || '',
				notes: ''
			}
			: {
				name: '',
				email: '',
				phone: '',
				emergencyContact: '',
				notes: ''
			},
		mode: 'onChange'
	})

	const {
		control,
		handleSubmit,
		formState: { _errors, isSubmitting },
		reset
	} = form

	useEffect(() => {
		// Track form view
		trackEvent('form_viewed', {
			form_type: 'tenant',
			form_mode: mode,
			has_existing_data: !!tenant
		})
	}, [trackEvent, mode, tenant])

	// Form submission handler using React Hook Form
	const onSubmit = async (formData: unknown) => {
		// Track form submission attempt
		trackEvent('form_submitted', {
			form_type: 'tenant',
			form_mode: mode,
			has_existing_data: !!tenant,
			tenant_id: tenant?.id
		})

		startTransition(async () => {
			try {
				// Transform form data to API format
				const tenantData = {
					name: formData.name,
					email: formData.email,
					phone: formData.phone || undefined,
					emergencyContact: formData.emergencyContact || undefined,
					notes: formData.notes || undefined
				}

				if (isEditing && tenant) {
					// Update existing tenant
					const updatedTenant = await updateMutation.mutateAsync({
						id: tenant.id,
						data: tenantData
					})

					// Track successful update
					trackEvent('tenant_updated', {
						tenant_id: updatedTenant.id,
						form_type: 'tenant'
					})

					onSuccess?.(updatedTenant)
				} else {
					// Create new tenant
					const newTenant = await createMutation.mutateAsync(tenantData)

					// Track successful creation
					trackEvent('tenant_created', {
						tenant_id: newTenant.id,
						form_type: 'tenant'
					})

					// Track enhanced business event
					trackTenantCreated({
						tenant_id: newTenant.id
					})

					trackFormSubmission('tenant_form', true)
					onSuccess?.(newTenant)
				}

				// Reset form for create mode
				if (!isEditing) {
					reset()
				}
			} catch (error) {
				logger.error(
					'Form submission error:',
					error instanceof Error ? error : new Error(String(error)),
					{ component: 'tenantform' }
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
			}
		})
	}

	const handleCancel = () => {
		reset()
		onClose?.({} as React.MouseEvent)
	}

	const isLoading = isSubmitting || createMutation.isPending || updateMutation.isPending || isPending
	const mutation = isEditing ? updateMutation : createMutation

	return (
		<div className={cn('mx-auto w-full max-w-2xl', className)}>
			<Card>
				<CardContent className="p-6">
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
						{/* Form Header */}
						<div>
							<div className="mb-2 flex items-center gap-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
									<User className="text-primary h-4 w-4 dark:text-blue-400" />
								</div>
								<div>
									<h2 className="text-xl font-semibold">{title}</h2>
									<p className="text-muted-foreground text-sm">{description}</p>
								</div>
							</div>
						</div>

						{/* Global Error */}
						{mutation.error && (
							<div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
								<AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
								<p className="text-sm text-red-700 dark:text-red-300">
									{mutation.error.message || 'An error occurred. Please try again.'}
								</p>
							</div>
						)}

						{/* Basic Information Section */}
						<FormSection
							title="Basic Information"
							description="Primary tenant details and contact information"
						>
							<div className="grid grid-cols-1 gap-6">
								<FormField
									name="name"
									control={control}
									label="Full Name"
									placeholder="Enter tenant's full name"
									required
								/>

								<FormField
									name="email"
									control={control}
									label="Email Address"
									type="email"
									placeholder="tenant@example.com"
									required
									description="Used for notifications and portal access"
								/>

								<FormField
									name="phone"
									control={control}
									label="Phone Number"
									type="tel"
									placeholder="(555) 123-4567"
								/>
							</div>
						</FormSection>

						{/* Emergency Contact Section */}
						<FormSection
							title="Emergency Contact"
							description="Emergency contact information for urgent situations"
						>
							<div className="grid grid-cols-1 gap-6">
								<FormField
									name="emergencyContact"
									control={control}
									label="Emergency Contact"
									placeholder="Contact person's name and phone number"
									description="Include name, phone, and relationship (e.g., 'John Smith - 555-1234 - Father')"
								/>
							</div>
						</FormSection>

						{/* Additional Information Section */}
						<FormSection
							title="Additional Information"
							description="Optional notes and additional details"
						>
							<div className="grid grid-cols-1 gap-6">
								<FormField
									name="notes"
									control={control}
									label="Notes"
									placeholder="Any additional information about the tenant..."
									multiline
									rows={4}
									description="Optional: Special requirements, preferences, or important notes"
								/>
							</div>
						</FormSection>

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
										{isEditing ? 'Updating...' : 'Creating...'}
									</div>
								) : (
									<div className="flex items-center gap-2">
										<Save className="h-4 w-4" />
										{isEditing ? 'Update Tenant' : 'Create Tenant'}
									</div>
								)}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}

// Export types
export type { TenantFormProps, CreateTenantInput, UpdateTenantInput }
