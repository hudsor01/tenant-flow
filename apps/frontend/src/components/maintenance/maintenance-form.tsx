/**
 * React 19 Maintenance Form with useOptimistic + Server Actions
 * OVERWRITTEN: Native patterns only - NO React Hook Form, NO TanStack Query
 * Uses shared React 19 form components - DRY compliant
 */

'use client'

import React from 'react'
import { useActionState } from 'react'
import { createMaintenanceRequest, updateMaintenanceStatus } from '@/app/actions/maintenance'
import type { Database } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type MaintenanceRequest = Database['public']['Tables']['MaintenanceRequest']['Row']
type Property = Database['public']['Tables']['Property']['Row']
type Unit = Database['public']['Tables']['Unit']['Row']
type MaintenanceStatus = Database['public']['Enums']['RequestStatus']
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
// Form state type - simple, no abstractions
type FormState = {
	success: boolean
	error?: string
	message?: string
}

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
	requests: _requests,
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

	// Simple optimistic state - no abstractions, using React 19 native
	const [optimisticItem, addOptimistic] = React.useOptimistic(
		request,
		(state, newRequest: MaintenanceRequest) => newRequest
	)

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
				status: 'OPEN',
				estimatedCost: formData.has('estimatedCost') 
					? parseFloat(formData.get('estimatedCost') as string)
					: undefined,
				preferredDate: formData.get('preferredDate') as string || undefined,
				contactPhone: formData.get('contactPhone') as string || undefined,
				allowEntry: formData.get('allowEntry') === 'on',
				tenantId: '',  // Will be set by server
				id: '',  // Will be set by server
				createdAt: '',  // Will be set by server
				updatedAt: ''  // Will be set by server
			}

			// Add optimistic update
			addOptimistic(requestData as MaintenanceRequest)

			// Call server action
			let result: MaintenanceRequest
			if (isEditing && request) {
				// For editing, we only update status via server action
				const status = formData.get('status') as string
				result = await updateMaintenanceStatus(request.id, status as MaintenanceStatus)
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
	const [formState, formDispatch, isPending] = useActionState(formAction, { success: false })

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
			{/* Simple optimistic feedback - using UnoCSS classes */}
			{optimisticItem && (
				<div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded">
					{isEditing ? 'Updating' : 'Creating'} request...
				</div>
			)}

			{/* Simple success feedback */}
			{formState.success && (
				<div className="mb-4 p-4 bg-green-50 text-green-800 rounded">
					Request {isEditing ? 'updated' : 'created'} successfully!
				</div>
			)}

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
						{/* Simple error display - UnoCSS classes */}
						{formState.error && (
							<div className="mb-4 p-4 bg-red-50 text-red-800 rounded">
								{formState.error}
							</div>
						)}

						{/* Property & Unit Selection */}
						{!isEditing && (
							<div className="space-y-2">
								<h3 className="text-lg font-semibold">Location</h3>
								<p className="text-sm text-muted-foreground">Select the property and unit for this request</p>
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
														{unit.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
							</div>
						)}

						{/* Request Details Section */}
						<div className="space-y-2">
							<h3 className="text-lg font-semibold">Request Details</h3>
							<p className="text-sm text-muted-foreground">Describe the maintenance issue and its priority</p>
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
											defaultValue={'GENERAL'}
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
						</div>

						{/* Status Update Section (Edit Mode) */}
						{isEditing && (
							<div className="space-y-2">
								<h3 className="text-lg font-semibold">Status Update</h3>
								<p className="text-sm text-muted-foreground">Update the current status of this request</p>
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
							</div>
						)}

						{/* Additional Information Section */}
						<div className="space-y-2">
							<h3 className="text-lg font-semibold">Additional Information</h3>
							<p className="text-sm text-muted-foreground">Optional scheduling and cost information</p>
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
											defaultValue={request?.scheduledDate}
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
										defaultValue={''}
										placeholder="(555) 123-4567"
										disabled={isPending}
									/>
								</div>

								<div className="flex items-center space-x-2">
									<Switch
										id="allowEntry"
										name="allowEntry"
										defaultChecked={false}
										disabled={isPending}
									/>
									<Label htmlFor="allowEntry" className="cursor-pointer">
										Allow entry when not present
									</Label>
								</div>
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