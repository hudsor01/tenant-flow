'use client'

import {
	CreditCard,
	Download,
	Wrench,
	FileText,
	User,
	Clock,
	CheckCircle,
	Plus,
	ChevronRight,
	Home,
	AlertCircle,
	Bell
} from 'lucide-react'
import type {
	TenantPortalProps,
	RentStatus,
	RequestStatus
} from '@/../product/sections/tenant-portal/types'
import { BlurFade } from '@/components/ui/blur-fade'
import { NumberTicker } from '@/components/ui/number-ticker'
import { BorderBeam } from '@/components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '@/components/ui/stat'

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount)
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	})
}

function getRentStatusIndicator(status: RentStatus) {
	const config = {
		upcoming: {
			className: 'text-muted-foreground',
			icon: Clock,
			label: 'Upcoming'
		},
		due_today: {
			className: 'text-warning',
			icon: AlertCircle,
			label: 'Due Today'
		},
		overdue: {
			className: 'text-destructive',
			icon: AlertCircle,
			label: 'Overdue'
		},
		paid: {
			className: 'text-success',
			icon: CheckCircle,
			label: 'Paid'
		}
	}

	const { className, icon: Icon, label } = config[status]

	return (
		<span
			className={`inline-flex items-center gap-1.5 text-sm font-medium ${className}`}
		>
			<Icon className="w-4 h-4" />
			{label}
		</span>
	)
}

function getRequestStatusIndicator(status: RequestStatus) {
	const config = {
		open: {
			className: 'text-warning',
			icon: Clock,
			label: 'Open'
		},
		in_progress: {
			className: 'text-primary',
			icon: AlertCircle,
			label: 'In Progress'
		},
		completed: {
			className: 'text-success',
			icon: CheckCircle,
			label: 'Completed'
		},
		cancelled: {
			className: 'text-muted-foreground',
			icon: Clock,
			label: 'Cancelled'
		}
	}

	const { className, icon: Icon, label } = config[status]

	return (
		<span
			className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}
		>
			<Icon className="w-3.5 h-3.5" />
			{label}
		</span>
	)
}

function getRentStatusText(status: RentStatus, daysUntilDue: number) {
	switch (status) {
		case 'upcoming':
			return `Due in ${daysUntilDue} days`
		case 'due_today':
			return 'Due today'
		case 'overdue':
			return `${Math.abs(daysUntilDue)} days overdue`
		case 'paid':
			return 'Paid'
	}
}

