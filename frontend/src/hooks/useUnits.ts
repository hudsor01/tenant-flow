import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { unitsApi, throwIfError } from '../services/api'
import type { Unit, UnitStatus } from '@/types/entities'
import type { CreateUnitDto, UpdateUnitDto } from '../services/api'

// Form data type (not stored in DB, just for UI)
interface UnitFormData {
  unitNumber: string
  propertyId: string
  bedrooms: number
  bathrooms: number
  squareFeet?: number
  rent: number
  status: UnitStatus
}

export function useUnits(propertyId?: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['units', propertyId],
    queryFn: async () => {
      if (!propertyId) throw new Error('No property ID')

      const response = await unitsApi.getUnits(propertyId)
      throwIfError(response)
      
      return response.data as Unit[]
    },
    enabled: !!propertyId && !!user?.id,
  })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: UnitFormData) => {
      if (!user?.id) throw new Error('No user ID')

      const createData: CreateUnitDto = {
        unitNumber: data.unitNumber,
        propertyId: data.propertyId,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFeet: data.squareFeet,
        rent: data.rent,
        status: data.status,
      }

      const response = await unitsApi.createUnit(createData)
      throwIfError(response)
      
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['units', data.propertyId] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UnitFormData }) => {
      if (!user?.id) throw new Error('No user ID')

      const updateData: UpdateUnitDto = {
        unitNumber: data.unitNumber,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFeet: data.squareFeet,
        rent: data.rent,
        status: data.status,
      }

      const response = await unitsApi.updateUnit(id, updateData)
      throwIfError(response)
      
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['units', data.propertyId] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}

export function useDeleteUnit() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('No user ID')

      const response = await unitsApi.deleteUnit(id)
      throwIfError(response)
      
      return { unitId: id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}