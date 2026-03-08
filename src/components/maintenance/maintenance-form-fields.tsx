import type { ChangeEvent } from 'react'

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
import type { MaintenancePriority, Property, Unit } from '#types/core'
import { MAINTENANCE_PRIORITY_OPTIONS } from '#lib/constants/status-types'
import type { useMaintenanceForm } from '#hooks/use-maintenance-form'

interface MaintenanceFormFieldsProps {
	form: ReturnType<typeof useMaintenanceForm>
	propertiesData: Property[] | undefined
	unitsByProperty: Map<string, Unit[]>
}

export function MaintenanceFormFields({
	form,
	propertiesData,
	unitsByProperty
}: MaintenanceFormFieldsProps) {
	const unitLabelId = 'maintenance-unit-label'

	return (
		<>
			{/* Unit Selection */}
			<form.Field name="unit_id">
				{field => (
					<Field>
						<FieldLabel id={unitLabelId} htmlFor="unit_id">
							Unit *
						</FieldLabel>
						<Select
							value={field.state.value ?? ''}
							onValueChange={field.handleChange}
						>
							<SelectTrigger
								id="unit_id"
								aria-labelledby={unitLabelId}
								className="w-full justify-between"
							>
								<SelectValue placeholder="Select unit" />
							</SelectTrigger>
							<SelectContent>
								{propertiesData?.map((property: Property) => {
									const propertyUnits =
										unitsByProperty.get(property.id) ?? []
									if (propertyUnits.length === 0) return null
									return (
										<div key={property.id}>
											<div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
												{property.name}
											</div>
											{propertyUnits.map((unit: Unit) => (
												<SelectItem key={unit.id} value={unit.id}>
													Unit {unit.unit_number}
												</SelectItem>
											))}
										</div>
									)
								})}
							</SelectContent>
						</Select>
						{(field.state.meta.errors?.length ?? 0) > 0 && (
							<FieldError>
								{String(field.state.meta.errors[0])}
							</FieldError>
						)}
					</Field>
				)}
			</form.Field>

			{/* Tenant ID */}
			<form.Field name="tenant_id">
				{field => (
					<Field>
						<FieldLabel htmlFor="tenant_id">Tenant ID *</FieldLabel>
						<Input
							id="tenant_id"
							name="tenant_id"
							placeholder="Tenant ID"
							value={field.state.value ?? ''}
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								field.handleChange(e.target.value)
							}
							onBlur={field.handleBlur}
						/>
						{(field.state.meta.errors?.length ?? 0) > 0 && (
							<FieldError>
								{String(field.state.meta.errors[0])}
							</FieldError>
						)}
					</Field>
				)}
			</form.Field>

			{/* Title Field */}
			<form.Field name="title">
				{field => (
					<Field>
						<FieldLabel htmlFor="title">Title *</FieldLabel>
						<Input
							id="title"
							name="title"
							placeholder="Kitchen faucet leak"
							value={field.state.value ?? ''}
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								field.handleChange(e.target.value)
							}
							onBlur={field.handleBlur}
						/>
						{(field.state.meta.errors?.length ?? 0) > 0 && (
							<FieldError>
								{String(field.state.meta.errors[0])}
							</FieldError>
						)}
					</Field>
				)}
			</form.Field>

			{/* Description Field */}
			<form.Field name="description">
				{field => (
					<Field>
						<FieldLabel htmlFor="description">Description *</FieldLabel>
						<Textarea
							id="description"
							name="description"
							placeholder="Describe the issue in detail"
							rows={4}
							value={field.state.value ?? ''}
							onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
								field.handleChange(e.target.value)
							}
							onBlur={field.handleBlur}
						/>
						{(field.state.meta.errors?.length ?? 0) > 0 && (
							<FieldError>
								{String(field.state.meta.errors[0])}
							</FieldError>
						)}
					</Field>
				)}
			</form.Field>

			{/* Priority Field */}
			<form.Field name="priority">
				{field => (
					<Field>
						<FieldLabel htmlFor="priority">Priority *</FieldLabel>
						<Select
							value={field.state.value ?? ''}
							onValueChange={(value: string) =>
								field.handleChange(value as MaintenancePriority)
							}
						>
							<SelectTrigger id="priority">
								<SelectValue placeholder="Select priority level" />
							</SelectTrigger>
							<SelectContent>
								{MAINTENANCE_PRIORITY_OPTIONS.map(option => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{(field.state.meta.errors?.length ?? 0) > 0 && (
							<FieldError>
								{String(field.state.meta.errors[0])}
							</FieldError>
						)}
					</Field>
				)}
			</form.Field>

			{/* Estimated Cost Field */}
			<form.Field name="estimated_cost">
				{field => (
					<Field>
						<FieldLabel htmlFor="estimated_cost">
							Estimated Cost (optional)
						</FieldLabel>
						<Input
							id="estimated_cost"
							name="estimated_cost"
							type="number"
							min="0"
							step="0.01"
							placeholder="0.00"
							value={field.state.value ?? ''}
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								field.handleChange(e.target.value)
							}
							onBlur={field.handleBlur}
						/>
						{(field.state.meta.errors?.length ?? 0) > 0 && (
							<FieldError>
								{String(field.state.meta.errors[0])}
							</FieldError>
						)}
					</Field>
				)}
			</form.Field>

			{/* Scheduled Date Field */}
			<form.Field name="scheduled_date">
				{field => (
					<Field>
						<FieldLabel htmlFor="scheduled_date">
							Scheduled Date (optional)
						</FieldLabel>
						<Input
							id="scheduled_date"
							name="scheduled_date"
							type="date"
							value={field.state.value ?? ''}
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								field.handleChange(e.target.value)
							}
							onBlur={field.handleBlur}
						/>
						{(field.state.meta.errors?.length ?? 0) > 0 && (
							<FieldError>
								{String(field.state.meta.errors[0])}
							</FieldError>
						)}
					</Field>
				)}
			</form.Field>
		</>
	)
}
