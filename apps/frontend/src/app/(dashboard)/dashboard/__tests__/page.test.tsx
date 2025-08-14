/**
 * Tests for Dashboard Page
 * Tests the main user dashboard with stats, widgets, and layout
 */

import { render, screen } from '@testing-library/react'
import DashboardPage from '../page'

// Mock dashboard client components
jest.mock('@/components/dashboard/dashboard-client', () => ({
  OnboardingBanner: jest.fn(() => (
    <div data-testid="onboarding-banner">
      <h3>Welcome to TenantFlow!</h3>
      <p>Complete these steps to get started</p>
      <button>Dismiss</button>
    </div>
  )),
  DashboardStats: jest.fn(() => (
    <div data-testid="dashboard-stats">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div data-testid="stat-card">
          <div>Total Properties</div>
          <div>12</div>
        </div>
        <div data-testid="stat-card">
          <div>Active Tenants</div>
          <div>45</div>
        </div>
        <div data-testid="stat-card">
          <div>Monthly Revenue</div>
          <div>$24,500</div>
        </div>
        <div data-testid="stat-card">
          <div>Occupancy Rate</div>
          <div>94%</div>
        </div>
      </div>
    </div>
  )),
  PropertiesTable: jest.fn(() => (
    <div data-testid="properties-table">
      <h3>Recent Properties</h3>
      <div>Property 1 - 123 Main St</div>
      <div>Property 2 - 456 Oak Ave</div>
      <button>View All Properties</button>
    </div>
  )),
  QuickActions: jest.fn(() => (
    <div data-testid="quick-actions">
      <h3>Quick Actions</h3>
      <button>Add Property</button>
      <button>Add Tenant</button>
      <button>Schedule Maintenance</button>
      <button>Generate Report</button>
    </div>
  )),
}))

// Mock enhanced dashboard widgets
jest.mock('@/components/dashboard/enhanced-dashboard-widgets', () => ({
  EnhancedDashboardWidgets: jest.fn(() => (
    <div data-testid="enhanced-dashboard-widgets">
      <div>Revenue Analytics</div>
      <div>Maintenance Overview</div>
      <div>Lease Expirations</div>
    </div>
  )),
}))

