'use client'

import { useState } from 'react'
import { usePropertiesOptimistic } from '@/hooks/api/use-properties'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { PropertyWithUnits } from '@repo/shared'

interface Property_DeleteDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
  property: PropertyWithUnits | null
}

export function Property_DeleteDialog({
	open,
	onOpenChange,
	property
}: Property_DeleteDialogProps) {
	const [error, setError] = useState<string | null>(null)
	const propertiesOptimistic = usePropertiesOptimistic()

	const handleDelete = async () => {
		if (!property) {
			return
		}

		try {
			setError(null)
			// React 19 useOptimistic - instant feedback with automatic revert on error
			await propertiesOptimistic.deleteProperty(property.id)
			onOpenChange(false)
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to delete property'
			)
		}
	}

	if (!property) {
		return null
	}

	const hasUnits = property.units && property.units.length > 0
	const hasOccupiedUnits = property.units?.some(
		unit => unit.status === 'OCCUPIED'
	)

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Property_</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete{' '}
						<strong>{property.name}</strong>?
					</AlertDialogDescription>
				</AlertDialogHeader>

				{hasOccupiedUnits && (
					<Alert variant="destructive">
						<i className="i-lucide-alert-triangle inline-block h-4 w-4"  />
						<AlertDescription>
							This property has occupied units. Please ensure all
							tenants are relocated before deleting.
						</AlertDescription>
					</Alert>
				)}

				{hasUnits && !hasOccupiedUnits && (
					<Alert>
						<i className="i-lucide-alert-triangle inline-block h-4 w-4"  />
						<AlertDescription>
							This property has {property.units?.length} unit(s)
							that will also be deleted.
						</AlertDescription>
					</Alert>
				)}

				{error && (
					<Alert variant="destructive">
						<i className="i-lucide-alert-triangle inline-block h-4 w-4"  />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<div className="text-muted-foreground text-sm">
					This action cannot be undone. All associated data including
					units, leases, and maintenance records will be permanently
					deleted.
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={propertiesOptimistic.isPending || hasOccupiedUnits}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{propertiesOptimistic.isPending ? (
							<>
								<i className="i-lucide-loader-2 inline-block mr-2 h-4 w-4 animate-spin"  />
								Deleting...
							</>
						) : (
							'Delete Property_'
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
