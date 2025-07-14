import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'))

export const Route = createFileRoute('/_authenticated/notifications')({
	component: NotificationsPage,
})