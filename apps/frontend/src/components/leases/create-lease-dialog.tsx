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
import { leasesApi, tenantsApi, unitsApi } from '@/lib/api-client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const leaseSchema = z.object({
	tenantId: z.string().min(1, 'Tenant is required'),
	unitId: z.string().min(1, 'Unit is required'),
	startDate: z.string().min(1, 'Start date is required'),
	endDate: z.string().min(1, 'End date is required'),
	rentAmount: z.number().min(1, 'Rent amount must be greater than 0'),
	securityDeposit: z.number().min(0, 'Security deposit cannot be negative'),
	terms: z.string().optional()
})

type LeaseFormData = z.infer<typeof leaseSchema>

export function CreateLeaseDialog() {
	const [open, setOpen] = useState(false)
	const queryClient = useQueryClient()

	const { data: tenants = [] } = useQuery({
		queryKey: ['tenants'],
		queryFn: () => tenantsApi.list()
	})

	const { data: units = [] } = useQuery({
		queryKey: ['units'],
		queryFn: () => unitsApi.list({ status: 'vacant' })
	})

	const form = useForm<LeaseFormData>({
		resolver: zodResolver(leaseSchema),
		defaultValues: {
			tenantId: '',
			unitId: '',
			startDate: '',
			endDate: '',
			rentAmount: 0,
			securityDeposit: 0,
			terms: ''
		}
	})

	const createMutation = useMutation({
		mutationFn: leasesApi.createLeaseWithFinancialCalculations,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['leases'] })
			queryClient.invalidateQueries({ queryKey: ['lease-stats'] })
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

	const onSubmit = (data: LeaseFormData) => {
		createMutation.mutate({
			...data,
			status: 'ACTIVE'
		})
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="default" className="flex items-center gap-2">
					<FileText className="size-4" />
					New Lease
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Create New Lease Agreement</DialogTitle>
				</DialogHeader>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="tenantId">Tenant</Label>
							<Controller
								name="tenantId"
								control={form.control}
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger>
											<SelectValue placeholder="Select tenant" />
										</SelectTrigger>
										<SelectContent>
											{tenants.map(tenant => (
												<SelectItem key={tenant.id} value={tenant.id}>
													{tenant.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{form.formState.errors.tenantId && (
								<p className="text-sm text-destructive">
									{form.formState.errors.tenantId.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="unitId">Unit</Label>
							<Controller
								name="unitId"
								control={form.control}
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
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
								)}
							/>
							{form.formState.errors.unitId && (
								<p className="text-sm text-destructive">
									{form.formState.errors.unitId.message}
								</p>
							)}
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="startDate">Start Date</Label>
							<Input
								id="startDate"
								type="date"
								{...form.register('startDate')}
							/>
							{form.formState.errors.startDate && (
								<p className="text-sm text-destructive">
									{form.formState.errors.startDate.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="endDate">End Date</Label>
							<Input id="endDate" type="date" {...form.register('endDate')} />
							{form.formState.errors.endDate && (
								<p className="text-sm text-destructive">
									{form.formState.errors.endDate.message}
								</p>
							)}
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="rentAmount">Monthly Rent</Label>
							<Input
								id="rentAmount"
								type="number"
								{...form.register('rentAmount', { valueAsNumber: true })}
								placeholder="2500"
							/>
							{form.formState.errors.rentAmount && (
								<p className="text-sm text-destructive">
									{form.formState.errors.rentAmount.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="securityDeposit">Security Deposit</Label>
							<Input
								id="securityDeposit"
								type="number"
								{...form.register('securityDeposit', { valueAsNumber: true })}
								placeholder="5000"
							/>
							{form.formState.errors.securityDeposit && (
								<p className="text-sm text-destructive">
									{form.formState.errors.securityDeposit.message}
								</p>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="terms">Terms & Conditions</Label>
						<Textarea
							id="terms"
							{...form.register('terms')}
							placeholder="Lease terms and special conditions..."
							rows={3}
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
							{createMutation.isPending ? 'Creating...' : 'Create Lease'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