export function TenantPortal({
	rentSummary,
	paymentHistory,
	maintenanceRequests,
	documents,
	profile,
	onPayRent,
	onDownloadReceipt,
	onSubmitRequest,
	onViewRequest,
	onDownloadDocument,
	onUpdateProfile
}: TenantPortalProps) {
	const openRequests = maintenanceRequests.filter(
		r => r.status === 'open' || r.status === 'in_progress'
	).length

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<header className="bg-card border-b border-border">
					<div className="max-w-5xl mx-auto px-6 py-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
									<Home className="w-5 h-5 text-primary" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Tenant Portal</p>
									<h1 className="font-semibold text-foreground">
										{rentSummary.propertyName}
									</h1>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<button className="p-2.5 rounded-lg hover:bg-muted transition-colors relative">
									<Bell className="w-5 h-5 text-muted-foreground" />
									{openRequests > 0 && (
										<span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
									)}
								</button>
								<button
									onClick={onUpdateProfile}
									className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
								>
									<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
										<User className="w-4 h-4 text-primary" />
									</div>
									<span className="text-sm font-medium text-foreground hidden sm:block">
										{profile.name}
									</span>
								</button>
							</div>
						</div>
					</div>
				</header>
			</BlurFade>

			<main className="max-w-5xl mx-auto px-6 py-8">
				{/* Welcome Section */}
				<BlurFade delay={0.15} inView>
					<div className="mb-6">
						<h2 className="text-2xl font-semibold text-foreground">
							Welcome back, {profile.name.split(' ')[0]}
						</h2>
						<p className="text-muted-foreground">
							Unit {rentSummary.unitNumber} · {rentSummary.propertyName}
						</p>
					</div>
				</BlurFade>

				{/* Stats Cards - Premium Stat Components */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					<BlurFade delay={0.2} inView>
						<Stat className="relative overflow-hidden">
							{rentSummary.status !== 'paid' && (
								<BorderBeam
									size={80}
									duration={8}
									colorFrom="hsl(var(--primary))"
									colorTo="hsl(var(--primary)/0.3)"
								/>
							)}
							<StatLabel>Next Payment</StatLabel>
							<StatValue className="flex items-baseline gap-0.5">
								<span className="text-lg">$</span>
								<NumberTicker value={rentSummary.amount} duration={1000} />
							</StatValue>
							<StatIndicator variant="icon" color="primary">
								<CreditCard />
							</StatIndicator>
							<StatDescription>
								Due {formatDate(rentSummary.dueDate)}
							</StatDescription>
						</Stat>
					</BlurFade>

					<BlurFade delay={0.25} inView>
						<Stat className="relative overflow-hidden">
							{rentSummary.status === 'overdue' && (
								<BorderBeam
									size={80}
									duration={4}
									colorFrom="hsl(var(--destructive))"
									colorTo="hsl(var(--destructive)/0.3)"
								/>
							)}
							{rentSummary.status === 'due_today' && (
								<BorderBeam
									size={80}
									duration={6}
									colorFrom="hsl(45 93% 47%)"
									colorTo="hsl(45 93% 47% / 0.3)"
								/>
							)}
							{rentSummary.status === 'paid' && (
								<BorderBeam
									size={80}
									duration={10}
									colorFrom="hsl(142 76% 36%)"
									colorTo="hsl(142 76% 36% / 0.3)"
								/>
							)}
							<StatLabel>Payment Status</StatLabel>
							<StatValue
								className={`text-xl ${
									rentSummary.status === 'paid'
										? 'text-success'
										: rentSummary.status === 'overdue'
											? 'text-destructive'
											: rentSummary.status === 'due_today'
												? 'text-warning'
												: ''
								}`}
							>
								{getRentStatusIndicator(rentSummary.status)}
							</StatValue>
							<StatIndicator
								variant="icon"
								color={
									rentSummary.status === 'paid'
										? 'success'
										: rentSummary.status === 'overdue'
											? 'destructive'
											: rentSummary.status === 'due_today'
												? 'warning'
												: 'muted'
								}
							>
								{rentSummary.status === 'paid' ? <CheckCircle /> : <Clock />}
							</StatIndicator>
							<StatDescription>
								{getRentStatusText(
									rentSummary.status,
									rentSummary.daysUntilDue
								)}
							</StatDescription>
						</Stat>
					</BlurFade>

					<BlurFade delay={0.3} inView>
						<Stat className="relative overflow-hidden">
							{openRequests > 0 && (
								<BorderBeam
									size={80}
									duration={6}
									colorFrom="hsl(45 93% 47%)"
									colorTo="hsl(45 93% 47% / 0.3)"
								/>
							)}
							<StatLabel>Open Requests</StatLabel>
							<StatValue
								className={`flex items-baseline ${openRequests > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}
							>
								<NumberTicker value={openRequests} duration={800} />
							</StatValue>
							<StatIndicator
								variant="icon"
								color={openRequests > 0 ? 'warning' : 'muted'}
							>
								<Wrench />
							</StatIndicator>
							<StatDescription>Maintenance requests</StatDescription>
						</Stat>
					</BlurFade>

					<BlurFade delay={0.35} inView>
						<Stat>
							<StatLabel>Documents</StatLabel>
							<StatValue className="flex items-baseline">
								<NumberTicker value={documents.length} duration={800} />
							</StatValue>
							<StatIndicator variant="icon" color="muted">
								<FileText />
							</StatIndicator>
							<StatDescription>Available files</StatDescription>
						</Stat>
					</BlurFade>
				</div>

				{/* Rent Payment Card */}
				<BlurFade delay={0.4} inView>
					<div className="bg-card border border-border rounded-lg p-6 mb-6 relative overflow-hidden">
						{rentSummary.status !== 'paid' && (
							<BorderBeam
								size={120}
								duration={10}
								colorFrom="hsl(var(--primary))"
								colorTo="hsl(var(--primary)/0.3)"
							/>
						)}
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
									<CreditCard className="w-6 h-6 text-primary" />
								</div>
								<div>
									<h3 className="font-semibold text-foreground">
										Rent Payment
									</h3>
									<p className="text-sm text-muted-foreground">
										{rentSummary.status === 'paid'
											? 'Your rent is paid for this month'
											: `${formatCurrency(rentSummary.amount)} due ${formatDate(rentSummary.dueDate)}`}
									</p>
								</div>
							</div>
							{rentSummary.status !== 'paid' && (
								<button
									onClick={onPayRent}
									className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
								>
									<CreditCard className="w-5 h-5" />
									Pay Now
								</button>
							)}
						</div>
					</div>
				</BlurFade>

				{/* Two Column Layout */}
				<div className="grid gap-6 lg:grid-cols-2">
					{/* Payment History */}
					<BlurFade delay={0.45} inView>
						<div className="bg-card border border-border rounded-lg">
							<div className="p-5 border-b border-border">
								<h3 className="font-medium text-foreground">Payment History</h3>
								<p className="text-sm text-muted-foreground">
									Your recent payments
								</p>
							</div>
							<div className="divide-y divide-border">
								{paymentHistory.length === 0 ? (
									<div className="p-8 text-center">
										<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
											<CreditCard className="w-6 h-6 text-muted-foreground" />
										</div>
										<p className="text-muted-foreground">
											No payment history yet
										</p>
									</div>
								) : (
									paymentHistory.slice(0, 5).map((payment, idx) => (
										<BlurFade key={payment.id} delay={0.5 + idx * 0.05} inView>
											<div className="p-4 flex items-center justify-between">
												<div className="flex items-center gap-3">
													<div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
														<CheckCircle className="w-5 h-5 text-success" />
													</div>
													<div>
														<p className="font-medium text-foreground">
															{formatCurrency(payment.amount)}
														</p>
														<p className="text-sm text-muted-foreground">
															{formatDate(payment.paidDate)}
														</p>
													</div>
												</div>
												<button
													onClick={() => onDownloadReceipt?.(payment.id)}
													className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
													title="Download receipt"
												>
													<Download className="w-4 h-4" />
												</button>
											</div>
										</BlurFade>
									))
								)}
							</div>
						</div>
					</BlurFade>

					{/* Maintenance Requests */}
					<BlurFade delay={0.5} inView>
						<div className="bg-card border border-border rounded-lg">
							<div className="p-5 border-b border-border flex items-center justify-between">
								<div>
									<h3 className="font-medium text-foreground">
										Maintenance Requests
									</h3>
									<p className="text-sm text-muted-foreground">
										Track your requests
									</p>
								</div>
								<button
									onClick={onSubmitRequest}
									className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
								>
									<Plus className="w-4 h-4" />
									New
								</button>
							</div>
							<div className="divide-y divide-border">
								{maintenanceRequests.length === 0 ? (
									<div className="p-8 text-center">
										<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
											<Wrench className="w-6 h-6 text-muted-foreground" />
										</div>
										<p className="text-muted-foreground mb-4">
											No maintenance requests
										</p>
										<button
											onClick={onSubmitRequest}
											className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm rounded-lg transition-colors"
										>
											<Wrench className="w-4 h-4" />
											Submit a Request
										</button>
									</div>
								) : (
									maintenanceRequests.slice(0, 4).map((request, idx) => (
										<BlurFade key={request.id} delay={0.55 + idx * 0.05} inView>
											<button
												onClick={() => onViewRequest?.(request.id)}
												className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
											>
												<div className="flex items-center gap-3 min-w-0">
													<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
														<Wrench className="w-5 h-5 text-muted-foreground" />
													</div>
													<div className="min-w-0">
														<p className="font-medium text-foreground truncate">
															{request.title}
														</p>
														<div className="mt-1">
															{getRequestStatusIndicator(request.status)}
														</div>
													</div>
												</div>
												<ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
											</button>
										</BlurFade>
									))
								)}
							</div>
						</div>
					</BlurFade>
				</div>

				{/* Documents Section */}
				<BlurFade delay={0.6} inView>
					<div className="mt-6 bg-card border border-border rounded-lg">
						<div className="p-5 border-b border-border">
							<h3 className="font-medium text-foreground">Documents</h3>
							<p className="text-sm text-muted-foreground">
								Your lease and important files
							</p>
						</div>
						<div className="divide-y divide-border">
							{documents.length === 0 ? (
								<div className="p-8 text-center">
									<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
										<FileText className="w-6 h-6 text-muted-foreground" />
									</div>
									<p className="text-muted-foreground">
										No documents available
									</p>
								</div>
							) : (
								documents.map((doc, idx) => (
									<BlurFade key={doc.id} delay={0.65 + idx * 0.05} inView>
										<div className="p-4 flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
													<FileText className="w-5 h-5 text-muted-foreground" />
												</div>
												<div>
													<p className="font-medium text-foreground">
														{doc.name}
													</p>
													<p className="text-sm text-muted-foreground">
														Added {formatDate(doc.uploadedAt)}
													</p>
												</div>
											</div>
											<button
												onClick={() => onDownloadDocument?.(doc.id)}
												className="inline-flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors"
											>
												<Download className="w-4 h-4" />
												Download
											</button>
										</div>
									</BlurFade>
								))
							)}
						</div>
					</div>
				</BlurFade>
			</main>
		</div>
	)
}
