'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { ButtonGroup } from '#components/ui/button-group'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import { useTenantOperations } from '#hooks/api/use-tenant'
import type { FormFieldApi } from '@repo/shared/types/forms'
import type { TenantWithLeaseInfo } from '@repo/shared/types/relations'
import { tenantUpdateSchema } from '@repo/shared/validation/tenants'
import { useForm } from '@tanstack/react-form'
import {
	Calendar,
	CreditCard,
	Edit,
	Eye,
	Mail,
	MapPin,
	Phone,
	User
} from 'lucide-react'
import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'
import { z } from 'zod'

interface TenantActionButtonsProps {
	tenant: TenantWithLeaseInfo
}

export function TenantEditViewButtons({
	tenant
}: TenantActionButtonsProps): React.ReactNode {
	const [viewOpen, setViewOpen] = useState<boolean>(false)
	const [editOpen, setEditOpen] = useState<boolean>(false)
	const { updateTenant } = useTenantOperations()
	// NOTE: This component is orphaned and not used anywhere. Delete functionality removed.
	// DELETE operations now use React 19 useOptimistic with Server Actions

	const form = useForm({
		defaultValues: {
			emergency_contact_name: tenant.emergency_contact_name || ''
		},
		onSubmit: async ({ value }) => {
			updateTenant.mutate({ id: tenant.id, data: value })
		},
		validators: {
			onChange: ({ value }) => {
				const result = tenantUpdateSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	return (
		<ButtonGroup>
			{/* View Button & Dialog */}
			<Button
				variant="outline"
				size="sm"
				onClick={(): void => setViewOpen(true)}
			>
				<Eye className="size-4" />
				View
			</Button>

			{/* Edit Button & Dialog */}
			<Button
				variant="outline"
				size="sm"
				onClick={(): void => setEditOpen(true)}
			>
				<Edit className="size-4" />
				Edit
			</Button>

			{/* Delete Button - Removed: This component is orphaned.
			    DELETE operations now use React 19 useOptimistic with Server Actions */}

			{/* Edit Dialog */}
			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="text-foreground">Edit Tenant</DialogTitle>
					</DialogHeader>

					<form
						onSubmit={(e: FormEvent<HTMLFormElement>): void => {
							e.preventDefault()
							form.handleSubmit()
						}}
						className="space-y-4"
					>


						<form.Field name="emergency_contact_name">
							{(field: FormFieldApi<string>) => {
								const f = field
								return (
									<Field>
										<FieldLabel>Emergency Contact</FieldLabel>
										<textarea
											value={String(f.state.value ?? '')}
											onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
												f.handleChange(e.target.value)
											}
											onBlur={f.handleBlur}
											placeholder="Emergency contact information..."
											className="textarea"
										/>
										{Array.isArray(f.state.meta.errors) &&
											f.state.meta.errors.length > 0 && (
												<FieldError>
													{String(f.state.meta.errors[0])}
												</FieldError>
											)}
									</Field>
								)
							}}
						</form.Field>

						<div className="flex justify-end pt-2">
							<ButtonGroup>
								<Button
									type="button"
									variant="outline"
									onClick={() => setEditOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={updateTenant.isPending}>
									{updateTenant.isPending ? 'Updating...' : 'Update Tenant'}
								</Button>
							</ButtonGroup>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* View Dialog */}
			<Dialog open={viewOpen} onOpenChange={setViewOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<User className="size-5" />
							{tenant.first_name} {tenant.last_name}
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-6">
						{/* Contact Information */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<Mail className="size-4 text-muted-foreground" />
								<div>
									<p className="font-medium">{tenant.email}</p>
									<p className="text-sm text-muted-foreground">Email Address</p>
								</div>
							</div>

							{tenant.phone && (
								<div className="flex items-center gap-2">
									<Phone className="size-4 text-muted-foreground" />
									<div>
										<p className="font-medium">{tenant.phone}</p>
										<p className="text-sm text-muted-foreground">
											Phone Number
										</p>
									</div>
								</div>
							)}

							{tenant.emergency_contact_name && (
								<div className="flex items-start gap-2">
									<Phone className="size-4 text-muted-foreground mt-1" />
									<div>
										<p className="font-medium">Emergency Contact</p>
										<p className="text-sm text-muted-foreground">
											{tenant.emergency_contact_name}
										</p>
									</div>
								</div>
							)}
						</div>

						{/* Property & Lease Information */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<MapPin className="size-4 text-muted-foreground" />
									<span className="text-sm font-medium">Property</span>
								</div>
								<span className="text-sm text-muted-foreground">
									{tenant.property?.name || 'No Property Assigned'}
								</span>
							</div>

							{tenant.currentLease && (
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<CreditCard className="size-4 text-muted-foreground" />
										<span className="text-sm font-medium">Monthly Rent</span>
									</div>
									<span className="text-sm text-muted-foreground">
										$
										{tenant.currentLease?.rent_amount?.toLocaleString?.() ?? '0'}
									</span>
								</div>
							)}

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Calendar className="size-4 text-muted-foreground" />
									<span className="text-sm font-medium">Tenant Since</span>
								</div>
								<span className="text-sm text-muted-foreground">
									{tenant.created_at
										? new Date(tenant.created_at).toLocaleDateString()
										: 'Unknown'}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<User className="size-4 text-muted-foreground" />
									<span className="text-sm font-medium">Status</span>
								</div>
								<Badge
								className="bg-(--chart-1) text-[var(--primary-foreground)]"
							>
									Active
								</Badge>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex justify-end pt-4 border-t">
							<ButtonGroup>
								<Button variant="outline" onClick={() => setViewOpen(false)}>
									Close
								</Button>
								<Button
									onClick={() => {
										setViewOpen(false)
										setEditOpen(true)
									}}
								>
									Edit Tenant
								</Button>
							</ButtonGroup>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</ButtonGroup>
	)
}
