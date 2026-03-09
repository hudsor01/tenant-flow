'use client'


import { Wrench } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import {
	useMaintenanceRequestCreateMutation,
	useMaintenanceRequestUpdateMutation
} from '#hooks/api/use-maintenance'
import { useCurrentUser } from '#hooks/use-current-user'
import { cn } from '#lib/utils'
import { usePropertyList } from '#hooks/api/use-properties'
import { useUnitList } from '#hooks/api/use-unit'
import { useMaintenanceForm } from '#hooks/use-maintenance-form'
import type {
	MaintenancePriority,
	MaintenanceRequestWithExtras,
	Unit
} from '#types/core'
import { MaintenanceFormFields } from './maintenance-form-fields'

interface MaintenanceFormProps {
	mode: 'create' | 'edit'
	request?: MaintenanceRequestWithExtras
}

export function MaintenanceForm({ mode, request }: MaintenanceFormProps) {
	const router = useRouter()
	const { isLoading: isAuthLoading } = useCurrentUser()
	const createRequest = useMaintenanceRequestCreateMutation()
	const updateRequest = useMaintenanceRequestUpdateMutation()

	const { data: propertiesData, isLoading: propertiesLoading } =
		usePropertyList()
	const { data: unitsData, isLoading: unitsLoading } = useUnitList()

	const extendedRequest = request as MaintenanceRequestWithExtras | undefined

	const form = useMaintenanceForm({
		mode,
		defaultValues: {
			title: extendedRequest?.title ?? '',
			description: extendedRequest?.description ?? '',
			priority: (extendedRequest?.priority as MaintenancePriority) ?? 'low',
			unit_id: extendedRequest?.unit_id ?? '',
			tenant_id: extendedRequest?.tenant_id ?? '',
			estimated_cost: extendedRequest?.estimated_cost?.toString() ?? '',
			scheduled_date: extendedRequest?.scheduled_date ?? ''
		},
		createMutation: createRequest,
		updateMutation: updateRequest,
		...(request?.id && { requestId: request.id }),
		...(request?.version !== undefined && { version: request.version }),
		onSuccess: () => {
			router.back()
		}
	})

	const unitsByProperty = (() => {
		if (!unitsData || !propertiesData) return new Map<string, Unit[]>()
		const grouped = new Map<string, Unit[]>()
		for (const unit of unitsData) {
			const existing = grouped.get(unit.property_id) ?? []
			grouped.set(unit.property_id, [...existing, unit])
		}
		return grouped
	})()

	const isLoading = propertiesLoading || unitsLoading

	return (
		<div className="max-w-3xl mx-auto">
			{isLoading ? (
				<div className="flex-center h-64">
					<div className="text-center">
						<div className="inline-flex-center mb-4">
							<Wrench className="size-8 animate-spin text-muted-foreground" />
						</div>
						<p className="text-muted-foreground">Loading maintenance form...</p>
					</div>
				</div>
			) : (
				<form
					onSubmit={e => {
						e.preventDefault()
						form.handleSubmit()
					}}
					noValidate
				>
					<Card>
						<CardHeader>
							<div className="flex items-start gap-3">
								<span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
									<Wrench className="size-5" aria-hidden="true" />
								</span>
								<div>
									<CardTitle>
										{mode === 'create'
											? 'New Maintenance Request'
											: 'Edit Maintenance Request'}
									</CardTitle>
									<CardDescription>
										{mode === 'create'
											? 'Log maintenance issues, assign priority, and track resolution details'
											: 'Update maintenance details and priority settings'}
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="grid gap-6">
							<MaintenanceFormFields
								form={form}
								propertiesData={propertiesData}
								unitsByProperty={unitsByProperty}
							/>
						</CardContent>

						<CardFooter className="flex justify-end gap-3 border-t">
							<Button
								type="button"
								variant="outline"
								onClick={() => router.back()}
								disabled={createRequest.isPending || updateRequest.isPending}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={createRequest.isPending || updateRequest.isPending || isAuthLoading}
								className={cn(isAuthLoading && 'animate-pulse')}
							>
								{createRequest.isPending
									? 'Creating...'
									: updateRequest.isPending
										? 'Saving...'
										: mode === 'create'
											? 'Create Request'
											: 'Save Changes'}
							</Button>
						</CardFooter>
					</Card>
				</form>
			)}
		</div>
	)
}
