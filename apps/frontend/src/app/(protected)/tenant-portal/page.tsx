import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

import { TenantsTable } from './tenants-table.client'

export default function TenantsPage() {
	return (
		<div className="space-y-10">
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">Tenants</h1>
					<p className="text-muted-foreground">
						Manage tenant profiles, lease assignments, and payment status in one place.
					</p>
				</div>

				<Link href="/owner/tenants/new">
					<Button className="flex items-center gap-2">
						<Plus className="size-4" />
						Add Tenant
					</Button>
				</Link>
			</div>
			<Suspense fallback={<div className="animate-pulse text-muted-foreground">Loading tenants...</div>}>
				<TenantsTable />
			</Suspense>
		</div>
	)
}