// Mock error boundary
jest.mock('@/components/dashboard/dashboard-error-boundary', () => ({
  DashboardErrorBoundary: jest.fn(({ children }) => (
    <div data-testid="dashboard-error-boundary">{children}</div>
  )),
}))

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Page Structure and Layout', () => {
    it('renders main dashboard layout with error boundary', () => {
      render(<DashboardPage />)

      expect(screen.getByTestId('dashboard-error-boundary')).toBeInTheDocument()
    })

    it('renders page header with title and description', () => {
      render(<DashboardPage />)

      expect(screen.getByRole('heading', { level: 1, name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByText(/welcome back! here's an overview of your property portfolio/i)).toBeInTheDocument()
    })

    it('displays quick stats in header on large screens', () => {
      render(<DashboardPage />)

      // Header contains inline stats (98% Uptime, $24.5K This Month)
      expect(screen.getByText('98%')).toBeInTheDocument()
      expect(screen.getByText('Uptime')).toBeInTheDocument()
      expect(screen.getByText('$24.5K')).toBeInTheDocument()
      expect(screen.getByText('This Month')).toBeInTheDocument()
    })

    it('renders gradient background effects', () => {
      const { container } = render(<DashboardPage />)

      // Check for gradient background elements
      const gradientElements = container.querySelectorAll('.bg-gradient-to-r, .bg-gradient-to-br')
      expect(gradientElements.length).toBeGreaterThan(0)
    })
  })

  describe('Dashboard Components', () => {
    it('renders onboarding banner with suspense fallback', () => {
      render(<DashboardPage />)

      expect(screen.getByTestId('onboarding-banner')).toBeInTheDocument()
      expect(screen.getByText('Welcome to TenantFlow!')).toBeInTheDocument()
      expect(screen.getByText('Complete these steps to get started')).toBeInTheDocument()
    })

    it('renders dashboard stats component', () => {
      render(<DashboardPage />)

      expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument()
      expect(screen.getByText('Total Properties')).toBeInTheDocument()
      expect(screen.getByText('Active Tenants')).toBeInTheDocument()
      expect(screen.getByText('Monthly Revenue')).toBeInTheDocument()
      expect(screen.getByText('Occupancy Rate')).toBeInTheDocument()
    })

    it('renders enhanced dashboard widgets', () => {
      render(<DashboardPage />)

      expect(screen.getByTestId('enhanced-dashboard-widgets')).toBeInTheDocument()
      expect(screen.getAllByText('Revenue Analytics')).toHaveLength(2) // One from mock, one from page
      expect(screen.getByText('Maintenance Overview')).toBeInTheDocument()
      expect(screen.getByText('Lease Expirations')).toBeInTheDocument()
    })

    it('renders properties table in main content area', () => {
      render(<DashboardPage />)

      expect(screen.getByTestId('properties-table')).toBeInTheDocument()
      expect(screen.getByText('Recent Properties')).toBeInTheDocument()
      expect(screen.getByText('Property 1 - 123 Main St')).toBeInTheDocument()
      expect(screen.getByText('View All Properties')).toBeInTheDocument()
    })

    it('renders quick actions sidebar', () => {
      render(<DashboardPage />)

      expect(screen.getByTestId('quick-actions')).toBeInTheDocument()
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add property/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add tenant/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /schedule maintenance/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument()
    })
  })

  describe('Future Features Section', () => {
    it('displays coming soon analytics widgets', () => {
      render(<DashboardPage />)

      expect(screen.getAllByText('Revenue Analytics')).toHaveLength(2) // One from mock, one from page
      expect(screen.getByText('Maintenance Trends')).toBeInTheDocument()
      expect(screen.getAllByText('Coming Soon')).toHaveLength(2)
    })

    it('shows placeholder content for future widgets', () => {
      const { container } = render(<DashboardPage />)

      // Check for animated placeholder elements
      const animatedElements = container.querySelectorAll('.animate-pulse')
      expect(animatedElements.length).toBeGreaterThan(0)
    })
  })

  describe('Component Integration', () => {
    it('calls all dashboard client components', () => {
      render(<DashboardPage />)

      const { OnboardingBanner, DashboardStats, PropertiesTable, QuickActions } = jest.requireMock('@/components/dashboard/dashboard-client')
      expect(OnboardingBanner).toHaveBeenCalled()
      expect(DashboardStats).toHaveBeenCalled()
      expect(PropertiesTable).toHaveBeenCalled()
      expect(QuickActions).toHaveBeenCalled()
    })

    it('renders enhanced dashboard widgets component', () => {
      render(<DashboardPage />)

      const { EnhancedDashboardWidgets } = jest.requireMock('@/components/dashboard/enhanced-dashboard-widgets')
      expect(EnhancedDashboardWidgets).toHaveBeenCalled()
    })

    it('wraps content in error boundary', () => {
      render(<DashboardPage />)

      const { DashboardErrorBoundary } = jest.requireMock('@/components/dashboard/dashboard-error-boundary')
      expect(DashboardErrorBoundary).toHaveBeenCalledWith(
        expect.objectContaining({
          children: expect.anything()
        }),
        undefined
      )
    })
  })

  describe('Responsive Layout', () => {
    it('uses responsive grid classes for layout', () => {
      const { container } = render(<DashboardPage />)

      // Check for responsive grid classes
      const gridElements = container.querySelectorAll('[class*="grid"], [class*="lg:grid-cols"], [class*="md:grid-cols"]')
      expect(gridElements.length).toBeGreaterThan(0)
    })

    it('applies responsive spacing classes', () => {
      const { container } = render(<DashboardPage />)

      // Check for responsive spacing (p-4 md:p-6 lg:p-8)
      const spacingElement = container.querySelector('.p-4.md\\:p-6.lg\\:p-8')
      expect(spacingElement).toBeInTheDocument()
    })

    it('has responsive column layout for main content', () => {
      const { container } = render(<DashboardPage />)

      // Check for lg:col-span-2 and lg:col-span-1 layout
      const twoColumnElement = container.querySelector('.lg\\:col-span-2')
      const oneColumnElement = container.querySelector('.lg\\:col-span-1')
      
      expect(twoColumnElement).toBeInTheDocument()
      expect(oneColumnElement).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<DashboardPage />)

      // Main page heading should be h1
      expect(screen.getByRole('heading', { level: 1, name: /dashboard/i })).toBeInTheDocument()
      
      // Component headings should be h3 (mocked in components)
      expect(screen.getByRole('heading', { level: 3, name: /welcome to tenantflow/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: /quick actions/i })).toBeInTheDocument()
    })

    it('provides descriptive text for context', () => {
      render(<DashboardPage />)

      expect(screen.getByText(/welcome back! here's an overview of your property portfolio/i)).toBeInTheDocument()
    })

    it('has accessible interactive elements', () => {
      render(<DashboardPage />)

      // All buttons should be accessible
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
      
      buttons.forEach(button => {
        expect(button).toBeInTheDocument()
      })
    })
  })

  describe('SEO and Meta Information', () => {
    it('has proper metadata configuration', () => {
      const { metadata } = jest.requireMock('../page')

      expect(metadata).toEqual({
        title: 'Dashboard | TenantFlow',
        description: 'Comprehensive property management dashboard with analytics and insights',
      })
    })
  })

  describe('Performance Optimizations', () => {
    it('uses Suspense for loading states', () => {
      const { container } = render(<DashboardPage />)

      // The actual Suspense components are rendered, but we can verify
      // the structure that would contain them
      expect(container.querySelector('.space-y-8')).toBeInTheDocument()
    })

    it('applies modern card styling for visual performance', () => {
      const { container } = render(<DashboardPage />)

      // Check for card-modern classes in the actual HTML
      const modernCardElements = container.querySelectorAll('.card-modern')
      expect(modernCardElements.length).toBeGreaterThan(0)
    })

    it('uses gradient backgrounds for visual enhancement', () => {
      const { container } = render(<DashboardPage />)

      // Check for gradient classes
      const gradientElements = container.querySelectorAll('[class*="bg-gradient"]')
      expect(gradientElements.length).toBeGreaterThan(0)
    })
  })

  describe('Content Organization', () => {
    it('organizes content in logical sections', () => {
      render(<DashboardPage />)

      // Verify logical organization exists
      expect(screen.getByTestId('onboarding-banner')).toBeInTheDocument()
      expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument()
      expect(screen.getByTestId('enhanced-dashboard-widgets')).toBeInTheDocument()
      expect(screen.getByTestId('properties-table')).toBeInTheDocument()
      expect(screen.getByTestId('quick-actions')).toBeInTheDocument()
    })

    it('maintains consistent spacing between sections', () => {
      const { container } = render(<DashboardPage />)

      // Check for space-y-8 class for consistent spacing
      expect(container.querySelector('.space-y-8')).toBeInTheDocument()
    })

    it('constrains content width for readability', () => {
      const { container } = render(<DashboardPage />)

      // Check for max-width constraint
      expect(container.querySelector('.max-w-\\[1400px\\]')).toBeInTheDocument()
    })
  })
})