/**
 * Tenant Form Fields Component
 *
 * Server component that renders all form fields for tenant creation/editing.
 * Uses consistent form patterns and field validation.
 */

import React from 'react'
import type { CreateTenantInput, UpdateTenantInput } from '@repo/shared'

// ============================================================================
// FORM FIELDS COMPONENT
// ============================================================================

interface TenantFormFieldsProps {
	formData: CreateTenantInput | UpdateTenantInput
	errors: Record<string, string>
	isEditing: boolean
	onChange: (field: string, value: string) => void
}

export function TenantFormFields({
	formData,
	errors,
	isEditing,
	onChange
}: TenantFormFieldsProps) {
	return (
		<div className="space-y-6">
			{/* Basic Information Section */}
			<div className="space-y-4">
				<h3 className="text-lg font-medium">Basic Information</h3>
				<p className="text-sm text-gray-600">
					Primary tenant details and contact information
				</p>

				<div className="space-y-4">
					<div>
						<label
							htmlFor="name"
							className="block text-sm font-medium text-gray-700"
						>
							Full Name *
						</label>
						<input
							id="name"
							name="name"
							type="text"
							value={formData.name || ''}
							onChange={e => onChange('name', e.target.value)}
							placeholder="Enter tenant's full name"
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
							required
						/>
						{errors.name && (
							<p className="mt-1 text-sm text-red-600">
								{errors.name}
							</p>
						)}
					</div>

					<div>
						<label
							htmlFor="email"
							className="block text-sm font-medium text-gray-700"
						>
							Email Address *
						</label>
						<input
							id="email"
							name="email"
							type="email"
							value={formData.email || ''}
							onChange={e => onChange('email', e.target.value)}
							placeholder="tenant@example.com"
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
							required
						/>
						{errors.email && (
							<p className="mt-1 text-sm text-red-600">
								{errors.email}
							</p>
						)}
						<p className="mt-1 text-sm text-gray-500">
							Used for notifications and portal access
						</p>
					</div>

					<div>
						<label
							htmlFor="phone"
							className="block text-sm font-medium text-gray-700"
						>
							Phone Number
						</label>
						<input
							id="phone"
							name="phone"
							type="tel"
							value={formData.phone || ''}
							onChange={e => onChange('phone', e.target.value)}
							placeholder="(555) 123-4567"
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
						/>
						{errors.phone && (
							<p className="mt-1 text-sm text-red-600">
								{errors.phone}
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Emergency Contact Section */}
			<div className="space-y-4">
				<h3 className="text-lg font-medium">Emergency Contact</h3>
				<p className="text-sm text-gray-600">
					Emergency contact information for urgent situations
				</p>

				<div className="space-y-4">
					<div>
						<label
							htmlFor="emergencyContact"
							className="block text-sm font-medium text-gray-700"
						>
							Emergency Contact Name
						</label>
						<input
							id="emergencyContact"
							name="emergencyContact"
							type="text"
							value={formData.emergencyContact || ''}
							onChange={e =>
								onChange('emergencyContact', e.target.value)
							}
							placeholder="Contact person's full name"
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
						/>
						{errors.emergencyContact && (
							<p className="mt-1 text-sm text-red-600">
								{errors.emergencyContact}
							</p>
						)}
					</div>

					<div>
						<label
							htmlFor="emergencyPhone"
							className="block text-sm font-medium text-gray-700"
						>
							Emergency Phone Number
						</label>
						<input
							id="emergencyPhone"
							name="emergencyPhone"
							type="tel"
							value={formData.emergencyPhone || ''}
							onChange={e =>
								onChange('emergencyPhone', e.target.value)
							}
							placeholder="(555) 987-6543"
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
						/>
						{errors.emergencyPhone && (
							<p className="mt-1 text-sm text-red-600">
								{errors.emergencyPhone}
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Lease Timeline Section */}
			<div className="space-y-4">
				<h3 className="text-lg font-medium">Lease Timeline</h3>
				<p className="text-sm text-gray-600">
					Important dates for tenancy
				</p>

				<div className="space-y-4">
					<div>
						<label
							htmlFor="moveInDate"
							className="block text-sm font-medium text-gray-700"
						>
							Move-in Date
						</label>
						<input
							id="moveInDate"
							name="moveInDate"
							type="date"
							value={formData.moveInDate || ''}
							onChange={e =>
								onChange('moveInDate', e.target.value)
							}
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
						/>
						{errors.moveInDate && (
							<p className="mt-1 text-sm text-red-600">
								{errors.moveInDate}
							</p>
						)}
					</div>

					{isEditing && (
						<div>
							<label
								htmlFor="moveOutDate"
								className="block text-sm font-medium text-gray-700"
							>
								Move-out Date
							</label>
							<input
								id="moveOutDate"
								name="moveOutDate"
								type="date"
								value={
									typeof (formData as UpdateTenantInput)
										.moveOutDate === 'string'
										? (formData as UpdateTenantInput)
												.moveOutDate || ''
										: ''
								}
								onChange={e =>
									onChange('moveOutDate', e.target.value)
								}
								className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
							/>
							{errors.moveOutDate && (
								<p className="mt-1 text-sm text-red-600">
									{errors.moveOutDate}
								</p>
							)}
							<p className="mt-1 text-sm text-gray-500">
								Leave empty if tenant is still active
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Additional Notes Section */}
			<div className="space-y-4">
				<h3 className="text-lg font-medium">Additional Information</h3>
				<p className="text-sm text-gray-600">
					Any additional notes about the tenant
				</p>

				<div>
					<label
						htmlFor="notes"
						className="block text-sm font-medium text-gray-700"
					>
						Notes
					</label>
					<textarea
						id="notes"
						name="notes"
						value={formData.notes || ''}
						onChange={e => onChange('notes', e.target.value)}
						placeholder="Any additional information about the tenant..."
						rows={4}
						className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
					/>
					{errors.notes && (
						<p className="mt-1 text-sm text-red-600">
							{errors.notes}
						</p>
					)}
					<p className="mt-1 text-sm text-gray-500">
						Optional: Special requirements, preferences, or
						important notes
					</p>
				</div>
			</div>
		</div>
	)
}
