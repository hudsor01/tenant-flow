import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const TenantLease = lazy(() => import('@/pages/tenant/TenantDashboard'))

export const Route = createFileRoute('/_tenant-portal/lease')({
	component: TenantLease,
})