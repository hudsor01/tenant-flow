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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import Link from 'next/link'
import type { Database, MaintenanceRequestWithDetails } from '@repo/shared'
import {
	getPriorityColor,
	getPriorityLabel,
	getRequestStatusColor,
	getRequestStatusLabel
} from '@repo/shared'

// Define types directly from API response - NO DUPLICATION
type MaintenanceRequest = MaintenanceRequestWithDetails
type Priority = Database['public']['Enums']['Priority']
type RequestStatus = Database['public']['Enums']['RequestStatus']

function MaintenanceRow({
	request
}: {
	request: MaintenanceRequest
}) {
	// Get status styling
	const getStatusBadge = (status: RequestStatus) => {
		const colorClass = getRequestStatusColor(status)
		const label = getRequestStatusLabel(status)

		return <Badge className={colorClass}>{label}</Badge>
	}

	// Get priority styling
	const getPriorityBadge = (priority: Priority) => {
		const colorClass = getPriorityColor(priority)
		const label = getPriorityLabel(priority)

		return <Badge className={colorClass}>{label}</Badge>
	}

	// Format currency
	const formatCurrency = (amount?: number | null) => {
		if (!amount) return 'Not set'
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount)
	}

	// Format date
	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	}

	return (
		<TableRow className="hover:bg-accent/50">
			<TableCell>
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/20">
						<i className="i-lucide-wrench inline-block h-4 w-4 text-orange-600 dark:text-orange-400"  />
					</div>
					<div className="space-y-1">
						<p className="font-medium leading-none">
							{request.title}
						</p>
						<div className="text-muted-foreground flex items-center gap-1 text-sm">
							<i className="i-lucide-home inline-block h-3 w-3"  />
							{request.unit.property.name || 'Unknown Property'}{' '}
							{request.unit.unitNumber && `- Unit ${request.unit.unitNumber}`}
						</div>
					</div>
				</div>
			</TableCell>
			<TableCell>{getPriorityBadge(request.priority)}</TableCell>
			<TableCell>{getStatusBadge(request.status)}</TableCell>
			<TableCell>
				<div className="flex items-center gap-1 text-sm">
					<i className="i-lucide-calendar inline-block text-muted-foreground h-3 w-3"  />
					{formatDate(request.createdAt)}
				</div>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-1 text-sm">
					<i className="i-lucide-dollar-sign inline-block text-muted-foreground h-3 w-3"  />
					{formatCurrency(request.estimatedCost)}
				</div>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<Link href={`/maintenance/${request.id}`}>
						<Button variant="ghost" size="sm">
							<i className="i-lucide-eye inline-block h-4 w-4"  />
						</Button>
					</Link>
					<Link href={`/maintenance/${request.id}/edit`}>
						<Button variant="ghost" size="sm">
							<i className="i-lucide-edit-3 inline-block h-4 w-4"  />
						</Button>
					</Link>
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
						<Skeleton className="h-4 w-[250px]" />
						<Skeleton className="h-3 w-[180px]" />
					</div>
					<Skeleton className="h-6 w-20" />
					<Skeleton className="h-6 w-16" />
					<Skeleton className="h-4 w-[100px]" />
					<Skeleton className="h-4 w-[80px]" />
					<Skeleton className="h-8 w-16" />
				</div>
			))}
		</div>
	)
}

interface MaintenanceTableUIProps {
	requests: MaintenanceRequestWithDetails[]
}

function MaintenanceTableUI({ requests }: MaintenanceTableUIProps) {
	if (!requests?.length) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Maintenance Requests</CardTitle>
					<CardDescription>
						Manage all your maintenance requests
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<i className="i-lucide-wrench inline-block text-muted-foreground/50 mb-4 h-16 w-16"  />
						<h3 className="mb-2 text-lg font-medium">
							No maintenance requests yet
						</h3>
						<p className="text-muted-foreground mb-6 max-w-sm">
							Get started by adding your first maintenance request
							to track property issues.
						</p>
						<Link href="/maintenance/new">
							<Button>
								<i className="i-lucide-plus inline-block mr-2 h-4 w-4"  />
								Add First Request
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
							Manage all your maintenance requests
						</CardDescription>
					</div>
					<Link href="/maintenance/new">
						<Button size="sm">
							<i className="i-lucide-plus inline-block mr-2 h-4 w-4"  />
							Add Request
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
								<TableHead>Created</TableHead>
								<TableHead>Estimated Cost</TableHead>
								<TableHead className="w-[100px]">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{requests.map(request => (
								<MaintenanceRow
									key={request.id}
									request={request}
								/>
							))}
						</TableBody>
					</Table>
				</div>

				{requests.length > 10 && (
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

export function MaintenanceDataTable() {
	const { data: requests, isLoading, error } = useMaintenanceRequests()

	// Loading state
	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Maintenance Requests</CardTitle>
					<CardDescription>
						Manage all your maintenance requests
					</CardDescription>
				</CardHeader>
				<CardContent>
					<MaintenanceTableSkeleton />
				</CardContent>
			</Card>
		)
	}

	// Error handling - throw to be caught by error boundary
	if (error) {
		throw error
	}

	return (
		<MaintenanceTableUI
			requests={requests as any || []}
		/>
	)
}
