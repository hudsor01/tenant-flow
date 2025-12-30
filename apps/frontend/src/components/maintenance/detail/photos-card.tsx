'use client'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Image as ImageIcon, Upload } from 'lucide-react'
import { toast } from 'sonner'

export function PhotosCard() {
	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between">
				<div>
					<CardTitle className="text-base">Photos</CardTitle>
					<CardDescription>Document the issue with photos</CardDescription>
				</div>
				<Button
					variant="outline"
					size="sm"
					className="gap-1.5"
					onClick={() => toast.info('Photo upload coming soon')}
				>
					<Upload className="size-4" />
					Upload Photo
				</Button>
			</CardHeader>
			<CardContent>
				<div className="text-center py-8 text-muted-foreground">
					<ImageIcon className="size-8 mx-auto mb-2 opacity-50" />
					<p>No photos uploaded yet</p>
				</div>
			</CardContent>
		</Card>
	)
}
