import React, { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlusCircle, Building2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from '@tanstack/react-router'
import { useProperties } from '@/hooks/useProperties'
import PropertyFormModal from '@/components/modals/PropertyFormModal'
import { VirtualizedPropertiesListMemo } from '@/components/properties/VirtualizedPropertiesList'
import type { PropertyWithDetails } from '@repo/shared'
import type { Property } from '@repo/shared'

const PropertiesPage: React.FC = () => {
	const { data: propertiesData, isLoading, error } = useProperties()
	const properties = ((propertiesData as { properties?: PropertyWithDetails[] })?.properties || []) as PropertyWithDetails[]
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingProperty, setEditingProperty] = useState<
		Property | undefined
	>(undefined)
	const router = useRouter()

	const handleAddProperty = () => {
		setEditingProperty(undefined)
		setIsModalOpen(true)
	}

	const handleEditProperty = (property: Property) => {
		setEditingProperty(property)
		setIsModalOpen(true)
	}

	const handleViewProperty = (property: Property) => {
		void router.navigate({ to: `/properties/${property.id}` })
	}

	const handleCloseModal = () => {
		setIsModalOpen(false)
		setEditingProperty(undefined)
	}

	if (error) {
		return (
			<div className="flex min-h-[300px] items-center justify-center sm:min-h-[400px]">
				<div className="text-center">
					<div className="text-lg font-semibold text-red-500">
						Error loading properties
					</div>
					<p className="text-muted-foreground mt-2">
						Please try refreshing the page
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6 p-1">
			<div className="flex items-center justify-between">
				<motion.h1
					className="text-foreground text-3xl font-bold tracking-tight"
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5 }}
				>
					Properties
				</motion.h1>
				<motion.div
					initial={{ opacity: 0, scale: 0.5 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5 }}
				>
					<Button
						data-testid="add-property-button"
						onClick={handleAddProperty}
						variant="premium"
					>
						<PlusCircle className="mr-2 h-5 w-5" /> Add Property
					</Button>
				</motion.div>
			</div>

			{/* Loading State */}
			{isLoading && (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{[...Array(6)].map((_, i) => (
						<Card key={i} className="animate-pulse">
							<div className="h-48 rounded-t-lg bg-muted"></div>
							<CardHeader>
								<div className="h-4 w-3/4 rounded bg-muted"></div>
								<div className="h-3 w-1/2 rounded bg-muted"></div>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<div className="h-3 rounded bg-muted"></div>
									<div className="h-3 w-5/6 rounded bg-muted"></div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Properties Grid - Virtualized for large lists */}
			{!isLoading && properties.length > 0 && (
				<VirtualizedPropertiesListMemo
					properties={properties}
					onEdit={(property: Property) =>
						handleEditProperty(property)
					}
					onView={handleViewProperty}
					containerHeight={800}
				/>
			)}

			{/* Empty State */}
			{!isLoading && properties.length === 0 && (
				<motion.div
					className="py-16 text-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<div className="text-muted-foreground mx-auto mb-4 h-32 w-32">
						<Building2 className="h-full w-full" />
					</div>
					<h3 className="text-foreground mt-4 text-lg font-semibold">
						No properties found
					</h3>
					<p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
						Get started by adding your first property to begin
						managing your real estate portfolio.
					</p>
					<Button onClick={handleAddProperty} className="mt-6">
						<PlusCircle className="mr-2 h-4 w-4" />
						Add Your First Property
					</Button>
				</motion.div>
			)}

			{/* Property Form Modal */}
			<PropertyFormModal
				isOpen={isModalOpen}
				onClose={handleCloseModal}
				property={editingProperty}
				mode={editingProperty ? 'edit' : 'create'}
			/>
		</div>
	)
}

export default PropertiesPage
