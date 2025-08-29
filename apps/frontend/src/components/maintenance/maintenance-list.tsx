'use client'

import { useMaintenanceRequests } from '@/hooks/api/use-maintenance'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { MaintenanceRequestApiResponse } from '@repo/shared'

// Define types directly from API response - NO DUPLICATION
type MaintenanceRequest = MaintenanceRequestApiResponse

// Define local interface for component needs
interface MaintenanceQuery {
	search?: string
	status?: string
	priority?: string
	propertyId?: string
}

interface MaintenanceListProps {
	query?: MaintenanceQuery
	onRequestClick?: (request: MaintenanceRequest) => void
}

export function MaintenanceList({
	query,
	onRequestClick
}: MaintenanceListProps) {
    const {
        data: requests = [],
        isLoading,
        error,
        refetch
    } = useMaintenanceRequests(query as unknown as Record<string, unknown>)

	const getPriorityColor = (priority: string) => {
		switch (priority.toLowerCase()) {
			case 'low':
				return 'bg-green-1 text-green-8 border-green-2'
			case 'medium':
				return 'bg-yellow-1 text-yellow-8 border-yellow-2'
			case 'high':
				return 'bg-orange-1 text-orange-8 border-orange-2'
			case 'emergency':
				return 'bg-red-1 text-red-8 border-red-2'
			default:
				return 'bg-gray-1 text-gray-8 border-gray-2'
		}
	}

	const getStatusColor = (status: string) => {
		switch (status.toUpperCase()) {
			case 'OPEN':
				return 'bg-yellow-1 text-yellow-8 border-yellow-2'
			case 'IN_PROGRESS':
				return 'bg-blue-1 text-blue-8 border-blue-2'
			case 'COMPLETED':
				return 'bg-green-1 text-green-8 border-green-2'
			case 'CANCELED':
				return 'bg-gray-1 text-gray-8 border-gray-2'
			case 'ON_HOLD':
				return 'bg-orange-1 text-orange-8 border-orange-2'
			default:
				return 'bg-gray-1 text-gray-8 border-gray-2'
		}
	}

	const getStatusIcon = (status: string) => {
		switch (status.toUpperCase()) {
			case 'OPEN':
				return <i className="i-lucide-clock h-3 w-3"  />
			case 'IN_PROGRESS':
				return <i className="i-lucide-wrench h-3 w-3"  />
			case 'COMPLETED':
				return <i className="i-lucide-check-circle-2 h-3 w-3"  />
			case 'CANCELED':
				return <i className="i-lucide-xcircle h-3 w-3"  />
			default:
				return <i className="i-lucide-clock h-3 w-3"  />
		}
	}

	const getPriorityIcon = (priority: string) => {
		switch (priority.toLowerCase()) {
			case 'emergency':
				return <i className="i-lucide-alert-triangle h-3 w-3"  />
			default:
				return null
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<i className="i-lucide-loader-2 text-muted-foreground h-8 w-8 animate-spin"  />
				<span className="text-muted-foreground ml-2">
					Loading maintenance requests...
				</span>
			</div>
		)
	}

	if (error) {
		return (
			<Card className="border-red-2 bg-red-50">
				<CardHeader>
					<CardTitle className="text-red-8">
						Error Loading Maintenance Requests
					</CardTitle>
					<CardDescription className="text-red-6">
						{error.message || 'Failed to load maintenance requests'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						onClick={() => refetch()}
						variant="outline"
						className="border-red-2 text-red-8 hover:bg-red-1"
					>
						Try Again
					</Button>
				</CardContent>
			</Card>
		)
	}

	if (requests.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center p-8">
					<i className="i-lucide-wrench text-muted-foreground mb-4 h-12 w-12"  />
					<CardTitle className="text-muted-foreground text-center text-lg">
						No maintenance requests found
					</CardTitle>
					<CardDescription className="mt-2 text-center">
						Create your first maintenance request to get started.
					</CardDescription>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-4">
			{requests.map(request => (
				<Card
					key={request.id}
					className={`transition-colors hover:bg-gray-50 ${
						onRequestClick ? 'cursor-pointer' : ''
					}`}
					onClick={() => onRequestClick?.(request)}
				>
					<CardHeader className="pb-3">
						<div className="flex items-start justify-between">
							<div className="space-y-1">
								<CardTitle className="text-lg">
									{request.title}
								</CardTitle>
								<CardDescription>
									{request.description?.slice(0, 100)}
									{request.description &&
										request.description.length > 100 &&
										'...'}
								</CardDescription>
							</div>
							<div className="flex items-center space-x-2">
								<Badge
									className={`${getPriorityColor(request.priority)} flex items-center space-x-1`}
								>
									{getPriorityIcon(request.priority)}
									<span className="capitalize">
										{request.priority.toLowerCase()}
									</span>
								</Badge>
								<Badge
									className={`${getStatusColor(request.status)} flex items-center space-x-1`}
								>
									{getStatusIcon(request.status)}
									<span className="capitalize">
										{request.status.replace('_', ' ')}
									</span>
								</Badge>
							</div>
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="text-muted-foreground flex items-center justify-between text-sm">
							<div className="flex items-center space-x-4">
								<span>Category: {request.category}</span>
								{request.unitNumber && (
									<span>Unit: {request.unitNumber}</span>
								)}
								{request.propertyName && (
									<span>
										Property_: {request.propertyName}
									</span>
								)}
							</div>
							<div>
								Created:{' '}
								{new Date(
									request.createdAt
								).toLocaleDateString()}
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	)
}
