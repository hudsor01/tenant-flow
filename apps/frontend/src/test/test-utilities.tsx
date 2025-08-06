/**
 * Test Utilities - Non-component utilities and constants
 * Separated from component helpers to avoid Fast Refresh warnings
 */

import React from 'react'
import { vi } from 'vitest'
import { screen, waitFor, render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createPropertyFactory, createTenantFactory, createLeaseFactory } from './factories'
import type { Property, Tenant, Lease } from '@repo/shared'

// Test query client factory
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  })
}

// Enhanced render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  user?: unknown
  initialRoute?: string
}

export const renderComponent = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient, user: _user, initialRoute: _initialRoute, ...renderOptions } = options
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient || createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  )

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: queryClient || createTestQueryClient(),
  }
}

// Mock hooks for testing
export const mockUseProperties = (properties: Property[] = []) => {
  return {
    data: properties,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
    isSuccess: true
  }
}

export const mockUseTenants = (tenants: Tenant[] = []) => {
  return {
    data: tenants,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
    isSuccess: true
  }
}

export const mockUseLeases = (leases: Lease[] = []) => {
  return {
    data: leases,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
    isSuccess: true
  }
}

export const mockUseAuth = (user: unknown = null, isAuthenticated = false) => {
  return {
    user,
    isAuthenticated,
    isLoading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn()
  }
}

// Form testing utilities
export const fillFormField = async (fieldName: string, value: string) => {
  const field = screen.getByLabelText(new RegExp(fieldName, 'i'))
  await userEvent.clear(field)
  await userEvent.type(field, value)
}

export const selectOption = async (selectName: string, optionText: string) => {
  const select = screen.getByLabelText(new RegExp(selectName, 'i'))
  await userEvent.click(select)
  await userEvent.click(screen.getByText(optionText))
}

export const submitForm = async (formName?: string) => {
  const submitButton = formName 
    ? screen.getByRole('button', { name: new RegExp(formName, 'i') })
    : screen.getByRole('button', { name: /submit|save|create|update/i })
  await userEvent.click(submitButton)
}

// Assertion helpers
export const expectFormError = (fieldName: string, errorMessage?: string) => {
  const errorElement = screen.getByText(new RegExp(errorMessage || 'error', 'i'))
  expect(errorElement).toBeInTheDocument()
}

export const expectLoadingState = () => {
  expect(screen.getByTestId('loading-spinner') || screen.getByText(/loading/i)).toBeInTheDocument()
}

export const expectEmptyState = (message?: string) => {
  expect(screen.getByText(new RegExp(message || 'no data', 'i'))).toBeInTheDocument()
}

export const expectSuccessMessage = (message?: string) => {
  expect(screen.getByText(new RegExp(message || 'success', 'i'))).toBeInTheDocument()
}

export const expectErrorMessage = (message?: string) => {
  expect(screen.getByText(new RegExp(message || 'error', 'i'))).toBeInTheDocument()
}

