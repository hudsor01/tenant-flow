import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const TenantsPage = lazy(() => import('@/pages/Tenants/TenantsPage'))

export const Route = createFileRoute('/_authenticated/tenants')({
	component: TenantsPage,
})