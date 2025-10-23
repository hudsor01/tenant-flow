import type { Metadata } from 'next'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction, CardFooter } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { propertiesApi } from '@/lib/api-client'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import type { Property, PropertyStats } from '@repo/shared/types/core'
import {
	createTextColumn,
	createAddressColumn,
	createBadgeColumn,
	createStatusColumn,
	createActionsColumn
} from '@/lib/table-columns'

export const metadata: Metadata = {
	title: 'Properties | TenantFlow',
	description: 'Manage your real estate properties and portfolio'
}

export default async function PropertiesPage() {
	// ✅ Server Component: Fetch data on server during RSC render
	const [properties, stats] = await Promise.all([
		propertiesApi.list(),
		propertiesApi.getStats()
	])

	// ✅ Inline column composition using reusable helpers
	const columns: ColumnDef<Property>[] = [
		createTextColumn<Property>('name', 'Property Name', true, row => `/manage/properties/${row.id}`),
		createAddressColumn<Property>(),
		createBadgeColumn<Property>('propertyType', 'Type'),
		createStatusColumn<Property>(),
		createActionsColumn<Property>(row => [
			{ label: 'View details', href: `/manage/properties/${row.id}` },
			{ label: 'Edit property', href: `/manage/properties/${row.id}/edit` }
		])
	]

	return (
		<div className="container mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Properties</h1>
					<p className="text-muted-foreground">
						Manage your property portfolio and track performance.
					</p>
				</div>
				<Button asChild>
					<Link href="/manage/properties/new">
						<Plus className="w-4 h-4 mr-2" />
						New Property
					</Link>
				</Button>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
				<Card>
					<CardHeader>
						<CardDescription>Total Properties</CardDescription>
						<CardTitle className="text-2xl font-semibold">{stats.total ?? properties.length}</CardTitle>
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
						<div className="text-muted-foreground">Properties under management</div>
					</CardFooter>
				</Card>

				<Card>
					<CardHeader>
						<CardDescription>Occupancy Rate</CardDescription>
						<CardTitle className="text-2xl font-semibold">{stats.occupancyRate?.toFixed(1) ?? 0}%</CardTitle>
						<CardAction>
							<Badge variant="outline">
								{(stats.occupancyRate ?? 0) >= 90 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
								{(stats.occupancyRate ?? 0) >= 90 ? 'Excellent' : 'Good'}
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							{(stats.occupancyRate ?? 0) >= 90 ? 'Strong performance' : 'Room for improvement'}
							{(stats.occupancyRate ?? 0) >= 90 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
						</div>
						<div className="text-muted-foreground">
							{stats.occupied ?? 0} occupied of {stats.total ?? 0} units total
						</div>
					</CardFooter>
				</Card>
			</div>

			{/* Properties Data Table - Inline */}
			<Card>
				<CardHeader>
					<CardTitle>Properties Portfolio</CardTitle>
					<CardDescription>Manage your property portfolio and track performance</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable columns={columns} data={properties} filterColumn="name" filterPlaceholder="Filter by property name..." />
				</CardContent>
			</Card>
		</div>
	)
}
