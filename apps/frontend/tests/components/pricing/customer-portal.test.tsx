import React from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerPortalCard } from '../../../src/components/pricing/customer-portal.js'

describe('CustomerPortalCard', () => {
  // Create a QueryClient instance for react-query
  const queryClient = new QueryClient()
  // Provide a valid icon prop (a simple React component)
  const DummyIcon = () => React.createElement('svg', { 'data-testid': 'dummy-icon' })
  const requiredProps = {
    title: 'Account Management',
    description: 'Manage your subscription and billing preferences',
    icon: DummyIcon,
    actionText: '',
    onAction: () => {},
  }

  it('renders account management title and plan badge', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CustomerPortalCard {...requiredProps} />
      </QueryClientProvider>
    )
    // There may be multiple elements with this text, so use getAllByText
    const titleEls = screen.getAllByText('Account Management')
    expect(titleEls.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Growth Plan')).toBeInTheDocument()
    expect(screen.getByText('Active Plan')).toBeInTheDocument()
  })

  it('renders usage stats and billing info', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CustomerPortalCard {...requiredProps} />
      </QueryClientProvider>
    )
    expect(screen.getByText('Properties')).toBeInTheDocument()
    expect(screen.getByText('Tenants')).toBeInTheDocument()
    expect(screen.getByText('Uptime')).toBeInTheDocument()
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('Active Leases')).toBeInTheDocument()
    expect(screen.getByText('Billing Information')).toBeInTheDocument()
    expect(screen.getByText('Next Billing')).toBeInTheDocument()
    expect(screen.getByText('Last Payment')).toBeInTheDocument()
    expect(screen.getByText('Payment Method')).toBeInTheDocument()
  })

  it('renders testimonial and trust signals', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CustomerPortalCard {...requiredProps} />
      </QueryClientProvider>
    )
    expect(screen.getByText(/TenantFlow transformed our property management workflow/)).toBeInTheDocument()
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
    expect(screen.getByText('Metro Properties')).toBeInTheDocument()
    expect(screen.getByText('Bank-Level Security')).toBeInTheDocument()
    expect(screen.getByText('Powered by Stripe')).toBeInTheDocument()
    expect(screen.getByText('10,000+ Managers')).toBeInTheDocument()
  })
})