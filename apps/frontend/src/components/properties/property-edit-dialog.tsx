'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateProperty } from '@/hooks/api/use-properties'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Property } from '@repo/shared/types/core'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'

interface PropertyEditDialogProps {
	property: Property
	open: boolean
	onOpenChange: (open: boolean) => void
}

type PropertyFormValues = {
	name: string
	address: string
	city: string
	state: string
	zipCode: string
	propertyType: Property['propertyType']
	status: Property['status']
	description: string
	imageUrl: string
}

export function PropertyEditDialog({
	property,
	open,
	onOpenChange
}: PropertyEditDialogProps) {
	const updateProperty = useUpdateProperty()
	const logger = createLogger({ component: 'PropertyEditDialog' })

	const form = useForm({
		defaultValues: {
			name: property.name,
			address: property.address,
			city: property.city,
			state: property.state,
			zipCode: property.zipCode,
			propertyType: property.propertyType,
			status: property.status,
			description: property.description || '',
			imageUrl: property.imageUrl || ''
		},
		onSubmit: async ({ value }) => {
			try {
				await updateProperty.mutateAsync({
					id: property.id,
					data: {
						name: value.name,
						address: value.address,
						city: value.city,
						state: value.state,
						zipCode: value.zipCode,
						propertyType: value.propertyType,
						status: value.status,
						description: value.description || null,
						imageUrl: value.imageUrl || null
					}
				})
				toast.success('Property updated successfully')
				onOpenChange(false)
			} catch (error) {
				logger.error(
					'Failed to update property',
					{
						action: 'updateProperty',
						metadata: { propertyId: property.id }
					},
					error
				)
				toast.error('Failed to update property')
			}
		}
	})

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit Property</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={e => {
						e.preventDefault()
						form.handleSubmit()
					}}
					className="space-y-4"
				>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="name">
							{field => (
								<Field>
									<FieldLabel>Property Name</FieldLabel>
									<Input
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="Sunset Apartments"
									/>
									<FieldError>
										{String(field.state.meta.errors?.[0])}
									</FieldError>
								</Field>
							)}
						</form.Field>

						<form.Field name="propertyType">
							{field => (
								<Field>
									<FieldLabel>Property Type</FieldLabel>
									<Select
										value={field.state.value ?? ''}
										onValueChange={value =>
											field.handleChange(
												value as PropertyFormValues['propertyType']
											)
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="SINGLE_FAMILY">
												Single Family
											</SelectItem>
											<SelectItem value="MULTI_UNIT">Multi Unit</SelectItem>
											<SelectItem value="APARTMENT">Apartment</SelectItem>
											<SelectItem value="CONDO">Condo</SelectItem>
											<SelectItem value="TOWNHOUSE">Townhouse</SelectItem>
											<SelectItem value="OTHER">Other</SelectItem>
										</SelectContent>
									</Select>
									<FieldError>
										{String(field.state.meta.errors?.[0])}
									</FieldError>
								</Field>
							)}
						</form.Field>
					</div>

					<form.Field name="address">
						{field => (
							<Field>
								<FieldLabel>Address</FieldLabel>
								<Input
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="123 Main St"
								/>
								<FieldError>{String(field.state.meta.errors?.[0])}</FieldError>
							</Field>
						)}
					</form.Field>

					<div className="grid grid-cols-3 gap-4">
						<form.Field name="city">
							{field => (
								<Field>
									<FieldLabel>City</FieldLabel>
									<Input
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="San Francisco"
									/>
									<FieldError>
										{String(field.state.meta.errors?.[0])}
									</FieldError>
								</Field>
							)}
						</form.Field>

						<form.Field name="state">
							{field => (
								<Field>
									<FieldLabel>State</FieldLabel>
									<Input
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="CA"
										maxLength={2}
									/>
									<FieldError>
										{String(field.state.meta.errors?.[0])}
									</FieldError>
								</Field>
							)}
						</form.Field>

						<form.Field name="zipCode">
							{field => (
								<Field>
									<FieldLabel>ZIP Code</FieldLabel>
									<Input
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="94102"
									/>
									<FieldError>
										{String(field.state.meta.errors?.[0])}
									</FieldError>
								</Field>
							)}
						</form.Field>
					</div>

					<form.Field name="status">
						{field => (
							<Field>
								<FieldLabel>Status</FieldLabel>
								<Select
									value={field.state.value ?? ''}
									onValueChange={value =>
										field.handleChange(value as PropertyFormValues['status'])
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ACTIVE">Active</SelectItem>
										<SelectItem value="INACTIVE">Inactive</SelectItem>
										<SelectItem value="PENDING">Pending</SelectItem>
										<SelectItem value="SOLD">Sold</SelectItem>
									</SelectContent>
								</Select>
								<FieldError>{String(field.state.meta.errors?.[0])}</FieldError>
							</Field>
						)}
					</form.Field>

					<form.Field name="description">
						{field => (
							<Field>
								<FieldLabel>Description (Optional)</FieldLabel>
								<Textarea
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="Property description..."
									rows={3}
								/>
								<FieldError>{String(field.state.meta.errors?.[0])}</FieldError>
							</Field>
						)}
					</form.Field>

					<form.Field name="imageUrl">
						{field => (
							<Field>
								<FieldLabel>Image URL (Optional)</FieldLabel>
								<Input
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="https://example.com/image.jpg"
									type="url"
								/>
								<FieldError>{String(field.state.meta.errors?.[0])}</FieldError>
							</Field>
						)}
					</form.Field>

					<div className="flex justify-end gap-3 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={updateProperty.isPending}>
							{updateProperty.isPending ? 'Updating...' : 'Update Property'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
