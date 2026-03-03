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
import type { PropertyFormApi } from '../property-form-types'

interface PropertyAddressSectionProps {
	form: PropertyFormApi
}

export function PropertyAddressSection({ form }: PropertyAddressSectionProps) {
	return (
		<>
			<form.Field name="address_line1">
				{field => (
					<Field>
						<FieldLabel htmlFor="address_line1">Address *</FieldLabel>
						<Input
							id="address_line1"
							name="address_line1"
							autoComplete="street-address"
							placeholder="123 Main St"
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

			<form.Field name="address_line2">
				{field => (
					<Field>
						<FieldLabel htmlFor="address_line2">
							Address Line 2 (Optional)
						</FieldLabel>
						<Input
							id="address_line2"
							name="address_line2"
							placeholder="Apt, Suite, Unit, etc."
							value={field.state.value}
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								field.handleChange(e.target.value)
							}
							onBlur={field.handleBlur}
						/>
					</Field>
				)}
			</form.Field>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<form.Field name="city">
					{field => (
						<Field>
							<FieldLabel htmlFor="city">City *</FieldLabel>
							<Input
								id="city"
								name="city"
								autoComplete="address-level2"
								placeholder="City"
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

				<form.Field name="state">
					{field => (
						<Field>
							<FieldLabel htmlFor="state">State *</FieldLabel>
							<Input
								id="state"
								name="state"
								autoComplete="address-level1"
								placeholder="CA"
								maxLength={2}
								value={field.state.value}
								onChange={(e: ChangeEvent<HTMLInputElement>) =>
									field.handleChange(e.target.value.toUpperCase())
								}
								onBlur={field.handleBlur}
							/>
							{(field.state.meta.errors?.length ?? 0) > 0 && (
								<FieldError>{String(field.state.meta.errors[0])}</FieldError>
							)}
						</Field>
					)}
				</form.Field>

				<form.Field name="postal_code">
					{field => (
						<Field>
							<FieldLabel htmlFor="postal_code">ZIP Code *</FieldLabel>
							<Input
								id="postal_code"
								name="postal_code"
								autoComplete="postal-code"
								inputMode="numeric"
								placeholder="12345"
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
			</div>

			<form.Field name="country">
				{field => (
					<Field>
						<FieldLabel htmlFor="country">Country *</FieldLabel>
						<Select
							value={field.state.value}
							onValueChange={(value: string) => field.handleChange(value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select country" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="US">United States</SelectItem>
								<SelectItem value="CA">Canada</SelectItem>
							</SelectContent>
						</Select>
					</Field>
				)}
			</form.Field>
		</>
	)
}
