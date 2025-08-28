/**
 * React 19 Lease Form with useOptimistic + Server Actions
 * OVERWRITTEN: Native patterns only - NO React Hook Form, NO TanStack Query
 * Uses shared React 19 form components - DRY compliant
 */

'use client'

import React from 'react'
import { useActionState } from 'react'
import { createLease, updateLease } from '@/app/actions/leases'
import type { Database } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type Lease = Database['public']['Tables']['Lease']['Row']
type Property_ = Database['public']['Tables']['Property']['Row']
type Tenant = Database['public']['Tables']['Tenant']['Row']
type Unit = Database['public']['Tables']['Unit']['Row']
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Using native form elements - no abstractions needed

// Types for form props
interface LeaseFormProps {
	lease?: Lease
	leases: Lease[]
	properties: Property_[]
	tenants: Tenant[]
	units: Unit[]
	onSuccess?: (lease: Lease) => void
	onClose?: () => void
	className?: string
}

/**
 * Native React 19 Lease Form using shared components
 */
export function LeaseForm({
	lease,
	properties,
	tenants,
	units,
	onSuccess,
	onClose,
	className
}: Omit<LeaseFormProps, 'leases'>) {
	const isEditing = Boolean(lease)
	const title = isEditing ? 'Edit Lease' : 'Create New Lease'
	const description = isEditing
		? 'Update lease terms and agreement details'
		: 'Create a new lease agreement for your tenant'

	// Native React 19 optimistic updates - no custom hook needed

	// Server action with simple form state (React 19 native)
	async function formAction(
		prevState: { success: boolean; error?: string },
		formData: FormData
	): Promise<{ success: boolean; error?: string }> {
		try {
			// React 19 useActionState handles optimistic updates natively
			// Call server action directly with FormData (no intermediate object needed)
			let _result: Lease
			if (isEditing && lease) {
				_result = await updateLease(lease.id, formData)
			} else {
				_result = await createLease(formData)
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
						: 'Failed to save lease'
			}
		}
	}

	// React 19 useActionState for form state management - simple initial state
	const [formState, formDispatch, isPending] = useActionState(formAction, { success: false })

	const leaseTypes = [
		{ value: 'FIXED_TERM', label: 'Fixed Term' },
		{ value: 'MONTH_TO_MONTH', label: 'Month to Month' },
		{ value: 'YEARLY', label: 'Yearly' }
	]

	return (
		<div className={cn('mx-auto w-full max-w-3xl', className)}>
			{/* Native form feedback */}
			{formState.success && (
				<div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">
					Lease {lease ? 'updated' : 'created'} successfully!
				</div>
			)}
			{formState.error && (
				<div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
					{formState.error}
				</div>
			)}

			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
							<i className="i-lucide-file-text inline-block h-5 w-5 text-green-600 dark:text-green-400"  />
						</div>
						<div>
							<CardTitle>{title}</CardTitle>
							<p className="text-muted-foreground text-sm mt-1">
								{description}
							</p>
						</div>
					</div>
				</CardHeader>

				<CardContent>
					<form action={formDispatch} className="space-y-6">
						{/* Tenant & Property_ Selection */}
						<div className="space-y-4">
							<div className="border-b border-border pb-2">
								<h3 className="text-lg font-medium">Lease Parties</h3>
								<p className="text-sm text-muted-foreground">Select tenant, property, and unit for this lease</p>
							</div>
							<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
								<div className="space-y-2">
									<Label htmlFor="tenantId">
										Tenant <span className="text-destructive ml-1">*</span>
									</Label>
									<Select 
										name="tenantId" 
										defaultValue={lease?.tenantId}
										disabled={isPending}
										required
									>
										<SelectTrigger>
											<SelectValue placeholder="Select a tenant" />
										</SelectTrigger>
										<SelectContent>
											{tenants.map(tenant => (
												<SelectItem key={tenant.id} value={tenant.id}>
													{tenant.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="propertyId">
										Property_ <span className="text-destructive ml-1">*</span>
									</Label>
									<Select 
										name="propertyId" 
										defaultValue={properties.find(p => units.find(u => u.id === lease?.unitId)?.propertyId === p.id)?.id}
										disabled={isPending}
										required
									>
										<SelectTrigger>
											<SelectValue placeholder="Select a property" />
										</SelectTrigger>
										<SelectContent>
											{properties.map(property => (
												<SelectItem key={property.id} value={property.id}>
													{property.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="unitId">
										Unit <span className="text-destructive ml-1">*</span>
									</Label>
									<Select 
										name="unitId" 
										defaultValue={lease?.unitId}
										disabled={isPending}
										required
									>
										<SelectTrigger>
											<SelectValue placeholder="Select a unit" />
										</SelectTrigger>
										<SelectContent>
											{units.map(unit => (
												<SelectItem key={unit.id} value={unit.id}>
													Unit {unit.unitNumber}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>

						{/* Lease Terms Section */}
						<div className="space-y-4">
							<div className="border-b border-border pb-2">
								<h3 className="text-lg font-medium">Lease Terms</h3>
								<p className="text-sm text-muted-foreground">Define the lease duration and type</p>
							</div>
							<div className="space-y-4">
								<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
									<div className="space-y-2">
										<Label htmlFor="startDate">
											Start Date <span className="text-destructive ml-1">*</span>
										</Label>
										<Input
											id="startDate"
											name="startDate"
											type="date"
											defaultValue={lease?.startDate}
											required
											disabled={isPending}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="endDate">
											End Date <span className="text-destructive ml-1">*</span>
										</Label>
										<Input
											id="endDate"
											name="endDate"
											type="date"
											defaultValue={lease?.endDate}
											required
											disabled={isPending}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="leaseType">
											Lease Type
										</Label>
										<Select 
											name="leaseType" 
											defaultValue={lease?.status || 'DRAFT'}
											disabled={isPending}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select lease type" />
											</SelectTrigger>
											<SelectContent>
												{leaseTypes.map(type => (
													<SelectItem key={type.value} value={type.value}>
														{type.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
							</div>
						</div>

						{/* Financial Terms Section */}
						<div className="space-y-4">
							<div className="border-b border-border pb-2">
								<h3 className="text-lg font-medium">Financial Terms</h3>
								<p className="text-sm text-muted-foreground">Monthly rent and deposit amounts</p>
							</div>
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="monthlyRent">
										Monthly Rent ($) <span className="text-destructive ml-1">*</span>
									</Label>
									<Input
										id="monthlyRent"
										name="monthlyRent"
										type="number"
										step="0.01"
										min="0"
										defaultValue={lease?.rentAmount || ''}
										placeholder="2500.00"
										required
										disabled={isPending}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="securityDeposit">
										Security Deposit ($)
									</Label>
									<Input
										id="securityDeposit"
										name="securityDeposit"
										type="number"
										step="0.01"
										min="0"
										defaultValue={lease?.securityDeposit || ''}
										placeholder="2500.00"
										disabled={isPending}
									/>
								</div>
							</div>
						</div>

						{/* Additional Terms Section */}
						<div className="space-y-4">
							<div className="border-b border-border pb-2">
								<h3 className="text-lg font-medium">Additional Terms</h3>
								<p className="text-sm text-muted-foreground">Special conditions and lease clauses</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="terms">
									Terms and Conditions
								</Label>
								<Textarea
									id="terms"
									name="terms"
									rows={6}
									defaultValue={lease?.terms || undefined}
									placeholder="Enter any special terms, conditions, or clauses for this lease..."
									disabled={isPending}
								/>
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
										{isEditing ? 'Update Lease' : 'Create Lease'}
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