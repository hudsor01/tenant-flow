import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const RentPage = lazy(() => import('@/pages/RentPage'))

export const Route = createFileRoute('/_authenticated/rent')({
	component: RentPage,
})