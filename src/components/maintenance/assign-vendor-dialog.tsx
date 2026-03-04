'use client'

import { useState } from 'react'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#components/ui/dialog'
import {
	useVendors,
	useAssignVendorMutation,
	useUnassignVendorMutation,
} from '#hooks/api/use-vendor'
import type { Vendor, VendorFilters } from '#hooks/api/use-vendor'
import { UserPlus, X, Search } from 'lucide-react'
import { Badge } from '#components/ui/badge'
import { cn } from '#lib/utils'

interface AssignVendorDialogProps {
	maintenanceId: string
	currentVendorId?: string | null
	currentVendorName?: string | null
	onSuccess?: () => void
}

export function AssignVendorDialog({
	maintenanceId,
	currentVendorId,
	currentVendorName,
	onSuccess,
}: AssignVendorDialogProps) {
	const [open, setOpen] = useState(false)
	const [search, setSearch] = useState('')

	const filters: VendorFilters = {
		status: 'active',
		...(search ? { search } : {}),
	}

	const { data, isLoading } = useVendors(filters)
	const vendors = data?.data ?? []

	const assignMutation = useAssignVendorMutation()
	const unassignMutation = useUnassignVendorMutation()

	const handleAssign = (vendor: Vendor) => {
		assignMutation.mutate(
			{ vendorId: vendor.id, maintenanceId },
			{
				onSuccess: () => {
					setOpen(false)
					onSuccess?.()
				},
			},
		)
	}

	const handleUnassign = () => {
		unassignMutation.mutate(maintenanceId, {
			onSuccess: () => {
				setOpen(false)
				onSuccess?.()
			},
		})
	}

	const isPending = assignMutation.isPending || unassignMutation.isPending

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1.5 min-h-11">
					<UserPlus className="size-4" />
					{currentVendorId ? 'Change Vendor' : 'Assign Vendor'}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Assign Vendor</DialogTitle>
					<DialogDescription>
						Select a vendor or contractor to assign to this maintenance request.
					</DialogDescription>
				</DialogHeader>

				{currentVendorId && (
					<div className="flex items-center justify-between rounded-md border p-3 bg-muted/50">
						<div>
							<p className="text-sm font-medium">Currently assigned</p>
							<p className="text-sm text-muted-foreground">
								{currentVendorName ?? currentVendorId}
							</p>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleUnassign}
							disabled={isPending}
							aria-label="Remove vendor assignment"
						>
							<X className="size-4" />
						</Button>
					</div>
				)}

				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						value={search}
						onChange={e => setSearch(e.target.value)}
						placeholder="Search vendors..."
						className="pl-9 h-11"
					/>
				</div>

				<div className="max-h-64 overflow-y-auto space-y-1">
					{isLoading ? (
						<p className="text-sm text-muted-foreground text-center py-4">
							Loading vendors...
						</p>
					) : vendors.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-4">
							{search ? 'No vendors match your search.' : 'No active vendors found.'}
						</p>
					) : (
						vendors.map(vendor => (
							<button
								key={vendor.id}
								type="button"
								onClick={() => handleAssign(vendor)}
								disabled={isPending || vendor.id === currentVendorId}
								className={cn(
									'w-full flex items-center justify-between rounded-md p-3 text-left transition-colors',
									'hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary',
									vendor.id === currentVendorId && 'opacity-50 cursor-not-allowed',
								)}
							>
								<div>
									<p className="text-sm font-medium">{vendor.name}</p>
									<p className="text-xs text-muted-foreground capitalize">{vendor.trade}</p>
								</div>
								{vendor.hourly_rate && (
									<Badge variant="secondary" className="text-xs">
										${vendor.hourly_rate}/hr
									</Badge>
								)}
							</button>
						))
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
