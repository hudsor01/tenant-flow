import type { ChangeEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'

interface Photo {
	url: string
	name: string
}

interface PhotoEvidenceCardProps {
	photos: Photo[]
	onUpload: (event: ChangeEvent<HTMLInputElement>) => void
	onRemove: (index: number) => void
}

export function PhotoEvidenceCard({ photos, onUpload, onRemove }: PhotoEvidenceCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Photo evidence</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<Input type="file" multiple accept="image/*" onChange={onUpload} />
				{photos.length > 0 ? (
					<div className="grid gap-3 sm:grid-cols-2">
						{photos.map((photo, index) => (
							<div key={`${photo.name}-${index}`} className="rounded border p-2">
								<img src={photo.url} alt={photo.name} className="h-32 w-full rounded object-cover" />
								<div className="mt-2 flex items-center justify-between text-sm">
									<span className="truncate">{photo.name}</span>
									<Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)}>Remove</Button>
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">Upload photos to attach to the inspection report.</p>
				)}
			</CardContent>
		</Card>
	)
}
