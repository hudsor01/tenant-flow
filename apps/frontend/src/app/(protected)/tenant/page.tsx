/**
 * Tenant Portal Dashboard
 *
 * Self-service portal for tenants to:
 * - View their lease information
 * - Pay rent
 * - View payment history
 * - Submit maintenance requests
 * - View lease documents
 */

import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import {
	Calendar,
	CreditCard,
	FileText,
	Home,
	Settings,
	Wrench
} from 'lucide-react'
import Link from 'next/link'

export default function TenantDashboardPage() {
	return (
		<div className="space-y-8">
			{/* Welcome Section */}
			<div className="space-y-2">
				<h1 className="text-3xl font-bold tracking-tight">My Tenant Portal</h1>
				<p className="text-muted-foreground">
					View your lease, make payments, and submit maintenance requests
				</p>
			</div>

			{/* Quick Stats */}
			<div className="grid gap-4 md:grid-cols-3">
				<CardLayout
					title="Current Lease"
					description="Your active lease information"
					footer={
						<Link href="/tenant/lease">
							<Button variant="ghost" size="sm" className="w-full">
								View Details
							</Button>
						</Link>
					}
				>
					<div className="flex items-center gap-4">
						<Home className="h-8 w-8 text-accent-main" />
						<div>
							<p className="text-sm text-muted-foreground">Property</p>
							<p className="text-xl font-semibold">Loading...</p>
						</div>
					</div>
				</CardLayout>

				<CardLayout
					title="Next Payment"
					description="Upcoming rent payment"
					footer={
						<Link href="/tenant/payments">
							<Button className="w-full">Pay Now</Button>
						</Link>
					}
				>
					<div className="flex items-center gap-4">
						<Calendar className="h-8 w-8 text-accent-main" />
						<div>
							<p className="text-sm text-muted-foreground">Due Date</p>
							<p className="text-xl font-semibold">Loading...</p>
						</div>
					</div>
				</CardLayout>

				<CardLayout
					title="Maintenance"
					description="Active requests"
					footer={
						<Link href="/tenant/maintenance">
							<Button variant="outline" size="sm" className="w-full">
								View All
							</Button>
						</Link>
					}
				>
					<div className="flex items-center gap-4">
						<Wrench className="h-8 w-8 text-accent-main" />
						<div>
							<p className="text-sm text-muted-foreground">Open Requests</p>
							<p className="text-xl font-semibold">Loading...</p>
						</div>
					</div>
				</CardLayout>
			</div>

			{/* Quick Actions */}
			<CardLayout
				title="Quick Actions"
				description="Common tasks and shortcuts"
			>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<Link href="/tenant/payments">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-2 py-6"
						>
							<CreditCard className="h-6 w-6" />
							<span>Pay Rent</span>
						</Button>
					</Link>

					<Link href="/tenant/maintenance/new">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-2 py-6"
						>
							<Wrench className="h-6 w-6" />
							<span>Submit Request</span>
						</Button>
					</Link>

					<Link href="/tenant/documents">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-2 py-6"
						>
							<FileText className="h-6 w-6" />
							<span>View Documents</span>
						</Button>
					</Link>

					<Link href="/tenant/profile">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-2 py-6"
						>
							<Settings className="h-6 w-6" />
							<span>My Profile</span>
						</Button>
					</Link>
				</div>
			</CardLayout>

			{/* Recent Activity */}
			<div className="grid gap-4 lg:grid-cols-2">
				<CardLayout
					title="Recent Payments"
					description="Your last 5 rent payments"
					footer={
						<Link href="/tenant/payments/history">
							<Button variant="ghost" size="sm">
								View All Payments
							</Button>
						</Link>
					}
				>
					<div className="space-y-4">
						<div className="flex items-center justify-between py-2">
							<div>
								<p className="font-medium">Rent Payment</p>
								<p className="text-sm text-muted-foreground">
									Due: 1st of month
								</p>
							</div>
							<div className="text-right">
								<p className="font-semibold">$1,200</p>
								<p className="text-sm text-green-600">Paid</p>
							</div>
						</div>
						<p className="text-sm text-center text-muted-foreground py-4">
							No payment history yet
						</p>
					</div>
				</CardLayout>

				<CardLayout
					title="Maintenance Requests"
					description="Your recent requests"
					footer={
						<Link href="/tenant/maintenance">
							<Button variant="ghost" size="sm">
								View All Requests
							</Button>
						</Link>
					}
				>
					<div className="space-y-4">
						<p className="text-sm text-center text-muted-foreground py-4">
							No maintenance requests yet
						</p>
					</div>
				</CardLayout>
			</div>
		</div>
	)
}
