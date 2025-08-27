/**
 * React 19 Property Form with useOptimistic + Server Actions
 * OVERWRITTEN: Native patterns only - NO React Hook Form, NO TanStack Query
 * Uses shared React 19 form components - DRY compliant
 */

'use client'

import React, { useOptimistic, startTransition } from 'react'
import { useActionState } from 'react'
import { createProperty, updateProperty } from '@/app/actions/properties'
import type { PropertyWithUnits, PropertyFormData, Database, FormState } from '@repo/shared'
 
type Property = PropertyWithUnits
type PropertyStatus = Database['public']['Enums']['PropertyStatus']
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { SuccessFeedback, ErrorFeedback, OptimisticFeedback } from '@/components/ui/feedback'

// Types for form props
interface PropertyFormProps {
	property?: Property
	properties: Property[]
	onSuccess?: (property: Property) => void
	onClose?: () => void
	className?: string
}



/**
 * Native React 19 Property Form using shared components
 */
export function PropertyForm({
	property,
	properties,
	onSuccess,
	onClose,
	className
}: PropertyFormProps) {
	const isEditing = Boolean(property)
	const title = isEditing ? 'Edit Property' : 'Create New Property'
	const description = isEditing
		? 'Update property details and information'
		: 'Add a new property to your portfolio'

	// React 19 useOptimistic for instant UI updates
	const [optimisticProperties, addOptimisticProperty] = useOptimistic(
		properties,
		(currentProperties: Property[], newProperty: Partial<Property>) => {
			if (isEditing && property) {
				// Update existing property optimistically
				return currentProperties.map(p =>
					p.id === property.id
						? { ...p, ...newProperty }
						: p
				)
			}
			// Add new property optimistically
			const tempProperty: Property = {
				// Base database fields
				id: `temp-${Date.now()}`,
				name: newProperty.name || 'New Property',
				address: newProperty.address || '',
				city: newProperty.city || '',
				state: newProperty.state || '',
				zipCode: newProperty.zipCode || '',
				propertyType: (newProperty.propertyType as Database['public']['Enums']['PropertyType']) || 'SINGLE_FAMILY',
				description: newProperty.description || null,
				imageUrl: null,
				ownerId: '',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				
				// PropertyWithUnits computed fields
				units: [],
				totalUnits: 1,
				monthlyRent: 0
			}
			return [...currentProperties, tempProperty]
		}
	)

	// Server action with form state
	async function formAction(
		prevState: FormState,
		formData: FormData
	) {
		try {
			// Extract form values using native FormData API
			const propertyData: PropertyFormData = {
				name: formData.get('name') as string,
				address: formData.get('address') as string,
				city: formData.get('city') as string,
				state: formData.get('state') as string,
				zipCode: formData.get('zipCode') as string,
				propertyType: formData.get('propertyType') as Database['public']['Enums']['PropertyType'],
				description: formData.get('description') as string,
				monthlyRent: formData.has('monthlyRent') 
					? parseFloat(formData.get('monthlyRent') as string)
					: undefined,
				totalUnits: formData.has('totalUnits')
					? parseInt(formData.get('totalUnits') as string, 10)
					: 1,
				squareFeet: formData.has('squareFeet')
					? parseInt(formData.get('squareFeet') as string, 10)
					: undefined,
				bedrooms: formData.has('bedrooms')
					? parseInt(formData.get('bedrooms') as string, 10)
					: undefined,
				bathrooms: formData.has('bathrooms')
					? parseFloat(formData.get('bathrooms') as string)
					: undefined,
				yearBuilt: formData.has('yearBuilt')
					? parseInt(formData.get('yearBuilt') as string, 10)
					: undefined,
			}

			// Add optimistic update
			// cast to Partial<Property> so the optimistic reducer accepts a partial update
			startTransition(() => addOptimisticProperty(propertyData as Partial<Property>))

			// Call server action with FormData
			let result: Property
			if (isEditing && property) {
				result = await updateProperty(property.id, formData)
			} else {
				result = await createProperty(formData)
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
						: 'Failed to save property'
			}
		}
	}

	// React 19 useActionState for form state management
	const initialFormState: FormState = { success: false }
	const [formState, formDispatch, isPending] = useActionState<FormState, FormData>(
		formAction,
		initialFormState
	)

	// Find the optimistic property if creating/updating
	const optimisticProperty = !isEditing
		? optimisticProperties.find(p => p.id.startsWith('temp-'))
		: optimisticProperties.find(p => p.id === property?.id)

	// Property type options
	const propertyTypes = [
		{ value: 'SINGLE_FAMILY', label: 'Single Family' },
		{ value: 'MULTI_FAMILY', label: 'Multi Family' },
		{ value: 'APARTMENT', label: 'Apartment' },
		{ value: 'CONDO', label: 'Condominium' },
		{ value: 'TOWNHOUSE', label: 'Townhouse' },
		{ value: 'COMMERCIAL', label: 'Commercial' }
	]

	return (
		<div className={cn('mx-auto w-full max-w-3xl', className)}>
			{/* Optimistic feedback */}
			{optimisticProperty && (
				<OptimisticFeedback 
					className="mb-4"
					isEditing={isEditing}
					entityName="property"
				>
					{isEditing ? 'Updating property...' : 'Creating property...'}
				</OptimisticFeedback>
			)}

			{/* Success feedback */}
			{formState.success && (
				<SuccessFeedback className="mb-4">
					Property {isEditing ? 'updated' : 'created'} successfully!
				</SuccessFeedback>
			)}

			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<i className="i-lucide-building inline-block h-5 w-5 text-primary"  />
						</div>
						<div>
							<CardTitle>{title}</CardTitle>
							<CardDescription className="mt-1">
								{description}
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent>
					<form action={formDispatch} className="space-y-6">
						{/* Error display */}
						{formState.error && (
							<ErrorFeedback>
								{formState.error}
							</ErrorFeedback>
						)}

						{/* Basic Information Section */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<i className="i-lucide-home h-4 w-4 text-muted-foreground" />
								<div>
									<h3 className="text-lg font-medium">Basic Information</h3>
									<p className="text-muted-foreground text-sm">Essential property details</p>
								</div>
							</div>
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="name">
										Property Name
										<span className="text-destructive ml-1">*</span>
									</Label>
									<Input
										id="name"
										name="name"
										type="text"
										defaultValue={property?.name}
										placeholder="e.g., Sunset Apartments"
										required
										disabled={isPending}
									/>
								</div>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="propertyType">
											Property Type
											<span className="text-destructive ml-1">*</span>
										</Label>
										<Select 
											name="propertyType" 
											defaultValue={property?.propertyType || 'SINGLE_FAMILY'}
											disabled={isPending}
											required
										>
											<SelectTrigger>
												<SelectValue placeholder="Select property type" />
											</SelectTrigger>
											<SelectContent>
												{propertyTypes.map(type => (
													<SelectItem key={type.value} value={type.value}>
														{type.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label htmlFor="totalUnits">
											Total Units
											<span className="text-destructive ml-1">*</span>
										</Label>
										<Input
											id="totalUnits"
											name="totalUnits"
											type="number"
											min="1"
											defaultValue={property?.totalUnits?.toString() || '1'}
											required
											disabled={isPending}
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="description">
										Description
									</Label>
									<Textarea
										id="description"
										name="description"
										rows={4}
										defaultValue={property?.description ?? ''}
										placeholder="Describe the property features, amenities, etc."
										disabled={isPending}
									/>
								</div>
							</div>
						</div>

						<Separator />

						{/* Location Section */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<i className="i-lucide-map-pin h-4 w-4 text-muted-foreground" />
								<div>
									<h3 className="text-lg font-medium">Location</h3>
									<p className="text-muted-foreground text-sm">Property address and location details</p>
								</div>
							</div>
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="address">
										Street Address
										<span className="text-destructive ml-1">*</span>
									</Label>
									<Input
										id="address"
										name="address"
										type="text"
										defaultValue={property?.address}
										placeholder="123 Main Street"
										required
										disabled={isPending}
									/>
								</div>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<div className="space-y-2">
										<Label htmlFor="city">
											City
											<span className="text-destructive ml-1">*</span>
										</Label>
										<Input
											id="city"
											name="city"
											type="text"
											defaultValue={property?.city}
											placeholder="San Francisco"
											required
											disabled={isPending}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="state">
											State
											<span className="text-destructive ml-1">*</span>
										</Label>
										<Input
											id="state"
											name="state"
											type="text"
											maxLength={2}
											defaultValue={property?.state}
											placeholder="CA"
											required
											disabled={isPending}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="zipCode">
											ZIP Code
											<span className="text-destructive ml-1">*</span>
										</Label>
										<Input
											id="zipCode"
											name="zipCode"
											type="text"
											pattern="[0-9]{5}(-[0-9]{4})?"
											defaultValue={property?.zipCode}
											placeholder="94102"
											required
											disabled={isPending}
										/>
									</div>
								</div>
							</div>
						</div>

						<Separator />

						{/* Financial Information */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<i className="i-lucide-dollar-sign h-4 w-4 text-muted-foreground" />
								<div>
									<h3 className="text-lg font-medium">Financial Information</h3>
									<p className="text-muted-foreground text-sm">Rental rates and financial details</p>
								</div>
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
										defaultValue={property?.monthlyRent || ''}
										placeholder="2500.00"
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
										defaultValue={property?.securityDeposit || ''}
										placeholder="2500.00"
										disabled={isPending}
									/>
								</div>
							</div>
						</div>

						<Separator />

						{/* Property Details */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<i className="i-lucide-ruler h-4 w-4 text-muted-foreground" />
								<div>
									<h3 className="text-lg font-medium">Property Details</h3>
									<p className="text-muted-foreground text-sm">Size and specifications</p>
								</div>
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
								<div className="space-y-2">
									<Label htmlFor="squareFeet">
										Square Feet
									</Label>
									<Input
										id="squareFeet"
										name="squareFeet"
										type="number"
										min="0"
										defaultValue={property?.squareFeet || ''}
										placeholder="1200"
										disabled={isPending}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="bedrooms">
										Bedrooms
									</Label>
									<Input
										id="bedrooms"
										name="bedrooms"
										type="number"
										min="0"
										defaultValue={property?.bedrooms || ''}
										placeholder="2"
										disabled={isPending}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="bathrooms">
										Bathrooms
									</Label>
									<Input
										id="bathrooms"
										name="bathrooms"
										type="number"
										step="0.5"
										min="0"
										defaultValue={property?.bathrooms || ''}
										placeholder="1.5"
										disabled={isPending}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="yearBuilt">
										Year Built
									</Label>
									<Input
										id="yearBuilt"
										name="yearBuilt"
										type="number"
										min="1800"
										max={new Date().getFullYear()}
										defaultValue={property?.yearBuilt || ''}
										placeholder="1990"
										disabled={isPending}
									/>
								</div>
							</div>
						</div>

						<Separator />

						{/* Amenities Section */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<i className="i-lucide-star h-4 w-4 text-muted-foreground" />
								<div>
									<h3 className="text-lg font-medium">Amenities</h3>
									<p className="text-muted-foreground text-sm">Available features and amenities</p>
								</div>
							</div>
							<div className="space-y-4">
								<div className="flex items-center space-x-2">
									<Switch
										id="hasParking"
										name="hasParking"
										defaultChecked={property?.amenities?.includes('parking') || false}
										disabled={isPending}
									/>
									<Label htmlFor="hasParking" className="cursor-pointer">
										Parking Available
									</Label>
								</div>

								<div className="flex items-center space-x-2">
									<Switch
										id="hasLaundry"
										name="hasLaundry"
										defaultChecked={property?.amenities?.includes('laundry') || false}
										disabled={isPending}
									/>
									<Label htmlFor="hasLaundry" className="cursor-pointer">
										In-unit Laundry
									</Label>
								</div>

								<div className="flex items-center space-x-2">
									<Switch
										id="petsAllowed"
										name="petsAllowed"
										defaultChecked={property?.petsAllowed || false}
										disabled={isPending}
									/>
									<Label htmlFor="petsAllowed" className="cursor-pointer">
										Pets Allowed
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
										{isEditing ? 'Update Property' : 'Create Property'}
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
