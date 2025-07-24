import {
	AlertTriangle,
	Clock,
	Wrench,
	DollarSign,
	ChevronRight,
	Home,
	User
} from 'lucide-react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
	useUpcomingRentAlerts,
	useRentAlertCounts,
	type RentAlert
} from '@/hooks/useUpcomingRentAlerts'
import {
	useMaintenanceAlerts,
	useMaintenanceAlertCounts,
	type MaintenanceAlert
} from '@/hooks/useMaintenanceAlerts'
import { cn } from '@/lib/utils/css.utils'

type Alert = RentAlert | MaintenanceAlert

const severityColors = {
	error: 'bg-red-50 border-red-200 text-red-800',
	warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
	info: 'bg-blue-50 border-blue-200 text-blue-800'
}

const severityBadgeColors = {
	error: 'bg-red-100 text-red-700 border-red-300',
	warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
	info: 'bg-blue-100 text-blue-700 border-blue-300'
}

function RentAlert({ alert }: { alert: RentAlert }) {
	return (
		<div
			className={cn(
				'rounded-lg border p-4 transition-all duration-200 hover:shadow-md',
				severityColors[alert.severity]
			)}
		>
			<div className="flex items-start justify-between">
				<div className="flex items-start space-x-3">
					<div
						className={cn(
							'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
							alert.severity === 'error'
								? 'bg-red-100'
								: alert.severity === 'warning'
									? 'bg-yellow-100'
									: 'bg-blue-100'
						)}
					>
						<DollarSign
							className={cn(
								'h-4 w-4',
								alert.severity === 'error'
									? 'text-red-600'
									: alert.severity === 'warning'
										? 'text-yellow-600'
										: 'text-blue-600'
							)}
						/>
					</div>

					<div className="min-w-0 flex-1">
						<div className="mb-1 flex items-center space-x-2">
							<h4 className="text-sm font-medium">
								{alert.title}
							</h4>
							<Badge
								variant="outline"
								className={cn(
									'text-xs',
									severityBadgeColors[alert.severity]
								)}
							>
								{alert.type.replace('_', ' ')}
							</Badge>
						</div>

						<p className="mb-2 text-sm opacity-90">
							{alert.message}
						</p>

						<div className="flex flex-wrap gap-2 text-xs opacity-75">
							<span className="flex items-center space-x-1">
								<Home className="h-3 w-3" />
								<span>
									{alert.property.name} - Unit{' '}
									{alert.unit.name}
								</span>
							</span>
							<span className="flex items-center space-x-1">
								<User className="h-3 w-3" />
								<span>{alert.tenant.name}</span>
							</span>
							<span className="flex items-center space-x-1">
								<DollarSign className="h-3 w-3" />
								<span>${alert.lease.rentAmount}</span>
							</span>
						</div>
					</div>
				</div>

				<Button
					variant="ghost"
					size="sm"
					className="opacity-75 hover:opacity-100"
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)
}

function MaintenanceAlert({ alert }: { alert: MaintenanceAlert }) {
	return (
		<div
			className={cn(
				'rounded-lg border p-4 transition-all duration-200 hover:shadow-md',
				severityColors[alert.severity]
			)}
		>
			<div className="flex items-start justify-between">
				<div className="flex items-start space-x-3">
					<div
						className={cn(
							'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
							alert.severity === 'error'
								? 'bg-red-100'
								: alert.severity === 'warning'
									? 'bg-yellow-100'
									: 'bg-blue-100'
						)}
					>
						<Wrench
							className={cn(
								'h-4 w-4',
								alert.severity === 'error'
									? 'text-red-600'
									: alert.severity === 'warning'
										? 'text-yellow-600'
										: 'text-blue-600'
							)}
						/>
					</div>

					<div className="min-w-0 flex-1">
						<div className="mb-1 flex items-center space-x-2">
							<h4 className="text-sm font-medium">
								{alert.title}
							</h4>
							<Badge
								variant="outline"
								className={cn(
									'text-xs',
									severityBadgeColors[alert.severity]
								)}
							>
								{alert.priority}
							</Badge>
						</div>

						<p className="mb-2 text-sm opacity-90">
							{alert.message}
						</p>

						<div className="flex flex-wrap gap-2 text-xs opacity-75">
							<span className="flex items-center space-x-1">
								<Home className="h-3 w-3" />
								<span>
									{'request' in alert && alert.request.propertyName
                                            ? `${alert.request.propertyName}${alert.request.unitNumber ? ` - Unit ${alert.request.unitNumber}` : ''}`
                                            : 'Unknown location'}
								</span>
							</span>
							<span className="flex items-center space-x-1">
								<Clock className="h-3 w-3" />
								<span>{alert.daysOld} days old</span>
							</span>
						</div>
					</div>
				</div>

				<Button
					variant="ghost"
					size="sm"
					className="opacity-75 hover:opacity-100"
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)
}

