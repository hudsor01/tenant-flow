/**
 * Tenant Maintenance Requests
 *
 * Shows the tenant's maintenance requests:
 * - Active requests
 * - Request history
 * - Status tracking
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { Plus, Wrench } from 'lucide-react'
import Link from 'next/link'

export default function TenantMaintenancePage() {
	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Maintenance Requests
					</h1>
					<p className="text-muted-foreground">
						View and manage your maintenance requests
					</p>
				</div>
				<Link href="/tenant/maintenance/new">
					<Button>
						<Plus className="size-4 mr-2" />
						New Request
					</Button>
				</Link>
			</div>

			{/* Active Requests */}
			<CardLayout
				title="Active Requests"
				description="Requests currently being processed"
			>
				<div className="space-y-3">
					<div className="flex items-center justify-between p-4 border rounded-lg">
						<div className="flex items-center gap-4">
							<Wrench className="size-5 text-accent-main" />
							<div>
								<p className="font-medium">Leaky Faucet</p>
								<p className="text-sm text-muted-foreground">
									Submitted 2 days ago
								</p>
							</div>
						</div>
						<Badge
							variant="outline"
							className="bg-yellow-50 text-yellow-700 border-yellow-200"
						>
							In Progress
						</Badge>
					</div>
					<p className="text-sm text-center text-muted-foreground py-8">
						No active maintenance requests
					</p>
				</div>
			</CardLayout>

			{/* Recent History */}
			<CardLayout
				title="Request History"
				description="Your past maintenance requests"
			>
				<div className="space-y-3">
					<p className="text-sm text-center text-muted-foreground py-8">
						No request history yet
					</p>
				</div>
			</CardLayout>
		</div>
	)
}
