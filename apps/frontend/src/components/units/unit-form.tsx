/**
 * React 19 Unit Form with useOptimistic + Server Actions
 * OVERWRITTEN: Native patterns only - NO React Hook Form, NO TanStack Query
 * Uses shared React 19 form components - DRY compliant
 */

'use client'

import React from 'react'
import { useActionState } from 'react'
import { createUnit, updateUnit } from '@/app/actions/units'
import type { Unit, Property } from '@repo/shared'
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
interface UnitFormProps {
	unit?: Unit
	units: Unit[]
	properties: Property[]
	onSuccess?: (unit: Unit) => void
	onClose?: () => void
	className?: string
}

/**
 * Native React 19 Unit Form using shared components
 */
export function UnitForm({
	unit,
	units,
	properties,
	onSuccess,
	onClose,
	className
}: UnitFormProps) {
	const isEditing = Boolean(unit)
	const title = isEditing ? 'Edit Unit' : 'Create New Unit'
	const description = isEditing
		? 'Update unit details and specifications'
		: 'Add a new unit to your property'

	// Shared optimistic form hook
	const { optimisticItem, addOptimisticUpdate } = useOptimisticForm({
		items: units,
		isEditing,
		currentItem: unit
	})

	// Server action with form state
	async function formAction(
		prevState: FormState,
		formData: FormData
	) {
		try {
			// Extract form values using native FormData API
			const unitData = {
				propertyId: formData.get('propertyId') as string,
				unitNumber: formData.get('unitNumber') as string,
				unitType: formData.get('unitType') as string || 'STUDIO',
				squareFeet: formData.has('squareFeet') 
					? parseInt(formData.get('squareFeet') as string, 10)
					: undefined,
				bedrooms: formData.has('bedrooms')
					? parseInt(formData.get('bedrooms') as string, 10)
					: undefined,
				bathrooms: formData.has('bathrooms')
					? parseFloat(formData.get('bathrooms') as string)
					: undefined,
				monthlyRent: formData.has('monthlyRent')
					? parseFloat(formData.get('monthlyRent') as string)
					: undefined,
				description: formData.get('description') as string || undefined,
				isOccupied: formData.get('isOccupied') === 'on'
			}

			// Add optimistic update
			addOptimisticUpdate(unitData)

			// Call server action
			let result: Unit
			if (isEditing && unit) {
				result = await updateUnit(unit.id, formData)
			} else {
				result = await createUnit(formData)
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
						: 'Failed to save unit'
			}
		}
	}

	// React 19 useActionState for form state management
	const [formState, formDispatch, isPending] = useActionState(formAction, {})

	const unitTypes = [
		{ value: 'STUDIO', label: 'Studio' },
		{ value: 'ONE_BEDROOM', label: '1 Bedroom' },
		{ value: 'TWO_BEDROOM', label: '2 Bedroom' },
		{ value: 'THREE_BEDROOM', label: '3 Bedroom' },
		{ value: 'FOUR_BEDROOM', label: '4+ Bedroom' }
	]

	return (
		<div className={cn('mx-auto w-full max-w-3xl', className)}>
			{/* Shared optimistic feedback */}
			<OptimisticFeedback
				isVisible={Boolean(optimisticItem)}
				isEditing={isEditing}
				entityName="unit"
			/>

			{/* Shared success feedback */}
			<SuccessFeedback
				isVisible={Boolean(formState.success)}
				isEditing={isEditing}
				entityName="Unit"
			/>

			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
							<i className="i-lucide-home inline-block h-5 w-5 text-blue-600 dark:text-blue-400"  />
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

						{/* Basic Information Section */}
						<FormSection
							title="Basic Information"
							description="Essential unit details and identification"
						>
							<div className="space-y-4">
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="propertyId">
											Property <span className="text-destructive ml-1">*</span>
										</Label>
										<Select 
											name="propertyId" 
											defaultValue={unit?.propertyId}
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
										<Label htmlFor="unitNumber">
											Unit Number <span className="text-destructive ml-1">*</span>
										</Label>
										<Input
											id="unitNumber"
											name="unitNumber"
											type="text"
											defaultValue={unit?.unitNumber}
											placeholder="e.g., 101, A1, Unit 1"
											required
											disabled={isPending}
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="unitType">
										Unit Type
									</Label>
									<Select 
										name="unitType" 
										defaultValue={unit?.unitType || 'STUDIO'}
										disabled={isPending}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select unit type" />
										</SelectTrigger>
										<SelectContent>
											{unitTypes.map(type => (
												<SelectItem key={type.value} value={type.value}>
													{type.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="description">
										Description
									</Label>
									<Textarea
										id="description"
										name="description"
										rows={3}
										defaultValue={unit?.description}
										placeholder="Unit features, condition, notes..."
										disabled={isPending}
									/>
								</div>
							</div>
						</FormSection>

						{/* Unit Specifications Section */}
						<FormSection
							title="Unit Specifications"
							description="Size and room details"
							icon={Square}
						>
							<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
								<div className="space-y-2">
									<Label htmlFor="squareFeet">
										<i className="i-lucide-square inline-block inline h-4 w-4 mr-1"  />
										Square Feet
									</Label>
									<Input
										id="squareFeet"
										name="squareFeet"
										type="number"
										min="0"
										defaultValue={unit?.squareFeet || ''}
										placeholder="800"
										disabled={isPending}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="bedrooms">
										<i className="i-lucide-bed inline-block inline h-4 w-4 mr-1"  />
										Bedrooms
									</Label>
									<Input
										id="bedrooms"
										name="bedrooms"
										type="number"
										min="0"
										max="10"
										defaultValue={unit?.bedrooms || ''}
										placeholder="2"
										disabled={isPending}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="bathrooms">
										<i className="i-lucide-bath inline-block inline h-4 w-4 mr-1"  />
										Bathrooms
									</Label>
									<Input
										id="bathrooms"
										name="bathrooms"
										type="number"
										step="0.5"
										min="0"
										max="10"
										defaultValue={unit?.bathrooms || ''}
										placeholder="1.5"
										disabled={isPending}
									/>
								</div>
							</div>
						</FormSection>

						{/* Financial Information Section */}
						<FormSection
							title="Financial Information"
							description="Rental rate and financial details"
						>
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="monthlyRent">
										Monthly Rent ($)
									</Label>
									<Input
										id="monthlyRent"
										name="monthlyRent"
										type="number"
										step="0.01"
										min="0"
										defaultValue={unit?.monthlyRent || ''}
										placeholder="1250.00"
										disabled={isPending}
									/>
								</div>

								<div className="flex items-center space-x-2">
									<Switch
										id="isOccupied"
										name="isOccupied"
										defaultChecked={unit?.isOccupied || false}
										disabled={isPending}
									/>
									<Label htmlFor="isOccupied" className="cursor-pointer">
										Currently Occupied
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
										{isEditing ? 'Update Unit' : 'Create Unit'}
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