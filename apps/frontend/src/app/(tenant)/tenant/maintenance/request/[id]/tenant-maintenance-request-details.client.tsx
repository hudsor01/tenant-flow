'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, Wrench } from 'lucide-react'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { formatDate } from '#lib/formatters/date'
import { maintenanceQueries } from '#hooks/api/queries/maintenance-queries'
import type { MaintenanceRequest } from '@repo/shared/types/core'

function formatStatus(status: string) {
	return status.replace('_', ' ')
}

function getStatusVariant(status: string) {
	switch (status) {
		case 'open':
			return 'secondary'
		case 'in_progress':
			return 'default'
		case 'completed':
			return 'outline'
		case 'cancelled':
			return 'outline'
		default:
			return 'outline'
	}
}

export function TenantMaintenanceRequestDetails({ id }: { id: string }) {
	const router = useRouter()
	const {
		data: request,
		isLoading,
		error
	} = useQuery(maintenanceQueries.detail(id))

	const errorMessage =
		error instanceof Error
			? error.message
			: error
				? 'Failed to load request'
				: null

	return (
		<div className="space-y-4">
			<Button
				variant="ghost"
				className="w-fit px-0"
				onClick={() => router.push('/tenant/maintenance')}
			>
				<ArrowLeft className="mr-2 size-4" />
				Back to maintenance
			</Button>

			<CardLayout
				title={request?.title || 'Maintenance request'}
				{...(request?.unit_id
					? { description: `Unit ${request.unit_id}` }
					: {})}
				isLoading={isLoading}
				error={errorMessage}
				className="border shadow-sm"
			>
				{request ? <RequestDetails request={request} /> : null}
			</CardLayout>
		</div>
	)
}

function RequestDetails({ request }: { request: MaintenanceRequest }) {
	const createdAt = request.created_at
		? formatDate(request.created_at, { relative: true })
		: null
	const updatedAt = request.updated_at
		? formatDate(request.updated_at, { relative: true })
		: null

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant={getStatusVariant(request.status)}>
					{formatStatus(request.status)}
				</Badge>
				<Badge variant="outline" className="uppercase">
					{request.priority}
				</Badge>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Calendar className="size-4" aria-hidden />
					<span>Submitted {createdAt ?? '—'}</span>
				</div>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Clock className="size-4" aria-hidden />
					<span>Updated {updatedAt ?? '—'}</span>
				</div>
			</div>

			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Wrench className="size-4 text-primary" aria-hidden />
					<p className="font-medium">Description</p>
				</div>
				<p className="text-sm leading-relaxed text-foreground">
					{request.description || '—'}
				</p>
			</div>
		</div>
	)
}
