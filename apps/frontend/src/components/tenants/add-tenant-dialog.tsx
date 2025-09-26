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
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const tenantSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Valid email required'),
	phone: z.string().optional(),
	emergencyContact: z.string().optional()
})

type TenantFormData = z.infer<typeof tenantSchema>

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

	const form = useForm<TenantFormData>({
		resolver: zodResolver(tenantSchema),
		defaultValues: {
			name: '',
			email: '',
			phone: '',
			emergencyContact: ''
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

	const onSubmit = (data: TenantFormData) => {
		createMutation.mutate(data)
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
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Full Name</Label>
						<Input
							id="name"
							{...form.register('name')}
							placeholder="John Smith"
						/>
						{form.formState.errors.name && (
							<p className="text-sm text-destructive">
								{form.formState.errors.name.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							{...form.register('email')}
							placeholder="john@example.com"
						/>
						{form.formState.errors.email && (
							<p className="text-sm text-destructive">
								{form.formState.errors.email.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="phone">Phone (Optional)</Label>
						<Input
							id="phone"
							{...form.register('phone')}
							placeholder="(555) 123-4567"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="emergencyContact">
							Emergency Contact (Optional)
						</Label>
						<Input
							id="emergencyContact"
							{...form.register('emergencyContact')}
							placeholder="Jane Smith - (555) 987-6543"
						/>
					</div>

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
