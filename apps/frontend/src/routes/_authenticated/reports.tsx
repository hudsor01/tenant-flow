import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const ReportsPage = lazy(() => import('@/pages/ReportsPage'))

export const Route = createFileRoute('/_authenticated/reports')({
	component: ReportsPage,
})