"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Phone, Save, User } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, SubmitEvent } from "react";
import { useId } from "react";
import { Button } from "#components/ui/button";
import { CardLayout } from "#components/ui/card-layout";
import { Field, FieldError, FieldLabel } from "#components/ui/field";
import { InputGroup, InputGroupInput } from "#components/ui/input-group";
import { tenantQueries } from "#hooks/api/query-keys/tenant-keys";
import { useUpdateTenantMutation } from "#hooks/api/use-tenant-mutations";
import { useIsClient } from "#hooks/use-is-client";
import { useAppForm } from "#lib/forms/form-hook";
import { createLogger } from "#lib/frontend-logger";
import { tenantEmergencyContactEditSchema } from "#lib/validation/tenants";
import { TenantEditFormSkeleton } from "./tenant-edit-form-skeleton";

const logger = createLogger({ component: "TenantEditForm" });

export interface TenantEditFormProps {
	id: string;
}

export function TenantEditForm(props: TenantEditFormProps) {
	// Owner data loads in the browser only: rendered on the server, the
	// suspense query below would run there without a session (useIsClient).
	const isClient = useIsClient();
	if (!isClient) return <TenantEditFormSkeleton />;
	return <TenantEditFormContent {...props} />;
}

function TenantEditFormContent({ id }: TenantEditFormProps) {
	const { data: tenant } = useSuspenseQuery(tenantQueries.detail(id));
	const router = useRouter();
	const updateMutation = useUpdateTenantMutation();
	// CardLayout renders `footer` in its CardFooter, outside the <form> below, so
	// the Save button names the form it submits (the HTML `form` attribute).
	const formId = useId();

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
				// FORMFIX-08: useUpdateTenantMutation's createMutationCallbacks fires the
				// single success toast; no form-level duplicate.
				router.push(`/tenants/${id}`);
			} catch (error) {
				// FORMFIX-08: the mutation's onError surfaces the single error toast; only log.
				logger.error("Update tenant failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		},
		validators: { onChange: tenantEmergencyContactEditSchema },
	});

	const handleSubmit = (e: SubmitEvent) => {
		e.preventDefault();
		form.handleSubmit();
	};

	// w-full: CardFooter is a flex row, so without it this row shrank to its
	// buttons (237.5px at the footer's left edge), its justify-end did nothing
	// and its rule ran under the buttons only.
	const footer = (
		<div className="flex w-full justify-end gap-4 pt-6 border-t">
			<Button type="button" variant="outline" onClick={() => router.back()}>
				Cancel
			</Button>
			<Button
				type="submit"
				form={formId}
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
			<form id={formId} onSubmit={handleSubmit} className="space-y-6">
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
