'use client'

import { unitsApi } from '@/lib/api-client'
import type { Database } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from './use-dashboard'

type _Unit = Database['public']['Tables']['Unit']['Row']
type InsertUnit = Database['public']['Tables']['Unit']['Insert']
type UpdateUnit = Database['public']['Tables']['Unit']['Update']

type UnitStatus = Database['public']['Enums']['UnitStatus']

export function useUnits(status?: UnitStatus) {
	return useQuery({
		queryKey: ['units', status ?? 'ALL'],
		queryFn: async () => {
			return unitsApi.list(status ? { status } : undefined)
		}
	})
}

export function useCreateUnit() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (values: InsertUnit) => unitsApi.create(values),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['units'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useUpdateUnit() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, values }: { id: string; values: UpdateUnit }) =>
			unitsApi.update(id, values),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['units'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useDeleteUnit() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			await unitsApi.remove(id)
			return true
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['units'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}
