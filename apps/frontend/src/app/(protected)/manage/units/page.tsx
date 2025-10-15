'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { useDeleteUnit, useUnitList } from '@/hooks/api/use-unit'
import type { Unit } from '@repo/shared/types/core'
import { Edit, Home, MoreVertical, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CreateUnitDialog } from './create-dialog'

export default function UnitsPage() {
	const [search, setSearch] = useState('')
	const [statusFilter, setStatusFilter] = useState<string>('all')

	// Fetch units with filters
	const unitListParams: {
		search?: string
		status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
		limit: number
	} = {
		limit: 100
	}

	if (search) unitListParams.search = search
	if (statusFilter !== 'all') {
		unitListParams.status = statusFilter as
			| 'VACANT'
			| 'OCCUPIED'
			| 'MAINTENANCE'
			| 'RESERVED'
	}

	const { data: unitsResponse, isLoading, error } = useUnitList(unitListParams)

	const units = unitsResponse?.data || []
	const total = unitsResponse?.total || 0

	// Delete mutation
	const deleteUnitMutation = useDeleteUnit({
		onSuccess: () => {
			toast.success('Unit deleted successfully')
		},
		onError: () => {
			toast.error('Failed to delete unit')
		}
	})

	const handleDelete = (unitId: string) => {
		if (confirm('Are you sure you want to delete this unit?')) {
			deleteUnitMutation.mutate(unitId)
		}
	}

	const getStatusBadge = (status: Unit['status']) => {
		const variants: Record<
			Unit['status'],
			'default' | 'secondary' | 'destructive' | 'outline'
		> = {
			VACANT: 'secondary',
			OCCUPIED: 'default',
			MAINTENANCE: 'destructive',
			RESERVED: 'outline'
		}

		return <Badge variant={variants[status]}>{status}</Badge>
	}

	if (error) {
		return (
			<div className="container py-8">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
					<h2 className="text-lg font-semibold text-destructive">
						Error Loading Units
					</h2>
					<p className="text-sm text-muted-foreground">
						{error instanceof Error ? error.message : 'Failed to load units'}
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="container py-8 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
						<Home className="w-8 h-8" />
						Units
					</h1>
					<p className="text-muted-foreground">
						Manage your rental units across all properties
					</p>
				</div>
				<CreateUnitDialog />
			</div>

			{/* Filters */}
			<div className="flex items-center gap-4">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						placeholder="Search units..."
						value={search}
						onChange={e => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>

				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Filter by status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Status</SelectItem>
						<SelectItem value="VACANT">Vacant</SelectItem>
						<SelectItem value="OCCUPIED">Occupied</SelectItem>
						<SelectItem value="MAINTENANCE">Maintenance</SelectItem>
						<SelectItem value="RESERVED">Reserved</SelectItem>
					</SelectContent>
				</Select>

				<div className="text-sm text-muted-foreground">
					{total} unit{total !== 1 ? 's' : ''} found
				</div>
			</div>

			{/* Table */}
			{isLoading ? (
				<div className="rounded-lg border p-8 text-center">
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
					<p className="mt-2 text-sm text-muted-foreground">Loading units...</p>
				</div>
			) : units.length === 0 ? (
				<div className="rounded-lg border p-8 text-center">
					<Home className="mx-auto h-12 w-12 text-muted-foreground/50" />
					<h3 className="mt-4 text-lg font-semibold">No units found</h3>
					<p className="mt-2 text-sm text-muted-foreground">
						{search || statusFilter !== 'all'
							? 'Try adjusting your filters'
							: 'Get started by creating your first unit'}
					</p>
				</div>
			) : (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Unit Number</TableHead>
								<TableHead>Property</TableHead>
								<TableHead>Bedrooms</TableHead>
								<TableHead>Bathrooms</TableHead>
								<TableHead>Square Feet</TableHead>
								<TableHead>Rent</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-[70px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{units.map(unit => (
								<TableRow key={unit.id}>
									<TableCell className="font-medium">
										{unit.unitNumber}
									</TableCell>
									<TableCell>
										<span className="text-sm text-muted-foreground">
											Property ID: {unit.propertyId.substring(0, 8)}...
										</span>
									</TableCell>
									<TableCell>{unit.bedrooms}</TableCell>
									<TableCell>{unit.bathrooms}</TableCell>
									<TableCell>
										{unit.squareFeet ? `${unit.squareFeet} sq ft` : '-'}
									</TableCell>
									<TableCell>${unit.rent.toLocaleString()}/mo</TableCell>
									<TableCell>{getStatusBadge(unit.status)}</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
													<MoreVertical className="h-4 w-4" />
													<span className="sr-only">Open menu</span>
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuLabel>Actions</DropdownMenuLabel>
												<DropdownMenuItem>
													<Edit className="mr-2 h-4 w-4" />
													Edit Unit
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => handleDelete(unit.id)}
													className="text-destructive focus:text-destructive"
												>
													<Trash2 className="mr-2 h-4 w-4" />
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	)
}
