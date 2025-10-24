import type { Metadata } from 'next'
import { requireSession } from '@/lib/server-auth'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { maintenanceApi } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Trash2, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import type { MaintenanceRequestResponse } from '@repo/shared/types/core'


export const metadata: Metadata = {
	title: 'Maintenance | TenantFlow',
	description: 'Stay on top of maintenance requests and keep residents updated on progress'
}

const PRIORITY_VARIANTS: Record<string, 'destructive' | 'secondary' | 'outline'> = {
	HIGH: 'destructive',
	MEDIUM: 'secondary',
	LOW: 'outline'
}

type MaintenanceRequest = MaintenanceRequestResponse['data'][number]

export default async function MaintenancePage() {
	// ✅ Server-side auth - NO client flash, instant 307 redirect
	const user = await requireSession()
	const logger = createLogger({ component: 'MaintenancePage', userId: user.id })

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
		},
		{
			id: 'actions',
			header: 'Actions',
			cell: ({ row }) => {
				const request = row.original
				return (
					<div className="flex items-center gap-2">
						<Button asChild size="sm" variant="ghost">
							<Link href={`/manage/maintenance/${request.id}/edit`}>Edit</Link>
						</Button>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
									<Trash2 className="size-4" />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete Request</AlertDialogTitle>
									<AlertDialogDescription>
										Permanently delete "{request.title}"? This action cannot be undone.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										onClick={async () => {
											try {
												await maintenanceApi.remove(request.id)
												toast.success('Request deleted')
												window.location.reload()
											} catch {
												toast.error('Failed to delete')
											}
										}}
									>
										Delete
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				)
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
			<Card>
				<CardHeader>
					<CardTitle>Maintenance Requests</CardTitle>
					<CardDescription>Track maintenance tickets and resolution progress</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable columns={columns} data={requests} filterColumn="title" filterPlaceholder="Filter by request title..." />
				</CardContent>
			</Card>
		</div>
	)
}