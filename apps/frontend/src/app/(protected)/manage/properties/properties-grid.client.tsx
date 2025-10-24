'use client'

import { propertiesApi } from '@/lib/api-client'
import type { Property } from '@repo/shared/types/core'
import { Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'
import { PropertyCard } from './property-card'

interface PropertiesGridClientProps {
	data: Property[]
}

export function PropertiesGridClient({ data }: PropertiesGridClientProps) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [optimisticProperties, removeOptimisticProperty] = useOptimistic(
		data,
		(state, propertyId: string) => state.filter(p => p.id !== propertyId)
	)

	const handleDelete = async (propertyId: string) => {
		const property = data.find(p => p.id === propertyId)
		if (!property) return

		// Confirm deletion
		if (
			!confirm(
				`Are you sure you want to delete "${property.name}"? This action cannot be undone.`
			)
		) {
			return
		}

		// Optimistically remove from UI
		removeOptimisticProperty(propertyId)

		startTransition(async () => {
			try {
				await propertiesApi.remove(propertyId)
				toast.success('Property deleted successfully')
				router.refresh() // Refresh server data
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : 'Failed to delete property'
				)
				// Router refresh will restore the property if deletion failed
				router.refresh()
			}
		})
	}

	if (optimisticProperties.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<Building2 className="size-16 text-muted-foreground mb-4" />
				<h3 className="text-lg font-semibold mb-2">No properties yet</h3>
				<p className="text-sm text-muted-foreground max-w-md">
					Get started by adding your first property to begin managing your real
					estate portfolio.
				</p>
			</div>
		)
	}

	return (
		<div
			className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
			style={{ opacity: isPending ? 0.7 : 1 }}
		>
			{optimisticProperties.map(property => (
				<PropertyCard
					key={property.id}
					property={property}
					onDelete={handleDelete}
				/>
			))}
		</div>
	)
}
