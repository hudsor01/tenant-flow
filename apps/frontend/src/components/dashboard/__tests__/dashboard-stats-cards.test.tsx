/**
 * Dashboard Stats Cards Component Tests
 * Tests for the modernized dashboard stats cards with enhanced UI
 */

import React from 'react'
import { screen } from '@testing-library/react'
import { renderWithQueryClient } from '@/test/utils/test-utils'
import { DashboardStatsCards } from '../dashboard-stats-cards'
import { useDashboardStats } from '@/hooks/api/use-dashboard'

// Mock the dashboard stats hook
jest.mock('@/hooks/api/use-dashboard', () => ({
  useDashboardStats: jest.fn()
}))

const mockUseDashboardStats = useDashboardStats as jest.MockedFunction<typeof useDashboardStats>

describe('DashboardStatsCards', () => {
  const mockStatsData = {
    properties: {
      totalProperties: 24,
      occupancyRate: 92
    },
    tenants: {
      totalTenants: 156
    },
    leases: {
      totalLeases: 148
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering States', () => {
    it('should render loading skeletons when data is loading', () => {
      mockUseDashboardStats.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null
      } as ReturnType<typeof useDashboardStats>)

      const { container } = renderWithQueryClient(<DashboardStatsCards />)

      // Should show loading skeleton cards
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThanOrEqual(4)
    })

    it('should render error alert when there is an error', () => {
      mockUseDashboardStats.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch stats')
      } as ReturnType<typeof useDashboardStats>)

      renderWithQueryClient(<DashboardStatsCards />)

      expect(screen.getByText(/Failed to load dashboard statistics/i)).toBeInTheDocument()
      expect(screen.getByText(/Please try refreshing the page/i)).toBeInTheDocument()
    })

    it('should render all stat cards with data', () => {
      mockUseDashboardStats.mockReturnValue({
        data: mockStatsData,
        isLoading: false,
        error: null
      } as ReturnType<typeof useDashboardStats>)

      renderWithQueryClient(<DashboardStatsCards />)

      // Check all stat cards are rendered
      expect(screen.getByText('Total Properties')).toBeInTheDocument()
      expect(screen.getByText('Active Tenants')).toBeInTheDocument()
      expect(screen.getByText('Active Leases')).toBeInTheDocument()
      expect(screen.getByText('Maintenance')).toBeInTheDocument()
    })
  })

  describe('Data Display', () => {
    beforeEach(() => {
      mockUseDashboardStats.mockReturnValue({
        data: mockStatsData,
        isLoading: false,
        error: null
      } as ReturnType<typeof useDashboardStats>)
    })

    it('should display formatted numbers correctly', () => {
      renderWithQueryClient(<DashboardStatsCards />)

      expect(screen.getByText('24')).toBeInTheDocument() // Properties
      expect(screen.getByText('156')).toBeInTheDocument() // Tenants
      expect(screen.getByText('148')).toBeInTheDocument() // Leases
    })

    it('should display descriptions correctly', () => {
      renderWithQueryClient(<DashboardStatsCards />)

      expect(screen.getByText('92% occupancy')).toBeInTheDocument()
      expect(screen.getByText('Active tenants')).toBeInTheDocument()
      expect(screen.getByText('Active leases')).toBeInTheDocument()
      expect(screen.getByText('Maintenance requests')).toBeInTheDocument()
    })

    it('should handle missing data gracefully', () => {
      mockUseDashboardStats.mockReturnValue({
        data: {},
        isLoading: false,
        error: null
      } as ReturnType<typeof useDashboardStats>)

      renderWithQueryClient(<DashboardStatsCards />)

      // Should show default values - there will be multiple 0s
      const zeros = screen.getAllByText('0')
      expect(zeros.length).toBeGreaterThan(0)
      expect(screen.getByText('0% occupancy')).toBeInTheDocument()
    })
  })

  describe('Visual Elements', () => {
    beforeEach(() => {
      mockUseDashboardStats.mockReturnValue({
        data: mockStatsData,
        isLoading: false,
        error: null
      } as ReturnType<typeof useDashboardStats>)
    })

    it('should apply correct color classes to cards', () => {
      const { container } = renderWithQueryClient(<DashboardStatsCards />)

      // Check for color-specific classes on card elements
      const cards = container.querySelectorAll('[data-slot="card"]')
      expect(cards[0]).toHaveClass('border-blue-200')
      expect(cards[1]).toHaveClass('border-green-200')
      expect(cards[2]).toHaveClass('border-purple-200')
      expect(cards[3]).toHaveClass('border-orange-200')
    })

    it('should render icons for each stat card', () => {
      const { container } = renderWithQueryClient(<DashboardStatsCards />)

      // Icons are rendered as SVG elements
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThanOrEqual(4) // At least one icon per card
    })

    it('should apply hover effects classes', () => {
      const { container } = renderWithQueryClient(<DashboardStatsCards />)

      const cards = container.querySelectorAll('[data-slot="card"]')
      cards.forEach(card => {
        expect(card).toHaveClass('hover:shadow-lg')
        expect(card).toHaveClass('hover:-translate-y-0.5')
        expect(card).toHaveClass('transition-all')
      })
    })
  })

  describe('Responsive Layout', () => {
    it('should use responsive grid classes', () => {
      const { container } = renderWithQueryClient(<DashboardStatsCards />)

      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('gap-4')
      expect(grid).toHaveClass('md:grid-cols-2')
      expect(grid).toHaveClass('lg:grid-cols-4')
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseDashboardStats.mockReturnValue({
        data: mockStatsData,
        isLoading: false,
        error: null
      } as ReturnType<typeof useDashboardStats>)
    })

    it('should have accessible card structure', () => {
      const { container } = renderWithQueryClient(<DashboardStatsCards />)

      const cards = container.querySelectorAll('[data-slot="card"]')
      expect(cards).toHaveLength(4)

      // Each card should have a title
      expect(screen.getByText('Total Properties')).toBeInTheDocument()
      expect(screen.getByText('Active Tenants')).toBeInTheDocument()
    })

    it('should have descriptive text for screen readers', () => {
      renderWithQueryClient(<DashboardStatsCards />)

      // Descriptions provide context
      expect(screen.getByText('92% occupancy')).toBeInTheDocument()
      expect(screen.getByText('Active tenants')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero values correctly', () => {
      mockUseDashboardStats.mockReturnValue({
        data: {
          properties: { totalProperties: 0, occupancyRate: 0 },
          tenants: { totalTenants: 0 },
          leases: { totalLeases: 0 }
        },
        isLoading: false,
        error: null
      } as ReturnType<typeof useDashboardStats>)

      renderWithQueryClient(<DashboardStatsCards />)

      const zeros = screen.getAllByText('0')
      expect(zeros.length).toBeGreaterThan(0)
      expect(screen.getByText('0% occupancy')).toBeInTheDocument()
    })

    it('should handle very large numbers', () => {
      mockUseDashboardStats.mockReturnValue({
        data: {
          properties: { totalProperties: 999999, occupancyRate: 100 },
          tenants: { totalTenants: 123456 },
          leases: { totalLeases: 789012 }
        },
        isLoading: false,
        error: null
      } as ReturnType<typeof useDashboardStats>)

      renderWithQueryClient(<DashboardStatsCards />)

      // Numbers should be formatted with commas
      expect(screen.getByText('999,999')).toBeInTheDocument()
      expect(screen.getByText('123,456')).toBeInTheDocument()
    })
  })
})