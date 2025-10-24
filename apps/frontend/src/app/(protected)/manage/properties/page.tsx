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
import { propertiesApi } from '@/lib/api-client'
import { requireSession } from '@/lib/server-auth'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Property, PropertyStats } from '@repo/shared/types/core'
import { Plus, TrendingDown, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next/types'
import { PropertiesTableClient } from './properties-table.client'

export const metadata: Metadata = {
	title: 'Properties | TenantFlow',
	description: 'Manage your real estate properties and portfolio'
}

export default async function PropertiesPage() {
	// ✅ Server-side auth - NO client flash, instant 307 redirect
	const user = await requireSession()

	// ✅ Server Component: Fetch data on server during RSC render
	// Harden against API errors so server render doesn't throw when there is no data
	const logger = createLogger({ component: 'PropertiesPage', userId: user.id })

	let properties: Property[] = []
	let stats: PropertyStats = {
		total: 0,
		occupied: 0,
		vacant: 0,
		occupancyRate: 0,
		totalMonthlyRent: 0,
		averageRent: 0
	}

	try {
		const result = await Promise.all([
			propertiesApi.list(),
			propertiesApi.getStats()
		])
		properties = result[0] ?? []
		stats = result[1] ?? stats
	} catch (err) {
		// Log server-side; avoid throwing to prevent resetting the RSC tree
		logger.warn('Failed to fetch properties or stats for PropertiesPage', {
			error: err instanceof Error ? err.message : String(err)
		})
	}

	return (
		<div className="flex-1 flex flex-col gap-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Properties</h1>
					<p className="text-muted-foreground">
						Manage your property portfolio and track performance.
					</p>
				</div>
				<Button asChild>
					<Link href="/manage/properties/new">
						<Plus className="size-4 mr-2" />
						New Property
					</Link>
				</Button>
			</div>

			{/* Stats Cards */}
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardDescription>Total Properties</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.total ?? properties.length}
						</CardTitle>
						<CardAction>
							<Badge variant="outline">
								<TrendingUp className="size-3" />
								Portfolio growing
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							Active properties <TrendingUp className="size-4" />
						</div>
						<div className="text-muted-foreground">
							Properties under management
						</div>
					</CardFooter>
				</Card>

				<Card>
					<CardHeader>
						<CardDescription>Occupancy Rate</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.occupancyRate?.toFixed(1) ?? 0}%
						</CardTitle>
						<CardAction>
							<Badge variant="outline">
								{(stats.occupancyRate ?? 0) >= 90 ? (
									<TrendingUp className="size-3" />
								) : (
									<TrendingDown className="size-3" />
								)}
								{(stats.occupancyRate ?? 0) >= 90 ? 'Excellent' : 'Good'}
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							{(stats.occupancyRate ?? 0) >= 90
								? 'Strong performance'
								: 'Room for improvement'}
							{(stats.occupancyRate ?? 0) >= 90 ? (
								<TrendingUp className="size-4" />
							) : (
								<TrendingDown className="size-4" />
							)}
						</div>
						<div className="text-muted-foreground">
							{stats.occupied ?? 0} occupied of {stats.total ?? 0} units total
						</div>
					</CardFooter>
				</Card>
			</div>

		{/* Properties Data Table */}
		<section className="flex flex-col gap-4">
			<h2 className="text-xl font-semibold">Portfolio</h2>
			<Card>
				<CardContent className="pt-6">
					<PropertiesTableClient data={properties} />
				</CardContent>
			</Card>
		</section>
		</div>
	)
}
