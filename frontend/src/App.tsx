import '@/index.css'
import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { FacebookCatalog } from '@/components/facebook/FacebookCatalog'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/NestJSAuthProvider'
import { StripeProvider } from '@/components/billing/providers/StripeProvider'
import Layout from '@/components/layout/Layout'
import TenantLayout from '@/components/layout/TenantLayout'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import { MemorySafeWrapper } from '@/components/common/MemorySafeWrapper'
import { PageTracker } from '@/components/common/PageTracker'
import {
	ErrorBoundary,
	PageErrorBoundary
} from '@/components/error/ErrorBoundary'

// Auth pages
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import UpdatePassword from '@/pages/auth/UpdatePassword'
import SetupAccount from '@/pages/auth/SetupAccount'
import AuthCallback from '@/components/auth/AuthCallback'
import OAuthSuccess from '@/pages/auth/OAuthSuccess'
import AuthError from '@/pages/auth/AuthError'
import InvoiceGeneratorPage from './pages/InvoiceGeneratorPage'

// Memory-safe lazy loading with proper error handling
const createLazyComponent = (
	importFn: () => Promise<{ default: React.ComponentType }>
) => {
	return lazy(async () => {
		try {
			const module = await importFn()
			return module
		} catch (error) {
			console.error('Failed to load component:', error)
			return {
				default: () => (
					<div className="flex min-h-screen items-center justify-center">
						<div className="text-center">
							<h2 className="mb-2 text-xl font-bold text-red-600">
								Failed to load component
							</h2>
							<p className="mb-4 text-gray-600">
								Please refresh the page to try again.
							</p>
							<button
								onClick={() => window.location.reload()}
								className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
							>
								Refresh Page
							</button>
						</div>
					</div>
				)
			}
		}
	})
}

// Lazy load components with error handling
const DashboardPage = createLazyComponent(() => import('@/pages/Dashboard'))
const PropertiesPage = createLazyComponent(
	() => import('@/pages/Properties/PropertiesPage')
)
const PropertyDetail = createLazyComponent(
	() => import('@/pages/Properties/PropertyDetail')
)
const TenantsPage = createLazyComponent(
	() => import('@/pages/Tenants/TenantsPage')
)
const TenantDetail = createLazyComponent(
	() => import('@/pages/Tenants/TenantDetail')
)
const RentPage = createLazyComponent(() => import('@/pages/RentPage'))
const LeaseManagement = createLazyComponent(
	() => import('@/pages/LeaseManagement')
)
const GetStartedWizard = createLazyComponent(
	() => import('@/pages/GetStartedWizard')
)
const FinanceDashboard = createLazyComponent(
	() => import('@/pages/Finances/FinanceDashboard')
)
const MaintenancePage = createLazyComponent(
	() => import('@/pages/Maintenance/MaintenancePage')
)
const ReportsPage = createLazyComponent(() => import('@/pages/ReportsPage'))
const SettingsPage = createLazyComponent(() => import('@/pages/SettingsPage'))
const UserProfilePage = createLazyComponent(
	() => import('@/pages/UserProfilePage')
)
const NotificationsPage = createLazyComponent(
	() => import('@/pages/NotificationsPage')
)

// Tenant pages
const AcceptInvitation = createLazyComponent(
	() => import('@/pages/tenant/AcceptInvitation')
)
const TenantDashboard = createLazyComponent(
	() => import('@/pages/tenant/TenantDashboard')
)
const TenantPayments = createLazyComponent(
	() => import('@/pages/tenant/TenantPayments')
)
const TenantMaintenance = createLazyComponent(
	() => import('@/pages/tenant/TenantMaintenance')
)

// Public pages
const LeaseGenerator = createLazyComponent(
	() => import('@/pages/LeaseGenerator')
)
const LeaseGeneratorLanding = createLazyComponent(
	() => import('@/pages/LeaseGeneratorLanding')
)
const StateLeaseGenerator = createLazyComponent(
	() => import('@/pages/StateLeaseGenerator')
)
const AllStatesLeaseGenerator = createLazyComponent(
	() => import('@/pages/AllStatesLeaseGenerator')
)
const LandingPage = createLazyComponent(() => import('@/pages/index'))
const PricingPage = createLazyComponent(() => import('@/pages/PricingPage'))
const BlogPage = createLazyComponent(() => import('@/pages/BlogPage'))
const BlogArticle = createLazyComponent(() => import('@/pages/BlogArticle'))
const PrivacyPolicy = createLazyComponent(() =>
	import('@/components/pages/PrivacyPolicy').then(module => ({
		default: module.PrivacyPolicy
	}))
)
const TermsOfService = createLazyComponent(() =>
	import('@/components/pages/TermsOfService').then(module => ({
		default: module.TermsOfService
	}))
)

// 404 page
const NotFound = createLazyComponent(() => import('@/pages/NotFound'))

// Loading component for Suspense fallback
const LoadingSpinner = () => (
	<div className="flex min-h-screen items-center justify-center">
		<div className="text-center">
			<div className="mx-auto mb-4 h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
			<p className="text-gray-600">Loading TenantFlow...</p>
			<p className="mt-2 text-sm text-gray-400">
				If this takes too long, check the browser console for errors.
			</p>
		</div>
	</div>
)

