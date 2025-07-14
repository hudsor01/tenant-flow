import React from 'react'
import type { UseFormReturn, FieldArrayWithId } from 'react-hook-form'
import { Plus, Minus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LeaseGeneratorFormData } from '@/hooks/useLeaseGeneratorForm'

interface PartiesInfoSectionProps {
	form: UseFormReturn<LeaseGeneratorFormData>
	tenantFields: FieldArrayWithId<
		LeaseGeneratorFormData,
		'tenantNames',
		'id'
	>[]
	addTenant: () => void
	removeTenant: (index: number) => void
}

/**
 * Parties information section for lease generator
 * Handles landlord info and dynamic tenant list management
 */
export function PartiesInfoSection({
	form,
	tenantFields,
	addTenant,
	removeTenant
}: PartiesInfoSectionProps) {
	return (
		<div className="space-y-6">
			{/* Landlord Information */}
			<Card>
				<CardHeader>
					<CardTitle>Landlord Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<Label htmlFor="landlordName">Full Name *</Label>
							<Input
								id="landlordName"
								placeholder="John Smith"
								{...form.register('landlordName')}
							/>
							{form.formState.errors.landlordName && (
								<p className="text-destructive text-sm">
									{form.formState.errors.landlordName.message}
								</p>
							)}
						</div>

						<div>
							<Label htmlFor="landlordEmail">
								Email Address *
							</Label>
							<Input
								id="landlordEmail"
								type="email"
								placeholder="john@example.com"
								{...form.register('landlordEmail')}
							/>
							{form.formState.errors.landlordEmail && (
								<p className="text-destructive text-sm">
									{
										form.formState.errors.landlordEmail
											.message
									}
								</p>
							)}
						</div>

						<div>
							<Label htmlFor="landlordPhone">Phone Number</Label>
							<Input
								id="landlordPhone"
								placeholder="(555) 123-4567"
								{...form.register('landlordPhone')}
							/>
						</div>

						<div className="md:col-span-1">
							<Label htmlFor="landlordAddress">
								Mailing Address *
							</Label>
							<Input
								id="landlordAddress"
								placeholder="456 Oak Avenue, Springfield, IL 62702"
								{...form.register('landlordAddress')}
							/>
							{form.formState.errors.landlordAddress && (
								<p className="text-destructive text-sm">
									{
										form.formState.errors.landlordAddress
											.message
									}
								</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Tenant Information */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						Tenant Information
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addTenant}
						>
							<Plus className="mr-1 h-4 w-4" />
							Add Tenant
						</Button>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{tenantFields.map((field, index) => (
						<div key={field.id} className="flex gap-2">
							<div className="flex-1">
								<Label htmlFor={`tenantNames.${index}`}>
									Tenant {index + 1} Full Name *
								</Label>
								<Input
									placeholder="Jane Doe"
									{...form.register(
										`tenantNames.${index}` as const
									)}
								/>
								{form.formState.errors.tenantNames?.[index] && (
									<p className="text-destructive text-sm">
										{
											form.formState.errors.tenantNames[
												index
											]?.message
										}
									</p>
								)}
							</div>
							{tenantFields.length > 1 && (
								<Button
									type="button"
									variant="outline"
									size="icon"
									onClick={() => removeTenant(index)}
									className="mt-6"
								>
									<Minus className="h-4 w-4" />
								</Button>
							)}
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	)
}
