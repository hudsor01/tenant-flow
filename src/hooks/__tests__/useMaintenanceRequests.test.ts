import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMaintenanceRequests } from '../useMaintenanceRequests'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import React from 'react'

// Type definitions for test mocks
interface MockSupabaseResponse {
  data?: unknown
  error?: unknown
  select?: () => MockSupabaseResponse
  order?: () => MockSupabaseResponse
  user?: { id: string; email: string } | null
}

interface MockChannel {
  on: (event: string, config: unknown, callback: (payload: unknown) => void) => MockChannel
  subscribe: () => void
}


// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useMaintenanceRequests', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch maintenance requests successfully', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    const mockMaintenanceRequests = [
      {
        id: 'req-1',
        title: 'Leaky faucet',
        description: 'Kitchen faucet is dripping',
        status: 'OPEN',
        priority: 'MEDIUM',
        createdAt: new Date().toISOString(),
        unit: {
          id: 'unit-1',
          unitNumber: '101',
          property: {
            id: 'prop-1',
            name: 'Main Street Apartments',
            address: '123 Main St',
            ownerId: 'user-123',
          },
        },
      },
    ]

    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
    } as MockSupabaseResponse)

    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockMaintenanceRequests,
        error: null,
      }),
    } as MockSupabaseResponse)

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }
    const mockSupabaseChannel = vi.mocked(supabase.channel)
    mockSupabaseChannel.mockReturnValue(mockChannel as MockChannel)

    const { result } = renderHook(() => useMaintenanceRequests(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockMaintenanceRequests)
    expect(mockFrom).toHaveBeenCalledWith('MaintenanceRequest')
    
    // Verify real-time subscription setup
    expect(mockSupabaseChannel).toHaveBeenCalledWith('maintenance-requests-changes')
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'MaintenanceRequest',
        filter: 'ownerId=eq.user-123',
      },
      expect.any(Function)
    )
    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it('should handle empty results gracefully', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }

    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
    } as MockSupabaseResponse)

    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      }),
    } as MockSupabaseResponse)

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as MockChannel)

    const { result } = renderHook(() => useMaintenanceRequests(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })

  it('should not fetch when user is not authenticated', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
    } as MockSupabaseResponse)

    const mockFrom = vi.mocked(supabase.from)

    const { result } = renderHook(() => useMaintenanceRequests(), { wrapper })

    // Should not trigger query
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('should handle query errors', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }

    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
    } as MockSupabaseResponse)

    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: '08006' },
      }),
    } as MockSupabaseResponse)

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as MockChannel)

    const { result } = renderHook(() => useMaintenanceRequests(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })

  it('should invalidate queries when real-time event occurs', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }

    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
    } as MockSupabaseResponse)

    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    } as MockSupabaseResponse)

    let realtimeCallback: ((payload: unknown) => void) | undefined

    const mockChannel = {
      on: vi.fn().mockImplementation((event, config, callback) => {
        if (event === 'postgres_changes') {
          realtimeCallback = callback
        }
        return mockChannel
      }),
      subscribe: vi.fn(),
    }
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as MockChannel)

    const { result } = renderHook(() => useMaintenanceRequests(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Spy on queryClient invalidation
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    // Simulate real-time event
    if (realtimeCallback) {
      realtimeCallback({
        eventType: 'UPDATE',
        new: { id: 'req-1', status: 'COMPLETED' },
        old: { id: 'req-1', status: 'IN_PROGRESS' },
      })
    }

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['maintenanceRequests', 'user-123'],
    })
  })

  it('should cleanup subscription on unmount', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }

    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
    } as MockSupabaseResponse)

    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    } as MockSupabaseResponse)

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue(undefined),
    }
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as MockChannel)
    const mockRemoveChannel = vi.mocked(supabase.removeChannel)

    const { unmount } = renderHook(() => useMaintenanceRequests(), { wrapper })

    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    unmount()

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel)
  })
})