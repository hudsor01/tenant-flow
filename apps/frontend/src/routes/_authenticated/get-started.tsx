import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const GetStartedWizard = lazy(() => import('@/pages/GetStartedWizard'))

export const Route = createFileRoute('/_authenticated/get-started')({
	component: GetStartedWizard,
})