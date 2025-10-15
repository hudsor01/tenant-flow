'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { useCreateTenant } from '@/hooks/api/use-tenant'
import {
	useTenantFieldTransformers,
	useTenantForm
} from '@/hooks/use-tenant-form'
import { Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface AddTenantDialogProps {
	open?: boolean
	onOpenChange?: (open: boolean) => void
	showTrigger?: boolean
}

export function AddTenantDialog({
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	showTrigger = true
}: AddTenantDialogProps = {}) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false)

	// Use controlled state if provided, otherwise fall back to uncontrolled
	const open = controlledOpen ?? uncontrolledOpen
	const setOpen = controlledOnOpenChange ?? setUncontrolledOpen

	// Use enhanced hooks with field transformers
	const form = useTenantForm()
	const { normalizeEmail, formatPhoneNumber } = useTenantFieldTransformers()

	const createTenant = useCreateTenant()

	const handleSubmit = async (value: typeof form.state.values) => {
		try {
			await createTenant.mutateAsync(value)
			toast.success('Tenant created successfully')
			setOpen(false)
			form.reset()
		} catch (error) {
			toast.error(
				`Failed to create tenant: ${error instanceof Error ? error.message : 'Unknown error'}`
			)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{showTrigger && (
				<DialogTrigger asChild>
					<Button variant="default" className="flex items-center gap-2">
						<Users className="size-4" />
						Add Tenant
					</Button>
				</DialogTrigger>
			)}
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add New Tenant</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={e => {
						e.preventDefault()
						handleSubmit(form.state.values)
					}}
					className="space-y-4"
				>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="firstName">
							{field => (
								<Field>
									<FieldLabel>First Name</FieldLabel>
									<input
										value={field.state.value || ''}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										type="text"
										placeholder="John"
										required
										className="input"
									/>
									<FieldError>
										{String(field.state.meta.errors?.[0] ?? '')}
									</FieldError>
								</Field>
							)}
						</form.Field>

						<form.Field name="lastName">
							{field => (
								<Field>
									<FieldLabel>Last Name</FieldLabel>
									<input
										value={field.state.value || ''}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										type="text"
										placeholder="Doe"
										required
										className="input"
									/>
									<FieldError>
										{String(field.state.meta.errors?.[0] ?? '')}
									</FieldError>
								</Field>
							)}
						</form.Field>
					</div>

					<form.Field name="email">
						{field => (
							<Field>
								<FieldLabel>Email</FieldLabel>
								<input
									value={field.state.value || ''}
									onChange={e => {
										const normalized = normalizeEmail(e.target.value)
										field.handleChange(normalized)
									}}
									onBlur={field.handleBlur}
									type="email"
									placeholder="john@example.com"
									required
									className="input"
								/>
								<FieldError>
									{String(field.state.meta.errors?.[0] ?? '')}
								</FieldError>
							</Field>
						)}
					</form.Field>

					<form.Field name="phone">
						{field => (
							<Field>
								<FieldLabel>Phone (Optional)</FieldLabel>
								<input
									value={field.state.value || ''}
									onChange={e => {
										const formatted = formatPhoneNumber(e.target.value)
										field.handleChange(formatted)
									}}
									onBlur={field.handleBlur}
									type="text"
									placeholder="(555) 123-4567"
									className="input"
								/>
								<FieldError>
									{String(field.state.meta.errors?.[0] ?? '')}
								</FieldError>
							</Field>
						)}
					</form.Field>

					<form.Field name="emergencyContact">
						{field => (
							<Field>
								<FieldLabel>Emergency Contact (Optional)</FieldLabel>
								<input
									value={field.state.value || ''}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									type="text"
									placeholder="Emergency contact name and phone"
									className="input"
								/>
								<FieldError>
									{String(field.state.meta.errors?.[0] ?? '')}
								</FieldError>
							</Field>
						)}
					</form.Field>

					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={createTenant.isPending}>
							{createTenant.isPending ? 'Creating...' : 'Create Tenant'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
