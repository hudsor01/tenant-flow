import React from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerPortalCard } from '../../../components/pricing/customer-portal'

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
  })
})
