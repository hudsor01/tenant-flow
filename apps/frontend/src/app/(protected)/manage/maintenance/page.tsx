import type { Metadata } from 'next'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { maintenanceApi } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wrench } from 'lucide-react'
import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import type { MaintenanceRequestResponse } from '@repo/shared/types/core'
import { MaintenanceTableClient } from './maintenance-table.client'

export const metadata: Metadata = {
	title: 'Maintenance | TenantFlow',
	description: 'Stay on top of maintenance requests and keep residents updated on progress'
}

const logger = createLogger({ component: 'MaintenancePage' })

const PRIORITY_VARIANTS: Record<string, 'destructive' | 'secondary' | 'outline'> = {
	HIGH: 'destructive',
	MEDIUM: 'secondary',
	LOW: 'outline'
}

type MaintenanceRequest = MaintenanceRequestResponse['data'][number]

export default async function MaintenancePage() {
	// ✅ Server Component: Fetch data on server during RSC render
	let requests: MaintenanceRequestResponse['data'] = []
	
	try {
		const result = await maintenanceApi.list()
		requests = result?.data ?? []
	} catch (err) {
		// Log server-side; avoid throwing to prevent resetting the RSC tree
		logger.warn('Failed to fetch maintenance requests for MaintenancePage', {
			error: err instanceof Error ? err.message : String(err)
		})
	}

	// ✅ Inline columns - NO wrapper file
	const columns: ColumnDef<MaintenanceRequest>[] = [
		{
			accessorKey: 'title',
			header: 'Request',
			cell: ({ row }) => {
				const request = row.original
				return (
					<Link href={`/manage/maintenance/${request.id}`} className="hover:underline">
						<div className="flex flex-col gap-1">
							<span className="font-medium">{request.title}</span>
							<span className="text-sm text-muted-foreground">
								Created {new Date(request.createdAt ?? '').toLocaleDateString()}
							</span>
						</div>
					</Link>
				)
			}
		},
		{
			accessorKey: 'property',
			header: 'Location',
			cell: ({ row }) => {
				const request = row.original
				return (
					<div>
						<div className="text-sm">{request.property?.name ?? 'Unassigned'}</div>
						<div className="text-xs text-muted-foreground">{request.unit?.name ?? 'No unit'}</div>
					</div>
				)
			}
		},
		{
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => <Badge variant="outline">{row.getValue('status') as string}</Badge>
		},
		{
			accessorKey: 'priority',
			header: 'Priority',
			cell: ({ row }) => {
				const priority = row.getValue('priority') as string
				return <Badge variant={PRIORITY_VARIANTS[priority] ?? 'outline'}>{priority}</Badge>
			}
		}
	]

	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
				<p className="text-muted-foreground">Stay on top of maintenance requests and keep residents updated on progress.</p>
			</div>

			<div>
				<Button asChild>
					<Link href="/manage/maintenance/new">
						<Wrench className="size-4 mr-2" />
						New Request
					</Link>
				</Button>
			</div>

			{/* Client Component for Delete Functionality */}
			<MaintenanceTableClient columns={columns} initialRequests={requests} />
		</div>
	)
}