'use client'

import { Field, FieldError, FieldLabel } from '#components/ui/field'
import { LoadingSpinner } from '#components/ui/loading-spinner'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import type { Property, Unit } from '@repo/shared/types/core'
import type { LeaseFormApi } from './lease-form-types'

interface LeaseFormPropertyUnitFieldsProps {
	form: LeaseFormApi
	properties: Property[]
	propertiesIsLoading: boolean
	propertiesIsError: boolean
	propertiesError: Error | null
	units: Unit[]
	unitsIsError: boolean
	unitsError: Error | null
	selectedPropertyId: string
	onPropertyChange: (propertyId: string) => void
}

export function LeaseFormPropertyUnitFields({
	form,
	properties,
	propertiesIsLoading,
	propertiesIsError,
	propertiesError,
	units,
	unitsIsError,
	unitsError,
	selectedPropertyId,
	onPropertyChange
}: LeaseFormPropertyUnitFieldsProps) {
	return (
		<>
			{/* Property Selection (for filtering units, not stored in lease) */}
			<div className="grid gap-4 md:grid-cols-2">
				<Field>
					<FieldLabel htmlFor="property-select">Property *</FieldLabel>
					<Select
						value={selectedPropertyId}
						onValueChange={value => {
							onPropertyChange(value)
							form.setFieldValue('unit_id', '')
						}}
						disabled={propertiesIsError}
					>
						<SelectTrigger id="property-select">
							<SelectValue placeholder="Select property" />
						</SelectTrigger>
						<SelectContent>
							{propertiesIsLoading ? (
								<div className="flex-center p-4">
									<LoadingSpinner size="sm" />
								</div>
							) : properties.length === 0 ? (
								<div className="flex-center p-4 text-muted">
									No properties available
								</div>
							) : (
								properties.map((property: Property) => (
									<SelectItem key={property.id} value={property.id}>
										{property.name}
									</SelectItem>
								))
							)}
						</SelectContent>
					</Select>
				</Field>

				{propertiesIsError && (
					<p className="text-sm text-destructive mt-2">
						Failed to load properties
						{propertiesError ? `: ${propertiesError.message}` : ''}. Please
						refresh to retry.
					</p>
				)}
			</div>

			{unitsIsError && (
				<p className="text-sm text-destructive mt-2">
					Failed to load units for the selected property.
					{unitsError ? ` ${unitsError.message}` : ''} Please retry.
				</p>
			)}

			{/* Unit Selection */}
			<form.Field name="unit_id">
				{field => (
					<Field>
						<FieldLabel htmlFor="unit_id">Unit *</FieldLabel>
						<Select
							value={field.state.value}
							onValueChange={field.handleChange}
							disabled={!selectedPropertyId}
						>
							<SelectTrigger id="unit_id">
								<SelectValue placeholder="Select unit" />
							</SelectTrigger>
							<SelectContent>
								{units.map(unit => (
									<SelectItem key={unit.id} value={unit.id}>
										{unit.unit_number}
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
		</>
	)
}
