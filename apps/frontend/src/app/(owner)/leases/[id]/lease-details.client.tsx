'use client'

import { useState } from 'react'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription
} from '#components/ui/card'
import { Badge } from '#components/ui/badge'
import { Skeleton } from '#components/ui/skeleton'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '#components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { leaseQueries } from '#hooks/api/queries/lease-queries'
import { tenantQueries } from '#hooks/api/queries/tenant-queries'
import { useUnitList } from '#hooks/api/use-unit'
import { useCancelSignatureRequest } from '#hooks/api/use-lease'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import {
	Calendar,
	Home,
	User,
	FileText,
	Clock,
	CheckCircle,
	Send,
	PenLine,
	AlertTriangle,
	DollarSign,
	CreditCard,
	Building,
	CalendarDays,
	RefreshCw,
	XCircle
} from 'lucide-react'
import Link from 'next/link'
import { LeaseSignatureStatus } from '#components/leases/lease-signature-status'
import { SendForSignatureButton } from '#components/leases/send-for-signature-button'
import { SignLeaseButton } from '#components/leases/sign-lease-button'
import { DownloadSignedLeaseButton } from '#components/leases/download-signed-lease-button'
import { LEASE_STATUS } from '#lib/constants/status-values'
import { toast } from 'sonner'
import { cn } from '#lib/utils'
import type { Lease } from '@repo/shared/types/core'

interface LeaseDetailsProps {
	id: string
}

const logger = createLogger({ component: 'LeaseDetails' })

/** Timeline event for lease history display */
interface TimelineEvent {
	id: string
	type:
		| 'created'
		| 'sent_for_signature'
		| 'owner_signed'
		| 'tenant_signed'
		| 'activated'
		| 'renewed'
		| 'terminated'
		| 'ended'
	title: string
	description: string
	timestamp: string
	actor?: string
}

/** Generates timeline events from lease data */
function generateTimelineEvents(lease: Lease): TimelineEvent[] {
	const events: TimelineEvent[] = []

	// Lease created
	if (lease.created_at) {
		events.push({
			id: 'created',
			type: 'created',
			title: 'Lease Created',
			description: 'Lease draft was created',
			timestamp: lease.created_at,
			actor: 'Owner'
		})
	}

	// Sent for signature
	if (lease.sent_for_signature_at) {
		events.push({
			id: 'sent',
			type: 'sent_for_signature',
			title: 'Sent for Signature',
			description: 'Lease sent to tenant for signing',
			timestamp: lease.sent_for_signature_at,
			actor: 'Owner'
		})
	}

	// Owner signed
	if (lease.owner_signed_at) {
		events.push({
			id: 'owner_signed',
			type: 'owner_signed',
			title: 'Owner Signed',
			description: 'Lease signed by property owner',
			timestamp: lease.owner_signed_at,
			actor: 'Owner'
		})
	}

	// Tenant signed
	if (lease.tenant_signed_at) {
		events.push({
			id: 'tenant_signed',
			type: 'tenant_signed',
			title: 'Tenant Signed',
			description: 'Lease signed by tenant',
			timestamp: lease.tenant_signed_at,
			actor: 'Tenant'
		})
	}

	// Activated (when both signed and status is active)
	if (
		lease.lease_status === 'active' &&
		lease.owner_signed_at &&
		lease.tenant_signed_at
	) {
		const activatedAt = new Date(
			Math.max(
				new Date(lease.owner_signed_at).getTime(),
				new Date(lease.tenant_signed_at).getTime()
			)
		).toISOString()
		events.push({
			id: 'activated',
			type: 'activated',
			title: 'Lease Activated',
			description: 'Lease became active after both parties signed',
			timestamp: activatedAt
		})
	}

	// Terminated
	if (lease.lease_status === 'terminated' && lease.updated_at) {
		events.push({
			id: 'terminated',
			type: 'terminated',
			title: 'Lease Terminated',
			description: 'Lease was terminated early',
			timestamp: lease.updated_at
		})
	}

	// Ended
	if (lease.lease_status === 'ended' && lease.end_date) {
		events.push({
			id: 'ended',
			type: 'ended',
			title: 'Lease Ended',
			description: 'Lease reached its end date',
			timestamp: lease.end_date
		})
	}

	// Sort by timestamp (newest first)
	return events.sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
	)
}

