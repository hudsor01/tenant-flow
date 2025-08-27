/**
 * React 19 Maintenance Form with useOptimistic + Server Actions
 * OVERWRITTEN: Native patterns only - NO React Hook Form, NO TanStack Query
 * Uses shared React 19 form components - DRY compliant
 */

'use client'

import React from 'react'
import { useActionState } from 'react'
import { createMaintenanceRequest, updateMaintenanceStatus } from '@/app/actions/maintenance'
import type { MaintenanceRequest, Property, Unit } from '@repo/shared'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { 
	FormSection, 
	OptimisticFeedback, 
	SuccessFeedback, 
	ErrorFeedback,
	useOptimisticForm,
	type FormState
} from '@/components/ui/form'

// Types for form props
interface MaintenanceFormProps {
	request?: MaintenanceRequest
	requests: MaintenanceRequest[]
	properties: Property[]
	units: Unit[]
	onSuccess?: (request: MaintenanceRequest) => void
	onClose?: () => void
	className?: string
}

/**
 * Native React 19 Maintenance Form using shared components
 */
export function MaintenanceForm({
	request,
	requests,
	properties,
	units,
	onSuccess,
	onClose,
	className
}: MaintenanceFormProps) {
	const isEditing = Boolean(request)
	const title = isEditing ? 'Edit Maintenance Request' : 'Create New Request'
	const description = isEditing
		? 'Update maintenance request details and status'
		: 'Submit a new maintenance request for your property'

	// Shared optimistic form hook
	const { optimisticItem, addOptimisticUpdate } = useOptimisticForm({
		items: requests,
		isEditing,
		currentItem: request
	})

	// Server action with form state
	async function formAction(
		prevState: FormState,
		formData: FormData
	) {
		try {
			// Extract form values using native FormData API
			const requestData = {
				propertyId: formData.get('propertyId') as string,
				unitId: formData.get('unitId') as string,
				title: formData.get('title') as string,
				description: formData.get('description') as string,
				priority: formData.get('priority') as string,
				category: formData.get('category') as string,
				estimatedCost: formData.has('estimatedCost') 
					? parseFloat(formData.get('estimatedCost') as string)
					: undefined,
				preferredDate: formData.get('preferredDate') as string || undefined,
				contactPhone: formData.get('contactPhone') as string || undefined,
				allowEntry: formData.get('allowEntry') === 'on'
			}

			// Add optimistic update
			addOptimisticUpdate(requestData)

			// Call server action
			let result: MaintenanceRequest
			if (isEditing && request) {
				// For editing, we only update status via server action
				const status = formData.get('status') as string
				result = await updateMaintenanceStatus(request.id, status as any)
			} else {
				result = await createMaintenanceRequest(formData)
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
						: 'Failed to save maintenance request'
			}
		}
	}

	// React 19 useActionState for form state management
	const [formState, formDispatch, isPending] = useActionState(formAction, {})

	// Priority levels
	const priorityLevels = [
		{ value: 'LOW', label: 'Low Priority', color: 'text-green-600' },
		{ value: 'MEDIUM', label: 'Medium Priority', color: 'text-yellow-600' },
		{ value: 'HIGH', label: 'High Priority', color: 'text-orange-600' },
		{ value: 'EMERGENCY', label: 'Emergency', color: 'text-red-600' }
	]

	// Status options for editing
	const statusOptions = [
		{ value: 'OPEN', label: 'Open' },
		{ value: 'IN_PROGRESS', label: 'In Progress' },
		{ value: 'COMPLETED', label: 'Completed' },
		{ value: 'CANCELLED', label: 'Cancelled' }
	]

	return (
		<div className={cn('mx-auto w-full max-w-2xl', className)}>
			{/* Shared optimistic feedback */}
			<OptimisticFeedback
				isVisible={Boolean(optimisticItem)}
				isEditing={isEditing}
				entityName="request"
			/>

			{/* Shared success feedback */}
			<SuccessFeedback
				isVisible={Boolean(formState.success)}
				isEditing={isEditing}
				entityName="Request"
			/>

			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/20">
							<i className="i-lucide-wrench inline-block h-5 w-5 text-primary dark:text-orange-400"  />
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
						{/* Shared error display */}
						<ErrorFeedback error={formState.error} />

						{/* Property & Unit Selection */}
						{!isEditing && (
							<FormSection
								title="Location"
								description="Select the property and unit for this request"
							>
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="propertyId">
											Property
											<span className="text-destructive ml-1">*</span>
										</Label>
										<Select 
											name="propertyId" 
											defaultValue={request?.propertyId}
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
											Unit
											<span className="text-destructive ml-1">*</span>
										</Label>
										<Select 
											name="unitId" 
											defaultValue={request?.unitId}
											disabled={isPending}
											required
										>
											<SelectTrigger>
												<SelectValue placeholder="Select a unit" />
											</SelectTrigger>
											<SelectContent>
												{units.map(unit => (
													<SelectItem key={unit.id} value={unit.id}>
														{unit.unitNumber}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
							</FormSection>
						)}

						{/* Request Details Section */}
						<FormSection
							title="Request Details"
							description="Describe the maintenance issue and its priority"
						>
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="title">
										Title
										<span className="text-destructive ml-1">*</span>
									</Label>
									<Input
										id="title"
										name="title"
										type="text"
										defaultValue={request?.title}
										placeholder="e.g., Leaky faucet in kitchen"
										required
										disabled={isPending}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="description">
										Description
										<span className="text-destructive ml-1">*</span>
									</Label>
									<Textarea
										id="description"
										name="description"
										rows={4}
										defaultValue={request?.description}
										placeholder="Provide detailed description of the issue..."
										required
										disabled={isPending}
									/>
								</div>

								<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="priority">
											Priority
											<span className="text-destructive ml-1">*</span>
										</Label>
										<Select 
											name="priority" 
											defaultValue={request?.priority || 'MEDIUM'}
											disabled={isPending}
											required
										>
											<SelectTrigger>
												<SelectValue placeholder="Select priority" />
											</SelectTrigger>
											<SelectContent>
												{priorityLevels.map(priority => (
													<SelectItem key={priority.value} value={priority.value}>
														<span className={priority.color}>
															{priority.label}
														</span>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label htmlFor="category">
											Category
											<span className="text-destructive ml-1">*</span>
										</Label>
										<Select 
											name="category" 
											defaultValue={request?.category || 'GENERAL'}
											disabled={isPending}
											required
										>
											<SelectTrigger>
												<SelectValue placeholder="Select category" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="PLUMBING">Plumbing</SelectItem>
												<SelectItem value="ELECTRICAL">Electrical</SelectItem>
												<SelectItem value="HVAC">HVAC</SelectItem>
												<SelectItem value="APPLIANCES">Appliances</SelectItem>
												<SelectItem value="GENERAL">General</SelectItem>
												<SelectItem value="OTHER">Other</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</div>
						</FormSection>

						{/* Status Update Section (Edit Mode) */}
						{isEditing && (
							<FormSection
								title="Status Update"
								description="Update the current status of this request"
							>
								<div className="space-y-2">
									<Label htmlFor="status">
										Status
										<span className="text-destructive ml-1">*</span>
									</Label>
									<Select 
										name="status" 
										defaultValue={request?.status}
										disabled={isPending}
										required
									>
										<SelectTrigger>
											<SelectValue placeholder="Select status" />
										</SelectTrigger>
										<SelectContent>
											{statusOptions.map(status => (
												<SelectItem key={status.value} value={status.value}>
													{status.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</FormSection>
						)}

						{/* Additional Information Section */}
						<FormSection
							title="Additional Information"
							description="Optional scheduling and cost information"
						>
							<div className="space-y-4">
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="preferredDate">
											<i className="i-lucide-calendar inline-block inline h-4 w-4 mr-1"  />
											Preferred Date
										</Label>
										<Input
											id="preferredDate"
											name="preferredDate"
											type="date"
											defaultValue={request?.preferredDate}
											disabled={isPending}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="estimatedCost">
											<i className="i-lucide-dollar-sign inline-block inline h-4 w-4 mr-1"  />
											Estimated Cost
										</Label>
										<Input
											id="estimatedCost"
											name="estimatedCost"
											type="number"
											step="0.01"
											min="0"
											defaultValue={request?.estimatedCost || ''}
											placeholder="0.00"
											disabled={isPending}
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="contactPhone">
										Contact Phone
									</Label>
									<Input
										id="contactPhone"
										name="contactPhone"
										type="tel"
										defaultValue={request?.contactPhone || ''}
										placeholder="(555) 123-4567"
										disabled={isPending}
									/>
								</div>

								<div className="flex items-center space-x-2">
									<Switch
										id="allowEntry"
										name="allowEntry"
										defaultChecked={request?.allowEntry || false}
										disabled={isPending}
									/>
									<Label htmlFor="allowEntry" className="cursor-pointer">
										Allow entry when not present
									</Label>
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
										{isEditing ? 'Update Request' : 'Create Request'}
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