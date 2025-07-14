import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const TenantMaintenance = lazy(() => import('@/pages/tenant/TenantMaintenance'))

export const Route = createFileRoute('/_tenant-portal/tenant-maintenance')({
	component: TenantMaintenance,
})