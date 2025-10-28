'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '#components/ui/button'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Textarea } from '#components/ui/textarea'

import { useUpdateProperty } from '#hooks/api/use-properties'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Property } from '@repo/shared/types/core'
import {
	propertyUpdateFormSchema,
	transformPropertyUpdateData
} from '@repo/shared/validation/properties'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'

interface PropertyEditFormProps {
	property: Property
}

export function PropertyEditForm({ property }: PropertyEditFormProps) {
	const params = useParams()
	const propertyId = params.id as string
	const logger = createLogger({ component: 'PropertyEditForm' })

	const updateProperty = useUpdateProperty()

	const form = useForm({
		defaultValues: {
			name: property.name,
			description: property.description || '',
			propertyType: property.propertyType || 'SINGLE_FAMILY',
			address: property.address,
			city: property.city,
			state: property.state,
			zipCode: property.zipCode
		},
		onSubmit: async ({ value }) => {
			try {
				const transformedData = transformPropertyUpdateData(value)
				await updateProperty.mutateAsync({ id: propertyId, data: transformedData })
				toast.success('Property updated successfully')
				window.history.back()
			} catch (error) {
				toast.error('Failed to update property')
				logger.error(
					'Failed to update property',
					{ action: 'updateProperty' },
					error
				)
			}
		},
		validators: {
			onChange: ({ value }) => {
				const result = propertyUpdateFormSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	if (!property) {
		return (
			<div className="flex flex-col items-center justify-center space-y-4 text-center py-12">
				<div className="text-2xl">Property not found</div>
				<Button asChild>
					<Link href="/manage/properties">
						<ArrowLeft className="size-4 mr-2" />
						Back to Properties
					</Link>
				</Button>
			</div>
		)
	}

	return (
		<div className="max-w-2xl mx-auto space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="outline" size="sm" asChild>
					<Link href={`/manage/properties/${propertyId}`}>
						<ArrowLeft className="size-4 mr-2" />
						Back
					</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Edit Property</h1>
					<p className="text-muted-foreground">Update property information</p>
				</div>
			</div>

			<form
				onSubmit={e => {
					e.preventDefault()
					form.handleSubmit()
				}}
				className="space-y-6"
			>
				<form.Field name="name">
					{field => (
						<Field>
							<FieldLabel htmlFor="name">Property Name *</FieldLabel>
							<Input
								id="name"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
							/>
							{field.state.meta.errors?.length && (
								<FieldError>{String(field.state.meta.errors[0])}</FieldError>
							)}
						</Field>
					)}
				</form.Field>

				<form.Field name="propertyType">
					{field => (
						<Field>
							<FieldLabel htmlFor="propertyType">Property Type *</FieldLabel>
							<Select
								value={field.state.value}
								onValueChange={value => field.handleChange(value as typeof field.state.value)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="SINGLE_FAMILY">Single Family</SelectItem>
									<SelectItem value="MULTI_UNIT">Multi Unit</SelectItem>
									<SelectItem value="APARTMENT">Apartment</SelectItem>
									<SelectItem value="COMMERCIAL">Commercial</SelectItem>
									<SelectItem value="CONDO">Condo</SelectItem>
									<SelectItem value="TOWNHOUSE">Townhouse</SelectItem>
									<SelectItem value="OTHER">Other</SelectItem>
								</SelectContent>
							</Select>
						</Field>
					)}
				</form.Field>

				<form.Field name="address">
					{field => (
						<Field>
							<FieldLabel htmlFor="address">Address *</FieldLabel>
							<Input
								id="address"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
							/>
							{field.state.meta.errors?.length && (
								<FieldError>{String(field.state.meta.errors[0])}</FieldError>
							)}
						</Field>
					)}
				</form.Field>

				<div className="grid grid-cols-3 gap-4">
					<form.Field name="city">
						{field => (
							<Field>
								<FieldLabel htmlFor="city">City *</FieldLabel>
								<Input
									id="city"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
								/>
								{field.state.meta.errors?.length && (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								)}
							</Field>
						)}
					</form.Field>

					<form.Field name="state">
						{field => (
							<Field>
								<FieldLabel htmlFor="state">State *</FieldLabel>
								<Input
									id="state"
									value={field.state.value}
									maxLength={2}
									onChange={e =>
										field.handleChange(e.target.value.toUpperCase())
									}
									onBlur={field.handleBlur}
								/>
								{field.state.meta.errors?.length && (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								)}
							</Field>
						)}
					</form.Field>

					<form.Field name="zipCode">
						{field => (
							<Field>
								<FieldLabel htmlFor="zipCode">ZIP Code *</FieldLabel>
								<Input
									id="zipCode"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
								/>
								{field.state.meta.errors?.length && (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								)}
							</Field>
						)}
					</form.Field>
				</div>

				<form.Field name="description">
					{field => (
						<Field>
							<FieldLabel htmlFor="description">Description</FieldLabel>
							<Textarea
								id="description"
								rows={3}
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
							/>
						</Field>
					)}
				</form.Field>

				<div className="flex justify-end gap-4 pt-6 border-t">
					<Button type="button" variant="outline" asChild>
						<Link href={`/manage/properties/${propertyId}`}>Cancel</Link>
					</Button>
					<Button type="submit" disabled={updateProperty.isPending}>
						{updateProperty.isPending ? 'Updating...' : 'Update Property'}
					</Button>
				</div>
			</form>
		</div>
	)
}
