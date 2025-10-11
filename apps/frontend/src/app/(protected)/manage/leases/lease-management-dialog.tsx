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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAllTenants } from '@/hooks/api/use-tenant'
import { leasesApi, unitsApi } from '@/lib/api-client'
import { leaseInputSchema } from '@repo/shared/validation/leases'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function LeaseManagementDialog() {
	const [open, setOpen] = useState(false)
	const queryClient = useQueryClient()

	const { data: tenants = [] } = useAllTenants()

	const { data: units = [] } = useQuery({
		queryKey: ['units'],
		queryFn: () => unitsApi.list({ status: 'vacant' })
	})

	const form = useForm({
		defaultValues: {
			propertyId: '',
			unitId: '',
			tenantId: '',
			startDate: '',
			endDate: '',
			rentAmount: 0,
			securityDeposit: 0,
			monthlyRent: 0,
			terms: '',
			status: 'DRAFT' as const
		},
		onSubmit: async ({ value }) => {
			createMutation.mutate({
				...value,
				status: 'ACTIVE'
			})
		},
		validators: {
			onChange: ({ value }) => {
				const result = leaseInputSchema.safeParse(value)
				if (!result.success) {
					return result.error.format()
				}
				return undefined
			}
		}
	})

	const createMutation = useMutation({
		mutationFn: leasesApi.createLeaseWithFinancialCalculations,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['leases'] })
			queryClient.invalidateQueries({ queryKey: ['units'] })
			queryClient.invalidateQueries({ queryKey: ['tenants'] })
			toast.success('Lease created successfully')
			setOpen(false)
			form.reset()
		},
		onError: error => {
			toast.error(`Failed to create lease: ${error.message}`)
		}
	})

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button className="flex items-center gap-2">
					<FileText className="size-4" />
					Create Lease
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Create New Lease</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={e => {
						e.preventDefault()
						form.handleSubmit()
					}}
					className="space-y-4"
				>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="tenantId">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="tenantId">Tenant</Label>
									<Select
										value={field.state.value}
										onValueChange={field.handleChange}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select tenant" />
										</SelectTrigger>
										<SelectContent>
											{tenants.map((tenant: { id: string; name: string }) => (
												<SelectItem key={tenant.id} value={tenant.id}>
													{tenant.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{field.state.meta.errors?.length ? (
										<p className="text-sm text-destructive">
											{String(field.state.meta.errors[0])}
										</p>
									) : null}
								</div>
							)}
						</form.Field>

						<form.Field name="unitId">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="unitId">Unit</Label>
									<Select
										value={field.state.value}
										onValueChange={field.handleChange}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select unit" />
										</SelectTrigger>
										<SelectContent>
											{units.map(unit => (
												<SelectItem key={unit.id} value={unit.id}>
													Unit {unit.unitNumber}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{field.state.meta.errors?.length ? (
										<p className="text-sm text-destructive">
											{String(field.state.meta.errors[0])}
										</p>
									) : null}
								</div>
							)}
						</form.Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="startDate">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="startDate">Start Date</Label>
									<Input
										id="startDate"
										type="date"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
									{field.state.meta.errors?.length ? (
										<p className="text-sm text-destructive">
											{String(field.state.meta.errors[0])}
										</p>
									) : null}
								</div>
							)}
						</form.Field>

						<form.Field name="endDate">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="endDate">End Date</Label>
									<Input
										id="endDate"
										type="date"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
									{field.state.meta.errors?.length ? (
										<p className="text-sm text-destructive">
											{String(field.state.meta.errors[0])}
										</p>
									) : null}
								</div>
							)}
						</form.Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="rentAmount">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="rentAmount">Monthly Rent</Label>
									<Input
										id="rentAmount"
										type="number"
										value={field.state.value}
										onChange={e => field.handleChange(Number(e.target.value))}
										onBlur={field.handleBlur}
										placeholder="2500"
									/>
									{field.state.meta.errors?.length ? (
										<p className="text-sm text-destructive">
											{String(field.state.meta.errors[0])}
										</p>
									) : null}
								</div>
							)}
						</form.Field>

						<form.Field name="securityDeposit">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="securityDeposit">Security Deposit</Label>
									<Input
										id="securityDeposit"
										type="number"
										value={field.state.value}
										onChange={e => field.handleChange(Number(e.target.value))}
										onBlur={field.handleBlur}
										placeholder="5000"
									/>
									{field.state.meta.errors?.length ? (
										<p className="text-sm text-destructive">
											{String(field.state.meta.errors[0])}
										</p>
									) : null}
								</div>
							)}
						</form.Field>
					</div>

					<form.Field name="terms">
						{field => (
							<div className="space-y-2">
								<Label htmlFor="terms">Terms & Conditions</Label>
								<Textarea
									id="terms"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="Lease terms and special conditions..."
									rows={3}
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
							{createMutation.isPending ? 'Creating...' : 'Create Lease'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
