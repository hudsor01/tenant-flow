import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const TenantDocuments = lazy(() => import('@/pages/tenant/TenantDashboard'))

export const Route = createFileRoute('/_tenant-portal/documents')({
	component: TenantDocuments,
})