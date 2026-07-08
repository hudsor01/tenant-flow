"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Phone, Save, User } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import { CardLayout } from "#components/ui/card-layout";
import { Field, FieldError, FieldLabel } from "#components/ui/field";
import { InputGroup, InputGroupInput } from "#components/ui/input-group";
import { tenantQueries } from "#hooks/api/query-keys/tenant-keys";
import { useUpdateTenantMutation } from "#hooks/api/use-tenant-mutations";
import { useAppForm } from "#lib/forms/form-hook";
import { handleMutationError } from "#lib/mutation-error-handler";
import { tenantEmergencyContactEditSchema } from "#lib/validation/tenants";

export interface TenantEditFormProps {
	id: string;
}

export function TenantEditForm({ id }: TenantEditFormProps) {
	const { data: tenant } = useSuspenseQuery(tenantQueries.detail(id));
	const router = useRouter();
	const updateMutation = useUpdateTenantMutation();

	const form = useAppForm({
		defaultValues: {
			emergency_contact_name: tenant?.emergency_contact_name || "",
			emergency_contact_phone: tenant?.emergency_contact_phone || "",
			emergency_contact_relationship:
				tenant?.emergency_contact_relationship || "",
		},
		onSubmit: async ({ value }) => {
			try {
				const updateData = {
					emergency_contact_name: value.emergency_contact_name,
					emergency_contact_phone: value.emergency_contact_phone,
					emergency_contact_relationship: value.emergency_contact_relationship,
				};
				await updateMutation.mutateAsync({ id, data: updateData });
				toast.success("Tenant updated successfully");
				router.push(`/tenants/${id}`);
			} catch (error) {
				handleMutationError(error, "Update tenant");
			}
		},
		validators: { onChange: tenantEmergencyContactEditSchema },
	});

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		form.handleSubmit();
	};

	const footer = (
		<div className="flex justify-end gap-4 pt-6 border-t">
			<Button type="button" variant="outline" onClick={() => router.back()}>
				Cancel
			</Button>
			<Button
				type="submit"
				disabled={updateMutation.isPending}
				className="flex items-center gap-2"
			>
				<Save className="size-4" />
				{updateMutation.isPending ? "Saving..." : "Save Changes"}
			</Button>
		</div>
	);

	return (
		<CardLayout
			title="Edit Tenant Information"
			description="Update emergency contact information"
			footer={footer}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<form.AppField name="emergency_contact_name">
					{(field) => (
						<field.IconInputField
							label="Emergency Contact Name"
							icon={User}
							placeholder="John Doe"
						/>
					)}
				</form.AppField>

				<form.AppField name="emergency_contact_phone">
					{(field) => (
						<field.IconInputField
							label="Emergency Contact Phone"
							icon={Phone}
							type="tel"
							placeholder="(555) 123-4567"
						/>
					)}
				</form.AppField>

				{/* Relationship has no leading icon — InputGroup kept inline. */}
				<form.AppField name="emergency_contact_relationship">
					{(field) => (
						<Field>
							<FieldLabel htmlFor="emergency_contact_relationship">
								Relationship
							</FieldLabel>
							<InputGroup>
								<InputGroupInput
									id="emergency_contact_relationship"
									value={field.state.value}
									onChange={(e: ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
									placeholder="e.g., Mother, Spouse, Friend"
								/>
							</InputGroup>
							{field.state.meta.isTouched ? (
								<FieldError errors={field.state.meta.errors} />
							) : null}
						</Field>
					)}
				</form.AppField>
			</form>
		</CardLayout>
	);
}