/** Get icon for timeline event type */
function getTimelineIcon(type: TimelineEvent['type']) {
	const iconMap = {
		created: FileText,
		sent_for_signature: Send,
		owner_signed: PenLine,
		tenant_signed: PenLine,
		activated: CheckCircle,
		renewed: RefreshCw,
		terminated: XCircle,
		ended: Clock
	}
	return iconMap[type] || Clock
}

/** Get color classes for timeline event type */
function getTimelineColor(type: TimelineEvent['type']) {
	const colorMap = {
		created: 'text-stone-500 bg-stone-100 dark:bg-stone-800',
		sent_for_signature: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
		owner_signed: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
		tenant_signed: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
		activated: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
		renewed: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
		terminated: 'text-red-600 bg-red-100 dark:bg-red-900/30',
		ended: 'text-stone-500 bg-stone-100 dark:bg-stone-800'
	}
	return colorMap[type] || 'text-stone-500 bg-stone-100 dark:bg-stone-800'
}

/** Get status badge variant */
function getStatusBadge(status: string) {
	const config: Record<string, { className: string; label: string }> = {
		draft: {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Draft'
		},
		pending_signature: {
			className:
				'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
			label: 'Pending Signature'
		},
		active: {
			className:
				'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
			label: 'Active'
		},
		ended: {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Ended'
		},
		terminated: {
			className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
			label: 'Terminated'
		}
	}

	const defaultConfig = {
		className: 'bg-stone-100 text-stone-600',
		label: status
	}
	const statusConfig = config[status] ?? defaultConfig

	return (
		<span
			className={cn(
				'inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium',
				statusConfig.className
			)}
		>
			{statusConfig.label}
		</span>
	)
}

/** Format currency */
function formatCurrency(amount: number | null): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD'
	}).format(amount ?? 0)
}

/** Format date */
function formatDate(dateString: string | null): string {
	if (!dateString) return 'N/A'
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	})
}

/** Format relative time */
function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays === 0) return 'Today'
	if (diffDays === 1) return 'Yesterday'
	if (diffDays < 7) return `${diffDays} days ago`
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
	if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
	return `${Math.floor(diffDays / 365)} years ago`
}