// Component-specific factories
export const createPropertyCardProps = (overrides: Record<string, unknown> = {}) => ({
  property: createPropertyFactory(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onViewDetails: vi.fn(),
  ...overrides
})

export const createTenantCardProps = (overrides: Record<string, unknown> = {}) => ({
  tenant: createTenantFactory(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onViewDetails: vi.fn(),
  onSendMessage: vi.fn(),
  ...overrides
})

export const createLeaseCardProps = (overrides: Record<string, unknown> = {}) => ({
  lease: createLeaseFactory(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onViewDetails: vi.fn(),
  onRenew: vi.fn(),
  onTerminate: vi.fn(),
  ...overrides
})

// Modal testing utilities
export const openModal = async (triggerText: string) => {
  const trigger = screen.getByText(triggerText)
  await userEvent.click(trigger)
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
}

export const closeModal = async () => {
  const closeButton = screen.getByRole('button', { name: /close|cancel/i })
  await userEvent.click(closeButton)
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
}

// Table testing utilities
export const expectTableHeaders = (headers: string[]) => {
  headers.forEach(header => {
    expect(screen.getByRole('columnheader', { name: new RegExp(header, 'i') })).toBeInTheDocument()
  })
}

export const expectTableRows = (count: number) => {
  const rows = screen.getAllByRole('row')
  // Subtract 1 for header row
  expect(rows).toHaveLength(count + 1)
}

export const clickTableRow = async (rowIndex: number) => {
  const rows = screen.getAllByRole('row')
  await userEvent.click(rows[rowIndex + 1]) // Skip header row
}

export const sortTableColumn = async (columnName: string) => {
  const header = screen.getByRole('columnheader', { name: new RegExp(columnName, 'i') })
  await userEvent.click(header)
}

// Navigation testing utilities
export const expectCurrentRoute = (path: string) => {
  // This would need to be implemented based on your routing solution
  expect(window.location.pathname).toBe(path)
}

export const navigateToRoute = async (linkText: string) => {
  const link = screen.getByRole('link', { name: new RegExp(linkText, 'i') })
  await userEvent.click(link)
}

// File upload testing utilities
export const uploadFile = async (inputLabel: string, file: File) => {
  const input = screen.getByLabelText(new RegExp(inputLabel, 'i'))
  await userEvent.upload(input, file)
}

export const createMockFile = (name: string, type: string, _size = 1024) => {
  return new File(['mock content'], name, { type, lastModified: Date.now() })
}

// Date picker testing utilities
export const selectDate = async (date: string) => {
  // Implementation depends on your date picker component
  const dateInput = screen.getByDisplayValue(date) || screen.getByPlaceholderText(/date/i)
  await userEvent.clear(dateInput)
  await userEvent.type(dateInput, date)
}

// Search testing utilities
export const searchFor = async (searchTerm: string) => {
  const searchInput = screen.getByRole('searchbox') || screen.getByPlaceholderText(/search/i)
  await userEvent.clear(searchInput)
  await userEvent.type(searchInput, searchTerm)
  await userEvent.keyboard('{Enter}')
}

// Wait utilities
export const waitForData = async () => {
  await waitFor(() => {
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
  })
}

export const waitForError = async () => {
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
}

// Accessibility testing utilities
export const expectAriaLabel = (element: HTMLElement, label: string) => {
  expect(element).toHaveAttribute('aria-label', label)
}

export const expectAriaDescribedBy = (element: HTMLElement, id: string) => {
  expect(element).toHaveAttribute('aria-describedby', id)
}

export const expectKeyboardNavigation = async (element: HTMLElement) => {
  element.focus()
  expect(element).toHaveFocus()
  
  await userEvent.keyboard('{Tab}')
  expect(element).not.toHaveFocus()
}

// Animation testing utilities
export const skipAnimations = () => {
  // Mock any animation libraries
  vi.mock('framer-motion', () => ({
    motion: {
      div: 'div',
      span: 'span',
      button: 'button',
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  }))
}

// Mock data generators for components
export const generateMockPropertyData = (count = 5) => {
  return Array.from({ length: count }, () => createPropertyFactory())
}

export const generateMockTenantData = (count = 5) => {
  return Array.from({ length: count }, () => createTenantFactory())
}

export const generateMockLeaseData = (count = 5) => {
  return Array.from({ length: count }, () => createLeaseFactory())
}

// Snapshot testing utilities
export const expectMatchesSnapshot = (container: HTMLElement) => {
  expect(container.firstChild).toMatchSnapshot()
}

// Performance testing utilities
export const measureRenderTime = async (component: React.ReactElement): Promise<number> => {
  const start = performance.now()
  renderComponent(component)
  await waitForData()
  const end = performance.now()
  return end - start
}

export const expectFastRender = async (component: React.ReactElement, maxTime = 100): Promise<void> => {
  const renderTime = await measureRenderTime(component)
  expect(renderTime).toBeLessThan(maxTime)
}

// Custom matchers - using interface extension instead of namespace
interface _CustomMatchers<T = unknown> {
  toBeVisible(): T
  toBeAccessible(): T
  toHaveErrorMessage(message?: string): T
}