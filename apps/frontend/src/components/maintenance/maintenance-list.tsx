'use client'

import { useMaintenanceRequests } from '@/hooks/api/use-maintenance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, Clock, CheckCircle2, XCircle, Wrench } from 'lucide-react'
import type { MaintenanceRequest, MaintenanceQuery } from '@repo/shared'

interface MaintenanceListProps {
	query?: MaintenanceQuery
	onRequestClick?: (request: MaintenanceRequest) => void
}

export function MaintenanceList({ query, onRequestClick }: MaintenanceListProps) {
	const {
		data: requests = [],
		isLoading,
		error,
		refetch
	} = useMaintenanceRequests(query)

	const getPriorityColor = (priority: string) => {
		switch (priority.toLowerCase()) {
			case 'low': return 'bg-green-100 text-green-800 border-green-200'
			case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
			case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
			case 'emergency': return 'bg-red-100 text-red-800 border-red-200'
			default: return 'bg-gray-100 text-gray-800 border-gray-200'
		}
	}

	const getStatusColor = (status: string) => {
		switch (status.toUpperCase()) {
			case 'OPEN': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
			case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200'
			case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200'
			case 'CANCELED': return 'bg-gray-100 text-gray-800 border-gray-200'
			case 'ON_HOLD': return 'bg-orange-100 text-orange-800 border-orange-200'
			default: return 'bg-gray-100 text-gray-800 border-gray-200'
		}
	}

	const getStatusIcon = (status: string) => {
		switch (status.toUpperCase()) {
			case 'OPEN': return <Clock className="h-3 w-3" />
			case 'IN_PROGRESS': return <Wrench className="h-3 w-3" />
			case 'COMPLETED': return <CheckCircle2 className="h-3 w-3" />
			case 'CANCELED': return <XCircle className="h-3 w-3" />
			default: return <Clock className="h-3 w-3" />
		}
	}

	const getPriorityIcon = (priority: string) => {
		switch (priority.toLowerCase()) {
			case 'emergency': return <AlertTriangle className="h-3 w-3" />
			default: return null
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				<span className="ml-2 text-muted-foreground">Loading maintenance requests...</span>
			</div>
		)
	}

	if (error) {
		return (
			<Card className="border-red-200 bg-red-50">
				<CardHeader>
					<CardTitle className="text-red-800">Error Loading Maintenance Requests</CardTitle>
					<CardDescription className="text-red-600">
						{error.message || 'Failed to load maintenance requests'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button 
						onClick={() => refetch()}
						variant="outline"
						className="border-red-200 text-red-800 hover:bg-red-100"
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
					<Wrench className="h-12 w-12 text-muted-foreground mb-4" />
					<CardTitle className="text-center text-lg text-muted-foreground">
						No maintenance requests found
					</CardTitle>
					<CardDescription className="text-center mt-2">
						Create your first maintenance request to get started.
					</CardDescription>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-4">
			{requests.map((request) => (
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
								<CardTitle className="text-lg">{request.title}</CardTitle>
								<CardDescription>
									{request.description?.slice(0, 100)}
									{request.description && request.description.length > 100 && '...'}
								</CardDescription>
							</div>
							<div className="flex items-center space-x-2">
								<Badge className={`${getPriorityColor(request.priority)} flex items-center space-x-1`}>
									{getPriorityIcon(request.priority)}
									<span className="capitalize">{request.priority.toLowerCase()}</span>
								</Badge>
								<Badge className={`${getStatusColor(request.status)} flex items-center space-x-1`}>
									{getStatusIcon(request.status)}
									<span className="capitalize">{request.status.replace('_', ' ')}</span>
								</Badge>
							</div>
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="flex items-center justify-between text-sm text-muted-foreground">
							<div className="flex items-center space-x-4">
								<span>Category: {request.category}</span>
								{request.Unit && (
									<span>Unit: {request.Unit.unitNumber}</span>
								)}
								{request.Unit?.property && (
									<span>Property: {request.Unit.property.name}</span>
								)}
							</div>
							<div>
								Created: {new Date(request.createdAt).toLocaleDateString()}
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	)
}