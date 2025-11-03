'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { useMaintenanceRequest } from '#hooks/api/use-maintenance'
import { usePropertyList } from '#hooks/api/use-properties'
import { useAllUnits } from '#hooks/api/use-unit'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { Calendar, MapPin, Phone, Wrench } from 'lucide-react'
import Link from 'next/link'

interface MaintenanceDetailsProps {
	id: string
}

const logger = createLogger({ component: 'MaintenanceDetails' })

export function MaintenanceDetails({ id }: MaintenanceDetailsProps) {
	const { data: request, isLoading, isError } = useMaintenanceRequest(id)

	const { data: propertiesData } = usePropertyList()
	const properties = propertiesData?.data ?? []

	const { data: unitsResponse } = useAllUnits()
	const units = unitsResponse?.data || []

	const unit = units.find(u => u.id === request?.unitId)
	const property = properties.find(
		(p) => p.id === unit?.propertyId
	)

	if (isLoading) {
		return (
			<div className="animate-pulse text-muted-foreground">
				Loading maintenance request...
			</div>
		)
	}

	if (isError || !request) {
		logger.error('Failed to load maintenance request')
		return (
			<Card className="border-destructive/20 bg-destructive/5">
				<CardHeader>
					<CardTitle>Unable to load request</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-destructive">
						Something went wrong while loading this maintenance request.
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="grid gap-6 lg:grid-cols-3">
			<Card className="lg:col-span-2">
				<CardHeader className="flex-row items-start justify-between gap-4">
					<div className="space-y-2">
						<CardTitle className="flex items-center gap-2 text-2xl font-semibold">
							<Wrench className="size-5 text-primary" />
							{request.title}
						</CardTitle>
						<div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
							<Badge variant="outline">{request.status}</Badge>
							<Badge variant="secondary">{request.priority}</Badge>
						</div>
					</div>
					<Button asChild variant="outline" size="sm">
						<Link href={`/manage/maintenance/${request.id}/edit`}>
							Edit request
						</Link>
					</Button>
				</CardHeader>
				<CardContent className="space-y-6">
					<section className="space-y-2">
						<h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
							Description
						</h2>
						<p className="text-sm leading-relaxed text-muted-foreground">
							{request.description || 'No description provided.'}
						</p>
					</section>

					<section className="grid gap-4 md:grid-cols-2">
						<div className="rounded-xl border bg-muted/20 p-4">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<MapPin className="size-4" />
								Property
							</div>
							<p className="mt-1 text-sm font-medium">
								{property?.name ?? 'Unassigned property'}
							</p>
							{unit ? (
								<p className="text-sm text-muted-foreground">
									Unit {unit.unitNumber}
								</p>
							) : null}
						</div>

						<div className="rounded-xl border bg-muted/20 p-4">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Calendar className="size-4" />
								Preferred date
							</div>
							<p className="mt-1 text-sm font-medium">
								{request.preferredDate
									? new Date(request.preferredDate).toLocaleDateString()
									: 'No preferred date'}
							</p>
						</div>
					</section>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base font-semibold">
						Contact information
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					{request.requestedBy ? (
						<p>
							<span className="text-muted-foreground">Requested by:</span>{' '}
							{request.requestedBy}
						</p>
					) : null}
					{request.contactPhone ? (
						<p className="flex items-center gap-2">
							<Phone className="size-4 text-muted-foreground" />
							{request.contactPhone}
						</p>
					) : (
						<p className="text-muted-foreground">No contact phone provided.</p>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
