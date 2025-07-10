import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useBoolean, useMemoizedFn } from 'ahooks'
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'
import {
	DollarSign,
	Users,
	Home,
	AlertTriangle,
	PlusCircle,
	UserPlus,
	TrendingUp,
	ClipboardList,
	BookOpen,
	ArrowRight
} from 'lucide-react'
import type { Variants } from 'framer-motion'
import { motion } from 'framer-motion'
import { useProperties } from '@/hooks/useProperties'
import { useTenants } from '@/hooks/useTenants'
import { useMaintenanceRequests } from '@/hooks/useMaintenance'
import type { MaintenanceRequestWithRelations } from '@/types/relationships'
import PropertyFormModal from '@/components/properties/PropertyFormModal'
import InviteTenantModal from '@/components/tenant-management/InviteTenantModal'
import QuickPropertySetup from '@/components/properties/QuickPropertySetup'

import PaymentInsights from '@/components/payments/PaymentInsights'
import { RealtimeActivityFeed } from '@/components/dashboard/RealtimeActivityFeed'
import { CriticalAlerts } from '@/components/dashboard/CriticalAlerts'
import { DashboardUpgradeCTA } from '@/components/billing/ContextualUpgradeCTA'
import { useCanPerformAction, useUserPlan } from '@/hooks/useSubscription'

interface StatCardProps {
	title: string
	value: string
	icon: LucideIcon
	description: string
	gradient: string
	delay: number
	onClick?: () => void
}

// interface QuickAction {
//   label: string;
//   icon: LucideIcon;
//   delay: number;
//   onClick: () => void;
// }

const StatCard: React.FC<StatCardProps> = ({
	title,
	value,
	icon: Icon,
	description,
	gradient,
	delay,
	onClick
}) => (
	<motion.div
		initial={{ opacity: 0, y: 30 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.6, delay: delay, ease: 'easeOut' }}
		whileHover={{
			y: -8,
			boxShadow: '0 12px 25px -8px rgba(0,0,0,0.2)',
			transition: { duration: 0.25, ease: 'circOut' }
		}}
		className={`h-full rounded-xl ${onClick ? 'cursor-pointer' : ''}`}
		onClick={onClick}
	>
		<Card
			className={`rounded-xl text-white shadow-xl transition-all duration-300 hover:shadow-2xl ${gradient} flex h-full flex-col justify-between p-1`}
		>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-4 pb-2">
				<CardTitle className="stat-label text-white">{title}</CardTitle>
				<Icon className="h-7 w-7 text-white/80" />
			</CardHeader>
			<CardContent className="px-5 pt-2 pb-4">
				<div className="stat-value mb-1 text-2xl text-white sm:text-3xl md:text-4xl">
					{value}
				</div>
				<p className="text-caption flex items-center text-white/90">
					<TrendingUp className="mr-1.5 h-4 w-4 text-white/70" />
					{description}
				</p>
			</CardContent>
		</Card>
	</motion.div>
)

