'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { tenantsApi } from '@/lib/api-client'
import { tenantFormSchema } from '@repo/shared/validation/tenants'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tenants'] })
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
							<div className="space-y-2">
								<Label htmlFor="name">Full Name</Label>
								<Input
									id="name"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="John Smith"
								/>
								{field.state.meta.errors?.length ? (
									<p className="text-sm text-destructive">
										{String(field.state.meta.errors[0])}
									</p>
								) : null}
							</div>
						)}
					</form.Field>

					<form.Field name="email">
						{field => (
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="john@example.com"
								/>
								{field.state.meta.errors?.length ? (
									<p className="text-sm text-destructive">
										{String(field.state.meta.errors[0])}
									</p>
								) : null}
							</div>
						)}
					</form.Field>

					<form.Field name="phone">
						{field => (
							<div className="space-y-2">
								<Label htmlFor="phone">Phone (Optional)</Label>
								<Input
									id="phone"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="(555) 123-4567"
								/>
								{field.state.meta.errors?.length ? (
									<p className="text-sm text-destructive">
										{String(field.state.meta.errors[0])}
									</p>
								) : null}
							</div>
						)}
					</form.Field>

					<form.Field name="emergencyContact">
						{field => (
							<div className="space-y-2">
								<Label htmlFor="emergencyContact">
									Emergency Contact (Optional)
								</Label>
								<Input
									id="emergencyContact"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="Jane Smith - (555) 987-6543"
								/>
								{field.state.meta.errors?.length ? (
									<p className="text-sm text-destructive">
										{String(field.state.meta.errors[0])}
									</p>
								) : null}
							</div>
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