function App() {
	return (
		<AuthProvider>
			<StripeProvider>
				<ErrorBoundary>
					<MemorySafeWrapper>
				<PageTracker />
				<FacebookCatalog />
				<Suspense fallback={<LoadingSpinner />}>
					<Routes>
						{/* Public routes */}
						<Route
							path="/auth/login"
							element={
								<PageErrorBoundary>
									<Login />
								</PageErrorBoundary>
							}
						/>
						<Route
							path="/auth/signup"
							element={
								<PageErrorBoundary>
									<Signup />
								</PageErrorBoundary>
							}
						/>
						<Route
							path="/auth/forgot-password"
							element={
								<PageErrorBoundary>
									<ForgotPassword />
								</PageErrorBoundary>
							}
						/>
						<Route
							path="/auth/update-password"
							element={
								<PageErrorBoundary>
									<UpdatePassword />
								</PageErrorBoundary>
							}
						/>
						<Route
							path="/auth/setup-account"
							element={
								<PageErrorBoundary>
									<SetupAccount />
								</PageErrorBoundary>
							}
						/>
						<Route
							path="/auth/callback"
							element={<AuthCallback />}
						/>
						<Route
							path="/auth/success"
							element={
								<PageErrorBoundary>
									<OAuthSuccess />
								</PageErrorBoundary>
							}
						/>
						<Route
							path="/auth/error"
							element={
								<PageErrorBoundary>
									<AuthError />
								</PageErrorBoundary>
							}
						/>
						<Route
							path="/tenant/accept-invitation"
							element={<AcceptInvitation />}
						/>

						{/* Public Lease Generator */}
						<Route
							path="/lease-generator"
							element={<LeaseGeneratorLanding />}
						/>
						<Route
							path="/lease-generator/create"
							element={<LeaseGenerator />}
						/>
						<Route
							path="/lease-generator/states"
							element={<AllStatesLeaseGenerator />}
						/>
						<Route
							path="/lease-generator/:state"
							element={<StateLeaseGenerator />}
						/>

						{/* Public Invoice Generator */}
						<Route
							path="/invoice-generator"
							element={<InvoiceGeneratorPage />}
						/>

						{/* Public Pricing Page */}
						<Route path="/pricing" element={<PricingPage />} />

						{/* Blog Routes */}
						<Route path="/blog" element={<BlogPage />} />
						<Route path="/blog/:slug" element={<BlogArticle />} />

						{/* Legal Pages */}
						<Route path="/privacy" element={<PrivacyPolicy />} />
						<Route path="/terms" element={<TermsOfService />} />

						{/* Tenant Portal Routes */}
						<Route
							path="/tenant/dashboard"
							element={
								<ProtectedRoute>
									<TenantLayout>
										<TenantDashboard />
									</TenantLayout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/tenant/payments"
							element={
								<ProtectedRoute>
									<TenantLayout>
										<TenantPayments />
									</TenantLayout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/tenant/maintenance"
							element={
								<ProtectedRoute>
									<TenantLayout>
										<TenantMaintenance />
									</TenantLayout>
								</ProtectedRoute>
							}
						/>

						{/* Root route - landing page */}
						<Route path="/" element={<LandingPage />} />

						<Route
							path="/dashboard"
							element={
								<ProtectedRoute>
									<Layout>
										<DashboardPage />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/properties"
							element={
								<ProtectedRoute>
									<Layout>
										<PropertiesPage />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/properties/:propertyId"
							element={
								<ProtectedRoute>
									<Layout>
										<PropertyDetail />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/tenants"
							element={
								<ProtectedRoute>
									<Layout>
										<TenantsPage />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/tenants/:tenantId"
							element={
								<ProtectedRoute>
									<Layout>
										<TenantDetail />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/rent"
							element={
								<ProtectedRoute>
									<Layout>
										<RentPage />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/leases"
							element={
								<ProtectedRoute>
									<Layout>
										<LeaseManagement />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/get-started"
							element={
								<ProtectedRoute>
									<Layout>
										<GetStartedWizard />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/payments"
							element={
								<ProtectedRoute>
									<Layout>
										<FinanceDashboard />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/invoices"
							element={
								<ProtectedRoute>
									<Layout>
										<InvoiceGeneratorPage />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/maintenance"
							element={
								<ProtectedRoute>
									<Layout>
										<MaintenancePage />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/reports"
							element={
								<ProtectedRoute>
									<Layout>
										<ReportsPage />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/settings"
							element={
								<ProtectedRoute>
									<Layout>
										<SettingsPage />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/profile"
							element={
								<ProtectedRoute>
									<Layout>
										<UserProfilePage />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/notifications"
							element={
								<ProtectedRoute>
									<Layout>
										<NotificationsPage />
									</Layout>
								</ProtectedRoute>
							}
						/>

						{/* 404 catch-all route */}
						<Route path="*" element={<NotFound />} />
					</Routes>
				</Suspense>
				<Toaster />
				<Analytics />
				<SpeedInsights />
					</MemorySafeWrapper>
				</ErrorBoundary>
			</StripeProvider>
		</AuthProvider>
	)
}

export default App