const Dashboard: React.FC = () => {
	const navigate = useNavigate()
	// Using useAuth hook for authentication
	const [
		isPropertyModalOpen,
		{ setTrue: openPropertyModal, setFalse: closePropertyModal }
	] = useBoolean(false)
	const [
		isInviteTenantModalOpen,
		{ setTrue: openInviteTenantModal, setFalse: closeInviteTenantModal }
	] = useBoolean(false)
	const { canAddProperty, canAddTenant } = useCanPerformAction()
	const { data: userPlan } = useUserPlan()

	// Memoized navigation handlers to prevent unnecessary re-renders
	const handleNavigateToMaintenance = useMemoizedFn(() => {
		navigate('/maintenance')
	})

	const handleNavigateToTenants = useMemoizedFn(() => {
		navigate('/tenants')
	})

	const handleNavigateToProperties = useMemoizedFn(() => {
		navigate('/properties')
	})

	const handleRefreshPage = useMemoizedFn(() => {
		window.location.reload()
	})

	const handlePropertySetupComplete = useMemoizedFn(() => {
		navigate('/properties')
	})

	// Fetch real data
	const {
		data: properties = [],
		loading: propertiesLoading,
		error: propertiesError
	} = useProperties()
	const {
		data: tenants = [],
		isLoading: tenantsLoading,
		error: tenantsError
	} = useTenants()
	const {
		data: maintenanceRequests = [],
		loading: maintenanceLoading,
		error: maintenanceError
	} = useMaintenanceRequests()

	const typedMaintenanceRequests = maintenanceRequests as MaintenanceRequestWithRelations[]

	// Calculate real statistics
	const totalProperties = properties.length
	const totalUnits = properties.reduce(
		(sum, property) => sum + (property.units?.length || 0),
		0
	)
	const activeTenants = tenants.filter(
		tenant => tenant.invitationStatus === 'ACCEPTED'
	).length
	const totalRevenue = properties.reduce(
		(sum, property) =>
			sum +
			(property.units?.reduce(
				(unitSum, unit) =>
					unitSum +
					(unit.leases?.some(lease => lease.status === 'ACTIVE')
						? unit.rent
						: 0),
				0
			) || 0),
		0
	)
	const openMaintenanceTickets = typedMaintenanceRequests.filter(
		(request) =>
			request.status === 'OPEN' || request.status === 'IN_PROGRESS'
	).length
	const urgentTickets = typedMaintenanceRequests.filter(
		(request) =>
			request.priority === 'URGENT' &&
			(request.status === 'OPEN' || request.status === 'IN_PROGRESS')
	).length

	const headlineVariants: Variants = {
		hidden: { opacity: 0 },
		visible: (i: number) => ({
			opacity: 1,
			transition: {
				delay: i * 0.15,
				duration: 0.8,
				ease: 'easeOut'
			}
		})
	}

	// Error handling
	const hasError = propertiesError || tenantsError || maintenanceError
	const isLoading = propertiesLoading || tenantsLoading || maintenanceLoading

	if (hasError) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<AlertTriangle className="text-destructive mx-auto mb-4 h-12 w-12" />
					<h2 className="text-foreground mb-2 text-xl font-semibold">
						Error Loading Dashboard
					</h2>
					<p className="text-muted-foreground mb-4">
						{propertiesError?.message ||
							tenantsError?.message ||
							maintenanceError?.message ||
							'Failed to load dashboard data. Please try again.'}
					</p>
					<Button onClick={handleRefreshPage} variant="outline">
						Try Again
					</Button>
				</div>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="border-primary h-32 w-32 animate-spin rounded-full border-b-2"></div>
			</div>
		)
	}

	const quickActions = [
		{
			label: 'Add New Property',
			icon: PlusCircle,
			delay: 0.9,
			onClick: openPropertyModal
		},
		{
			label: 'Invite New Tenant',
			icon: UserPlus,
			delay: 1.0,
			onClick: openInviteTenantModal
		},
		{
			label: 'View All Maintenance',
			icon: ClipboardList,
			delay: 1.1,
			onClick: handleNavigateToMaintenance
		}
	]

	return (
		<div
			data-testid="dashboard-content"
			className="space-y-10 p-2 md:p-4 lg:p-6"
		>
			<motion.div
				initial="hidden"
				animate="visible"
				className="mb-10 text-center lg:text-left"
			>
				<motion.h1
					className="font-serif text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl"
					custom={0}
					variants={headlineVariants}
				>
					<span className="from-primary via-primary/80 to-primary/60 bg-gradient-to-r bg-clip-text text-transparent">
						SIMPLIFY
					</span>
				</motion.h1>
				<motion.h1
					className="text-foreground font-serif text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl"
					custom={1}
					variants={headlineVariants}
				>
					PROPERTY MANAGEMENT
				</motion.h1>
				<motion.p
					className="text-muted-foreground mx-auto mt-4 max-w-2xl font-sans text-xl md:text-2xl lg:mx-0"
					custom={2}
					variants={headlineVariants}
				>
					TenantFlow helps you manage your properties with ease and
					efficiency.
				</motion.p>
			</motion.div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title="Monthly Revenue"
					value={
						propertiesLoading
							? 'Loading...'
							: `$${totalRevenue.toLocaleString()}`
					}
					icon={DollarSign}
					description={`From ${totalUnits} units`}
					gradient="bg-gradient-revenue"
					delay={0.3}
				/>
				<StatCard
					title="Active Tenants"
					value={
						tenantsLoading ? 'Loading...' : activeTenants.toString()
					}
					icon={Users}
					description={`${tenants.length} total tenants`}
					gradient="bg-gradient-tenants"
					delay={0.4}
					onClick={handleNavigateToTenants}
				/>
				<StatCard
					title="Properties"
					value={
						propertiesLoading
							? 'Loading...'
							: totalProperties.toString()
					}
					icon={Home}
					description={`${totalUnits} total units`}
					gradient="bg-gradient-properties"
					delay={0.5}
					onClick={handleNavigateToProperties}
				/>
				<StatCard
					title="Open Tickets"
					value={
						maintenanceLoading
							? 'Loading...'
							: openMaintenanceTickets.toString()
					}
					icon={AlertTriangle}
					description={`${urgentTickets} urgent`}
					gradient="bg-gradient-tickets"
					delay={0.6}
					onClick={handleNavigateToMaintenance}
				/>
			</div>

			{/* Quick Setup for New Users */}
			{totalProperties === 0 && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.7, ease: 'easeOut' }}
					className="flex justify-center"
				>
					<QuickPropertySetup
						onComplete={handlePropertySetupComplete}
					/>
				</motion.div>
			)}

			{/* Critical Alerts Section - High Priority */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, delay: 0.7, ease: 'easeOut' }}
			>
				<CriticalAlerts />
			</motion.div>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.8, ease: 'easeOut' }}
					className="lg:col-span-2"
				>
					<RealtimeActivityFeed />
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.9, ease: 'easeOut' }}
				>
					<Card className="bg-card border-border/60 h-full overflow-hidden rounded-xl shadow-xl">
						<CardHeader className="bg-card px-4 pt-4 pb-3 sm:px-6 sm:pt-6">
							<CardTitle className="text-foreground font-serif text-xl sm:text-2xl">
								Quick Actions
							</CardTitle>
							<CardDescription className="text-muted-foreground font-sans text-sm sm:text-base">
								Common tasks at your fingertips.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3 px-4 pt-2 pb-4 sm:space-y-4 sm:px-6 sm:pb-6">
							{quickActions.map((action, i) => (
								<motion.div
									key={action.label}
									initial={{ opacity: 0, scale: 0.9 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{
										duration: 0.4,
										delay: action.delay,
										ease: 'easeOut'
									}}
									whileHover={{
										scale: 1.03,
										transition: { duration: 0.2 }
									}}
									whileTap={{ scale: 0.98 }}
								>
									<Button
										variant={
											i === 0 ? 'default' : 'outline'
										}
										className={`flex w-full items-center justify-center py-3.5 font-sans text-base shadow-sm transition-all duration-200 hover:shadow-md ${i === 0 ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'border-primary text-primary hover:bg-primary/10 hover:text-primary'}`}
										onClick={action.onClick}
									>
										<action.icon className="mr-2.5 h-5 w-5" />{' '}
										{action.label}
									</Button>
								</motion.div>
							))}
						</CardContent>
					</Card>
				</motion.div>
			</div>

			{/* Contextual Upgrade CTA */}
			{userPlan &&
				userPlan.id !== 'enterprise' &&
				totalProperties > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.6,
							delay: 1.0,
							ease: 'easeOut'
						}}
						className="flex justify-center"
					>
						<DashboardUpgradeCTA
							size="default"
							customMessage={
								!canAddProperty()
									? "You've reached your property limit"
									: !canAddTenant()
										? "You've reached your tenant limit"
										: `Unlock advanced features for ${totalProperties} properties`
							}
						/>
					</motion.div>
				)}

			{/* Blog CTA Section */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, delay: 1.0, ease: 'easeOut' }}
			>
				<Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-4">
								<div className="rounded-lg bg-blue-500 p-3">
									<BookOpen className="h-6 w-6 text-white" />
								</div>
								<div>
									<h3 className="text-lg font-semibold text-gray-900">
										Property Management Tips & Insights
									</h3>
									<p className="text-sm text-gray-600">
										Stay updated with expert advice,
										industry trends, and proven strategies
										to maximize your rental income.
									</p>
								</div>
							</div>
							<Link to="/blog">
								<Button
									variant="outline"
									className="border-blue-300 bg-white hover:bg-blue-50"
								>
									<BookOpen className="mr-2 h-4 w-4" />
									Read Blog
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			</motion.div>

			{/* Financial Insights Section */}
			{totalProperties > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 1.1, ease: 'easeOut' }}
				>
					<PaymentInsights />
				</motion.div>
			)}

			{/* Modals */}
			<PropertyFormModal
				isOpen={isPropertyModalOpen}
				onClose={closePropertyModal}
				mode="create"
			/>

			<InviteTenantModal
				isOpen={isInviteTenantModalOpen}
				onClose={closeInviteTenantModal}
			/>
		</div>
	)
}

export default Dashboard
