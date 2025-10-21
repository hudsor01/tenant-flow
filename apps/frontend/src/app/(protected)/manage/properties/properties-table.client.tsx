'use client'

import { PropertyEditDialog } from '@/components/properties/property-edit-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '@/components/ui/empty'
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious
} from '@/components/ui/pagination'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	Building,
	Edit,
	MoreVertical,
	TrendingDown,
	TrendingUp
} from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { Property, PropertyStats } from '@repo/shared/types/core'

const ITEMS_PER_PAGE = 25

interface PropertiesTableProps {
	initialProperties: Property[]
	initialStats: PropertyStats
}

export function PropertiesTable({
	initialProperties,
	initialStats
}: PropertiesTableProps) {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	// Get URL params
	const pageParam = Number(searchParams.get('page')) || 1

	// Local state synced with URL
	const [page, setPage] = useState(pageParam)
	const [editDialogOpen, setEditDialogOpen] = useState(false)
	const [selectedProperty, setSelectedProperty] = useState<Property | null>(
		null
	)

	// Sync page state with URL
	useEffect(() => {
		setPage(pageParam)
	}, [pageParam])

	// Update URL when page changes
	const updateURL = (newPage: number) => {
		const params = new URLSearchParams(searchParams.toString())
		if (newPage === 1) {
			params.delete('page')
		} else {
			params.set('page', newPage.toString())
		}
		const newURL = params.toString()
			? `${pathname}?${params.toString()}`
			: pathname
		router.push(newURL, { scroll: false })
	}

	// ✅ Use server-fetched data instead of client-side fetching
	const properties = initialProperties
	const totalProperties = properties.length

	// Use server-fetched stats
	const stats = {
		totalProperties: initialStats.total ?? totalProperties,
		occupancyRate: initialStats.occupancyRate ?? 0,
		totalUnits: initialStats.total ?? 0,
		occupied: initialStats.occupied ?? 0,
		vacant: initialStats.vacant ?? 0
	}

	return (
		<div className="space-y-8">
			{/* Top Metric Cards Section */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
				{/* Total Properties */}
				<Card>
					<CardHeader>
						<CardDescription>Total Properties</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.totalProperties}
						</CardTitle>
						<CardAction>
							<Badge variant="outline">
								<TrendingUp className="w-3 h-3" />
								Portfolio growing
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							Active properties <TrendingUp className="w-4 h-4" />
						</div>
						<div className="text-muted-foreground">
							Properties under management
						</div>
					</CardFooter>
				</Card>

				{/* Occupancy Rate - Real data from API */}
				<Card>
					<CardHeader>
						<CardDescription>Occupancy Rate</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.occupancyRate.toFixed(1)}%
						</CardTitle>
						<CardAction>
							<Badge variant="outline">
								{stats.occupancyRate >= 90 ? (
									<TrendingUp className="w-3 h-3" />
								) : (
									<TrendingDown className="w-3 h-3" />
								)}
								{stats.occupancyRate >= 90 ? 'Excellent' : 'Good'}
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							{stats.occupancyRate >= 90
								? 'Strong performance'
								: 'Room for improvement'}
							{stats.occupancyRate >= 90 ? (
								<TrendingUp className="w-4 h-4" />
							) : (
								<TrendingDown className="w-4 h-4" />
							)}
						</div>
						<div className="text-muted-foreground">
							{stats.occupied} occupied of {stats.totalUnits} units total
						</div>
					</CardFooter>
				</Card>
			</div>

			{/* Properties Data Table */}
			<Card>
				<CardHeader>
					<CardTitle>Properties Portfolio</CardTitle>
					<CardDescription>
						Manage your property portfolio and track performance
					</CardDescription>
				</CardHeader>
				{properties.length > 0 ? (
					<CardContent>
						<div className="rounded-md border">
							<Table>
								<TableHeader className="bg-muted/50">
									<TableRow>
										<TableHead className="font-semibold">
											Property Name
										</TableHead>
										<TableHead className="font-semibold">Address</TableHead>
										<TableHead className="font-semibold">Type</TableHead>
										<TableHead className="font-semibold">Status</TableHead>
										<TableHead className="font-semibold text-right">
											Created
										</TableHead>
										<TableHead className="font-semibold">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{properties.map((property: Property) => (
										<TableRow key={property.id} className="hover:bg-muted/30">
											<TableCell className="font-medium">
												{property.name}
											</TableCell>
											<TableCell className="text-muted-foreground">
												{property.address}
											</TableCell>
											<TableCell>
												<Badge variant="outline" className="capitalize">
													{property.propertyType
														?.toLowerCase()
														.replace('_', ' ')}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge
													style={{
														backgroundColor: 'var(--chart-1)',
														color: 'oklch(var(--primary-foreground))'
													}}
												>
													{property.status || 'Active'}
												</Badge>
											</TableCell>
											<TableCell className="text-right text-muted-foreground">
												{property.createdAt
													? new Date(property.createdAt).toLocaleDateString()
													: '—'}
											</TableCell>
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
														<DropdownMenuItem
															onClick={() => {
																setSelectedProperty(property)
																setEditDialogOpen(true)
															}}
														>
															<Edit className="mr-2 h-4 w-4" />
															Edit Property
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				) : (
					<CardContent>
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Building />
								</EmptyMedia>
								<EmptyTitle>No properties found</EmptyTitle>
								<EmptyDescription>
									Get started by adding your first property
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<p>Create property button will go here</p>
							</EmptyContent>
						</Empty>
					</CardContent>
				)}
			</Card>

			{/* Pagination */}
			{totalProperties > ITEMS_PER_PAGE && (
				<div className="mt-4">
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									href="#"
									onClick={e => {
										e.preventDefault()
										if (page > 1) {
											const newPage = page - 1
											setPage(newPage)
											updateURL(newPage)
										}
									}}
									className={page === 1 ? 'pointer-events-none opacity-50' : ''}
								/>
							</PaginationItem>

							{Array.from(
								{ length: Math.ceil(totalProperties / ITEMS_PER_PAGE) },
								(_, i) => i + 1
							)
								.filter(
									pageNum =>
										pageNum === 1 ||
										pageNum === Math.ceil(totalProperties / ITEMS_PER_PAGE) ||
										(pageNum >= page - 1 && pageNum <= page + 1)
								)
								.map((pageNum, idx, arr) => (
									<PaginationItem key={pageNum}>
										{idx > 0 && arr[idx - 1] !== pageNum - 1 ? (
											<span className="px-2">...</span>
										) : null}
										<PaginationLink
											href="#"
											onClick={e => {
												e.preventDefault()
												setPage(pageNum)
												updateURL(pageNum)
											}}
											isActive={page === pageNum}
										>
											{pageNum}
										</PaginationLink>
									</PaginationItem>
								))}

							<PaginationItem>
								<PaginationNext
									href="#"
									onClick={e => {
										e.preventDefault()
										if (page < Math.ceil(totalProperties / ITEMS_PER_PAGE)) {
											const newPage = page + 1
											setPage(newPage)
											updateURL(newPage)
										}
									}}
									className={
										page === Math.ceil(totalProperties / ITEMS_PER_PAGE)
											? 'pointer-events-none opacity-50'
											: ''
									}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}

			{/* Edit Property Dialog */}
			{selectedProperty && (
				<PropertyEditDialog
					property={selectedProperty}
					open={editDialogOpen}
					onOpenChange={setEditDialogOpen}
				/>
			)}
		</div>
	)
}
