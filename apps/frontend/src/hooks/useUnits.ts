import { toast } from 'sonner'

// Mock unit operations for now
export function useCreateUnit() {
  return {
    mutateAsync: async (data: Record<string, unknown>) => {
      console.log('Creating unit:', data)
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
      console.log('Updating unit:', data)
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
      console.log('Deleting unit:', id)
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