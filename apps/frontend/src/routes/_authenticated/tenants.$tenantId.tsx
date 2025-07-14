import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'

const TenantDetail = lazy(() => import('@/pages/Tenants/TenantDetail'))

const tenantSearchSchema = z.object({
	tab: z.enum(['overview', 'lease', 'payments', 'maintenance', 'documents']).optional(),
})

export const Route = createFileRoute('/_authenticated/tenants/$tenantId')({
	validateSearch: tenantSearchSchema,
	component: TenantDetail,
})