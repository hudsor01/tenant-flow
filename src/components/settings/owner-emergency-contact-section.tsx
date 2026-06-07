"use client";

import { Phone } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";

import { Button } from "#components/ui/button";
import { CardLayout } from "#components/ui/card-layout";
import { Field, FieldLabel } from "#components/ui/field";
import { Skeleton } from "#components/ui/skeleton";
import {
	useDeleteOwnerEmergencyContactMutation,
	useOwnerEmergencyContact,
	useUpdateOwnerEmergencyContactMutation,
} from "#hooks/api/use-owner-emergency-contact";

interface FormState {
	name: string;
	phone: string;
	relationship: string;
}

const EMPTY_FORM: FormState = { name: "", phone: "", relationship: "" };

export function OwnerEmergencyContactSection() {
	const { data: contact, isLoading } = useOwnerEmergencyContact();
	const updateMutation = useUpdateOwnerEmergencyContactMutation();
	const deleteMutation = useDeleteOwnerEmergencyContactMutation();

	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

	const nameId = useId();
	const relationshipId = useId();
	const phoneId = useId();

	useEffect(() => {
		// Guard against the global refetchOnWindowFocus + onMutate-driven cache
		// writes clobbering the user's typed input mid-edit. Mirrors the
		// precedent at category-delete-dialog.tsx (gates resync on edit-state).
		if (!contact || isEditing) return;
		setFormData({
			name: contact.name ?? "",
			phone: contact.phone ?? "",
			relationship: contact.relationship ?? "",
		});
	}, [contact, isEditing]);

	const hasExistingContact = Boolean(
		contact?.name || contact?.phone || contact?.relationship,
	);

	const handleChange = (field: keyof FormState, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSave = async (e: FormEvent) => {
		e.preventDefault();
		await updateMutation.mutateAsync({
			name: formData.name.trim() || null,
			phone: formData.phone.trim() || null,
			relationship: formData.relationship.trim() || null,
		});
		setIsEditing(false);
	};

	const handleCancel = () => {
		if (contact) {
			setFormData({
				name: contact.name ?? "",
				phone: contact.phone ?? "",
				relationship: contact.relationship ?? "",
			});
		} else {
			setFormData(EMPTY_FORM);
		}
		setIsEditing(false);
	};

	const handleDelete = async () => {
		await deleteMutation.mutateAsync();
		setFormData(EMPTY_FORM);
		setIsEditing(false);
	};

	if (isLoading) {
		return (
			<CardLayout
				title="Emergency Contact"
				description="Someone we can contact in case of emergency"
			>
				<div className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-2/3" />
				</div>
			</CardLayout>
		);
	}

	const isSaving = updateMutation.isPending;
	const isDeleting = deleteMutation.isPending;
	const isDisabled = !isEditing || isSaving || isDeleting;

	return (
		<CardLayout
			title="Emergency Contact"
			description="Someone we can contact in case of emergency"
		>
			<form onSubmit={handleSave} className="space-y-6">
				<div className="grid gap-6 md:grid-cols-2">
					<Field>
						<FieldLabel htmlFor={nameId}>Contact Name</FieldLabel>
						<input
							id={nameId}
							type="text"
							className="input w-full"
							placeholder="Full name"
							value={formData.name}
							onChange={(e) => handleChange("name", e.target.value)}
							disabled={isDisabled}
							required={isEditing}
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor={relationshipId}>Relationship</FieldLabel>
						<input
							id={relationshipId}
							type="text"
							className="input w-full"
							placeholder="e.g., Spouse, Parent"
							value={formData.relationship}
							onChange={(e) => handleChange("relationship", e.target.value)}
							disabled={isDisabled}
						/>
					</Field>
				</div>

				<Field>
					<FieldLabel htmlFor={phoneId}>
						<div className="flex items-center gap-2">
							<Phone className="size-4" />
							<span>Phone Number</span>
						</div>
					</FieldLabel>
					<input
						id={phoneId}
						type="tel"
						className="input w-full"
						placeholder="(555) 123-4567"
						value={formData.phone}
						onChange={(e) => handleChange("phone", e.target.value)}
						disabled={isDisabled}
						required={isEditing}
					/>
				</Field>

				{!hasExistingContact && !isEditing ? (
					<p className="text-muted-foreground text-center py-4">
						No emergency contact on file
					</p>
				) : null}

				<div className="flex flex-wrap gap-3">
					{!isEditing ? (
						<>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsEditing(true)}
							>
								{hasExistingContact
									? "Edit Emergency Contact"
									: "Add Emergency Contact"}
							</Button>
							{hasExistingContact ? (
								<Button
									type="button"
									variant="outline"
									onClick={handleDelete}
									disabled={isDeleting}
								>
									{isDeleting ? "Removing…" : "Remove Contact"}
								</Button>
							) : null}
						</>
					) : (
						<>
							<Button type="submit" disabled={isSaving}>
								{isSaving ? "Saving…" : "Save Contact"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={handleCancel}
								disabled={isSaving}
							>
								Cancel
							</Button>
						</>
					)}
				</div>
			</form>
		</CardLayout>
	);
}
