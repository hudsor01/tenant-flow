'use client'

import { Button } from '#components/ui/button'
import { Card, CardContent } from '#components/ui/card'
import { Badge } from '#components/ui/badge'
import {
	Empty,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import { useOfflineData } from '#hooks/use-offline-data'
import type { Property } from '@repo/shared/types/core'
import { Building2, PencilLine, Plus } from 'lucide-react'
import Link from 'next/link'

interface MobilePropertiesTableProps {
	initialProperties: Property[]
}

export function MobilePropertiesTable({
	initialProperties
}: MobilePropertiesTableProps) {
	const { isOnline } = useOfflineData<Property>('properties')

	if (initialProperties.length === 0) {
		return (
			<Empty className="py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
				<EmptyMedia variant="icon">
					<Building2 className="size-6" />
				</EmptyMedia>
				<EmptyTitle>No properties yet</EmptyTitle>
				<EmptyDescription>
					Add your first property to start tracking your portfolio.
				</EmptyDescription>
				<Button asChild size="default" className="mt-2 touch-target">
					<Link href="/properties/new">
						<Plus className="size-4 mr-2" />
						Add Property
					</Link>
				</Button>
			</Empty>
		)
	}

	return (
		<div className="space-y-3">
			{!isOnline && (
				<div className="rounded-2xl border border-warning/20 bg-warning/10 px-4 py-2 text-xs text-warning">
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
								<p className="text-muted">{property.address_line1}</p>
								<p className="text-xs uppercase text-muted-foreground">
									{property.property_type?.replace(/_/g, ' ') ?? 'Unknown'}
								</p>
							</div>
							<Button
								asChild
								variant="ghost"
								size="sm"
								className="touch-target p-2"
								disabled={!isOnline}
							>
								<Link href={`/properties/${property.id}/edit`}>
									<PencilLine className="size-4" aria-hidden />
									<span className="sr-only">Edit {property.name}</span>
								</Link>
							</Button>
						</div>

						<div className="mt-3 flex items-center gap-2 text-caption">
							<Button
								asChild
								variant="outline"
								size="sm"
								className="touch-target"
							>
								<Link href={`/properties/${property.id}`}>View Details</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	)
}
