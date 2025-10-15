'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { leaseInputSchema } from '@repo/shared/validation/leases'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'

interface LeaseEditFormProps {
	id: string
}

const logger = createLogger({ component: 'LeaseEditForm' })

export function LeaseEditForm({ id }: LeaseEditFormProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const [step, setStep] = useState(1)
	const totalSteps = 2

	const {
		data: lease,
		isLoading,
		isError
	} = useQuery({
		queryKey: ['leases', id],
		queryFn: () => leasesApi.get(id)
	})

	const { data: tenants = [] } = useAllTenants()

	const { data: units = [] } = useQuery({
		queryKey: ['units'],
		queryFn: () => unitsApi.list()
	})

	const form = useForm({
		defaultValues: {
			tenantId: '',
			unitId: '',
			startDate: '',
			endDate: '',
			rentAmount: 0,
			securityDeposit: 0,
			terms: '',
			status: 'ACTIVE' as 'ACTIVE' | 'DRAFT' | 'EXPIRED' | 'TERMINATED'
		},
		onSubmit: async ({ value }) => {
			updateLease.mutate(value)
		},
		validators: {
			onChange: ({ value }) => {
				const result = leaseInputSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	useEffect(() => {
		if (lease) {
			form.reset({
				tenantId: lease.tenantId ?? '',
				unitId: lease.unitId ?? '',
				startDate: lease.startDate ?? '',
				endDate: lease.endDate ?? '',
				rentAmount: lease.rentAmount ?? 0,
				securityDeposit: lease.securityDeposit ?? 0,
				terms: lease.terms ?? '',
				status: lease.status ?? 'ACTIVE'
			})
		}
	}, [lease, form])

	const updateLease = useMutation({
		mutationFn: (values: typeof form.state.values) =>
			leasesApi.updateLeaseWithFinancialCalculations(id, {
				...values,
				status: values.status
			}),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['leases'] }),
				queryClient.invalidateQueries({ queryKey: ['lease-stats'] })
			])
			toast.success('Lease updated successfully')
			router.push(`/(protected)/manage/leases/${id}`)
		},
		onError: error => {
			toast.error('Failed to update lease')
			logger.error('Failed to update lease', { action: 'updateLease' }, error)
		}
	})

	if (isLoading) {
		return (
			<div className="animate-pulse text-muted-foreground">
				Loading lease...
			</div>
		)
	}

	if (isError || !lease) {
		return (
			<div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
				Unable to load lease data. Please try again.
			</div>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-xl font-semibold">Edit lease</CardTitle>
				<p className="text-sm text-muted-foreground">
					Update lease timelines, tenant assignments, and financial details.
				</p>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={event => {
						event.preventDefault()
						form.handleSubmit()
					}}
					className="space-y-6"
				>
					{step === 1 && (
						<div className="grid gap-4 md:grid-cols-2">
							<form.Field name="tenantId">
								{field => (
									<Field>
										<FieldLabel htmlFor="tenantId">Tenant</FieldLabel>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
										>
											<SelectTrigger id="tenantId">
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
										{field.state.meta.errors?.length ? (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										) : null}
									</Field>
								)}
							</form.Field>

							<form.Field name="unitId">
								{field => (
									<Field>
										<FieldLabel htmlFor="unitId">Unit</FieldLabel>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
										>
											<SelectTrigger id="unitId">
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
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										) : null}
									</Field>
								)}
							</form.Field>

							<form.Field name="status">
								{field => (
									<Field>
										<FieldLabel htmlFor="status">Status</FieldLabel>
										<Select
											value={field.state.value}
											onValueChange={value =>
												field.handleChange(value as typeof field.state.value)
											}
										>
											<SelectTrigger id="status">
												<SelectValue placeholder="Select status" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="ACTIVE">Active</SelectItem>
												<SelectItem value="DRAFT">Draft</SelectItem>
												<SelectItem value="TERMINATED">Terminated</SelectItem>
												<SelectItem value="EXPIRED">Expired</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>
						</div>
					)}

					{step === 2 && (
						<div className="grid gap-4 md:grid-cols-2">
							<form.Field name="startDate">
								{field => (
									<Field>
										<FieldLabel htmlFor="startDate">Start date</FieldLabel>
										<Input
											id="startDate"
											type="date"
											value={field.state.value}
											onChange={(event: ChangeEvent<HTMLInputElement>) =>
												field.handleChange(event.target.value)
											}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors?.length ? (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										) : null}
									</Field>
								)}
							</form.Field>

							<form.Field name="endDate">
								{field => (
									<Field>
										<FieldLabel htmlFor="endDate">End date</FieldLabel>
										<Input
											id="endDate"
											type="date"
											value={field.state.value}
											onChange={(event: ChangeEvent<HTMLInputElement>) =>
												field.handleChange(event.target.value)
											}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors?.length ? (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										) : null}
									</Field>
								)}
							</form.Field>

							<form.Field name="rentAmount">
								{field => (
									<Field>
										<FieldLabel htmlFor="rentAmount">Monthly rent</FieldLabel>
										<Input
											id="rentAmount"
											type="number"
											min={0}
											step={0.01}
											value={field.state.value}
											onChange={(event: ChangeEvent<HTMLInputElement>) =>
												field.handleChange(
													Number.parseFloat(event.target.value || '0')
												)
											}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors?.length ? (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										) : null}
									</Field>
								)}
							</form.Field>

							<form.Field name="securityDeposit">
								{field => (
									<Field>
										<FieldLabel htmlFor="securityDeposit">
											Security deposit
										</FieldLabel>
										<Input
											id="securityDeposit"
											type="number"
											min={0}
											step={0.01}
											value={field.state.value}
											onChange={(event: ChangeEvent<HTMLInputElement>) =>
												field.handleChange(
													Number.parseFloat(event.target.value || '0')
												)
											}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors?.length ? (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										) : null}
									</Field>
								)}
							</form.Field>

							<form.Field name="terms">
								{field => (
									<Field className="md:col-span-2">
										<FieldLabel htmlFor="terms">Lease terms</FieldLabel>
										<Textarea
											id="terms"
											value={field.state.value}
											onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
												field.handleChange(event.target.value)
											}
											onBlur={field.handleBlur}
											placeholder="Update lease terms and notes"
											rows={4}
										/>
										{field.state.meta.errors?.length ? (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										) : null}
									</Field>
								)}
							</form.Field>
						</div>
					)}

					<div className="flex items-center justify-between border-t pt-6">
						<Button
							type="button"
							variant="outline"
							size="lg"
							onClick={() => setStep(prev => Math.max(1, prev - 1))}
							disabled={step === 1}
						>
							<ChevronLeft className="size-4" />
							Previous
						</Button>
						{step === totalSteps ? (
							<Button type="submit" size="lg" disabled={updateLease.isPending}>
								{updateLease.isPending ? 'Saving...' : 'Save changes'}
							</Button>
						) : (
							<Button
								type="button"
								size="lg"
								onClick={() => setStep(prev => Math.min(totalSteps, prev + 1))}
							>
								Next
								<ChevronRight className="size-4" />
							</Button>
						)}
					</div>
				</form>
			</CardContent>
		</Card>
	)
}
