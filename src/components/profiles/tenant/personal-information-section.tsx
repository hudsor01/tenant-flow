"use client";

import { Mail, Phone } from "lucide-react";
import { type FormEvent, useId } from "react";
import { Button } from "#components/ui/button";
import { CardLayout } from "#components/ui/card-layout";
import { Field, FieldLabel } from "#components/ui/field";

interface PersonalInfoFormData {
	first_name: string;
	last_name: string;
	email: string;
	phone: string;
}

interface PersonalInformationSectionProps {
	formData: PersonalInfoFormData;
	isEditing: boolean;
	isLoading: boolean;
	onEditToggle: (editing: boolean) => void;
	onChange: (field: keyof PersonalInfoFormData, value: string) => void;
	onSave: (e: FormEvent) => void;
	onCancel: () => void;
}

export function PersonalInformationSection({
	formData,
	isEditing,
	isLoading,
	onEditToggle,
	onChange,
	onSave,
	onCancel,
}: PersonalInformationSectionProps) {
	const firstNameId = useId();
	const lastNameId = useId();
	const emailId = useId();
	const phoneId = useId();

	return (
		<CardLayout
			title="Personal Information"
			description="Your basic contact details"
		>
			<form onSubmit={onSave} className="space-y-6">
				<div className="grid gap-6 md:grid-cols-2">
					<Field>
						<FieldLabel htmlFor={firstNameId}>First Name *</FieldLabel>
						<input
							id={firstNameId}
							type="text"
							className="input w-full"
							value={formData.first_name}
							onChange={(e) => onChange("first_name", e.target.value)}
							disabled={!isEditing || isLoading}
							required
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor={lastNameId}>Last Name *</FieldLabel>
						<input
							id={lastNameId}
							type="text"
							className="input w-full"
							value={formData.last_name}
							onChange={(e) => onChange("last_name", e.target.value)}
							disabled={!isEditing || isLoading}
							required
						/>
					</Field>
				</div>

				<Field>
					<FieldLabel htmlFor={emailId}>
						<div className="flex items-center gap-2">
							<Mail className="size-4" />
							<span>Email Address *</span>
						</div>
					</FieldLabel>
					<input
						id={emailId}
						type="email"
						className="input w-full"
						value={formData.email}
						disabled
						required
					/>
					<p className="text-muted-foreground mt-1">
						Email cannot be changed. Contact support if needed.
					</p>
				</Field>

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
						onChange={(e) => onChange("phone", e.target.value)}
						disabled={!isEditing || isLoading}
					/>
				</Field>

				<div className="flex gap-4 pt-4">
					{!isEditing ? (
						<Button
							type="button"
							onClick={() => onEditToggle(true)}
							disabled={isLoading}
						>
							Edit Profile
						</Button>
					) : (
						<>
							<Button type="submit" disabled={isLoading}>
								{isLoading ? "Saving..." : "Save Changes"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={onCancel}
								disabled={isLoading}
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
