import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const NotFound = lazy(() => import('@/pages/NotFound'))

export const Route = createFileRoute('/$')({
	component: NotFound,
})