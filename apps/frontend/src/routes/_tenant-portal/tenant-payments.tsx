import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const TenantPayments = lazy(() => import('@/pages/tenant/TenantPayments'))

export const Route = createFileRoute('/_tenant-portal/tenant-payments')({
	component: TenantPayments,
})