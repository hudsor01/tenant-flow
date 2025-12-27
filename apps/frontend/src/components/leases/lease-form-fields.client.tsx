'use client'

import type { ReactFormExtendedApi } from '@tanstack/react-form'
import Link from 'next/link'
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
import type { TenantWithExtras, Unit } from '@repo/shared/types/core'

/** Minimum required fields for the lease form fields component */
export interface LeaseFormFieldsValues {
	unit_id: string
	primary_tenant_id: string
	start_date: string
	end_date: string
	rent_amount: number
	security_deposit: number
}

/**
 * Type for form API that works with any form extending LeaseFormFieldsValues.
 * Uses `any` for validator types to accept forms with different validation configs.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeaseFormApi<T extends LeaseFormFieldsValues = LeaseFormFieldsValues> = ReactFormExtendedApi<T, any, any, any, any, any, any, any, any, any, any, any>

interface LeaseFormFieldsProps<T extends LeaseFormFieldsValues> {
	form: LeaseFormApi<T>
	units: Unit[]
	tenants: TenantWithExtras[]
	unitSelectDisabled?: boolean
	showTenantCreateLink?: boolean
	tenantCreateHref?: string
}

export function LeaseFormFields<T extends LeaseFormFieldsValues>({
	form,
	units,
	tenants,
	unitSelectDisabled = false,
	showTenantCreateLink = false,
	tenantCreateHref = '/tenants/new'
}: LeaseFormFieldsProps<T>) {
	const centsToDisplay = (cents: number | undefined): string => {
		if (!cents) return ''
		return (cents / 100).toString()
	}

	const parseCents = (value: string): number => {
		const cleaned = value.replace(/[^0-9.]/g, '')
		const num = parseFloat(cleaned)
		return isNaN(num) ? 0 : Math.round(num * 100)
	}

	return (
		<div className="space-y-6">
			<form.Field name="unit_id">
				{field => (
					<Field>
						<FieldLabel htmlFor="unit_id">Unit *</FieldLabel>
						<Select
							value={field.state.value as string}
							onValueChange={value => (field.handleChange as (v: string) => void)(value)}
							disabled={unitSelectDisabled}
						>
							<SelectTrigger id="unit_id">
								<SelectValue placeholder="Select unit" />
							</SelectTrigger>
							<SelectContent>
								{units.length === 0 ? (
									<div className="flex-center p-4 text-muted">
										No vacant units available
									</div>
								) : (
									units.map(unit => (
										<SelectItem key={unit.id} value={unit.id}>
											Unit {unit.unit_number ?? unit.id}
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
						{field.state.meta.errors.length > 0 && (
							<FieldError>{field.state.meta.errors[0]}</FieldError>
						)}
					</Field>
				)}
			</form.Field>

			<form.Field name="primary_tenant_id">
				{field => (
					<Field>
						<FieldLabel htmlFor="primary_tenant_id">Primary Tenant *</FieldLabel>
						<Select
							value={field.state.value as string}
							onValueChange={value => (field.handleChange as (v: string) => void)(value)}
						>
							<SelectTrigger id="primary_tenant_id">
								<SelectValue placeholder="Select tenant" />
							</SelectTrigger>
							<SelectContent>
								{tenants.length === 0 ? (
									<div className="flex-center p-4 text-muted">
										No tenants found
									</div>
								) : (
									tenants.map(tenant => {
										const nameFromParts = [tenant.first_name, tenant.last_name]
											.filter(Boolean)
											.join(' ')
										const label =
											(tenant.name ?? nameFromParts) ||
											tenant.email ||
											tenant.id
										return (
											<SelectItem key={tenant.id} value={tenant.id}>
												{label}
											</SelectItem>
										)
									})
								)}
							</SelectContent>
						</Select>
						{field.state.meta.errors.length > 0 && (
							<FieldError>{field.state.meta.errors[0]}</FieldError>
						)}
						{showTenantCreateLink && (
							<Button asChild variant="link" size="sm" className="px-0">
								<Link href={tenantCreateHref}>Create a new tenant</Link>
							</Button>
						)}
					</Field>
				)}
			</form.Field>

			<div className="grid gap-4 md:grid-cols-2">
				<form.Field name="start_date">
					{field => (
						<Field>
							<FieldLabel htmlFor="start_date">Start Date *</FieldLabel>
							<Input
								id="start_date"
								type="date"
								value={field.state.value as string}
								onChange={e => (field.handleChange as (v: string) => void)(e.target.value)}
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
								value={field.state.value as string}
								onChange={e => (field.handleChange as (v: string) => void)(e.target.value)}
							/>
							{field.state.meta.errors.length > 0 && (
								<FieldError>{field.state.meta.errors[0]}</FieldError>
							)}
						</Field>
					)}
				</form.Field>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<form.Field name="rent_amount">
					{field => (
						<Field>
							<FieldLabel htmlFor="rent_amount">Monthly Rent *</FieldLabel>
							<Input
								id="rent_amount"
								type="text"
								inputMode="decimal"
								placeholder="1500.00"
								value={centsToDisplay(field.state.value as number)}
								onChange={e => (field.handleChange as (v: number) => void)(parseCents(e.target.value))}
							/>
							{field.state.meta.errors.length > 0 && (
								<FieldError>{field.state.meta.errors[0]}</FieldError>
							)}
						</Field>
					)}
				</form.Field>

				<form.Field name="security_deposit">
					{field => (
						<Field>
							<FieldLabel htmlFor="security_deposit">
								Security Deposit *
							</FieldLabel>
							<Input
								id="security_deposit"
								type="text"
								inputMode="decimal"
								placeholder="1500.00"
								value={centsToDisplay(field.state.value as number)}
								onChange={e => (field.handleChange as (v: number) => void)(parseCents(e.target.value))}
							/>
							{field.state.meta.errors.length > 0 && (
								<FieldError>{field.state.meta.errors[0]}</FieldError>
							)}
						</Field>
					)}
				</form.Field>
			</div>
		</div>
	)
}
