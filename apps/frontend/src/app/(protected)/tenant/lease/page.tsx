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

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Skeleton } from '#components/ui/skeleton'
import { useCurrentLease } from '#hooks/api/use-lease'
import { formatCurrency } from '@repo/shared/utils/formatting'
import { Calendar, DollarSign, FileText, Home, MapPin } from 'lucide-react'
import Link from 'next/link'

export default function TenantLeasePage() {
	const { data: lease, isLoading } = useCurrentLease()

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	}

	const formatPropertyAddress = (property?: {
		address?: string | null
		city?: string | null
		state?: string | null
	}) => {
		if (!property) return 'Address not available'
		const addressParts = [property.address, property.city, property.state].filter(
			Boolean
		)
		return addressParts.length > 0
			? addressParts.join(', ')
			: 'Address not available'
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
				{lease?.status === 'ACTIVE' && (
					<Badge
						variant="outline"
						className="bg-success/10 text-success border-success/20"
					>
						Active
					</Badge>
				)}
			</div>
			{/* Property Information */}
			<CardLayout title="Property Details" description="Your current residence">
				<div className="space-y-4">
					<div className="flex items-start gap-4">
						<Home className="size-6 text-accent-main mt-1" />
						<div>
							<p className="font-semibold text-lg">
								{isLoading || !lease ? (
									<Skeleton className="h-7 w-64" />
								) : (
									`${lease.unit?.property?.name ?? 'Property'} - Unit ${lease.unit?.unitNumber ?? 'N/A'}`
								)}
							</p>
							<div className="flex items-center gap-2 text-muted-foreground mt-1">
								<MapPin className="size-4" />
								<span>
					{isLoading || !lease ? (
						<Skeleton className="h-4 w-48" />
					) : (
						formatPropertyAddress(lease.unit?.property)
					)}
				</span>
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
							<Calendar className="size-5 text-accent-main" />
							<div>
								<p className="text-sm text-muted-foreground">Start Date</p>
								{isLoading || !lease ? (
									<Skeleton className="h-5 w-28" />
								) : (
									<p className="font-semibold">{formatDate(lease.startDate)}</p>
								)}
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Calendar className="size-5 text-accent-main" />
							<div>
								<p className="text-sm text-muted-foreground">End Date</p>
								{isLoading || !lease ? (
									<Skeleton className="h-5 w-28" />
								) : (
									<p className="font-semibold">{lease.endDate ? formatDate(lease.endDate) : 'Month-to-Month'}</p>
								)}
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
							<DollarSign className="size-5 text-accent-main" />
							<div>
								<p className="text-sm text-muted-foreground">Monthly Rent</p>
								{isLoading || !lease ? (
									<Skeleton className="h-7 w-24" />
								) : (
									<p className="font-semibold text-xl">
										{formatCurrency(lease.rentAmount)}
									</p>
								)}
							</div>
						</div>
						<div className="flex items-center gap-3">
							<DollarSign className="size-5 text-accent-main" />
							<div>
								<p className="text-sm text-muted-foreground">
									Security Deposit
								</p>
								{isLoading || !lease ? (
									<Skeleton className="h-5 w-24" />
								) : (
									<p className="font-semibold">
										{formatCurrency(lease.securityDeposit)}
									</p>
								)}
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
					<div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
						<div className="flex items-center gap-3">
							<FileText className="size-5 text-accent-main" />
							<div>
								<p className="font-medium">Lease Agreement</p>
								<p className="text-sm text-muted-foreground">
									Signed on loading...
								</p>
							</div>
						</div>
						<Button variant="outline" size="sm">
							Download
						</Button>
					</div>
					<p className="text-sm text-center text-muted-foreground py-4">
						No documents available yet
					</p>
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
