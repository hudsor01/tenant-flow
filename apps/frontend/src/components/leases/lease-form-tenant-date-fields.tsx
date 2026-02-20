'use client'

import { Field, FieldError, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'
import type { LeaseFormApi } from './lease-form-types'

interface LeaseFormTenantDateFieldsProps {
	form: LeaseFormApi
	tenants: TenantWithLeaseInfo[]
}

export function LeaseFormTenantDateFields({
	form,
	tenants
}: LeaseFormTenantDateFieldsProps) {
	return (
		<>
			{/* Primary Tenant Selection */}
			<form.Field name="primary_tenant_id">
				{field => (
					<Field>
						<FieldLabel htmlFor="primary_tenant_id">
							Primary Tenant *
						</FieldLabel>
						<Select
							value={field.state.value}
							onValueChange={field.handleChange}
						>
							<SelectTrigger id="primary_tenant_id">
								<SelectValue placeholder="Select tenant" />
							</SelectTrigger>
							<SelectContent>
								{tenants.map(tenant => (
									<SelectItem key={tenant.id} value={tenant.id}>
										{tenant.name ?? tenant.email}
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

			{/* Start Date and End Date */}
			<div className="grid gap-4 md:grid-cols-2">
				<form.Field name="start_date">
					{field => (
						<Field>
							<FieldLabel htmlFor="start_date">Start Date *</FieldLabel>
							<Input
								id="start_date"
								type="date"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
							/>
							{field.state.meta.errors.length > 0 && (
								<FieldError>{field.state.meta.errors[0]}</FieldError>
							)}
						</Field>
					)}
				</form.Field>

				<form.Field name="end_date">
					{field => (
						<Field>
							<FieldLabel htmlFor="end_date">End Date *</FieldLabel>
							<Input
								id="end_date"
								type="date"
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
		</>
	)
}
