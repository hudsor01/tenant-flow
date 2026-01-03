'use client'

import type { FormEvent } from 'react'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Field, FieldLabel } from '#components/ui/field'
import { Phone } from 'lucide-react'

interface EmergencyContactFormData {
	name: string
	relationship: string
	phone: string
}

interface EmergencyContactSectionProps {
	formData: EmergencyContactFormData
	hasExistingContact: boolean
	isEditing: boolean
	isLoading: boolean
	isSaving: boolean
	onEditToggle: (editing: boolean) => void
	onChange: (field: keyof EmergencyContactFormData, value: string) => void
	onSave: (e: FormEvent) => void
	onCancel: () => void
	onDelete: () => void
}

export function EmergencyContactSection({
	formData,
	hasExistingContact,
	isEditing,
	isLoading,
	isSaving,
	onEditToggle,
	onChange,
	onSave,
	onCancel,
	onDelete
}: EmergencyContactSectionProps) {
	const isDisabled = !isEditing || isLoading || isSaving

	return (
		<CardLayout
			title="Emergency Contact"
			description="Someone we can contact in case of emergency"
		>
			<form onSubmit={onSave} className="space-y-6">
				<div className="grid gap-6 md:grid-cols-2">
					<Field>
						<FieldLabel>Contact Name *</FieldLabel>
						<input
							type="text"
							className="input w-full"
							placeholder="Full name"
							value={formData.name}
							onChange={e => onChange('name', e.target.value)}
							disabled={isDisabled}
							required
						/>
					</Field>

					<Field>
						<FieldLabel>Relationship</FieldLabel>
						<input
							type="text"
							className="input w-full"
							placeholder="e.g., Spouse, Parent"
							value={formData.relationship}
							onChange={e => onChange('relationship', e.target.value)}
							disabled={isDisabled}
						/>
					</Field>
				</div>

				<Field>
					<FieldLabel>
						<div className="flex items-center gap-2">
							<Phone className="size-4" />
							<span>Phone Number *</span>
						</div>
					</FieldLabel>
					<input
						type="tel"
						className="input w-full"
						placeholder="(555) 123-4567"
						value={formData.phone}
						onChange={e => onChange('phone', e.target.value)}
						disabled={isDisabled}
						required
					/>
				</Field>

				{!hasExistingContact && !isEditing && (
					<p className="text-muted text-center py-4">
						No emergency contact on file
					</p>
				)}

				<div className="flex gap-4">
					{!isEditing ? (
						<>
							<Button
								type="button"
								variant="outline"
								onClick={() => onEditToggle(true)}
								disabled={isLoading}
							>
								{hasExistingContact
									? 'Edit Emergency Contact'
									: 'Add Emergency Contact'}
							</Button>
							{hasExistingContact && (
								<Button
									type="button"
									variant="outline"
									onClick={onDelete}
									disabled={isLoading}
								>
									Remove Contact
								</Button>
							)}
						</>
					) : (
						<>
							<Button type="submit" disabled={isLoading || isSaving}>
								{isSaving ? 'Saving...' : 'Save Contact'}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={onCancel}
								disabled={isLoading || isSaving}
							>
								Cancel
							</Button>
						</>
					)}
				</div>
			</form>
		</CardLayout>
	)
}
