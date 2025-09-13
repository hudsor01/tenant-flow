/**
 * Mock authentication data for development testing
 * CLAUDE.md Compliance: Uses existing @repo/shared types, no duplication
 * Purpose: Enable dashboard testing without authentication barriers
 */
import type { 
  DashboardStats,
  PropertyPerformance,
  SystemUptime,
  TenantStats,
  PropertyWithUnits,
  TenantWithLeaseInfo
} from '@repo/shared'

/**
 * Mock user data for development authentication
 * Matches Supabase User interface structure
 */
export const MOCK_USER = {
  id: 'mock-user-dev-123',
  email: 'test@tenantflow.dev',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  phone: null,
  confirmed_at: new Date().toISOString(),
  recovery_sent_at: null,
  new_email: null,
  invited_at: null,
  action_link: null,
  email_change: null,
  email_change_sent_at: null,
  email_change_confirm_status: 0,
  banned_until: null,
  reauthentication_sent_at: null,
  is_anonymous: false
}

/**
 * Mock session data for development authentication  
 * Matches Supabase Session interface structure
 */
export const MOCK_SESSION = {
  access_token: 'mock-dev-access-token-123',
  refresh_token: 'mock-dev-refresh-token-123',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: MOCK_USER
}

/**
 * Mock dashboard statistics with realistic property management data
 * Uses existing DashboardStats type from @repo/shared
 */
export const MOCK_DASHBOARD_STATS: DashboardStats = {
  totalProperties: 12,
  totalUnits: 48,
  occupiedUnits: 42,
  vacantUnits: 6,
  totalTenants: 39,
  activeTenants: 35,
  inactiveTenants: 4,
  totalRevenue: 125000,
  monthlyRevenue: 42500,
  occupancyRate: 87.5,
  averageRent: 1275,
  maintenanceRequests: 8,
  overdueRequests: 2,
  completedRequests: 156,
  pendingPayments: 3,
  collectionRate: 96.2
}

/**
 * Mock property performance data for dashboard charts
 * Uses existing PropertyPerformance type from @repo/shared
 */
export const MOCK_PROPERTY_PERFORMANCE: PropertyPerformance[] = [
  {
    id: 'prop-001',
    name: 'Sunset Gardens Apartments',
    occupancyRate: 95.2,
    totalUnits: 24,
    occupiedUnits: 23,
    monthlyRevenue: 18500,
    averageRent: 1100,
    maintenanceScore: 4.8,
    tenantSatisfaction: 4.6
  },
  {
    id: 'prop-002', 
    name: 'Downtown Business Complex',
    occupancyRate: 87.5,
    totalUnits: 16,
    occupiedUnits: 14,
    monthlyRevenue: 15200,
    averageRent: 1350,
    maintenanceScore: 4.2,
    tenantSatisfaction: 4.1
  },
  {
    id: 'prop-003',
    name: 'Riverside Townhomes',
    occupancyRate: 75.0,
    totalUnits: 8,
    occupiedUnits: 6,
    monthlyRevenue: 8800,
    averageRent: 1650,
    maintenanceScore: 4.9,
    tenantSatisfaction: 4.8
  }
]

/**
 * Mock system uptime data for dashboard
 * Uses existing SystemUptime type from @repo/shared
 */
export const MOCK_SYSTEM_UPTIME: SystemUptime = {
  uptime: '99.94%',
  uptimeHours: 8759.2,
  totalHours: 8760,
  lastIncident: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
  currentStatus: 'operational',
  responseTime: 145,
  slaCompliance: 99.94
}

/**
 * Mock tenant statistics for dashboard
 * Uses existing TenantStats type from @repo/shared
 */
export const MOCK_TENANT_STATS: TenantStats = {
  total: 39,
  active: 35,
  inactive: 4,
  newThisMonth: 3,
  averageTenancy: 18, // months
  retentionRate: 92.3,
  averageRent: 1275,
  totalRevenue: 44625, // monthly
  occupancyRate: 87.5
}

/**
 * Mock properties with units data for detailed views
 * Uses existing PropertyWithUnits type from @repo/shared
 */
