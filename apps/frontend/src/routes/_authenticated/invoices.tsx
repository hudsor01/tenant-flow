import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const InvoiceGeneratorPage = lazy(() => import('@/pages/InvoiceGeneratorPage'))

export const Route = createFileRoute('/_authenticated/invoices')({
	component: InvoiceGeneratorPage,
})