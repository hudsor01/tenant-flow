import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const TermsOfService = lazy(() => import('@/components/pages/TermsOfService'))

export const Route = createFileRoute('/terms')({
	component: TermsOfService,
})