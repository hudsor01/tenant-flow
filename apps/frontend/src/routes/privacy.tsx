import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const PrivacyPolicy = lazy(() => import('@/components/pages/PrivacyPolicy'))

export const Route = createFileRoute('/privacy')({
	component: PrivacyPolicy,
})