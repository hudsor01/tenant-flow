'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { propertyFormSchema } from '@repo/shared/validation'
import {
	useCreateProperty,
	useUpdateProperty
} from '@/hooks/api/use-properties'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle } from 'lucide-react'
import type { PropertyFormProps } from '@/types'
import type { PropertyFormData } from '@repo/shared/validation'

type PropertyFormDialogProps = PropertyFormProps & {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function PropertyFormDialog({
	open,
	onOpenChange,
	property,
	mode
}: PropertyFormDialogProps) {
	const [error, setError] = useState<string | null>(null)

	const createProperty = useCreateProperty()
	const updateProperty = useUpdateProperty()

	const form = useForm<PropertyFormData>({
		resolver: zodResolver(propertyFormSchema),
		defaultValues: {
			name: property?.name || '',
			address: property?.address || '',
			city: property?.city || '',
			state: property?.state || '',
			zipCode: property?.zipCode || '',
			propertyType: property?.propertyType || 'SINGLE_FAMILY',
			description: property?.description || ''
		}
	})

	const isLoading = createProperty.isPending || updateProperty.isPending

	async function onSubmit(formData: PropertyFormData) {
		try {
			setError(null)

			// Transform the form data for the API
			const apiData = {
				...formData,
				propertyType: formData.propertyType || 'SINGLE_FAMILY', // Ensure propertyType is always defined
				description:
					formData.description === ''
						? undefined
						: formData.description
			}

			if (mode === 'edit' && property) {
				await updateProperty.mutateAsync({
					id: property.id,
					data: apiData
				})
			} else {
				await createProperty.mutateAsync(apiData)
			}

			onOpenChange(false)
			form.reset()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred')
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>
						{mode === 'edit' ? 'Edit Property' : 'Add New Property'}
					</DialogTitle>
					<DialogDescription>
						{mode === 'edit'
							? 'Update the property information below.'
							: 'Fill in the details for your new property.'}
					</DialogDescription>
				</DialogHeader>

				{error && (
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Property Name</FormLabel>
									<FormControl>
										<Input
											placeholder="e.g., Sunset Apartments"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="propertyType"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Property Type</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={
											field.value || 'SINGLE_FAMILY'
										}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select property type" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="SINGLE_FAMILY">
												Single Family
											</SelectItem>
											<SelectItem value="MULTI_UNIT">
												Multi Unit
											</SelectItem>
											<SelectItem value="APARTMENT">
												Apartment
											</SelectItem>
											<SelectItem value="COMMERCIAL">
												Commercial
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="address"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Street Address</FormLabel>
									<FormControl>
										<Input
											placeholder="123 Main Street"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<FormField
								control={form.control}
								name="city"
								render={({ field }) => (
									<FormItem>
										<FormLabel>City</FormLabel>
										<FormControl>
											<Input
												placeholder="New York"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="state"
								render={({ field }) => (
									<FormItem>
										<FormLabel>State</FormLabel>
										<FormControl>
											<Input
												placeholder="NY"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="zipCode"
								render={({ field }) => (
									<FormItem className="sm:col-span-2 lg:col-span-1">
										<FormLabel>Zip Code</FormLabel>
										<FormControl>
											<Input
												placeholder="10001"
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
									<FormLabel>
										Description (Optional)
									</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Additional details about the property..."
											className="resize-none"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Add any additional information about the
										property
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter className="gap-3 sm:gap-0">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								className="w-full sm:w-auto"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isLoading}
								className="w-full sm:w-auto"
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										{mode === 'edit'
											? 'Updating...'
											: 'Creating...'}
									</>
								) : mode === 'edit' ? (
									'Update Property'
								) : (
									'Create Property'
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
