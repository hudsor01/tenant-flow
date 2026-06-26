"use client";

import { withForm } from "#lib/forms/form-hook";
import type { TenantWithLeaseInfo } from "#types/core";
import { leaseFormOptions } from "./lease-form-options";

export const LeaseFormTenantDateFields = withForm({
	...leaseFormOptions,
	props: { tenants: [] as TenantWithLeaseInfo[] },
	render: function LeaseFormTenantDateFields({ form, tenants }) {
		const tenantOptions = tenants.map((tenant) => ({
			value: tenant.id,
			label: tenant.name ?? tenant.email ?? "",
		}));
		return (
			<>
				<form.AppField name="primary_tenant_id">
					{(field) => (
						<field.SelectField
							label="Primary Tenant *"
							placeholder="Select tenant"
							options={tenantOptions}
						/>
					)}
				</form.AppField>

				<div className="grid gap-4 md:grid-cols-2">
					<form.AppField name="start_date">
						{(field) => <field.DateField label="Start Date *" />}
					</form.AppField>

					<form.AppField name="end_date">
						{(field) => <field.DateField label="End Date *" />}
					</form.AppField>
				</div>
			</>
		);
	},
});
