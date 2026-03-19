'use client'

import { useQuery } from '@tanstack/react-query'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger
} from '#components/ui/dialog'
import { Skeleton } from '#components/ui/skeleton'
import { maintenanceQueries } from '#hooks/api/query-keys/maintenance-keys'
import { createClient } from '#lib/supabase/client'
import { Camera } from 'lucide-react'
import { useState } from 'react'

interface PhotosCardProps {
	requestId: string
}

export function PhotosCard({ requestId }: PhotosCardProps) {
	const { data: photos, isLoading } = useQuery(maintenanceQueries.photos(requestId))
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

	const getPublicUrl = (storagePath: string) => {
		const supabase = createClient()
		return supabase.storage
			.from('maintenance-photos')
			.getPublicUrl(storagePath).data.publicUrl
	}

	const photoCount = photos?.length ?? 0

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">
					Photos{photoCount > 0 ? ` (${photoCount})` : ''}
				</CardTitle>
				<CardDescription>Photo documentation for this request</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="aspect-square rounded-md" />
						))}
					</div>
				) : photoCount === 0 ? (
					<div className="text-center py-8 text-muted-foreground">
						<Camera className="size-8 mx-auto mb-2 opacity-50" />
						<p>No photos attached</p>
					</div>
				) : (
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
						{photos?.map((photo, index) => (
							<Dialog
								key={photo.id}
								open={selectedIndex === index}
								onOpenChange={(open) => setSelectedIndex(open ? index : null)}
							>
								<DialogTrigger asChild>
									<button
										type="button"
										className="overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										aria-label={`View ${photo.file_name}`}
									>
										<img
											src={getPublicUrl(photo.storage_path)}
											alt={photo.file_name}
											className="rounded-md object-cover aspect-square w-full hover:opacity-90 transition-opacity"
										/>
									</button>
								</DialogTrigger>
								<DialogContent className="max-w-3xl p-2">
									<DialogTitle className="sr-only">{photo.file_name}</DialogTitle>
									<img
										src={getPublicUrl(photo.storage_path)}
										alt={photo.file_name}
										className="w-full rounded-md"
									/>
								</DialogContent>
							</Dialog>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
