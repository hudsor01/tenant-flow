import type { Metadata } from 'next'

import { Button } from '@/components/ui/button'
import { propertiesApi } from '@/lib/api-client'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { PropertiesTable } from './properties-table.client'

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

			<PropertiesTable initialProperties={properties} initialStats={stats} />
		</div>
	)
}
