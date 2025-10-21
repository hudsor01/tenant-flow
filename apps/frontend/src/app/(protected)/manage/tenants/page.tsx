import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'

import { tenantsApi } from '@/lib/api-client'
import { TenantsTable } from '../../tenant/tenants-table.client'

export const metadata: Metadata = {
	title: 'Tenants | TenantFlow',
	description: 'Manage your property tenants and their lease information'
}

async function deleteTenant(tenantId: string) {
	'use server'
	try {
		await tenantsApi.remove(tenantId)
		revalidatePath('/manage/tenants')
		return { success: true }
	} catch (error) {
		// Server Action: console.error is acceptable for server-side logging
		// eslint-disable-next-line no-console, no-restricted-syntax
		console.error('[Server Action] Failed to delete tenant:', {
			tenantId,
			error: error instanceof Error ? error.message : String(error)
		})
		throw error
	}
}

export default async function TenantsPage() {
	// ✅ Server Component: Fetch data on server during RSC render
	const [tenants, stats] = await Promise.all([
		tenantsApi.list(),
		tenantsApi.stats()
	])

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
					<p className="text-muted-foreground">
						Manage your property tenants and their lease information.
					</p>
				</div>
			</div>
			<TenantsTable initialTenants={tenants} initialStats={stats} deleteTenantAction={deleteTenant} />
		</div>
	)
}
