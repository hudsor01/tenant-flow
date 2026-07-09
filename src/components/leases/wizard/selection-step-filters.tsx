"use client";

import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import { useCreateTenantMutation } from "#hooks/api/use-tenant-mutations";
import { createLogger } from "#lib/frontend-logger";
import type { TenantCreate } from "#lib/validation/tenants";

const logger = createLogger({ component: "InlineTenantCreate" });

interface InlineFormData {
	first_name: string;
	last_name: string;
	email: string;
	phone: string;
}

interface InlineTenantCreateProps {
	propertyId: string | undefined;
	onToggleMode: () => void;
}

/**
 * Inline "add tenant" sub-form for the lease selection step.
 * Lets the landlord quickly create a tenant record without leaving the wizard.
 */
export function InlineTenantCreate({
	propertyId: _propertyId,
	onToggleMode,
}: InlineTenantCreateProps) {
	const [form, setForm] = useState<InlineFormData>({
		first_name: "",
		last_name: "",
		email: "",
		phone: "",
	});
	const createTenant = useCreateTenantMutation();
	const isSubmitting = createTenant.isPending;

	const handleAddTenant = async () => {
		if (!form.first_name || !form.last_name || !form.email) return;

		try {
			const payload: TenantCreate = {
				email: form.email,
				first_name: form.first_name,
				last_name: form.last_name,
				name: `${form.first_name} ${form.last_name}`.trim(),
				...(form.phone ? { phone: form.phone } : {}),
			};

			await createTenant.mutateAsync(payload);

			// FORMFIX-08: useCreateTenantMutation's createMutationCallbacks fires the
			// single success toast ("Tenant created successfully") — no form-level
			// duplicate ("Tenant added") on top of it.
			onToggleMode();
			setForm({ first_name: "", last_name: "", email: "", phone: "" });
		} catch (error) {
			// FORMFIX-08: the mutation's onError surfaces the single error toast; only
			// log here to avoid a duplicate.
			logger.error("Inline tenant create failed", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};

	const isFormValid = form.first_name && form.last_name && form.email;

	return (
		<div className="space-y-3 rounded-md border border-border p-4">
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1">
					<Label htmlFor="invite_first_name">First Name *</Label>
					<Input
						id="invite_first_name"
						value={form.first_name}
						onChange={(e) =>
							setForm((f) => ({ ...f, first_name: e.target.value }))
						}
						placeholder="Jane"
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor="invite_last_name">Last Name *</Label>
					<Input
						id="invite_last_name"
						value={form.last_name}
						onChange={(e) =>
							setForm((f) => ({ ...f, last_name: e.target.value }))
						}
						placeholder="Doe"
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1">
					<Label htmlFor="invite_email">Email *</Label>
					<Input
						id="invite_email"
						type="email"
						value={form.email}
						onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
						placeholder="jane@example.com"
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor="invite_phone">Phone</Label>
					<Input
						id="invite_phone"
						type="tel"
						value={form.phone}
						onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
						placeholder="(555) 123-4567"
					/>
				</div>
			</div>
			<Button
				type="button"
				size="sm"
				onClick={handleAddTenant}
				disabled={!isFormValid || isSubmitting}
			>
				{isSubmitting ? (
					<>
						<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
						Adding...
					</>
				) : (
					<>
						<UserPlus className="mr-2 h-3.5 w-3.5" />
						Add Tenant
					</>
				)}
			</Button>
		</div>
	);
}

export function TenantModeToggle({
	inviteMode,
	onToggle,
}: {
	inviteMode: boolean;
	onToggle: () => void;
}) {
	return (
		<Button type="button" variant="ghost" size="sm" onClick={onToggle}>
			{inviteMode ? (
				"Existing Tenant"
			) : (
				<>
					<UserPlus className="mr-1.5 h-3.5 w-3.5" />
					Add New Tenant
				</>
			)}
		</Button>
	);
}
