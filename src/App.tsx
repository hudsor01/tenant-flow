import '@/index.css';
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';
import Layout from '@/components/layout/Layout';
import TenantLayout from '@/components/layout/TenantLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

// Auth pages (keep these eager-loaded as they're entry points)
import Login from '@/pages/auth/Login';
import Signup from '@/pages/auth/Signup';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import UpdatePassword from '@/pages/auth/UpdatePassword';
import SetupAccount from '@/pages/auth/SetupAccount';
import AuthCallback from '@/components/auth/AuthCallback';
// Lazy load components for code splitting
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const PropertiesPage = lazy(() => import('@/pages/Properties/PropertiesPage'));
const PropertyDetail = lazy(() => import('@/pages/Properties/PropertyDetail'));
const TenantsPage = lazy(() => import('@/pages/Tenants/EnhancedTenantsPage'));
const TenantDetail = lazy(() => import('@/pages/Tenants/TenantDetail'));
const RentPage = lazy(() => import('@/pages/RentPage'));
const LeaseManagement = lazy(() => import('@/pages/LeaseManagement'));
const GetStartedWizard = lazy(() => import('@/pages/GetStartedWizard'));
const FinanceDashboard = lazy(() => import('@/pages/Finances/EnhancedFinanceDashboard'));
const MaintenancePage = lazy(() => import('@/pages/Maintenance/MaintenancePage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const UserProfilePage = lazy(() => import('@/pages/UserProfilePage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));

// Tenant pages (lazy load these too)
const AcceptInvitation = lazy(() => import('@/pages/tenant/AcceptInvitation'));
const TenantDashboard = lazy(() => import('@/pages/tenant/TenantDashboard'));
const TenantPayments = lazy(() => import('@/pages/tenant/TenantPayments'));
const TenantMaintenance = lazy(() => import('@/pages/tenant/TenantMaintenance'));

// Public pages
const LeaseGenerator = lazy(() => import('@/pages/LeaseGenerator'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const TestSubscriptionPage = lazy(() => import('@/pages/TestSubscriptionPage'));

// 404 page
const NotFound = lazy(() => import('@/pages/NotFound'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public routes */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/update-password" element={<UpdatePassword />} />
          <Route path="/auth/setup-account" element={<SetupAccount />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/tenant/accept-invitation" element={<AcceptInvitation />} />
          
          {/* Public Lease Generator */}
          <Route path="/lease-generator" element={<LeaseGenerator />} />
          
          {/* Public Pricing Page */}
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/test-subscription" element={<TestSubscriptionPage />} />

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
      </AuthProvider>
    );
}

export default App;