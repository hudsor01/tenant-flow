import { formatDistanceToNow } from 'date-fns'
import { Home } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TabsContent } from '@/components/ui/tabs'
import { getMaintenanceBadgeVariant } from '@/hooks/useTenantDetailData'

interface MaintenanceRequest {
	id: string
	title: string
	description: string
	status: string
	priority?: string
	createdAt: string
}

interface TenantMaintenanceSectionProps {
	maintenanceRequests: MaintenanceRequest[]
}

/**
 * Tenant maintenance requests section displaying all maintenance history
 * Shows request status, priority, dates, and descriptions
 */
export default function TenantMaintenanceSection({
	maintenanceRequests
}: TenantMaintenanceSectionProps) {
	return (
		<TabsContent value="maintenance" className="space-y-4">
			<div className="space-y-4">
				{maintenanceRequests.map(request => (
					<Card
						key={request.id}
						className="transition-shadow hover:shadow-md"
					>
						<CardContent className="p-6">
							<div className="flex items-start justify-between">
								<div className="flex-1 space-y-2">
									<div className="flex items-center space-x-3">
										<h4 className="font-semibold">
											{request.title}
										</h4>
										<Badge
											variant={getMaintenanceBadgeVariant(
												request.status,
												request.priority
											)}
										>
											{request.status}
										</Badge>
									</div>
									<p className="text-muted-foreground text-sm">
										Maintenance Request
									</p>
									<p className="text-sm">
										{request.description}
									</p>
									<p className="text-muted-foreground text-xs">
										Submitted{' '}
										{formatDistanceToNow(
											new Date(request.createdAt),
											{ addSuffix: true }
										)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{maintenanceRequests.length === 0 && (
				<div className="py-12 text-center">
					<Home className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
					<p className="text-muted-foreground">
						No maintenance requests found
					</p>
				</div>
			)}
		</TabsContent>
	)
}
