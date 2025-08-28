'use client'

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Property_Form } from '@/components/properties/property-form'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { PropertyWithUnits } from '@repo/shared'

// Client Component for modal content
export default function EditProperty_Modal() {
	const params = useParams()
const [property, setProperty_] = useState<PropertyWithUnits | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		async function fetchProperty_() {
			try {
				setLoading(true)
				// Fetch property data on client side to avoid build-time Supabase issues
				const response = await fetch(`/api/properties/${params.id}`)
				if (!response.ok) {
					throw new Error('Property_ not found')
				}
				const propertyData = await response.json()
				setProperty_(propertyData)
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: 'Failed to load property'
				)
			} finally {
				setLoading(false)
			}
		}

		if (params.id) {
			void fetchProperty_()
		}
	}, [params.id])

	if (loading) {
		return (
			<Dialog defaultOpen={true}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Loading...</DialogTitle>
						<DialogDescription>
							Loading property information...
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		)
	}

	if (error ?? !property) {
		return (
			<Dialog defaultOpen={true}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Error</DialogTitle>
						<DialogDescription>
							{error ?? 'Property_ not found'}
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		)
	}

	return (
		<Dialog defaultOpen={true}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit {property.name}</DialogTitle>
					<DialogDescription>
						Update property information and settings
					</DialogDescription>
				</DialogHeader>
				<Property_Form property={property} properties={[]} />
			</DialogContent>
		</Dialog>
	)
}
