import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const TenantDashboard = lazy(() => import('@/pages/tenant/TenantDashboard'))

export const Route = createFileRoute('/_tenant-portal/tenant-dashboard')({
	component: TenantDashboard,
})