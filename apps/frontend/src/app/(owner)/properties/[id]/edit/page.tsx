'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'

import { Button } from '#components/ui/button'
import { Skeleton } from '#components/ui/skeleton'
import { PropertyForm } from '#components/properties/property-form.client'
import { MobilePropertyForm } from '#components/properties/property-form.mobile'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import { useQuery } from '@tanstack/react-query'

export default function EditPropertyPage({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = use(params)
	const { data: property, isLoading, error } = useQuery(propertyQueries.detail(id))

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Skeleton className="h-9 w-20" />
					<div>
						<Skeleton className="h-9 w-48 mb-2" />
						<Skeleton className="h-5 w-64" />
					</div>
				</div>
				<Skeleton className="h-96 w-full rounded-xl" />
			</div>
		)
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-destructive mb-2">
						Error Loading Property
					</h2>
					<p className="text-muted-foreground">
						{error instanceof Error ? error.message : 'Failed to load property'}
					</p>
				</div>
			</div>
		)
	}

	if (!property) {
		return (
			<div className="space-y-6">
				<p className="text-muted-foreground">Property not found</p>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="outline" size="sm" asChild>
					<Link href={`/properties/${id}`}>
						<ArrowLeft className="size-4 mr-2" />
						Back
					</Link>
				</Button>
				<div>
					<h1 className="typography-h2 tracking-tight">Edit Property</h1>
					<p className="text-muted-foreground">Update property information</p>
				</div>
			</div>
			<div className="hidden md:block">
				<PropertyForm mode="edit" property={property} showSuccessState={true} />
			</div>
			<MobilePropertyForm
				mode="edit"
				property={property}
				showSuccessState={true}
			/>
		</div>
	)
}
