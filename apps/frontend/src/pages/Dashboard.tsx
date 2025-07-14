import React from 'react'
import { useRouter, Link } from '@tanstack/react-router'
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
import { useAuth } from '@/hooks/useApiAuth'
import { useTenants } from '@/hooks/useTenants'
import { useMaintenanceRequests } from '@/hooks/useMaintenance'
import type { MaintenanceRequestWithRelations } from '@/types/relationships'
import type { UnitWithDetails } from '@/types/api'
import type { Property as BaseProperty } from '../../../../packages/types/entities'

type DashboardProperty = BaseProperty & {
	units?: UnitWithDetails[]
}
import PropertyFormModal from '@/components/properties/PropertyFormModal'
import InviteTenantModal from '@/components/tenant-management/InviteTenantModal'
import QuickPropertySetup from '@/components/properties/QuickPropertySetup'

import PaymentInsights from '@/components/payments/PaymentInsights'
import { RealtimeActivityFeed } from '@/components/dashboard/RealtimeActivityFeed'
import { CriticalAlerts } from '@/components/dashboard/CriticalAlerts'
import { DashboardUpgradeCTA } from '@/components/billing/ContextualUpgradeCTA'
import { TrialCountdownBanner } from '@/components/billing/TrialCountdownBanner'
import { useUserPlan } from '@/hooks/useSubscription'
import { usePropertyEntitlements, useTenantEntitlements } from '@/hooks/useEntitlements'

interface StatCardProps {
	title: string
	value: string
	icon: LucideIcon
	description: string
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
			className={`rounded-2xl bg-gray-800/40 backdrop-blur-lg border border-gray-700/50 text-white shadow-2xl transition-all duration-300 hover:shadow-2xl hover:bg-gray-800/60 flex h-full flex-col justify-between p-1`}
		>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-4 pb-2">
				<CardTitle className="stat-label text-gray-200 text-sm font-medium">{title}</CardTitle>
				<div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/20">
					<Icon className="h-5 w-5 text-blue-400" />
				</div>
			</CardHeader>
			<CardContent className="px-5 pt-2 pb-4">
				<div className="stat-value mb-1 text-2xl text-white sm:text-3xl md:text-4xl font-bold">
					{value}
				</div>
				<p className="text-caption flex items-center text-gray-400 text-sm">
					<TrendingUp className="mr-1.5 h-4 w-4 text-green-400" />
					{description}
				</p>
			</CardContent>
		</Card>
	</motion.div>
)

