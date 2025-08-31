/**
 * React 19 Tenant Form with useOptimistic + Server Actions
 * OVERWRITTEN: Native patterns only - NO React Hook Form, NO TanStack Query
 * Uses shared React 19 form components - DRY compliant
 */

'use client'

import React, { useOptimistic, startTransition } from 'react'
import { useActionState } from 'react'
import { createTenant, updateTenant } from '@/app/actions/tenants'
import type { Database, FormState } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type Tenant = Database['public']['Tables']['Tenant']['Row']
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { SuccessFeedback, ErrorFeedback, OptimisticFeedback } from '@/components/ui/feedback'
import { X , User , Save } from 'lucide-react'
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

 // React useOptimistic for optimistic updates
const [optimisticTenants, addOptimisticTenant] = useOptimistic(
tenants,
(currentTenants: Tenant[], newTenant: Partial<Tenant>) => {
if (isEditing && tenant) {
return currentTenants.map(t =>
t.id === tenant.id
? { ...t, ...newTenant }
: t
)
}
// Add new optimistic tenant
const tempTenant: Tenant = {
id: `temp-${Date.now()}`,
name: newTenant.name || 'New Tenant',
email: newTenant.email || '',
phone: newTenant.phone || null,
emergencyContact: newTenant.emergencyContact || null,
// Notes field removed - not in current schema
avatarUrl: null,
createdAt: new Date().toISOString(),
updatedAt: new Date().toISOString(),
userId: null
}
return [...currentTenants, tempTenant]
}
)

// Find optimistic item
const optimisticItem = !isEditing
? optimisticTenants.find(t => t.id.startsWith('temp-'))
: optimisticTenants.find(t => t.id === tenant?.id)

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
				// Notes field not in current Tenant schema
			}

			// Add optimistic update
			startTransition(() => addOptimisticTenant(tenantData))

			// Call server action
			let _result: Tenant
			if (isEditing && tenant) {
				_result = await updateTenant(tenant.id, formData)
			} else {
				_result = await createTenant(formData)
			}

			// Success callback
			onSuccess?.(_result)

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
	const initialFormState: FormState = { success: false }
	const [formState, formDispatch, isPending] = useActionState<FormState, FormData>(
		formAction,
		initialFormState
	)

	return (
		<div className={cn('mx-auto w-full max-w-2xl', className)}>
{/* Shared optimistic feedback */}
{optimisticItem && (
<OptimisticFeedback isEditing={isEditing} entityName="tenant" className="mb-4">
	{isEditing ? 'Updating tenant...' : 'Creating tenant...'}
</OptimisticFeedback>
)}

{/* Shared success feedback */}
{formState.success && (
<SuccessFeedback className="mb-4">
Tenant {isEditing ? 'updated' : 'created'} successfully!
</SuccessFeedback>
)}

			<Card>
				<CardContent className="p-6">
					<form action={formDispatch} className="space-y-6">
						{/* Form Header */}
						<div>
							<div className="mb-2 flex items-center gap-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-1 dark:bg-blue-9/20">
									<User className=" h-4 w-4 text-blue-6 dark:text-blue-400"  />
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
{formState.error && <ErrorFeedback>{formState.error}</ErrorFeedback>}

						{/* Basic Information Section */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<User className=" h-4 w-4 text-muted-foreground" />
								<div>
									<h3 className="text-lg font-medium">Basic Information</h3>
									<p className="text-muted-foreground text-sm">Primary tenant details and contact information</p>
								</div>
							</div>
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
										defaultValue={tenant?.phone ?? ''}
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
										defaultValue={tenant?.emergencyContact ?? ''}
										placeholder="Emergency contact name and phone"
										disabled={isPending}
									/>
								</div>

								{/* Notes field removed - not in current Tenant schema */}
							</div>
						</div>

						{/* Form Actions */}
						<div className="flex items-center justify-end gap-3 border-t pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={onClose}
								disabled={isPending}
							>
								<X className=" mr-2 h-4 w-4"  />
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
										<Save className=" h-4 w-4"  />
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
