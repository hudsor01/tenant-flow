/**
 * React 19 Tenant Form with useOptimistic + Server Actions
 * OVERWRITTEN: Native patterns only - NO React Hook Form, NO TanStack Query
 * Uses shared React 19 form components - DRY compliant
 */

'use client'

import React from 'react'
import { useActionState } from 'react'
import { createTenant, updateTenant } from '@/app/actions/tenants'
import type { Tenant } from '@repo/shared'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { 
	FormSection, 
	OptimisticFeedback, 
	SuccessFeedback, 
	ErrorFeedback,
	useOptimisticForm,
	type FormState
} from '@/components/ui/form'

// Types for form props
interface TenantFormProps {
	tenant?: Tenant
	tenants: Tenant[]
	onSuccess?: (tenant: Tenant) => void
	onClose?: () => void
	className?: string
}

/**
 * Native React 19 Tenant Form using shared components:
 * - FormSection (shared)
 * - OptimisticFeedback (shared)
 * - SuccessFeedback (shared)
 * - ErrorFeedback (shared)
 * - useOptimisticForm hook (shared)
 */
export function TenantForm({
	tenant,
	tenants,
	onSuccess,
	onClose,
	className
}: TenantFormProps) {
	const isEditing = Boolean(tenant)
	const title = isEditing ? 'Edit Tenant' : 'Add New Tenant'
	const description = isEditing
		? 'Update tenant information and contact details'
		: 'Add a new tenant to your property management system'

	// Shared optimistic form hook
	const { optimisticItem, addOptimisticUpdate } = useOptimisticForm({
		items: tenants,
		isEditing,
		currentItem: tenant
	})

	// Server action with form state
	async function formAction(
		prevState: FormState,
		formData: FormData
	) {
		try {
			// Extract form values using native FormData API
			const tenantData = {
				name: formData.get('name') as string,
				email: formData.get('email') as string,
				phone: (formData.get('phone') as string) || undefined,
				emergencyContact: (formData.get('emergencyContact') as string) || undefined,
				notes: (formData.get('notes') as string) || undefined
			}

			// Add optimistic update
			addOptimisticUpdate(tenantData)

			// Call server action
			let result: Tenant
			if (isEditing && tenant) {
				result = await updateTenant(tenant.id, formData)
			} else {
				result = await createTenant(formData)
			}

			// Success callback
			onSuccess?.(result)

			return { success: true }
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to save tenant'
			}
		}
	}

	// React 19 useActionState for form state management
	const [formState, formDispatch, isPending] = useActionState(formAction, {})

	return (
		<div className={cn('mx-auto w-full max-w-2xl', className)}>
			{/* Shared optimistic feedback */}
			<OptimisticFeedback
				isVisible={Boolean(optimisticItem)}
				isEditing={isEditing}
				entityName="tenant"
			/>

			{/* Shared success feedback */}
			<SuccessFeedback
				isVisible={Boolean(formState.success)}
				isEditing={isEditing}
				entityName="Tenant"
			/>

			<Card>
				<CardContent className="p-6">
					<form action={formDispatch} className="space-y-6">
						{/* Form Header */}
						<div>
							<div className="mb-2 flex items-center gap-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
									<i className="i-lucide-user inline-block text-primary h-4 w-4 dark:text-blue-400"  />
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

						{/* Shared error display */}
						<ErrorFeedback error={formState.error} />

						{/* Basic Information Section - using shared FormSection */}
						<FormSection
							title="Basic Information"
							description="Primary tenant details and contact information"
						>
							<div className="grid grid-cols-1 gap-6">
								<div className="space-y-2">
									<Label htmlFor="name">
										Full Name
										<span className="text-destructive ml-1">*</span>
									</Label>
									<Input
										id="name"
										name="name"
										type="text"
										defaultValue={tenant?.name}
										placeholder="Enter tenant's full name"
										required
										disabled={isPending}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="email">
										Email Address
										<span className="text-destructive ml-1">*</span>
									</Label>
									<Input
										id="email"
										name="email"
										type="email"
										defaultValue={tenant?.email}
										placeholder="tenant@example.com"
										required
										disabled={isPending}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="phone">Phone Number</Label>
									<Input
										id="phone"
										name="phone"
										type="tel"
										defaultValue={tenant?.phone}
										placeholder="(555) 123-4567"
										disabled={isPending}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="emergencyContact">
										Emergency Contact
									</Label>
									<Input
										id="emergencyContact"
										name="emergencyContact"
										type="text"
										defaultValue={tenant?.emergencyContact}
										placeholder="Emergency contact name and phone"
										disabled={isPending}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="notes">Notes</Label>
									<Textarea
										id="notes"
										name="notes"
										rows={4}
										defaultValue={tenant?.notes}
										placeholder="Additional notes about tenant..."
										disabled={isPending}
									/>
								</div>
							</div>
						</FormSection>

						{/* Form Actions */}
						<div className="flex items-center justify-end gap-3 border-t pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={onClose}
								disabled={isPending}
							>
								<i className="i-lucide-x inline-block mr-2 h-4 w-4"  />
								Cancel
							</Button>

							<Button
								type="submit"
								disabled={isPending}
								className="min-w-[120px]"
							>
								{isPending ? (
									<div className="flex items-center gap-2">
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
										{isEditing ? 'Updating...' : 'Creating...'}
									</div>
								) : (
									<div className="flex items-center gap-2">
										<i className="i-lucide-save inline-block h-4 w-4"  />
										{isEditing ? 'Update Tenant' : 'Add Tenant'}
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