/** Calculate days until expiry */
function getDaysUntilExpiry(endDate: string | null): number | null {
	if (!endDate) return null
	const end = new Date(endDate)
	const now = new Date()
	const diffMs = end.getTime() - now.getTime()
	return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function LeaseDetails({ id }: LeaseDetailsProps) {
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
	const { data: lease, isLoading, isError } = useQuery(leaseQueries.detail(id))
	const cancelSignature = useCancelSignatureRequest()

	const { data: tenantsResponse } = useQuery(tenantQueries.list())

	const { data: units } = useUnitList()

	const tenant = tenantsResponse?.data?.find(
		t => t.id === lease?.primary_tenant_id
	)
	const unit = units?.find(u => u.id === lease?.unit_id)

	if (isLoading) {
		return <LeaseDetailsSkeleton />
	}

	if (isError || !lease) {
		logger.error('Failed to load lease details', { action: 'loadLeaseDetails' })
		return (
			<Card className="border-destructive/50 bg-destructive/10">
				<CardContent className="p-6 text-center">
					<AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" />
					<h3 className="text-lg font-semibold text-destructive mb-2">
						Unable to load lease
					</h3>
					<p className="text-muted-foreground">
						Something went wrong while loading this lease. Please refresh and
						try again.
					</p>
				</CardContent>
			</Card>
		)
	}

	const isDraft = lease.lease_status === LEASE_STATUS.DRAFT
	const isPendingSignature =
		lease.lease_status === LEASE_STATUS.PENDING_SIGNATURE
	const isActive = lease.lease_status === LEASE_STATUS.ACTIVE

	const tenantFullName =
		tenant?.first_name || tenant?.last_name
			? `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
			: tenant?.name

	// Build props conditionally to satisfy exactOptionalPropertyTypes
	const signatureButtonProps: {
		leaseId: string
		size: 'sm'
		tenantName?: string
	} = {
		leaseId: lease.id,
		size: 'sm'
	}
	if (tenantFullName) {
		signatureButtonProps.tenantName = tenantFullName
	}

	const handleCancelSignature = async () => {
		try {
			await cancelSignature.mutateAsync(lease.id)
			toast.success('Signature request cancelled', {
				description: 'The lease has been reverted to draft status.'
			})
			setCancelDialogOpen(false)
		} catch (error) {
			toast.error('Failed to cancel signature request', {
				description:
					error instanceof Error ? error.message : 'Please try again.'
			})
		}
	}

	const timelineEvents = generateTimelineEvents(lease)
	const daysUntilExpiry = getDaysUntilExpiry(lease.end_date)
	const isExpiringSoon =
		daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30

	return (
		<div className="space-y-6">
			{/* Header with status and actions */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold">
						Lease #{lease.id.slice(0, 8)}
					</h2>
					{getStatusBadge(lease.lease_status)}
					{isExpiringSoon && (
						<Badge
							variant="outline"
							className="border-orange-500 text-orange-600 dark:text-orange-400"
						>
							<AlertTriangle className="w-3 h-3 mr-1" />
							Expires in {daysUntilExpiry} days
						</Badge>
					)}
				</div>
				<div className="flex flex-wrap gap-2">
					{isDraft && tenant && (
						<SendForSignatureButton {...signatureButtonProps} />
					)}
					{isPendingSignature && (
						<>
							<SignLeaseButton
								leaseId={lease.id}
								role="owner"
								alreadySigned={!!lease.owner_signed_at}
								size="sm"
							/>
							<SendForSignatureButton
								{...signatureButtonProps}
								action="resend"
								variant="outline"
							/>
							<AlertDialog
								open={cancelDialogOpen}
								onOpenChange={setCancelDialogOpen}
							>
								<AlertDialogTrigger asChild>
									<Button variant="outline" size="sm">
										Cancel Request
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											Cancel Signature Request?
										</AlertDialogTitle>
										<AlertDialogDescription>
											This will revert the lease to draft status. Any pending
											signatures will be lost and you will need to send a new
											signature request.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel disabled={cancelSignature.isPending}>
											Keep Request
										</AlertDialogCancel>
										<AlertDialogAction
											onClick={e => {
												e.preventDefault()
												handleCancelSignature()
											}}
											disabled={cancelSignature.isPending}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											{cancelSignature.isPending
												? 'Cancelling...'
												: 'Cancel Request'}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</>
					)}
					{isActive && (
						<DownloadSignedLeaseButton leaseId={lease.id} size="sm" />
					)}
					<Button asChild variant="outline" size="sm">
						<Link href={`/leases/${lease.id}/edit`}>Edit Lease</Link>
					</Button>
				</div>
			</div>

			{/* Main content grid */}
			<div className="grid gap-6 lg:grid-cols-3">
				{/* Left column - Main details */}
				<div className="lg:col-span-2 space-y-6">
					{/* Key metrics */}
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<Card>
							<CardContent className="p-4">
								<div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
									<DollarSign className="w-4 h-4" />
									Monthly Rent
								</div>
								<p className="text-xl font-semibold tabular-nums">
									{formatCurrency(lease.rent_amount)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4">
								<div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
									<CreditCard className="w-4 h-4" />
									Security Deposit
								</div>
								<p className="text-xl font-semibold tabular-nums">
									{formatCurrency(lease.security_deposit)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4">
								<div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
									<CalendarDays className="w-4 h-4" />
									Payment Day
								</div>
								<p className="text-xl font-semibold">
									{lease.payment_day
										? `${lease.payment_day}${getOrdinalSuffix(lease.payment_day)} of month`
										: 'N/A'}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4">
								<div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
									<Clock className="w-4 h-4" />
									Grace Period
								</div>
								<p className="text-xl font-semibold">
									{lease.grace_period_days
										? `${lease.grace_period_days} days`
										: 'None'}
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Tabbed content */}
					<Tabs defaultValue="details" className="w-full">
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="details">Details</TabsTrigger>
							<TabsTrigger value="timeline">Timeline</TabsTrigger>
							<TabsTrigger value="terms">Terms</TabsTrigger>
						</TabsList>

						<TabsContent value="details" className="mt-4">
							<Card>
								<CardContent className="p-6 space-y-6">
									{/* Lease Period */}
									<section>
										<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
											Lease Period
										</h3>
										<div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/20">
											<Calendar className="w-8 h-8 text-primary" />
											<div>
												<p className="font-medium">
													{formatDate(lease.start_date)} -{' '}
													{formatDate(lease.end_date)}
												</p>
												{daysUntilExpiry !== null && (
													<p
														className={cn(
															'text-sm',
															isExpiringSoon
																? 'text-orange-600 dark:text-orange-400'
																: 'text-muted-foreground'
														)}
													>
														{daysUntilExpiry > 0
															? `${daysUntilExpiry} days remaining`
															: daysUntilExpiry === 0
																? 'Expires today'
																: 'Expired'}
													</p>
												)}
											</div>
										</div>
									</section>

									{/* Tenant Info */}
									<section>
										<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
											Tenant
										</h3>
										{tenant ? (
											<div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/20">
												<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
													<User className="w-5 h-5 text-primary" />
												</div>
												<div>
													<p className="font-medium">
														{tenantFullName || 'Unknown'}
													</p>
													<p className="text-sm text-muted-foreground">
														{tenant.email}
													</p>
												</div>
											</div>
										) : (
											<p className="text-muted-foreground p-4 border rounded-lg bg-muted/10">
												No tenant assigned to this lease
											</p>
										)}
									</section>

									{/* Unit Info */}
									<section>
										<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
											Unit
										</h3>
										{unit ? (
											<div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/20">
												<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
													<Building className="w-5 h-5 text-primary" />
												</div>
												<div>
													<p className="font-medium">Unit {unit.unit_number}</p>
													<p className="text-sm text-muted-foreground">
														{unit.bedrooms} bed, {unit.bathrooms} bath
														{unit.square_feet
															? ` | ${unit.square_feet.toLocaleString()} sq ft`
															: ''}
													</p>
												</div>
											</div>
										) : (
											<p className="text-muted-foreground p-4 border rounded-lg bg-muted/10">
												No unit linked to this lease
											</p>
										)}
									</section>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="timeline" className="mt-4">
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Lease History</CardTitle>
									<CardDescription>
										Key events and milestones for this lease
									</CardDescription>
								</CardHeader>
								<CardContent>
									{timelineEvents.length > 0 ? (
										<div className="relative">
											{/* Timeline line */}
											<div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

											<div className="space-y-6">
												{timelineEvents.map((event, index) => {
													const Icon = getTimelineIcon(event.type)
													const colorClass = getTimelineColor(event.type)

													return (
														<div
															key={event.id}
															className="relative flex gap-4 pl-2"
														>
															{/* Icon */}
															<div
																className={cn(
																	'relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0',
																	colorClass
																)}
															>
																<Icon className="w-4 h-4" />
															</div>

															{/* Content */}
															<div className="flex-1 pb-6">
																<div className="flex items-center justify-between gap-2">
																	<h4 className="font-medium">{event.title}</h4>
																	<time className="text-xs text-muted-foreground">
																		{formatRelativeTime(event.timestamp)}
																	</time>
																</div>
																<p className="text-sm text-muted-foreground mt-0.5">
																	{event.description}
																</p>
																{event.actor && (
																	<p className="text-xs text-muted-foreground mt-1">
																		by {event.actor}
																	</p>
																)}
																{index === timelineEvents.length - 1 && (
																	<p className="text-xs text-muted-foreground mt-1">
																		{formatDate(event.timestamp)}
																	</p>
																)}
															</div>
														</div>
													)
												})}
											</div>
										</div>
									) : (
										<p className="text-muted-foreground text-center py-6">
											No timeline events recorded yet
										</p>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="terms" className="mt-4">
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Lease Terms</CardTitle>
									<CardDescription>
										Financial and policy details
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									{/* Financial Terms */}
									<section>
										<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
											Financial Terms
										</h3>
										<div className="grid gap-3 sm:grid-cols-2">
											<div className="p-3 rounded-lg border">
												<p className="text-sm text-muted-foreground">
													Late Fee
												</p>
												<p className="font-medium">
													{lease.late_fee_amount
														? `${formatCurrency(lease.late_fee_amount)} after ${lease.late_fee_days || 0} days`
														: 'None'}
												</p>
											</div>
											<div className="p-3 rounded-lg border">
												<p className="text-sm text-muted-foreground">Autopay</p>
												<p className="font-medium">
													{lease.auto_pay_enabled ? 'Enabled' : 'Disabled'}
												</p>
											</div>
											<div className="p-3 rounded-lg border">
												<p className="text-sm text-muted-foreground">
													Currency
												</p>
												<p className="font-medium">
													{lease.rent_currency || 'USD'}
												</p>
											</div>
											<div className="p-3 rounded-lg border">
												<p className="text-sm text-muted-foreground">
													Stripe Subscription
												</p>
												<p className="font-medium capitalize">
													{lease.stripe_subscription_status === 'none'
														? 'Not Set Up'
														: lease.stripe_subscription_status}
												</p>
											</div>
										</div>
									</section>

									{/* Property Rules */}
									{(lease.pets_allowed !== null ||
										lease.max_occupants !== null) && (
										<section>
											<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
												Property Rules
											</h3>
											<div className="grid gap-3 sm:grid-cols-2">
												{lease.max_occupants !== null && (
													<div className="p-3 rounded-lg border">
														<p className="text-sm text-muted-foreground">
															Max Occupants
														</p>
														<p className="font-medium">{lease.max_occupants}</p>
													</div>
												)}
												<div className="p-3 rounded-lg border">
													<p className="text-sm text-muted-foreground">Pets</p>
													<p className="font-medium">
														{lease.pets_allowed ? 'Allowed' : 'Not Allowed'}
														{lease.pets_allowed && lease.pet_deposit && (
															<span className="text-muted-foreground">
																{' '}
																(${lease.pet_deposit} deposit)
															</span>
														)}
													</p>
												</div>
											</div>
										</section>
									)}

									{/* Utilities */}
									{(lease.utilities_included?.length ||
										lease.tenant_responsible_utilities?.length) && (
										<section>
											<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
												Utilities
											</h3>
											<div className="space-y-3">
												{lease.utilities_included &&
													lease.utilities_included.length > 0 && (
														<div className="p-3 rounded-lg border">
															<p className="text-sm text-muted-foreground mb-1">
																Included in Rent
															</p>
															<div className="flex flex-wrap gap-1">
																{lease.utilities_included.map(util => (
																	<Badge
																		key={util}
																		variant="secondary"
																		className="capitalize"
																	>
																		{util}
																	</Badge>
																))}
															</div>
														</div>
													)}
												{lease.tenant_responsible_utilities &&
													lease.tenant_responsible_utilities.length > 0 && (
														<div className="p-3 rounded-lg border">
															<p className="text-sm text-muted-foreground mb-1">
																Tenant Responsible
															</p>
															<div className="flex flex-wrap gap-1">
																{lease.tenant_responsible_utilities.map(
																	util => (
																		<Badge
																			key={util}
																			variant="outline"
																			className="capitalize"
																		>
																			{util}
																		</Badge>
																	)
																)}
															</div>
														</div>
													)}
											</div>
										</section>
									)}

									{/* Disclosures */}
									{lease.property_built_before_1978 && (
										<section>
											<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
												Disclosures
											</h3>
											<div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
												<p className="text-sm font-medium text-amber-800 dark:text-amber-200">
													Lead Paint Disclosure
												</p>
												<p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
													Property built before 1978.
													{lease.lead_paint_disclosure_acknowledged
														? ' Disclosure acknowledged by tenant.'
														: ' Acknowledgment pending.'}
												</p>
											</div>
										</section>
									)}
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>

				{/* Right column - Sidebar */}
				<div className="space-y-4">
					{/* Signature Status - show for draft and pending_signature leases */}
					{(isDraft || isPendingSignature) && (
						<LeaseSignatureStatus leaseId={lease.id} />
					)}

					{/* Quick Actions */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Quick Actions</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{isActive && (
								<>
									<Button
										variant="outline"
										className="w-full justify-start"
										asChild
									>
										<Link href={`/rent-collection?lease_id=${lease.id}`}>
											<DollarSign className="w-4 h-4 mr-2" />
											View Payments
										</Link>
									</Button>
									<Button
										variant="outline"
										className="w-full justify-start"
										asChild
									>
										<Link href={`/maintenance?unit_id=${lease.unit_id}`}>
											<Home className="w-4 h-4 mr-2" />
											Maintenance Requests
										</Link>
									</Button>
								</>
							)}
							<Button
								variant="outline"
								className="w-full justify-start"
								asChild
							>
								<Link href={`/tenants/${lease.primary_tenant_id}`}>
									<User className="w-4 h-4 mr-2" />
									View Tenant Profile
								</Link>
							</Button>
							{unit && (
								<Button
									variant="outline"
									className="w-full justify-start"
									asChild
								>
									<Link
										href={`/properties/${unit.property_id}/units/${unit.id}`}
									>
										<Building className="w-4 h-4 mr-2" />
										View Unit Details
									</Link>
								</Button>
							)}
						</CardContent>
					</Card>

					{/* Subscription Status (if active lease) */}
					{isActive && lease.stripe_subscription_id && (
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">Autopay Status</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-sm text-muted-foreground">
											Status
										</span>
										<Badge
											variant={
												lease.stripe_subscription_status === 'active'
													? 'default'
													: 'secondary'
											}
										>
											{lease.stripe_subscription_status}
										</Badge>
									</div>
									{lease.subscription_failure_reason && (
										<div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/10 text-sm text-red-700 dark:text-red-300">
											{lease.subscription_failure_reason}
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	)
}

/** Skeleton loader for lease details */
function LeaseDetailsSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-48" />
				<div className="flex gap-2">
					<Skeleton className="h-9 w-24" />
					<Skeleton className="h-9 w-24" />
				</div>
			</div>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{[1, 2, 3, 4].map(i => (
					<Skeleton key={i} className="h-24" />
				))}
			</div>
			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<Skeleton className="h-96" />
				</div>
				<div className="space-y-4">
					<Skeleton className="h-48" />
					<Skeleton className="h-32" />
				</div>
			</div>
		</div>
	)
}

/** Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.) */
function getOrdinalSuffix(n: number): string {
	const s = ['th', 'st', 'nd', 'rd']
	const v = n % 100
	return s[(v - 20) % 10] || s[v] || s[0] || 'th'
}
