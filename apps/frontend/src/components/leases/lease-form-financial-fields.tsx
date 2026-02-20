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
import type { LeaseFormApi } from './lease-form-types'

interface LeaseFormFinancialFieldsProps {
	form: LeaseFormApi
}

export function LeaseFormFinancialFields({
	form
}: LeaseFormFinancialFieldsProps) {
	return (
		<>
			{/* Rent Amount and Security Deposit */}
			<div className="grid gap-4 md:grid-cols-2">
				<form.Field name="rent_amount">
					{field => (
						<Field>
							<FieldLabel htmlFor="rent_amount">Monthly Rent *</FieldLabel>
							<Input
								id="rent_amount"
								type="number"
								min="0"
								step="0.01"
								value={field.state.value}
								onChange={e => {
									const v = e.target.value
									field.handleChange(v === '' ? 0 : parseFloat(v))
								}}
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
								type="number"
								min="0"
								step="0.01"
								value={field.state.value}
								onChange={e => {
									const v = e.target.value
									field.handleChange(v === '' ? 0 : parseFloat(v))
								}}
							/>
							{field.state.meta.errors.length > 0 && (
								<FieldError>{field.state.meta.errors[0]}</FieldError>
							)}
						</Field>
					)}
				</form.Field>
			</div>

			{/* Lease Status */}
			<form.Field name="lease_status">
				{field => (
					<Field>
						<FieldLabel htmlFor="lease_status">Status *</FieldLabel>
						<Select
							value={field.state.value}
							onValueChange={field.handleChange}
						>
							<SelectTrigger id="lease_status">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="draft">Draft</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="ended">Ended</SelectItem>
								<SelectItem value="terminated">Terminated</SelectItem>
							</SelectContent>
						</Select>
						{field.state.meta.errors.length > 0 && (
							<FieldError>{field.state.meta.errors[0]}</FieldError>
						)}
					</Field>
				)}
			</form.Field>

			{/* Currency and Payment Day */}
			<div className="grid gap-4 md:grid-cols-2">
				<form.Field name="rent_currency">
					{field => (
						<Field>
							<FieldLabel htmlFor="rent_currency">Currency *</FieldLabel>
							<Select
								value={field.state.value}
								onValueChange={field.handleChange}
							>
								<SelectTrigger id="rent_currency">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="USD">USD ($)</SelectItem>
									<SelectItem value="EUR">EUR (€)</SelectItem>
									<SelectItem value="GBP">GBP (£)</SelectItem>
									<SelectItem value="CAD">CAD (C$)</SelectItem>
								</SelectContent>
							</Select>
							{field.state.meta.errors.length > 0 && (
								<FieldError>{field.state.meta.errors[0]}</FieldError>
							)}
						</Field>
					)}
				</form.Field>

				<form.Field name="payment_day">
					{field => (
						<Field>
							<FieldLabel htmlFor="payment_day">Payment Day *</FieldLabel>
							<Input
								id="payment_day"
								type="number"
								min="1"
								max="31"
								value={field.state.value}
								onChange={e => {
									const v = e.target.value
									field.handleChange(v === '' ? 1 : parseInt(v))
								}}
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
