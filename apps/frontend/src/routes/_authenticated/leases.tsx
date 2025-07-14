import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const LeaseManagement = lazy(() => import('@/pages/LeaseManagement'))

export const Route = createFileRoute('/_authenticated/leases')({
	component: LeaseManagement,
})