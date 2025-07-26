import React from 'react'
import { useRouter, Link, useNavigate } from '@tanstack/react-router'
import { Box, Grid, Container } from '@radix-ui/themes'
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
import { trpc } from '@/lib/utils/trpc'
import { useAuth } from '@/hooks/useApiAuth'
import type { MaintenanceRequestWithRelations } from '@/types/relationships'
import type { PropertyWithDetails, UnitWithDetails, RouterOutputs } from '@tenantflow/shared'

type TenantOutput = RouterOutputs['tenants']['byId']
import PropertyFormModal from '@/components/modals/PropertyFormModal'
import QuickPropertySetup from '@/components/properties/QuickPropertySetup'

// Onboarding Components
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { GuidedTour } from '@/components/onboarding/ContextualHelp'
import { SuccessCelebration } from '@/components/onboarding/SuccessCelebration'
import { QuickStartCards } from '@/components/onboarding/QuickStartCards'
import { QuickHelpButton } from '@/components/onboarding/ContextualHelp'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useAchievements } from '@/hooks/useOnboarding'

import { RealtimeActivityFeed } from '@/components/dashboard/RealtimeActivityFeed'
import { CriticalAlerts } from '@/components/dashboard/CriticalAlerts'
import { useUserPlan } from '@/hooks/useSubscription'
import { PLAN_TYPE } from '@tenantflow/shared'
import { useEntitlements } from '@/hooks/useEntitlements'
import { useModalState } from '@/hooks/useModalState'
import { flexLayouts } from '@/utils/layout-classes'

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
			className={`flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-1 text-white shadow-2xl backdrop-blur-lg transition-all duration-300 hover:bg-card/60 hover:shadow-2xl`}
		>
			<CardHeader className={`${flexLayouts.between} space-y-0 px-5 pt-4 pb-2`}>
				<CardTitle className="stat-label text-sm font-medium text-muted-foreground">
					{title}
				</CardTitle>
				<div className="rounded-lg border border-blue-400/20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-2">
					<Icon className="h-5 w-5 text-blue-400" />
				</div>
			</CardHeader>
			<CardContent className="px-5 pt-2 pb-4">
				<div className="stat-value mb-1 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
					{value}
				</div>
				<p className={`text-caption ${flexLayouts.centerVertical} text-sm text-muted-foreground`}>
					<TrendingUp className="mr-1.5 h-4 w-4 text-green-400" />
					{description}
				</p>
			</CardContent>
		</Card>
	</motion.div>
)

