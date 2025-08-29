'use client'

import { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { formatCurrency } from '@repo/shared'
import { logger } from '@/lib/logger/logger'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { PropertyWithUnits } from '@repo/shared'
import { useCreateProperty } from '@/hooks/api/use-properties'

interface Property_CardProps {
  property: PropertyWithUnits
  onEdit?: (property: PropertyWithUnits) => void
  onView?: (property: PropertyWithUnits) => void
}

export default function Property_Card({
	property,
	onEdit,
	onView
}: Property_CardProps) {
  // TODO: Import proper delete property mutation when available
  const deleteProperty_Mutation = useCreateProperty as unknown as {
    mutateAsync: (id: string) => Promise<void>
    isPending: boolean
  }

	// Memoize the delete mutation object to prevent useCallback dependencies from changing
	const deleteMutation = useMemo(
		() => ({
			mutateAsync: deleteProperty_Mutation.mutateAsync,
			isPending: deleteProperty_Mutation.isPending
		}),
		[deleteProperty_Mutation.mutateAsync, deleteProperty_Mutation.isPending]
	)

	const handleDelete = useCallback(async () => {
		if (
			window.confirm(
				'Are you sure you want to delete this property? This action cannot be undone.'
			)
		) {
			await deleteMutation.mutateAsync(property.id)
		}
	}, [deleteMutation, property.id])

	const handleView = useCallback(() => {
		onView?.(property)
	}, [onView, property])

	const handleEdit = useCallback(() => {
		onEdit?.(property)
	}, [onEdit, property])

	// Calculate property statistics
	const totalUnits = property.units?.length ?? 0
	const occupiedUnits =
		property.units?.filter(unit => unit.status === 'OCCUPIED')
			.length ?? 0
	const vacantUnits = totalUnits - occupiedUnits
	const occupancyRate =
		totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

	// Calculate total MONTHLY rent (simplified - uses unit rent instead of lease data)
	const totalRent =
		property.units?.reduce((sum: number, unit) => {
			if (unit.status === 'OCCUPIED') {
				return sum + (unit.rent ?? 0)
			}
			return sum
		}, 0) ?? 0

	const cardVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.3 }
		},
		hover: {
			y: -4,
			transition: { duration: 0.2 }
		}
	}

	const statVariants = {
		hidden: { opacity: 0, scale: 0.8 },
		visible: {
			opacity: 1,
			scale: 1,
			transition: { duration: 0.3, delay: 0.1 }
		}
	}

	return (
		<motion.div
			variants={cardVariants}
			initial="hidden"
			animate="visible"
			whileHover="hover"
			className="group"
		>
			<Card className="group/card from-card via-card to-card/95 hover:shadow-primary/10 hover:border-primary/20 overflow-hidden border-0 bg-gradient-to-br shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
				{/* Property_ Image */}
				<div className="from-primary via-primary to-accent relative h-52 overflow-hidden bg-gradient-to-br">
					{property.imageUrl ? (
						<Image
							src={property.imageUrl}
							alt={property.name}
							fill
							className="object-cover transition-transform duration-300 group-hover:scale-105"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center">
							<i className="i-lucide-building-2 h-16 w-16 text-white/70"  />
						</div>
					)}

					{/* Actions Dropdown */}
					<div className="absolute right-3 top-3">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
								>
									<i className="i-lucide-more-vertical h-4 w-4"  />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-48">
								<DropdownMenuLabel>Actions</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleView}>
									<i className="i-lucide-eye mr-2 h-4 w-4"  />
									View Details
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleEdit}>
									<i className="i-lucide-edit-3 mr-2 h-4 w-4"  />
									Edit Property_
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => {
										void handleDelete().catch(error => {
											logger.error(
												'Failed to delete property:',
												error instanceof Error
													? error
													: new Error(String(error)),
												{ component: 'Property_Card' }
											)
											toast.error(
												'Failed to delete property'
											)
										})
									}}
									className="text-red-6 hover:bg-red-50 hover:text-red-7"
								>
									<i className="i-lucide-trash-2 mr-2 h-4 w-4"  />
									Delete Property_
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					{/* Occupancy Badge */}
					<div className="absolute bottom-3 left-3">
						<div
							className={`rounded-full px-2 py-1 text-xs font-medium ${
								occupancyRate >= 90
									? 'bg-green-5 text-white'
									: occupancyRate >= 70
										? 'bg-yellow-5 text-white'
										: 'bg-red-5 text-white'
							}`}
						>
							{occupancyRate}% Occupied
						</div>
					</div>
				</div>

				{/* Property_ Info */}
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<CardTitle className="text-foreground group-hover:text-primary mb-1 transition-colors">
								{property.name}
							</CardTitle>
							<CardDescription className="flex items-center">
								<i className="i-lucide-map-pin mr-1 h-4 w-4"  />
								{property.address}, {property.city},{' '}
								{property.state} {property.zipCode}
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="pt-0">
					{/* Description */}
					{property.description && (
						<p className="text-body text-muted-foreground mb-4 line-clamp-2">
							{property.description}
						</p>
					)}

					{/* Statistics Grid */}
					<motion.div
						variants={statVariants}
						className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
					>
						{/* Total Units */}
						<div className="flex items-center rounded-lg bg-blue-50 p-3">
							<div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-1">
								<i className="i-lucide-home text-primary h-4 w-4"  />
							</div>
							<div>
								<p className="text-caption text-muted-foreground">
									Total Units
								</p>
								<p className="stat-value text-lg">
									{totalUnits}
								</p>
							</div>
						</div>

						{/* Occupied Units */}
						<div className="flex items-center rounded-lg bg-green-50 p-3">
							<div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-green-1">
								<i className="i-lucide-user-check h-4 w-4 text-green-6"  />
							</div>
							<div>
								<p className="text-caption text-muted-foreground">
									Occupied
								</p>
								<p className="stat-value text-lg">
									{occupiedUnits}
								</p>
							</div>
						</div>

						{/* Vacant Units */}
						<div className="flex items-center rounded-lg bg-orange-50 p-3">
							<div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-1">
								<i className="i-lucide-user-x h-4 w-4 text-orange-6"  />
							</div>
							<div>
								<p className="text-caption text-muted-foreground">
									Vacant
								</p>
								<p className="stat-value text-lg">
									{vacantUnits}
								</p>
							</div>
						</div>

						{/* Monthly Revenue */}
						<div className="flex items-center rounded-lg bg-purple-50 p-3">
							<div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-1">
								<i className="i-lucide-dollar-sign h-4 w-4 text-purple-6"  />
							</div>
							<div>
								<p className="text-caption text-muted-foreground">
									Monthly
								</p>
								<p className="stat-value text-lg">
									{formatCurrency(totalRent)}
								</p>
							</div>
						</div>
					</motion.div>

					{/* Action Buttons */}
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							className="flex-1 transition-colors hover:border-blue-2 hover:bg-blue-50 hover:text-blue-7"
							onClick={() => onView?.(property)}
						>
							<i className="i-lucide-eye mr-2 h-4 w-4"  />
							View Details
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="flex-1 transition-colors hover:border-green-2 hover:bg-green-50 hover:text-green-7"
							onClick={() => onEdit?.(property)}
						>
							<i className="i-lucide-edit-3 mr-2 h-4 w-4"  />
							Edit
						</Button>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	)
}
