import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const UserProfilePage = lazy(() => import('@/pages/UserProfilePage'))

export const Route = createFileRoute('/_authenticated/profile')({
	component: UserProfilePage,
})