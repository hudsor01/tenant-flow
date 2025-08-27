/**
 * React Hook Form Unit Form extending base form components
 * Uses established ui/form.tsx pattern for consistency
 */

'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUnit, updateUnit } from '@/app/actions/units'
import type { 
	Unit, 
	Property
} from '@repo/shared'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormSection
} from '@/components/ui/form'
import { toast } from 'sonner'

// Simple form schema without transformations for React Hook Form compatibility
const unitFormSchema = z.object({
	propertyId: z.string().min(1, 'Property is required'),
	unitNumber: z.string().min(1, 'Unit number is required'),
	bedrooms: z.string().optional(),
	bathrooms: z.string().optional(),
	squareFootage: z.string().optional(),
	rent: z.string().optional(),
	deposit: z.string().optional(),
	description: z.string().optional(),
	tenantId: z.string().optional()
})

type UnitFormData = z.infer<typeof unitFormSchema>

interface UnitFormProps {
	unit?: Unit
	properties: Property[]
	onSuccess?: (unit: Unit) => void
	onClose?: () => void
	className?: string
}

export function UnitForm({
	unit,
	properties,
	onSuccess,
	onClose,
	className
}: UnitFormProps) {
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [submitError, setSubmitError] = React.useState<string>()
	const [submitSuccess, setSubmitSuccess] = React.useState(false)

	const isEditing = Boolean(unit)
	const title = isEditing ? 'Edit Unit' : 'Create New Unit'
	const description = isEditing
		? 'Update unit details and specifications'
		: 'Add a new unit to your property'

	// Initialize form with React Hook Form
	const form = useForm<UnitFormData>({  
		resolver: zodResolver(unitFormSchema),
		defaultValues: {
			propertyId: unit?.propertyId || '',
			unitNumber: unit?.unitNumber || '',
			bedrooms: unit?.bedrooms?.toString() || '',
			bathrooms: unit?.bathrooms?.toString() || '',
			rent: unit?.rent?.toString() || '',
			squareFootage: unit?.squareFeet?.toString() || '',
			description: '', // Description not in current Unit type 
			tenantId: '' // New units start unassigned
		}
	})

	async function onSubmit(data: UnitFormData) {
		try {
			setIsSubmitting(true)
			setSubmitError(undefined)

			// Create FormData for server action
			const formData = new FormData()
			Object.entries(data).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					formData.append(key, value.toString())
				}
			})

			// Call appropriate server action
			let result: Unit
			if (isEditing && unit) {
				result = await updateUnit(unit.id, formData)
				toast.success('Unit updated successfully!')
			} else {
				result = await createUnit(formData)
				toast.success('Unit created successfully!')
			}

			setSubmitSuccess(true)
			onSuccess?.(result)

		} catch (error) {
			const errorMessage = error instanceof Error 
				? error.message 
				: 'Failed to save unit'
			setSubmitError(errorMessage)
			toast.error(errorMessage)
		} finally {
			setIsSubmitting(false)
		}
	}

	// Unit status is managed server-side - set to VACANT by default

	return (
		<div className={cn('mx-auto w-full max-w-3xl', className)}>
			{/* Success feedback */}
			{submitSuccess && (
				<div className="mb-4 rounded-md bg-green-50 border border-green-200 p-4">
					<div className="flex">
						<i className="i-lucide-check-circle inline-block h-5 w-5 text-green-600" />
						<div className="ml-3">
							<p className="text-sm font-medium text-green-800">
								Unit {isEditing ? 'updated' : 'created'} successfully!
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Error feedback */}
			{submitError && (
				<div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
					<div className="flex">
						<i className="i-lucide-alert-circle inline-block h-5 w-5 text-red-600" />
						<div className="ml-3">
							<p className="text-sm font-medium text-red-800">
								{submitError}
							</p>
						</div>
					</div>
				</div>
			)}

			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<i className="i-lucide-home inline-block h-5 w-5 text-primary" />
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
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
							
							{/* Basic Information Section */}
							<FormSection className="space-y-4">
								<div>
									<h3 className="text-lg font-medium">Basic Information</h3>
									<p className="text-muted-foreground text-sm">Essential unit details and identification</p>
								</div>
								
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
									<FormField
										control={form.control}
										name="propertyId"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													Property <span className="text-destructive ml-1">*</span>
												</FormLabel>
												<Select 
													onValueChange={field.onChange} 
													defaultValue={field.value}
													disabled={isSubmitting}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Select a property" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{properties.map(property => (
															<SelectItem key={property.id} value={property.id}>
																{property.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="unitNumber"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													Unit Number <span className="text-destructive ml-1">*</span>
												</FormLabel>
												<FormControl>
													<Input
														placeholder="e.g., 101, A1, Unit 1"
														disabled={isSubmitting}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Description</FormLabel>
											<FormControl>
												<Textarea
													placeholder="Unit features, condition, notes..."
													className="resize-none"
													rows={3}
													disabled={isSubmitting}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</FormSection>

							<Separator />

							{/* Unit Specifications Section */}
							<FormSection className="space-y-4">
								<div>
									<h3 className="text-lg font-medium">Unit Specifications</h3>
									<p className="text-muted-foreground text-sm">Size and room details</p>
								</div>

								<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
									<FormField
										control={form.control}
										name="squareFootage"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													<i className="i-lucide-square inline-block h-4 w-4 mr-1" />
													Square Feet
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														min="0"
														placeholder="800"
														disabled={isSubmitting}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="bedrooms"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													<i className="i-lucide-bed inline-block h-4 w-4 mr-1" />
													Bedrooms
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														min="0"
														max="10"
														placeholder="2"
														disabled={isSubmitting}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="bathrooms"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													<i className="i-lucide-bath inline-block h-4 w-4 mr-1" />
													Bathrooms
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														step="0.5"
														min="0"
														max="10"
														placeholder="1.5"
														disabled={isSubmitting}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</FormSection>

							<Separator />

							{/* Financial Information Section */}
							<FormSection className="space-y-4">
								<div>
									<h3 className="text-lg font-medium">Financial Information</h3>
									<p className="text-muted-foreground text-sm">Rental rate and financial details</p>
								</div>

								<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
									<FormField
										control={form.control}
										name="rent"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													Monthly Rent ($) <span className="text-destructive ml-1">*</span>
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														step="0.01"
														min="0"
														placeholder="1250.00"
														disabled={isSubmitting}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Status is managed server-side and not part of the form schema */}
									<div className="flex items-center text-sm text-muted-foreground">
										<i className="i-lucide-info inline-block h-4 w-4 mr-2" />
										Unit status will be set to "Vacant" by default
									</div>
								</div>
							</FormSection>

							{/* Form Actions */}
							<div className="flex items-center justify-end gap-3 border-t pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={onClose}
									disabled={isSubmitting}
								>
									<i className="i-lucide-x inline-block mr-2 h-4 w-4" />
									Cancel
								</Button>

								<Button
									type="submit"
									disabled={isSubmitting}
									className="min-w-[120px]"
								>
									{isSubmitting ? (
										<div className="flex items-center gap-2">
											<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
											{isEditing ? 'Updating...' : 'Creating...'}
										</div>
									) : (
										<div className="flex items-center gap-2">
											<i className="i-lucide-save inline-block h-4 w-4" />
											{isEditing ? 'Update Unit' : 'Create Unit'}
										</div>
									)}
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	)
}