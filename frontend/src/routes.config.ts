import React from 'react'
import { LayoutWrapper } from '@/components/layout/LayoutWrapper'
import Layout from '@/components/layout/Layout'
import TenantLayout from '@/components/tenant-portal/Layout'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'

// Auth pages
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import UpdatePassword from '@/pages/auth/UpdatePassword'
import SetupAccount from '@/pages/auth/SetupAccount'
import AuthCallback from '@/components/auth/AuthCallback'
import AuthOAuthCallback from '@/components/auth/AuthOAuthCallback'
import OAuthSuccess from '@/pages/auth/OAuthSuccess'
import AuthError from '@/pages/auth/AuthError'
import InvoiceGeneratorPage from '@/pages/InvoiceGeneratorPage'

// Lazy load components
const LandingPage = React.lazy(() => import('@/pages/index'))
const DashboardPage = React.lazy(() => import('@/pages/Dashboard'))
const PropertiesPage = React.lazy(() => import('@/pages/Properties/PropertiesPage'))
const PropertyDetail = React.lazy(() => import('@/pages/Properties/PropertyDetail'))
const TenantsPage = React.lazy(() => import('@/pages/Tenants/TenantsPage'))
const TenantDetail = React.lazy(() => import('@/pages/Tenants/TenantDetail'))
const RentPage = React.lazy(() => import('@/pages/RentPage'))
const LeaseManagement = React.lazy(() => import('@/pages/LeaseManagement'))
const GetStartedWizard = React.lazy(() => import('@/pages/GetStartedWizard'))
const FinanceDashboard = React.lazy(() => import('@/pages/Finances/FinanceDashboard'))
const MaintenancePage = React.lazy(() => import('@/pages/Maintenance/MaintenancePage'))
const ReportsPage = React.lazy(() => import('@/pages/ReportsPage'))
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'))
const UserProfilePage = React.lazy(() => import('@/pages/UserProfilePage'))
const NotificationsPage = React.lazy(() => import('@/pages/NotificationsPage'))

// Tenant Pages
const AcceptInvitation = React.lazy(() => import('@/pages/tenant/AcceptInvitation'))
const TenantDashboard = React.lazy(() => import('@/pages/tenant/TenantDashboard'))
const TenantPayments = React.lazy(() => import('@/pages/tenant/TenantPayments'))
const TenantMaintenance = React.lazy(() => import('@/pages/tenant/TenantMaintenance'))

