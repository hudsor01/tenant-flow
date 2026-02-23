'use client'

import { type ChangeEvent } from 'react'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import type { PropertyType } from '@repo/shared/types/core'
import type { PropertyFormApi } from '../property-form-types'

interface PropertyInfoSectionProps {
	form: PropertyFormApi
}

export function PropertyInfoSection({ form }: PropertyInfoSectionProps) {
	return (
		<>
			<form.Field name="name">
				{field => (
					<Field>
						<FieldLabel htmlFor="name">Property Name *</FieldLabel>
						<Input
							id="name"
							name="name"
							autoComplete="organization"
							placeholder="e.g. Sunset Apartments"
							value={field.state.value}
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								field.handleChange(e.target.value)
							}
							onBlur={field.handleBlur}
						/>
						{(field.state.meta.errors?.length ?? 0) > 0 && (
							<FieldError>{String(field.state.meta.errors[0])}</FieldError>
						)}
					</Field>
				)}
			</form.Field>

			<form.Field name="property_type">
				{field => (
					<Field>
						<FieldLabel htmlFor="property_type">Property Type *</FieldLabel>
						<input
							type="hidden"
							name="property_type"
							value={field.state.value}
							readOnly
						/>
						<Select
							value={field.state.value}
							onValueChange={(value: string) =>
								field.handleChange(value as PropertyType)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select property type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="SINGLE_FAMILY">Single Family</SelectItem>
								<SelectItem value="MULTI_UNIT">Multi Family</SelectItem>
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
		</>
	)
}
