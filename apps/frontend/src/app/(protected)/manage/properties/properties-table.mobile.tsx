'use client'

import { Button } from '#components/ui/button'
import { Card, CardContent } from '#components/ui/card'
import { Badge } from '#components/ui/badge'
import { useOfflineData } from '#hooks/use-offline-data'
import type { Property } from '@repo/shared/types/core'
import { PencilLine } from 'lucide-react'
import Link from 'next/link'

interface MobilePropertiesTableProps {
	initialProperties: Property[]
}

export function MobilePropertiesTable({ initialProperties }: MobilePropertiesTableProps) {
	const { isOnline } = useOfflineData<Property>('properties')

	if (initialProperties.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
				No properties available.
			</div>
		)
	}

	return (
		<div className="space-y-3">
			{!isOnline && (
				<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
					Offline mode – some actions may be disabled
				</div>
			)}

			{initialProperties.map(property => (
				<Card key={property.id} className="border-border/70 shadow-sm">
					<CardContent className="p-4">
						<div className="flex items-start justify-between gap-3">
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<h3 className="text-base font-semibold">{property.name}</h3>
									{property.status ? (
										<Badge variant="outline" className="capitalize">
											{property.status.toLowerCase()}
										</Badge>
									) : null}
								</div>
								<p className="text-sm text-muted-foreground">{property.address_line1}</p>
								<p className="text-xs uppercase text-muted-foreground">
									{property.property_type?.replace(/_/g, ' ') ?? 'Unknown'}
								</p>
							</div>
							<Button
								asChild
								variant="ghost"
								size="sm"
								className="size-9 p-0"
								disabled={!isOnline}
							>
								<Link href={`/manage/properties/${property.id}/edit`}>
									<PencilLine className="size-4" aria-hidden />
									<span className="sr-only">Edit {property.name}</span>
								</Link>
							</Button>
						</div>

						<div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
							<Button asChild variant="outline" size="sm">
								<Link href={`/manage/properties/${property.id}`}>View Details</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	)
}