export const MOCK_PROPERTIES_WITH_UNITS: PropertyWithUnits[] = [
  {
    id: 'prop-001',
    name: 'Sunset Gardens Apartments',
    address: '123 Sunset Blvd',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90028',
    propertyType: 'APARTMENT',
    totalUnits: 24,
    occupiedUnits: 23,
    vacantUnits: 1,
    averageRent: 1100,
    monthlyRevenue: 25300,
    created_at: new Date(2023, 0, 15).toISOString(),
    updated_at: new Date().toISOString(),
    units: []
  },
  {
    id: 'prop-002',
    name: 'Downtown Business Complex', 
    address: '456 Main Street',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90013',
    propertyType: 'COMMERCIAL',
    totalUnits: 16,
    occupiedUnits: 14,
    vacantUnits: 2,
    averageRent: 1350,
    monthlyRevenue: 18900,
    created_at: new Date(2022, 8, 22).toISOString(),
    updated_at: new Date().toISOString(),
    units: []
  }
]

/**
 * Mock tenants with lease information for tenant views
 * Uses existing TenantWithLeaseInfo type from @repo/shared  
 */
export const MOCK_TENANTS_WITH_LEASE_INFO: TenantWithLeaseInfo[] = [
  {
    id: 'tenant-001',
    firstName: 'John',
    lastName: 'Smith', 
    email: 'john.smith@email.com',
    phone: '(555) 123-4567',
    emergencyContact: 'Jane Smith',
    emergencyPhone: '(555) 987-6543',
    created_at: new Date(2023, 2, 10).toISOString(),
    updated_at: new Date().toISOString(),
    leaseInfo: {
      unitNumber: 'A101',
      propertyName: 'Sunset Gardens Apartments',
      rentAmount: 1100,
      leaseStart: new Date(2023, 2, 15).toISOString(),
      leaseEnd: new Date(2024, 2, 14).toISOString(),
      status: 'ACTIVE'
    }
  },
  {
    id: 'tenant-002',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@email.com', 
    phone: '(555) 234-5678',
    emergencyContact: 'Carlos Garcia',
    emergencyPhone: '(555) 876-5432',
    created_at: new Date(2023, 1, 5).toISOString(),
    updated_at: new Date().toISOString(),
    leaseInfo: {
      unitNumber: 'B203',
      propertyName: 'Downtown Business Complex',
      rentAmount: 1350,
      leaseStart: new Date(2023, 1, 1).toISOString(),
      leaseEnd: new Date(2024, 0, 31).toISOString(),
      status: 'ACTIVE'
    }
  }
]

/**
 * Mock activity data for dashboard activity feed
 */
export const MOCK_ACTIVITY_DATA = {
  activities: [
    {
      id: 'activity-001',
      type: 'payment_received',
      title: 'Payment Received',
      description: 'John Smith paid rent for Unit A101',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      amount: 1100,
      status: 'completed'
    },
    {
      id: 'activity-002', 
      type: 'maintenance_request',
      title: 'Maintenance Request',
      description: 'Air conditioning repair requested for Unit B203',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      priority: 'high',
      status: 'pending'
    },
    {
      id: 'activity-003',
      type: 'lease_signed',
      title: 'New Lease Signed', 
      description: 'Sarah Johnson signed lease for Unit C301',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
      unitNumber: 'C301',
      status: 'completed'
    }
  ]
}

/**
 * Development-only flag to ensure mock data isn't used in production
 * CLAUDE.md Compliance: Production safety guard
 */
export const IS_MOCK_AUTH_ENABLED = 
  process.env.NODE_ENV === 'development' && 
  process.env.ENABLE_MOCK_AUTH === 'true'

/**
 * Helper function to validate mock auth availability
 * Returns true only in development with mock auth enabled
 * Secure fallback: returns false for any non-development environment
 */
export const canUseMockAuth = (): boolean => {
  // Production safety guard - explicit secure fallback
  if (process.env.NODE_ENV !== 'development') {
    return false
  }
  
  // Additional environment check
  if (process.env.ENABLE_MOCK_AUTH !== 'true') {
    return false
  }
  
  return IS_MOCK_AUTH_ENABLED
}

/**
 * Helper function to get mock data safely
 * Returns mock data only if mock auth is enabled, otherwise throws error
 */
export const getMockData = () => {
  if (!canUseMockAuth()) {
    throw new Error('Mock authentication data is only available in development mode with ENABLE_MOCK_AUTH=true')
  }
  
  return {
    user: MOCK_USER,
    session: MOCK_SESSION,
    dashboardStats: MOCK_DASHBOARD_STATS,
    propertyPerformance: MOCK_PROPERTY_PERFORMANCE,
    systemUptime: MOCK_SYSTEM_UPTIME,
    tenantStats: MOCK_TENANT_STATS,
    propertiesWithUnits: MOCK_PROPERTIES_WITH_UNITS,
    tenantsWithLeaseInfo: MOCK_TENANTS_WITH_LEASE_INFO,
    activityData: MOCK_ACTIVITY_DATA
  }
}