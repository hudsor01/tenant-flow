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
import { tenantsApi } from '@/lib/api-client'
import { tenantFormSchema } from '@repo/shared/validation/tenants'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantKeys } from '@/hooks/api/use-tenant'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'
import { useForm } from '@tanstack/react-form'
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
	const queryClient = useQueryClient()

	// Use controlled state if provided, otherwise fall back to uncontrolled
	const open = controlledOpen ?? uncontrolledOpen
	const setOpen = controlledOnOpenChange ?? setUncontrolledOpen

	const form = useForm({
		defaultValues: {
			name: '',
			email: '',
			phone: '',
			emergencyContact: ''
		},
		onSubmit: async ({ value }) => {
			createMutation.mutate(value)
		},
		validators: {
			onChange: ({ value }) => {
				const result = tenantFormSchema.safeParse(value)
				if (!result.success) {
					return result.error.format()
				}
				return undefined
			}
		}
	})

	const createMutation = useMutation({
		mutationFn: tenantsApi.create,
		onSuccess: (tenant: TenantWithLeaseInfo) => {
				queryClient.setQueryData(tenantKeys.list(), (old: TenantWithLeaseInfo[] | undefined) => {
					if (!Array.isArray(old)) return [tenant]
					return [tenant, ...old]
				})
				queryClient.invalidateQueries({ queryKey: ['tenant-stats'] })
				toast.success('Tenant created successfully')
				setOpen(false)
				form.reset()
			},
		onError: error => {
			toast.error(`Failed to create tenant: ${error.message}`)
		}
	})


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
						form.handleSubmit()
					}}
					className="space-y-4"
				>
					<form.Field name="name">
						{field => (
							<Field>
								<FieldLabel>Full Name</FieldLabel>
								<input
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									type="text"
									placeholder="John Smith"
									required
									className="input"
								/>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>

					<form.Field name="email">
						{field => (
							<Field>
								<FieldLabel>Email</FieldLabel>
								<input
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									type="email"
									placeholder="john@example.com"
									required
									className="input"
								/>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>

					<form.Field name="phone">
						{field => (
							<Field>
								<FieldLabel>Phone (Optional)</FieldLabel>
								<input
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									type="text"
									placeholder="(555) 123-4567"
									className="input"
								/>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>

					<form.Field name="emergencyContact">
						{field => (
							<Field>
								<FieldLabel>Emergency Contact (Optional)</FieldLabel>
								<input
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									type="text"
									placeholder="Emergency contact name and phone"
									className="input"
								/>
								<FieldError errors={field.state.meta.errors} />
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
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending ? 'Creating...' : 'Create Tenant'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
