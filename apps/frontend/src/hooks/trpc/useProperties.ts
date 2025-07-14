import { trpc } from '@/lib/trpcClient'
import type { 
  CreatePropertySchema,
  UpdatePropertySchema,
  PropertyQuerySchema 
} from '@/types/properties'

// Properties queries
export function useProperties(query?: PropertyQuerySchema) {
  return trpc.properties.list.useQuery(query || {})
}

export function useProperty(id: string) {
  return trpc.properties.byId.useQuery({ id })
}

export function usePropertyStats() {
  return trpc.properties.stats.useQuery()
}

// Properties mutations
export function useCreateProperty() {
  const utils = trpc.useUtils()
  
  return trpc.properties.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch properties list
      utils.properties.list.invalidate()
      utils.properties.stats.invalidate()
    },
  })
}

export function useUpdateProperty() {
  const utils = trpc.useUtils()
  
  return trpc.properties.update.useMutation({
    onSuccess: (updatedProperty) => {
      // Update specific property in cache
      utils.properties.byId.setData({ id: updatedProperty.id }, updatedProperty)
      // Invalidate lists
      utils.properties.list.invalidate()
      utils.properties.stats.invalidate()
    },
  })
}

export function useDeleteProperty() {
  const utils = trpc.useUtils()
  
  return trpc.properties.delete.useMutation({
    onSuccess: () => {
      // Invalidate all property queries
      utils.properties.list.invalidate()
      utils.properties.stats.invalidate()
    },
  })
}

// Optimistic updates example
export function useOptimisticUpdateProperty() {
  const utils = trpc.useUtils()
  
  return trpc.properties.update.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.properties.byId.cancel({ id: variables.id })
      
      // Snapshot previous value
      const previousProperty = utils.properties.byId.getData({ id: variables.id })
      
      // Optimistically update
      if (previousProperty) {
        utils.properties.byId.setData({ id: variables.id }, {
          ...previousProperty,
          ...variables,
          updatedAt: new Date(),
        })
      }
      
      return { previousProperty }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousProperty) {
        utils.properties.byId.setData({ id: variables.id }, context.previousProperty)
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      utils.properties.byId.invalidate({ id: variables.id })
    },
  })
}