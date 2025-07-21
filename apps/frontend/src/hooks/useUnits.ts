// Refactored: useUnits hooks now use tRPC for backend calls instead of legacy apiClient

import { trpc } from '@/lib/api'
import { cacheConfig } from '@/lib/query-keys'
import { handleApiError } from '@/lib/utils'
import { toast } from 'sonner'
import { toastMessages } from '@/lib/toast-messages'
import type { UnitQuery } from '@/types/query-types'

/**
 * 🚀 UNITS REVOLUTION: ~150 lines → 25 lines (83% reduction!)
 */

// 🎯 Main units resource
export const useUnits = (query?: UnitQuery) => {
	return trpc.units.list.useQuery(query || {}, {
		...cacheConfig.reference,
		enabled: true
	})
}

// 🎯 Units by property with dedicated caching
export const useUnitsByProperty = (propertyId: string) => {
	return trpc.units.list.useQuery(
		{ propertyId },
		{
			...cacheConfig.reference,
			enabled: !!propertyId
		}
	)
}

// 🎯 Single unit with smart caching
export const useUnit = (id: string) => {
	return trpc.units.byId.useQuery(
		{ id },
		{
			...cacheConfig.reference,
			enabled: !!id
		}
	)
}

// 🎯 Create unit mutation
export const useCreateUnit = () => {
	const utils = trpc.useUtils()
	return trpc.units.create.useMutation({
		onSuccess: (data, variables) => {
			// Smart cache invalidation
			utils.units.list.invalidate()
			if (variables.propertyId) {
				utils.units.list.invalidate({ propertyId: variables.propertyId })
			}
			toast.success(toastMessages.success.created('unit'))
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

// 🎯 Update unit mutation
export const useUpdateUnit = () => {
	const utils = trpc.useUtils()
	return trpc.units.update.useMutation({
		onSuccess: (data, variables) => {
			// Smart cache updates
			utils.units.byId.invalidate({ id: variables.id })
			utils.units.list.invalidate()
			toast.success(toastMessages.success.updated('unit'))
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

// 🎯 Delete unit mutation
export const useDeleteUnit = () => {
	const utils = trpc.useUtils()
	return trpc.units.delete.useMutation({
		onSuccess: () => {
			utils.units.list.invalidate()
			toast.success(toastMessages.success.deleted('unit'))
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}