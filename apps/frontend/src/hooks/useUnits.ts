import { toast } from 'sonner'
import { logger } from '@/lib/logger'

// Mock unit operations for now
export function useCreateUnit() {
  return {
    mutateAsync: async (data: Record<string, unknown>) => {
      logger.info('Creating unit:', { component: 'UUnitsHook', data: data })
      toast.success('Unit created successfully')
      return { id: 'mock-id', ...data }
    },
    isPending: false,
    error: null
  }
}

export function useUpdateUnit() {
  return {
    mutateAsync: async (data: Record<string, unknown>) => {
      logger.info('Updating unit:', { component: 'UUnitsHook', data: data })
      toast.success('Unit updated successfully')
      return { ...data }
    },
    isPending: false,
    error: null
  }
}

export function useDeleteUnit() {
  return {
    mutateAsync: async (id: string) => {
      logger.info('Deleting unit:', { component: 'UUnitsHook', data: id })
      toast.success('Unit deleted successfully')
    },
    isPending: false,
    error: null
  }
}

export function useUnits(_propertyId?: string) {
  return {
    data: [],
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve()
  }
}