import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const FinanceDashboard = lazy(() => import('@/pages/Finances/FinanceDashboard'))

export const Route = createFileRoute('/_authenticated/payments')({
	component: FinanceDashboard,
})