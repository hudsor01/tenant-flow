'use client'

import { Field, FieldError, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '#components/ui/input-group'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Button } from '#components/ui/button'
import type { UnitFormApi } from './unit-form-types'
import { DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Property {
	id: string
	name: string
}

interface UnitFormFieldsProps {
	form: UnitFormApi
	properties: Property[] | undefined
	mode: 'create' | 'edit'
	isSubmitting: boolean
}

export function UnitFormFields({
	form,
	properties,
	mode,
	isSubmitting
}: UnitFormFieldsProps) {
	const router = useRouter()

	return (
		<>
			<div className="grid gap-4 md:grid-cols-2">
				<form.Field name="property_id">
					{field => (
						<Field>
							<FieldLabel htmlFor="property_id">Property *</FieldLabel>
							<Select
								value={field.state.value}
								onValueChange={field.handleChange}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select a property" />
								</SelectTrigger>
								<SelectContent>
									{properties?.map(property => (
										<SelectItem key={property.id} value={property.id}>
											{property.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{field.state.meta.errors.length > 0 && (
								<FieldError>{field.state.meta.errors[0]}</FieldError>
							)}
						</Field>
					)}
				</form.Field>

				<form.Field name="unit_number">
					{field => (
						<Field>
							<FieldLabel htmlFor="unit_number">Unit Number *</FieldLabel>
							<Input
								id="unit_number"
								placeholder="e.g., 101, A1"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
							/>
							{field.state.meta.errors.length > 0 && (
								<FieldError>{field.state.meta.errors[0]}</FieldError>
							)}
						</Field>
					)}
				</form.Field>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<form.Field name="bedrooms">
					{field => (
						<Field>
							<FieldLabel htmlFor="bedrooms">Bedrooms *</FieldLabel>
							<Input
								id="bedrooms"
								type="number"
								min="0"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="bathrooms">
					{field => (
						<Field>
							<FieldLabel htmlFor="bathrooms">Bathrooms *</FieldLabel>
							<Input
								id="bathrooms"
								type="number"
								min="0"
								step="0.5"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="square_feet">
					{field => (
						<Field>
							<FieldLabel htmlFor="square_feet">Square Feet</FieldLabel>
							<Input
								id="square_feet"
								type="number"
								min="0"
								placeholder="Optional"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
							/>
						</Field>
					)}
				</form.Field>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<form.Field name="rent_amount">
					{field => (
						<Field>
							<FieldLabel htmlFor="rent">Monthly Rent *</FieldLabel>
							<InputGroup>
								<InputGroupAddon>
									<DollarSign className="size-4" />
								</InputGroupAddon>
								<InputGroupInput
									id="rent"
									type="number"
									min="0"
									step="0.01"
									placeholder="0.00"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
								/>
							</InputGroup>
						</Field>
					)}
				</form.Field>

				<form.Field name="status">
					{field => (
						<Field>
							<FieldLabel htmlFor="status">Status *</FieldLabel>
							<Select
								value={field.state.value}
								onValueChange={value => {
									field.handleChange(
										value as
											| 'available'
											| 'occupied'
											| 'maintenance'
											| 'reserved'
									)
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="available">Vacant</SelectItem>
									<SelectItem value="occupied">Occupied</SelectItem>
									<SelectItem value="maintenance">Maintenance</SelectItem>
									<SelectItem value="reserved">Reserved</SelectItem>
								</SelectContent>
							</Select>
						</Field>
					)}
				</form.Field>
			</div>

			<div className="flex justify-end gap-3">
				<Button
					type="button"
					variant="outline"
					onClick={() => router.back()}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting
						? mode === 'create'
							? 'Creating...'
							: 'Saving...'
						: mode === 'create'
							? 'Create Unit'
							: 'Save Changes'}
				</Button>
			</div>
		</>
	)
}
