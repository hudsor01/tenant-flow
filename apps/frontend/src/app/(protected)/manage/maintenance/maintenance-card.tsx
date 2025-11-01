'use client'

import { Badge } from '#components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Button } from '#components/ui/button'
import { Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'
import type { MaintenanceRequestResponse } from '@repo/shared/types/core'

type MaintenanceRequest = MaintenanceRequestResponse['data'][number]

const PRIORITY_VARIANTS: Record<
	string,
	'destructive' | 'secondary' | 'outline'
> = {
	URGENT: 'destructive',
	HIGH: 'destructive',
	MEDIUM: 'secondary',
	LOW: 'outline'
}

interface MaintenanceCardProps {
	request: MaintenanceRequest
	isDragging?: boolean
}

export function MaintenanceCard({ request, isDragging }: MaintenanceCardProps) {
	return (
		<Card className={isDragging ? 'opacity-50' : ''}>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="text-base font-medium line-clamp-2">
						{request.title}
					</CardTitle>
					<Badge
						variant={PRIORITY_VARIANTS[request.priority] ?? 'outline'}
						className="shrink-0"
					>
						{request.priority}
					</Badge>
				</div>
				{request.description && (
					<CardDescription className="line-clamp-2 text-sm">
						{request.description}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Property & Unit */}
				{request.property && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<MapPin className="size-4 shrink-0" />
						<div className="flex flex-col min-w-0">
							<span className="truncate">{request.property.name}</span>
							{request.unit && (
								<span className="text-xs truncate">
									Unit {request.unit.name}
								</span>
							)}
						</div>
					</div>
				)}

				{/* Created Date */}
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Calendar className="size-4 shrink-0" />
					<span>
						{new Date(request.createdAt ?? '').toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric'
						})}
					</span>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-2 pt-2">
					<Button asChild size="sm" variant="outline" className="flex-1">
						<Link href={`/manage/maintenance/${request.id}`}>View</Link>
					</Button>
					<Button asChild size="sm" variant="ghost" className="flex-1">
						<Link href={`/manage/maintenance/${request.id}/edit`}>Edit</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
