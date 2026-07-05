"use client";

import { Field, FieldError, FieldLabel } from "#components/ui/field";
import { Input } from "#components/ui/input";
import { withForm } from "#lib/forms/form-hook";
import { leaseFormOptions } from "./lease-form-options";

const STATUS_OPTIONS = [
	{ value: "draft", label: "Draft" },
	{ value: "pending_signature", label: "Pending" },
	{ value: "active", label: "Active" },
	{ value: "expired", label: "Expired" },
	{ value: "ended", label: "Ended" },
	{ value: "terminated", label: "Terminated" },
];

const CURRENCY_OPTIONS = [
	{ value: "USD", label: "USD ($)" },
	{ value: "EUR", label: "EUR (€)" },
	{ value: "GBP", label: "GBP (£)" },
	{ value: "CAD", label: "CAD (C$)" },
];

export const LeaseFormFinancialFields = withForm({
	...leaseFormOptions,
	render: function LeaseFormFinancialFields({ form }) {
		return (
			<>
				{/* Rent Amount and Security Deposit — number fields with non-null
				    defaults (empty -> 0) kept inline; NumberField is for number|null. */}
				<div className="grid gap-4 md:grid-cols-2">
					<form.AppField name="rent_amount">
						{(field) => (
							<Field>
								<FieldLabel htmlFor="rent_amount">Monthly Rent *</FieldLabel>
								<Input
									id="rent_amount"
									type="number"
									min="0"
									step="0.01"
									value={field.state.value}
									onChange={(event) => {
										const v = event.target.value;
										field.handleChange(v === "" ? 0 : Number.parseFloat(v));
									}}
									onBlur={field.handleBlur}
								/>
								{field.state.meta.isTouched ? (
									<FieldError errors={field.state.meta.errors} />
								) : null}
							</Field>
						)}
					</form.AppField>

					<form.AppField name="security_deposit">
						{(field) => (
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
									onChange={(event) => {
										const v = event.target.value;
										field.handleChange(v === "" ? 0 : Number.parseFloat(v));
									}}
									onBlur={field.handleBlur}
								/>
								{field.state.meta.isTouched ? (
									<FieldError errors={field.state.meta.errors} />
								) : null}
							</Field>
						)}
					</form.AppField>
				</div>

				<form.AppField name="lease_status">
					{(field) => (
						<field.SelectField label="Status *" options={STATUS_OPTIONS} />
					)}
				</form.AppField>

				<div className="grid gap-4 md:grid-cols-2">
					<form.AppField name="rent_currency">
						{(field) => (
							<field.SelectField
								label="Currency *"
								options={CURRENCY_OPTIONS}
							/>
						)}
					</form.AppField>

					<form.AppField name="payment_day">
						{(field) => (
							<Field>
								<FieldLabel htmlFor="payment_day">Payment Day *</FieldLabel>
								<Input
									id="payment_day"
									type="number"
									min="1"
									max="31"
									value={field.state.value}
									onChange={(event) => {
										const v = event.target.value;
										field.handleChange(v === "" ? 1 : Number.parseInt(v, 10));
									}}
									onBlur={field.handleBlur}
								/>
								{field.state.meta.isTouched ? (
									<FieldError errors={field.state.meta.errors} />
								) : null}
							</Field>
						)}
					</form.AppField>
				</div>
			</>
		);
	},
});
