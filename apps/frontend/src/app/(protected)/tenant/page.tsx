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
import { Skeleton } from '@/components/ui/skeleton'
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
		<div className="space-y-10">
			{/* Welcome Section */}
			<div className="space-y-3">
				<h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
					My Tenant Portal
				</h1>
				<p className="text-lg text-muted-foreground max-w-2xl">
					View your lease, make payments, and submit maintenance requests
				</p>
			</div>

			{/* Quick Stats */}
			<div className="grid gap-6 md:grid-cols-3">
				<CardLayout
					title="Current Lease"
					description="Your active lease information"
					className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-blue-50/50 to-card dark:from-blue-950/20 dark:to-card border-2 hover:border-blue-200 dark:hover:border-blue-900"
					footer={
						<Link href="/tenant/lease">
							<Button
								variant="ghost"
								size="sm"
								className="w-full"
								style={{ minHeight: '44px' }}
							>
								View Details
							</Button>
						</Link>
					}
				>
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
							<Home className="h-7 w-7 text-blue-600 dark:text-blue-400" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Property</p>
							<Skeleton className="h-7 w-48" />
						</div>
					</div>
				</CardLayout>

				<CardLayout
					title="Next Payment"
					description="Upcoming rent payment"
					className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-green-50/50 to-card dark:from-green-950/20 dark:to-card border-2 hover:border-green-200 dark:hover:border-green-900"
					footer={
						<Link href="/tenant/payments">
							<Button className="w-full" style={{ minHeight: '44px' }}>
								Pay Now
							</Button>
						</Link>
					}
				>
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
							<Calendar className="h-7 w-7 text-green-600 dark:text-green-400" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Due Date</p>
							<Skeleton className="h-7 w-32" />
						</div>
					</div>
				</CardLayout>

				<CardLayout
					title="Maintenance"
					description="Active requests"
					className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-amber-50/50 to-card dark:from-amber-950/20 dark:to-card border-2 hover:border-amber-200 dark:hover:border-amber-900"
					footer={
						<Link href="/tenant/maintenance">
							<Button
								variant="outline"
								size="sm"
								className="w-full"
								style={{ minHeight: '44px' }}
							>
								View All
							</Button>
						</Link>
					}
				>
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
							<Wrench className="h-7 w-7 text-amber-600 dark:text-amber-400" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Open Requests</p>
							<Skeleton className="h-7 w-12" />
						</div>
					</div>
				</CardLayout>
			</div>

			{/* Quick Actions */}
			<CardLayout
				title="Quick Actions"
				description="Common tasks and shortcuts"
				className="border-2"
			>
				<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
					<Link href="/tenant/payments" className="group">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-3 py-8 border-2 hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-md"
							style={{ minHeight: '44px' }}
						>
							<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<CreditCard className="h-6 w-6 text-primary" />
							</div>
							<span className="font-medium">Pay Rent</span>
						</Button>
					</Link>

					<Link href="/tenant/maintenance/new" className="group">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-3 py-8 border-2 hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-md"
							style={{ minHeight: '44px' }}
						>
							<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<Wrench className="h-6 w-6 text-primary" />
							</div>
							<span className="font-medium">Submit Request</span>
						</Button>
					</Link>

					<Link href="/tenant/documents" className="group">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-3 py-8 border-2 hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-md"
							style={{ minHeight: '44px' }}
						>
							<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<FileText className="h-6 w-6 text-primary" />
							</div>
							<span className="font-medium">View Documents</span>
						</Button>
					</Link>

					<Link href="/tenant/profile" className="group">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-3 py-8 border-2 hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-md"
							style={{ minHeight: '44px' }}
						>
							<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<Settings className="h-6 w-6 text-primary" />
							</div>
							<span className="font-medium">My Profile</span>
						</Button>
					</Link>
				</div>
			</CardLayout>

			{/* Recent Activity */}
			<div className="grid gap-6 lg:grid-cols-2">
				<CardLayout
					title="Recent Payments"
					description="Your last 5 rent payments"
					className="border-2"
					footer={
						<Link href="/tenant/payments/history">
							<Button variant="ghost" size="sm" style={{ minHeight: '44px' }}>
								View All Payments
							</Button>
						</Link>
					}
				>
					<div className="space-y-4">
						<div className="flex items-center justify-between py-3 border-b border-border/50">
							<div>
								<p className="font-medium">Rent Payment</p>
								<p className="text-sm text-muted-foreground">
									Due: 1st of month
								</p>
							</div>
							<div className="text-right">
								<p className="font-semibold">$1,200</p>
								<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
									<div className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400" />
									<span className="text-xs font-medium text-green-700 dark:text-green-300">
										Paid
									</span>
								</div>
							</div>
						</div>
						<div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
							<p className="text-sm text-muted-foreground">
								No payment history yet
							</p>
						</div>
					</div>
				</CardLayout>

				<CardLayout
					title="Maintenance Requests"
					description="Your recent requests"
					className="border-2"
					footer={
						<Link href="/tenant/maintenance">
							<Button variant="ghost" size="sm" style={{ minHeight: '44px' }}>
								View All Requests
							</Button>
						</Link>
					}
				>
					<div className="space-y-4">
						<div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
							<p className="text-sm text-muted-foreground">
								No maintenance requests yet
							</p>
						</div>
					</div>
				</CardLayout>
			</div>
		</div>
	)
}
