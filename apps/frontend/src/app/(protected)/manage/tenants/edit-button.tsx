'use client'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { useTenantOperations } from '@/hooks/api/use-tenant'
import type { FormFieldApi } from '@/lib/form-types'
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
	Trash2,
	User
} from 'lucide-react'
import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'

interface TenantActionButtonsProps {
	tenant: TenantWithLeaseInfo
}

export function TenantEditViewButtons({
	tenant
}: TenantActionButtonsProps): React.ReactNode {
	const [viewOpen, setViewOpen] = useState<boolean>(false)
	const [editOpen, setEditOpen] = useState<boolean>(false)
	const { updateTenant, deleteTenant } = useTenantOperations()

	const form = useForm({
		defaultValues: {
			email: tenant.email || '',
			phone: tenant.phone || '',
			emergencyContact: tenant.emergencyContact || '',
			firstName: tenant.name?.split(' ')[0] || '',
			lastName: tenant.name?.split(' ').slice(1).join(' ') || ''
		},
		onSubmit: async ({ value }) => {
			updateTenant.mutate({ id: tenant.id, data: value })
		},
		validators: {
			onChange: ({ value }) => {
				const result = tenantUpdateSchema.safeParse(value)
				if (!result.success) {
					return result.error.format()
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
				<Eye className="w-4 h-4" />
				View
			</Button>

			{/* Edit Button & Dialog */}
			<Button
				variant="outline"
				size="sm"
				onClick={(): void => setEditOpen(true)}
			>
				<Edit className="w-4 h-4" />
				Edit
			</Button>

			{/* Delete Button & Dialog */}
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="text-destructive hover:text-destructive"
					>
						<Trash2 className="w-4 h-4" />
						Delete
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Tenant</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{tenant.name}"? This action
							cannot be undone and will remove all associated data including
							leases and payment records.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(): void => deleteTenant.mutate(tenant.id)}
							disabled={deleteTenant.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteTenant.isPending ? 'Deleting...' : 'Delete Tenant'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Edit Dialog */}
			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="text-gradient">Edit Tenant</DialogTitle>
					</DialogHeader>

					<form
						onSubmit={(e: FormEvent<HTMLFormElement>): void => {
							e.preventDefault()
							form.handleSubmit()
						}}
						className="space-y-4"
					>
						<div className="grid grid-cols-2 gap-4">
							<form.Field name="firstName">
								{(field: FormFieldApi<string>) => {
									const f = field
									return (
										<Field>
											<FieldLabel>First Name</FieldLabel>
											<input
												value={String(f.state.value ?? '')}
												onChange={(e: ChangeEvent<HTMLInputElement>) =>
													f.handleChange(e.target.value)
												}
												onBlur={f.handleBlur}
												type="text"
												placeholder="John"
												className="input"
											/>
											<FieldError
												errors={
													Array.isArray(f.state.meta.errors)
														? f.state.meta.errors.map((m: unknown) => ({
																message: String(m)
															}))
														: undefined
												}
											/>
										</Field>
									)
								}}
							</form.Field>

							<form.Field name="lastName">
								{(field: FormFieldApi<string>) => {
									const f = field
									return (
										<Field>
											<FieldLabel>Last Name</FieldLabel>
											<input
												value={String(f.state.value ?? '')}
												onChange={(e: ChangeEvent<HTMLInputElement>) =>
													f.handleChange(e.target.value)
												}
												onBlur={f.handleBlur}
												type="text"
												placeholder="Smith"
												className="input"
											/>
											<FieldError
												errors={
													Array.isArray(f.state.meta.errors)
														? f.state.meta.errors.map((m: unknown) => ({
																message: String(m)
															}))
														: undefined
												}
											/>
										</Field>
									)
								}}
							</form.Field>
						</div>

						<form.Field name="email">
							{(field: FormFieldApi<string>) => {
								const f = field
								return (
									<Field>
										<FieldLabel>Email Address</FieldLabel>
										<input
											value={String(f.state.value ?? '')}
											onChange={(e: ChangeEvent<HTMLInputElement>) =>
												f.handleChange(e.target.value)
											}
											onBlur={f.handleBlur}
											type="email"
											placeholder="john.smith@example.com"
											className="input"
										/>
										<FieldError
											errors={
												Array.isArray(f.state.meta.errors)
													? f.state.meta.errors.map((m: unknown) => ({
															message: String(m)
														}))
													: undefined
											}
										/>
									</Field>
								)
							}}
						</form.Field>

						<form.Field name="phone">
							{(field: FormFieldApi<string>) => {
								const f = field
								return (
									<Field>
										<FieldLabel>Phone Number</FieldLabel>
										<input
											value={String(f.state.value ?? '')}
											onChange={(e: ChangeEvent<HTMLInputElement>) =>
												f.handleChange(e.target.value)
											}
											onBlur={f.handleBlur}
											type="text"
											placeholder="(555) 123-4567"
											className="input"
										/>
										<FieldError
											errors={
												Array.isArray(f.state.meta.errors)
													? f.state.meta.errors.map((m: unknown) => ({
															message: String(m)
														}))
													: undefined
											}
										/>
									</Field>
								)
							}}
						</form.Field>

						<form.Field name="emergencyContact">
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
										<FieldError
											errors={
												Array.isArray(f.state.meta.errors)
													? f.state.meta.errors.map((m: unknown) => ({
															message: String(m)
														}))
													: undefined
											}
										/>
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
							<User className="w-5 h-5" />
							{tenant.name}
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-6">
						{/* Contact Information */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<Mail className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="font-medium">{tenant.email}</p>
									<p className="text-sm text-muted-foreground">Email Address</p>
								</div>
							</div>

							{tenant.phone && (
								<div className="flex items-center gap-2">
									<Phone className="w-4 h-4 text-muted-foreground" />
									<div>
										<p className="font-medium">{tenant.phone}</p>
										<p className="text-sm text-muted-foreground">
											Phone Number
										</p>
									</div>
								</div>
							)}

							{tenant.emergencyContact && (
								<div className="flex items-start gap-2">
									<Phone className="w-4 h-4 text-muted-foreground mt-1" />
									<div>
										<p className="font-medium">Emergency Contact</p>
										<p className="text-sm text-muted-foreground">
											{tenant.emergencyContact}
										</p>
									</div>
								</div>
							)}
						</div>

						{/* Property & Lease Information */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<MapPin className="w-4 h-4 text-muted-foreground" />
									<span className="text-sm font-medium">Property</span>
								</div>
								<span className="text-sm text-muted-foreground">
									{tenant.property?.name || 'No Property Assigned'}
								</span>
							</div>

							{tenant.currentLease && (
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<CreditCard className="w-4 h-4 text-muted-foreground" />
										<span className="text-sm font-medium">Monthly Rent</span>
									</div>
									<span className="text-sm text-muted-foreground">
										$
										{tenant.currentLease?.rentAmount?.toLocaleString?.() ?? '0'}
									</span>
								</div>
							)}

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Calendar className="w-4 h-4 text-muted-foreground" />
									<span className="text-sm font-medium">Tenant Since</span>
								</div>
								<span className="text-sm text-muted-foreground">
									{tenant.createdAt
										? new Date(tenant.createdAt).toLocaleDateString()
										: 'Unknown'}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<User className="w-4 h-4 text-muted-foreground" />
									<span className="text-sm font-medium">Status</span>
								</div>
								<Badge
									style={{
										backgroundColor: 'var(--chart-1)',
										color: 'hsl(var(--primary-foreground))'
									}}
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
