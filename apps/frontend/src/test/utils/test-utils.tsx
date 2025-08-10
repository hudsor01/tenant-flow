/**
 * Test Utilities
 * Provides comprehensive testing utilities for React Query hooks and components
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions, RenderResult, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect } from '@jest/globals'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { toast } from 'sonner'

// Test data factories
export const createMockProperty = (overrides = {}) => ({
  id: 'prop-1',
  name: 'Test Property',
  address: '123 Test St',
  city: 'Test City',
  state: 'CA',
  zipCode: '12345',
  type: 'RESIDENTIAL' as const,
  units: 4,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
})

export const createMockTenant = (overrides = {}) => ({
  id: 'tenant-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  invitationStatus: 'ACCEPTED' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
})

export const createMockUnit = (overrides = {}) => ({
  id: 'unit-1',
  unitNumber: '101',
  propertyId: 'prop-1',
  bedrooms: 2,
  bathrooms: 1,
  monthlyRent: 1000,
  squareFeet: 800,
  status: 'VACANT' as const,
  description: 'Test unit description',
  amenities: ['parking', 'laundry'],
  lastInspectionDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

export const createMockLease = (overrides = {}) => ({
  id: 'lease-1',
  unitId: 'unit-1',
  tenantId: 'tenant-1',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  rentAmount: 1000,
  securityDeposit: 1500,
  terms: 'Standard lease terms',
  status: 'ACTIVE' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides
})

export const createMockMaintenanceRequest = (overrides = {}) => ({
  id: 'maint-1',
  title: 'Test Maintenance Request',
  description: 'Test description',
  priority: 'MEDIUM' as const,
  status: 'OPEN' as const,
  unitId: 'unit-1',
  propertyId: 'prop-1',
  requestedBy: 'tenant-1',
  estimatedCost: null,
  actualCost: null,
  completedAt: null,
  assignedTo: null,
  notes: null,
  photos: [],
  allowEntry: false,
  contactPhone: null,
  preferredDate: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
})

// Mock API client
export const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}

// Mock API responses
export const createMockApiResponse = <T,>(data: T) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
})

// Query Client for tests
export const createTestQueryClient = () =>
  new QueryClient({
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
  })

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode
  queryClient?: QueryClient
}

TestWrapper.displayName = 'TestWrapper'
export function TestWrapper({ children, queryClient }: TestWrapperProps) {
  const client = queryClient || createTestQueryClient()

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  )
}

// Custom render function with QueryClient provider
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
}

export function renderWithQueryClient(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const { queryClient, ...renderOptions } = options

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Hook testing utilities
export const createHookWrapper = (queryClient?: QueryClient) => {
  const HookWrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
  )
  HookWrapper.displayName = 'HookWrapper'
  return HookWrapper
}

// API error factory
export const createApiError = (status: number, message: string) => {
  const error = new Error(message)
  ;(error as Error & { response: { status: number; data: { message: string } } }).response = {
    status,
    data: { message },
  }
  return error
}

// Toast assertion helpers
export const expectSuccessToast = (message?: string) => {
  if (message) {
    expect(toast.success).toHaveBeenCalledWith(message)
  } else {
    expect(toast.success).toHaveBeenCalled()
  }
}

export const expectErrorToast = (message?: string) => {
  if (message) {
    expect(toast.error).toHaveBeenCalledWith(message)
  } else {
    expect(toast.error).toHaveBeenCalled()
  }
}

// Async test helpers
export const waitForQuery = async (queryKey: string) => {
  await waitFor(() => {
    expect(screen.queryByTestId(`loading-${queryKey}`)).toBe(null)
  })
}

export const waitForMutation = async () => {
  await waitFor(() => {
    expect(screen.queryByTestId('mutation-loading')).toBe(null)
  })
}

// User event helper with consistent configuration
export const user = userEvent.setup()

// Common test patterns
export const setupSuccessfulQuery = <T,>(data: T) => {
  mockApiClient.get.mockResolvedValue(createMockApiResponse(data))
}

export const setupFailedQuery = (error: Error) => {
  mockApiClient.get.mockRejectedValue(error)
}

export const setupSuccessfulMutation = <T,>(data: T) => {
  mockApiClient.post.mockResolvedValue(createMockApiResponse(data))
  mockApiClient.put.mockResolvedValue(createMockApiResponse(data))
  mockApiClient.patch.mockResolvedValue(createMockApiResponse(data))
}

export const setupFailedMutation = (error: Error) => {
  mockApiClient.post.mockRejectedValue(error)
  mockApiClient.put.mockRejectedValue(error)
  mockApiClient.patch.mockRejectedValue(error)
  mockApiClient.delete.mockRejectedValue(error)
}

// Performance testing helpers
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now()
  renderFn()
  await waitFor(() => {
    expect(document.body).toBeTruthy()
  })
  const end = performance.now()
  return end - start
}

// Accessibility testing helpers
export const expectAccessibleButton = (element: HTMLElement) => {
  expect(element.getAttribute('type')).toBe('button')
  expect(element.hasAttribute('disabled')).toBe(false)
  expect(element.getAttribute('aria-label') || element.textContent).toBeTruthy()
}

export const expectAccessibleForm = (form: HTMLElement) => {
  const inputs = form.querySelectorAll('input, select, textarea')
  inputs.forEach(input => {
    expect(input.getAttribute('aria-label') || input.getAttribute('placeholder') || (input as HTMLLabelElement).textContent).toBeTruthy()
  })
}

// Network condition simulation
export const simulateSlowNetwork = () => {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  
  mockApiClient.get.mockImplementation(async (...args: unknown[]) => {
    await delay(2000)
    return mockApiClient.get.getMockImplementation()?.(...args)
  })
}

export const simulateOfflineNetwork = () => {
  const networkError = new Error('Network Error')
  ;(networkError as Error & { code: string }).code = 'NETWORK_ERROR'
  
  mockApiClient.get.mockRejectedValue(networkError)
  mockApiClient.post.mockRejectedValue(networkError)
  mockApiClient.put.mockRejectedValue(networkError)
  mockApiClient.patch.mockRejectedValue(networkError)
  mockApiClient.delete.mockRejectedValue(networkError)
}

// Edge case data
export const createEdgeCaseData = {
  emptyString: '',
  nullValue: null,
  undefinedValue: undefined,
  specialCharacters: 'Special !@#$%^&*()_+ 汉字 emoji 🎉',
  longString: 'A'.repeat(1000),
  dateEdgeCases: {
    futureDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    pastDate: new Date('1970-01-01').toISOString(),
    invalidDate: 'invalid-date',
  },
  numericEdgeCases: {
    zero: 0,
    negative: -1,
    float: 123.456,
    veryLarge: Number.MAX_SAFE_INTEGER,
    infinity: Infinity,
    nan: NaN,
  }
}

export * from '@testing-library/react'
export { user as userEvent }