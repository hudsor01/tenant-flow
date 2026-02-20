'use client'

import { Field, FieldError, FieldLabel } from '#components/ui/field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import type { Property, Unit } from '@repo/shared/types/core'
import { Building2, Home } from 'lucide-react'
import type { InviteTenantFormApi } from './invite-tenant-form-types'

interface InviteTenantPropertyFieldsProps {
	form: InviteTenantFormApi
	properties: Property[]
	availableUnits: Unit[]
	selectedPropertyId: string
	onPropertyChange: (propertyId: string) => void
}

export function InviteTenantPropertyFields({
	form,
	properties,
	availableUnits,
	selectedPropertyId,
	onPropertyChange
}: InviteTenantPropertyFieldsProps) {
	if (properties.length === 0) {
		return (
			<div className="rounded-lg border border-dashed p-4 text-center text-muted">
				<Building2 className="size-8 mx-auto mb-2 opacity-50" />
				<p className="text-sm">
					No properties configured yet. You can still invite tenants and assign
					them to properties later.
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 typography-large">
				<Building2 className="size-5" />
				Property Assignment (Optional)
			</div>
			<p className="text-muted text-sm">
				Assign tenant to a property now, or skip and assign later when creating
				a lease.
			</p>

			<form.Field name="property_id">
				{field => (
					<Field>
						<FieldLabel htmlFor="property_id">Property</FieldLabel>
						<Select
							value={field.state.value}
							onValueChange={value => {
								field.handleChange(value)
								onPropertyChange(value)
								form.setFieldValue('unit_id', '')
							}}
						>
							<SelectTrigger id="property_id">
								<SelectValue placeholder="Select a property (optional)" />
							</SelectTrigger>
							<SelectContent>
								{properties.map(property => (
									<SelectItem key={property.id} value={property.id}>
										<div className="flex items-center gap-2">
											<Home className="size-4" />
											{property.name}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldError errors={field.state.meta.errors} />
					</Field>
				)}
			</form.Field>

			{/* Only show unit field if property has multiple units */}
			{selectedPropertyId && availableUnits.length > 1 && (
				<form.Field name="unit_id">
					{field => (
						<Field>
							<FieldLabel htmlFor="unit_id">Unit (Optional)</FieldLabel>
							<Select
								value={field.state.value}
								onValueChange={field.handleChange}
							>
								<SelectTrigger id="unit_id">
									<SelectValue placeholder="Select a unit" />
								</SelectTrigger>
								<SelectContent>
									{availableUnits.map(unit => (
										<SelectItem key={unit.id} value={unit.id}>
											{unit.unit_number}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
			)}

			{/* Show message for single-family homes */}
			{selectedPropertyId && availableUnits.length <= 1 && (
				<p className="text-muted text-sm">
					{availableUnits.length === 0
						? 'This property has no units configured.'
						: 'Single-unit property - unit will be assigned automatically.'}
				</p>
			)}
		</div>
	)
}
