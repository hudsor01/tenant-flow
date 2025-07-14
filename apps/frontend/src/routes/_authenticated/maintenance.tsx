import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'

const MaintenancePage = lazy(() => import('@/pages/Maintenance/MaintenancePage'))

const maintenanceSearchSchema = z.object({
	status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
	priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
	property: z.string().uuid().optional(),
	assignee: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/maintenance')({
	validateSearch: maintenanceSearchSchema,
	component: MaintenancePage,
})