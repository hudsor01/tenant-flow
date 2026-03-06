import type { Metadata } from 'next'
import { InspectionListClient } from '#components/inspections/inspection-list.client'

export const metadata: Metadata = {
	title: 'Inspections',
	description: 'Manage move-in and move-out property inspections'
}

export default function InspectionsPage() {
	return <InspectionListClient />
}
