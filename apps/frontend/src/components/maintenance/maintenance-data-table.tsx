'use client'

import { useMaintenanceRequests } from '@/hooks/api/use-maintenance'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	Wrench,
	Eye,
	Edit3,
	MessageSquare,
	Building,
	User,
	Calendar,
	AlertTriangle,
	CheckCircle,
	Clock,
	Plus
} from 'lucide-react'
import Link from 'next/link'
import type { MaintenanceRequest } from '@repo/shared'

// Local type for what we expect from the API
type MaintenanceTableRow = MaintenanceRequest & {
	unit?: {
		unitNumber: string
		property?: {
			name: string
		}
		leases?: {
			tenant: {
				name: string
			}
		}[]
	}
}

function MaintenanceRow({ request }: { request: MaintenanceTableRow }) {
	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'urgent':
				return 'bg-red-500'
			case 'high':
				return 'bg-orange-500'
			case 'medium':
				return 'bg-yellow-500'
			case 'low':
				return 'bg-green-500'
			default:
				return 'bg-gray-500'
		}
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'open':
				return <Clock className="h-4 w-4" />
			case 'in_progress':
				return <AlertTriangle className="h-4 w-4" />
			case 'completed':
				return <CheckCircle className="h-4 w-4" />
			default:
				return <Wrench className="h-4 w-4" />
		}
	}

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case 'open':
				return 'secondary'
			case 'in_progress':
				return 'default'
			case 'completed':
				return 'default'
			case 'cancelled':
				return 'outline'
			default:
				return 'secondary'
		}
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'open':
				return 'bg-orange-500'
			case 'in_progress':
				return 'bg-primary'
			case 'completed':
				return 'bg-green-500'
			case 'cancelled':
				return 'bg-gray-500'
			default:
				return 'bg-gray-500'
		}
	}

	return (
		<TableRow className="hover:bg-accent/50">
			<TableCell>
				<div className="flex items-center gap-3">
					<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
						<Wrench className="text-primary h-5 w-5" />
					</div>
					<div className="space-y-1">
						<p
							className="max-w-[200px] truncate leading-none font-medium"
							title={request.title}
						>
							{request.title}
						</p>
						<div className="text-muted-foreground flex items-center gap-1 text-sm">
							<Calendar className="h-3 w-3" />
							{new Date(request.createdAt).toLocaleDateString()}
						</div>
					</div>
				</div>
			</TableCell>
			<TableCell>
				<Badge
					variant="outline"
					className={`${getPriorityColor(request.priority)} border-transparent text-white capitalize`}
				>
					{request.priority}
				</Badge>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-1">
					{getStatusIcon(request.status)}
					<Badge
						variant={getStatusBadgeVariant(request.status)}
						className={`${getStatusColor(request.status)} text-white capitalize`}
					>
						{request.status.replace('_', ' ')}
					</Badge>
				</div>
			</TableCell>
			<TableCell>
				{request.unit?.property ? (
					<div className="flex items-center gap-1 text-sm">
						<Building className="text-muted-foreground h-3 w-3" />
						<div className="space-y-1">
							<p
								className="max-w-[120px] truncate font-medium"
								title={request.unit.property.name}
							>
								{request.unit.property.name}
							</p>
							<p className="text-muted-foreground text-xs">
								Unit {request.unit.unitNumber}
							</p>
						</div>
					</div>
				) : (
					<span className="text-muted-foreground">No property</span>
				)}
			</TableCell>
			<TableCell>
				{request.unit?.leases?.[0]?.tenant ? (
					<div className="flex items-center gap-1 text-sm">
						<User className="text-muted-foreground h-3 w-3" />
						{request.unit.leases[0].tenant.name}
					</div>
				) : (
					<span className="text-muted-foreground">No tenant</span>
				)}
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<Link href={`/maintenance/${request.id}`}>
						<Button variant="ghost" size="sm">
							<Eye className="h-4 w-4" />
						</Button>
					</Link>
					<Link href={`/maintenance/${request.id}/edit`}>
						<Button variant="ghost" size="sm">
							<Edit3 className="h-4 w-4" />
						</Button>
					</Link>
					<Button variant="ghost" size="sm">
						<MessageSquare className="h-4 w-4" />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	)
}

function MaintenanceTableSkeleton() {
	return (
		<div className="space-y-4">
			{[...Array(5)].map((_, i) => (
				<div key={i} className="flex items-center space-x-4 p-4">
					<Skeleton className="h-10 w-10 rounded-lg" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-[200px]" />
						<Skeleton className="h-3 w-[150px]" />
					</div>
					<Skeleton className="h-6 w-16" />
					<Skeleton className="h-6 w-20" />
					<Skeleton className="h-4 w-[100px]" />
					<Skeleton className="h-4 w-[80px]" />
					<Skeleton className="h-8 w-24" />
				</div>
			))}
		</div>
	)
}

export function MaintenanceDataTable() {
	const {
		data: maintenanceRequests,
		isLoading,
		error
	} = useMaintenanceRequests()

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Maintenance Requests</CardTitle>
					<CardDescription>
						Manage all maintenance requests and work orders
					</CardDescription>
				</CardHeader>
				<CardContent>
					<MaintenanceTableSkeleton />
				</CardContent>
			</Card>
		)
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Maintenance Requests</CardTitle>
					<CardDescription>
						Manage all maintenance requests and work orders
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>
							Error loading maintenance requests
						</AlertTitle>
						<AlertDescription>
							There was a problem loading your maintenance
							requests. Please try refreshing the page.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		)
	}

	if (!maintenanceRequests?.length) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Maintenance Requests</CardTitle>
					<CardDescription>
						Manage all maintenance requests and work orders
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<Wrench className="text-muted-foreground/50 mb-4 h-16 w-16" />
						<h3 className="mb-2 text-lg font-medium">
							No maintenance requests
						</h3>
						<p className="text-muted-foreground mb-6 max-w-sm">
							No maintenance requests have been submitted yet.
							Create one to get started.
						</p>
						<Link href="/maintenance/new">
							<Button>
								<Plus className="mr-2 h-4 w-4" />
								Create First Request
							</Button>
						</Link>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Maintenance Requests</CardTitle>
						<CardDescription>
							Manage all maintenance requests and work orders
						</CardDescription>
					</div>
					<Link href="/maintenance/new">
						<Button size="sm">
							<Plus className="mr-2 h-4 w-4" />
							New Request
						</Button>
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Request</TableHead>
								<TableHead>Priority</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Property</TableHead>
								<TableHead>Tenant</TableHead>
								<TableHead className="w-[120px]">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{maintenanceRequests.map(request => (
								<MaintenanceRow
									key={request.id}
									request={request as MaintenanceTableRow}
								/>
							))}
						</TableBody>
					</Table>
				</div>

				{maintenanceRequests.length > 10 && (
					<div className="flex items-center justify-center pt-4">
						<Button variant="outline" size="sm">
							Load more requests
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
