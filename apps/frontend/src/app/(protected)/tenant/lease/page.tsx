/**
 * Tenant Lease View
 *
 * Shows the tenant's current lease information:
 * - Property details
 * - Lease term (start/end dates)
 * - Rent amount
 * - Security deposit
 * - Lease agreement document
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { Spinner } from '@/components/ui/spinner'
import { useCurrentLease } from '@/hooks/api/use-lease'
import { format } from 'date-fns'
import { Calendar, DollarSign, FileText, Home, MapPin } from 'lucide-react'
import Link from 'next/link'

export default function TenantLeasePage() {
	const { data: lease, isLoading, error } = useCurrentLease()

	if (isLoading) {
		return (
			<div className="space-y-8">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">My Lease</h1>
						<p className="text-muted-foreground">
							View your current lease details and agreement
						</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<Spinner className="h-8 w-8 animate-spin" />
					<span className="ml-3 text-muted-foreground">
						Loading lease information...
					</span>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="space-y-8">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">My Lease</h1>
						<p className="text-muted-foreground">
							View your current lease details and agreement
						</p>
					</div>
				</div>
				<div className="text-center py-12">
					<p className="text-muted-foreground">
						Failed to load lease information
					</p>
				</div>
			</div>
		)
	}

	if (!lease) {
		return (
			<div className="space-y-8">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">My Lease</h1>
						<p className="text-muted-foreground">
							View your current lease details and agreement
						</p>
					</div>
				</div>
				<div className="text-center py-12">
					<p className="text-muted-foreground">
						No active lease found. Please contact your property manager.
					</p>
				</div>
			</div>
		)
	}

	// Format lease status for display
	const getStatusBadge = (status: string) => {
		if (status === 'ACTIVE') {
			return (
				<Badge
					variant="outline"
					className="bg-green-50 text-green-700 border-green-200"
				>
					Active
				</Badge>
			)
		}
		return (
			<Badge
				variant="outline"
				className="bg-gray-50 text-gray-700 border-gray-200"
			>
				{status}
			</Badge>
		)
	}

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">My Lease</h1>
					<p className="text-muted-foreground">
						View your current lease details and agreement
					</p>
				</div>
				{getStatusBadge(lease.status)}
			</div>

			{/* Property Information */}
			<CardLayout title="Property Details" description="Your current residence">
				<div className="space-y-4">
					<div className="flex items-start gap-4">
						<Home className="h-6 w-6 text-accent-main mt-1" />
						<div>
							<p className="font-semibold text-lg">Unit {lease.unitId}</p>
							<div className="flex items-center gap-2 text-muted-foreground mt-1">
								<MapPin className="h-4 w-4" />
								<span>Property ID: {lease.propertyId || 'N/A'}</span>
							</div>
						</div>
					</div>
				</div>
			</CardLayout>

			{/* Lease Terms */}
			<div className="grid gap-4 md:grid-cols-2">
				<CardLayout title="Lease Term" description="Duration of your lease">
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<Calendar className="h-5 w-5 text-accent-main" />
							<div>
								<p className="text-sm text-muted-foreground">Start Date</p>
								<p className="font-semibold">
									{format(new Date(lease.startDate), 'MMM dd, yyyy')}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Calendar className="h-5 w-5 text-accent-main" />
							<div>
								<p className="text-sm text-muted-foreground">End Date</p>
								<p className="font-semibold">
									{format(new Date(lease.endDate), 'MMM dd, yyyy')}
								</p>
							</div>
						</div>
					</div>
				</CardLayout>

				<CardLayout
					title="Financial Details"
					description="Rent and deposit information"
				>
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<DollarSign className="h-5 w-5 text-accent-main" />
							<div>
								<p className="text-sm text-muted-foreground">Monthly Rent</p>
								<p className="font-semibold text-xl">
									${lease.rentAmount.toLocaleString()}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<DollarSign className="h-5 w-5 text-accent-main" />
							<div>
								<p className="text-sm text-muted-foreground">
									Security Deposit
								</p>
								<p className="font-semibold">
									${lease.securityDeposit.toLocaleString()}
								</p>
							</div>
						</div>
					</div>
				</CardLayout>
			</div>

			{/* Lease Documents */}
			<CardLayout
				title="Lease Documents"
				description="Your signed lease agreement and addendums"
			>
				<div className="space-y-3">
					{lease.terms ? (
						<div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
							<div className="flex items-center gap-3">
								<FileText className="h-5 w-5 text-accent-main" />
								<div>
									<p className="font-medium">Lease Agreement</p>
									<p className="text-sm text-muted-foreground">
										Signed on{' '}
										{format(new Date(lease.startDate), 'MMM dd, yyyy')}
									</p>
								</div>
							</div>
							<Button variant="outline" size="sm">
								View Terms
							</Button>
						</div>
					) : (
						<p className="text-sm text-center text-muted-foreground py-4">
							No documents available yet
						</p>
					)}
				</div>
			</CardLayout>

			{/* Quick Actions */}
			<div className="flex gap-4">
				<Link href="/tenant/payments">
					<Button>Pay Rent</Button>
				</Link>
				<Link href="/tenant/maintenance/new">
					<Button variant="outline">Submit Maintenance Request</Button>
				</Link>
			</div>
		</div>
	)
}