export function CriticalAlerts() {
	const { data: rentAlerts = [], isLoading: rentLoading } =
		useUpcomingRentAlerts()
	const { alerts: maintenanceAlerts = [], isLoading: maintenanceLoading } =
		useMaintenanceAlerts()
	const rentCounts = useRentAlertCounts()
	const maintenanceCounts = useMaintenanceAlertCounts()

	const isLoading = rentLoading || maintenanceLoading
	const allAlerts: Alert[] = [...rentAlerts, ...maintenanceAlerts]
		.sort((a, b) => {
			// Sort by severity first (error > warning > info)
			const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 }
			const aSeverity = severityOrder[a.severity as string] ?? 3
			const bSeverity = severityOrder[b.severity as string] ?? 3

			if (aSeverity !== bSeverity) return aSeverity - bSeverity

			// Then by creation date (newest first)
			// RentAlert has dueDate, MaintenanceAlert has createdAt
			const aDate = 'createdAt' in a ? (a as MaintenanceAlert).createdAt : (a as RentAlert).dueDate
			const bDate = 'createdAt' in b ? (b as MaintenanceAlert).createdAt : (b as RentAlert).dueDate
			return new Date(bDate).getTime() - new Date(aDate).getTime()
		})
		.slice(0, 10) // Show top 10 critical alerts

	const totalCritical = (rentCounts?.overdue || 0) + (maintenanceCounts?.emergency || 0)
	const totalWarnings = (rentCounts?.due_soon || 0) + (maintenanceCounts?.high_priority || 0)

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						<AlertTriangle className="h-5 w-5" />
						<span>Critical Alerts</span>
					</div>
					<div className="flex items-center space-x-2">
						{totalCritical > 0 && (
							<Badge variant="destructive" className="text-xs">
								{totalCritical} Critical
							</Badge>
						)}
						{totalWarnings > 0 && (
							<Badge
								variant="secondary"
								className="bg-yellow-100 text-xs text-yellow-700"
							>
								{totalWarnings} Warnings
							</Badge>
						)}
					</div>
				</CardTitle>
				<CardDescription>
					Urgent items requiring immediate attention: rent collection
					and maintenance requests
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-3">
						{[1, 2, 3].map(i => (
							<div
								key={i}
								className="animate-pulse rounded-lg border p-4"
							>
								<div className="flex items-start space-x-3">
									<div className="h-8 w-8 rounded-full bg-gray-200" />
									<div className="flex-1 space-y-2">
										<div className="h-4 w-3/4 rounded bg-gray-200" />
										<div className="h-3 w-1/2 rounded bg-gray-200" />
									</div>
								</div>
							</div>
						))}
					</div>
				) : allAlerts.length === 0 ? (
					<div className="py-8 text-center">
						<AlertTriangle className="mx-auto mb-4 h-12 w-12 text-green-400" />
						<p className="font-medium text-green-600">All Good!</p>
						<p className="mt-1 text-sm text-gray-500">
							No critical alerts at this time
						</p>
					</div>
				) : (
					<ScrollArea className="h-96">
						<div className="space-y-3">
							{allAlerts.map(alert =>
								'lease' in alert ? (
									<RentAlert
										key={alert.id}
										alert={alert as RentAlert}
									/>
								) : (
									<MaintenanceAlert
										key={alert.id}
										alert={alert as MaintenanceAlert}
									/>
								)
							)}
						</div>
					</ScrollArea>
				)}

				{allAlerts.length > 0 && (
					<div className="mt-4 border-t pt-4">
						<div className="flex justify-between text-sm text-gray-600">
							<span>
								{rentAlerts.length} rent alerts,{' '}
								{maintenanceAlerts.length} maintenance alerts
							</span>
							<Button
								variant="ghost"
								size="sm"
								className="text-blue-600 hover:text-blue-800"
							>
								View All Alerts
								<ChevronRight className="ml-1 h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}