import type { Metadata } from 'next'

import { PropertiesTable } from './properties-table.client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const metadata: Metadata = {
	title: 'Properties | TenantFlow',
	description: 'Manage your real estate properties and portfolio',
}

export default function PropertiesPage() {
	return (
		<div className="container mx-auto space-y-8 py-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Properties</h1>
					<p className="text-muted-foreground">
						Manage your property portfolio and track performance.
					</p>
				</div>
				<Button asChild>
					<Link href="/owner/properties/new">
						<Plus className="w-4 h-4 mr-2" />
						New Property
					</Link>
				</Button>
			</div>

			<PropertiesTable />
		</div>
	)
}
