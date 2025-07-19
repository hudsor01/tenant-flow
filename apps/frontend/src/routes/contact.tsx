import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const ContactPage = lazy(() => import('@/pages/ContactPage'))

export const Route = createFileRoute('/contact')({
    component: ContactPage
})