const Dashboard: React.FC = () => {
	const router = useRouter()
	const navigate = useNavigate()
	const { user, isLoading: authLoading } = useAuth()

	// All hooks must be called unconditionally
	const propertyModal = useModalState()
	const { data: userPlan } = useUserPlan()
	const entitlements = useEntitlements()
	
	// Onboarding hooks
	const onboarding = useOnboarding()
	const achievements = useAchievements()

	// Memoized navigation handlers to prevent unnecessary re-renders
	const handleNavigateToMaintenance = React.useCallback(() => {
		router.navigate({ to: '/maintenance' })
	}, [router])

	const handleNavigateToTenants = React.useCallback(() => {
		router.navigate({ to: '/tenants' })
	}, [router])

	const handleNavigateToProperties = React.useCallback(() => {
		router.navigate({ to: '/properties' })
	}, [router])

	const handleRefreshPage = React.useCallback(() => {
		window.location.reload()
	}, [])

	const handlePropertySetupComplete = React.useCallback(() => {
		// Trigger achievement and celebration
		achievements.triggerAchievement('FIRST_PROPERTY')
		router.navigate({ to: '/properties' })
	}, [router, achievements])

	// Handle onboarding wizard completion
	const handleOnboardingComplete = React.useCallback(() => {
		onboarding.completeWizard()
		achievements.triggerAchievement('WELCOME_ABOARD')
	}, [onboarding, achievements])

	// Fetch real data - only when user is authenticated
	const {
		data: propertiesData,
		isLoading: propertiesLoading,
		error: propertiesError
	} = trpc.properties.list.useQuery({})
	const properties = propertiesData?.properties || []
	const {
		data: tenantsData,
		isLoading: tenantsLoading,
		error: tenantsError
	} = trpc.tenants.list.useQuery({})
	const tenants = tenantsData?.tenants || []
	const {
		data: maintenanceRequests = [],
		isLoading: maintenanceLoading,
		error: maintenanceError
	} = trpc.maintenance.list.useQuery({})

	const typedMaintenanceRequests =
		maintenanceRequests as MaintenanceRequestWithRelations[]

	// Auth guard: redirect unauthenticated users to login
	React.useEffect(() => {
		if (!authLoading && !user) {
			router.navigate({ to: '/auth/login' })
		}
	}, [authLoading, user, router])

	// Don't render dashboard data components if not authenticated
	if (authLoading || !user) {
		return (
			<div className={`${flexLayouts.center} min-h-screen bg-background`}>
				<div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-400"></div>
			</div>
		)
	}

	// Calculate real statistics
	const totalProperties = properties.length
	const totalUnits = properties
		.filter((p: PropertyWithDetails | null) => p !== null)
		.reduce(
			(sum: number, property: PropertyWithDetails) =>
				sum + ((property as PropertyWithDetails).units?.length || 0),
			0
		)
	const activeTenants = tenants
		.filter((t: TenantOutput | null) => t !== null)
		.filter(
			(tenant: TenantOutput) =>
				'invitationStatus' in tenant && tenant.invitationStatus === 'ACCEPTED'
		).length
	const totalRevenue = properties
		.filter((p: PropertyWithDetails | null) => p !== null)
		.reduce(
			(sum: number, property: PropertyWithDetails) =>
				sum +
				((property as PropertyWithDetails).units?.reduce(
					(unitSum: number, unit) =>
						unitSum +
						(Array.isArray((unit as UnitWithDetails).leases) &&
						(unit as UnitWithDetails).leases.some(
							(lease: { status: string }) => lease.status === 'ACTIVE'
						)
							? (unit.rent || 0)
							: 0),
					0
				) || 0),
			0
		)
	const openMaintenanceTickets = typedMaintenanceRequests.filter(
		(request: MaintenanceRequestWithRelations) =>
			request.status === 'OPEN' || request.status === 'IN_PROGRESS'
	).length
	const urgentTickets = typedMaintenanceRequests.filter(
		(request: MaintenanceRequestWithRelations) =>
			request.priority === 'EMERGENCY' &&
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
			<div className={`${flexLayouts.center} min-h-screen bg-background`}>
				<div className="rounded-2xl border border-border bg-card p-8 text-center shadow-2xl backdrop-blur-lg">
					<AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
					<h2 className="mb-2 text-xl font-semibold text-white">
						Error Loading Dashboard
					</h2>
					<p className="mb-4 text-muted-foreground">
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
			<div className={`${flexLayouts.center} min-h-screen bg-background`}>
				<div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-400"></div>
			</div>
		)
	}

	const quickActions = [
		{
			label: 'Add New Property',
			icon: PlusCircle,
			delay: 0.9,
			onClick: propertyModal.open
		},
		{
			label: 'Invite New Tenant',
			icon: UserPlus,
			delay: 1.0,
			onClick: () => navigate({ to: '/tenants' })
		},
		{
			label: 'View All Maintenance',
			icon: ClipboardList,
			delay: 1.1,
			onClick: handleNavigateToMaintenance
		}
	]

	return (
		<Box
			data-testid="dashboard-content"
			data-tour="dashboard-overview"
			className="min-h-screen bg-background"
		>
			<Container
				size="4"
				p="2"
				style={{ paddingTop: '1rem', paddingBottom: '1rem' }}
			>
				<motion.div
					initial="hidden"
					animate="visible"
					className="mb-10 text-center lg:text-left"
				>
					<motion.h1
						className="font-serif text-4xl font-extrabold tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl"
						custom={0}
						variants={headlineVariants}
					>
						<span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
							SIMPLIFY
						</span>
					</motion.h1>
					<motion.h1
						className="font-serif text-4xl font-extrabold tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl"
						custom={1}
						variants={headlineVariants}
					>
						PROPERTY MANAGEMENT
					</motion.h1>
					<motion.p
						className="mx-auto mt-4 max-w-2xl font-sans text-xl text-muted-foreground md:text-2xl lg:mx-0"
						custom={2}
						variants={headlineVariants}
					>
						TenantFlow helps you manage your properties with ease
						and efficiency.
					</motion.p>
				</motion.div>

				{/* Trial Countdown Banner */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.8, ease: 'easeOut' }}
				></motion.div>

				<Grid columns={{ initial: '1', md: '2', lg: '4' }} gap="6" data-tour="dashboard-stats">
					<div data-tour="revenue-card">
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
					</div>
					<div data-tour="tenants-card">
						<StatCard
							title="Active Tenants"
							value={
								tenantsLoading
									? 'Loading...'
									: activeTenants.toString()
							}
							icon={Users}
							description={`${tenants.length} total tenants`}
							delay={0.4}
							onClick={handleNavigateToTenants}
						/>
					</div>
					<div data-tour="properties-card">
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
					</div>
					<div data-tour="maintenance-card">
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
				</Grid>

				{/* Quick Start Guide for New Users */}
				{totalProperties === 0 && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.6,
							delay: 0.7,
							ease: 'easeOut'
						}}
						data-tour="quick-start-guide"
					>
						<QuickStartCards
							onStartWizard={onboarding.startWizard}
							onStartTour={onboarding.startTour}
							onTriggerAchievement={achievements.triggerAchievement}
							hasProperties={totalProperties > 0}
							hasTenants={activeTenants > 0}
							hasMaintenanceRequests={typedMaintenanceRequests.length > 0}
						/>
					</motion.div>
				)}

				{/* Legacy Quick Setup - Show if user prefers it */}
				{totalProperties === 0 && onboarding.hasCompletedWizard && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.6,
							delay: 0.8,
							ease: 'easeOut'
						}}
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

				<Grid columns={{ initial: '1', lg: '3' }} gap="8">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.6,
							delay: 0.8,
							ease: 'easeOut'
						}}
						className="lg:col-span-2"
					>
						<RealtimeActivityFeed />
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.6,
							delay: 0.9,
							ease: 'easeOut'
						}}
						data-tour="quick-actions"
					>
						<Card className="h-full overflow-hidden rounded-2xl border-border bg-card shadow-2xl backdrop-blur-lg">
							<CardHeader className="bg-transparent px-4 pt-4 pb-3 sm:px-6 sm:pt-6">
								<CardTitle className="font-serif text-xl text-white sm:text-2xl">
									Quick Actions
								</CardTitle>
								<CardDescription className="font-sans text-sm text-muted-foreground sm:text-base">
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
											className={`${flexLayouts.center} w-full rounded-xl py-3.5 font-sans text-base shadow-sm transition-all duration-200 hover:shadow-md ${i === 0 ? 'border-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700' : 'border-border text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'}`}
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
				</Grid>

				{/* Contextual Upgrade CTA */}
				{userPlan && userPlan.id !== PLAN_TYPE.FREE && totalProperties > 0 && (
					<div className="flex justify-center">
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
							<p className="text-blue-800">
								{!entitlements.canCreateProperties
									? "You've reached your property limit"
									: !entitlements.canCreateTenants
										? "You've reached your tenant limit"
										: `Unlock advanced features for ${totalProperties} properties`}
							</p>
						</div>
					</div>
				)}

				{/* Blog CTA Section */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 1.0, ease: 'easeOut' }}
				>
					<Card className="rounded-2xl border-border bg-card backdrop-blur-lg">
						<CardContent className="p-6">
							<div className={flexLayouts.between}>
								<div className={`${flexLayouts.centerVertical} space-x-4`}>
									<div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-3">
										<BookOpen className="h-6 w-6 text-white" />
									</div>
									<div>
										<h3 className="text-lg font-semibold text-white">
											Property Management Tips & Insights
										</h3>
										<p className="text-sm text-muted-foreground">
											Stay updated with expert advice,
											industry trends, and proven
											strategies to maximize your rental
											income.
										</p>
									</div>
								</div>
								<Link to="/blog">
									<Button
										variant="outline"
										className="rounded-xl border-border text-muted-foreground hover:bg-muted hover:text-foreground"
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
						transition={{
							duration: 0.6,
							delay: 1.1,
							ease: 'easeOut'
						}}
					>
						<div className="bg-white rounded-lg border border-gray-200 p-6">
							<h3 className="text-lg font-semibold mb-4">Payment Overview</h3>
							<p className="text-gray-600">Basic payment tracking available in full dashboard.</p>
						</div>
					</motion.div>
				)}

				{/* Modals */}
				<PropertyFormModal
					isOpen={propertyModal.isOpen}
					onClose={propertyModal.close}
					mode="create"
				/>

				{/* Onboarding Components */}
				<OnboardingWizard
					isOpen={!onboarding.hasCompletedWizard}
					onClose={() => onboarding.completeWizard()}
					onComplete={handleOnboardingComplete}
				/>

				<GuidedTour
					isActive={onboarding.activeTour !== null}
					steps={onboarding.currentTour?.steps || []}
					onComplete={() => onboarding.completeTour(onboarding.activeTour!)}
					onSkip={() => onboarding.skipTour()}
					tourId={onboarding.activeTour || ''}
				/>

				<SuccessCelebration
					achievement={achievements.currentAchievement}
					isVisible={achievements.isVisible}
					onClose={achievements.hideAchievement}
				/>

				<QuickHelpButton
					onStartTour={() => {}}
					onShowHelp={() => {}}
				/>

			</Container>
		</Box>
	)
}

export default Dashboard
