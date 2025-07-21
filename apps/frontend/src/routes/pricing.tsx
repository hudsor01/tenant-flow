import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'

const PricingPage = lazy(() => import('@/pages/PricingPage'))

const pricingSearchSchema = z.object({
	subscription: z.enum(['success', 'cancelled']).optional(),
})

export const Route = createFileRoute('/pricing')({
	validateSearch: pricingSearchSchema,
	component: PricingPage,
})
