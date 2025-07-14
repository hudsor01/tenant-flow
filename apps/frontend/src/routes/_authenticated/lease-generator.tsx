import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const LeaseGenerator = lazy(() => import('@/pages/LeaseGenerator'))

export const Route = createFileRoute('/_authenticated/lease-generator')({
	component: LeaseGenerator,
})