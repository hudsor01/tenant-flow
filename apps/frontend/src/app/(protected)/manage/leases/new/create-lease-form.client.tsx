'use client'

import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle } from 'lucide-react'
import { useRouter } from 'next/router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
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
import type { Unit } from '@repo/shared/types/supabase'
import { leaseInputSchema } from '@repo/shared/validation/leases'

// type Unit = Tables<'Unit'>

const logger = createLogger({ component: 'CreateLeaseForm' })

export function CreateLeaseForm() {
	const router = useRouter()
	const queryClient = useQueryClient()

	const { data: tenants = [], isLoading: isLoadingTenants } = useAllTenants()

	const { data: units = [], isLoading: isLoadingUnits } = useQuery({
		queryKey: ['units', 'vacant'],
		queryFn: () => unitsApi.list({ status: 'vacant' })
	})

	const createMutation = useMutation({
		mutationFn: leasesApi.createLeaseWithFinancialCalculations,
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['leases'] }),
				queryClient.invalidateQueries({ queryKey: ['lease-stats'] }),
				queryClient.invalidateQueries({ queryKey: ['units'] }),
				queryClient.invalidateQueries({ queryKey: ['tenants'] })
			])
			toast.success('Lease created successfully')
			router.push('/manage/leases')
		},
		onError: (error: Error) => {
			toast.error('Failed to create lease', {
				description: error.message
			})
			logger.error('Failed to create lease', undefined, error)
		}
	})

	const form = useForm({
		defaultValues: {
			unitId: '',
			tenantId: '',
			startDate: '',
			endDate: '',
			rentAmount: 0,
			securityDeposit: 0,
			terms: '',
			propertyId: '',
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

	return (
		<CardLayout
			title="Lease details"
			description="Assign a tenant to a unit, set financial terms, and define lease dates."
		>
			<form
				onSubmit={(event: React.FormEvent) => {
					event.preventDefault()
					form.handleSubmit()
				}}
				className="space-y-6"
			>
				<div className="grid gap-4 md:grid-cols-2">
					<form.Field name="tenantId">
						{field => (
							<Field>
								<FieldLabel htmlFor="tenantId">Tenant *</FieldLabel>
								<Select
									disabled={isLoadingTenants}
									value={field.state.value}
									onValueChange={field.handleChange}
								>
									<SelectTrigger id="tenantId">
										<SelectValue placeholder="Select tenant" />
									</SelectTrigger>
									<SelectContent>
										{tenants.map(tenant => (
											<SelectItem key={tenant.id} value={tenant.id}>
												{tenant.name || 'Unnamed Tenant'}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{field.state.meta.errors?.length ? (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								) : null}
							</Field>
						)}
					</form.Field>

					<form.Field name="unitId">
						{field => (
							<Field>
								<FieldLabel htmlFor="unitId">Unit *</FieldLabel>
								<Select
									disabled={isLoadingUnits}
									value={field.state.value}
									onValueChange={field.handleChange}
								>
									<SelectTrigger id="unitId">
										<SelectValue placeholder="Select unit" />
									</SelectTrigger>
									<SelectContent>
										{units.map((unit: Unit) => (
											<SelectItem key={unit.id} value={unit.id}>
												Unit {unit.unitNumber}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{field.state.meta.errors?.length ? (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								) : null}
							</Field>
						)}
					</form.Field>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<form.Field name="startDate">
						{field => (
							<Field>
								<FieldLabel htmlFor="startDate">Start date *</FieldLabel>
								<Input
									id="startDate"
									type="date"
									value={field.state.value}
									onChange={event => field.handleChange(event.target.value)}
									onBlur={field.handleBlur}
								/>
								{field.state.meta.errors?.length ? (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								) : null}
							</Field>
						)}
					</form.Field>

					<form.Field name="endDate">
						{field => (
							<Field>
								<FieldLabel htmlFor="endDate">End date *</FieldLabel>
								<Input
									id="endDate"
									type="date"
									value={field.state.value}
									onChange={event => field.handleChange(event.target.value)}
									onBlur={field.handleBlur}
								/>
								{field.state.meta.errors?.length ? (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								) : null}
							</Field>
						)}
					</form.Field>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<form.Field name="rentAmount">
						{field => (
							<Field>
								<FieldLabel htmlFor="rentAmount">
									Monthly rent (USD) *
								</FieldLabel>
								<Input
									id="rentAmount"
									type="number"
									min={0}
									step={0.01}
									value={field.state.value}
									onChange={event =>
										field.handleChange(
											Number.parseFloat(event.target.value || '0')
										)
									}
									onBlur={field.handleBlur}
								/>
								{field.state.meta.errors?.length ? (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								) : null}
							</Field>
						)}
					</form.Field>

					<form.Field name="securityDeposit">
						{field => (
							<Field>
								<FieldLabel htmlFor="securityDeposit">
									Security deposit (USD) *
								</FieldLabel>
								<Input
									id="securityDeposit"
									type="number"
									min={0}
									step={0.01}
									value={field.state.value}
									onChange={event =>
										field.handleChange(
											Number.parseFloat(event.target.value || '0')
										)
									}
									onBlur={field.handleBlur}
								/>
								{field.state.meta.errors?.length ? (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								) : null}
							</Field>
						)}
					</form.Field>
				</div>

				<form.Field name="terms">
					{field => (
						<Field>
							<FieldLabel htmlFor="terms">Lease terms</FieldLabel>
							<Textarea
								id="terms"
								value={field.state.value}
								onChange={event => field.handleChange(event.target.value)}
								onBlur={field.handleBlur}
								placeholder="Outline key lease terms and notes"
								rows={4}
							/>
							{field.state.meta.errors?.length ? (
								<FieldError>{String(field.state.meta.errors[0])}</FieldError>
							) : null}
						</Field>
					)}
				</form.Field>

				<div className="flex justify-end gap-4 border-t pt-6">
					<Button type="button" variant="outline" onClick={() => router.back()}>
						Cancel
					</Button>
					<Button
						type="submit"
						size="lg"
						disabled={createMutation.isPending}
						className="flex items-center gap-2"
					>
						<CheckCircle className="w-4 h-4" />
						{createMutation.isPending ? 'Creating...' : 'Create lease'}
					</Button>
				</div>
			</form>
		</CardLayout>
	)
}
