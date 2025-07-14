import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const PricingPage = lazy(() => import('@/pages/PricingPage'))

export const Route = createFileRoute('/pricing')({
	component: PricingPage,
})