// Public Pages
const LeaseGeneratorLanding = React.lazy(() => import('@/pages/LeaseGeneratorLanding'))
const LeaseGenerator = React.lazy(() => import('@/pages/LeaseGenerator'))
const StateLeaseGenerator = React.lazy(() => import('@/pages/StateLeaseGenerator'))
const AllStatesLeaseGenerator = React.lazy(() => import('@/pages/AllStatesLeaseGenerator'))
const PricingPage = React.lazy(() => import('@/pages/PricingPage'))
const BlogPage = React.lazy(() => import('@/pages/BlogPage'))
const BlogArticle = React.lazy(() => import('@/pages/BlogArticle'))
const PrivacyPolicy = React.lazy(() => import('@/components/pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })))
const TermsOfService = React.lazy(() => import('@/components/pages/TermsOfService').then(m => ({ default: m.TermsOfService })))

// 404 Page
const NotFound = React.lazy(() => import('@/pages/NotFound'))

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
        errorElement: <ErrorBoundary />,
    },
    {
        path: '/auth',
        children: [
            { path: 'login', element: <Login /> },
            { path: 'signup', element: <Signup /> },
            { path: 'forgot-password', element: <ForgotPassword /> },
            { path: 'update-password', element: <UpdatePassword /> },
            { path: 'setup-account', element: <SetupAccount /> },
        ],
        errorElement: <ErrorBoundary />,
    },
    {
        path: '/auth/callback',
        element: <AuthCallback />,
    },
    {
        path: '/auth/oauth/callback',
        element: <AuthOAuthCallback />,
    },
    {
        path: '/auth/success',
        element: <OAuthSuccess />,
    },
    {
        path: '/auth/error',
        element: <AuthError />,
    },
    {
        path: '/tenant/accept-invitation',
        element: <AcceptInvitation />,
    },
    {
        path: '/lease-generator',
        children: [
            { index: true, element: <LeaseGeneratorLanding /> },
            { path: 'create', element: <LeaseGenerator /> },
            { path: 'states', element: <AllStatesLeaseGenerator /> },
            { path: ':state', element: <StateLeaseGenerator /> },
        ],
    },
    {
        path: '/invoice-generator',
        element: <InvoiceGeneratorPage />,
    },
    {
        path: '/pricing',
        element: <PricingPage />,
    },
    {
        path: '/blog',
        children: [
            { index: true, element: <BlogPage /> },
            { path: ':slug', element: <BlogArticle /> },
        ],
    },
    {
        path: '/privacy',
        element: <PrivacyPolicy />,
    },
    {
        path: '/terms',
        element: <TermsOfService />,
    },
    {
        path: '/landing',
        element: <LandingPage />,
    },
    {
        path: '/dashboard',
        element: (
            <ProtectedRoute>
            <LayoutWrapper><DashboardPage /></LayoutWrapper >
            </ProtectedRoute>
        ),
    },
    {
        path: '/properties',
        element: (
            <ProtectedRoute>
            <LayoutWrapper><PropertiesPage /></LayoutWrapper >
            </ProtectedRoute>
        ),
    },
    {
        path: '/properties/:propertyId',
        element: (
            <ProtectedRoute>
            <LayoutWrapper><PropertyDetail /></LayoutWrapper >
            </ProtectedRoute>
        ),
    },
    {
        path: '/tenants',
        element: (
            <ProtectedRoute>
            <LayoutWrapper><TenantsPage /></LayoutWrapper >
            </ProtectedRoute>
        ),
    },
    {
        path: '/tenants/:tenantId',
        element: (
            <ProtectedRoute>
            <LayoutWrapper><TenantDetail /></LayoutWrapper >
            </ProtectedRoute>
        ),
    },
    {
        path: '/rent',
        element: (
            <ProtectedRoute>
            <LayoutWrapper><RentPage /></LayoutWrapper >
            </ProtectedRoute>
        ),
    },
    {
        path: '/leases',
        element: (
            <ProtectedRoute>
            <LayoutWrapper><LeaseManagement /></LayoutWrapper >
            </ProtectedRoute>
        ),
    },
    {
        path: '/get-started',
        element: (
            <ProtectedRoute>
            <LayoutWrapper><GetStartedWizard /></LayoutWrapper >
            </ProtectedRoute>
        ),
    },
    {
        path: '/payments',
        element: (
            <ProtectedRoute>
            <LayoutWrapper><FinanceDashboard /></LayoutWrapper >
            </ProtectedRoute>
        ),
    },
    {
        path: '/maintenance',
        element: (
            <ProtectedRoute>
            <LayoutWrapper><MaintenancePage /></LayoutWrapper >
            </ProtectedRoute>
        ),
    },
    {
        path: '/reports',
        element: (
            <ProtectedRoute>
            <LayoutWrapper><ReportsPage /></LayoutWrapper >
            </ProtectedRoute>
        ),
    },
    {
        path: '/settings',
        element: (
            <ProtectedRoute>
            <LayoutWrapper><SettingsPage /></LayoutWrapper >
            </ProtectedRoute>
        ),
    },
    {
        path: '/profile',
        element: (
            <ProtectedRoute>
            <LayoutWrapper><UserProfilePage /></LayoutWrapper >
            </ProtectedRoute>
        ),
    },
    {
        path: '/notifications',
        element: (
            <ProtectedRoute>
            <LayoutWrapper><NotificationsPage /></LayoutWrapper >
            </ProtectedRoute>
        ),
    },
    {
        path: '/tenant/dashboard',
        element: (
            <ProtectedRoute>
            <TenantLayout><TenantDashboard /></TenantLayout >
            </ProtectedRoute>
        ),
    },
    {
        path: '/tenant/payments',
        element: (
            <ProtectedRoute>
            <TenantLayout><TenantPayments /></TenantLayout >
            </ProtectedRoute>
        ),
    },
    {
        path: '/tenant/maintenance',
        element: (
            <ProtectedRoute>
            <TenantLayout><TenantMaintenance /></TenantLayout >
            </ProtectedRoute>
        ),
    },
    {
        path: '*',
        element: <NotFound />,
    }
])

// Helper wrapper for layouts
const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
    return <Layout>{ children } </Layout>
}

const TenantLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
    return <TenantLayout>{ children } </TenantLayout>
}