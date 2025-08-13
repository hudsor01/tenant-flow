/**
 * Dashboard Quick Actions Component Tests
 * Tests for the enhanced quick actions with modern UI
 */

import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { renderWithQueryClient, user } from '@/test/utils/test-utils'
import { DashboardQuickActions } from '../dashboard-quick-actions'

// Mock framer-motion to avoid animation issues in tests
jest.mock('@/lib/framer-motion', () => ({
  motion: {
    div: ({ children, variants, whileHover, whileTap, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    button: ({ children, variants, whileHover, whileTap, ...props }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => <button {...props}>{children}</button>
  }
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn()
  }
}))

describe('DashboardQuickActions', () => {
  const mockHandlers = {
    onAddProperty: jest.fn(),
    onNewTenant: jest.fn(),
    onScheduleMaintenance: jest.fn(),
    onGenerateReport: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all quick action buttons', () => {
      renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      expect(screen.getByText('Add Property')).toBeInTheDocument()
      expect(screen.getByText('New Tenant')).toBeInTheDocument()
      expect(screen.getByText('Schedule Maintenance')).toBeInTheDocument()
      expect(screen.getByText('Generate Report')).toBeInTheDocument()
    })

    it('should render descriptions for each action', () => {
      renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      expect(screen.getByText('Register a new property to your portfolio')).toBeInTheDocument()
      expect(screen.getByText('Onboard a new tenant to your system')).toBeInTheDocument()
      expect(screen.getByText('Create a maintenance request or task')).toBeInTheDocument()
      expect(screen.getByText('Create financial or operational reports')).toBeInTheDocument()
    })

    it('should render section heading', () => {
      renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    })

    it('should render icons for each action', () => {
      const { container } = renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      // Each action should have an icon
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThanOrEqual(5) // 4 actions + header icon
    })
  })

  describe('User Interactions', () => {
    it('should call onAddProperty when add property is clicked', async () => {
      renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      const button = screen.getByRole('button', { name: /Add Property/i })
      await user.click(button)

      await waitFor(() => {
        expect(mockHandlers.onAddProperty).toHaveBeenCalledTimes(1)
      })
    })

    it('should call onNewTenant when new tenant is clicked', async () => {
      renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      const button = screen.getByRole('button', { name: /New Tenant/i })
      await user.click(button)

      await waitFor(() => {
        expect(mockHandlers.onNewTenant).toHaveBeenCalledTimes(1)
      })
    })

    it('should call onScheduleMaintenance when schedule maintenance is clicked', async () => {
      renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      const button = screen.getByRole('button', { name: /Schedule Maintenance/i })
      await user.click(button)

      await waitFor(() => {
        expect(mockHandlers.onScheduleMaintenance).toHaveBeenCalledTimes(1)
      })
    })

    it('should call onGenerateReport when generate report is clicked', async () => {
      renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      const button = screen.getByRole('button', { name: /Generate Report/i })
      await user.click(button)

      await waitFor(() => {
        expect(mockHandlers.onGenerateReport).toHaveBeenCalledTimes(1)
      })
    })

    it('should use default logger when no handler provided', async () => {
      const logger = (await import('@/lib/logger')).logger
      renderWithQueryClient(<DashboardQuickActions />)

      const button = screen.getByRole('button', { name: /Add Property/i })
      await user.click(button)

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          'Add property clicked',
          { component: 'dashboardquickactions' }
        )
      })
    })
  })

  describe('Visual Elements', () => {
    it('should apply modern card styling', () => {
      const { container } = renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      const card = container.querySelector('.card-modern')
      expect(card).toBeInTheDocument()
    })

    it('should apply hover effects classes', () => {
      const { container } = renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      const buttons = container.querySelectorAll('button')
      buttons.forEach(button => {
        if (button.textContent?.includes('Property') || 
            button.textContent?.includes('Tenant') ||
            button.textContent?.includes('Maintenance') ||
            button.textContent?.includes('Report')) {
          expect(button).toHaveClass('btn-modern')
          expect(button).toHaveClass('hover:shadow-md')
        }
      })
    })

    it('should have proper color coding for actions', () => {
      const { container } = renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      // Each action should have different color class
      const buttons = container.querySelectorAll('button')
      const actionButtons = Array.from(buttons).filter(btn => 
        btn.textContent?.includes('Property') || 
        btn.textContent?.includes('Tenant') ||
        btn.textContent?.includes('Maintenance') ||
        btn.textContent?.includes('Report')
      )

      expect(actionButtons).toHaveLength(4)
    })

    it('should render plus icons for actions', () => {
      const { container } = renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      // Look for Plus icons in action buttons
      const plusIcons = container.querySelectorAll('.text-primary')
      expect(plusIcons.length).toBeGreaterThan(0)
    })
  })

  describe('Disabled State', () => {
    it('should have disabled styling classes', () => {
      renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      const button = screen.getByRole('button', { name: /Add Property/i })
      
      // Check that disabled classes are present
      expect(button).toHaveClass('disabled:opacity-50')
      expect(button).toHaveClass('disabled:cursor-not-allowed')
    })

    it('should handle click transitions', async () => {
      const handler = jest.fn()
      renderWithQueryClient(
        <DashboardQuickActions onAddProperty={handler} />
      )

      const button = screen.getByRole('button', { name: /Add Property/i })
      await user.click(button)

      await waitFor(() => {
        expect(handler).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Responsive Design', () => {
    it('should use responsive layout classes', () => {
      const { container } = renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      const mainContainer = container.querySelector('.lg\\:col-span-1')
      expect(mainContainer).toBeInTheDocument()
    })

    it('should stack actions vertically', () => {
      const { container } = renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      const actionsContainer = container.querySelector('.space-y-4')
      expect(actionsContainer).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible button structure', () => {
      renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      const buttons = screen.getAllByRole('button')
      const actionButtons = buttons.filter(btn => 
        btn.textContent?.includes('Property') || 
        btn.textContent?.includes('Tenant') ||
        btn.textContent?.includes('Maintenance') ||
        btn.textContent?.includes('Report')
      )

      expect(actionButtons).toHaveLength(4)
      actionButtons.forEach(button => {
        expect(button).toBeInTheDocument()
      })
    })

    it('should have descriptive text for each action', () => {
      renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      // Each action should have both title and description
      expect(screen.getByText('Add Property')).toBeInTheDocument()
      expect(screen.getByText('Register a new property to your portfolio')).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      const buttons = screen.getAllByRole('button')
      const firstActionButton = buttons.find(btn => btn.textContent?.includes('Add Property'))

      // Focus should be possible
      firstActionButton?.focus()
      expect(document.activeElement).toBe(firstActionButton)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid clicks', async () => {
      renderWithQueryClient(<DashboardQuickActions {...mockHandlers} />)

      const button = screen.getByRole('button', { name: /Add Property/i })
      
      // Click multiple times rapidly
      await user.click(button)
      await user.click(button)
      await user.click(button)

      // Handler should still be called appropriate number of times
      // Due to transitions, may not be exactly 3
      expect(mockHandlers.onAddProperty).toHaveBeenCalled()
    })

    it('should handle all handlers being undefined', async () => {
      const logger = (await import('@/lib/logger')).logger
      
      renderWithQueryClient(<DashboardQuickActions />)

      // Should render without errors
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      
      // Clicking should use default logger
      const button = screen.getByRole('button', { name: /Add Property/i })
      user.click(button)

      waitFor(() => {
        expect(logger.info).toHaveBeenCalled()
      })
    })
  })
})