const Dashboard: React.FC = () => {
	const router = useRouter();
	const { user, isLoading: authLoading } = useAuth();

	// All hooks must be called unconditionally
	const [isPropertyModalOpen, setPropertyModalOpen] = React.useState(false);
	const openPropertyModal = React.useCallback(() => setPropertyModalOpen(true), []);
	const closePropertyModal = React.useCallback(() => setPropertyModalOpen(false), []);
	const [isInviteTenantModalOpen, setInviteTenantModalOpen] = React.useState(false);
	const openInviteTenantModal = React.useCallback(() => setInviteTenantModalOpen(true), []);
	const closeInviteTenantModal = React.useCallback(() => setInviteTenantModalOpen(false), []);
	const { data: userPlan } = useUserPlan();
	const propertyEntitlements = usePropertyEntitlements();
	const tenantEntitlements = useTenantEntitlements();

	// Memoized navigation handlers to prevent unnecessary re-renders
	const handleNavigateToMaintenance = React.useCallback(() => {
		router.navigate({ to: '/maintenance' });
	}, [router]);

	const handleNavigateToTenants = React.useCallback(() => {
		router.navigate({ to: '/tenants' });
	}, [router]);

	const handleNavigateToProperties = React.useCallback(() => {
		router.navigate({ to: '/properties' });
	}, [router]);

	const handleRefreshPage = React.useCallback(() => {
		window.location.reload();
	}, []);

	const handlePropertySetupComplete = React.useCallback(() => {
		router.navigate({ to: '/properties' });
	}, [router]);

	// Fetch real data - only when user is authenticated
	const {
		data: properties = [],
		loading: propertiesLoading,
		error: propertiesError,
	} = useProperties();
	const {
		data: tenants = [],
		isLoading: tenantsLoading,
		error: tenantsError,
	} = useTenants();
	const {
		data: maintenanceRequests = [],
		loading: maintenanceLoading,
		error: maintenanceError,
	} = useMaintenanceRequests();

	const typedMaintenanceRequests = maintenanceRequests as MaintenanceRequestWithRelations[];

	// Auth guard: redirect unauthenticated users to login
	React.useEffect(() => {
		if (!authLoading && !user) {
			router.navigate({ to: '/auth/login' });
		}
	}, [authLoading, user, router]);

	// Don't render dashboard data components if not authenticated
	if (authLoading || !user) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
				<div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-400"></div>
			</div>
		);
	}

	// Calculate real statistics
	const totalProperties = properties.length
	const totalUnits = properties.reduce(
		(sum: number, property: DashboardProperty) => sum + (property.units?.length || 0),
		0
	)
	const activeTenants = tenants.filter(
		(tenant: { invitationStatus?: string }) => tenant.invitationStatus === 'ACCEPTED'
	).length
	const totalRevenue = properties.reduce(
		(sum: number, property: DashboardProperty) =>
			sum +
			(
				property.units?.reduce(
					(unitSum: number, unit: UnitWithDetails) =>
						unitSum +
						(Array.isArray(unit.Lease) && unit.Lease.some((lease: { status: string }) => lease.status === 'ACTIVE')
							? unit.rent
							: 0),
					0
				) || 0
			),
		0
	)
	const openMaintenanceTickets = typedMaintenanceRequests.filter(
		(request: MaintenanceRequestWithRelations) =>
			request.status === 'OPEN' || request.status === 'IN_PROGRESS'
	).length
	const urgentTickets = typedMaintenanceRequests.filter(
		(request: MaintenanceRequestWithRelations) =>
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
			<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
				<div className="text-center p-8 rounded-2xl bg-gray-800/40 backdrop-blur-lg border border-gray-700/50 shadow-2xl">
					<AlertTriangle className="text-red-400 mx-auto mb-4 h-12 w-12" />
					<h2 className="text-white mb-2 text-xl font-semibold">
						Error Loading Dashboard
					</h2>
					<p className="text-gray-300 mb-4">
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
			<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
				<div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-400"></div>
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
			className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 space-y-10 p-2 md:p-4 lg:p-6"
		>
			<motion.div
				initial="hidden"
				animate="visible"
				className="mb-10 text-center lg:text-left"
			>
				<motion.h1
					className="font-serif text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-white"
					custom={0}
					variants={headlineVariants}
				>
					<span className="from-blue-400 via-purple-400 to-cyan-400 bg-gradient-to-r bg-clip-text text-transparent">
						SIMPLIFY
					</span>
				</motion.h1>
				<motion.h1
					className="text-white font-serif text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl"
					custom={1}
					variants={headlineVariants}
				>
					PROPERTY MANAGEMENT
				</motion.h1>
				<motion.p
					className="text-gray-300 mx-auto mt-4 max-w-2xl font-sans text-xl md:text-2xl lg:mx-0"
					custom={2}
					variants={headlineVariants}
				>
					TenantFlow helps you manage your properties with ease and
					efficiency.
				</motion.p>
			</motion.div>

			{/* Trial Countdown Banner */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, delay: 0.8, ease: 'easeOut' }}
			>
				<TrialCountdownBanner />
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
					delay={0.3}
				/>
				<StatCard
					title="Active Tenants"
					value={
						tenantsLoading ? 'Loading...' : activeTenants.toString()
					}
					icon={Users}
					description={`${tenants.length} total tenants`}
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
					<Card className="bg-gray-800/40 backdrop-blur-lg border-gray-700/50 h-full overflow-hidden rounded-2xl shadow-2xl">
						<CardHeader className="bg-transparent px-4 pt-4 pb-3 sm:px-6 sm:pt-6">
							<CardTitle className="text-white font-serif text-xl sm:text-2xl">
								Quick Actions
							</CardTitle>
							<CardDescription className="text-gray-300 font-sans text-sm sm:text-base">
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
										className={`flex w-full items-center justify-center py-3.5 font-sans text-base shadow-sm transition-all duration-200 hover:shadow-md rounded-xl ${i === 0 ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0' : 'border-gray-600 text-gray-200 hover:bg-gray-700/50 hover:text-white hover:border-gray-500'}`}
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
				userPlan.id !== 'FREE' &&
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
								!propertyEntitlements.canAddProperty
									? propertyEntitlements.getUpgradeMessage() || "You've reached your property limit"
									: !tenantEntitlements.canAddTenant
										? tenantEntitlements.getUpgradeMessage() || "You've reached your tenant limit"
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
				<Card className="border-gray-700/50 bg-gray-800/40 backdrop-blur-lg rounded-2xl">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-4">
								<div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-3">
									<BookOpen className="h-6 w-6 text-white" />
								</div>
								<div>
									<h3 className="text-lg font-semibold text-white">
										Property Management Tips & Insights
									</h3>
									<p className="text-sm text-gray-300">
										Stay updated with expert advice,
										industry trends, and proven strategies
										to maximize your rental income.
									</p>
								</div>
							</div>
							<Link to="/blog">
								<Button
									variant="outline"
									className="border-gray-600 text-gray-200 hover:bg-gray-700/50 hover:text-white rounded-xl"
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
